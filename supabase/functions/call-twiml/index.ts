import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Basic, known-good TwiML for sanity testing with Twilio
    const simpleTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! This is a NexaVoice system test. Your call path is working. Goodbye!</Say>
  <Hangup/>
</Response>`;

    return new Response(simpleTwiml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200,
    });
  } catch (error) {
    console.error('TwiML generation failed:', error);

    // Always return valid TwiML even on error so Twilio doesn't play its default error
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">We are experiencing a technical issue. Please try again later.</Say>
  <Hangup/>
</Response>`;

    return new Response(errorTwiml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      status: 200,
    });
  }
});