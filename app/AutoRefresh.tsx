"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Front desk and doctor dashboards are viewed by different people in
 * different tabs — a check-in on one needs to show up on the other without
 * anyone hitting the browser refresh button. router.refresh() re-fetches
 * this route's Server Component data in place; it does not reset Client
 * Component state (e.g. an in-progress consultation form) or scroll position.
 */
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
