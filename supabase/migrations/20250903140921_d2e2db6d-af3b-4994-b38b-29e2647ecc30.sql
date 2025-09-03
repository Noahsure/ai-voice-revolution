-- Create conversation logs table for tracking AI conversations
CREATE TABLE public.conversation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_record_id uuid REFERENCES call_records(id) ON DELETE CASCADE,
  speaker text CHECK (speaker IN ('agent', 'customer')),
  message text NOT NULL,
  timestamp timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own conversation logs" 
ON public.conversation_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversation logs" 
ON public.conversation_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation logs" 
ON public.conversation_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation logs" 
ON public.conversation_logs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_conversation_logs_call_record ON conversation_logs(call_record_id);
CREATE INDEX idx_conversation_logs_timestamp ON conversation_logs(timestamp DESC);