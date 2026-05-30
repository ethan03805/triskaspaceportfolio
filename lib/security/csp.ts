// Pure, dependency-free CSP builder. Imported by next.config.ts (build/runtime)
// and by tests. Must not import "server-only" or any app module.

/**
 * Build the Content-Security-Policy header value.
 *
 * Production is strict. Development adds 'unsafe-eval' (required by React Fast
 * Refresh under `next dev`) and a websocket connect source (HMR) so local
 * development keeps working while the rest of the policy stays faithful to prod.
 */
export function contentSecurityPolicy(opts: { dev?: boolean } = {}): string {
  const dev = opts.dev ?? process.env.NODE_ENV !== "production";

  const scriptSrc = ["'self'", "'unsafe-inline'"]; // nonce-tightening deferred to Plan 7
  const connectSrc = ["'self'"]; // chat API + serenity now-proxy (same origin)
  if (dev) {
    scriptSrc.push("'unsafe-eval'");
    connectSrc.push("ws:");
  }

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'"], // CSS modules + the --ink inline style on <html>
    "img-src": ["'self'", "data:"],
    "font-src": ["'self'"], // next/font self-hosts at build time
    "connect-src": connectSrc,
    "media-src": ["'self'", "https://stream.underclassradio.com"], // the live Serenity stream
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
  };

  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(" ")}`)
    .join("; ");
}

/** CSP plus standard hardening headers, in Next.js `headers()` shape. */
export function securityHeaders(): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy() },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ];
}
