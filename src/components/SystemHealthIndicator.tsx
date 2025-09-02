import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Activity, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface SystemHealth {
  overallHealth: number;
  callEngineStatus: 'healthy' | 'warning' | 'critical';
  activeMonitoring: boolean;
  queueStatus: 'active' | 'paused' | 'error';
  lastCheck: Date;
}

export default function SystemHealthIndicator() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const checkSystemHealth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check recent call records for health indicators
      const { data: recentCalls, error: callsError } = await supabase
        .from('call_records')
        .select('call_status, retry_count, created_at')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
        .order('created_at', { ascending: false });

      if (callsError) throw callsError;

      // Check call queue status
      const { data: queueStatus, error: queueError } = await supabase
        .from('call_queue')
        .select('status')
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing']);

      if (queueError) throw queueError;

      // Check monitoring system
      const { data: monitoringData, error: monitorError } = await supabase
        .from('call_monitoring')
        .select('health_score, last_heartbeat, status')
        .eq('user_id', user.id)
        .gte('last_heartbeat', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
        .order('last_heartbeat', { ascending: false })
        .limit(10);

      if (monitorError) throw monitorError;

      // Calculate health metrics
      const totalCalls = recentCalls?.length || 0;
      const failedCalls = recentCalls?.filter(c => c.call_status === 'failed').length || 0;
      const retriedCalls = recentCalls?.filter(c => c.retry_count > 0).length || 0;
      
      const successRate = totalCalls > 0 ? ((totalCalls - failedCalls) / totalCalls) * 100 : 100;
      const avgHealthScore = monitoringData && monitoringData.length > 0
        ? monitoringData.reduce((sum, m) => sum + m.health_score, 0) / monitoringData.length
        : 100;

      const overallHealth = (successRate + avgHealthScore) / 2;
      
      let callEngineStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (overallHealth < 70) callEngineStatus = 'critical';
      else if (overallHealth < 85) callEngineStatus = 'warning';

      const queueActive = (queueStatus?.length || 0) > 0;
      const monitoringActive = (monitoringData?.length || 0) > 0;

      setHealth({
        overallHealth: Math.round(overallHealth),
        callEngineStatus,
        activeMonitoring: monitoringActive,
        queueStatus: queueActive ? 'active' : 'paused',
        lastCheck: new Date()
      });

    } catch (error) {
      console.error('Error checking system health:', error);
      setHealth(prev => prev ? {
        ...prev,
        callEngineStatus: 'critical',
        lastCheck: new Date()
      } : null);
    }
  };

  const triggerHealthCheck = async () => {
    setIsChecking(true);
    try {
      // Trigger monitoring functions for immediate health check
      await Promise.all([
        supabase.functions.invoke('call-state-monitor'),
        supabase.functions.invoke('call-error-recovery')
      ]);
      
      await checkSystemHealth();
    } catch (error) {
      console.error('Error triggering health check:', error);
    } finally {
      setIsChecking(false);
    }
  };

  if (!health) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Activity className="w-4 h-4 animate-pulse" />
        Checking system health...
      </div>
    );
  }

  const getHealthIcon = () => {
    switch (health.callEngineStatus) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getHealthColor = () => {
    switch (health.callEngineStatus) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
    }
  };

  const getHealthBadge = () => {
    switch (health.callEngineStatus) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
    }
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-background/50 rounded-lg border">
      <div className="flex items-center gap-2">
        {getHealthIcon()}
        <span className={`font-medium ${getHealthColor()}`}>
          System Health: {health.overallHealth}%
        </span>
      </div>
      
      <Badge variant={getHealthBadge()}>
        {health.callEngineStatus.charAt(0).toUpperCase() + health.callEngineStatus.slice(1)}
      </Badge>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className={`w-2 h-2 rounded-full ${health.activeMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        Monitoring {health.activeMonitoring ? 'Active' : 'Inactive'}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className={`w-2 h-2 rounded-full ${health.queueStatus === 'active' ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'}`} />
        Queue {health.queueStatus}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={triggerHealthCheck}
        disabled={isChecking}
        className="ml-auto"
      >
        {isChecking ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
      </Button>

      <div className="text-xs text-muted-foreground">
        Last: {health.lastCheck.toLocaleTimeString()}
      </div>
    </div>
  );
}