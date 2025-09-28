import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Phone, 
  Users, 
  Rocket, 
  CheckCircle, 
  ArrowRight,
  Play,
  Volume2,
  Upload
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AuthForm } from '@/components/auth/AuthForm';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  optional?: boolean;
}

interface Agent {
  id: string;
  name: string;
  purpose: string;
  opening_message: string;
  success_rate: number;
}

const StreamlinedOnboarding = () => {
  const { user, signUp, signIn } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  const [demoAgent, setDemoAgent] = useState<Agent | null>(null);
  const [onboardingData, setOnboardingData] = useState({
    companyName: '',
    industry: '',
    phone: '',
    goals: ''
  });

  const steps: OnboardingStep[] = [
    {
      id: 'auth',
      title: 'Create Your Account',
      description: 'Get started with your free trial',
      completed: !!user
    },
    {
      id: 'profile',
      title: 'Quick Setup',
      description: 'Tell us about your business',
      completed: false
    },
    {
      id: 'demo',
      title: 'See It In Action',
      description: 'Experience your first AI call',
      completed: false
    },
    {
      id: 'launch',
      title: 'Ready to Launch',
      description: 'Start your first campaign',
      completed: false
    }
  ];

  useEffect(() => {
    if (user) {
      setStep(1);
      fetchDemoAgent();
    }
  }, [user]);

  const fetchDemoAgent = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('type', 'preset')
        .eq('is_active', true)
        .order('success_rate', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setDemoAgent(data);
    } catch (error) {
      console.error('Error fetching demo agent:', error);
    }
  };

  const updateProfile = async () => {
    if (!onboardingData.companyName) {
      toast({
        title: "Company name required",
        description: "Please enter your company name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: onboardingData.companyName,
          company_name: onboardingData.companyName,
          phone_number: onboardingData.phone
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Let's see what our AI can do!",
      });

      setStep(2);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const playDemoCall = async () => {
    if (!demoAgent) return;

    try {
      toast({
        title: "🎯 Demo Call Starting",
        description: "Listen to your AI agent in action...",
      });

      const demoScript = `Hello! This is ${demoAgent.name}, your AI sales assistant. I'm calling to tell you about an exciting opportunity that could transform your business. Our advanced AI calling system has helped companies like yours increase their sales by 300% while reducing costs by 50%. Would you like to hear how we can help your business grow?`;

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: demoScript,
          voice_id: 'EXAVITQu4vr4xnSDxMaL',
          model: 'eleven_multilingual_v2'
        }
      });

      if (error) throw error;

      if (data?.audioContent) {
        const audioBlob = new Blob([
          Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))
        ], { type: 'audio/mpeg' });
        
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.play();
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          toast({
            title: "🚀 Amazing, right?",
            description: "Ready to launch your first campaign?",
          });
          setStep(3);
        };
      }
    } catch (error) {
      console.error('Error playing demo:', error);
      toast({
        title: "Demo failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const completeOnboarding = () => {
    toast({
      title: "🎉 Welcome aboard!",
      description: "You're ready to launch your first AI campaign",
    });
    
    // Redirect to dashboard or campaign creation
    window.location.href = '/dashboard';
  };

  const renderAuthStep = () => (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to NeuroVoice</CardTitle>
          <p className="text-muted-foreground">
            Launch AI sales campaigns in under 3 minutes
          </p>
        </CardHeader>
        <CardContent>
          <AuthForm />
          <div className="mt-6 text-center">
            <div className="text-sm text-muted-foreground">
              ✅ 7-day free trial • ✅ No credit card required • ✅ Setup in 3 clicks
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderProfileStep = () => (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Quick Setup</CardTitle>
          <p className="text-muted-foreground">
            Just the basics to get you started
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              placeholder="Company Name *"
              value={onboardingData.companyName}
              onChange={(e) => setOnboardingData(prev => ({
                ...prev,
                companyName: e.target.value
              }))}
              className="text-lg"
              autoFocus
            />
          </div>
          
          <div>
            <Input
              placeholder="Your Phone Number (optional)"
              value={onboardingData.phone}
              onChange={(e) => setOnboardingData(prev => ({
                ...prev,
                phone: e.target.value
              }))}
            />
          </div>

          <Button 
            onClick={updateProfile} 
            disabled={loading} 
            className="w-full"
          >
            {loading ? 'Setting up...' : 'Continue to Demo'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderDemoStep = () => (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Volume2 className="w-6 h-6" />
            Experience Your AI Agent
          </CardTitle>
          <p className="text-muted-foreground">
            Listen to how your AI sounds to customers
          </p>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {demoAgent && (
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4">
              <h3 className="font-semibold text-lg">{demoAgent.name}</h3>
              <p className="text-muted-foreground">{demoAgent.purpose}</p>
              <Badge className="mt-2">
                {Math.round(demoAgent.success_rate)}% success rate
              </Badge>
            </div>
          )}

          <Button 
            onClick={playDemoCall}
            size="lg"
            className="w-full text-lg py-6"
          >
            <Play className="w-5 h-5 mr-2" />
            🎧 Play Demo Call
          </Button>

          <p className="text-sm text-muted-foreground">
            This 30-second demo shows exactly how your AI will sound to prospects
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderLaunchStep = () => (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Rocket className="w-6 h-6" />
            Ready to Launch!
          </CardTitle>
          <p className="text-muted-foreground">
            You're all set to start your first AI campaign
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="text-sm">
                <div className="font-semibold">AI Agent</div>
                <div className="text-muted-foreground">Ready</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div className="text-sm">
                <div className="font-semibold">Upload CSV</div>
                <div className="text-muted-foreground">Next Step</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <div className="text-sm">
                <div className="font-semibold">Start Calling</div>
                <div className="text-muted-foreground">Go Live!</div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800">Free Trial Active</span>
            </div>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• 50 free calls included</li>
              <li>• All features unlocked</li>
              <li>• No credit card required</li>
            </ul>
          </div>

          <Button 
            onClick={completeOnboarding}
            size="lg"
            className="w-full text-lg py-6 bg-gradient-to-r from-primary to-primary-glow"
          >
            🚀 Launch My First Campaign
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 0: return renderAuthStep();
      case 1: return renderProfileStep();
      case 2: return renderDemoStep();
      case 3: return renderLaunchStep();
      default: return renderAuthStep();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Progress Header */}
      <div className="bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Get Started</h1>
            <Badge variant="outline">
              Step {step + 1} of {steps.length}
            </Badge>
          </div>
          
          <Progress value={(step / (steps.length - 1)) * 100} className="h-2" />
          
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            {steps.map((s, index) => (
              <span key={s.id} className={index <= step ? 'text-primary font-medium' : ''}>
                {s.title}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {renderCurrentStep()}
      </div>
    </div>
  );
};

export default StreamlinedOnboarding;