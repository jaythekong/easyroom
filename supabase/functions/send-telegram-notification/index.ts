import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Enhanced CORS headers with improved security
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://easyroom.asia',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Handle webhook setup for bot commands
    if (req.method === 'POST' && url.pathname.includes('/webhook')) {
      return await handleTelegramWebhook(req);
    }

    // Handle notification sending
    const { bookingId, organizationId, action }: TelegramNotificationRequest = await req.json();

    console.log(`Processing Telegram notification for booking ${bookingId}, action: ${action}`);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get organization's Telegram settings
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name, telegram_bot_token')
      .eq('id', organizationId)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
      throw new Error('Failed to fetch organization');
    }

    if (!organization.telegram_bot_token) {
      console.log('No Telegram bot token found for organization');
      return new Response(JSON.stringify({ 
        message: 'No Telegram bot token configured' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get all subscribers for this organization
    const { data: subscriptions, error: subsError } = await supabase
      .from('telegram_subscriptions')
      .select('telegram_chat_id')
      .eq('organization_id', organizationId);

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      throw new Error('Failed to fetch subscriptions');
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No Telegram subscriptions found for organization');
      return new Response(JSON.stringify({ 
        message: 'No Telegram subscriptions found' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get booking details with room information
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        rooms!inner(name, location)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('Error fetching booking:', bookingError);
      throw new Error('Failed to fetch booking details');
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
      // Continue with fallback user info instead of throwing error
    }

    // Format date and time
    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);
    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = `${startDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })} - ${endDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;

    // Create Google Calendar link (works on both iPhone and Android)
    const formatDateForCalendar = (date: Date) => {
      // Format as YYYYMMDDTHHMMSS without timezone to preserve local time
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };
    
    const calendarParams = new URLSearchParams({
      action: 'TEMPLATE',
      text: booking.title,
      dates: `${formatDateForCalendar(startDate)}/${formatDateForCalendar(endDate)}`,
      details: `${booking.description || ''}\n\nBooked by: ${userProfile?.display_name || userProfile?.email || 'Unknown user'}`,
      location: `${booking.rooms.name}${booking.rooms.location ? `, ${booking.rooms.location}` : ''}`,
    });
    
    const calendarLink = `https://calendar.google.com/calendar/render?${calendarParams.toString()}`;

    // Create message based on action
    let message = '';
    let emoji = '';
    
    switch (action) {
      case 'created':
        emoji = '📅';
        message = `*New Room Booking*`;
        break;
      case 'updated':
        emoji = '📝';
        message = `*Room Booking Updated*`;
        break;
      case 'cancelled':
        emoji = '❌';
        message = `*Room Booking Cancelled*`;
        break;
    }

    const telegramMessage = `${emoji} ${message}

📍 *Room:* ${booking.rooms.name}
${booking.rooms.location ? `🏢 *Location:* ${booking.rooms.location}` : ''}
📋 *Meeting:* ${booking.title}
👤 *Booked by:* ${userProfile?.display_name || userProfile?.email || 'Unknown user'}
📅 *Date:* ${dateStr}
🕐 *Time:* ${timeStr}
${booking.attendees ? `👥 *Attendees:* ${booking.attendees}` : ''}
${booking.description ? `📝 *Notes:* ${booking.description}` : ''}
${action !== 'cancelled' ? `\n📲 [Add to Calendar](${calendarLink})` : ''}

_${organization.name}_`;

    // Send message to all subscribers
    const telegramUrl = `https://api.telegram.org/bot${organization.telegram_bot_token}/sendMessage`;
    
    const sendPromises = subscriptions.map(subscription => 
      fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: subscription.telegram_chat_id,
          text: telegramMessage,
          parse_mode: 'Markdown',
        }),
      })
    );

    const results = await Promise.allSettled(sendPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`Telegram notifications sent: ${successCount}/${subscriptions.length}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Telegram notifications sent to ${successCount} subscribers`,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error sending Telegram notification:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to send notification',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
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

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    if (text === '/start') {
      // For now, we'll need to determine which organization this bot belongs to
      // This could be improved by having organization-specific bot tokens
      
      const responseText = `Welcome! 🎉

To receive booking notifications, an admin needs to configure this bot for your organization.

Commands:
/start - Show this welcome message
/stop - Unsubscribe from notifications
/status - Check subscription status`;

      const telegramUrl = `https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/sendMessage`;
      
      await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: responseText,
        }),
      });
    }

    return new Response('OK', { status: 200 });

  } catch (error: any) {
    console.error('Error handling Telegram webhook:', error);
    return new Response('OK', { status: 200 });
  }
}

serve(handler);