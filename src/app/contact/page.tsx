"use client";

import { useEffect, useState, type FormEvent } from "react";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { club } from "@/lib/data/content";
import { sendContactMessage } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export default function ContactPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  // prefill for signed-in members (only fields they haven't typed in)
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: f.name || user.fullname,
      email: f.email || user.email,
      phone: f.phone || user.phone,
    }));
  }, [user]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === "busy") return;
    setState("busy");
    setError("");
    try {
      await sendContactMessage(form);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message — try again.");
      setState("idle");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pb-20 pt-28 md:px-8 md:pt-36">
      <Reveal>
        <p className="label mb-3">Contact us</p>
        <h1 className="h-display text-4xl sm:text-5xl md:text-7xl">
          Say hello<span className="text-primary">.</span>
        </h1>
      </Reveal>

      <div className="mt-12 grid gap-14 md:mt-16 md:grid-cols-2 md:gap-16">
        {/* form */}
        <Reveal>
          {state === "done" ? (
            <div className="flex h-full flex-col items-start justify-center rounded-sm border border-line p-8">
              <p className="h-display text-2xl">Message sent ✓</p>
              <p className="mt-3 text-sm text-muted">
                We reply within a day — usually much faster on event nights.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              <Input
                label="Name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <div className="grid gap-6 sm:grid-cols-2">
                <Input
                  label="Email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <Input
                  label="Phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
                  placeholder="10-digit number"
                />
              </div>
              <Input
                label="Subject"
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Private party enquiry"
              />
              <Textarea
                label="Message"
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Guest list for Saturday night…"
              />
              <Button type="submit" disabled={state === "busy"}>
                {state === "busy" ? "Sending…" : "Send message"}
              </Button>
              {error && <p className="text-sm text-primary">{error}</p>}
            </form>
          )}
        </Reveal>

        {/* details */}
        <Reveal delay={0.1}>
          <div className="space-y-8">
            <div>
              <p className="label mb-2">Find us</p>
              <p className="max-w-sm text-sm leading-relaxed text-cream/85">{club.address}</p>
            </div>
            <div>
              <p className="label mb-2">Hours</p>
              <p className="text-sm text-cream/85">{club.hours}</p>
            </div>
            <div>
              <p className="label mb-2">Reach us</p>
              <p className="text-sm text-cream/85">
                {club.phone}
                <br />
                {club.email}
              </p>
            </div>
            <div className="overflow-hidden rounded-sm border border-line">
              <iframe
                src={club.mapsEmbed}
                title="2BHK on Google Maps"
                className="h-64 w-full grayscale invert-[0.9]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
