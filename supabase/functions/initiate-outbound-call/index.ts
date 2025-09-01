import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CallRequest {
  campaignId: string;
  contactId: string;
  agentId: string;
  phoneNumber: string;
}

const CALL_TIMEOUT_MS = 60000; // 60 seconds max for call initiation
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds between retries

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkForStuckCalls(supabase: any, userId: string) {
  // Find calls stuck in 'initiated' state for more than 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  const { error } = await supabase
    .from('call_records')
    .update({ call_status: 'failed' })
    .eq('user_id', userId)
    .eq('call_status', 'initiated')
    .lt('created_at', fiveMinutesAgo);

  if (error) {
    console.error('Error cleaning stuck calls:', error);
  }
}

async function initiateTwilioCallWithRetry(
  twilioUrl: string,
  twilioAuth: string,
  callParams: URLSearchParams,
  maxRetries: number = MAX_RETRIES
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Twilio call attempt ${attempt}/${maxRetries}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

      const twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${twilioAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: callParams,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!twilioResponse.ok) {
        const errorText = await twilioResponse.text();
        throw new Error(`Twilio API error (${twilioResponse.status}): ${errorText}`);
      }

      return await twilioResponse.json();
    } catch (error) {
      lastError = error as Error;
      console.error(`Twilio call attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * attempt; // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('All Twilio call attempts failed');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, contactId, agentId, phoneNumber }: CallRequest = await req.json();

    // Input validation
    if (!campaignId || !contactId || !agentId || !phoneNumber) {
      throw new Error('Missing required parameters');
    }

    // Initialize Supabase client
    const supabaseUrl = "https://xmpjqtvznswcdfwtrvpc.supabase.co";
    const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcGpxdHZ6bnN3Y2Rmd3RydnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDE3MjQsImV4cCI6MjA3MjMxNzcyNH0.fkDoqP1b8UusCA0rHzcvi7KmkzoGrbcHjv3loVZRbBo";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      supabase.auth.setSession({
        access_token: authHeader.replace('Bearer ', ''),
        refresh_token: '',
      });
    }

    // Get user from auth token
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Clean up any stuck calls for this user
    await checkForStuckCalls(supabase, user.id);

    // Get agent details for voice configuration
    const { data: agent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error('Twilio credentials not configured');
    }

    // Create call record in database first
    const { data: callRecord, error: callRecordError } = await supabase
      .from('call_records')
      .insert({
        user_id: user.id,
        campaign_id: campaignId,
        contact_id: contactId,
        agent_id: agentId,
        phone_number: phoneNumber,
        call_status: 'initiated'
      })
      .select()
      .single();

    if (callRecordError) {
      throw new Error(`Failed to create call record: ${callRecordError.message}`);
    }

    // Prepare TwiML for AI conversation handling
    const twimlUrl = `https://xmpjqtvznswcdfwtrvpc.functions.supabase.co/functions/v1/ai-conversation-handler?callRecordId=${callRecord.id}&agentId=${agentId}`;
    const statusCallbackUrl = `https://xmpjqtvznswcdfwtrvpc.functions.supabase.co/functions/v1/handle-call-webhook`;

    // Initiate Twilio call with retry logic
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const callParams = new URLSearchParams({
      To: phoneNumber,
      From: '+1234567890', // Replace with your Twilio phone number
      Url: twimlUrl,
      StatusCallback: statusCallbackUrl,
      StatusCallbackMethod: 'POST',
      StatusCallbackEvent: 'initiated,ringing,answered,completed',
      Record: 'true',
      Timeout: '30'
    });

    let callData;
    try {
      callData = await initiateTwilioCallWithRetry(twilioUrl, twilioAuth, callParams);
    } catch (error) {
      // Mark call as failed in database
      await supabase
        .from('call_records')
        .update({ call_status: 'failed' })
        .eq('id', callRecord.id);
      
      throw error;
    }

    // Update call record with Twilio SID
    await supabase
      .from('call_records')
      .update({
        twilio_call_sid: callData.sid,
        call_status: 'ringing',
        start_time: new Date().toISOString()
      })
      .eq('id', callRecord.id);

    // Update contact status
    await supabase
      .from('contacts')
      .update({
        call_status: 'calling',
        call_attempts: supabase.sql`call_attempts + 1`,
        last_called_at: new Date().toISOString()
      })
      .eq('id', contactId);

    console.log(`Call initiated successfully: ${callData.sid} to ${phoneNumber}`);

    return new Response(JSON.stringify({
      success: true,
      callSid: callData.sid,
      callRecordId: callRecord.id,
      status: 'initiated'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error initiating call:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});