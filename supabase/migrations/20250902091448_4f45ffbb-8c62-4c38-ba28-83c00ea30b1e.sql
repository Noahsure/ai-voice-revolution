-- Create cron jobs for automated call reliability monitoring
-- This requires pg_cron extension which is enabled by default in Supabase

-- Schedule call state monitor to run every 2 minutes
SELECT cron.schedule(
  'call-state-monitor',
  '*/2 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://xmpjqtvznswcdfwtrvpc.supabase.co/functions/v1/call-state-monitor',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcGpxdHZ6bnN3Y2Rmd3RydnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDE3MjQsImV4cCI6MjA3MjMxNzcyNH0.fkDoqP1b8UusCA0rHzcvi7KmkzoGrbcHjv3loVZRbBo"}'::jsonb,
      body := '{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Schedule campaign queue manager to run every minute
SELECT cron.schedule(
  'campaign-queue-manager',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://xmpjqtvznswcdfwtrvpc.supabase.co/functions/v1/campaign-queue-manager',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcGpxdHZ6bnN3Y2Rmd3RydnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDE3MjQsImV4cCI6MjA3MjMxNzcyNH0.fkDoqP1b8UusCA0rHzcvi7KmkzoGrbcHjv3loVZRbBo"}'::jsonb,
      body := '{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Schedule call error recovery to run every 5 minutes
SELECT cron.schedule(
  'call-error-recovery',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://xmpjqtvznswcdfwtrvpc.supabase.co/functions/v1/call-error-recovery',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcGpxdHZ6bnN3Y2Rmd3RydnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDE3MjQsImV4cCI6MjA3MjMxNzcyNH0.fkDoqP1b8UusCA0rHzcvi7KmkzoGrbcHjv3loVZRbBo"}'::jsonb,
      body := '{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Create function to handle call failures with automatic retry scheduling
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
  -- Call the retry handler edge function asynchronously
  PERFORM
    net.http_post(
      url := 'https://xmpjqtvznswcdfwtrvpc.supabase.co/functions/v1/call-retry-handler',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := json_build_object(
        'callRecordId', call_record_id,
        'failureReason', failure_reason,
        'errorMessage', error_message
      )::jsonb
    );
END;
$$;