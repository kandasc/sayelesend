/**
 * SayelePay hosted checkout URL (browser redirect after creating a payment intent).
 * Override with `VITE_SAYELE_PAY_CHECKOUT_URL` (full URL including path, no trailing `?`).
 */
const rawCheckout = import.meta.env.VITE_SAYELE_PAY_CHECKOUT_URL;
export const SAYELE_PAY_CHECKOUT_URL =
  typeof rawCheckout === "string" && rawCheckout.length > 0
    ? rawCheckout.replace(/\/$/, "")
    : "https://sayelepay.com/checkout";
