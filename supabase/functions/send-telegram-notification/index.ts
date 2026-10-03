import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// CORS: reflect the caller's origin only when it is on the allow-list.
// Extra origins can be added without a code change:
//   supabase secrets set ALLOWED_ORIGINS="https://example.com,https://other.com"
// ---------------------------------------------------------------------------
const DEFAULT_ORIGINS = [
  'https://easyroom.easyroom.workers.dev',
  'http://localhost:8080',
];
const allowedOrigins = [
  ...DEFAULT_ORIGINS,
  ...(Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((o) => o.trim()).filter(Boolean),
];

const corsFor = (req: Request) => {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
};

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsFor(req) },
  });

interface TelegramNotificationRequest {
  bookingId: string;
  organizationId: string;
  action: 'created' | 'updated' | 'cancelled';
}

interface TelegramUpdate {
  message?: {
    chat: { id: number, username?: string };
    from: { id: number, username?: string };
    text: string;
  };
}

// Messages are sent with parse_mode HTML. Everything that comes from users
// (titles, notes, names) must be escaped, otherwise a title such as "Q3_review"
// or "R&D <draft>" makes Telegram reject the whole message.
const esc = (value: unknown): string =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const DEFAULT_TZ = 'Asia/Phnom_Penh';
const safeTimeZone = (tz: string | null | undefined): string => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz || DEFAULT_TZ });
    return tz || DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
};

// Google Calendar wants UTC timestamps: YYYYMMDDTHHMMSSZ
const toCalendarUtc = (date: Date) =>
  date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsFor(req) });
  }

  try {
    const url = new URL(req.url);

    // Legacy: Telegram webhook for the shared bot (per-organization bots use telegram-bot-setup)
    if (req.method === 'POST' && url.pathname.includes('/webhook')) {
      return await handleTelegramWebhook(req);
    }

    // ---- Authenticate the caller -------------------------------------------------
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: authData, error: authError } = token
      ? await supabase.auth.getUser(token)
      : { data: { user: null }, error: new Error('Missing bearer token') };
    const caller = authData?.user;
    if (authError || !caller) {
      return json(req, { error: 'Not authenticated' }, 401);
    }

    // ---- Validate the request -------------------------------------------------------
    const { bookingId, organizationId, action }: TelegramNotificationRequest = await req.json();
    if (!bookingId || !organizationId || !['created', 'updated', 'cancelled'].includes(action)) {
      return json(req, { error: 'bookingId, organizationId and a valid action are required' }, 400);
    }

    // The caller must belong to the organization they are notifying about.
    const { data: membership } = await supabase
      .from('user_organization_memberships')
      .select('id')
      .eq('user_id', caller.id)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (!membership) {
      return json(req, { error: 'Not a member of this organization' }, 403);
    }

    console.log(`Processing Telegram notification for booking ${bookingId}, action: ${action}`);

    // Get organization's Telegram settings
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name, telegram_bot_token, timezone')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      console.error('Error fetching organization:', orgError);
      return json(req, { error: 'Organization not found' }, 404);
    }

    if (!organization.telegram_bot_token) {
      return json(req, { message: 'No Telegram bot token configured' });
    }

    // Get all subscribers for this organization
    const { data: subscriptions, error: subsError } = await supabase
      .from('telegram_subscriptions')
      .select('telegram_chat_id')
      .eq('organization_id', organizationId);

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      return json(req, { error: 'Failed to fetch subscriptions' }, 500);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return json(req, { message: 'No Telegram subscriptions found' });
    }

    // Get booking details with room information. The booking must belong to this
    // organization so a member of one org cannot trigger alerts about another's.
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        rooms!inner(name, location)
      `)
      .eq('id', bookingId)
      .eq('organization_id', organizationId)
      .single();

    if (bookingError || !booking) {
      console.error('Error fetching booking:', bookingError);
      return json(req, { error: 'Booking not found' }, 404);
    }

    // Get user profile information separately for the multi-organization structure
    const { data: userProfile, error: userProfileError } = await supabase
      .from('user_profiles')
      .select('display_name, email')
      .eq('user_id', booking.user_id)
      .eq('organization_id', organizationId)
      .single();

    if (userProfileError) {
      console.error('Error fetching user profile:', userProfileError);
      // Continue with fallback user info instead of failing
    }

    // Format date and time in the organization's own timezone. Edge functions run
    // in UTC, so without an explicit timeZone every time would be hours off.
    const timeZone = safeTimeZone(organization.timezone);
    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);
    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone,
    });
    const timeFmt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', timeZone };
    const timeStr = `${startDate.toLocaleTimeString('en-US', timeFmt)} - ${endDate.toLocaleTimeString('en-US', timeFmt)}`;

    const bookedBy = userProfile?.display_name || userProfile?.email || 'Unknown user';

    const calendarParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: booking.title,
      dates: `${toCalendarUtc(startDate)}/${toCalendarUtc(endDate)}`,
      details: `${booking.description || ''}\n\nBooked by: ${bookedBy}`,
      location: `${booking.rooms.name}${booking.rooms.location ? `, ${booking.rooms.location}` : ''}`,
    });
    const calendarLink = `https://calendar.google.com/calendar/render?${calendarParams.toString()}`;

    // Create message based on action
    const heading = {
      created: '📅 <b>New Room Booking</b>',
      updated: '📝 <b>Room Booking Updated</b>',
      cancelled: '❌ <b>Room Booking Cancelled</b>',
    }[action];

    const lines = [
      heading,
      '',
      `📍 <b>Room:</b> ${esc(booking.rooms.name)}`,
      booking.rooms.location ? `🏢 <b>Location:</b> ${esc(booking.rooms.location)}` : '',
      `📋 <b>Meeting:</b> ${esc(booking.title)}`,
      `👤 <b>Booked by:</b> ${esc(bookedBy)}`,
      `📅 <b>Date:</b> ${esc(dateStr)}`,
      `🕐 <b>Time:</b> ${esc(timeStr)}`,
      booking.attendees ? `👥 <b>Attendees:</b> ${esc(booking.attendees)}` : '',
      booking.description ? `📝 <b>Notes:</b> ${esc(booking.description)}` : '',
      action !== 'cancelled' ? `\n📲 <a href="${esc(calendarLink)}">Add to Calendar</a>` : '',
      '',
      `<i>${esc(organization.name)}</i>`,
    ];
    const telegramMessage = lines.filter((l, i) => l !== '' || lines[i - 1] !== '').join('\n');

    // Send message to all subscribers and record what Telegram really answered.
    const telegramUrl = `https://api.telegram.org/bot${organization.telegram_bot_token}/sendMessage`;

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        const res = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: subscription.telegram_chat_id,
            text: telegramMessage,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          throw new Error(`Telegram ${res.status} for chat ${subscription.telegram_chat_id}: ${detail.slice(0, 200)}`);
        }
      }),
    );

    const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    failures.forEach((f) => console.error(String(f.reason)));
    const sent = results.length - failures.length;

    console.log(`Telegram notifications sent: ${sent}/${subscriptions.length}`);

    return json(req, {
      success: sent > 0,
      sent,
      failed: failures.length,
      message: `Telegram notifications sent to ${sent} of ${subscriptions.length} subscribers`,
    });

  } catch (error: any) {
    console.error('Error sending Telegram notification:', error);
    return json(req, { error: error.message || 'Failed to send notification' }, 500);
  }
};

async function handleTelegramWebhook(req: Request): Promise<Response> {
  try {
    const update: TelegramUpdate = await req.json();

    if (!update.message?.text) {
      return new Response('OK', { status: 200 });
    }

    const chatId = update.message.chat.id;
    const username = update.message.from?.username || update.message.chat.username;
    const text = update.message.text.trim();

    console.log(`Received Telegram message from ${username}: ${text}`);

    if (text === '/start') {
      // The shared bot cannot tell which organization a user belongs to.
      // Per-organization bots are handled by the telegram-bot-setup function.
      const responseText = `Welcome! 🎉

To receive booking notifications, an admin needs to configure this bot for your organization.

Commands:
/start - Show this welcome message
/stop - Unsubscribe from notifications
/status - Check subscription status`;

      const telegramUrl = `https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/sendMessage`;

      await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: responseText }),
      });
    }

    return new Response('OK', { status: 200 });

  } catch (error: any) {
    console.error('Error handling Telegram webhook:', error);
    return new Response('OK', { status: 200 });
  }
}

serve(handler);
