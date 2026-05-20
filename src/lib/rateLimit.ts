import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitGroup = "chat" | "transcribe" | "auth" | "api_general";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type WindowConfig = {
  requests: number;
  windowSeconds: number;
};

const DEFAULT_LIMITS: Record<RateLimitGroup, WindowConfig> = {
  chat: { requests: 30, windowSeconds: 3600 },
  transcribe: { requests: 60, windowSeconds: 3600 },
  auth: { requests: 20, windowSeconds: 3600 },
  api_general: { requests: 120, windowSeconds: 3600 },
};

const BURST_LIMITS: Partial<Record<RateLimitGroup, WindowConfig>> = {
  chat: { requests: 6, windowSeconds: 60 },
  transcribe: { requests: 12, windowSeconds: 60 },
};

type MemoryBucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, MemoryBucket>();

let upstashLimiters: Partial<Record<RateLimitGroup, Ratelimit>> | null = null;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function limitFor(group: RateLimitGroup): WindowConfig {
  const base = DEFAULT_LIMITS[group];
  const envKey = `RATE_LIMIT_${group.toUpperCase()}_PER_HOUR`;
  return {
    requests: envInt(envKey, base.requests),
    windowSeconds: base.windowSeconds,
  };
}

function getUpstashLimiters(): Partial<Record<RateLimitGroup, Ratelimit>> | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  if (!upstashLimiters) {
    const redis = new Redis({ url, token });
    upstashLimiters = {
      chat: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limitFor("chat").requests, "1 h"),
        prefix: "rl:chat",
      }),
      transcribe: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limitFor("transcribe").requests, "1 h"),
        prefix: "rl:transcribe",
      }),
      auth: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limitFor("auth").requests, "1 h"),
        prefix: "rl:auth",
      }),
      api_general: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limitFor("api_general").requests, "1 h"),
        prefix: "rl:api",
      }),
    };
  }

  return upstashLimiters;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

function memoryKey(ip: string, group: RateLimitGroup, suffix: string): string {
  return `${ip}:${group}:${suffix}`;
}

function checkMemoryLimit(
  ip: string,
  group: RateLimitGroup,
  config: WindowConfig,
  suffix: string,
): RateLimitResult {
  const key = memoryKey(ip, group, suffix);
  const now = Date.now();
  const existing = memoryBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, {
      count: 1,
      resetAt: now + config.windowSeconds * 1000,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= config.requests) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000),
    );
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

async function checkUpstashLimit(
  ip: string,
  group: RateLimitGroup,
): Promise<RateLimitResult> {
  const limiters = getUpstashLimiters();
  const limiter = limiters?.[group];
  if (!limiter) {
    return checkMemoryLimit(ip, group, limitFor(group), "hour");
  }

  const result = await limiter.limit(ip);
  if (result.success) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000),
  );
  return { allowed: false, retryAfterSeconds };
}

export function routeToRateLimitGroup(pathname: string): RateLimitGroup | null {
  if (pathname.startsWith("/api/evaluation/chat")) return "chat";
  if (pathname === "/api/transcribe") return "transcribe";
  if (pathname === "/api/auth/session") return "auth";
  if (pathname.startsWith("/api/")) return "api_general";
  return null;
}

export async function checkRateLimit(
  request: Request,
  group: RateLimitGroup,
): Promise<RateLimitResult> {
  const ip = getClientIp(request);

  const hourResult = await checkUpstashLimit(ip, group);
  if (!hourResult.allowed) return hourResult;

  const burst = BURST_LIMITS[group];
  if (!burst) return hourResult;

  const burstResult = checkMemoryLimit(ip, group, burst, "burst");
  return burstResult;
}

export function rateLimitJsonResponse(retryAfterSeconds: number) {
  return Response.json(
    {
      error: "Too many requests. Please wait and try again.",
      code: "RATE_LIMITED",
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}
