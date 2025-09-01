import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Get query parameters
    const url = new URL(req.url);
    const callRecordId = url.searchParams.get('callRecordId');
    const agentId = url.searchParams.get('agentId');

    if (!callRecordId || !agentId) {
      throw new Error('Missing required parameters');
    }

    // Initialize Supabase client
    const supabaseUrl = "https://xmpjqtvznswcdfwtrvpc.supabase.co";
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get agent configuration
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get contact information for personalization
    const { data: callRecord } = await supabase
      .from('call_records')
      .select(`
        *,
        contacts (*)
      `)
      .eq('id', callRecordId)
      .single();

    const contact = callRecord?.contacts;

    // Generate TwiML for AI conversation
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="${agent.voice_id || 'alice'}">
        ${agent.opening_message}
        ${contact?.first_name ? ` Hello ${contact.first_name},` : ''}
    </Say>
    <Gather 
        input="speech" 
        timeout="5" 
        speechTimeout="auto"
        action="https://xmpjqtvznswcdfwtrvpc.functions.supabase.co/functions/v1/ai-conversation-handler/response?callRecordId=${callRecordId}&agentId=${agentId}"
        method="POST"
    >
        <Say voice="${agent.voice_id || 'alice'}">
            Please respond when you're ready.
        </Say>
    </Gather>
    <Say voice="${agent.voice_id || 'alice'}">
        I didn't hear anything. Have a great day!
    </Say>
    <Hangup/>
</Response>`;

    // Update call record status
    await supabase
      .from('call_records')
      .update({ 
        call_status: 'in_progress',
        start_time: new Date().toISOString()
      })
      .eq('id', callRecordId);

    return new Response(twiml, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/xml'
      },
    });

  } catch (error) {
    console.error('AI conversation handler error:', error);
    
    // Return simple TwiML on error
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Sorry, we're experiencing technical difficulties. Please try again later.</Say>
    <Hangup/>
</Response>`;

    return new Response(errorTwiml, {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/xml'
      },
    });
  }
});