"use client";

import { useEffect, useRef, useState } from "react";
import type { AuthSession } from "@/types";

const SESSION_KEY = "twobhk_auth";

/**
 * Client hook exposing the current auth session.
 * `session === undefined` means "still reading localStorage" (first paint).
 * The session object identity only changes when the stored value actually
 * changes, so it is safe to use in effect dependency arrays.
 */
export function useAuth() {
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  const lastRaw = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const read = () => {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw === lastRaw.current) return; // nothing changed — keep identity
      lastRaw.current = raw;
      try {
        setSession(raw ? (JSON.parse(raw) as AuthSession) : null);
      } catch {
        setSession(null);
      }
    };
    read();
    window.addEventListener("auth-change", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("auth-change", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return { session, user: session?.user ?? null, loading: session === undefined };
}
