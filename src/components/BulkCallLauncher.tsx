import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Phone, Play, Pause, AlertCircle, CheckCircle, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizePhoneNumber, validateE164PhoneNumber } from "@/lib/phoneUtils";

interface Agent {
  id: string;
  name: string;
  purpose: string;
  language: string;
  success_rate: number;
}

interface CallResult {
  phoneNumber: string;
  status: 'pending' | 'initiated' | 'failed';
  callId?: string;
  error?: string;
}

const BulkCallLauncher: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [callResults, setCallResults] = useState<CallResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentCallIndex, setCurrentCallIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('id, name, purpose, language, success_rate')
        .eq('is_active', true)
        .order('success_rate', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch agents",
        variant: "destructive",
      });
    }
  };

  const parsePhoneNumbers = (input: string): string[] => {
    return input
      .split(/[\n,;]/)
      .map(num => num.trim())
      .filter(num => num.length > 0)
      .map(num => normalizePhoneNumber(num, '+1'))
      .filter(num => validateE164PhoneNumber(num));
  };

  const initiateCall = async (phoneNumber: string): Promise<{ success: boolean; callId?: string; error?: string }> => {
    try {
      // First create a temporary contact
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          user_id: user?.id,
          phone_number: phoneNumber,
          first_name: 'Bulk Call Contact',
          call_status: 'pending'
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // Then initiate the call
      const { data, error } = await supabase.functions.invoke('initiate-outbound-call', {
        body: {
          contactId: contact.id,
          agentId: selectedAgent,
          phoneNumber: phoneNumber,
          useSimpleTwiml: false
        }
      });

      if (error) throw error;

      return { 
        success: true, 
        callId: data?.callId || data?.call_record_id 
      };
    } catch (error: any) {
      console.error('Error initiating call:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error' 
      };
    }
  };

  const startBulkCalls = async () => {
    if (!selectedAgent) {
      toast({
        title: "Agent required",
        description: "Please select an AI agent",
        variant: "destructive",
      });
      return;
    }

    const numbers = parsePhoneNumbers(phoneNumbers);
    if (numbers.length === 0) {
      toast({
        title: "No valid phone numbers",
        description: "Please enter valid phone numbers",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to make calls",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    setCurrentCallIndex(0);
    setProgress(0);

    // Initialize call results
    const initialResults: CallResult[] = numbers.map(num => ({
      phoneNumber: num,
      status: 'pending'
    }));
    setCallResults(initialResults);

    // Process calls sequentially with 1-second delay between calls
    for (let i = 0; i < numbers.length; i++) {
      if (isPaused) {
        await new Promise(resolve => {
          const checkPause = () => {
            if (!isPaused) {
              resolve(void 0);
            } else {
              setTimeout(checkPause, 100);
            }
          };
          checkPause();
        });
      }

      setCurrentCallIndex(i);
      const phoneNumber = numbers[i];

      try {
        const result = await initiateCall(phoneNumber);
        
        setCallResults(prev => prev.map((call, index) => 
          index === i ? {
            ...call,
            status: result.success ? 'initiated' : 'failed',
            callId: result.callId,
            error: result.error
          } : call
        ));

        if (result.success) {
          toast({
            title: "Call initiated",
            description: `Call to ${phoneNumber} started`,
          });
        } else {
          toast({
            title: "Call failed",
            description: `Failed to call ${phoneNumber}: ${result.error}`,
            variant: "destructive",
          });
        }
      } catch (error: any) {
        setCallResults(prev => prev.map((call, index) => 
          index === i ? {
            ...call,
            status: 'failed',
            error: error.message
          } : call
        ));
      }

      setProgress(((i + 1) / numbers.length) * 100);

      // Add delay between calls to avoid rate limiting
      if (i < numbers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsRunning(false);
    setCurrentCallIndex(numbers.length);
    
    const successful = callResults.filter(r => r.status === 'initiated').length;
    toast({
      title: "Bulk calling completed",
      description: `${successful} of ${numbers.length} calls initiated successfully`,
    });
  };

  const pauseCalls = () => {
    setIsPaused(true);
  };

  const resumeCalls = () => {
    setIsPaused(false);
  };

  const stopCalls = () => {
    setIsRunning(false);
    setIsPaused(false);
  };

  const resetCalls = () => {
    setPhoneNumbers('');
    setCallResults([]);
    setProgress(0);
    setCurrentCallIndex(0);
    setIsRunning(false);
    setIsPaused(false);
  };

  const validNumbers = parsePhoneNumbers(phoneNumbers);
  const successfulCalls = callResults.filter(r => r.status === 'initiated').length;
  const failedCalls = callResults.filter(r => r.status === 'failed').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Bulk Call Launcher
          </CardTitle>
          <CardDescription>
            Initiate calls to multiple phone numbers simultaneously using your AI agents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Agent Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select AI Agent</label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent} disabled={isRunning}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an AI agent..." />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      <span>{agent.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(agent.success_rate)}%
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Phone Numbers Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Phone Numbers
              <span className="text-muted-foreground font-normal ml-2">
                (one per line, or comma-separated)
              </span>
            </label>
            <Textarea
              placeholder="+12345678901&#10;+12345678902&#10;+12345678903"
              value={phoneNumbers}
              onChange={(e) => setPhoneNumbers(e.target.value)}
              className="min-h-[120px] font-mono text-sm"
              disabled={isRunning}
            />
            {validNumbers.length > 0 && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                {validNumbers.length} valid phone numbers detected
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2">
            {!isRunning ? (
              <Button 
                onClick={startBulkCalls}
                disabled={validNumbers.length === 0 || !selectedAgent}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Start Bulk Calls
              </Button>
            ) : (
              <div className="flex gap-2">
                {!isPaused ? (
                  <Button onClick={pauseCalls} variant="outline" className="gap-2">
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>
                ) : (
                  <Button onClick={resumeCalls} className="gap-2">
                    <Play className="w-4 h-4" />
                    Resume
                  </Button>
                )}
                <Button onClick={stopCalls} variant="destructive" className="gap-2">
                  Stop
                </Button>
              </div>
            )}
            
            {callResults.length > 0 && (
              <Button onClick={resetCalls} variant="outline" disabled={isRunning}>
                Reset
              </Button>
            )}
          </div>

          {/* Progress */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress: {currentCallIndex + 1} of {validNumbers.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
              {isPaused && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <Pause className="w-4 h-4" />
                  Calls paused
                </div>
              )}
            </div>
          )}

          {/* Results Summary */}
          {callResults.length > 0 && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{callResults.length}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{successfulCalls}</div>
                <div className="text-sm text-muted-foreground">Success</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{failedCalls}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call Results */}
      {callResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Call Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {callResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      result.status === 'initiated' ? 'bg-green-500' :
                      result.status === 'failed' ? 'bg-red-500' :
                      'bg-gray-300'
                    }`} />
                    <span className="font-mono text-sm">{result.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.status === 'initiated' && (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Initiated
                      </Badge>
                    )}
                    {result.status === 'failed' && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Failed
                      </Badge>
                    )}
                    {result.status === 'pending' && (
                      <Badge variant="outline">Pending</Badge>
                    )}
                    {result.callId && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {result.callId.substring(0, 8)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkCallLauncher;