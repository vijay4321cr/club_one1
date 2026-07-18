"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import TransitionLink from "@/components/ui/TransitionLink";
import { club } from "@/lib/data/content";
import { subscribeNewsletter } from "@/lib/api";

const quick = [
  { label: "Home", href: "/" },
  { label: "Our Services", href: "/services" },
  { label: "Contact Us", href: "/contact" },
  { label: "My Account", href: "/account" },
];

const legal = [
  { label: "Cancellation & Refund Policy", href: "/legal/refunds" },
  { label: "Terms & Conditions", href: "/legal/terms" },
  { label: "Privacy Policy", href: "/legal/privacy" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || state === "busy") return;
    setState("busy");
    try {
      await subscribeNewsletter(email);
      setState("done");
      setEmail("");
    } catch {
      setState("error");
    }
  };

  return (
    <footer className="border-t border-line bg-coal">
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
        {/* newsletter */}
        <div className="mb-14 flex flex-col gap-6 md:mb-20 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="label mb-3">Stay on the list</p>
            <h3 className="h-display max-w-md text-3xl md:text-5xl">
              First to know, first inside.
            </h3>
          </div>
          <form onSubmit={submit} className="flex w-full max-w-sm items-end gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              aria-label="Email address"
              className="w-full border-b border-line bg-transparent py-3 text-cream placeholder:text-muted/60 focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="label shrink-0 !text-cream transition-colors hover:!text-primary"
            >
              {state === "busy"
                ? "…"
                : state === "done"
                  ? "You're in ✓"
                  : state === "error"
                    ? "Retry →"
                    : "Subscribe →"}
            </button>
          </form>
        </div>

        {/* columns */}
        <div className="grid grid-cols-2 gap-10 border-t border-line pt-12 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/logo.png"
              alt="2BHK — Bar Hauté Kitchen"
              width={64}
              height={80}
              className="mb-4 h-20 w-auto"
            />
            <p className="text-sm leading-relaxed text-muted">{club.address}</p>
            <p className="mt-3 text-sm text-muted">{club.hours}</p>
          </div>
          <div>
            <p className="label mb-4">Explore</p>
            <ul className="space-y-2.5">
              {quick.map((l) => (
                <li key={l.href}>
                  <TransitionLink href={l.href} className="text-sm text-cream/80 transition-colors hover:text-primary">
                    {l.label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label mb-4">Legal</p>
            <ul className="space-y-2.5">
              {legal.map((l) => (
                <li key={l.href}>
                  <TransitionLink href={l.href} className="text-sm text-cream/80 transition-colors hover:text-primary">
                    {l.label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label mb-4">Follow</p>
            <ul className="space-y-2.5">
              {club.socials.map((s) => (
                <li key={s.name}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-cream/80 transition-colors hover:text-primary"
                  >
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* giant wordmark */}
      <div className="overflow-hidden border-t border-line">
        <p className="h-display -mb-[0.16em] whitespace-nowrap text-center text-[26vw] leading-none text-cream/[0.06]">
          2BHK
        </p>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-muted md:flex-row md:items-center md:justify-between md:px-8">
          <p>
            © {new Date().getFullYear()} {club.name} — {club.tagline} · {club.legalName} · GSTIN{" "}
            {club.gstin}. Drink responsibly — 21+ only.
          </p>
          <p>{club.phone}</p>
        </div>
      </div>
    </footer>
  );
}
