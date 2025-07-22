import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramNotificationRequest {
  bookingId: string;
  organizationId: string;
  action: 'created' | 'updated' | 'cancelled';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      .select('name, telegram_bot_token, telegram_chat_id')
      .eq('id', organizationId)
      .single();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
      throw new Error('Failed to fetch organization');
    }

    if (!organization.telegram_bot_token || !organization.telegram_chat_id) {
      console.log('No Telegram configuration found for organization');
      return new Response(JSON.stringify({ 
        message: 'No Telegram configuration found' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get booking details with room and user information
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        rooms!inner(name, location),
        user_profiles!inner(display_name, email)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('Error fetching booking:', bookingError);
      throw new Error('Failed to fetch booking details');
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
👤 *Booked by:* ${booking.user_profiles.display_name || booking.user_profiles.email}
📅 *Date:* ${dateStr}
🕐 *Time:* ${timeStr}
${booking.attendees ? `👥 *Attendees:* ${booking.attendees}` : ''}
${booking.description ? `📝 *Notes:* ${booking.description}` : ''}

_${organization.name}_`;

    // Send message to Telegram
    const telegramUrl = `https://api.telegram.org/bot${organization.telegram_bot_token}/sendMessage`;
    
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: organization.telegram_chat_id,
        text: telegramMessage,
        parse_mode: 'Markdown',
      }),
    });

    const telegramResult = await telegramResponse.json();

    if (!telegramResponse.ok) {
      console.error('Telegram API error:', telegramResult);
      throw new Error(`Telegram API error: ${telegramResult.description || 'Unknown error'}`);
    }

    console.log('Telegram notification sent successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Telegram notification sent successfully',
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

serve(handler);