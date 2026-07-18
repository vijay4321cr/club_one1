"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requestOtp, resendOtp, verifyOtp, ApiError, type NewUserDetails } from "@/lib/auth";

type Step = "phone" | "details" | "otp";

function LoginFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState<NewUserDetails>({ name: "", email: "", dob: "" });
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const fail = (e: unknown) =>
    setError(e instanceof ApiError ? e.message : "Something went wrong — please try again.");

  const sendOtp = async (withDetails?: NewUserDetails) => {
    setBusy(true);
    setError("");
    try {
      const r = await requestOtp(phone, withDetails);
      if (r.needsDetails) {
        setStep("details");
      } else {
        setDevOtp(r.devOtp);
        setStep("otp");
        setCooldown(30);
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const submitPhone = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(phone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    void sendOtp();
  };

  const submitDetails = (e: FormEvent) => {
    e.preventDefault();
    void sendOtp(details);
  };

  const submitOtp = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await verifyOtp(phone, otp.trim());
      router.push(next);
    } catch (err) {
      fail(err);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-5 py-28">
      <p className="label mb-3">Members</p>
      <h1 className="h-display text-4xl md:text-5xl">
        {step === "otp" ? (
          <>
            Check your
            <br />
            phone<span className="text-primary">.</span>
          </>
        ) : (
          <>
            Welcome
            <br />
            in<span className="text-primary">.</span>
          </>
        )}
      </h1>
      <p className="mt-4 text-sm text-muted">
        {step === "phone" && "Sign in with your mobile number — we'll text you a one-time code."}
        {step === "details" && "First time here! Tell us a little about you to create your account."}
        {step === "otp" && `We sent a one-time code to +91 ${phone}.`}
      </p>

      {step === "phone" && (
        <form onSubmit={submitPhone} className="mt-10 space-y-6">
          <Input
            label="Mobile number"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="10-digit number"
          />
          <Button type="submit" full disabled={busy}>
            {busy ? "Sending…" : "Send OTP"}
          </Button>
        </form>
      )}

      {step === "details" && (
        <form onSubmit={submitDetails} className="mt-10 space-y-6">
          <Input
            label="Full name"
            required
            value={details.name}
            onChange={(e) => setDetails({ ...details, name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            required
            value={details.email}
            onChange={(e) => setDetails({ ...details, email: e.target.value })}
          />
          <Input
            label="Date of birth"
            type="date"
            required
            max={new Date().toISOString().split("T")[0]}
            value={details.dob}
            onChange={(e) => setDetails({ ...details, dob: e.target.value })}
            onClick={(e) => e.currentTarget.showPicker?.()}
          />
          <Button type="submit" full disabled={busy}>
            {busy ? "Creating…" : "Create account & send OTP"}
          </Button>
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="label block w-full text-center !text-muted transition-colors hover:!text-cream"
          >
            ← Different number
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={submitOtp} className="mt-10 space-y-6">
          <Input
            label="One-time code"
            inputMode="numeric"
            maxLength={4}
            required
            autoFocus
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="4-digit code"
          />
          {devOtp && (
            <p className="text-xs text-gold">Staging OTP: {devOtp}</p>
          )}
          <Button type="submit" full disabled={busy || otp.length !== 4}>
            {busy ? "Verifying…" : "Verify & sign in"}
          </Button>
          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={cooldown > 0}
              onClick={async () => {
                try {
                  await resendOtp(phone);
                  setCooldown(30);
                } catch (e) {
                  fail(e);
                }
              }}
              className="label !text-muted transition-colors enabled:hover:!text-cream disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setOtp("");
              }}
              className="label !text-muted transition-colors hover:!text-cream"
            >
              Change number
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-5 text-sm text-primary">{error}</p>}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginFlow />
    </Suspense>
  );
}
