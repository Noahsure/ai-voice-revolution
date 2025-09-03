import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Test function called successfully');

    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    console.log('Twilio SID exists:', !!twilioSid);
    console.log('Twilio Token exists:', !!twilioToken);

    let twilioConnection = false;
    let twilioStatus = null as number | null;
    let twilioError: string | null = null;

    if (twilioSid && twilioToken) {
      try {
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}.json`, {
          headers: {
            'Authorization': `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
          },
        });
        twilioStatus = response.status;
        twilioConnection = response.ok;
        if (!response.ok) {
          const txt = await response.text();
          twilioError = `Twilio status ${response.status}: ${txt}`;
        }
      } catch (e) {
        twilioError = (e as Error).message;
      }
    } else {
      twilioError = 'Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN';
    }

    return new Response(
      JSON.stringify({
        success: true,
        env: {
          hasTwilioSid: !!twilioSid,
          hasTwilioToken: !!twilioToken,
        },
        twilio: {
          ok: twilioConnection,
          status: twilioStatus,
          error: twilioError,
        },
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Test failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as any)?.message,
        stack: (error as any)?.stack,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});