// src/hooks/useRoute.ts
import { useState, useCallback } from "react";
import { RouteData, saveRoute, loadRoute } from "@/lib/offlineStore";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export function useRoute() {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const fetchRoute = useCallback(async (source: string, destination: string) => {
    setLoading(true);
    setError(null);
    setOffline(false);

    try {
      const res = await fetch(`${BACKEND}/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, destination }),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(err.error || "Route fetch failed");
      }

      const data: RouteData = await res.json();
      setRoute(data);
      await saveRoute(source, destination, data);
    } catch (err: unknown) {
      // Try offline cache
      const cached = await loadRoute(source, destination);
      if (cached) {
        setRoute(cached.data);
        setOffline(true);
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to fetch route"
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { route, loading, error, offline, fetchRoute, setRoute };
}
