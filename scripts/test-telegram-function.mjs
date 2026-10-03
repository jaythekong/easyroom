// Runs supabase/functions/send-telegram-notification locally against a fake database and fake Telegram.
// Usage: npm run test:telegram   (no network, no Deno needed)
import { createRequire } from 'node:module'; const { build } = createRequire(process.cwd() + '/package.json')('esbuild');
import { pathToFileURL } from 'node:url';
import { mkdtempSync } from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path'; const TMP = mkdtempSync(join(tmpdir(), 'tgtest-'));

const ROOT = process.cwd();
const stubs = {
  'https://deno.land/std@0.190.0/http/server.ts': `export const serve = (h) => { globalThis.__handler = h; };`,
  'https://esm.sh/@supabase/supabase-js@2': `export const createClient = () => globalThis.__db();`,
};
await build({
  entryPoints: [`${ROOT}/supabase/functions/send-telegram-notification/index.ts`],
  bundle: true, format: 'esm', platform: 'node', outfile: `${TMP}/fn.mjs`, logLevel: 'error',
  plugins: [{ name: 'stub', setup(b) {
    b.onResolve({ filter: /^https:/ }, a => ({ path: a.path, namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, a => ({ contents: stubs[a.path], loader: 'js' }));
  }}],
});

globalThis.Deno = { env: { get: (k) => ({ SUPABASE_URL: 'http://x', SUPABASE_SERVICE_ROLE_KEY: 'k' })[k] } };

// ---- fake database -------------------------------------------------------------
let scenario;
const tables = () => ({
  user_organization_memberships: scenario.member ? { id: 'm1' } : null,
  organizations: { name: 'UYFC', telegram_bot_token: '123:abc', timezone: 'Asia/Phnom_Penh' },
  telegram_subscriptions: [{ telegram_chat_id: '111' }, { telegram_chat_id: '222' }],
  bookings: scenario.booking,
  user_profiles: { display_name: 'Dara', email: 'd@x.com' },
});
globalThis.__db = () => ({
  auth: { getUser: async (t) => t === 'good' ? { data: { user: { id: 'u1' } }, error: null } : { data: { user: null }, error: { message: 'bad' } } },
  from: (table) => {
    const data = tables()[table];
    const q = { select: () => q, eq: () => q, single: async () => ({ data, error: data ? null : { message: 'nf' } }),
      maybeSingle: async () => ({ data, error: null }), then: (res) => res({ data, error: null }) };
    return q;
  },
});

await import(pathToFileURL(`${TMP}/fn.mjs`).href);
const handler = globalThis.__handler;

const sent = [];
globalThis.fetch = async (url, init) => {
  const body = JSON.parse(init.body); sent.push(body);
  return scenario.telegramOk === false ? new Response('{"description":"can\'t parse entities"}', { status: 400 }) : new Response('{"ok":true}', { status: 200 });
};

const booking = { id: 'b1', title: 'Q3_review <draft> R&D *x*', description: 'a_b', attendees: 5, user_id: 'u9',
  start_time: '2026-10-05T02:00:00Z', end_time: '2026-10-05T03:30:00Z', rooms: { name: '6th Floor Meeting Room', location: '6th Floor' } };

const call = async (opts, headers = {}) => {
  scenario = opts; sent.length = 0;
  const res = await handler(new Request('http://x/functions/v1/send-telegram-notification', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://easyroom.easyroom.workers.dev', ...headers },
    body: JSON.stringify({ bookingId: 'b1', organizationId: 'o1', action: 'created' }) }));
  return { status: res.status, cors: res.headers.get('access-control-allow-origin'), body: await res.json() };
};
const results = [];
const check = (name, ok, extra='') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); };

let r = await call({ member: true, booking }, {});
check('no token is rejected with 401', r.status === 401, `(got ${r.status})`);
r = await call({ member: true, booking }, { Authorization: 'Bearer nope' });
check('bad token is rejected with 401', r.status === 401, `(got ${r.status})`);
r = await call({ member: false, booking }, { Authorization: 'Bearer good' });
check('signed-in non-member is rejected with 403', r.status === 403 && sent.length === 0, `(got ${r.status}, telegram calls ${sent.length})`);
r = await call({ member: true, booking: null }, { Authorization: 'Bearer good' });
check('booking from another organization gives 404, nothing sent', r.status === 404 && sent.length === 0, `(got ${r.status})`);
r = await call({ member: true, booking }, { Authorization: 'Bearer good' });
check('member gets 200 and CORS allows the new site', r.status === 200 && r.cors === 'https://easyroom.easyroom.workers.dev', `(cors ${r.cors})`);
check('both subscribers were messaged', sent.length === 2 && r.body.sent === 2);
const msg = sent[0]?.text ?? '';
check('uses HTML parse mode', sent[0]?.parse_mode === 'HTML');
check('time is shown in Cambodia time (09:00 AM - 10:30 AM)', /09:00 AM - 10:30 AM/.test(msg), `\n      ${msg.split('\n').find(l => l.includes('Time'))}`);
check('date is Monday, October 5, 2026', /Monday, October 5, 2026/.test(msg));
check('user text is HTML-escaped', msg.includes('Q3_review &lt;draft&gt; R&amp;D *x*') && !msg.includes('<draft>'));
check('calendar link uses UTC timestamps', /20261005T020000Z%2F20261005T033000Z|20261005T020000Z\/20261005T033000Z/.test(decodeURIComponent(msg)) );
r = await call({ member: true, booking, telegramOk: false }, { Authorization: 'Bearer good' });
check('Telegram rejection is reported as failed, not success', r.body.success === false && r.body.failed === 2, `(${JSON.stringify(r.body)})`);
const pre = await handler(new Request('http://x/', { method: 'OPTIONS', headers: { Origin: 'https://easyroom.easyroom.workers.dev' } }));
check('preflight answers the new origin', pre.headers.get('access-control-allow-origin') === 'https://easyroom.easyroom.workers.dev');
const evil = await handler(new Request('http://x/', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }));
check('preflight does not echo an unknown origin', evil.headers.get('access-control-allow-origin') !== 'https://evil.example');

console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
