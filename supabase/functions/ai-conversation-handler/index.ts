import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to generate AI-powered speech using ElevenLabs
async function generateSpeechAudio(text: string, voiceId: string): Promise<string | null> {
  try {
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsApiKey) {
      console.warn('ElevenLabs API key not configured, falling back to Twilio TTS');
      return null;
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenlabsApiKey
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
      return base64Audio;
    }
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
  }
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const callRecordId = url.searchParams.get('callRecordId');
    const agentId = url.searchParams.get('agentId');
    const isResponse = url.pathname.includes('/response');

    if (!callRecordId || !agentId) {
      throw new Error('Missing required parameters');
    }

    // Initialize Supabase client
    const supabaseUrl = "https://xmpjqtvznswcdfwtrvpc.supabase.co";
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get agent configuration and ensure proper sync
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError) {
      console.error('Agent query error:', agentError);
      throw new Error(`Agent query failed: ${agentError.message}`);
    }

    if (!agent) {
      console.error(`Agent not found for ID: ${agentId}`);
      throw new Error('Agent not found');
    }

    console.log(`✅ Agent ${agent.name} (${agent.id}) successfully synced to call ${callRecordId}`);

    // Get call record and contact information
    const { data: callRecord, error: callError } = await supabase
      .from('call_records')
      .select('*, contacts (*)')
      .eq('id', callRecordId)
      .single();

    if (callError) {
      console.error('Call record query error:', callError);
      console.log('Continuing without call record data...');
    }

    const contact = callRecord?.contacts;

    if (isResponse && req.method === 'POST') {
      // Handle user speech response
      const formData = await req.formData();
      const speechResult = formData.get('SpeechResult') as string;
      const confidence = formData.get('Confidence') as string;

      console.log(`Speech received: "${speechResult}" (confidence: ${confidence})`);

      if (speechResult && parseFloat(confidence || '0') > 0.5) {
        // Process with AI
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openaiApiKey) {
          throw new Error('OpenAI API key not configured');
        }

        // Create conversation context
        const conversationContext = `
Agent Role: ${agent.purpose || 'Sales representative'}
Agent Personality: ${agent.personality}
Agent Knowledge Base: ${agent.knowledge_base || 'Standard product information'}
Contact Name: ${contact?.first_name || 'Unknown'}
Contact Company: ${contact?.company || 'Unknown'}
System Instructions: ${agent.system_prompt}

Previous conversation: This is the beginning of the call.
User just said: "${speechResult}"
`;

        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4.1-2025-04-14',
            messages: [
              {
                role: 'system',
                content: conversationContext
              },
              {
                role: 'user', 
                content: speechResult
              }
            ],
            max_tokens: 300,
            temperature: 0.7
          })
        });

        const aiData = await aiResponse.json();
        const aiMessage = aiData.choices?.[0]?.message?.content || 'I understand. How can I help you further?';

        console.log(`AI Response: ${aiMessage}`);

        // Store conversation in transcript
        const conversationUpdate = {
          transcript: (callRecord?.transcript || '') + 
            `\n[${new Date().toISOString()}] User: ${speechResult}\n` +
            `[${new Date().toISOString()}] Agent: ${aiMessage}\n`
        };

        await supabase
          .from('call_records')
          .update(conversationUpdate)
          .eq('id', callRecordId);

        // Try to use ElevenLabs for better voice quality
        const audioBase64 = await generateSpeechAudio(aiMessage, agent.voice_id || '9BWtsMINqrJLrRacOk9x');

        let twiml: string;

        if (audioBase64) {
          // Use ElevenLabs audio
          twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Play>data:audio/mpeg;base64,${audioBase64}</Play>
    <Gather 
        input="speech" 
        timeout="10" 
        speechTimeout="auto"
        action="https://xmpjqtvznswcdfwtrvpc.functions.supabase.co/functions/v1/ai-conversation-handler/response?callRecordId=${callRecordId}&agentId=${agentId}"
        method="POST"
    >
        <Pause length="1"/>
    </Gather>
    <Say voice="${agent.voice_id || 'alice'}">Thank you for your time. Have a great day!</Say>
    <Hangup/>
</Response>`;
        } else {
          // Fallback to Twilio TTS
          twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="${agent.voice_id || 'alice'}">${aiMessage.replace(/[<>&"']/g, '')}</Say>
    <Gather 
        input="speech" 
        timeout="10" 
        speechTimeout="auto"
        action="https://xmpjqtvznswcdfwtrvpc.functions.supabase.co/functions/v1/ai-conversation-handler/response?callRecordId=${callRecordId}&agentId=${agentId}"
        method="POST"
    >
        <Pause length="1"/>
    </Gather>
    <Say voice="${agent.voice_id || 'alice'}">Thank you for your time. Have a great day!</Say>
    <Hangup/>
</Response>`;
        }

        return new Response(twiml, {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/xml'
          },
        });

      } else {
        // Low confidence or no speech detected
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="${agent.voice_id || 'alice'}">I didn't catch that. Could you please repeat?</Say>
    <Gather 
        input="speech" 
        timeout="8" 
        speechTimeout="auto"
        action="https://xmpjqtvznswcdfwtrvpc.functions.supabase.co/functions/v1/ai-conversation-handler/response?callRecordId=${callRecordId}&agentId=${agentId}"
        method="POST"
    >
        <Pause length="1"/>
    </Gather>
    <Say voice="${agent.voice_id || 'alice'}">Thank you for your time. Have a great day!</Say>
    <Hangup/>
</Response>`;

        return new Response(twiml, {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/xml'
          },
        });
      }
    } else {
      // Initial call setup
      const openingMessage = agent.opening_message + 
        (contact?.first_name ? ` Hello ${contact.first_name},` : ' Hello there,');

      console.log(`Starting conversation with: ${openingMessage}`);

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="${agent.voice_id || 'alice'}">${openingMessage.replace(/[<>&"']/g, '')}</Say>
    <Gather 
        input="speech" 
        timeout="10" 
        speechTimeout="auto"
        action="https://xmpjqtvznswcdfwtrvpc.functions.supabase.co/functions/v1/ai-conversation-handler/response?callRecordId=${callRecordId}&agentId=${agentId}"
        method="POST"
    >
        <Say voice="${agent.voice_id || 'alice'}">How can I help you today?</Say>
    </Gather>
    <Say voice="${agent.voice_id || 'alice'}">I didn't hear anything. Have a great day!</Say>
    <Hangup/>
</Response>`;

      // Update call record status
      await supabase
        .from('call_records')
        .update({ 
          call_status: 'in_progress',
          start_time: new Date().toISOString(),
          transcript: `[${new Date().toISOString()}] Agent: ${openingMessage}\n`
        })
        .eq('id', callRecordId);

      return new Response(twiml, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/xml'
        },
      });
    }

  } catch (error) {
    console.error('AI conversation handler error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    
    // ALWAYS return valid TwiML even on complete failure
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">I apologize, but I'm experiencing technical difficulties right now. Please try calling back in a few minutes. Thank you for your patience.</Say>
    <Hangup/>
</Response>`;

    return new Response(errorTwiml, {
      status: 200,  // Important: Return 200 so Twilio processes the TwiML
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/xml'
      },
    });
  }
});