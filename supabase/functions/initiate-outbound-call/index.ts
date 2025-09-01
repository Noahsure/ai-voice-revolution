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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, contactId, agentId, phoneNumber }: CallRequest = await req.json();

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

    // Initiate Twilio call
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

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: callParams
    });

    if (!twilioResponse.ok) {
      const error = await twilioResponse.text();
      throw new Error(`Twilio API error: ${error}`);
    }

    const callData = await twilioResponse.json();

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

    console.log(`Call initiated: ${callData.sid} to ${phoneNumber}`);

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