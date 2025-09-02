import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetryConfig {
  maxRetries: number;
  retryableStatuses: string[];
  retryableErrors: string[];
  backoffMultiplier: number;
}

const RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  retryableStatuses: ['no-answer', 'busy', 'failed', 'timeout'],
  retryableErrors: ['network_error', 'twilio_timeout', 'ai_service_error'],
  backoffMultiplier: 2
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { callRecordId, failureReason, errorMessage } = await req.json();

    console.log(`Processing retry for call: ${callRecordId}, reason: ${failureReason}`);

    // Get current call record
    const { data: callRecord, error: callError } = await supabase
      .from('call_records')
      .select('*')
      .eq('id', callRecordId)
      .single();

    if (callError || !callRecord) {
      throw new Error(`Call record not found: ${callRecordId}`);
    }

    // Check if retry is warranted
    const shouldRetry = isRetryable(failureReason, errorMessage, callRecord.retry_count);
    
    if (!shouldRetry) {
      console.log(`Call ${callRecordId} not retryable. Marking as permanently failed.`);
      
      // Mark as permanently failed
      await supabase
        .from('call_records')
        .update({
          call_status: 'failed',
          error_message: errorMessage,
          failure_reason: failureReason,
          last_error_at: new Date().toISOString()
        })
        .eq('id', callRecordId);

      // Remove from call queue if exists
      await supabase
        .from('call_queue')
        .update({ status: 'failed', error_message: errorMessage })
        .eq('contact_id', callRecord.contact_id)
        .eq('campaign_id', callRecord.campaign_id);

      return new Response(JSON.stringify({ 
        success: true, 
        action: 'marked_failed',
        reason: 'Max retries exceeded or non-retryable error'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculate next retry time using exponential backoff
    const nextRetryCount = (callRecord.retry_count || 0) + 1;
    const nextRetryAt = calculateNextRetry(nextRetryCount);

    console.log(`Scheduling retry ${nextRetryCount} for call ${callRecordId} at ${nextRetryAt}`);

    // Update call record with retry information
    const { error: updateError } = await supabase
      .from('call_records')
      .update({
        retry_count: nextRetryCount,
        next_retry_at: nextRetryAt,
        error_message: errorMessage,
        failure_reason: failureReason,
        call_status: 'retry_scheduled',
        last_error_at: new Date().toISOString()
      })
      .eq('id', callRecordId);

    if (updateError) {
      throw updateError;
    }

    // Add back to call queue for retry
    const { error: queueError } = await supabase
      .from('call_queue')
      .upsert({
        user_id: callRecord.user_id,
        campaign_id: callRecord.campaign_id,
        contact_id: callRecord.contact_id,
        agent_id: callRecord.agent_id,
        priority: getPriorityForRetry(nextRetryCount),
        scheduled_at: nextRetryAt,
        status: 'pending',
        attempts: nextRetryCount,
        max_attempts: RETRY_CONFIG.maxRetries
      }, {
        onConflict: 'contact_id,campaign_id'
      });

    if (queueError) {
      console.error('Queue error:', queueError);
    }

    // Log retry attempt
    console.log(`Successfully scheduled retry ${nextRetryCount} for call ${callRecordId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      action: 'retry_scheduled',
      nextRetryAt,
      retryCount: nextRetryCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Call retry handler error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process retry',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function isRetryable(failureReason: string, errorMessage: string, currentRetryCount: number): boolean {
  // Check max retries
  if (currentRetryCount >= RETRY_CONFIG.maxRetries) {
    return false;
  }

  // Check if failure reason is retryable
  if (RETRY_CONFIG.retryableStatuses.includes(failureReason)) {
    return true;
  }

  // Check if error message contains retryable errors
  if (errorMessage && RETRY_CONFIG.retryableErrors.some(err => 
    errorMessage.toLowerCase().includes(err.toLowerCase())
  )) {
    return true;
  }

  // Non-retryable errors
  const nonRetryableErrors = [
    'invalid_phone_number',
    'do_not_call',
    'customer_requested_removal',
    'compliance_violation',
    'permanent_failure'
  ];

  if (nonRetryableErrors.some(err => 
    failureReason?.toLowerCase().includes(err) || 
    errorMessage?.toLowerCase().includes(err)
  )) {
    return false;
  }

  return false;
}

function calculateNextRetry(retryCount: number): string {
  // Exponential backoff with jitter
  const baseDelay = Math.min(Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount), 30); // Max 30 minutes
  const jitter = Math.random() * 0.1 * baseDelay; // 10% jitter
  const delayMinutes = baseDelay + jitter;
  
  const nextRetry = new Date(Date.now() + delayMinutes * 60 * 1000);
  return nextRetry.toISOString();
}

function getPriorityForRetry(retryCount: number): number {
  // Higher retry counts get lower priority
  return Math.max(1, 10 - retryCount);
}