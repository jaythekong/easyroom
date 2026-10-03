# EasyRoom: working notes for Claude

Meeting-room booking app (Vite + React + shadcn-ui + Supabase). Cloned from github.com/jaythekong/easyroom (Lovable), then moved to the owner's own accounts.

## Where everything lives

| Piece | Where |
|---|---|
| Website | Cloudflare Worker `easyroom`, account **Easy Room** (`efa197073df6d55bebfa0293051a38f8`), https://easyroom.easyroom.workers.dev |
| Database, auth, storage, edge functions | Supabase project **Roomer** (`yjdrwwelnuyuifjqfebv`), organization "JES" (free plan) |
| Email (resets, signup confirmation) | Brevo free SMTP, sender easyroom.asia@gmail.com, set in Supabase Auth > SMTP |
| Telegram | Per-organization bots, handled by Supabase edge functions |
| Domain easyroom.asia | Expired and not being renewed. Do not rely on it. |

Never deploy this project to any other Cloudflare account (the owner also has "Dalo Chat", "Dalo CRM", "Phsa Phum Sen Sok" and a personal account) or to any other Supabase project.

## Deploying

- **Website:** `npm run deploy` from this folder. It checks the account first, builds, then deploys, and prints the live URL.
- **Edge function:** `supabase functions deploy <name> --project-ref yjdrwwelnuyuifjqfebv --no-verify-jwt` (use the installed `supabase`, not `npx supabase`).
- **Cloudflare login is shared by every project on this Mac.** If `npm run deploy` stops with "does not include the Easy Room account", another project's `wrangler login` replaced it. Fix with `wrangler login` and choose Easy Room, or (permanent) put a token in `.deploy.local` (see below). Always check `wrangler whoami` lists "Easy Room".
- **Permanent fix (done 2026-10-03):** a Cloudflare API token named `easyroom-deploy`, limited to the Easy Room account (Workers permissions only), is saved in `.deploy.local` (gitignored, mode 600). `scripts/deploy.mjs` uses it automatically, so `npm run deploy` works no matter whose `wrangler login` is active. To replace or revoke it: Cloudflare dashboard > Easy Room > Manage account > Account API tokens. To recreate: use the "Edit Cloudflare Workers" template scoped to Easy Room, copy the token, run
  `printf 'CLOUDFLARE_API_TOKEN=%s\n' "$(pbpaste)" > .deploy.local && chmod 600 .deploy.local`, then clear the clipboard (`printf '' | pbcopy`). Never print or paste the token into chat.
- After a deploy, verify: the live bundle name matches `dist/assets/index-*.js`, then spot-check in the browser.

## Things that bit us (do not repeat)

- Supabase changes made via the Management API are blocked by the permission system for auth config and templates. Use the Supabase dashboard in Chrome (Monaco editors accept `window.monaco.editor.getModels()[0].setValue(...)`), and have the owner click Save.
- Email links must carry state in **path segments**, not query strings. Brevo click tracking drops everything after a nested `?`. See `src/lib/authRedirect.ts`.
- Email links use `token_hash` plus a **Continue button** (`src/pages/AuthCallback.tsx`) so mail scanners cannot burn one-time codes. Templates live in Supabase Auth > Emails.
- The invitations table only allows link invites (`email` must be NULL). The "Email Invite" dialog creates a link.
- Telegram function (`supabase/functions/send-telegram-notification`) requires a signed-in organization member, formats times in the organization's timezone, escapes HTML. Test it with `npm run test:telegram`. Do not send live test alerts without asking: they reach real subscribers.
- Cancel flows alert Telegram **before** deleting (the function reads the booking).
- Supabase free projects pause after about a week idle; the Worker cron (Mon and Thu 06:00 UTC) pings the database to prevent that (`npm run cf:test-cron`).

## Conventions

- Production data is real (about 41 users). Reads of Roomer are fine when needed; anything that changes live data, auth settings, or messages real people needs the owner's go-ahead.
- Keep user-visible text in English only (the owner decided Khmer is not needed).
- The owner prefers short, plain explanations and wants things working end to end, then verified on the live site.
