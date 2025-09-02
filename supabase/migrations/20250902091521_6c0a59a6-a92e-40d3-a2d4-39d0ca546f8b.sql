-- Create function to handle call failures with automatic retry scheduling
-- This can be called manually or triggered by the application
CREATE OR REPLACE FUNCTION handle_call_failure(
  call_record_id uuid,
  failure_reason text DEFAULT 'unknown',
  error_message text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the call record with failure information
  UPDATE call_records 
  SET 
    call_status = 'failed',
    failure_reason = handle_call_failure.failure_reason,
    error_message = handle_call_failure.error_message,
    last_error_at = now(),
    updated_at = now()
  WHERE id = call_record_id;
  
  -- The retry logic will be handled by the call-retry-handler edge function
  -- which can be triggered manually or through external scheduling
END;
$$;

-- Create helper function to get system health metrics
CREATE OR REPLACE FUNCTION get_call_system_health(user_uuid uuid)
RETURNS TABLE (
  total_calls bigint,
  active_calls bigint,
  failed_calls bigint,
  retry_calls bigint,
  success_rate numeric,
  avg_retry_count numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE cr.call_status IN ('initiated', 'ringing', 'in-progress')) as active_calls,
    COUNT(*) FILTER (WHERE cr.call_status = 'failed') as failed_calls,
    COUNT(*) FILTER (WHERE cr.retry_count > 0) as retry_calls,
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE cr.call_status NOT IN ('failed')) * 100.0) / COUNT(*), 2)
      ELSE 100.0
    END as success_rate,
    COALESCE(AVG(cr.retry_count), 0) as avg_retry_count
  FROM call_records cr
  WHERE cr.user_id = user_uuid
    AND cr.created_at >= now() - interval '24 hours';
END;
$$;