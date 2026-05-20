"use client";

import { ReactNode, useCallback, useMemo, useState, useEffect } from "react";
import {
  ConvexProviderWithAuth,
  ConvexReactClient,
} from "convex/react";
import { SESSION_UPDATED_EVENT } from "@/lib/sessionEvents";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || "http://127.0.0.1:3210",
);

function useSessionAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refreshAuth = useCallback(async (forceRefreshToken: boolean) => {
    const res = await fetch("/api/auth/convex-token", {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    const token = data.token ?? null;
    setIsAuthenticated(Boolean(token));
    setIsLoading(false);
    return token;
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      return refreshAuth(forceRefreshToken);
    },
    [refreshAuth],
  );

  useEffect(() => {
    void refreshAuth(false);

    const onSessionUpdated = () => {
      setIsLoading(true);
      void refreshAuth(true);
    };

    window.addEventListener(SESSION_UPDATED_EVENT, onSessionUpdated);
    return () => window.removeEventListener(SESSION_UPDATED_EVENT, onSessionUpdated);
  }, [refreshAuth]);

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
