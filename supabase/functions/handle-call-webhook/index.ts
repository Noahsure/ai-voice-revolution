import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Parse Twilio webhook data
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const callDuration = formData.get('CallDuration') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;

    console.log(`Webhook received - SID: ${callSid}, Status: ${callStatus}, Duration: ${callDuration}`);

    // Initialize Supabase client
    const supabaseUrl = "https://xmpjqtvznswcdfwtrvpc.supabase.co";
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find call record by Twilio SID
    const { data: callRecord } = await supabase
      .from('call_records')
      .select('*')
      .eq('twilio_call_sid', callSid)
      .single();

    if (!callRecord) {
      console.log(`Call record not found for SID: ${callSid}`);
      return new Response('OK', { headers: corsHeaders });
    }

    // Map Twilio status to our status
    let mappedStatus = callStatus.toLowerCase();
    if (callStatus === 'completed') mappedStatus = 'completed';
    if (callStatus === 'busy' || callStatus === 'failed') mappedStatus = 'failed';
    if (callStatus === 'no-answer') mappedStatus = 'no_answer';

    // Update call record and handle potential failures
    const updateData: any = {
      call_status: mappedStatus,
      updated_at: new Date().toISOString()
    };

    if (callStatus === 'completed') {
      updateData.end_time = new Date().toISOString();
      updateData.duration_seconds = parseInt(callDuration) || 0;
    }

    if (recordingUrl) {
      updateData.recording_url = recordingUrl;
    }

    // Handle failures with comprehensive error tracking
    if (['failed', 'busy', 'no-answer'].includes(callStatus)) {
      updateData.failure_reason = callStatus;
      updateData.error_message = `Call ended with Twilio status: ${callStatus}`;
      updateData.last_error_at = new Date().toISOString();
      
      // Trigger retry handler for recoverable failures
      const isRetryable = ['busy', 'no-answer'].includes(callStatus);
      if (isRetryable) {
        // Add to monitoring system
        await supabase
          .from('call_monitoring')
          .upsert({
            user_id: callRecord.user_id,
            call_record_id: callRecord.id,
            twilio_call_sid: callSid,
            status: 'retry_required',
            health_score: 50
          }, {
            onConflict: 'call_record_id'
          });

        // Trigger retry handler asynchronously
        const retryResponse = await fetch(`${supabaseUrl}/functions/v1/call-retry-handler`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            callRecordId: callRecord.id,
            failureReason: callStatus,
            errorMessage: `Twilio webhook: ${callStatus}`
          })
        });

        if (!retryResponse.ok) {
          console.error('Failed to trigger retry handler');
        }
      }
    } else if (callStatus === 'completed') {
      // Update monitoring for successful calls
      await supabase
        .from('call_monitoring')
        .upsert({
          user_id: callRecord.user_id,
          call_record_id: callRecord.id,
          twilio_call_sid: callSid,
          status: 'completed',
          health_score: 100
        }, {
          onConflict: 'call_record_id'
        });
    }

    await supabase
      .from('call_records')
      .update(updateData)
      .eq('id', callRecord.id);

    // Update contact status based on call outcome
    let contactStatus = 'pending';
    if (mappedStatus === 'completed') contactStatus = 'completed';
    if (mappedStatus === 'failed' || mappedStatus === 'no_answer') contactStatus = 'pending';

    await supabase
      .from('contacts')
      .update({
        call_status: contactStatus,
        last_called_at: new Date().toISOString()
      })
      .eq('id', callRecord.contact_id);

    // Update campaign statistics
    if (mappedStatus === 'completed') {
      await supabase.rpc('increment_campaign_completed_calls', {
        campaign_id: callRecord.campaign_id
      });
    }

    console.log(`Call record updated - Status: ${mappedStatus}`);

    return new Response('OK', { headers: corsHeaders });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Error', {
      status: 500,
      headers: corsHeaders
    });
  }
});