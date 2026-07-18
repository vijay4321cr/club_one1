/**
 * Real Rizztix auth — phone + OTP login, Bearer tokens with refresh.
 * Session persists in localStorage; components listen to "auth-change".
 */
import type { AuthSession, RizztixUser, User } from "@/types";
import { API_BASE_URL } from "@/lib/api";

const SESSION_KEY = "twobhk_auth";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface Envelope<T> {
  message: string;
  data?: T;
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  let json: Envelope<T> | undefined;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    throw new ApiError(json?.message ?? `Request failed (${res.status})`, res.status);
  }
  return (json?.data ?? {}) as T;
}

/* ---------------- session storage ---------------- */

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as AuthSession | null;
  } catch {
    return null;
  }
}

function saveSession(session: AuthSession, opts?: { silent?: boolean }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  // silent saves (token refreshes) must not re-trigger UI effects,
  // otherwise data-fetch → refresh → auth-change → data-fetch loops forever
  if (!opts?.silent) window.dispatchEvent(new Event("auth-change"));
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("auth-change"));
}

/** Compat helper for older components: minimal user info or null. */
export function getUser(): User | null {
  const s = getSession();
  if (!s) return null;
  return { name: s.user.fullname, email: s.user.email, phone: s.user.phone };
}

/* ---------------- OTP flow ---------------- */

export interface NewUserDetails {
  name: string;
  email: string;
  dob: string; // YYYY-MM-DD
}

export interface OtpRequestResult {
  ok: boolean;
  /** backend wants name/email/dob (first-time phone number) */
  needsDetails: boolean;
  message: string;
  /** present only on staging with dev OTP enabled */
  devOtp?: string;
}

/** Step A — POST /user/userLogin. Existing users need only the phone. */
export async function requestOtp(
  phone: string,
  details?: NewUserDetails
): Promise<OtpRequestResult> {
  try {
    const data = await post<{ requiresOtp?: boolean; otp?: string }>("/user/userLogin", {
      phone,
      ...(details ? { name: details.name, email: details.email, dob: details.dob } : {}),
    });
    return { ok: true, needsDetails: false, message: "OTP sent", devOtp: data.otp };
  } catch (e) {
    if (e instanceof ApiError && e.status === 400 && /required/i.test(e.message)) {
      return { ok: false, needsDetails: true, message: e.message };
    }
    throw e;
  }
}

/** Step B — POST /user/accesstoken. Stores the session on success. */
export async function verifyOtp(phone: string, otp: string): Promise<AuthSession> {
  const data = await post<{
    accessToken: string;
    accessTokenExpiresAt: string;
    refreshToken: string;
    refreshTokenExpiresAt: string;
    user: RizztixUser;
  }>("/user/accesstoken", { phone, otp });
  const session: AuthSession = {
    accessToken: data.accessToken,
    accessTokenExpiresAt: data.accessTokenExpiresAt,
    refreshToken: data.refreshToken,
    refreshTokenExpiresAt: data.refreshTokenExpiresAt,
    user: data.user,
  };
  saveSession(session);
  return session;
}

export async function resendOtp(phone: string): Promise<void> {
  await post("/user/resendOtp", { phone });
}

/* ---------------- token refresh + authed fetch ---------------- */

async function refreshSession(session: AuthSession): Promise<AuthSession | null> {
  try {
    const data = await post<Partial<AuthSession>>("/refresh", {
      refreshToken: session.refreshToken,
    });
    if (!data.accessToken) return null;
    const next: AuthSession = {
      ...session,
      accessToken: data.accessToken,
      // if the refresh response omits the expiry, assume a short validity
      // window instead of keeping the stale timestamp (which would make
      // every subsequent call refresh again)
      accessTokenExpiresAt:
        data.accessTokenExpiresAt ?? new Date(Date.now() + 10 * 60_000).toISOString(),
      refreshToken: data.refreshToken ?? session.refreshToken,
      refreshTokenExpiresAt: data.refreshTokenExpiresAt ?? session.refreshTokenExpiresAt,
    };
    saveSession(next, { silent: true });
    return next;
  } catch {
    return null;
  }
}

/**
 * Fetch a protected endpoint with the Bearer token. Refreshes the token
 * when it is about to expire or on a 401, then retries once. Throws
 * ApiError(401) when the session is truly gone — callers should send
 * the user to /login.
 */
export async function authFetch<T>(
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  let session = getSession();
  if (!session) throw new ApiError("Please sign in", 401);

  // proactive refresh ~60s before expiry
  if (+new Date(session.accessTokenExpiresAt) - Date.now() < 60_000) {
    session = (await refreshSession(session)) ?? session;
  }

  const doFetch = async (token: string) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: init?.method ?? (init?.body !== undefined ? "POST" : "GET"),
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
    return res;
  };

  let res = await doFetch(session.accessToken);
  if (res.status === 401) {
    const refreshed = await refreshSession(session);
    if (!refreshed) {
      logout();
      throw new ApiError("Session expired — please sign in again", 401);
    }
    session = refreshed;
    res = await doFetch(session.accessToken);
  }

  let json: Envelope<T> | undefined;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    throw new ApiError(json?.message ?? `Request failed (${res.status})`, res.status);
  }
  return (json?.data ?? {}) as T;
}
