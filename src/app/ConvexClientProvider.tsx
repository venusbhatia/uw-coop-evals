"use client";

import { ReactNode, useEffect } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || "http://127.0.0.1:3210",
);

async function fetchConvexAuthToken(): Promise<string | null> {
  const res = await fetch("/api/auth/convex-token", { credentials: "include" });
  if (!res.ok) return null;
  const data = (await res.json()) as { token?: string };
  return data.token ?? null;
}

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    convex.setAuth(fetchConvexAuthToken);
  }, []);

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
