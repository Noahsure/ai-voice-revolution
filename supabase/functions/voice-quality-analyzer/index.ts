import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function analyzeCallQuality(transcript: string, callDuration: number): Promise<any> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const analysisPrompt = `
Analyze this call transcript for quality metrics. Provide scores from 0-100 for each category:

TRANSCRIPT:
${transcript}

CALL DURATION: ${callDuration} seconds

Please analyze and provide scores for:
1. Engagement Score (0-100): How engaged was the caller?
2. Compliance Score (0-100): Did the agent follow proper procedures?
3. Tone Score (0-100): Was the agent's tone professional and friendly?
4. Script Adherence Score (0-100): Did the agent follow the expected flow?
5. Overall Quality Score (0-100): Overall call quality

Also identify any quality flags from this list:
- interrupted_call
- low_engagement
- compliance_issue
- technical_problem
- positive_outcome
- negative_outcome
- follow_up_required

Respond with ONLY valid JSON in this format:
{
  "engagement_score": 85,
  "compliance_score": 92,
  "tone_score": 88,
  "script_adherence_score": 90,
  "overall_score": 89,
  "quality_flags": ["positive_outcome"],
  "feedback_notes": "Brief summary of call quality and recommendations"
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
          content: 'You are a call quality analyst. Analyze call transcripts and provide detailed quality scores.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${await response.text()}`);
  }

  const data = await response.json();
  const analysisText = data.choices?.[0]?.message?.content;

  try {
    return JSON.parse(analysisText);
  } catch (error) {
    console.error('Failed to parse AI analysis:', analysisText);
    // Return default scores if parsing fails
    return {
      engagement_score: 50,
      compliance_score: 50,
      tone_score: 50,
      script_adherence_score: 50,
      overall_score: 50,
      quality_flags: ['technical_problem'],
      feedback_notes: 'Analysis failed - manual review required'
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { callRecordId, transcript, duration } = await req.json();

    if (!callRecordId) {
      throw new Error('Call record ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = "https://xmpjqtvznswcdfwtrvpc.supabase.co";
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header for user context
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      supabase.auth.setSession({
        access_token: authHeader.replace('Bearer ', ''),
        refresh_token: '',
      });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get call record data if not provided
    let callTranscript = transcript;
    let callDuration = duration;

    if (!callTranscript || !callDuration) {
      const { data: callRecord } = await supabase
        .from('call_records')
        .select('transcript, duration_seconds')
        .eq('id', callRecordId)
        .eq('user_id', user.id)
        .single();

      if (!callRecord) {
        throw new Error('Call record not found or access denied');
      }

      callTranscript = callRecord.transcript || 'No transcript available';
      callDuration = callRecord.duration_seconds || 0;
    }

    console.log(`Analyzing call quality for call: ${callRecordId}`);

    // Analyze call quality using AI
    const qualityAnalysis = await analyzeCallQuality(callTranscript, callDuration);

    // Store quality analysis in database
    const { error: insertError } = await supabase
      .from('call_quality_scores')
      .insert({
        user_id: user.id,
        call_record_id: callRecordId,
        overall_score: qualityAnalysis.overall_score,
        engagement_score: qualityAnalysis.engagement_score,
        compliance_score: qualityAnalysis.compliance_score,
        tone_score: qualityAnalysis.tone_score,
        script_adherence_score: qualityAnalysis.script_adherence_score,
        quality_flags: qualityAnalysis.quality_flags || [],
        feedback_notes: qualityAnalysis.feedback_notes,
        reviewed_by: 'AI System',
        reviewed_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Failed to store quality analysis:', insertError);
      throw new Error('Failed to store quality analysis');
    }

    console.log('Quality analysis completed:', qualityAnalysis);

    return new Response(
      JSON.stringify({
        success: true,
        callRecordId: callRecordId,
        qualityAnalysis: qualityAnalysis
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Voice quality analyzer error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});