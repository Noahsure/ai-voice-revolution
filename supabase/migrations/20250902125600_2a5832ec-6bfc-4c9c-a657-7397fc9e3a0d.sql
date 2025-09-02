-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to monitor call engine health every 5 minutes
SELECT cron.schedule(
  'call-engine-health-monitor',
  '*/5 * * * *', -- every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://xmpjqtvznswcdfwtrvpc.supabase.co/functions/v1/call-state-monitor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcGpxdHZ6bnN3Y2Rmd3RydnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDE3MjQsImV4cCI6MjA3MjMxNzcyNH0.fkDoqP1b8UusCA0rHzcvi7KmkzoGrbcHjv3loVZRbBo"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Create cron job to manage call queue every 2 minutes
SELECT cron.schedule(
  'call-queue-manager',
  '*/2 * * * *', -- every 2 minutes
  $$
  SELECT
    net.http_post(
        url:='https://xmpjqtvznswcdfwtrvpc.supabase.co/functions/v1/campaign-queue-manager',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcGpxdHZ6bnN3Y2Rmd3RydnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDE3MjQsImV4cCI6MjA3MjMxNzcyNH0.fkDoqP1b8UusCA0rHzcvi7KmkzoGrbcHjv3loVZRbBo"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Create cron job for error recovery every 10 minutes
SELECT cron.schedule(
  'call-error-recovery',
  '*/10 * * * *', -- every 10 minutes
  $$
  SELECT
    net.http_post(
        url:='https://xmpjqtvznswcdfwtrvpc.supabase.co/functions/v1/call-error-recovery',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtcGpxdHZ6bnN3Y2Rmd3RydnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDE3MjQsImV4cCI6MjA3MjMxNzcyNH0.fkDoqP1b8UusCA0rHzcvi7KmkzoGrbcHjv3loVZRbBo"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);