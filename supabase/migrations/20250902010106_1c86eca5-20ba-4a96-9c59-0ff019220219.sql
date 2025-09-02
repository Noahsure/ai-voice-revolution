-- Add call state management columns to call_records table
ALTER TABLE call_records 
ADD COLUMN retry_count integer DEFAULT 0,
ADD COLUMN error_message text,
ADD COLUMN next_retry_at timestamp with time zone,
ADD COLUMN failure_reason text,
ADD COLUMN last_error_at timestamp with time zone;

-- Create call queue management table
CREATE TABLE call_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  agent_id uuid,
  priority integer DEFAULT 1,
  scheduled_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  processing_started_at timestamp with time zone,
  completed_at timestamp with time zone
);

-- Create call monitoring table for health checks
CREATE TABLE call_monitoring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  call_record_id uuid,
  twilio_call_sid text,
  status text NOT NULL,
  health_score numeric DEFAULT 100,
  last_heartbeat timestamp with time zone DEFAULT now(),
  timeout_threshold interval DEFAULT '5 minutes',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE call_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_monitoring ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for call_queue
CREATE POLICY "Users can view their own call queue" 
ON call_queue FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own call queue entries" 
ON call_queue FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call queue entries" 
ON call_queue FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own call queue entries" 
ON call_queue FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for call_monitoring
CREATE POLICY "Users can view their own call monitoring" 
ON call_monitoring FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own call monitoring entries" 
ON call_monitoring FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call monitoring entries" 
ON call_monitoring FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own call monitoring entries" 
ON call_monitoring FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_call_queue_status_scheduled ON call_queue(status, scheduled_at);
CREATE INDEX idx_call_queue_campaign ON call_queue(campaign_id);
CREATE INDEX idx_call_queue_user_status ON call_queue(user_id, status);
CREATE INDEX idx_call_monitoring_heartbeat ON call_monitoring(last_heartbeat);
CREATE INDEX idx_call_records_retry ON call_records(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- Create trigger for updating timestamps
CREATE TRIGGER update_call_queue_updated_at
BEFORE UPDATE ON call_queue
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_monitoring_updated_at
BEFORE UPDATE ON call_monitoring
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create function for exponential backoff calculation
CREATE OR REPLACE FUNCTION calculate_next_retry(retry_count integer)
RETURNS timestamp with time zone
LANGUAGE plpgsql
AS $$
BEGIN
  -- Exponential backoff: 1min, 2min, 4min, 8min, 16min, max 30min
  RETURN now() + (LEAST(POWER(2, retry_count), 30) || ' minutes')::interval;
END;
$$;