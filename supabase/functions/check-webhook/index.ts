import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { botToken, organizationId } = await req.json();
    
    // Check current webhook
    const checkUrl = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;
    const checkResponse = await fetch(checkUrl);
    const checkResult = await checkResponse.json();
    
    console.log('Current webhook info:', checkResult);
    
    // Set the correct webhook
    const webhookUrl = `https://yjdrwwelnuyuifjqfebv.supabase.co/functions/v1/telegram-bot-setup/${organizationId}`;
    const setUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;
    
    const setResponse = await fetch(setUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message']
      })
    });
    
    const setResult = await setResponse.json();
    console.log('Set webhook result:', setResult);
    
    return new Response(JSON.stringify({
      current: checkResult,
      updated: setResult,
      expectedUrl: webhookUrl
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});