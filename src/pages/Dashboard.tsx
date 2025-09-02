import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Users, BarChart3, Settings, Plus, Bot, Zap, CreditCard, Clock, AlertTriangle, Mic, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TrialBanner } from '@/components/TrialBanner';
import { Loader2 } from 'lucide-react';
import VoiceTestingPanel from '@/components/VoiceTestingPanel';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { subscription, usage, limits, usagePercentages, loading } = useSubscription();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-nexavoice-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-8 h-8 text-nexavoice-primary" />
            <span className="text-2xl font-black nexavoice-text-gradient">NEXAVOICE</span>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/billing')}
              className="gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Billing
            </Button>
            <span className="text-sm text-muted-foreground">
              Welcome back, {user?.user_metadata?.full_name || user?.email}
            </span>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Trial Banner */}
        <TrialBanner />

        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">AI Voice Calling Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Launch your first campaign in under 3 minutes
          </p>
          {subscription && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={subscription.plan_type === 'trial' ? 'outline' : 'default'}>
                {subscription.plan_type === 'trial' ? 'Free Trial' : `${subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1)} Plan`}
              </Badge>
              {subscription.plan_type === 'trial' && (
                <span className="text-sm text-muted-foreground">
                  {subscription.days_left} days remaining
                </span>
              )}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Campaigns</CardDescription>
              <CardTitle className="text-3xl nexavoice-text-gradient">
                {usage?.campaigns || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Call Minutes Used</CardDescription>
              <CardTitle className="text-3xl nexavoice-text-gradient">
                {usage?.call_minutes || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>AI Agents</CardDescription>
              <CardTitle className="text-3xl nexavoice-text-gradient">
                {usage?.agents || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                {subscription?.plan_type === 'trial' ? 'Trial Days Left' : 'Contacts'}
              </CardDescription>
              <CardTitle className="text-3xl nexavoice-text-gradient">
                {subscription?.plan_type === 'trial' ? subscription.days_left : (usage?.contacts || 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Usage Overview */}
        {usage && limits && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Usage Overview</CardTitle>
              <CardDescription>Monitor your current usage across all features</CardDescription>
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
                  const isWarning = percentage >= 80;
                  const isExceeded = percentage >= 100;
                  
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Choose AI Agent
                <div className="ml-auto">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-100 to-green-200 text-green-800">
                    <Zap className="w-3 h-3" />
                    Popular
                  </span>
                </div>
              </CardTitle>
              <CardDescription>
                Select from 50+ pre-built AI agents or create your own
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="hero" 
                className="w-full"
                onClick={() => navigate('/agents')}
              >
                Browse AI Agents
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Your First Campaign
              </CardTitle>
              <CardDescription>
                Upload contacts, select an AI agent, and launch in minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/campaigns')}
              >
                Start New Campaign
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Setup Twilio Integration
              </CardTitle>
              <CardDescription>
                Connect your Twilio account to start making calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/twilio-setup')}
              >
                Connect Twilio
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Upload Contacts
              </CardTitle>
              <CardDescription>
                Import your contact list from CSV or Excel files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/contacts')}
              >
                Import Contacts
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card className="luxury-hover sophisticated-scale">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-nexavoice-accent" />
                Analytics
              </CardTitle>
              <CardDescription>
                Real-time call monitoring and performance insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full luxury-hover"
                onClick={() => navigate('/analytics')}
              >
                View Analytics
              </Button>
            </CardContent>
          </Card>

          <Card className="luxury-hover sophisticated-scale">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-nexavoice-primary" />
                Live Calls
              </CardTitle>
              <CardDescription>
                Monitor active calls and view transcripts in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full luxury-hover"
                onClick={() => navigate('/live-monitoring')}
              >
                Monitor Calls
              </Button>
            </CardContent>
          </Card>

          <Card className="luxury-hover sophisticated-scale">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-nexavoice-secondary" />
                Billing & Usage
              </CardTitle>
              <CardDescription>
                Manage subscription and view usage details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full luxury-hover"
                onClick={() => navigate('/billing')}
              >
                Manage Billing
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Voice System Testing */}
        <Card className="mt-8 luxury-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-nexavoice-primary" />
              Voice System Testing
            </CardTitle>
            <CardDescription>
              Test speech synthesis and recognition functionality to ensure optimal call quality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">System Status</TabsTrigger>
                <TabsTrigger value="testing">Voice Testing</TabsTrigger>
                <TabsTrigger value="analytics">Real-Time Analytics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center p-3 rounded-lg border luxury-hover refined-pulse">
                    <div className="text-green-600 font-semibold">✓ ElevenLabs TTS</div>
                    <div className="text-muted-foreground">Connected</div>
                  </div>
                  <div className="text-center p-3 rounded-lg border luxury-hover">
                    <div className="text-green-600 font-semibold">✓ OpenAI Whisper</div>
                    <div className="text-muted-foreground">Ready</div>
                  </div>
                  <div className="text-center p-3 rounded-lg border luxury-hover">
                    <div className="text-green-600 font-semibold">✓ Twilio Integration</div>
                    <div className="text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center p-3 rounded-lg border luxury-hover">
                    <div className="text-blue-600 font-semibold">○ AI Conversations</div>
                    <div className="text-muted-foreground">Enhanced</div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="testing">
                <VoiceTestingPanel />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Real-Time Voice Analytics</h3>
                  <p className="text-muted-foreground mb-4">
                    Advanced voice quality monitoring and performance analytics
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/analytics')}
                    className="luxury-hover"
                  >
                    View Full Analytics Dashboard
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;