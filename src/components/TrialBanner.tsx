import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TrialBanner = () => {
  const { subscription, isTrialExpired } = useSubscription();

  if (!subscription || subscription.plan_type !== 'trial') return null;

  if (isTrialExpired) {
    return (
      <Card className="border-red-500 bg-red-500/10 mx-6 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-400">Trial Expired</h3>
                <p className="text-sm text-gray-300">
                  Your 7-day trial has expired. Subscribe now to regain access to your account.
                </p>
              </div>
            </div>
            <Button asChild variant="destructive">
              <Link to="/billing">Subscribe Now</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (subscription.days_left <= 3) {
    return (
      <Card className="border-nexavoice-accent bg-nexavoice-accent/10 mx-6 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-nexavoice-accent flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-nexavoice-accent">Trial Ending Soon</h3>
                <p className="text-sm text-gray-300">
                  Your trial ends in {subscription.days_left} days. Subscribe to keep your data and continue using NEUROVOICE.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to="/billing">Upgrade Now</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};