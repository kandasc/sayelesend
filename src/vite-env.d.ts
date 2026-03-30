/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_CONVEX_URL?: string;
  /** Public REST API host (e.g. https://api.sayelesend.com). */
  readonly VITE_PUBLIC_API_URL?: string;
  /** SayelePay hosted checkout URL (e.g. https://sayelepay.com/checkout). */
  readonly VITE_SAYELE_PAY_CHECKOUT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
