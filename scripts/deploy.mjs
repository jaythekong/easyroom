// Builds the app and deploys the Worker to the Easy Room Cloudflare account.
//
// Account safety
//   Wrangler keeps ONE login per Mac, shared by every project. A `wrangler login`
//   done for another project silently switches it to a different Cloudflare
//   account, and a deploy then fails halfway with "Authentication error 10000".
//   To avoid that, this script
//     1. uses a project-only API token if one is stored in `.deploy.local`
//        (a line `CLOUDFLARE_API_TOKEN=...`; the file is gitignored), and
//     2. checks up front that the account in use is the one named in wrangler.jsonc,
//        and stops with a clear message BEFORE building if it is not.
//
// It also passes the Supabase URL and public anon key from .env to the Worker as
// vars (used by the scheduled keep-alive ping).
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const parseEnvFile = (path) =>
  Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .filter((l) => /^\s*[A-Z_]+=/.test(l))
      .map((l) => {
        const [k, ...v] = l.split("=");
        return [k.trim(), v.join("=").trim().replace(/^"|"$/g, "")];
      }),
  );

const env = parseEnvFile(".env");
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing from .env");
  process.exit(1);
}

// ---- Which Cloudflare account must we deploy to? ------------------------------------
const accountId = /"account_id"\s*:\s*"([0-9a-f]{32})"/.exec(readFileSync("wrangler.jsonc", "utf8"))?.[1];
if (!accountId) {
  console.error("No account_id found in wrangler.jsonc");
  process.exit(1);
}

const childEnv = { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId };
if (existsSync(".deploy.local")) {
  const local = parseEnvFile(".deploy.local");
  if (local.CLOUDFLARE_API_TOKEN) childEnv.CLOUDFLARE_API_TOKEN = local.CLOUDFLARE_API_TOKEN;
}
const usingToken = Boolean(childEnv.CLOUDFLARE_API_TOKEN);

// ---- Preflight: can we reach that account? -----------------------------------------
const who = spawnSync("npx", ["wrangler", "whoami"], { env: childEnv, encoding: "utf8", shell: process.platform === "win32" });
const whoText = `${who.stdout || ""}${who.stderr || ""}`;
const knowsAccount = whoText.includes(accountId) || (usingToken && who.status === 0 && !/not authenticated/i.test(whoText));
if (!knowsAccount) {
  console.error(`
Cannot deploy: this Mac's Wrangler login does not include the Easy Room account (${accountId}).
${usingToken ? "The API token in .deploy.local does not have access to that account." : "Another project's `wrangler login` probably replaced it."}

Fix, either way:
  - quick:      run \`wrangler login\` and choose the Easy Room account on the Cloudflare page, then deploy again.
  - permanent:  create an API token for Easy Room only (Cloudflare dashboard > Easy Room account >
                Manage account > Account API tokens > "Edit Cloudflare Workers" template),
                then save it in .deploy.local as   CLOUDFLARE_API_TOKEN=<token>
                so other projects can never switch it.
`);
  process.exit(1);
}

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", env: childEnv, shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run("npx", ["vite", "build"]);
run("npx", ["wrangler", "deploy", "--var", `SUPABASE_URL:${url}`, "--var", `SUPABASE_ANON_KEY:${key}`, ...process.argv.slice(2)]);
