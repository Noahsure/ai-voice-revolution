-- Create campaign analytics table for tracking detailed metrics
CREATE TABLE public.campaign_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  date date NOT NULL,
  calls_attempted integer DEFAULT 0,
  calls_connected integer DEFAULT 0,
  calls_completed integer DEFAULT 0,
  total_talk_time interval DEFAULT '0 seconds',
  hot_leads integer DEFAULT 0,
  warm_leads integer DEFAULT 0,
  cold_leads integer DEFAULT 0,
  appointments_booked integer DEFAULT 0,
  sales_closed integer DEFAULT 0,
  cost_total_cents integer DEFAULT 0,
  conversion_rate decimal(5,2) DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(campaign_id, date)
);

-- Enable RLS on campaign analytics
ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaign analytics
CREATE POLICY "Users can view their own campaign analytics" 
ON public.campaign_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaign analytics" 
ON public.campaign_analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaign analytics" 
ON public.campaign_analytics 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaign analytics" 
ON public.campaign_analytics 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_campaign_analytics_campaign_date ON public.campaign_analytics(campaign_id, date);
CREATE INDEX idx_campaign_analytics_user_date ON public.campaign_analytics(user_id, date);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_campaign_analytics_updated_at
BEFORE UPDATE ON public.campaign_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create call quality scores table for quality control
CREATE TABLE public.call_quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  call_record_id uuid REFERENCES public.call_records(id) ON DELETE CASCADE,
  overall_score decimal(3,2) DEFAULT 0, -- 0-10 score
  script_adherence_score decimal(3,2) DEFAULT 0,
  tone_score decimal(3,2) DEFAULT 0,
  engagement_score decimal(3,2) DEFAULT 0,
  compliance_score decimal(3,2) DEFAULT 0,
  quality_flags jsonb DEFAULT '[]'::jsonb,
  feedback_notes text,
  reviewed_by text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on call quality scores
ALTER TABLE public.call_quality_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for call quality scores
CREATE POLICY "Users can view their own call quality scores" 
ON public.call_quality_scores 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own call quality scores" 
ON public.call_quality_scores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call quality scores" 
ON public.call_quality_scores 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own call quality scores" 
ON public.call_quality_scores 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create agent performance tracking table
CREATE TABLE public.agent_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_calls integer DEFAULT 0,
  successful_calls integer DEFAULT 0,
  average_call_duration interval DEFAULT '0 seconds',
  conversion_rate decimal(5,2) DEFAULT 0,
  quality_score decimal(3,2) DEFAULT 0,
  cost_per_lead_cents integer DEFAULT 0,
  revenue_generated_cents integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(agent_id, date)
);

-- Enable RLS on agent performance
ALTER TABLE public.agent_performance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for agent performance
CREATE POLICY "Users can view their own agent performance" 
ON public.agent_performance 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agent performance" 
ON public.agent_performance 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent performance" 
ON public.agent_performance 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent performance" 
ON public.agent_performance 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for agent performance timestamps
CREATE TRIGGER update_agent_performance_updated_at
BEFORE UPDATE ON public.agent_performance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();