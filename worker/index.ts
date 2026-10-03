// Cloudflare Worker entry for EasyRoom.
//
// 1. fetch(): serves the Vite build from ./dist via the ASSETS binding and adds
//    a few security headers. SPA fallback (unknown paths -> index.html) is
//    handled by `not_found_handling` in wrangler.jsonc.
// 2. scheduled(): keep-alive ping for the Supabase project (Roomer). Supabase
//    pauses free projects after ~7 days without activity; a real query every
//    few days prevents that. Schedule is set under `triggers.crons` in wrangler.jsonc.

interface Env {
  ASSETS: Fetcher;
  SUPABASE_URL: string;       // set at deploy time from .env (see scripts/deploy.mjs)
  SUPABASE_ANON_KEY: string;  // public anon key, same one shipped in the browser bundle
}

async function keepAlive(env: Env): Promise<void> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    console.warn("keep-alive skipped: SUPABASE_URL / SUPABASE_ANON_KEY not set");
    return;
  }
  const url = `${env.SUPABASE_URL}/rest/v1/organizations?select=id&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      Prefer: "count=none",
    },
  });
  console.log(`keep-alive ping -> ${res.status} ${res.statusText}`);
  if (!res.ok) throw new Error(`Supabase keep-alive failed: ${res.status}`);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(keepAlive(env));
  },
} satisfies ExportedHandler<Env>;
