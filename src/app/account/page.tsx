"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import TicketModal from "@/components/account/TicketModal";
import TicketCard from "@/components/account/TicketCard";
import TableBookingCard from "@/components/account/TableBookingCard";
import { logout, ApiError } from "@/lib/auth";
import { sendFeedback, getAllTicketDetails } from "@/lib/api";
import { getMyTableBookings } from "@/lib/tableApi";
import { useAuth } from "@/lib/useAuth";
import type { RizztixTicketDetail, TableBooking } from "@/types";

type Tab = "tickets" | "tables" | "profile" | "feedback";

/** display "+91 XXXXXXXXXX" without doubling a country code the API included */
function displayPhone(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return `+91 ${digits}`;
}

function displayDob(dob?: string) {
  if (!dob) return "—";
  const d = new Date(dob);
  return isNaN(+d)
    ? dob
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default function AccountPage() {
  const { session, user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("tickets");
  const [tickets, setTickets] = useState<RizztixTicketDetail[] | null>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState({ title: "", description: "" });
  const [feedbackState, setFeedbackState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [openTicket, setOpenTicket] = useState<RizztixTicketDetail | null>(null);
  const [tables, setTables] = useState<TableBooking[] | null>(null);
  // deep-link: which order's QR to reveal, from ?order= (read once on mount)
  const [orderParam, setOrderParam] = useState<string | null>(null);
  const [autoOpened, setAutoOpened] = useState(false);

  useEffect(() => {
    setOrderParam(new URLSearchParams(window.location.search).get("order"));
  }, []);

  /** reflect the open QR in the URL without navigating (no Lenis/scroll fight) */
  const syncUrl = (orderid: string | null) => {
    const url = orderid ? `/account?order=${encodeURIComponent(orderid)}` : "/account";
    window.history.replaceState(null, "", url);
  };

  const viewTicket = (t: RizztixTicketDetail) => {
    setOpenTicket(t);
    if (t.orderid) syncUrl(t.orderid);
  };
  const closeTicket = () => {
    setOpenTicket(null);
    syncUrl(null);
  };

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const [all, tb] = await Promise.all([
          getAllTicketDetails(),
          getMyTableBookings().catch(() => []),
        ]);
        if (!cancelled) {
          setTickets(all);
          setTables(tb);
        }
      } catch (e) {
        if (!cancelled) {
          setTickets([]);
          setTables([]);
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

  // once data is in, open the QR named by ?order= (tickets first, then tables)
  useEffect(() => {
    if (autoOpened || !orderParam || tickets === null || tables === null) return;
    const ticket = tickets.find((t) => t.orderid === orderParam);
    if (ticket) {
      setTab("tickets");
      setOpenTicket(ticket);
      setAutoOpened(true);
      return;
    }
    if (tables.some((b) => b.orderid === orderParam)) {
      setTab("tables");
      setAutoOpened(true);
    }
  }, [autoOpened, orderParam, tickets, tables]);

  if (loading) return <div className="min-h-svh" />;

  if (!session || !user) {
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col items-start justify-center px-5 py-28">
        <p className="label mb-3">My account</p>
        <h1 className="h-display !normal-case text-4xl md:text-5xl">
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
        <h1 className="h-display !normal-case text-4xl md:text-5xl">
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
            ["tables", "Table bookings"],
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
              {tickets.map((t) => (
                <TicketCard key={t._id} ticket={t} onView={viewTicket} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "tables" && (
        <div className="mt-8">
          {tables === null ? (
            <p className="label">Loading your table bookings…</p>
          ) : tables.length === 0 ? (
            <div className="rounded-sm border border-line p-8 text-center">
              <p className="text-sm text-muted">No table bookings yet.</p>
              <Button href="/event" className="mt-5">
                Browse events
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tables.map((b) => (
                <TableBookingCard
                  key={b._id}
                  booking={b}
                  autoOpen={!!b.orderid && b.orderid === orderParam}
                  onOpenChange={(open) => syncUrl(open ? b.orderid ?? null : null)}
                />
              ))}
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
            <p className="border-b border-line py-3">{displayPhone(user.phone)}</p>
          </div>
          <div>
            <p className="label mb-1">Email</p>
            <p className="border-b border-line py-3">{user.email}</p>
          </div>
          <div>
            <p className="label mb-1">Date of birth</p>
            <p className="border-b border-line py-3">{displayDob(user.dob)}</p>
          </div>
          <p className="text-xs text-muted">
            Details are tied to your booking account. To change them, contact us.
          </p>
        </div>
      )}

      {/* QR / ticket-detail popup */}
      {openTicket && <TicketModal ticket={openTicket} onClose={closeTicket} />}
    </div>
  );
}
