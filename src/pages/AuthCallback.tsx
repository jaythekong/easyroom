import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, KeyRound, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { parseCallbackTarget, type CallbackTarget } from '@/lib/authRedirect';

/** Only allow same-origin relative paths so an email link can never bounce users elsewhere. */
const sanitizeRedirect = (value: string | null): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
};

/** supabase-js picks the session out of the URL hash asynchronously; give it a moment. */
const waitForSession = async (attempts = 10, delayMs = 300) => {
  for (let i = 0; i < attempts; i++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) return session;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
};

const OTP_TYPES: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // When the email carries a token_hash we wait for a real click before redeeming
  // it: mail scanners open links automatically and would otherwise burn the
  // one-time token before the user ever sees the page.
  const [pending, setPending] = useState<{ tokenHash: string; type: EmailOtpType } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const hashParams = new URLSearchParams(window.location.hash.substring(1));

  // Where should the user end up? Sources, in priority order:
  //  1. `next` from the email template (= the redirect URL the app asked for)
  //  2. the current path, when Supabase redirected straight to our clean callback URL
  //  3. legacy `redirectTo` / `redirect_to` query params
  const legacyRedirect = sanitizeRedirect(
    searchParams.get('redirectTo') || searchParams.get('redirect_to') || hashParams.get('redirect_to'),
  );
  const target: CallbackTarget = (() => {
    const fromNext = parseCallbackTarget(searchParams.get('next'));
    if (fromNext.kind !== 'none') return fromNext;
    const fromPath = parseCallbackTarget(window.location.pathname);
    if (fromPath.kind !== 'none') return fromPath;
    if (legacyRedirect) {
      const m = legacyRedirect.match(/^\/([^/?#]+)\/auth(?:[/?#]|$)/);
      if (/[?&]mode=reset/.test(legacyRedirect)) return { kind: 'recovery', orgSlug: m ? m[1] : null };
      return { kind: 'to', path: legacyRedirect };
    }
    return { kind: 'none' };
  })();

  const orgSlugHint = target.kind === 'recovery' ? target.orgSlug : target.kind === 'invite' ? target.slug : null;
  const authPath = orgSlugHint ? `/${orgSlugHint}/auth` : '/auth';

  const fail = (code: string, details?: string) => {
    navigate(`${authPath}?error=${code}${details ? `&details=${encodeURIComponent(details)}` : ''}`);
  };

  /** Password reset: prefer the org in the link, else the user's primary org. */
  const resetFormPath = async (): Promise<string> => {
    if (target.kind === 'recovery' && target.orgSlug) return `/${target.orgSlug}/auth?mode=reset`;
    try {
      const { data: orgId } = await supabase.rpc('get_user_primary_organization_id');
      if (orgId) {
        const { data: org } = await supabase.from('organizations').select('slug').eq('id', orgId).maybeSingle();
        if (org?.slug) return `/${org.slug}/auth?mode=reset`;
      }
    } catch (err) {
      logger.debug('Could not resolve organization for reset page', err);
    }
    return '/auth?mode=reset';
  };

  /** Invite signup: email is confirmed and the session exists; now join the organization. */
  const completeInvite = async (token: string, slug: string) => {
    const { error } = await supabase.rpc('accept_invitation_link', { invitation_token: token });
    if (error && !error.message?.includes('INVITE_INVALID')) {
      logger.error('Accept invitation error:', error);
      setFailure(`Your email is confirmed, but joining the organization failed: ${error.message}`);
      return;
    }
    navigate(`/${slug}?welcome=true`);
  };

  const continueAfterSession = async () => {
    switch (target.kind) {
      case 'recovery':
        navigate(await resetFormPath());
        return;
      case 'invite':
        await completeInvite(target.token, target.slug);
        return;
      case 'to':
        navigate(target.path);
        return;
      default: {
        const pendingOrgSlug = localStorage.getItem('pendingOrgSlug');
        if (pendingOrgSlug) {
          localStorage.removeItem('pendingOrgSlug');
          navigate(`/${pendingOrgSlug}/onboarding`);
        } else {
          navigate('/select-org');
        }
      }
    }
  };

  const redeem = async () => {
    if (!pending) return;
    setVerifying(true);
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: pending.tokenHash, type: pending.type });
    if (error || !data.session?.user) {
      logger.error('Email link verification error:', error);
      setVerifying(false);
      setFailure(error?.message || 'This link is no longer valid. Please request a new one.');
      return;
    }
    await continueAfterSession();
  };

  useEffect(() => {
    const run = async () => {
      try {
        const rawType = searchParams.get('type') || hashParams.get('type');
        const type = (OTP_TYPES as string[]).includes(rawType || '') ? (rawType as EmailOtpType) : null;
        const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash') ||
                          searchParams.get('token') || hashParams.get('token');
        const hasImplicitSession = hashParams.has('access_token');

        // Supabase reports link problems in the hash (#error=...&error_description=...).
        const error = hashParams.get('error') || searchParams.get('error');
        const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
        if (error) {
          logger.error('Auth error from URL:', { error, errorDescription });
          fail('auth_failed', errorDescription || error);
          return;
        }

        if (tokenHash && type) {
          // Ask for a click before redeeming the one-time code.
          setPending({ tokenHash, type });
          return;
        }

        // Legacy implicit flow: Supabase already verified the link and put the session in the hash.
        const session = hasImplicitSession ? await waitForSession() : (await supabase.auth.getSession()).data.session;
        if (!session?.user) {
          logger.debug('No session found after callback');
          fail(type === 'recovery' ? 'recovery_failed' : 'callback_failed');
          return;
        }
        if (type === 'recovery' || target.kind === 'recovery') {
          navigate(await resetFormPath());
          return;
        }
        await continueAfterSession();
      } catch (err) {
        logger.error('Unexpected error in auth callback:', err);
        fail('unexpected');
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failure) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-6 rounded-xl border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold">That link didn't work</h2>
          <p className="text-muted-foreground">{failure}</p>
          <Button className="w-full" variant="outline" onClick={() => navigate(authPath)}>Back to sign in</Button>
        </div>
      </div>
    );
  }

  if (pending) {
    const isRecovery = pending.type === 'recovery';
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-6 rounded-xl border bg-card p-8 shadow-sm">
          {isRecovery ? <KeyRound className="w-10 h-10 mx-auto text-primary" /> : <MailCheck className="w-10 h-10 mx-auto text-primary" />}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{isRecovery ? 'Reset your password' : 'Confirm your email'}</h2>
            <p className="text-muted-foreground">
              {isRecovery
                ? 'Click continue to open the password reset form. This link can only be used once.'
                : 'Click continue to confirm your email address and finish setting up your account.'}
            </p>
          </div>
          <Button className="w-full" size="lg" disabled={verifying} onClick={redeem}>
            {verifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {verifying ? 'Verifying…' : 'Continue'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
        <h2 className="text-lg font-semibold">Confirming your email...</h2>
        <p className="text-muted-foreground">Please wait while we verify your account.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
