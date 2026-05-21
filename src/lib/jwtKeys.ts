import { createLocalJWKSet, importPKCS8 } from "jose";

let cachedPrivateKey: CryptoKey | null = null;
let cachedJwks: ReturnType<typeof createLocalJWKSet> | null = null;

let warnedMissingJwtEnv = false;

function warnMissingJwtEnvOnce(): void {
  if (warnedMissingJwtEnv || process.env.NODE_ENV === "production") return;
  warnedMissingJwtEnv = true;
  console.warn(
    "[evals.com] JWT_PRIVATE_KEY and JWKS are required for session auth. Run: node scripts/generate-jwt-keys.mjs",
  );
}

function devPrivateKeyPem(): string {
  const value = process.env.JWT_PRIVATE_KEY?.trim() || "";
  if (!value) warnMissingJwtEnvOnce();
  return value;
}

function devJwksJson(): string {
  const value = process.env.JWKS?.trim() || "";
  if (!value) warnMissingJwtEnvOnce();
  return value;
}

export async function getSigningKey(): Promise<CryptoKey> {
  if (cachedPrivateKey) return cachedPrivateKey;

  const raw = devPrivateKeyPem();
  if (!raw) {
    throw new Error(
      "JWT_PRIVATE_KEY is not set. Run: node scripts/generate-jwt-keys.mjs",
    );
  }

  const pem = normalizePrivateKeyPem(raw);
  cachedPrivateKey = await importPKCS8(pem, "RS256");
  return cachedPrivateKey;
}

export async function getVerificationJwks() {
  if (cachedJwks) return cachedJwks;

  const raw = devJwksJson();
  if (!raw) {
    throw new Error("JWKS must be set for verifying tokens.");
  }

  cachedJwks = createLocalJWKSet(JSON.parse(raw));
  return cachedJwks;
}

export function normalizePrivateKeyPem(raw: string): string {
  const trimmed = raw.trim().replace(/\\n/g, "\n");
  if (trimmed.includes("\n")) return trimmed;

  const begin = "-----BEGIN PRIVATE KEY-----";
  const end = "-----END PRIVATE KEY-----";
  const start = trimmed.indexOf(begin);
  const finish = trimmed.indexOf(end);
  if (start === -1) return trimmed;

  const body = trimmed.slice(start + begin.length, finish).replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g) ?? [body];
  return `${begin}\n${lines.join("\n")}\n${end}\n`;
}

export function getJwksJson(): string {
  const raw = devJwksJson();
  if (!raw) {
    throw new Error("JWKS must be set.");
  }
  return raw;
}
