/**
 * Data access layer — Rizztix API client plus the site's local content
 * (past highlights, gallery) that isn't served by the backend yet.
 */
import type { ClubEvent, GalleryItem, RizztixEvent, RizztixTicketDetail } from "@/types";
import { events } from "@/lib/data/events";
import { gallery } from "@/lib/data/content";
// auth <-> api import cycle is safe: both only use each other inside functions
import { getSession, authFetch } from "@/lib/auth";

/* ------------------------------------------------------------------ */
/* Rizztix API client — base rules from 2BHK-Website-API-Handoff.pdf   */
/* ------------------------------------------------------------------ */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://rizztixapi.com";
export const CLUB_SLUG = process.env.NEXT_PUBLIC_CLUB_SLUG ?? "bhk-slug";

/** Every Rizztix response is wrapped in { message, data }. */
interface Envelope<T> {
  message: string;
  data?: T;
}

/**
 * GET a Rizztix endpoint and unwrap the envelope.
 * Returns null instead of throwing so pages degrade gracefully
 * when the API is unreachable.
 */
async function apiGet<T>(path: string, revalidateSeconds = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Envelope<T>;
    return json.data ?? null;
  } catch {
    return null;
  }
}

export interface UpcomingEventsResult {
  totalCount: number;
  events: RizztixEvent[];
}

/**
 * Upcoming + ongoing events for the club (guest OK).
 * GET /event/upcoming?clubSlug={slug} — list is sorted soonest-first and
 * each event gets an `isLive` flag (already started, not yet ended).
 */
export async function getRizztixUpcomingEvents(): Promise<UpcomingEventsResult> {
  const data = await apiGet<{ totalCount: number; data: RizztixEvent[] }>(
    `/event/upcoming?clubSlug=${CLUB_SLUG}`
  );
  if (!data?.data) return { totalCount: 0, events: [] };
  const now = Date.now();
  const events = data.data
    .filter((e) => +new Date(e.enddatetime) > now)
    .sort((a, b) => +new Date(a.startdatetime) - +new Date(b.startdatetime))
    .map((e) => ({ ...e, isLive: +new Date(e.startdatetime) <= now }));
  return { totalCount: data.totalCount ?? events.length, events };
}

/** Find one live/upcoming event by its Mongo id (from the same list). */
export async function getRizztixEvent(id: string): Promise<RizztixEvent | undefined> {
  const { events } = await getRizztixUpcomingEvents();
  return events.find((e) => e._id === id);
}

export async function getPastEvents(): Promise<ClubEvent[]> {
  return [...events]
    .filter((e) => e.past)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export async function getGallery(): Promise<GalleryItem[]> {
  return gallery;
}

/* ---------------- contact / lead forms (section 7) ---------------- */

async function publicPost(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      message = ((await res.json()) as { message?: string }).message ?? message;
    } catch {
      /* non-JSON */
    }
    throw new Error(message);
  }
}

/**
 * Contact form. Logged-in users go through PUT /user/getInTouch;
 * guests go through the public POST /demo-request/submit lead form.
 */
export async function sendContactMessage(payload: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): Promise<{ ok: boolean }> {
  const session = getSession();
  if (session) {
    const [firstname, ...rest] = payload.name.trim().split(/\s+/);
    await authFetch("/user/getInTouch", {
      method: "PUT",
      body: {
        firstname,
        lastname: rest.join(" ") || "-",
        emailaddress: payload.email,
        phone: payload.phone,
        subject: payload.subject,
        description: payload.message,
      },
    });
    return { ok: true };
  }
  await publicPost("/demo-request/submit", {
    fullName: payload.name,
    email: payload.email,
    serviceRequired: `2BHK enquiry — ${payload.subject}`,
    message: payload.phone ? `${payload.message}\n\nPhone: ${payload.phone}` : payload.message,
  });
  return { ok: true };
}

/** No dedicated newsletter API — leads go through demo-request/submit. */
export async function subscribeNewsletter(email: string): Promise<{ ok: boolean }> {
  await publicPost("/demo-request/submit", {
    fullName: email.split("@")[0],
    email,
    serviceRequired: "2BHK newsletter signup",
    message: "Please add me to the 2BHK newsletter list.",
  });
  return { ok: true };
}

/** POST /user/feedback — requires login. */
export async function sendFeedback(title: string, description: string): Promise<void> {
  await authFetch("/user/feedback", { body: { title, description } });
}

/**
 * GET /order/viewTicketsWithTicketId/{id} — full ticket details incl. event
 * info and per-pass QR codes. One call returns every ticket of the same
 * order bundle, so callers should dedupe by _id.
 */
export async function getTicketDetails(ticketDocId: string): Promise<RizztixTicketDetail[]> {
  const data = await authFetch<RizztixTicketDetail[]>(
    `/order/viewTicketsWithTicketId/${ticketDocId}`
  );
  return Array.isArray(data) ? data : [];
}
