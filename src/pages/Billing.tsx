import React, { useEffect } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Crown, Shield, Zap, AlertTriangle, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

const Billing = () => {
  const { 
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
    isTrialExpired
  } = useSubscription();

  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Handle success/cancel from Stripe checkout
    if (searchParams.get('success') === 'true') {
      toast.success('Payment successful! Your subscription is now active.');
      refreshSubscription();
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Payment canceled. You can try again anytime.');
    }
  }, [searchParams, refreshSubscription]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-nexavoice-primary" />
      </div>
    );
  }

  const handleUpgrade = async (planType: string, billingCycle: string) => {
    try {
      await checkoutPlan(planType, billingCycle);
    } catch (error) {
      console.error('Upgrade error:', error);
    }
  };

  const handleManageBilling = async () => {
    try {
      await openCustomerPortal();
    } catch (error) {
      console.error('Portal error:', error);
    }
  };

  const formatCurrency = (amountInPence: number) => {
    return `£${(amountInPence / 100).toFixed(0)}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'premium': return <Crown className="w-5 h-5" />;
      case 'starter': return <Shield className="w-5 h-5" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'premium': return 'bg-gradient-to-r from-yellow-400 to-orange-500';
      case 'starter': return 'bg-gradient-to-r from-blue-400 to-blue-600';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-nexavoice-dark via-nexavoice-darker to-black text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-nexavoice-primary to-nexavoice-accent bg-clip-text text-transparent">
            Subscription & Billing
          </h1>
          <p className="text-xl text-gray-300">
            Manage your NEXAVOICE subscription and monitor your usage
          </p>
        </div>

        {/* Trial Expiration Warning */}
        {isTrialExpired && (
          <Card className="border-red-500 bg-red-500/10">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <div>
                  <h3 className="font-semibold text-red-400">Trial Expired</h3>
                  <p className="text-sm text-gray-300">
                    Your 7-day trial has expired. Subscribe to a paid plan to regain access to your account and continue using NEXAVOICE.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Subscription Status */}
        {subscription && (
          <Card className="bg-nexavoice-dark/50 border-nexavoice-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${getPlanColor(subscription.plan_type)} text-white`}>
                    {getPlanIcon(subscription.plan_type)}
                  </div>
                  <div>
                    <CardTitle className="capitalize text-xl">
                      {subscription.plan_type} Plan
                    </CardTitle>
                    <CardDescription>
                      {subscription.status === 'trialing' ? 'Trial Period' : 'Active Subscription'}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={subscription.status === 'active' || subscription.status === 'trialing' ? 'default' : 'destructive'}>
                  {subscription.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Status</p>
                  <div className="flex items-center space-x-2">
                    {subscription.status === 'active' || subscription.status === 'trialing' ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-400" />
                    )}
                    <span className="capitalize">{subscription.status}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">
                    {subscription.plan_type === 'trial' ? 'Trial Ends' : 'Next Billing'}
                  </p>
                  <p className="font-medium">
                    {formatDate(subscription.trial_end || subscription.current_period_end)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Days Remaining</p>
                  <p className="font-medium text-lg">
                    {subscription.days_left} days
                  </p>
                </div>
              </div>

              {subscription.plan_type !== 'trial' && (
                <div className="pt-4 border-t border-gray-700">
                  <Button 
                    onClick={handleManageBilling}
                    variant="outline"
                    className="w-full"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Manage Billing
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Usage Dashboard */}
        {usage && limits && (
          <Card className="bg-nexavoice-dark/50 border-nexavoice-primary/20">
            <CardHeader>
              <CardTitle>Current Usage</CardTitle>
              <CardDescription>
                Monitor your monthly usage across all features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { key: 'call_minutes', label: 'Call Minutes', current: usage.call_minutes, limit: limits.max_call_minutes },
                  { key: 'agents', label: 'AI Agents', current: usage.agents, limit: limits.max_agents },
                  { key: 'campaigns', label: 'Campaigns', current: usage.campaigns, limit: limits.max_campaigns },
                  { key: 'contacts', label: 'Contacts', current: usage.contacts, limit: limits.max_contacts }
                ].map(({ key, label, current, limit }) => {
                  const percentage = usagePercentages[key] || 0;
                  const isWarning = warnings.includes(key);
                  const isExceeded = exceeded.includes(key);
                  
                  return (
                    <div key={key} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{label}</span>
                        {isExceeded && <AlertTriangle className="w-4 h-4 text-red-400" />}
                        {isWarning && !isExceeded && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{current.toLocaleString()}</span>
                          <span className="text-gray-400">/ {limit.toLocaleString()}</span>
                        </div>
                        <Progress 
                          value={Math.min(percentage, 100)} 
                          className={`h-2 ${isExceeded ? 'bg-red-900' : isWarning ? 'bg-yellow-900' : 'bg-gray-700'}`}
                        />
                        <p className="text-xs text-gray-400">
                          {percentage.toFixed(1)}% used
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plan Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              name: 'Trial',
              type: 'trial',
              monthlyPrice: 0,
              yearlyPrice: 0,
              description: '7-day free trial',
              features: ['1 AI Agent', '1 Campaign', '100 Contacts', '60 Call Minutes', 'Basic Analytics'],
              current: subscription?.plan_type === 'trial'
            },
            {
              name: 'Starter',
              type: 'starter',
              monthlyPrice: 10000,
              yearlyPrice: 9960,
              description: 'Perfect for small businesses',
              features: ['5 AI Agents', '5 Campaigns', '5,000 Contacts', '1,000 Call Minutes', 'Advanced Analytics', 'Priority Support'],
              current: subscription?.plan_type === 'starter',
              popular: true
            },
            {
              name: 'Premium',
              type: 'premium',
              monthlyPrice: 25000,
              yearlyPrice: 24900,
              description: 'For growing teams',
              features: ['25 AI Agents', '25 Campaigns', '50,000 Contacts', '5,000 Call Minutes', 'White Labeling', 'API Access', 'Integrations'],
              current: subscription?.plan_type === 'premium'
            }
          ].map((plan) => (
            <Card 
              key={plan.type} 
              className={`relative bg-nexavoice-dark/50 border-nexavoice-primary/20 ${
                plan.current ? 'ring-2 ring-nexavoice-primary' : ''
              } ${plan.popular ? 'border-nexavoice-accent' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-nexavoice-accent text-black font-semibold">
                    Most Popular
                  </Badge>
                </div>
              )}
              {plan.current && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="default">Current Plan</Badge>
                </div>
              )}
              
              <CardHeader className="text-center space-y-4">
                <div className={`p-3 rounded-lg mx-auto w-fit ${getPlanColor(plan.type)} text-white`}>
                  {getPlanIcon(plan.type)}
                </div>
                <div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </div>
                
                {plan.type !== 'trial' && (
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">
                      {formatCurrency(plan.monthlyPrice)}
                      <span className="text-lg font-normal text-gray-400">/month</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      or {formatCurrency(plan.yearlyPrice)}/month billed annually
                      <span className="text-nexavoice-accent font-medium"> (Save 17%)</span>
                    </div>
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <CheckCircle className="w-4 h-4 text-nexavoice-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {!plan.current && plan.type !== 'trial' && (
                  <div className="space-y-3">
                    <Button 
                      onClick={() => handleUpgrade(plan.type, 'monthly')}
                      className="w-full"
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      Upgrade to {plan.name} (Monthly)
                    </Button>
                    <Button 
                      onClick={() => handleUpgrade(plan.type, 'yearly')}
                      className="w-full"
                      variant="outline"
                    >
                      Upgrade to {plan.name} (Yearly - Save 17%)
                    </Button>
                  </div>
                )}
                
                {plan.current && plan.type !== 'trial' && (
                  <Button 
                    onClick={handleManageBilling}
                    className="w-full"
                    variant="outline"
                  >
                    Manage Subscription
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trial Warning */}
        {subscription?.plan_type === 'trial' && subscription?.days_left <= 3 && !isTrialExpired && (
          <Card className="border-nexavoice-accent bg-nexavoice-accent/10">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Clock className="w-6 h-6 text-nexavoice-accent" />
                <div>
                  <h3 className="font-semibold text-nexavoice-accent">Trial Ending Soon</h3>
                  <p className="text-sm text-gray-300">
                    Your trial ends in {subscription.days_left} days. Subscribe now to keep your agents, campaigns, and data.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Billing;