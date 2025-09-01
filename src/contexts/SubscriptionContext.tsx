import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface SubscriptionData {
  subscribed: boolean;
  plan_type: 'trial' | 'starter' | 'premium';
  status: string;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  days_left: number;
}

interface UsageData {
  call_minutes: number;
  agents: number;
  campaigns: number;
  contacts: number;
}

interface PlanLimits {
  max_call_minutes: number;
  max_agents: number;
  max_campaigns: number;
  max_contacts: number;
  price_monthly_gbp: number;
  price_yearly_gbp: number;
  features: any;
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  usage: UsageData | null;
  limits: PlanLimits | null;
  usagePercentages: Record<string, number>;
  warnings: string[];
  exceeded: string[];
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  checkoutPlan: (planType: string, billingCycle: string) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  trackUsage: (usageType: string, amount: number) => Promise<void>;
  canUseFeature: (feature: string) => boolean;
  isTrialExpired: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [usagePercentages, setUsagePercentages] = useState<Record<string, number>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [exceeded, setExceeded] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSubscription = async () => {
    if (!user || !session) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) throw error;
      setSubscription(data);

      // Get plan limits
      const { data: planLimits } = await supabase
        .from('plan_limits')
        .select('*')
        .eq('plan_type', data.plan_type)
        .single();

      setLimits(planLimits);

      // Get current usage
      const now = new Date();
      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const { data: usageData } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .eq('month_year', monthYear)
        .single();

      if (usageData && planLimits) {
        const currentUsage = {
          call_minutes: usageData.call_minutes_used || 0,
          agents: usageData.agents_created || 0,
          campaigns: usageData.campaigns_active || 0,
          contacts: usageData.contacts_uploaded || 0
        };
        setUsage(currentUsage);

        // Calculate usage percentages
        const percentages = {
          call_minutes: (currentUsage.call_minutes / planLimits.max_call_minutes) * 100,
          agents: (currentUsage.agents / planLimits.max_agents) * 100,
          campaigns: (currentUsage.campaigns / planLimits.max_campaigns) * 100,
          contacts: (currentUsage.contacts / planLimits.max_contacts) * 100
        };
        setUsagePercentages(percentages);

        // Check for warnings and exceeded limits
        const newWarnings: string[] = [];
        const newExceeded: string[] = [];

        Object.entries(percentages).forEach(([key, percentage]) => {
          if (percentage >= 100) {
            newExceeded.push(key);
          } else if (percentage >= 80) {
            newWarnings.push(key);
          }
        });

        setWarnings(newWarnings);
        setExceeded(newExceeded);
      } else {
        setUsage({ call_minutes: 0, agents: 0, campaigns: 0, contacts: 0 });
        setUsagePercentages({});
        setWarnings([]);
        setExceeded([]);
      }

    } catch (error) {
      console.error('Error refreshing subscription:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const checkoutPlan = async (planType: string, billingCycle: string) => {
    if (!session) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planType, billingCycle },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) throw error;
      
      // Open Stripe checkout in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to start checkout process');
      throw error;
    }
  };

  const openCustomerPortal = async () => {
    if (!session) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) throw error;
      
      // Open Stripe customer portal in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open billing portal');
      throw error;
    }
  };

  const trackUsage = async (usageType: string, amount: number) => {
    if (!session) return;

    try {
      const { data, error } = await supabase.functions.invoke('track-usage', {
        body: { usageType, amount },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      if (error) throw error;

      // Update local state with new usage data
      if (data.usage) setUsage(data.usage);
      if (data.usagePercentages) setUsagePercentages(data.usagePercentages);
      if (data.warnings) setWarnings(data.warnings);
      if (data.exceeded) setExceeded(data.exceeded);

      // Show warnings if approaching limits
      if (data.warnings?.length > 0) {
        toast.warning(`Approaching usage limits for: ${data.warnings.join(', ')}`);
      }

      // Show errors if limits exceeded
      if (data.exceeded?.length > 0) {
        toast.error(`Usage limits exceeded for: ${data.exceeded.join(', ')}. Please upgrade your plan.`);
      }

    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  };

  const canUseFeature = (feature: string): boolean => {
    if (!subscription || !limits) return false;
    
    // Trial expired users can't use any features
    if (subscription.plan_type === 'trial' && subscription.status === 'expired') {
      return false;
    }

    // Check specific feature limits
    switch (feature) {
      case 'create_agent':
        return (usage?.agents || 0) < limits.max_agents;
      case 'create_campaign':
        return (usage?.campaigns || 0) < limits.max_campaigns;
      case 'upload_contacts':
        return (usage?.contacts || 0) < limits.max_contacts;
      case 'make_calls':
        return (usage?.call_minutes || 0) < limits.max_call_minutes;
      default:
        return true;
    }
  };

  const isTrialExpired = subscription?.plan_type === 'trial' && subscription?.status === 'expired';

  useEffect(() => {
    if (user && session) {
      refreshSubscription();
    } else {
      setLoading(false);
    }
  }, [user, session]);

  // Auto-refresh subscription every 30 seconds if on billing page
  useEffect(() => {
    if (!user || !session) return;

    let interval: NodeJS.Timeout;
    if (window.location.pathname === '/billing') {
      interval = setInterval(refreshSubscription, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, session]);

  const value = {
    subscription,
    usage,
    limits,
    usagePercentages,
    warnings,
    exceeded,
    loading,
    refreshSubscription,
    checkoutPlan,
    openCustomerPortal,
    trackUsage,
    canUseFeature,
    isTrialExpired
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}