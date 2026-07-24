"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import TicketCard from "@/components/account/TicketCard";
import TicketModal, { groupTickets, type TicketBooking } from "@/components/account/TicketModal";
import { getGuestTickets } from "@/lib/api";
import type { RizztixTicketDetail } from "@/types";

/**
 * Login-free ticket view for SMS/email deep links:
 * /ticket/view?id={orderId}&token={guestToken}
 */
export default function GuestTicketView() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const token = params.get("token") ?? "";
  const [tickets, setTickets] = useState<RizztixTicketDetail[] | undefined>(undefined);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<TicketBooking | null>(null);

  useEffect(() => {
    if (!id || !token) {
      setTickets([]);
      setError("This ticket link is incomplete — open the exact link from your SMS or email.");
      return;
    }
    let cancelled = false;
    getGuestTickets(id, token)
      .then((list) => {
        if (cancelled) return;
        setTickets(list);
        if (list.length === 0) setError("No tickets found for this link.");
      })
      .catch((e) => {
        if (cancelled) return;
        setTickets([]);
        setError(e instanceof Error ? e.message : "This ticket link is invalid or has expired.");
      });
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  /* loading */
  if (tickets === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8 md:pt-36">
        <p className="label mb-3">Your ticket</p>
        <div className="animate-pulse space-y-3">
          <div className="h-40 rounded-sm bg-surface" />
        </div>
      </div>
    );
  }

  /* error / empty */
  if (tickets.length === 0) {
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col items-start justify-center px-5 py-28">
        <p className="label mb-3">Your ticket</p>
        <h1 className="h-display !normal-case text-4xl md:text-5xl">
          Link expired<span className="text-primary">.</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">{error}</p>
        <Button href="/event" className="mt-8">
          Browse events
        </Button>
      </div>
    );
  }

  /* tickets — grouped into one entry per booking ref */
  const title = tickets[0].eventDetails?.title ?? "2BHK";
  const bookings = groupTickets(tickets);
  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-28 md:px-8 md:pt-36">
      <p className="label mb-3">Your tickets</p>
      <h1 className="h-display !normal-case text-4xl md:text-5xl">{title}</h1>
      <p className="mt-3 text-sm text-muted">
        {tickets.length > 1
          ? `${tickets.length} tickets — tap to see every entry QR.`
          : "Tap your ticket for the entry QR."}
      </p>

      <div className="mt-8 space-y-3">
        {bookings.map((g) => (
          <TicketCard key={g.key} booking={g} onView={setOpen} />
        ))}
      </div>

      {open && <TicketModal booking={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
