"use client";

import { useEffect, useRef, useState } from "react";
import type { AuthSession } from "@/types";
import { logout } from "@/lib/auth";

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
        const s = raw ? (JSON.parse(raw) as AuthSession) : null;
        // hard 24h cap — drop a session that has aged out
        if (s?.sessionExpiresAt && Date.now() > s.sessionExpiresAt) {
          localStorage.removeItem(SESSION_KEY);
          lastRaw.current = null;
          setSession(null);
          return;
        }
        setSession(s);
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

  // sign out automatically the moment the 24h cap is reached while the app is open
  useEffect(() => {
    if (!session?.sessionExpiresAt) return;
    const ms = session.sessionExpiresAt - Date.now();
    if (ms <= 0) {
      logout();
      return;
    }
    const id = window.setTimeout(() => logout(), ms);
    return () => window.clearTimeout(id);
  }, [session?.sessionExpiresAt]);

  return { session, user: session?.user ?? null, loading: session === undefined };
}
