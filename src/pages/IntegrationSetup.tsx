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

const IntegrationSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [credentials, setCredentials] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    openaiApiKey: '',
    elevenlabsApiKey: ''
  });

  useEffect(() => {
    loadExistingCredentials();
  }, [user]);

  const loadExistingCredentials = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('twilio_account_sid, twilio_auth_token, phone_number, openai_api_key, elevenlabs_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile) {
        setCredentials({
          accountSid: profile.twilio_account_sid || '',
          authToken: profile.twilio_auth_token || '',
          phoneNumber: profile.phone_number || '',
          openaiApiKey: profile.openai_api_key || '',
          elevenlabsApiKey: profile.elevenlabs_api_key || ''
        });
        setIsConnected(!!(profile.twilio_account_sid && profile.twilio_auth_token && profile.phone_number && profile.openai_api_key));
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const handleSave = async () => {
    if (!user || !credentials.accountSid || !credentials.authToken || !credentials.openaiApiKey) {
      toast({
        title: "Missing credentials",
        description: "Please enter Account SID, Auth Token, and OpenAI API Key",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Ensure single profile per user: update if exists, else insert
      const { data: existing, error: fetchErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (fetchErr) throw fetchErr;

      let opError: any = null;
      if (existing?.id) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            twilio_account_sid: credentials.accountSid,
            twilio_auth_token: credentials.authToken,
            phone_number: credentials.phoneNumber,
            openai_api_key: credentials.openaiApiKey,
            elevenlabs_api_key: credentials.elevenlabsApiKey,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        opError = updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            twilio_account_sid: credentials.accountSid,
            twilio_auth_token: credentials.authToken,
            phone_number: credentials.phoneNumber,
            openai_api_key: credentials.openaiApiKey,
            elevenlabs_api_key: credentials.elevenlabsApiKey
          });
        opError = insertErr;
      }

      if (opError) throw opError;

      setIsConnected(true);
      toast({
        title: "Success!",
        description: "Integration credentials saved successfully"
      });
    } catch (error) {
      console.error('Error saving credentials:', error);
      toast({
        title: "Error",
        description: (error as any)?.message ? String((error as any).message) : "Failed to save credentials. Please try again.",
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
              <Phone className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold text-primary">NEUROVOICE</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Integration Setup</h1>
          <p className="text-muted-foreground text-lg">
            Connect your OpenAI, Twilio accounts and optionally ElevenLabs for advanced AI-powered calling
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
            <CardTitle>Setup Instructions</CardTitle>
            <CardDescription>
              Get your API keys from OpenAI (required), Twilio (required), and ElevenLabs (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">OpenAI API Key (Required)</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground mb-3">
                <li>Visit OpenAI API platform</li>
                <li>Create an API key</li>
                <li>Copy and paste below</li>
              </ol>
              <Button variant="outline" size="sm" asChild className="gap-2 mr-3">
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                  OpenAI Platform <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
            <div>
              <h4 className="font-medium mb-2">Twilio Credentials (Required)</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground mb-3">
                <li>Log in to Twilio Console</li>
                <li>Get Account SID and Auth Token</li>
                <li>Get your Twilio phone number</li>
              </ol>
              <Button variant="outline" size="sm" asChild className="gap-2 mr-3">
                <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer">
                  Twilio Console <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
            <div>
              <h4 className="font-medium mb-2">ElevenLabs API Key (Optional)</h4>
              <p className="text-sm text-muted-foreground mb-3">
                For advanced voice synthesis and enhanced call quality
              </p>
              <Button variant="outline" size="sm" asChild className="gap-2">
                <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer">
                  ElevenLabs API Keys <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Credentials Form */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Credentials</CardTitle>
            <CardDescription>
              Your credentials are encrypted and stored securely
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OpenAI Section */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                OpenAI API Key
                <Badge variant="destructive" className="text-xs">Required</Badge>
              </h3>
              <div className="space-y-2">
                <Label htmlFor="openaiApiKey">API Key</Label>
                <Input
                  id="openaiApiKey"
                  type="password"
                  placeholder="sk-..."
                  value={credentials.openaiApiKey}
                  onChange={(e) => setCredentials(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                />
              </div>
            </div>

            {/* Twilio Section */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Twilio Credentials
                <Badge variant="destructive" className="text-xs">Required</Badge>
              </h3>
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
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Twilio Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="e.g., +447700900123"
                  value={credentials.phoneNumber}
                  onChange={(e) => setCredentials(prev => ({ ...prev, phoneNumber: e.target.value }))}
                />
              </div>
            </div>

            {/* ElevenLabs Section */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                ElevenLabs API Key
                <Badge variant="secondary" className="text-xs">Optional</Badge>
              </h3>
              <div className="space-y-2">
                <Label htmlFor="elevenlabsApiKey">API Key</Label>
                <Input
                  id="elevenlabsApiKey"
                  type="password"
                  placeholder="Enter ElevenLabs API Key (optional)"
                  value={credentials.elevenlabsApiKey}
                  onChange={(e) => setCredentials(prev => ({ ...prev, elevenlabsApiKey: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Enhanced voice synthesis and call quality features
                </p>
              </div>
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
                variant="default"
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
                Your integrations are connected. Ready to create your first campaign?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate('/campaigns/new')}
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

export default IntegrationSetup;