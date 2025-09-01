import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UsageLimitGuardProps {
  feature: string;
  children: React.ReactNode;
  onUpgrade?: () => void;
}

export const UsageLimitGuard: React.FC<UsageLimitGuardProps> = ({ 
  feature, 
  children, 
  onUpgrade 
}) => {
  const { canUseFeature, subscription, limits, usage } = useSubscription();

  if (!subscription || !limits || !usage) return <>{children}</>;

  const canUse = canUseFeature(feature);

  if (!canUse) {
    const getFeatureDetails = () => {
      switch (feature) {
        case 'create_agent':
          return {
            title: 'Agent Limit Reached',
            message: `You've reached your limit of ${limits.max_agents} AI agents.`,
            current: usage.agents,
            limit: limits.max_agents
          };
        case 'create_campaign':
          return {
            title: 'Campaign Limit Reached',
            message: `You've reached your limit of ${limits.max_campaigns} campaigns.`,
            current: usage.campaigns,
            limit: limits.max_campaigns
          };
        case 'upload_contacts':
          return {
            title: 'Contact Limit Reached',
            message: `You've reached your limit of ${limits.max_contacts} contacts.`,
            current: usage.contacts,
            limit: limits.max_contacts
          };
        case 'make_calls':
          return {
            title: 'Call Minutes Exhausted',
            message: `You've used all ${limits.max_call_minutes} minutes for this month.`,
            current: usage.call_minutes,
            limit: limits.max_call_minutes
          };
        default:
          return {
            title: 'Feature Limit Reached',
            message: 'You\'ve reached your plan limit for this feature.',
            current: 0,
            limit: 0
          };
      }
    };

    const details = getFeatureDetails();

    return (
      <Card className="border-nexavoice-accent bg-nexavoice-accent/10">
        <CardContent className="p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-nexavoice-accent/20">
              <AlertTriangle className="w-6 h-6 text-nexavoice-accent" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-nexavoice-accent">
              {details.title}
            </h3>
            <p className="text-gray-300">
              {details.message}
            </p>
            {details.current > 0 && (
              <p className="text-sm text-gray-400">
                Current usage: {details.current.toLocaleString()} / {details.limit.toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onUpgrade ? (
              <Button onClick={onUpgrade} className="space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Upgrade Plan</span>
              </Button>
            ) : (
              <Button asChild className="space-x-2">
                <Link to="/billing">
                  <TrendingUp className="w-4 h-4" />
                  <span>Upgrade Plan</span>
                </Link>
              </Button>
            )}
            
            <Button variant="outline" asChild>
              <Link to="/billing">View Usage</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};