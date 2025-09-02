import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecoveryConfig {
  webhookTimeoutMinutes: number;
  maxRecoveryAttempts: number;
  healthCheckIntervalMinutes: number;
  stateInconsistencyThreshold: number;
}

const RECOVERY_CONFIG: RecoveryConfig = {
  webhookTimeoutMinutes: 10,
  maxRecoveryAttempts: 3,
  healthCheckIntervalMinutes: 5,
  stateInconsistencyThreshold: 5 // minutes
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting call error recovery cycle...');

    const results = {
      webhookTimeouts: 0,
      stateInconsistencies: 0,
      recoveredCalls: 0,
      failedRecoveries: 0
    };

    // 1. Handle webhook delivery failures
    const webhookTimeouts = await handleWebhookTimeouts(supabase);
    results.webhookTimeouts = webhookTimeouts;

    // 2. Detect and fix state inconsistencies
    const stateInconsistencies = await handleStateInconsistencies(supabase);
    results.stateInconsistencies = stateInconsistencies;

    // 3. Recover orphaned calls
    const recoveredCalls = await recoverOrphanedCalls(supabase);
    results.recoveredCalls = recoveredCalls;

    // 4. Handle database connection issues
    const connectionIssues = await handleConnectionIssues(supabase);
    
    // 5. Reconcile with Twilio state
    const reconciledCalls = await reconcileWithTwilio(supabase);

    console.log('Call error recovery completed', results);

    return new Response(JSON.stringify({ 
      success: true,
      ...results,
      connectionIssues,
      reconciledCalls
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Call error recovery error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to recover call errors',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleWebhookTimeouts(supabase: any): Promise<number> {
  console.log('Checking for webhook timeouts...');
  
  const webhookTimeoutThreshold = new Date(
    Date.now() - RECOVERY_CONFIG.webhookTimeoutMinutes * 60 * 1000
  ).toISOString();

  // Find calls that should have received webhooks but haven't
  const { data: timedOutCalls, error } = await supabase
    .from('call_records')
    .select('*')
    .in('call_status', ['initiated', 'ringing'])
    .lt('created_at', webhookTimeoutThreshold);

  if (error || !timedOutCalls?.length) {
    return 0;
  }

  console.log(`Found ${timedOutCalls.length} calls with webhook timeouts`);

  let recoveredCount = 0;
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

  for (const call of timedOutCalls) {
    try {
      if (!call.twilio_call_sid) {
        // Call never got a Twilio SID, mark as failed
        await supabase
          .from('call_records')
          .update({
            call_status: 'failed',
            failure_reason: 'webhook_timeout_no_sid',
            error_message: 'No Twilio SID received within timeout period',
            end_time: new Date().toISOString()
          })
          .eq('id', call.id);
        
        recoveredCount++;
        continue;
      }

      // Try to get actual status from Twilio
      if (twilioAccountSid && twilioAuthToken) {
        const twilioStatus = await getTwilioCallStatus(
          call.twilio_call_sid, 
          twilioAccountSid, 
          twilioAuthToken
        );

        if (twilioStatus) {
          await updateCallFromTwilioStatus(supabase, call, twilioStatus);
          recoveredCount++;
        } else {
          // Twilio call not found, mark as failed
          await supabase
            .from('call_records')
            .update({
              call_status: 'failed',
              failure_reason: 'webhook_timeout_not_found',
              error_message: 'Call not found in Twilio after timeout',
              end_time: new Date().toISOString()
            })
            .eq('id', call.id);
          
          recoveredCount++;
        }
      }
    } catch (error) {
      console.error(`Failed to recover call ${call.id}:`, error);
    }
  }

  return recoveredCount;
}

async function handleStateInconsistencies(supabase: any): Promise<number> {
  console.log('Checking for state inconsistencies...');
  
  const inconsistencyThreshold = new Date(
    Date.now() - RECOVERY_CONFIG.stateInconsistencyThreshold * 60 * 1000
  ).toISOString();

  // Find calls that are in inconsistent states
  const { data: inconsistentCalls, error } = await supabase
    .from('call_records')
    .select('*')
    .or(`
      and(call_status.eq.in-progress,start_time.is.null),
      and(call_status.eq.completed,end_time.is.null),
      and(call_status.eq.initiated,created_at.lt.${inconsistencyThreshold})
    `);

  if (error || !inconsistentCalls?.length) {
    return 0;
  }

  console.log(`Found ${inconsistentCalls.length} calls with state inconsistencies`);

  let fixedCount = 0;
  for (const call of inconsistentCalls) {
    try {
      if (call.call_status === 'in-progress' && !call.start_time) {
        // Set start time for in-progress calls
        await supabase
          .from('call_records')
          .update({
            start_time: call.created_at // Use created_at as fallback
          })
          .eq('id', call.id);
        
        fixedCount++;
      } else if (call.call_status === 'completed' && !call.end_time) {
        // Set end time for completed calls
        await supabase
          .from('call_records')
          .update({
            end_time: new Date().toISOString()
          })
          .eq('id', call.id);
        
        fixedCount++;
      } else if (call.call_status === 'initiated') {
        // Long-standing initiated calls should be marked as failed
        await supabase
          .from('call_records')
          .update({
            call_status: 'failed',
            failure_reason: 'state_inconsistency_timeout',
            error_message: 'Call stuck in initiated state',
            end_time: new Date().toISOString()
          })
          .eq('id', call.id);
        
        fixedCount++;
      }
    } catch (error) {
      console.error(`Failed to fix inconsistency for call ${call.id}:`, error);
    }
  }

  return fixedCount;
}

async function recoverOrphanedCalls(supabase: any): Promise<number> {
  console.log('Checking for orphaned calls...');

  // Find calls that have Twilio SIDs but no recent updates
  const staleThreshold = new Date(
    Date.now() - 15 * 60 * 1000 // 15 minutes
  ).toISOString();

  const { data: orphanedCalls, error } = await supabase
    .from('call_records')
    .select('*')
    .in('call_status', ['initiated', 'ringing', 'in-progress'])
    .not('twilio_call_sid', 'is', null)
    .lt('updated_at', staleThreshold);

  if (error || !orphanedCalls?.length) {
    return 0;
  }

  console.log(`Found ${orphanedCalls.length} potentially orphaned calls`);

  let recoveredCount = 0;
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

  if (!twilioAccountSid || !twilioAuthToken) {
    console.log('Twilio credentials not available for orphan recovery');
    return 0;
  }

  for (const call of orphanedCalls) {
    try {
      const twilioStatus = await getTwilioCallStatus(
        call.twilio_call_sid,
        twilioAccountSid,
        twilioAuthToken
      );

      if (twilioStatus) {
        await updateCallFromTwilioStatus(supabase, call, twilioStatus);
        recoveredCount++;
      } else {
        // Call not found in Twilio, mark as failed
        await supabase
          .from('call_records')
          .update({
            call_status: 'failed',
            failure_reason: 'orphaned_call_not_found',
            error_message: 'Call record orphaned - not found in Twilio',
            end_time: new Date().toISOString()
          })
          .eq('id', call.id);
        
        recoveredCount++;
      }
    } catch (error) {
      console.error(`Failed to recover orphaned call ${call.id}:`, error);
    }
  }

  return recoveredCount;
}

async function handleConnectionIssues(supabase: any): Promise<number> {
  console.log('Checking for connection issues...');
  
  // Test database connectivity
  try {
    const { data, error } = await supabase
      .from('call_records')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Database connection issue detected:', error);
      return 0;
    }

    // Test edge function connectivity
    const { data: functionTest, error: functionError } = await supabase.functions.invoke('track-usage', {
      body: { test: true }
    });

    if (functionError) {
      console.error('Edge function connectivity issue:', functionError);
    }

    return 1; // Connection healthy
  } catch (error) {
    console.error('Connectivity test failed:', error);
    return 0;
  }
}

async function reconcileWithTwilio(supabase: any): Promise<number> {
  console.log('Reconciling with Twilio state...');

  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

  if (!twilioAccountSid || !twilioAuthToken) {
    return 0;
  }

  // Get active calls from our database
  const { data: activeCalls, error } = await supabase
    .from('call_records')
    .select('*')
    .in('call_status', ['initiated', 'ringing', 'in-progress'])
    .not('twilio_call_sid', 'is', null)
    .limit(50); // Process in batches

  if (error || !activeCalls?.length) {
    return 0;
  }

  let reconciledCount = 0;
  for (const call of activeCalls) {
    try {
      const twilioStatus = await getTwilioCallStatus(
        call.twilio_call_sid,
        twilioAccountSid,
        twilioAuthToken
      );

      if (twilioStatus && twilioStatus.status !== call.call_status) {
        await updateCallFromTwilioStatus(supabase, call, twilioStatus);
        reconciledCount++;
      }
    } catch (error) {
      console.error(`Failed to reconcile call ${call.id}:`, error);
    }
  }

  return reconciledCount;
}

async function getTwilioCallStatus(callSid: string, accountSid: string, authToken: string) {
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Call not found
      }
      throw new Error(`Twilio API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error getting Twilio status for ${callSid}:`, error);
    return null;
  }
}

async function updateCallFromTwilioStatus(supabase: any, call: any, twilioStatus: any) {
  const updateData: any = {
    call_status: mapTwilioStatusToCallStatus(twilioStatus.status),
    updated_at: new Date().toISOString()
  };

  if (twilioStatus.start_time && !call.start_time) {
    updateData.start_time = new Date(twilioStatus.start_time).toISOString();
  }

  if (twilioStatus.end_time && !call.end_time) {
    updateData.end_time = new Date(twilioStatus.end_time).toISOString();
  }

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

  console.log(`Updated call ${call.id} from Twilio status: ${twilioStatus.status}`);
}

function mapTwilioStatusToCallStatus(twilioStatus: string): string {
  const statusMap: { [key: string]: string } = {
    'queued': 'queued',
    'initiated': 'initiated', 
    'ringing': 'ringing',
    'answered': 'in-progress',
    'in-progress': 'in-progress',
    'completed': 'completed',
    'busy': 'busy',
    'failed': 'failed',
    'no-answer': 'no-answer',
    'canceled': 'cancelled'
  };

  return statusMap[twilioStatus] || 'failed';
}