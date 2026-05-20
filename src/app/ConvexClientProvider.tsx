"use client";

import { ReactNode, useCallback, useMemo, useState, useEffect } from "react";
import {
  ConvexProviderWithAuth,
  ConvexReactClient,
} from "convex/react";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || "http://127.0.0.1:3210",
);

function useSessionAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      void forceRefreshToken;
      const res = await fetch("/api/auth/convex-token", {
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { token?: string };
      return data.token ?? null;
    },
    [],
  );

  useEffect(() => {
    void fetchAccessToken({ forceRefreshToken: false }).then((token) => {
      setIsAuthenticated(Boolean(token));
      setIsLoading(false);
    });
  }, [fetchAccessToken]);

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      fetchAccessToken,
    }),
    [isLoading, isAuthenticated, fetchAccessToken],
  );
}

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useSessionAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
