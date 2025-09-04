import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'text/xml'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const callRecordId = url.searchParams.get('callRecordId');
    const agentId = url.searchParams.get('agentId');
    
    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get agent details with campaign info if available
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    // Get call record with campaign info if it exists
    const { data: callRecord } = await supabase
      .from('call_records')
      .select(`
        *,
        campaigns(name, custom_script, custom_knowledge_base),
        contacts(first_name, last_name, company, phone_number)
      `)
      .eq('id', callRecordId)
      .single();

    if (!agent) {
      return new Response(fallbackTwiML('Agent not found'), {
        headers: corsHeaders
      });
    }

    // Check if this is initial call or user response
    const formData = req.method === 'POST' ? await req.formData() : null;
    const speechResult = formData?.get('SpeechResult')?.toString();
    
    // Use WebSocket streaming for real-time AI conversation like awaz.ai
    const streamingTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="wss://xmpjqtvznswcdfwtrvpc.supabase.co/functions/v1/realtime-voice-stream?callRecordId=${callRecordId}&agentId=${agentId}">
            <Parameter name="callRecordId" value="${callRecordId}"/>
            <Parameter name="agentId" value="${agentId}"/>
        </Stream>
    </Connect>
</Response>`;

    return new Response(streamingTwiML, { headers: corsHeaders });

  } catch (error) {
    console.error('AI conversation error:', error);
    return new Response(fallbackTwiML('I apologize for the technical difficulty'), {
      headers: corsHeaders
    });
  }
});

function fallbackTwiML(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${message}. Goodbye.</Say>
    <Hangup/>
</Response>`;
}