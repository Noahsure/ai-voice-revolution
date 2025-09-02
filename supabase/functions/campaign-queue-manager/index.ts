import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueueConfig {
  maxConcurrentCalls: number;
  callRatePerMinute: number;
  batchSize: number;
  priorityWeights: { [key: number]: number };
}

const QUEUE_CONFIG: QueueConfig = {
  maxConcurrentCalls: 10, // Per user
  callRatePerMinute: 30,  // Per user
  batchSize: 5,
  priorityWeights: {
    1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4, 5: 0.5,
    6: 0.6, 7: 0.7, 8: 0.8, 9: 0.9, 10: 1.0
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting campaign queue management cycle...');

    // Process queues for all users
    const { data: activeUsers, error: usersError } = await supabase
      .from('call_queue')
      .select('user_id')
      .eq('status', 'pending')
      .order('user_id');

    if (usersError) {
      throw usersError;
    }

    const uniqueUsers = [...new Set(activeUsers?.map(u => u.user_id) || [])];
    console.log(`Processing queues for ${uniqueUsers.length} users`);

    const results = [];
    for (const userId of uniqueUsers) {
      const result = await processUserQueue(supabase, userId);
      results.push(result);
    }

    // Clean up completed queue entries
    await cleanupCompletedQueueEntries(supabase);

    // Handle retry scheduling
    await processScheduledRetries(supabase);

    console.log('Campaign queue management completed');

    return new Response(JSON.stringify({ 
      success: true,
      processedUsers: uniqueUsers.length,
      results: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Campaign queue manager error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to manage campaign queues',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processUserQueue(supabase: any, userId: string) {
  try {
    console.log(`Processing queue for user: ${userId}`);

    // Check current concurrent calls for this user
    const { data: activeCalls, error: activeCallsError } = await supabase
      .from('call_records')
      .select('id')
      .eq('user_id', userId)
      .in('call_status', ['initiated', 'ringing', 'in-progress', 'queued'])
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // Last 30 minutes

    if (activeCallsError) {
      throw activeCallsError;
    }

    const currentConcurrent = activeCalls?.length || 0;
    const availableSlots = QUEUE_CONFIG.maxConcurrentCalls - currentConcurrent;

    if (availableSlots <= 0) {
      console.log(`User ${userId} has ${currentConcurrent} active calls, queue full`);
      return { userId, status: 'queue_full', availableSlots: 0 };
    }

    // Check rate limiting
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentCalls, error: recentCallsError } = await supabase
      .from('call_records')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', oneMinuteAgo);

    if (recentCallsError) {
      throw recentCallsError;
    }

    const recentCallCount = recentCalls?.length || 0;
    if (recentCallCount >= QUEUE_CONFIG.callRatePerMinute) {
      console.log(`User ${userId} rate limited: ${recentCallCount} calls in last minute`);
      return { userId, status: 'rate_limited', recentCallCount };
    }

    // Get pending queue entries for this user, prioritized
    const { data: queueEntries, error: queueError } = await supabase
      .from('call_queue')
      .select(`
        *,
        campaigns!inner(*),
        contacts!inner(*),
        ai_agents!inner(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true })
      .limit(Math.min(availableSlots, QUEUE_CONFIG.batchSize));

    if (queueError) {
      throw queueError;
    }

    if (!queueEntries?.length) {
      return { userId, status: 'no_pending_calls' };
    }

    console.log(`Processing ${queueEntries.length} calls for user ${userId}`);

    const processedCalls = [];
    for (const entry of queueEntries) {
      const result = await processQueueEntry(supabase, entry);
      processedCalls.push(result);
    }

    return {
      userId,
      status: 'processed',
      availableSlots,
      processedCount: processedCalls.length,
      calls: processedCalls
    };

  } catch (error) {
    console.error(`Error processing queue for user ${userId}:`, error);
    return { userId, status: 'error', error: error.message };
  }
}

async function processQueueEntry(supabase: any, entry: any) {
  try {
    console.log(`Processing queue entry: ${entry.id} for contact ${entry.contact_id}`);

    // Mark as processing
    await supabase
      .from('call_queue')
      .update({
        status: 'processing',
        processing_started_at: new Date().toISOString(),
        attempts: (entry.attempts || 0) + 1
      })
      .eq('id', entry.id);

    // Validate that campaign and agent are still active
    if (entry.campaigns?.status !== 'active') {
      await supabase
        .from('call_queue')
        .update({
          status: 'failed',
          error_message: 'Campaign is not active',
          completed_at: new Date().toISOString()
        })
        .eq('id', entry.id);

      return { queueId: entry.id, status: 'failed', reason: 'inactive_campaign' };
    }

    if (!entry.ai_agents?.is_active) {
      await supabase
        .from('call_queue')
        .update({
          status: 'failed',
          error_message: 'AI agent is not active',
          completed_at: new Date().toISOString()
        })
        .eq('id', entry.id);

      return { queueId: entry.id, status: 'failed', reason: 'inactive_agent' };
    }

    // Check if contact is valid for calling
    const contact = entry.contacts;
    if (!contact.phone_number) {
      await supabase
        .from('call_queue')
        .update({
          status: 'failed',
          error_message: 'Contact has no phone number',
          completed_at: new Date().toISOString()
        })
        .eq('id', entry.id);

      return { queueId: entry.id, status: 'failed', reason: 'no_phone_number' };
    }

    // Create call record
    const { data: callRecord, error: callError } = await supabase
      .from('call_records')
      .insert({
        user_id: entry.user_id,
        campaign_id: entry.campaign_id,
        contact_id: entry.contact_id,
        agent_id: entry.agent_id,
        phone_number: contact.phone_number,
        call_status: 'queued',
        call_direction: 'outbound'
      })
      .select()
      .single();

    if (callError) {
      await supabase
        .from('call_queue')
        .update({
          status: 'failed',
          error_message: `Failed to create call record: ${callError.message}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', entry.id);

      return { queueId: entry.id, status: 'failed', reason: 'call_record_creation_failed' };
    }

    // Initiate the call via Twilio
    const callResult = await initiateCall(entry, callRecord);

    if (callResult.success) {
      // Update call record with Twilio SID
      await supabase
        .from('call_records')
        .update({
          twilio_call_sid: callResult.twilioSid,
          call_status: 'initiated',
          start_time: new Date().toISOString()
        })
        .eq('id', callRecord.id);

      // Mark queue entry as completed
      await supabase
        .from('call_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', entry.id);

      return { 
        queueId: entry.id, 
        callRecordId: callRecord.id,
        status: 'initiated', 
        twilioSid: callResult.twilioSid 
      };
    } else {
      // Mark call as failed
      await supabase
        .from('call_records')
        .update({
          call_status: 'failed',
          failure_reason: callResult.error,
          error_message: callResult.details
        })
        .eq('id', callRecord.id);

      await supabase
        .from('call_queue')
        .update({
          status: 'failed',
          error_message: callResult.error,
          completed_at: new Date().toISOString()
        })
        .eq('id', entry.id);

      return { 
        queueId: entry.id, 
        callRecordId: callRecord.id,
        status: 'failed', 
        error: callResult.error 
      };
    }

  } catch (error) {
    console.error(`Error processing queue entry ${entry.id}:`, error);
    
    await supabase
      .from('call_queue')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', entry.id);

    return { queueId: entry.id, status: 'error', error: error.message };
  }
}

async function initiateCall(queueEntry: any, callRecord: any) {
  try {
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!twilioAccountSid || !twilioAuthToken) {
      return { success: false, error: 'Twilio credentials not configured' };
    }

    // Get user's Twilio phone number from profile
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('user_id', queueEntry.user_id)
      .single();

    if (profileError || !profile?.phone_number) {
      return { success: false, error: 'User phone number not configured' };
    }

    // Create Twilio call
    const formData = new FormData();
    formData.append('To', queueEntry.contacts.phone_number);
    formData.append('From', profile.phone_number);
    formData.append('Url', `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-conversation-handler?callRecordId=${callRecord.id}&agentId=${queueEntry.agent_id}`);
    formData.append('StatusCallback', `${Deno.env.get('SUPABASE_URL')}/functions/v1/handle-call-webhook`);
    formData.append('StatusCallbackEvent', 'initiated,ringing,answered,completed');
    formData.append('StatusCallbackMethod', 'POST');
    formData.append('Timeout', '30');
    formData.append('Record', 'true');

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { 
        success: false, 
        error: 'Twilio API error',
        details: errorText
      };
    }

    const callData = await response.json();
    
    return { 
      success: true, 
      twilioSid: callData.sid 
    };

  } catch (error) {
    console.error('Error initiating call:', error);
    return { 
      success: false, 
      error: 'Call initiation failed',
      details: error.message
    };
  }
}

async function cleanupCompletedQueueEntries(supabase: any) {
  // Delete completed queue entries older than 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  await supabase
    .from('call_queue')
    .delete()
    .in('status', ['completed', 'failed'])
    .lt('completed_at', oneHourAgo);
}

async function processScheduledRetries(supabase: any) {
  // Get calls scheduled for retry
  const { data: retryEntries, error } = await supabase
    .from('call_records')
    .select('*')
    .eq('call_status', 'retry_scheduled')
    .lte('next_retry_at', new Date().toISOString())
    .limit(20);

  if (error || !retryEntries?.length) return;

  for (const call of retryEntries) {
    // Add back to queue
    await supabase
      .from('call_queue')
      .upsert({
        user_id: call.user_id,
        campaign_id: call.campaign_id,
        contact_id: call.contact_id,
        agent_id: call.agent_id,
        priority: 5, // Medium priority for retries
        scheduled_at: new Date().toISOString(),
        status: 'pending',
        attempts: call.retry_count || 0
      }, {
        onConflict: 'contact_id,campaign_id'
      });

    // Update call status
    await supabase
      .from('call_records')
      .update({ call_status: 'queued' })
      .eq('id', call.id);
  }

  console.log(`Processed ${retryEntries.length} scheduled retries`);
}