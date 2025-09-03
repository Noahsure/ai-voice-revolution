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
    
    // Initial call - start conversation
    if (!speechResult) {
      const initialTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${agent.opening_message || 'Hello! How can I help you today?'}</Say>
    <Pause length="1"/>
    <Gather input="speech" timeout="5" speechTimeout="2" 
            action="/functions/v1/ai-conversation-handler?callRecordId=${callRecordId}&agentId=${agentId}">
        <Say>Please let me know how I can assist you.</Say>
    </Gather>
    <Say>I didn't catch that. Let me try again.</Say>
    <Redirect>/functions/v1/ai-conversation-handler?callRecordId=${callRecordId}&agentId=${agentId}</Redirect>
</Response>`;

      return new Response(initialTwiML, { headers: corsHeaders });
    }

    // Process customer speech with OpenAI
    const aiResponse = await processWithOpenAI(speechResult, agent, callRecord, supabase);
    
    // Use existing call record data
    if (!callRecord) {
      return new Response(fallbackTwiML('Call record not found'), {
        headers: corsHeaders
      });
    }

    // Log conversation
    await supabase
      .from('conversation_logs')
      .insert({
        call_record_id: callRecordId,
        user_id: callRecord.user_id,
        speaker: 'customer',
        message: speechResult,
        timestamp: new Date().toISOString()
      });

    await supabase
      .from('conversation_logs')
      .insert({
        call_record_id: callRecordId,
        user_id: callRecord.user_id,
        speaker: 'agent',
        message: aiResponse,
        timestamp: new Date().toISOString()
      });

    // Check if conversation should end
    const shouldEnd = checkConversationEnd(aiResponse, speechResult);
    
    if (shouldEnd) {
      const endTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${aiResponse}</Say>
    <Pause length="1"/>
    <Say>Thank you for your time. Have a great day!</Say>
    <Hangup/>
</Response>`;
      
      // Update call outcome
      await supabase
        .from('call_records')
        .update({
          call_status: 'completed',
          call_outcome: classifyCallOutcome(speechResult, aiResponse),
          end_time: new Date().toISOString()
        })
        .eq('id', callRecordId);

      return new Response(endTwiML, { headers: corsHeaders });
    }

    // Continue conversation
    const continueTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${aiResponse}</Say>
    <Pause length="1"/>
    <Gather input="speech" timeout="8" speechTimeout="3"
            action="/functions/v1/ai-conversation-handler?callRecordId=${callRecordId}&agentId=${agentId}">
        <Say>Is there anything else I can help you with?</Say>
    </Gather>
    <Say>Thank you for calling. Have a great day!</Say>
    <Hangup/>
</Response>`;

    return new Response(continueTwiML, { headers: corsHeaders });

  } catch (error) {
    console.error('AI conversation error:', error);
    return new Response(fallbackTwiML('I apologize for the technical difficulty'), {
      headers: corsHeaders
    });
  }
});

async function processWithOpenAI(customerSpeech: string, agent: any, callRecord: any, supabase: any): Promise<string> {
  try {
    // Get conversation history for context
    const { data: conversationHistory } = await supabase
      .from('conversation_logs')
      .select('speaker, message, timestamp')
      .eq('call_record_id', callRecord.id)
      .order('timestamp', { ascending: true });

    // Build conversation context
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n' + 
        conversationHistory.map(log => 
          `${log.speaker === 'agent' ? 'Assistant' : 'Customer'}: ${log.message}`
        ).join('\n');
    }

    // Build enhanced system prompt with campaign-specific information
    let systemPrompt = agent.system_prompt || 'You are a helpful AI assistant.';
    
    // Add campaign-specific script if available
    if (callRecord.campaigns?.custom_script) {
      systemPrompt += `\n\nCAMPAIGN-SPECIFIC INSTRUCTIONS:\n${callRecord.campaigns.custom_script}`;
    }
    
    // Build knowledge base (agent + campaign)
    let knowledgeBase = agent.knowledge_base || 'General knowledge';
    if (callRecord.campaigns?.custom_knowledge_base) {
      knowledgeBase += `\n\nCAMPAIGN-SPECIFIC KNOWLEDGE:\n${callRecord.campaigns.custom_knowledge_base}`;
    }
    
    // Add contact information
    const contact = callRecord.contacts;
    const contactInfo = contact ? `
CONTACT INFORMATION:
- Name: ${contact.first_name || 'Unknown'} ${contact.last_name || ''}
- Company: ${contact.company || 'Not specified'}
- Phone: ${contact.phone_number}
` : '';
    
    const campaignInfo = callRecord.campaigns ? `
CAMPAIGN: ${callRecord.campaigns.name}` : '';

    const finalSystemPrompt = `${systemPrompt}

${contactInfo}${campaignInfo}
AGENT PERSONALITY: ${agent.personality || 'professional'}
KNOWLEDGE BASE: ${knowledgeBase}${conversationContext}

Remember to be natural, helpful, and stay in character. Use the contact's name when appropriate.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: finalSystemPrompt
          },
          {
            role: 'user',
            content: customerSpeech
          }
        ],
        max_completion_tokens: 150
      })
    });

    const data = await openaiResponse.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI error:', error);
    return "I understand what you're saying. Let me help you with that.";
  }
}

function checkConversationEnd(aiResponse: string, customerSpeech: string): boolean {
  const endPhrases = ['goodbye', 'thank you', 'not interested', 'remove me', 'stop calling'];
  return endPhrases.some(phrase => 
    customerSpeech.toLowerCase().includes(phrase) || 
    aiResponse.toLowerCase().includes('goodbye')
  );
}

function classifyCallOutcome(customerSpeech: string, aiResponse: string): string {
  if (customerSpeech.toLowerCase().includes('interested') || 
      aiResponse.toLowerCase().includes('appointment')) {
    return 'hot_lead';
  }
  if (customerSpeech.toLowerCase().includes('maybe') || 
      customerSpeech.toLowerCase().includes('think about')) {
    return 'warm_lead';
  }
  return 'cold_lead';
}

function fallbackTwiML(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">${message}. Goodbye.</Say>
    <Hangup/>
</Response>`;
}