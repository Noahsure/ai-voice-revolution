import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Phone, PhoneOff, Clock, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface CallRecord {
  id: string;
  phone_number: string;
  call_status: string;
  start_time: string;
  duration_seconds: number;
  call_outcome: string;
  contacts: {
    first_name: string;
    last_name: string;
    company: string;
  };
  campaigns: {
    name: string;
  };
  ai_agents: {
    name: string;
  };
}

interface LiveStats {
  activeCalls: number;
  completedCalls: number;
  successfulCalls: number;
  avgDuration: number;
}

const LiveMonitoring: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats>({
    activeCalls: 0,
    completedCalls: 0,
    successfulCalls: 0,
    avgDuration: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    fetchCallRecords();
    calculateLiveStats();

    // Set up real-time subscription for call updates
    const callsChannel = supabase
      .channel('call-records-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_records',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Call record updated:', payload);
          fetchCallRecords();
          calculateLiveStats();
        }
      )
      .subscribe();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchCallRecords();
      calculateLiveStats();
    }, 10000);

    return () => {
      supabase.removeChannel(callsChannel);
      clearInterval(interval);
    };
  }, [user]);

  const fetchCallRecords = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('call_records')
      .select(`
        id,
        phone_number,
        call_status,
        start_time,
        duration_seconds,
        call_outcome,
        contacts (first_name, last_name, company),
        campaigns (name),
        ai_agents (name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching call records:', error);
      toast({
        title: "Error",
        description: "Failed to fetch call records",
        variant: "destructive",
      });
      return;
    }

    setCallRecords(data || []);
    setLoading(false);
  };

  const calculateLiveStats = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('call_records')
      .select('call_status, call_outcome, duration_seconds')
      .eq('user_id', user.id);

    if (!error && data) {
      const activeCalls = data.filter(record => 
        ['initiated', 'ringing', 'in_progress'].includes(record.call_status)
      ).length;

      const completedCalls = data.filter(record => 
        record.call_status === 'completed'
      ).length;

      const successfulCalls = data.filter(record => 
        ['hot_lead', 'warm_lead', 'appointment', 'sale'].includes(record.call_outcome)
      ).length;

      const totalDuration = data
        .filter(record => record.duration_seconds > 0)
        .reduce((sum, record) => sum + record.duration_seconds, 0);

      const avgDuration = completedCalls > 0 ? totalDuration / completedCalls : 0;

      setLiveStats({
        activeCalls,
        completedCalls,
        successfulCalls,
        avgDuration
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'initiated': return 'bg-blue-500';
      case 'ringing': return 'bg-yellow-500';
      case 'in_progress': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      case 'failed': return 'bg-red-500';
      case 'no_answer': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'hot_lead': return 'bg-red-100 text-red-800 border-red-200';
      case 'warm_lead': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cold_lead': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'appointment': return 'bg-green-100 text-green-800 border-green-200';
      case 'sale': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'complaint': return 'bg-red-100 text-red-800 border-red-200';
      case 'no_answer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const successRate = liveStats.completedCalls > 0 
    ? (liveStats.successfulCalls / liveStats.completedCalls) * 100 
    : 0;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Live Call Monitoring</h1>
            <p className="text-muted-foreground">Real-time call tracking and analytics</p>
          </div>
        </div>
      </div>

      {/* Live Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{liveStats.activeCalls}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <PhoneOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveStats.completedCalls}</div>
            <p className="text-xs text-muted-foreground">Total calls finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {successRate.toFixed(1)}%
            </div>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(Math.round(liveStats.avgDuration))}
            </div>
            <p className="text-xs text-muted-foreground">Per completed call</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
          <CardDescription>
            Live updates of your calling activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {callRecords.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No calls yet</h3>
              <p className="text-muted-foreground">
                Start a campaign to see live call monitoring data here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {callRecords.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(call.call_status)}`} />
                    <div>
                      <div className="font-medium">
                        {call.contacts?.first_name} {call.contacts?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {call.phone_number} • {call.contacts?.company}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Campaign: {call.campaigns?.name} • Agent: {call.ai_agents?.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {call.call_outcome && (
                      <Badge variant="outline" className={getOutcomeColor(call.call_outcome)}>
                        {call.call_outcome.replace('_', ' ')}
                      </Badge>
                    )}
                    
                    <Badge variant="secondary">
                      {call.call_status.replace('_', ' ')}
                    </Badge>

                    {call.duration_seconds > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {formatDuration(call.duration_seconds)}
                      </div>
                    )}

                    {call.start_time && (
                      <div className="text-xs text-muted-foreground">
                        {new Date(call.start_time).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveMonitoring;