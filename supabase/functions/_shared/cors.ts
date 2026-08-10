// Shared CORS helper: reflects only trusted origins instead of using a wildcard.

const DEFAULT_ORIGIN = "https://inpt.org.in";

const STATIC_ALLOWED = new Set(
  [
    "https://inpt.org.in",
    "https://www.inpt.org.in",
    "https://mosque-web.lovable.app",
    "http://localhost:8080",
    "http://localhost:5173",
    ...(Deno.env.get("ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  ].map((o) => o.toLowerCase()),
);

// Lovable preview / staging hosts
const ALLOWED_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
  /^https:\/\/[a-z0-9-]+\.sandbox\.lovable\.dev$/i,
];

const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const value = origin.toLowerCase();
  return STATIC_ALLOWED.has(value) || ALLOWED_PATTERNS.some((p) => p.test(value));
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin! : DEFAULT_ORIGIN,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// Fallback for modules that need headers outside a request scope.
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": DEFAULT_ORIGIN,
  "Access-Control-Allow-Headers": ALLOWED_HEADERS,
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  Vary: "Origin",
};
