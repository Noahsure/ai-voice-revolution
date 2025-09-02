import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Phone,
  Zap,
  Shield,
  Timer
} from 'lucide-react';

interface ReliabilityMetrics {
  totalCalls: number;
  activeCalls: number;
  failedCalls: number;
  retryingCalls: number;
  queuedCalls: number;
  successRate: number;
  averageRetryCount: number;
  systemHealth: number;
}

export default function CallReliabilityMonitor() {
  const [metrics, setMetrics] = useState<ReliabilityMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    loadReliabilityMetrics();
    const interval = setInterval(loadReliabilityMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadReliabilityMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get call statistics for the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Get call records
      const { data: callRecords, error: callError } = await supabase
        .from('call_records')
        .select('call_status, retry_count, created_at')
        .eq('user_id', user.id)
        .gte('created_at', oneDayAgo);

      if (callError) throw callError;

      // Get queue status
      const { data: queueRecords, error: queueError } = await supabase
        .from('call_queue')
        .select('status')
        .eq('user_id', user.id);

      if (queueError) throw queueError;

      // Get monitoring health
      const { data: monitoringRecords, error: monitorError } = await supabase
        .from('call_monitoring')
        .select('health_score, last_heartbeat')
        .eq('user_id', user.id)
        .gte('last_heartbeat', new Date(Date.now() - 10 * 60 * 1000).toISOString()); // Last 10 minutes

      if (monitorError) throw monitorError;

      // Calculate metrics
      const totalCalls = callRecords?.length || 0;
      const activeCalls = callRecords?.filter(c => 
        ['initiated', 'ringing', 'in-progress'].includes(c.call_status)
      ).length || 0;
      
      const failedCalls = callRecords?.filter(c => 
        c.call_status === 'failed'
      ).length || 0;
      
      const retryingCalls = callRecords?.filter(c => 
        c.call_status === 'retry_scheduled' || (c.retry_count && c.retry_count > 0)
      ).length || 0;

      const queuedCalls = queueRecords?.filter(q => 
        q.status === 'pending'
      ).length || 0;

      const successRate = totalCalls > 0 
        ? ((totalCalls - failedCalls) / totalCalls) * 100 
        : 100;

      const averageRetryCount = callRecords && callRecords.length > 0
        ? callRecords.reduce((sum, call) => sum + (call.retry_count || 0), 0) / callRecords.length
        : 0;

      const systemHealth = monitoringRecords && monitoringRecords.length > 0
        ? monitoringRecords.reduce((sum, record) => sum + record.health_score, 0) / monitoringRecords.length
        : 100;

      setMetrics({
        totalCalls,
        activeCalls,
        failedCalls,
        retryingCalls,
        queuedCalls,
        successRate,
        averageRetryCount,
        systemHealth
      });

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading reliability metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerHealthCheck = async () => {
    setIsLoading(true);
    try {
      // Trigger monitoring functions
      await Promise.all([
        supabase.functions.invoke('call-state-monitor'),
        supabase.functions.invoke('call-error-recovery')
      ]);
      
      await loadReliabilityMetrics();
    } catch (error) {
      console.error('Error triggering health check:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadge = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  if (isLoading && !metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading reliability metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Call Reliability Monitor</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of call engine health and recovery systems
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <div className="text-sm text-muted-foreground">
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
          <Button 
            onClick={triggerHealthCheck} 
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            Health Check
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${getHealthColor(metrics?.systemHealth || 0)}`}>
                {Math.round(metrics?.systemHealth || 0)}%
              </div>
              <div className="text-sm text-muted-foreground mb-2">Overall Health</div>
              <Badge variant={getHealthBadge(metrics?.systemHealth || 0)}>
                {metrics?.systemHealth >= 90 ? 'Excellent' : 
                 metrics?.systemHealth >= 70 ? 'Good' : 'Critical'}
              </Badge>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold mb-2 text-blue-600">
                {metrics?.successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground mb-2">Success Rate</div>
              <Progress value={metrics?.successRate || 0} className="h-2" />
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold mb-2 text-purple-600">
                {metrics?.averageRetryCount.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground mb-2">Avg Retries</div>
              <Badge variant={metrics?.averageRetryCount < 1 ? 'default' : 'secondary'}>
                {metrics?.averageRetryCount < 1 ? 'Optimal' : 'High'}
              </Badge>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold mb-2 text-green-600">
                {metrics?.activeCalls}
              </div>
              <div className="text-sm text-muted-foreground mb-2">Active Calls</div>
              <Badge variant="outline">
                Live
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="luxury-hover">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-blue-500" />
              Total Calls (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalCalls || 0}</div>
            <div className="text-sm text-muted-foreground">
              {metrics?.activeCalls || 0} currently active
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-hover">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Failed Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.failedCalls || 0}</div>
            <div className="text-sm text-muted-foreground">
              {metrics?.retryingCalls || 0} retrying
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-hover">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Timer className="w-4 h-4 text-yellow-500" />
              Queue Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.queuedCalls || 0}</div>
            <div className="text-sm text-muted-foreground">
              Pending calls
            </div>
          </CardContent>
        </Card>

        <Card className="luxury-hover">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Reliability Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((metrics?.systemHealth || 0) * (metrics?.successRate || 0) / 100)}%
            </div>
            <div className="text-sm text-muted-foreground">
              Combined score
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recovery Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Automated Recovery Systems
          </CardTitle>
          <CardDescription>
            Background processes that ensure bulletproof call reliability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-background/50">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-500" />
                Retry Handler
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Automatically retries failed calls with exponential backoff
              </p>
              <Badge variant="outline">Active</Badge>
            </div>

            <div className="p-4 rounded-lg border bg-background/50">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                State Monitor
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Monitors stuck calls and marks them as failed after timeout
              </p>
              <Badge variant="outline">Active</Badge>
            </div>

            <div className="p-4 rounded-lg border bg-background/50">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                Queue Manager
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Manages call pacing and queue processing with rate limiting
              </p>
              <Badge variant="outline">Active</Badge>
            </div>

            <div className="p-4 rounded-lg border bg-background/50">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-500" />
                Error Recovery
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                Handles webhook failures and inconsistent call states
              </p>
              <Badge variant="outline">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}