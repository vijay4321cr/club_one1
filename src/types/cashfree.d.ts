declare module "@cashfreepayments/cashfree-js" {
  export interface CashfreeCheckoutResult {
    error?: { message?: string; [key: string]: unknown };
    redirect?: boolean;
    paymentDetails?: { paymentMessage?: string; [key: string]: unknown };
  }

  export interface CashfreeInstance {
    checkout(options: {
      paymentSessionId: string;
      redirectTarget?: "_self" | "_blank" | "_modal" | "_top";
      returnUrl?: string;
    }): Promise<CashfreeCheckoutResult>;
  }

  export function load(options: {
    mode: "sandbox" | "production";
  }): Promise<CashfreeInstance>;
}
