import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonitoringConfig {
  maxCallDuration: number; // 30 minutes
  stuckCallTimeout: number; // 5 minutes of no activity
  healthCheckInterval: number; // 2 minutes
  twilioApiTimeout: number; // 30 seconds
}

const MONITORING_CONFIG: MonitoringConfig = {
  maxCallDuration: 30 * 60 * 1000, // 30 minutes
  stuckCallTimeout: 5 * 60 * 1000, // 5 minutes  
  healthCheckInterval: 2 * 60 * 1000, // 2 minutes
  twilioApiTimeout: 30 * 1000 // 30 seconds
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting call state monitoring cycle...');

    // Get all active calls that need monitoring
    const { data: activeCalls, error: callsError } = await supabase
      .from('call_records')
      .select('*')
      .in('call_status', ['initiated', 'in-progress', 'ringing', 'queued'])
      .lt('created_at', new Date(Date.now() - MONITORING_CONFIG.stuckCallTimeout).toISOString());

    if (callsError) {
      throw callsError;
    }

    console.log(`Found ${activeCalls?.length || 0} calls to monitor`);

    const results = [];
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    for (const call of activeCalls || []) {
      const result = await monitorCall(supabase, call, twilioAccountSid, twilioAuthToken);
      results.push(result);
    }

    // Check for processing calls that are stuck
    await checkStuckProcessingCalls(supabase);

    // Clean up old monitoring records
    await cleanupOldMonitoringRecords(supabase);

    console.log('Call monitoring cycle completed');

    return new Response(JSON.stringify({ 
      success: true,
      monitored: results.length,
      results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Call state monitor error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to monitor call states',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function monitorCall(
  supabase: any, 
  call: any, 
  twilioAccountSid: string | undefined, 
  twilioAuthToken: string | undefined
) {
  try {
    console.log(`Monitoring call ${call.id} with Twilio SID: ${call.twilio_call_sid}`);

    let twilioStatus = null;
    let healthScore = 100;
    let action = 'monitored';

    // Check with Twilio if we have a call SID
    if (call.twilio_call_sid && twilioAccountSid && twilioAuthToken) {
      try {
        twilioStatus = await getTwilioCallStatus(call.twilio_call_sid, twilioAccountSid, twilioAuthToken);
        console.log(`Twilio status for ${call.twilio_call_sid}: ${twilioStatus?.status}`);
      } catch (twilioError) {
        console.error(`Twilio API error for call ${call.id}:`, twilioError);
        healthScore = 50;
      }
    }

    // Determine if call is stuck or failed
    const callAge = Date.now() - new Date(call.created_at).getTime();
    const isStuck = callAge > MONITORING_CONFIG.stuckCallTimeout;
    const isTooLong = callAge > MONITORING_CONFIG.maxCallDuration;

    if (twilioStatus) {
      // Sync with Twilio status
      if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(twilioStatus.status)) {
        await handleCallCompletion(supabase, call, twilioStatus);
        action = 'completed_from_twilio';
        healthScore = twilioStatus.status === 'completed' ? 100 : 75;
      } else if (twilioStatus.status === 'in-progress') {
        healthScore = 90;
        if (isTooLong) {
          await hangupLongRunningCall(supabase, call, twilioAccountSid, twilioAuthToken);
          action = 'hung_up_too_long';
          healthScore = 60;
        }
      }
    } else if (isStuck) {
      // No Twilio status and call is stuck
      await markCallAsStuck(supabase, call);
      action = 'marked_stuck';
      healthScore = 25;
    }

    // Update monitoring record
    await updateMonitoringRecord(supabase, call, healthScore, action);

    return {
      callId: call.id,
      action,
      healthScore,
      twilioStatus: twilioStatus?.status || 'unknown',
      callAge: Math.floor(callAge / 1000) // seconds
    };

  } catch (error) {
    console.error(`Error monitoring call ${call.id}:`, error);
    await updateMonitoringRecord(supabase, call, 0, 'error');
    return {
      callId: call.id,
      action: 'error',
      error: error.message
    };
  }
}

async function getTwilioCallStatus(callSid: string, accountSid: string, authToken: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MONITORING_CONFIG.twilioApiTimeout);

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Twilio API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function handleCallCompletion(supabase: any, call: any, twilioStatus: any) {
  const updateData: any = {
    call_status: twilioStatus.status,
    end_time: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (twilioStatus.duration) {
    updateData.duration_seconds = parseInt(twilioStatus.duration);
  }

  if (twilioStatus.price) {
    updateData.cost_cents = Math.round(parseFloat(twilioStatus.price) * 100);
  }

  await supabase
    .from('call_records')
    .update(updateData)
    .eq('id', call.id);

  // Update contact status
  if (call.contact_id) {
    await supabase
      .from('contacts')
      .update({
        call_status: twilioStatus.status,
        last_called_at: new Date().toISOString(),
        call_attempts: call.call_attempts + 1
      })
      .eq('id', call.contact_id);
  }

  console.log(`Updated call ${call.id} status to ${twilioStatus.status}`);
}

async function hangupLongRunningCall(supabase: any, call: any, accountSid: string, authToken: string) {
  try {
    // Hang up the call via Twilio
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${call.twilio_call_sid}.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ status: 'completed' })
    });

    if (response.ok) {
      await supabase
        .from('call_records')
        .update({
          call_status: 'completed',
          end_time: new Date().toISOString(),
          failure_reason: 'max_duration_exceeded',
          updated_at: new Date().toISOString()
        })
        .eq('id', call.id);

      console.log(`Hung up long-running call ${call.id}`);
    }
  } catch (error) {
    console.error(`Failed to hang up call ${call.id}:`, error);
  }
}

async function markCallAsStuck(supabase: any, call: any) {
  await supabase
    .from('call_records')
    .update({
      call_status: 'failed',
      failure_reason: 'stuck_timeout',
      error_message: 'Call stuck in processing state',
      end_time: new Date().toISOString(),
      last_error_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', call.id);

  console.log(`Marked stuck call ${call.id} as failed`);
}

async function checkStuckProcessingCalls(supabase: any) {
  const { data: stuckCalls, error } = await supabase
    .from('call_queue')
    .select('*')
    .eq('status', 'processing')
    .lt('processing_started_at', new Date(Date.now() - MONITORING_CONFIG.stuckCallTimeout).toISOString());

  if (error || !stuckCalls?.length) return;

  for (const stuckCall of stuckCalls) {
    await supabase
      .from('call_queue')
      .update({
        status: 'failed',
        error_message: 'Processing timeout - call stuck',
        completed_at: new Date().toISOString()
      })
      .eq('id', stuckCall.id);
  }

  console.log(`Cleaned up ${stuckCalls.length} stuck processing calls`);
}

async function updateMonitoringRecord(supabase: any, call: any, healthScore: number, status: string) {
  await supabase
    .from('call_monitoring')
    .upsert({
      user_id: call.user_id,
      call_record_id: call.id,
      twilio_call_sid: call.twilio_call_sid,
      status,
      health_score: healthScore,
      last_heartbeat: new Date().toISOString()
    }, {
      onConflict: 'call_record_id'
    });
}

async function cleanupOldMonitoringRecords(supabase: any) {
  // Delete monitoring records older than 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  await supabase
    .from('call_monitoring')
    .delete()
    .lt('created_at', oneDayAgo);
}