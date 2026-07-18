"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import TicketModal, { passQrs } from "@/components/account/TicketModal";
import { authFetch, logout, ApiError } from "@/lib/auth";
import { sendFeedback, getTicketDetails } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { eventDate } from "@/lib/format";
import type { RizztixUserTicket, RizztixTicketDetail } from "@/types";

type Tab = "tickets" | "profile" | "feedback";

export default function AccountPage() {
  const { session, user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("tickets");
  const [tickets, setTickets] = useState<RizztixTicketDetail[] | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ title: "", description: "" });
  const [feedbackState, setFeedbackState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [openTicket, setOpenTicket] = useState<RizztixTicketDetail | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        // 1. list the user's ticket ids
        const data = await authFetch<unknown>("/order/userTickets?page=1");
        const d = data as {
          data?: RizztixUserTicket[];
          tickets?: RizztixUserTicket[];
          orders?: RizztixUserTicket[];
        };
        const list = Array.isArray(data)
          ? (data as RizztixUserTicket[])
          : d.data ?? d.tickets ?? d.orders ?? [];

        // 2. load full details (event info + per-pass QRs) per ticket id.
        //    one call returns the whole order bundle — dedupe by _id and
        //    skip ids already covered by a previous bundle.
        const details = new Map<string, RizztixTicketDetail>();
        for (const item of list) {
          if (!item._id || details.has(item._id)) continue;
          try {
            for (const t of await getTicketDetails(item._id)) {
              if (t._id) details.set(t._id, t);
            }
          } catch {
            /* one broken ticket shouldn't hide the rest */
          }
        }
        if (!cancelled) setTickets([...details.values()]);
      } catch (e) {
        if (!cancelled) {
          setTickets([]);
          if (!(e instanceof ApiError && e.status === 401)) {
            setError(e instanceof ApiError ? e.message : "Could not load your bookings.");
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // re-fetch only when the signed-in user changes — NOT on token refreshes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?._id]);

  if (loading) return <div className="min-h-svh" />;

  if (!session || !user) {
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col items-start justify-center px-5 py-28">
        <p className="label mb-3">My account</p>
        <h1 className="h-display text-4xl md:text-5xl">
          Members
          <br />
          only<span className="text-primary">.</span>
        </h1>
        <p className="mt-4 text-sm text-muted">
          Sign in with your mobile number to see your bookings.
        </p>
        <Button href="/login" className="mt-8">
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 pb-20 pt-28 md:px-8 md:pt-36">
      <p className="label mb-3">My account</p>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="h-display text-4xl md:text-5xl">
          Hey, {user.fullname.split(" ")[0]}
          <span className="text-primary">.</span>
        </h1>
        <button
          onClick={logout}
          className="label !text-muted transition-colors hover:!text-primary"
        >
          Sign out →
        </button>
      </div>

      {/* tabs */}
      <div className="mt-10 flex gap-2 border-b border-line">
        {(
          [
            ["tickets", "Ticket bookings"],
            ["profile", "Profile"],
            ["feedback", "Feedback"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-[0.6875rem] font-medium uppercase tracking-[0.16em] transition-colors ${
              tab === t ? "border-b-2 border-primary text-cream" : "text-muted hover:text-cream"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "tickets" && (
        <div className="mt-8">
          {tickets === null ? (
            <p className="label">Loading your bookings…</p>
          ) : tickets.length === 0 ? (
            <div className="rounded-sm border border-line p-8 text-center">
              <p className="text-sm text-muted">
                {error || "No ticket bookings yet."}
              </p>
              <Button href="/#events" className="mt-5">
                Browse events
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => {
                const ev = t.eventDetails;
                const qrCount = passQrs(t).length;
                return (
                  <div
                    key={t._id}
                    className="flex flex-col gap-5 rounded-sm border border-line p-5 transition-colors hover:border-cream/30 sm:flex-row sm:items-center"
                  >
                    {ev?.image && (
                      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-sm bg-surface sm:aspect-square sm:w-24">
                        <Image
                          src={ev.image}
                          alt={`${ev.title ?? "Event"} poster`}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="label !text-[0.5625rem]">
                        {ev?.startdatetime ? `${eventDate(ev.startdatetime)} · ` : ""}
                        {t.bookingref ?? ""}
                        {t.orderstatus ? (
                          <span className="text-primary"> · {t.orderstatus}</span>
                        ) : null}
                      </p>
                      <p className="mt-1 font-display text-lg font-medium uppercase leading-tight">
                        {ev?.title ?? "2BHK event"}
                      </p>
                      {/* highlighted category + count */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-primary">
                          {t.tickettype ?? "Ticket"}
                        </span>
                        <span className="rounded-full border border-line px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.14em]">
                          × {t.noofticket ?? 1}
                        </span>
                        {(t.passesPerUnit ?? 1) > 1 && (
                          <span className="rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-gold">
                            Admits {t.passesPerUnit}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setOpenTicket(t)}
                      className="shrink-0 self-start rounded-full bg-primary px-6 py-3 text-[0.75rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors duration-300 hover:bg-cream hover:text-coal sm:self-center"
                    >
                      View QR{qrCount > 1 ? `s (${qrCount})` : ""}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "feedback" && (
        <div className="mt-8 max-w-md">
          {feedbackState === "done" ? (
            <div className="rounded-sm border border-line p-8 text-center">
              <p className="h-display text-2xl">Thank you ✓</p>
              <p className="mt-3 text-sm text-muted">
                Your feedback landed with the team — it genuinely shapes the next night.
              </p>
            </div>
          ) : (
            <form
              className="space-y-6"
              onSubmit={async (e) => {
                e.preventDefault();
                if (feedbackState === "busy") return;
                setFeedbackState("busy");
                try {
                  await sendFeedback(feedback.title, feedback.description);
                  setFeedbackState("done");
                } catch {
                  setFeedbackState("error");
                }
              }}
            >
              <Input
                label="Title"
                required
                value={feedback.title}
                onChange={(e) => setFeedback({ ...feedback, title: e.target.value })}
                placeholder="Great night"
              />
              <Textarea
                label="Your feedback"
                required
                value={feedback.description}
                onChange={(e) => setFeedback({ ...feedback, description: e.target.value })}
                placeholder="Loved the vibe…"
              />
              <Button type="submit" disabled={feedbackState === "busy"}>
                {feedbackState === "busy" ? "Sending…" : "Send feedback"}
              </Button>
              {feedbackState === "error" && (
                <p className="text-sm text-primary">Could not send — please try again.</p>
              )}
            </form>
          )}
        </div>
      )}

      {tab === "profile" && (
        <div className="mt-8 max-w-md space-y-6">
          <div>
            <p className="label mb-1">Full name</p>
            <p className="border-b border-line py-3">{user.fullname}</p>
          </div>
          <div>
            <p className="label mb-1">Mobile</p>
            <p className="border-b border-line py-3">+91 {user.phone}</p>
          </div>
          <div>
            <p className="label mb-1">Email</p>
            <p className="border-b border-line py-3">{user.email}</p>
          </div>
          <p className="text-xs text-muted">
            Details are tied to your booking account. To change them, contact us.
          </p>
        </div>
      )}

      {/* QR / ticket-detail popup */}
      {openTicket && <TicketModal ticket={openTicket} onClose={() => setOpenTicket(null)} />}
    </div>
  );
}
