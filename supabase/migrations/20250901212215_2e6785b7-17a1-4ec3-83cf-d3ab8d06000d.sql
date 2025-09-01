-- Critical performance indexes
CREATE INDEX IF NOT EXISTS idx_contacts_campaign_status ON public.contacts(campaign_id, call_status);
CREATE INDEX IF NOT EXISTS idx_call_records_user_campaign ON public.call_records(user_id, campaign_id, start_time);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_status ON public.campaigns(user_id, status);
-- Speed up webhook lookup by Twilio SID
CREATE INDEX IF NOT EXISTS idx_call_records_twilio_sid ON public.call_records(twilio_call_sid);
