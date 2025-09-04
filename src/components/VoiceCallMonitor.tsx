import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Phone, 
  PhoneCall, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Activity,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CallStatus {
  id: string;
  phone_number: string;
  call_status: string;
  twilio_call_sid?: string;
  created_at: string;
  agent_name?: string;
}

const VoiceCallMonitor = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCalls, setActiveCalls] = useState<CallStatus[]>([]);
  const [recentCalls, setRecentCalls] = useState<CallStatus[]>([]);
  const [isTestingCall, setIsTestingCall] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('+15551234567');

  useEffect(() => {
    if (user) {
      fetchCallStatus();
      const interval = setInterval(fetchCallStatus, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchCallStatus = async () => {
    if (!user) return;

    try {
      // Get active calls (last 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: callsData, error } = await supabase
        .from('call_records')
        .select(`
          id,
          phone_number,
          call_status,
          twilio_call_sid,
          created_at,
          ai_agents(name)
        `)
        .eq('user_id', user.id)
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching calls:', error);
        return;
      }

      const active = callsData?.filter(call => 
        ['initiated', 'ringing', 'in-progress', 'queued'].includes(call.call_status)
      ) || [];
      
      const recent = callsData?.filter(call => 
        ['completed', 'failed', 'no_answer'].includes(call.call_status)
      ).slice(0, 10) || [];

      setActiveCalls(active);
      setRecentCalls(recent);
    } catch (error) {
      console.error('Error in fetchCallStatus:', error);
    }
  };

  const testRealtimeCall = async () => {
    if (!user) return;

    setIsTestingCall(true);
    
    try {
      // Get the first available agent for testing
      const { data: agents } = await supabase
        .from('ai_agents')
        .select('id, name')
        .eq('is_active', true)
        .limit(1);

      if (!agents || agents.length === 0) {
        toast({
          title: "No AI agents available",
          description: "Please create an AI agent first",
          variant: "destructive"
        });
        return;
      }

      const agent = agents[0];

      // Initiate the call using our new streaming system
      const { data, error } = await supabase.functions.invoke('initiate-outbound-call', {
        body: {
          agentId: agent.id,
          phoneNumber: testPhoneNumber,
          useSimpleTwiml: false // Use real-time streaming
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Real-time call initiated",
        description: `Testing new streaming system with ${agent.name}`,
      });

      // Refresh call status immediately
      setTimeout(fetchCallStatus, 1000);

    } catch (error) {
      console.error('Error testing call:', error);
      toast({
        title: "Call test failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsTestingCall(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'initiated': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'ringing': return <Phone className="w-4 h-4 text-blue-600 animate-pulse" />;
      case 'in-progress': return <Activity className="w-4 h-4 text-green-600" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'queued': return <Clock className="w-4 h-4 text-orange-600" />;
      default: return <Phone className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'initiated': return 'bg-yellow-100 text-yellow-800';
      case 'ringing': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'queued': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Call Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Real-time Voice System Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              type="tel"
              value={testPhoneNumber}
              onChange={(e) => setTestPhoneNumber(e.target.value)}
              placeholder="+15551234567"
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <Button 
              onClick={testRealtimeCall}
              disabled={isTestingCall}
              className="flex items-center gap-2"
            >
              {isTestingCall ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4" />
                  Test Real-time Call
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            This will test the new awaz.ai-style streaming voice system with WebSocket + OpenAI Realtime API
          </p>
        </CardContent>
      </Card>

      {/* Active Calls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Active Calls ({activeCalls.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeCalls.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No active calls</p>
          ) : (
            <div className="space-y-3">
              {activeCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(call.call_status)}
                    <div>
                      <p className="font-medium">{call.phone_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {call.agent_name || 'Unknown Agent'} • {new Date(call.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(call.call_status)}>
                    {call.call_status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Recent Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentCalls.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recent calls</p>
          ) : (
            <div className="space-y-2">
              {recentCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(call.call_status)}
                    <span className="text-sm">{call.phone_number}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(call.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <Badge variant="outline" className={getStatusColor(call.call_status)}>
                    {call.call_status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Real-time Voice Streaming</span>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>OpenAI Realtime API</span>
              <Badge variant="default">Ready</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Twilio Media Streams</span>
              <Badge variant="default">Connected</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCallMonitor;