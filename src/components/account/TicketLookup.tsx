"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import TicketCard from "@/components/account/TicketCard";
import TicketModal from "@/components/account/TicketModal";
import { getAllTicketDetails } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import type { RizztixTicketDetail } from "@/types";

/**
 * Reads the booking ref from the SMS short link and shows that ticket.
 * Supported query forms (static export — parsed from location.search):
 *   /t/?65ZDNR0        → bare ref
 *   /t/?ref=65ZDNR0    → keyed ref
 *   /t/65ZDNR0         → path form, rewritten to /t.html?65ZDNR0 by .htaccess
 */
function refFromLocation(): string {
  const raw = window.location.search.replace(/^\?/, "");
  if (!raw) return "";
  const first = raw.split("&")[0];
  const [key, value] = first.split("=");
  return decodeURIComponent(value ?? key).trim().toUpperCase();
}

export default function TicketLookup() {
  const { session, loading } = useAuth();
  const [ref, setRef] = useState<string | null>(null); // null = not read yet
  const [tickets, setTickets] = useState<RizztixTicketDetail[] | null>(null);
  const [openTicket, setOpenTicket] = useState<RizztixTicketDetail | null>(null);

  useEffect(() => {
    setRef(refFromLocation());
  }, []);

  useEffect(() => {
    if (!session || !ref) return;
    let cancelled = false;
    getAllTicketDetails().then((all) => {
      if (!cancelled) setTickets(all.filter((t) => (t.bookingref ?? "").toUpperCase() === ref));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?._id, ref]);

  if (loading || ref === null) return <div className="min-h-svh" />;

  /* no ref in the URL */
  if (!ref) {
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col items-start justify-center px-5 py-28">
        <p className="label mb-3">Your ticket</p>
        <h1 className="h-display !normal-case text-4xl md:text-5xl">
          Missing booking ref<span className="text-primary">.</span>
        </h1>
        <p className="mt-4 text-sm text-muted">
          This link is incomplete — open the exact link from your SMS, or find all your
          tickets in My Account.
        </p>
        <Button href="/account" className="mt-8">
          My Account
        </Button>
      </div>
    );
  }

  /* needs login (SMS goes to the booking phone — same number signs in) */
  if (!session) {
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col items-start justify-center px-5 py-28">
        <p className="label mb-3">Your ticket · {ref}</p>
        <h1 className="h-display !normal-case text-4xl md:text-5xl">
          Almost there<span className="text-primary">.</span>
        </h1>
        <p className="mt-4 text-sm text-muted">
          Verify the mobile number you booked with and your ticket opens right up.
        </p>
        <Button
          href={`/login?next=${encodeURIComponent(`/t/?${ref}`)}`}
          className="mt-8"
        >
          Verify & view ticket
        </Button>
      </div>
    );
  }

  /* loading tickets */
  if (tickets === null) {
    return (
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-28 md:pt-36">
        <p className="label mb-3">Your ticket · {ref}</p>
        <div className="animate-pulse space-y-3">
          <div className="h-28 rounded-sm bg-surface" />
        </div>
      </div>
    );
  }

  /* ref not on this account */
  if (tickets.length === 0) {
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col items-start justify-center px-5 py-28">
        <p className="label mb-3">Your ticket · {ref}</p>
        <h1 className="h-display !normal-case text-4xl md:text-5xl">
          Not found<span className="text-primary">.</span>
        </h1>
        <p className="mt-4 text-sm text-muted">
          No booking {ref} on this account. Make sure you signed in with the same mobile
          number used for the booking.
        </p>
        <Button href="/account" className="mt-8">
          See all my tickets
        </Button>
      </div>
    );
  }

  /* found — show the booking's tickets */
  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8 md:pt-36">
      <p className="label mb-3">Your ticket</p>
      <h1 className="h-display !normal-case text-4xl md:text-5xl">
        {ref}
        <span className="text-primary">.</span>
      </h1>
      <p className="mt-3 text-sm text-muted">
        {tickets.length > 1
          ? `${tickets.length} tickets in this booking — tap each for its entry QR.`
          : "Tap your ticket for the entry QR."}
      </p>

      <div className="mt-8 space-y-3">
        {tickets.map((t) => (
          <TicketCard key={t._id} ticket={t} onView={setOpenTicket} />
        ))}
      </div>

      {openTicket && <TicketModal ticket={openTicket} onClose={() => setOpenTicket(null)} />}
    </div>
  );
}
