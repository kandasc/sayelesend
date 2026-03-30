/**
 * Vercel Edge: proxy public HTTP API + webhooks to Convex.
 * Set CONVEX_HTTP_ORIGIN in the Vercel project (e.g. https://original-guanaco-912.convex.site).
 */
const DEFAULT_CONVEX_HTTP_ORIGIN = "https://original-guanaco-912.convex.site";

export const config = {
  matcher: ["/api/:path*", "/webhooks/:path*"],
};

function convexOrigin(): string {
  const raw = process.env.CONVEX_HTTP_ORIGIN?.trim();
  const base = raw && raw.length > 0 ? raw : DEFAULT_CONVEX_HTTP_ORIGIN;
  return base.replace(/\/$/, "");
}

export default function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const target = `${convexOrigin()}${url.pathname}${url.search}`;
  return fetch(new Request(target, request), { redirect: "manual" });
}
