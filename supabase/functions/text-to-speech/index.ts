import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    let chunkBinary = '';
    for (let j = 0; j < chunk.length; j++) {
      chunkBinary += String.fromCharCode(chunk[j]);
    }
    binary += chunkBinary;
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, voiceId = '9BWtsMINqrJLrRacOk9x', model = 'eleven_turbo_v2_5', provider = 'elevenlabs' } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    console.log(`Generating speech for text: "${text}" using voice: ${voiceId}`);

    if (provider === 'elevenlabs') {
      // Try ElevenLabs first
      const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
      
      if (!elevenlabsApiKey) {
        throw new Error('ElevenLabs API key not configured');
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
          model_id: model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', errorText);
        throw new Error(`ElevenLabs API error: ${errorText}`);
      }

      // Convert audio to base64
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = arrayBufferToBase64(audioBuffer);

      console.log(`Generated ${audioBuffer.byteLength} bytes of audio`);

      return new Response(
        JSON.stringify({ 
          audioContent: base64Audio,
          provider: 'elevenlabs',
          voiceId: voiceId,
          model: model
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } else if (provider === 'openai') {
      // Use OpenAI TTS as fallback
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1-hd',
          input: text,
          voice: voiceId === '9BWtsMINqrJLrRacOk9x' ? 'alloy' : voiceId,
          response_format: 'mp3',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI TTS error:', errorText);
        throw new Error(`OpenAI API error: ${errorText}`);
      }

      // Convert audio to base64
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = arrayBufferToBase64(audioBuffer);

      console.log(`Generated ${audioBuffer.byteLength} bytes of audio`);

      return new Response(
        JSON.stringify({ 
          audioContent: base64Audio,
          provider: 'openai',
          voiceId: voiceId,
          model: 'tts-1-hd'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      throw new Error('Invalid provider. Use "elevenlabs" or "openai"');
    }

  } catch (error) {
    console.error('Text-to-speech error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});