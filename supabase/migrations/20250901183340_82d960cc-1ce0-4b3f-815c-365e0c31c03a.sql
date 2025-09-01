-- Create call_records table for tracking all voice calls
CREATE TABLE public.call_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  twilio_call_sid TEXT UNIQUE,
  phone_number TEXT NOT NULL,
  call_status TEXT DEFAULT 'initiated' CHECK (call_status IN ('initiated', 'ringing', 'in_progress', 'completed', 'failed', 'no_answer', 'busy')),
  call_direction TEXT DEFAULT 'outbound' CHECK (call_direction IN ('outbound', 'inbound')),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  recording_url TEXT,
  transcript TEXT,
  call_outcome TEXT CHECK (call_outcome IN ('hot_lead', 'warm_lead', 'cold_lead', 'appointment', 'sale', 'complaint', 'no_answer')),
  sentiment_score DECIMAL(3,2), -- -1.00 to 1.00
  ai_summary TEXT,
  cost_cents INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.call_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for call_records
CREATE POLICY "Users can view their own call records" 
ON public.call_records 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own call records" 
ON public.call_records 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call records" 
ON public.call_records 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own call records" 
ON public.call_records 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_call_records_updated_at
BEFORE UPDATE ON public.call_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_call_records_user_id ON public.call_records(user_id);
CREATE INDEX idx_call_records_campaign_id ON public.call_records(campaign_id);
CREATE INDEX idx_call_records_contact_id ON public.call_records(contact_id);
CREATE INDEX idx_call_records_call_status ON public.call_records(call_status);
CREATE INDEX idx_call_records_created_at ON public.call_records(created_at);
CREATE INDEX idx_call_records_twilio_call_sid ON public.call_records(twilio_call_sid);