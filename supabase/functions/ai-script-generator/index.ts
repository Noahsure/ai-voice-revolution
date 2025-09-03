import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { purpose, industry, targetAudience, tone, scriptType, additionalContext } = await req.json();

    console.log('Generating script for:', { purpose, industry, targetAudience, tone, scriptType });

    let systemPrompt = "";
    let userPrompt = "";

    if (scriptType === 'opening') {
      systemPrompt = `You are an expert script writer for AI voice agents. Create compelling opening messages that immediately capture attention and establish rapport. The opening should be natural, professional, and set the right tone for the conversation.`;
      
      userPrompt = `Create an engaging opening message for an AI voice agent with these specifications:
      - Purpose: ${purpose}
      - Industry: ${industry || 'General'}
      - Target Audience: ${targetAudience || 'General public'}
      - Tone: ${tone || 'Professional'}
      - Additional Context: ${additionalContext || 'None'}
      
      The opening should:
      1. Be 2-3 sentences maximum
      2. Include a natural greeting
      3. Clearly state the purpose of the call
      4. Create a positive first impression
      5. Include placeholder [Name] for personalization
      
      Return only the opening message script, no additional explanations.`;

    } else if (scriptType === 'system') {
      systemPrompt = `You are an expert AI trainer specializing in creating system prompts for conversational AI agents. Create comprehensive system prompts that define the agent's behavior, personality, and capabilities.`;
      
      userPrompt = `Create a detailed system prompt for an AI voice agent with these specifications:
      - Purpose: ${purpose}
      - Industry: ${industry || 'General'}
      - Target Audience: ${targetAudience || 'General public'}
      - Tone: ${tone || 'Professional'}
      - Additional Context: ${additionalContext || 'None'}
      
      The system prompt should:
      1. Define the agent's role and expertise
      2. Specify communication style and personality traits
      3. Include guidelines for handling objections
      4. Set boundaries and limitations
      5. Include instructions for when to escalate or transfer calls
      6. Be comprehensive but concise (300-500 words)
      
      Format as a clear system prompt that starts with "You are..."`;

    } else if (scriptType === 'knowledge') {
      systemPrompt = `You are a knowledge base specialist who creates comprehensive information repositories for AI agents. Generate detailed, structured knowledge bases that cover all aspects an agent needs to know.`;
      
      userPrompt = `Create a comprehensive knowledge base for an AI voice agent with these specifications:
      - Purpose: ${purpose}
      - Industry: ${industry || 'General'}
      - Target Audience: ${targetAudience || 'General public'}
      - Tone: ${tone || 'Professional'}
      - Additional Context: ${additionalContext || 'None'}
      
      The knowledge base should include:
      1. Key facts and information relevant to the purpose
      2. Common questions and detailed answers (FAQ format)
      3. Product/service details (if applicable)
      4. Objection handling techniques
      5. Compliance and legal considerations
      6. Escalation procedures
      
      Structure the information clearly with headings and bullet points for easy reference.`;

    } else {
      throw new Error('Invalid script type');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate script');
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Generated script successfully');

    return new Response(JSON.stringify({ 
      content: generatedContent,
      scriptType 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-script-generator function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate script'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});