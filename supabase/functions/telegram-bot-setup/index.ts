import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Enhanced CORS headers with improved security
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface TelegramUpdate {
  message?: {
    chat: { id: number, username?: string, type: string };
    from: { id: number, username?: string, first_name?: string };
    text: string;
  };
}

interface WebhookSetupRequest {
  organizationId: string;
  botToken: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Handle webhook setup - check if body contains organizationId and botToken
    const body = await req.text();
    let parsedBody;
    
    try {
      parsedBody = JSON.parse(body);
    } catch {
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
    }
    
    // If request contains organizationId and botToken, it's a setup request
    if (parsedBody.organizationId && parsedBody.botToken) {
      return await handleWebhookSetup(parsedBody);
    }
    
    // Otherwise, it's a webhook from Telegram
    if (req.method === 'POST') {
      return await handleTelegramWebhook(req, parsedBody);
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  } catch (error: any) {
    console.error('Error in telegram-bot-setup:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

async function handleWebhookSetup(requestData: WebhookSetupRequest): Promise<Response> {
  try {
    const { organizationId, botToken } = requestData;
    
    console.log(`Setting up webhook for organization ${organizationId}`);

    // Validate bot token format
    if (!botToken || !botToken.match(/^\d+:[A-Za-z0-9_-]{35}$/)) {
      throw new Error('Invalid bot token format. Should be like: 123456789:ABCdefGhIjKlMnOpQrStUvWxYz');
    }

    // Set webhook URL for the bot
    const webhookUrl = `https://yjdrwwelnuyuifjqfebv.supabase.co/functions/v1/telegram-bot-setup/${organizationId}`;
    const telegramUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;
    
    const webhookResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message']
      }),
    });

    const webhookResult = await webhookResponse.json();
    
    if (!webhookResponse.ok) {
      throw new Error(`Failed to set webhook: ${webhookResult.description}`);
    }

    // Test the bot by getting bot info
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const botInfo = await botInfoResponse.json();

    if (!botInfoResponse.ok) {
      throw new Error(`Bot token invalid: ${botInfo.description}`);
    }

    console.log(`Webhook setup successful for bot: @${botInfo.result.username}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook setup successful',
      botInfo: {
        username: botInfo.result.username,
        first_name: botInfo.result.first_name
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Webhook setup error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

async function handleTelegramWebhook(req: Request, parsedBody?: any): Promise<Response> {
  try {
    const url = new URL(req.url);
    const organizationId = url.pathname.split('/').pop(); // Extract org ID from URL
    
    if (!organizationId) {
      console.error('No organization ID in webhook URL');
      return new Response('OK', { status: 200 });
    }

    const update: TelegramUpdate = parsedBody || await req.json();
    
    if (!update.message?.text) {
      return new Response('OK', { status: 200 });
    }

    const chatId = update.message.chat.id;
    const username = update.message.from?.username;
    const firstName = update.message.from?.first_name || 'there';
    const text = update.message.text.trim();
    const chatType = update.message.chat.type;

    console.log(`Received message from ${username} (${firstName}): ${text} in ${chatType} chat`);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name, telegram_bot_token, welcome_message')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization?.telegram_bot_token) {
      console.error('Organization not found or no bot token');
      return new Response('OK', { status: 200 });
    }

    const telegramUrl = `https://api.telegram.org/bot${organization.telegram_bot_token}/sendMessage`;

    if (text.startsWith('/start')) {
      // Parse user ID from start parameter (format: /start kampus_userId or /start userId)
      let userId = null;
      const startParam = text.split(' ')[1]; // Get parameter after /start
      
      if (startParam) {
        if (startParam.includes('_')) {
          // Format: kampus_userId
          const parts = startParam.split('_');
          userId = parts[1];
        } else {
          // Format: userId only
          userId = startParam;
        }
      }

      console.log(`Start command from ${username}, extracted userId: ${userId}`);

      // Check if user is already subscribed
      const { data: existing } = await supabase
        .from('telegram_subscriptions')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('telegram_chat_id', chatId.toString())
        .single();

      if (!existing) {
        // Subscribe user
        const { error: insertError } = await supabase
          .from('telegram_subscriptions')
          .insert({
            organization_id: organizationId,
            telegram_chat_id: chatId.toString(),
            telegram_username: username,
            user_id: userId || null // Link to specific user if provided
          });

        if (insertError) {
          console.error('Error subscribing user:', insertError);
        } else {
          console.log(`✅ TELEGRAM CONNECTION SUCCESS: User ${userId} (${username}) connected to ${organization.name}`);
        }
      } else {
        console.log(`User already subscribed with chat_id ${chatId}`);
      }

      const welcomeMessage = organization.welcome_message || `🎉 Welcome to ${organization.name}!

You're now subscribed to receive room booking notifications. 

Here's what you'll get notified about:
📅 New bookings
📝 Booking updates  
❌ Booking cancellations

Commands:
/start - Subscribe to notifications
/stop - Unsubscribe from notifications
/status - Check your subscription status

Enjoy staying up-to-date with room bookings! 🚀`;

      await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeMessage,
          parse_mode: 'Markdown'
        }),
      });
    }
    else if (text === '/stop') {
      // Unsubscribe user
      const { error: deleteError } = await supabase
        .from('telegram_subscriptions')
        .delete()
        .eq('organization_id', organizationId)
        .eq('telegram_chat_id', chatId.toString());

      const message = deleteError 
        ? '❌ Error unsubscribing. Please try again.'
        : '👋 You\'ve been unsubscribed from room booking notifications.';

      await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message
        }),
      });
    }
    else if (text === '/status') {
      // Check subscription status
      const { data: subscription } = await supabase
        .from('telegram_subscriptions')
        .select('created_at')
        .eq('organization_id', organizationId)
        .eq('telegram_chat_id', chatId.toString())
        .single();

      const message = subscription
        ? `✅ You're subscribed to ${organization.name} notifications since ${new Date(subscription.created_at).toLocaleDateString()}`
        : `❌ You're not subscribed. Send /start to subscribe to ${organization.name} notifications`;

      await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message
        }),
      });
    }

    return new Response('OK', { status: 200 });

  } catch (error: any) {
    console.error('Error handling webhook:', error);
    return new Response('OK', { status: 200 });
  }
}

serve(handler);