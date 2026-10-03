/**
 * Builders and parsers for the URLs Supabase sends users back to after they
 * click an email link.
 *
 * The redirect URL travels through the email template (`{{ .RedirectTo }}`)
 * and through the mail provider's click-tracking redirector. Query strings do
 * not survive that trip (anything after a nested "?" gets dropped), so every
 * piece of state is carried in path segments instead:
 *
 *   /auth/callback/recovery/<orgSlug | _>
 *   /auth/callback/invite/<inviteToken>/<orgSlug>
 *   /auth/callback/to/<base64url(path)>
 */

export type CallbackTarget =
  | { kind: 'recovery'; orgSlug: string | null }
  | { kind: 'invite'; token: string; slug: string }
  | { kind: 'to'; path: string }
  | { kind: 'none' };

const b64url = {
  encode: (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  decode: (s: string) => {
    const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
    return decodeURIComponent(escape(atob(padded)));
  },
};

const seg = (s: string) => encodeURIComponent(s);

export function buildCallbackPath(target: Exclude<CallbackTarget, { kind: 'none' }>): string {
  switch (target.kind) {
    case 'recovery':
      return `/auth/callback/recovery/${seg(target.orgSlug || '_')}`;
    case 'invite':
      return `/auth/callback/invite/${seg(target.token)}/${seg(target.slug)}`;
    case 'to':
      return `/auth/callback/to/${b64url.encode(target.path)}`;
  }
}

export function buildCallbackUrl(target: Exclude<CallbackTarget, { kind: 'none' }>): string {
  return `${window.location.origin}${buildCallbackPath(target)}`;
}

/** Accepts a full URL or a path. Unknown shapes yield { kind: 'none' }. */
export function parseCallbackTarget(value: string | null | undefined): CallbackTarget {
  if (!value) return { kind: 'none' };
  let pathname: string;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return { kind: 'none' };
    pathname = url.pathname;
  } catch {
    return { kind: 'none' };
  }
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  // ["auth", "callback", kind, ...rest]
  if (parts[0] !== 'auth' || parts[1] !== 'callback') return { kind: 'none' };
  const [, , kind, a, b] = parts;
  switch (kind) {
    case 'recovery':
      return { kind: 'recovery', orgSlug: a && a !== '_' ? a : null };
    case 'invite':
      return a && b ? { kind: 'invite', token: a, slug: b } : { kind: 'none' };
    case 'to':
      try {
        const path = a ? b64url.decode(a) : '';
        return path.startsWith('/') ? { kind: 'to', path } : { kind: 'none' };
      } catch {
        return { kind: 'none' };
      }
    default:
      return { kind: 'none' };
  }
}
