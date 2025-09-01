-- Create subscriptions table for billing management
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(user_id) UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan_type TEXT NOT NULL DEFAULT 'trial' CHECK (plan_type IN ('trial', 'starter', 'premium')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create usage_tracking table for monitoring plan limits
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(user_id) NOT NULL,
  month_year TEXT NOT NULL, -- 'YYYY-MM' format
  call_minutes_used INTEGER DEFAULT 0,
  agents_created INTEGER DEFAULT 0,
  campaigns_active INTEGER DEFAULT 0,
  contacts_uploaded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Enable RLS on usage_tracking
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for usage_tracking
CREATE POLICY "Users can view their own usage" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" ON public.usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" ON public.usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for subscriptions table
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_updated_at();

-- Create trigger for usage_tracking table
CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create plan limits reference data
CREATE TABLE public.plan_limits (
  plan_type TEXT PRIMARY KEY CHECK (plan_type IN ('trial', 'starter', 'premium')),
  max_call_minutes INTEGER NOT NULL,
  max_agents INTEGER NOT NULL,
  max_campaigns INTEGER NOT NULL,
  max_contacts INTEGER NOT NULL,
  price_monthly_gbp INTEGER NOT NULL, -- in pence
  price_yearly_gbp INTEGER NOT NULL, -- in pence (with 17% discount)
  features JSONB DEFAULT '{}'::jsonb
);

-- Insert plan limits data
INSERT INTO public.plan_limits (plan_type, max_call_minutes, max_agents, max_campaigns, max_contacts, price_monthly_gbp, price_yearly_gbp, features) VALUES
('trial', 60, 1, 1, 100, 0, 0, '{"ai_agents": true, "basic_analytics": true, "email_support": true}'::jsonb),
('starter', 1000, 5, 5, 5000, 10000, 9960, '{"ai_agents": true, "advanced_analytics": true, "priority_support": true, "custom_voices": true}'::jsonb), -- £100/month, £99.60/month yearly (17% discount)
('premium', 5000, 25, 25, 50000, 25000, 24900, '{"ai_agents": true, "advanced_analytics": true, "priority_support": true, "custom_voices": true, "white_labeling": true, "api_access": true, "integrations": true}'::jsonb); -- £250/month, £249/month yearly (17% discount)

-- Make plan_limits readable by all authenticated users
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan limits" ON public.plan_limits
  FOR SELECT USING (true);