import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  console.log("WebSocket connection incoming for realtime voice stream");

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  // Parse URL parameters
  const url = new URL(req.url);
  const callRecordId = url.searchParams.get('callRecordId');
  const agentId = url.searchParams.get('agentId');

  console.log(`Initializing voice stream - CallRecord: ${callRecordId}, Agent: ${agentId}`);

  // Initialize Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let openAISocket: WebSocket | null = null;
  let agent: any = null;
  let callRecord: any = null;
  let sessionInitialized = false;

  // Fetch agent and call record data
  const initializeSession = async () => {
    try {
      // Get agent configuration
      const { data: agentData } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('id', agentId)
        .single();
      
      agent = agentData;

      // Get call record with campaign info
      const { data: callData } = await supabase
        .from('call_records')
        .select(`
          *,
          campaigns(name, custom_script, custom_knowledge_base),
          contacts(first_name, last_name, company, phone_number)
        `)
        .eq('id', callRecordId)
        .single();
      
      callRecord = callData;

      console.log(`Session initialized - Agent: ${agent?.name}, Contact: ${callRecord?.contacts?.first_name}`);
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  };

  // Connect to OpenAI Realtime API
  const connectToOpenAI = () => {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return;
    }

    console.log('Connecting to OpenAI Realtime API...');
    
    openAISocket = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", {
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    openAISocket.onopen = () => {
      console.log('Connected to OpenAI Realtime API');
      // Session will be configured after receiving session.created event
    };

    openAISocket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log('OpenAI event:', data.type);

      if (data.type === 'session.created') {
        console.log('Session created, configuring...');
        await configureSession();
        sessionInitialized = true;
      } else if (data.type === 'response.audio.delta') {
        // Forward audio to Twilio
        if (socket.readyState === WebSocket.OPEN) {
          const audioMessage = {
            event: 'media',
            streamSid: 'stream_sid', // Will be set from Twilio
            media: {
              payload: data.delta
            }
          };
          socket.send(JSON.stringify(audioMessage));
        }
      } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
        // Log user speech
        console.log('User said:', data.transcript);
        if (callRecord) {
          await logConversation('customer', data.transcript);
        }
      } else if (data.type === 'response.audio_transcript.delta') {
        // Accumulate AI response transcript
        console.log('AI response fragment:', data.delta);
      } else if (data.type === 'response.done') {
        console.log('Response completed');
      }
    };

    openAISocket.onerror = (error) => {
      console.error('OpenAI WebSocket error:', error);
    };

    openAISocket.onclose = () => {
      console.log('OpenAI WebSocket closed');
    };
  };

  // Configure OpenAI session with agent settings
  const configureSession = async () => {
    if (!agent || !openAISocket) return;

    // Build comprehensive system prompt
    let systemPrompt = agent.system_prompt || 'You are a helpful AI assistant making a phone call.';
    
    // Add campaign-specific instructions
    if (callRecord?.campaigns?.custom_script) {
      systemPrompt += `\n\nCAMPAIGN SCRIPT:\n${callRecord.campaigns.custom_script}`;
    }
    
    // Add knowledge base
    let knowledgeBase = agent.knowledge_base || 'General knowledge';
    if (callRecord?.campaigns?.custom_knowledge_base) {
      knowledgeBase += `\n\nCAMPAIGN KNOWLEDGE:\n${callRecord.campaigns.custom_knowledge_base}`;
    }
    
    // Add contact information
    const contact = callRecord?.contacts;
    const contactInfo = contact ? `
CONTACT INFORMATION:
- Name: ${contact.first_name || 'Unknown'} ${contact.last_name || ''}
- Company: ${contact.company || 'Not specified'}
- Phone: ${contact.phone_number}
` : '';

    const fullSystemPrompt = `${systemPrompt}

${contactInfo}
AGENT PERSONALITY: ${agent.personality || 'professional'}
KNOWLEDGE BASE: ${knowledgeBase}

You are making an outbound phone call. Be natural, helpful, and stay in character. Use the contact's name when appropriate. Keep responses concise for phone conversations.`;

    const sessionUpdate = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions: fullSystemPrompt,
        voice: "alloy", // Can be configured per agent
        input_audio_format: "g711_ulaw", // Twilio format
        output_audio_format: "g711_ulaw", // Twilio format
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800
        },
        temperature: 0.8,
        max_response_output_tokens: 500
      }
    };

    console.log('Sending session configuration...');
    openAISocket.send(JSON.stringify(sessionUpdate));
  };

  // Log conversation to database
  const logConversation = async (speaker: string, message: string) => {
    if (!callRecord) return;
    
    try {
      await supabase
        .from('conversation_logs')
        .insert({
          call_record_id: callRecordId,
          user_id: callRecord.user_id,
          speaker,
          message,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging conversation:', error);
    }
  };

  // Handle Twilio WebSocket events
  socket.onopen = async () => {
    console.log('Twilio WebSocket connected');
    await initializeSession();
    connectToOpenAI();
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.event === 'connected') {
        console.log('Twilio stream connected');
      } else if (data.event === 'start') {
        console.log('Twilio stream started');
      } else if (data.event === 'media') {
        // Forward audio to OpenAI
        if (openAISocket && openAISocket.readyState === WebSocket.OPEN && sessionInitialized) {
          const audioEvent = {
            type: 'input_audio_buffer.append',
            audio: data.media.payload
          };
          openAISocket.send(JSON.stringify(audioEvent));
        }
      } else if (data.event === 'stop') {
        console.log('Twilio stream stopped');
      }
    } catch (error) {
      console.error('Error processing Twilio message:', error);
    }
  };

  socket.onerror = (error) => {
    console.error('Twilio WebSocket error:', error);
  };

  socket.onclose = () => {
    console.log('Twilio WebSocket closed');
    if (openAISocket) {
      openAISocket.close();
    }
  };

  return response;
});