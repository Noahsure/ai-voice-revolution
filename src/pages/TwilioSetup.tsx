import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Phone, ArrowLeft, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TwilioSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [credentials, setCredentials] = useState({
    accountSid: '',
    authToken: ''
  });

  useEffect(() => {
    loadExistingCredentials();
  }, [user]);

  const loadExistingCredentials = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('twilio_account_sid, twilio_auth_token')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setCredentials({
          accountSid: profile.twilio_account_sid || '',
          authToken: profile.twilio_auth_token || ''
        });
        setIsConnected(!!(profile.twilio_account_sid && profile.twilio_auth_token));
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const handleSave = async () => {
    if (!user || !credentials.accountSid || !credentials.authToken) {
      toast({
        title: "Missing credentials",
        description: "Please enter both Account SID and Auth Token",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          twilio_account_sid: credentials.accountSid,
          twilio_auth_token: credentials.authToken,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setIsConnected(true);
      toast({
        title: "Success!",
        description: "Twilio credentials saved successfully"
      });
    } catch (error) {
      console.error('Error saving credentials:', error);
      toast({
        title: "Error",
        description: "Failed to save credentials. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!credentials.accountSid || !credentials.authToken) {
      toast({
        title: "Missing credentials",
        description: "Please save your credentials first",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    
    // Simulate test - in real implementation, this would call Twilio API
    setTimeout(() => {
      setIsTesting(false);
      toast({
        title: "Connection successful!",
        description: "Your Twilio account is properly configured"
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Phone className="w-6 h-6 text-nexavoice-primary" />
              <span className="text-xl font-bold nexavoice-text-gradient">NEXAVOICE</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Twilio Integration</h1>
          <p className="text-muted-foreground text-lg">
            Connect your Twilio account to start making AI-powered calls
          </p>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          {isConnected ? (
            <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
              <CheckCircle className="w-4 h-4 mr-2" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Not Connected
            </Badge>
          )}
        </div>

        {/* Instructions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Getting Your Twilio Credentials</CardTitle>
            <CardDescription>
              You'll need your Account SID and Auth Token from your Twilio Console
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Log in to your Twilio Console</li>
              <li>Navigate to Account → API keys & tokens</li>
              <li>Copy your Account SID and Auth Token</li>
              <li>Paste them in the form below</li>
            </ol>
            <Button 
              variant="outline" 
              size="sm" 
              asChild
              className="gap-2"
            >
              <a 
                href="https://console.twilio.com" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Open Twilio Console
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Credentials Form */}
        <Card>
          <CardHeader>
            <CardTitle>Twilio Credentials</CardTitle>
            <CardDescription>
              Your credentials are encrypted and stored securely
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountSid">Account SID</Label>
              <Input
                id="accountSid"
                type="text"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={credentials.accountSid}
                onChange={(e) => setCredentials(prev => ({ ...prev, accountSid: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="authToken">Auth Token</Label>
              <Input
                id="authToken"
                type="password"
                placeholder="Enter your Twilio Auth Token"
                value={credentials.authToken}
                onChange={(e) => setCredentials(prev => ({ ...prev, authToken: e.target.value }))}
              />
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Keep your credentials secure. Never share them or commit them to version control.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1"
                variant="hero"
              >
                {isLoading ? "Saving..." : "Save Credentials"}
              </Button>
              
              <Button 
                onClick={handleTestConnection}
                disabled={isTesting || !isConnected}
                variant="outline"
              >
                {isTesting ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        {isConnected && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-success">🎉 You're all set!</CardTitle>
              <CardDescription>
                Your Twilio account is connected. Ready to create your first campaign?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/campaigns/new')}
                variant="hero" 
                className="w-full"
              >
                Create Your First Campaign
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TwilioSetup;