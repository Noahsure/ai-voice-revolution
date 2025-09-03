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
    if (!contactId || !agentId || !phoneNumber) {
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

    // Get user from auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;

    // Clean up any stuck calls for this user  
    await checkForStuckCalls(supabase, userId);

    // Get contact details
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      throw new Error('Contact not found');
    }

    // Get agent details for voice configuration
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      throw new Error('Agent not found');
    }

    // Get user's phone number from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.phone_number) {
      throw new Error('User phone number not configured in profile');
    }

    // Create call record with proper state management
    const { data: callRecord, error: callError } = await supabase
      .from('call_records')
      .insert({
        user_id: userId,
        contact_id: contactId,
        campaign_id: campaignId,
        agent_id: agentId,
        phone_number: contact.phone_number,
        call_direction: 'outbound',
        call_status: 'queued',
        retry_count: 0
      })
      .select()
      .single();

    if (callError) {
      throw new Error(`Failed to create call record: ${callError.message}`);
    }

    // Add to call queue for reliable processing
    const { error: queueError } = await supabase
      .from('call_queue')
      .insert({
        user_id: userId,
        campaign_id: campaignId,
        contact_id: contactId,
        agent_id: agentId,
        priority: 5, // Default priority
        scheduled_at: new Date().toISOString(),
        status: 'pending'
      });

    if (queueError) {
      console.error('Error adding to call queue:', queueError);
      // Continue with direct call even if queue fails
    }

    // Initialize call monitoring
    await supabase
      .from('call_monitoring')
      .insert({
        user_id: userId,
        call_record_id: callRecord.id,
        status: 'queued',
        health_score: 100
      });

    console.log(`Call record created: ${callRecord.id}, queued for processing`);

    // For immediate processing, trigger the queue manager
    const queueManagerResponse = await fetch(`${supabaseUrl}/functions/v1/campaign-queue-manager`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        processSpecific: {
          userId,
          campaignId,
          contactId
        }
      })
    });

    if (!queueManagerResponse.ok) {
      console.error('Queue manager trigger failed, proceeding with direct call');
      
      // Fallback to direct Twilio call
      const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
      const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

      if (!twilioAccountSid || !twilioAuthToken) {
        throw new Error('Twilio credentials not configured');
      }

      // Prepare TwiML for AI conversation handling
      const twimlUrl = `${supabaseUrl}/functions/v1/ai-conversation-handler?callRecordId=${callRecord.id}&agentId=${agentId}`;
      const statusCallbackUrl = `${supabaseUrl}/functions/v1/handle-call-webhook`;

      // Initiate Twilio call with retry logic
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
      const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

      const callParams = new URLSearchParams({
        To: contact.phone_number,
        From: profile.phone_number,
        Url: twimlUrl,
        StatusCallback: statusCallbackUrl,
        StatusCallbackMethod: 'POST',
        StatusCallbackEvent: 'initiated,ringing,answered,completed',
        Record: 'true',
        Timeout: '30'
      });

      try {
        const callData = await initiateTwilioCallWithRetry(twilioUrl, twilioAuth, callParams);
        
        // Update call record with Twilio SID
        await supabase
          .from('call_records')
          .update({
            twilio_call_sid: callData.sid,
            call_status: 'initiated',
            start_time: new Date().toISOString()
          })
          .eq('id', callRecord.id);

        // Update monitoring
        await supabase
          .from('call_monitoring')
          .update({
            twilio_call_sid: callData.sid,
            status: 'initiated'
          })
          .eq('call_record_id', callRecord.id);

        return new Response(JSON.stringify({
          success: true,
          callSid: callData.sid,
          callRecordId: callRecord.id,
          status: 'initiated',
          queueProcessed: false
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (twilioError) {
        // Mark call as failed with error details
        await supabase
          .from('call_records')
          .update({ 
            call_status: 'failed',
            failure_reason: 'twilio_api_error',
            error_message: twilioError.message,
            last_error_at: new Date().toISOString()
          })
          .eq('id', callRecord.id);
        
        throw twilioError;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      callRecordId: callRecord.id,
      status: 'queued',
      queueProcessed: true,
      message: 'Call queued for reliable processing'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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