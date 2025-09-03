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
    const url = new URL(req.url);
    const callRecordId = url.searchParams.get('callRecordId');
    const agentId = url.searchParams.get('agentId');

    if (!callRecordId || !agentId) {
      throw new Error('Missing required parameters');
    }

    const supabaseUrl = "https://xmpjqtvznswcdfwtrvpc.supabase.co";
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Twilio sends POST with form data
    if (req.method !== 'POST') {
      const invalidMethodTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Let's continue. How can I help you today?</Say>
  <Gather input="speech" timeout="10" speechTimeout="auto" action="https://xmpjqtvznswcdfwtrvpc.supabase.co/functions/v1/ai-response-handler?callRecordId=${callRecordId}&agentId=${agentId}" method="POST">
    <Pause length="1"/>
  </Gather>
  <Say voice="alice">Thanks for your time. Goodbye!</Say>
  <Hangup/>
</Response>`;
      return new Response(invalidMethodTwiML, { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } });
    }

    const formData = await req.formData();
    const speechResult = (formData.get('SpeechResult') as string) || '';
    const confidenceStr = (formData.get('Confidence') as string) || '0';
    const confidence = parseFloat(confidenceStr);

    console.log(`AI Response Handler received speech: "${speechResult}" (confidence: ${confidence})`);

    // Fetch agent configuration
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .maybeSingle();

    if (agentError) {
      console.error('Agent fetch error:', agentError);
      throw new Error(agentError.message);
    }

    // Fetch existing transcript if any
    const { data: callRecord, error: callErr } = await supabase
      .from('call_records')
      .select('id, transcript')
      .eq('id', callRecordId)
      .maybeSingle();

    if (callErr) {
      console.warn('Call record fetch warning:', callErr.message);
    }

    let aiMessage = "I'm here. How can I help you today?";

    if (speechResult && confidence >= 0.4) {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        console.error('OPENAI_API_KEY not configured');
      } else {
        // Build system prompt from agent settings
        const systemPrompt = `You are an AI phone agent.\n` +
          `Role: ${agent?.purpose || 'General assistant'}\n` +
          `Personality: ${agent?.personality || 'Helpful and concise'}\n` +
          `Knowledge: ${agent?.knowledge_base || 'General product knowledge'}\n` +
          `Follow the system instructions strictly: ${agent?.system_prompt || ''}`;

        const history = callRecord?.transcript || '';

        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Conversation so far (may be empty):\n${history}\n\nUser just said: ${speechResult}` }
              ],
              max_tokens: 250,
              temperature: 0.7
            })
          });

          const data = await response.json();
          aiMessage = data?.choices?.[0]?.message?.content?.trim() || aiMessage;
          console.log('OpenAI response:', aiMessage);
        } catch (e) {
          console.error('OpenAI API error:', e);
        }
      }
    }

    // Update transcript in DB (best effort)
    try {
      const newTranscript = (callRecord?.transcript || '') +
        `\n[${new Date().toISOString()}] User: ${speechResult}` +
        `\n[${new Date().toISOString()}] Agent: ${aiMessage}\n`;

      await supabase
        .from('call_records')
        .update({ transcript: newTranscript })
        .eq('id', callRecordId);
    } catch (e) {
      console.warn('Transcript update warning:', e);
    }

    // Respond with TwiML using Twilio TTS (Alice)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${(aiMessage || '').replace(/[<>&"']/g, '')}</Say>
  <Gather input="speech" timeout="10" speechTimeout="auto" action="https://xmpjqtvznswcdfwtrvpc.supabase.co/functions/v1/ai-response-handler?callRecordId=${callRecordId}&agentId=${agentId}" method="POST">
    <Pause length="1"/>
  </Gather>
  <Say voice="alice">Thank you for your time. Have a great day!</Say>
  <Hangup/>
</Response>`;

    return new Response(twiml, { headers: { ...corsHeaders, 'Content-Type': 'text/xml' } });
  } catch (error) {
    console.error('ai-response-handler fatal error:', error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I am experiencing a technical issue. Please try again later.</Say>
  <Hangup/>
</Response>`;
    return new Response(errorTwiml, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/xml' } });
  }
});