"use client";

import { useEffect, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import TicketModal, { groupTickets, type TicketBooking } from "@/components/account/TicketModal";
import TicketCard from "@/components/account/TicketCard";
import TableBookingCard from "@/components/account/TableBookingCard";
import { Input } from "@/components/ui/Input";
import { logout, updateUser, ApiError } from "@/lib/auth";
import { streamMyTickets } from "@/lib/api";
import { getMyTableBookings } from "@/lib/tableApi";
import { useAuth } from "@/lib/useAuth";
import { maxDobForAge, isAtLeastAge } from "@/lib/format";
import { isTicketBookingVisible, isTableBookingVisible, belongsToClub } from "@/lib/bookingVisibility";
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

/** 10-digit local number for editing (strips a leading 91 country code) */
function tenDigitPhone(phone?: string) {
  return (phone ?? "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
}

/** YYYY-MM-DD for a native date input */
function dobForInput(dob?: string) {
  if (!dob) return "";
  const d = new Date(dob);
  return isNaN(+d) ? "" : d.toISOString().slice(0, 10);
}

export default function AccountPage() {
  const { session, user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("tickets");
  const [tickets, setTickets] = useState<RizztixTicketDetail[] | null>(null);
  const [error, setError] = useState("");
  const [openBooking, setOpenBooking] = useState<TicketBooking | null>(null);
  // profile editing
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", dob: "" });
  const [saveState, setSaveState] = useState<"idle" | "busy" | "error">("idle");
  const [saveErr, setSaveErr] = useState("");
  const [savedNote, setSavedNote] = useState(false);
  const [tables, setTables] = useState<TableBooking[] | null>(null);
  // deep-link: which order's QR to reveal, from ?order= (read once on mount)
  const [orderParam, setOrderParam] = useState<string | null>(null);
  const [autoOpened, setAutoOpened] = useState(false);
  // clock used to age-out pending bookings; ticks so they disappear live at the
  // 3-min / hold-expiry mark. null on first paint → nowMs 0 shows recent pending.
  const [now, setNow] = useState<number | null>(null);
  const nowMs = now ?? 0;

  useEffect(() => {
    setOrderParam(new URLSearchParams(window.location.search).get("order"));
  }, []);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
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

  const startEdit = () => {
    if (!user) return;
    setForm({
      name: user.fullname ?? "",
      phone: tenDigitPhone(user.phone),
      email: user.email ?? "",
      dob: dobForInput(user.dob),
    });
    setSaveErr("");
    setSavedNote(false);
    setEditing(true);
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (saveState === "busy") return;
    if (form.dob && !isAtLeastAge(form.dob, 21)) {
      setSaveErr("You must be at least 21.");
      setSaveState("error");
      return;
    }
    setSaveState("busy");
    setSaveErr("");
    try {
      await updateUser({
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, ""),
        email: form.email.trim(),
        dob: form.dob,
      });
      setEditing(false);
      setSavedNote(true);
      setSaveState("idle");
    } catch (err) {
      setSaveErr(err instanceof ApiError ? err.message : "Could not save — please try again.");
      setSaveState("error");
    }
  };

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    // tickets: one /order/userTickets call already carries QR + event details,
    // so this resolves in a single round-trip (streams only if a legacy backend
    // returns light rows). Runs in parallel with tables below.
    streamMyTickets((partial) => {
      if (!cancelled) setTickets([...partial]);
    })
      .then((all) => {
        if (!cancelled) setTickets(all); // also resolves the empty case → []
      })
      .catch((e) => {
        if (cancelled) return;
        setTickets([]);
        if (!(e instanceof ApiError && e.status === 401)) {
          setError(e instanceof ApiError ? e.message : "Could not load your bookings.");
        }
      });

    // tables: separate source (/club/table-booking/booking/mine)
    getMyTableBookings()
      .then((t) => {
        if (!cancelled) setTables(t);
      })
      .catch(() => {
        if (!cancelled) setTables([]);
      });

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

  // hide stale-pending / expired bookings (paid always shows; pending only within
  // its grace window) — recomputed as `now` ticks so they drop off live
  const ticketGroups =
    tickets === null
      ? null
      : groupTickets(tickets).filter(
          (g) => belongsToClub(g.tickets[0]) && isTicketBookingVisible(g.tickets[0], nowMs)
        );
  const visibleTables =
    tables === null
      ? null
      : tables.filter((b) => belongsToClub(b) && isTableBookingVisible(b, nowMs));

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
          {ticketGroups === null ? (
            <p className="label">Loading your bookings…</p>
          ) : ticketGroups.length === 0 ? (
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
              {ticketGroups.map((g, i) => (
                <TicketCard key={g.key} booking={g} onView={viewBooking} priority={i === 0} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "tables" && (
        <div className="mt-8">
          {visibleTables === null ? (
            <p className="label">Loading your table bookings…</p>
          ) : visibleTables.length === 0 ? (
            <div className="rounded-sm border border-line p-8 text-center">
              <p className="text-sm text-muted">No table bookings yet.</p>
              <Button href="/event" className="mt-5">
                Browse events
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleTables.map((b) => (
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
        <div className="mt-8 max-w-md">
          {editing ? (
            <form className="space-y-6" onSubmit={saveProfile}>
              <Input
                label="Full name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
              />
              <Input
                label="Mobile"
                type="tel"
                inputMode="numeric"
                required
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
                }
                placeholder="10-digit number"
              />
              <Input
                label="Email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@email.com"
              />
              <Input
                label="Date of birth"
                type="date"
                min={maxDobForAge(100)}
                max={maxDobForAge(21)}
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                onClick={(e) => e.currentTarget.showPicker?.()}
              />
              {saveErr && <p className="text-sm text-primary">{saveErr}</p>}
              <div className="flex gap-3">
                <Button type="submit" disabled={saveState === "busy"}>
                  {saveState === "busy" ? "Saving…" : "Save changes"}
                </Button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="label !text-muted transition-colors hover:!text-cream"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
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
              {savedNote && <p className="text-sm text-green-500">Profile updated ✓</p>}
              <Button onClick={startEdit}>Edit details</Button>
            </div>
          )}
        </div>
      )}

      {/* QR / ticket-detail popup */}
      {openBooking && <TicketModal booking={openBooking} onClose={closeBooking} />}
    </div>
  );
}
