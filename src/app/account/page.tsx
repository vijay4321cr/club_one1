"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import TicketModal, { groupTickets, type TicketBooking } from "@/components/account/TicketModal";
import TicketCard from "@/components/account/TicketCard";
import TableBookingCard from "@/components/account/TableBookingCard";
import { logout, ApiError } from "@/lib/auth";
import { getAllTicketDetails } from "@/lib/api";
import { getMyTableBookings } from "@/lib/tableApi";
import { useAuth } from "@/lib/useAuth";
import type { RizztixTicketDetail, TableBooking } from "@/types";

type Tab = "tickets" | "tables" | "profile";

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
  const [openBooking, setOpenBooking] = useState<TicketBooking | null>(null);
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

  const viewBooking = (b: TicketBooking) => {
    setOpenBooking(b);
    if (b.orderid) syncUrl(b.orderid);
  };
  const closeBooking = () => {
    setOpenBooking(null);
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
    const group = groupTickets(tickets).find(
      (g) => g.orderid === orderParam || g.tickets.some((t) => t.orderid === orderParam)
    );
    if (group) {
      setTab("tickets");
      setOpenBooking(group);
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
              {groupTickets(tickets).map((g) => (
                <TicketCard key={g.key} booking={g} onView={viewBooking} />
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
      {openBooking && <TicketModal booking={openBooking} onClose={closeBooking} />}
    </div>
  );
}
