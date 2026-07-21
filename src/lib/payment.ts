"use client";

/**
 * Shared gateway checkout — opens Cashfree (preferred) or Razorpay from an
 * init/order response and resolves with the fields the caller passes to its
 * confirm endpoint. Used by both ticket purchase and table booking.
 */

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

let razorpayLoader: Promise<boolean> | null = null;
function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  razorpayLoader ??= new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => {
      razorpayLoader = null;
      resolve(false);
    };
    document.body.appendChild(s);
  });
  return razorpayLoader;
}

/** payment fields any init/order response may carry */
export interface PaymentOrder {
  orderid: string;
  amount: number; // rupees
  currency?: string;
  payment_session_id?: string | null;
  cashfreeEnv?: string;
  razorpayKeyId?: string;
}

export interface CheckoutPrefill {
  name: string;
  email: string;
  contact?: string;
  description: string;
}

export type CheckoutResult =
  | { status: "cashfree"; order_id: string }
  | {
      status: "razorpay";
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }
  | { status: "dismissed" }
  | { status: "error"; message: string }
  | { status: "no_provider" };

/**
 * Opens the right gateway modal and resolves once the user pays or dismisses.
 * The caller then verifies via its own confirm endpoint using the returned
 * fields. Never throws.
 */
export async function openCheckout(
  order: PaymentOrder,
  prefill: CheckoutPrefill
): Promise<CheckoutResult> {
  const sessionId =
    order.payment_session_id && order.payment_session_id !== "null"
      ? order.payment_session_id
      : undefined;

  /* ---- Cashfree ---- */
  if (sessionId) {
    const { load } = await import("@cashfreepayments/cashfree-js");
    const attempt = async (mode: "sandbox" | "production") => {
      const cashfree = await load({ mode });
      return cashfree.checkout({ paymentSessionId: sessionId, redirectTarget: "_modal" });
    };
    const configured: "sandbox" | "production" =
      order.cashfreeEnv === "production"
        ? "production"
        : order.cashfreeEnv === "sandbox"
          ? "sandbox"
          : process.env.NEXT_PUBLIC_CASHFREE_MODE === "production"
            ? "production"
            : "sandbox";
    let result = await attempt(configured);
    const invalidSession = (r: typeof result) =>
      !!r.error &&
      /payment_session_id/i.test(
        String((r.error as { code?: string }).code ?? r.error.message ?? "")
      );
    if (invalidSession(result)) {
      result = await attempt(configured === "sandbox" ? "production" : "sandbox");
    }
    if (result.error) {
      return { status: "error", message: result.error.message ?? "Payment was not completed." };
    }
    return { status: "cashfree", order_id: order.orderid };
  }

  /* ---- Razorpay ---- */
  if (order.razorpayKeyId) {
    if (!(await loadRazorpay()) || !window.Razorpay) {
      return { status: "error", message: "Could not load the payment window — try again." };
    }
    return new Promise<CheckoutResult>((resolve) => {
      const rzp = new window.Razorpay!({
        key: order.razorpayKeyId,
        order_id: order.orderid,
        amount: Math.round(order.amount * 100),
        currency: order.currency ?? "INR",
        name: "2BHK — Bar ‹Hauté› Kitchen",
        description: prefill.description,
        prefill: { name: prefill.name, email: prefill.email, contact: prefill.contact },
        theme: { color: "#e10600" },
        modal: { ondismiss: () => resolve({ status: "dismissed" }) },
        handler: (resp: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) =>
          resolve({
            status: "razorpay",
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          }),
      });
      rzp.open();
    });
  }

  return { status: "no_provider" };
}
