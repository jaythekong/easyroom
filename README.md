# EasyRoom

Meeting-room booking for organizations. People sign in to their organization's page, book a room on a timeline, and get Telegram alerts when rooms are booked or cancelled. Admins invite people with links and manage rooms and teams.

## Stack

- Vite, React, TypeScript, Tailwind, shadcn-ui
- Supabase (database, auth, storage, edge functions) for the backend
- Cloudflare Workers to serve the site, with a scheduled job that keeps the database awake
- Brevo SMTP for password-reset and signup emails; per-organization Telegram bots for alerts

## Run it locally

```sh
npm install --legacy-peer-deps
npm run dev          # http://localhost:8080
```

Copy the Supabase URL and public key into `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).

## Deploy

```sh
npm run deploy       # builds, checks the Cloudflare account, deploys the Worker
supabase functions deploy send-telegram-notification --project-ref <ref> --no-verify-jwt
```

Deploying needs a Cloudflare API token in `.deploy.local` (see `CLAUDE.md`).

## Useful scripts

| Command | What it does |
|---|---|
| `npm run test:telegram` | Tests the Telegram alert function locally with a fake database |
| `npm run cf:test-cron` | Fires the keep-alive job once, locally |
| `npm run lint` | Lints the code |

## More

`CLAUDE.md` holds the working notes: where everything lives, how deploys work, problems already solved, and the list of open improvements.
