/**
 * Public HTTP API origin (reverse proxy to Convex `convex/http.ts`).
 * Set `VITE_PUBLIC_API_URL` in Vercel/local env to override (no trailing slash).
 */
const raw = import.meta.env.VITE_PUBLIC_API_URL;
export const PUBLIC_API_BASE_URL =
  typeof raw === "string" && raw.length > 0 ? raw.replace(/\/$/, "") : "https://api.sayelesend.com";
