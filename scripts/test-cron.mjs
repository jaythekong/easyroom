// Runs the Worker locally with --test-scheduled and fires the cron handler once.
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const env = Object.fromEntries(
  readFileSync(".env", "utf8").split("\n").filter((l) => /^\s*[A-Z_]+=/.test(l))
    .map((l) => { const [k, ...v] = l.split("="); return [k.trim(), v.join("=").trim().replace(/^"|"$/g, "")]; }),
);
const port = 8791;
const dev = spawn("npx", ["wrangler", "dev", "--test-scheduled", "--port", String(port),
  "--var", `SUPABASE_URL:${env.VITE_SUPABASE_URL}`, "--var", `SUPABASE_ANON_KEY:${env.VITE_SUPABASE_PUBLISHABLE_KEY}`],
  { stdio: ["ignore", "pipe", "pipe"] });
let out = "";
const onData = (d) => { out += d.toString(); };
dev.stdout.on("data", onData); dev.stderr.on("data", onData);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = false;
for (let i = 0; i < 40 && !/Ready on/.test(out); i++) await sleep(500);
try {
  const r = await fetch(`http://localhost:${port}/__scheduled?cron=0+6+*+*+1,4`);
  console.log("trigger ->", r.status, await r.text());
  await sleep(2500);
  const line = out.split("\n").find((l) => /keep-alive/.test(l));
  console.log("worker log ->", line ?? "(no keep-alive log line found)");
  ok = /keep-alive ping -> 200/.test(out);
} finally { dev.kill("SIGTERM"); }
process.exit(ok ? 0 : 1);
