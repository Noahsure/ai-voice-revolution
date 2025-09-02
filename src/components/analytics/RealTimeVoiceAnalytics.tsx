import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Mic, Volume2, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

interface VoiceMetrics {
  latency: number;
  speechClarity: number;
  backgroundNoise: number;
  voiceEnergy: number;
  emotionalTone: 'positive' | 'neutral' | 'negative';
  conversationFlow: number;
}

interface VoiceQualityData {
  callId: string;
  timestamp: Date;
  metrics: VoiceMetrics;
  status: 'excellent' | 'good' | 'poor';
}

export default function RealTimeVoiceAnalytics() {
  const [voiceData, setVoiceData] = useState<VoiceQualityData[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<VoiceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (!isMonitoring) return;

    // Simulate real-time voice analytics
    const interval = setInterval(() => {
      const newMetrics: VoiceMetrics = {
        latency: Math.random() * 200 + 50, // 50-250ms
        speechClarity: Math.random() * 40 + 60, // 60-100%
        backgroundNoise: Math.random() * 30 + 5, // 5-35dB
        voiceEnergy: Math.random() * 30 + 70, // 70-100%
        emotionalTone: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)] as any,
        conversationFlow: Math.random() * 25 + 75, // 75-100%
      };

      setCurrentMetrics(newMetrics);
      
      const status = getQualityStatus(newMetrics);
      const newData: VoiceQualityData = {
        callId: `call-${Date.now()}`,
        timestamp: new Date(),
        metrics: newMetrics,
        status,
      };

      setVoiceData(prev => [...prev.slice(-9), newData]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const getQualityStatus = (metrics: VoiceMetrics): 'excellent' | 'good' | 'poor' => {
    const score = (
      (metrics.speechClarity / 100) * 0.3 +
      (Math.max(0, 300 - metrics.latency) / 300) * 0.25 +
      (Math.max(0, 40 - metrics.backgroundNoise) / 40) * 0.2 +
      (metrics.voiceEnergy / 100) * 0.15 +
      (metrics.conversationFlow / 100) * 0.1
    );

    if (score >= 0.8) return 'excellent';
    if (score >= 0.6) return 'good';
    return 'poor';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-4 h-4" />;
      case 'good': return <Zap className="w-4 h-4" />;
      case 'poor': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Real-Time Voice Analytics
          </CardTitle>
          <CardDescription>
            Monitor voice quality, latency, and conversation flow in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isMonitoring 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-primary hover:bg-primary/90 text-white'
              }`}
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </button>
            {isMonitoring && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-muted-foreground">Live monitoring active</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Metrics */}
      {currentMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="luxury-hover">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-blue-500" />
                Latency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {Math.round(currentMetrics.latency)}ms
                </div>
                <Progress 
                  value={Math.max(0, 100 - (currentMetrics.latency / 3))} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground">
                  {currentMetrics.latency < 150 ? 'Excellent' : 
                   currentMetrics.latency < 250 ? 'Good' : 'Needs improvement'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="luxury-hover">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Mic className="w-4 h-4 text-green-500" />
                Speech Clarity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {Math.round(currentMetrics.speechClarity)}%
                </div>
                <Progress 
                  value={currentMetrics.speechClarity} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground">
                  {currentMetrics.speechClarity >= 85 ? 'Crystal clear' : 
                   currentMetrics.speechClarity >= 70 ? 'Clear' : 'Unclear'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="luxury-hover">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Volume2 className="w-4 h-4 text-purple-500" />
                Voice Energy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {Math.round(currentMetrics.voiceEnergy)}%
                </div>
                <Progress 
                  value={currentMetrics.voiceEnergy} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground">
                  {currentMetrics.voiceEnergy >= 85 ? 'Energetic' : 
                   currentMetrics.voiceEnergy >= 70 ? 'Moderate' : 'Low energy'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quality Timeline */}
      {voiceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Voice Quality Timeline</CardTitle>
            <CardDescription>Recent voice quality measurements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {voiceData.slice(-5).reverse().map((data, index) => (
                <div 
                  key={data.callId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background/50 luxury-hover"
                >
                  <div className="flex items-center gap-3">
                    <div className={`${getStatusColor(data.status)}`}>
                      {getStatusIcon(data.status)}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {data.timestamp.toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Clarity: {Math.round(data.metrics.speechClarity)}% • 
                        Latency: {Math.round(data.metrics.latency)}ms
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant={data.status === 'excellent' ? 'default' : 
                            data.status === 'good' ? 'secondary' : 'destructive'}
                  >
                    {data.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}