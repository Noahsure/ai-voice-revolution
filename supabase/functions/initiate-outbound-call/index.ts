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
  useSimpleTwiml?: boolean;
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
    const { campaignId, contactId, agentId, phoneNumber, useSimpleTwiml }: CallRequest = await req.json();

    // Input validation
    if (!agentId || !phoneNumber) {
      throw new Error('Missing required parameters: agentId and phoneNumber are required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || "https://xmpjqtvznswcdfwtrvpc.supabase.co";
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceRoleKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get authorization header and validate user
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader || undefined);
    if (userError || !user) {
      console.error('Unauthorized request to initiate-outbound-call', { hasAuthHeader: !!authHeader, userError });
      throw new Error('Unauthorized');
    }


    const userId = user.id;

    // Clean up any stuck calls for this user  
    await checkForStuckCalls(supabase, userId);

    // Get contact details
    let contact: any = null;
    if (contactId) {
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .maybeSingle();

      if (contactError) {
        console.error('Error fetching contact:', contactError);
      }
      contact = contactData;
    }

    // If no contact found, we'll fallback to the provided phoneNumber for manual dialing

    // Get agent details for voice configuration
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      throw new Error('Agent not found');
    }

    // Get user's profile with Twilio credentials and phone number
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone_number, twilio_account_sid, twilio_auth_token')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.phone_number) {
      throw new Error('User phone number not configured in profile');
    }

    if (!profile.twilio_account_sid || !profile.twilio_auth_token) {
      throw new Error('Twilio credentials not configured in user profile');
    }

    // Create call record with proper state management
    const { data: callRecord, error: callError } = await supabase
      .from('call_records')
      .insert({
        user_id: userId,
        contact_id: contactId || null,
        campaign_id: campaignId || null,
        agent_id: agentId,
        phone_number: (contact && contact.phone_number) ? contact.phone_number : phoneNumber,
        call_direction: 'outbound',
        retry_count: 0
      })
      .select()
      .single();

    if (callError) {
      throw new Error(`Failed to create call record: ${callError.message}`);
    }

    // Add to call queue for campaign calls only
    let queued = false;
    if (campaignId) {
      const { error: queueError } = await supabase
        .from('call_queue')
        .insert({
          user_id: userId,
          campaign_id: campaignId,
          contact_id: contactId || null,
          agent_id: agentId,
          priority: 5, // Default priority
          scheduled_at: new Date().toISOString(),
          status: 'pending'
        });

      if (queueError) {
        console.error('Error adding to call queue:', queueError);
        // Will fallback to direct call below
      } else {
        queued = true;
      }
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

    // For manual calls, or if queue manager fails, initiate a direct Twilio call
    const isManualCall = !campaignId;

    let queueOk = false;
    if (!isManualCall && queued) {
      // For campaign calls, try to trigger the queue manager
      try {
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
        queueOk = queueManagerResponse.ok;
        if (!queueOk) {
          console.error('Queue manager trigger failed, will attempt direct call');
        }
      } catch (e) {
        console.error('Queue manager trigger error:', e);
      }
    }

    if (isManualCall || !queueOk) {
      // Use Twilio credentials from user's profile
      const twilioAccountSid = profile.twilio_account_sid;
      const twilioAuthToken = profile.twilio_auth_token;

      // Prepare TwiML for AI conversation handling
      const twimlUrl = (useSimpleTwiml)
        ? `${supabaseUrl}/functions/v1/call-twiml`
        : `${supabaseUrl}/functions/v1/ai-conversation-handler?callRecordId=${callRecord.id}&agentId=${agentId}`;
      console.log('Using TwiML URL:', twimlUrl);
      const statusCallbackUrl = `${supabaseUrl}/functions/v1/handle-call-webhook`;

      // Initiate Twilio call with retry logic
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`;
      const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

      const toNumber = (contact && contact.phone_number) ? contact.phone_number : phoneNumber;

      const callParams = new URLSearchParams({
        To: toNumber,
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

      } catch (twilioError: any) {
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

    // If we reached here, the call was queued for processing
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
      error: error.message,
      timestamp: new Date().toISOString(),
      details: (error as any)?.stack || null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});