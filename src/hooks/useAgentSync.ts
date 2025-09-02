import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface AgentSyncStatus {
  isConnected: boolean;
  isCallActive: boolean;
  callId: string | null;
  agentId: string | null;
  syncError: string | null;
  lastSync: Date | null;
}

export function useAgentSync() {
  const [status, setStatus] = useState<AgentSyncStatus>({
    isConnected: false,
    isCallActive: false,
    callId: null,
    agentId: null,
    syncError: null,
    lastSync: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Monitor agent synchronization status
  const checkAgentSync = useCallback(async (agentId: string, callId: string) => {
    setIsLoading(true);
    try {
      // Check if agent is properly assigned to call
      const { data: callRecord, error: callError } = await supabase
        .from('call_records')
        .select('id, agent_id, created_at')
        .eq('id', callId)
        .single();

      if (callError) throw callError;

      // Verify agent exists and is active
      const { data: agent, error: agentError } = await supabase
        .from('ai_agents')
        .select('id, name, voice_id, system_prompt')
        .eq('id', agentId)
        .single();

      if (agentError) throw agentError;

      // Check if sync is successful
      const isProperlySync = callRecord.agent_id === agentId && agent;

      setStatus({
        isConnected: true,
        isCallActive: true, // Assume active during sync check
        callId,
        agentId,
        syncError: null,
        lastSync: new Date(),
      });

      if (!isProperlySync) {
        throw new Error('Agent not properly synchronized with call');
      }

      return true;
    } catch (error) {
      console.error('Agent sync error:', error);
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        syncError: error.message,
        lastSync: new Date(),
      }));
      
      toast({
        title: "Agent Sync Error",
        description: "Failed to synchronize agent with call. Retrying...",
        variant: "destructive",
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Auto-retry sync on failure
  const retrySync = useCallback(async (agentId: string, callId: string, maxRetries = 3) => {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      const success = await checkAgentSync(agentId, callId);
      if (success) break;
      
      attempts++;
      if (attempts < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Exponential backoff
      }
    }
    
    if (attempts === maxRetries) {
      toast({
        title: "Sync Failed",
        description: "Could not synchronize agent after multiple attempts",
        variant: "destructive",
      });
    }
  }, [checkAgentSync, toast]);

  // Real-time sync monitoring
  useEffect(() => {
    if (!status.callId || !status.agentId) return;

    const channel = supabase
      .channel(`agent-sync-${status.callId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_records',
          filter: `id=eq.${status.callId}`,
        },
        (payload) => {
          console.log('Call record updated:', payload);
          
          // Handle any call record changes that might affect sync
          if (payload.new && payload.eventType === 'UPDATE') {
            setStatus(prev => ({
              ...prev,
              isCallActive: true, // Update based on your business logic
              lastSync: new Date(),
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status.callId]);

  return {
    status,
    isLoading,
    checkAgentSync,
    retrySync,
  };
}