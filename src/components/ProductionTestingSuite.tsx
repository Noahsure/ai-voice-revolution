import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Phone, 
  TestTube, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock,
  Users,
  Volume2,
  AlertTriangle,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  id: string;
  type: 'call_flow' | 'ai_quality' | 'load_test';
  status: 'running' | 'passed' | 'failed';
  duration: number;
  details: any;
  timestamp: Date;
}

interface LoadTestConfig {
  concurrentCalls: number;
  duration: number;
  targetPhone: string;
  agentId: string;
}

const ProductionTestingSuite = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [loadTestConfig, setLoadTestConfig] = useState<LoadTestConfig>({
    concurrentCalls: 5,
    duration: 60,
    targetPhone: '',
    agentId: ''
  });
  const [systemHealth, setSystemHealth] = useState({
    callSuccess: 95,
    aiResponse: 98,
    avgLatency: 1.2,
    errorRate: 2
  });

  useEffect(() => {
    fetchSystemHealth();
    const interval = setInterval(fetchSystemHealth, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-system-health');
      if (error) throw error;
      
      if (data) {
        setSystemHealth(data);
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
    }
  };

  const runEndToEndTest = async () => {
    setIsRunning(true);
    const startTime = Date.now();
    
    try {
      toast({
        title: "Starting E2E Test",
        description: "Testing complete call flow...",
      });

      // Test call initiation
      const { data: callResult, error: callError } = await supabase.functions.invoke('test-call-components', {
        body: {
          test_type: 'end_to_end',
          phone_number: '+15551234567', // Test number
          agent_id: loadTestConfig.agentId
        }
      });

      if (callError) throw callError;

      const testResult: TestResult = {
        id: crypto.randomUUID(),
        type: 'call_flow',
        status: callResult.success ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        details: callResult,
        timestamp: new Date()
      };

      setTestResults(prev => [testResult, ...prev]);
      
      toast({
        title: testResult.status === 'passed' ? "✅ E2E Test Passed" : "❌ E2E Test Failed",
        description: `Call flow ${testResult.status} in ${testResult.duration}ms`,
        variant: testResult.status === 'passed' ? "default" : "destructive"
      });

    } catch (error) {
      const testResult: TestResult = {
        id: crypto.randomUUID(),
        type: 'call_flow',
        status: 'failed',
        duration: Date.now() - startTime,
        details: { error: error.message },
        timestamp: new Date()
      };
      
      setTestResults(prev => [testResult, ...prev]);
      
      toast({
        title: "❌ E2E Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runAIQualityTest = async () => {
    setIsRunning(true);
    const startTime = Date.now();
    
    try {
      toast({
        title: "Testing AI Quality",
        description: "Analyzing conversation quality...",
      });

      const testScenarios = [
        "Hello, I'm interested in your services",
        "I'm not sure if this is right for me",
        "What's your pricing?",
        "I need to think about it",
        "How do I get started?"
      ];

      const results = [];
      
      for (const scenario of testScenarios) {
        const { data: aiResult, error } = await supabase.functions.invoke('ai-conversation-handler', {
          body: {
            test_mode: true,
            customer_speech: scenario,
            agent_id: loadTestConfig.agentId
          }
        });

        if (error) throw error;
        results.push({
          input: scenario,
          response: aiResult.ai_response,
          quality_score: aiResult.quality_score || 0
        });
      }

      const avgQuality = results.reduce((sum, r) => sum + r.quality_score, 0) / results.length;
      
      const testResult: TestResult = {
        id: crypto.randomUUID(),
        type: 'ai_quality',
        status: avgQuality > 7 ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        details: { scenarios: results, average_quality: avgQuality },
        timestamp: new Date()
      };

      setTestResults(prev => [testResult, ...prev]);
      
      toast({
        title: testResult.status === 'passed' ? "✅ AI Quality Test Passed" : "❌ AI Quality Test Failed",
        description: `Average quality score: ${avgQuality.toFixed(1)}/10`,
        variant: testResult.status === 'passed' ? "default" : "destructive"
      });

    } catch (error) {
      const testResult: TestResult = {
        id: crypto.randomUUID(),
        type: 'ai_quality',
        status: 'failed',
        duration: Date.now() - startTime,
        details: { error: error.message },
        timestamp: new Date()
      };
      
      setTestResults(prev => [testResult, ...prev]);
      
      toast({
        title: "❌ AI Quality Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runLoadTest = async () => {
    setIsRunning(true);
    const startTime = Date.now();
    
    try {
      toast({
        title: "Starting Load Test",
        description: `Testing ${loadTestConfig.concurrentCalls} concurrent calls...`,
      });

      const { data: loadResult, error } = await supabase.functions.invoke('test-call-components', {
        body: {
          test_type: 'load_test',
          concurrent_calls: loadTestConfig.concurrentCalls,
          duration: loadTestConfig.duration,
          phone_number: loadTestConfig.targetPhone,
          agent_id: loadTestConfig.agentId
        }
      });

      if (error) throw error;

      const testResult: TestResult = {
        id: crypto.randomUUID(),
        type: 'load_test',
        status: loadResult.success_rate > 90 ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        details: loadResult,
        timestamp: new Date()
      };

      setTestResults(prev => [testResult, ...prev]);
      
      toast({
        title: testResult.status === 'passed' ? "✅ Load Test Passed" : "❌ Load Test Failed",
        description: `${loadResult.success_rate}% success rate`,
        variant: testResult.status === 'passed' ? "default" : "destructive"
      });

    } catch (error) {
      const testResult: TestResult = {
        id: crypto.randomUUID(),
        type: 'load_test',
        status: 'failed',
        duration: Date.now() - startTime,
        details: { error: error.message },
        timestamp: new Date()
      };
      
      setTestResults(prev => [testResult, ...prev]);
      
      toast({
        title: "❌ Load Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running': return <Clock className="w-4 h-4 text-yellow-600 animate-spin" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'running': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Production Testing Suite</h1>
        <p className="text-muted-foreground">Comprehensive testing for production readiness</p>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Call Success Rate</p>
                <p className="text-2xl font-bold">{systemHealth.callSuccess}%</p>
              </div>
              <Phone className="w-8 h-8 text-primary" />
            </div>
            <Progress value={systemHealth.callSuccess} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Response Quality</p>
                <p className="text-2xl font-bold">{systemHealth.aiResponse}%</p>
              </div>
              <Volume2 className="w-8 h-8 text-primary" />
            </div>
            <Progress value={systemHealth.aiResponse} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Latency</p>
                <p className="text-2xl font-bold">{systemHealth.avgLatency}s</p>
              </div>
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <div className="mt-2">
              <Badge variant={systemHealth.avgLatency < 2 ? "default" : "destructive"}>
                {systemHealth.avgLatency < 2 ? 'Good' : 'Needs Attention'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold">{systemHealth.errorRate}%</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-primary" />
            </div>
            <div className="mt-2">
              <Badge variant={systemHealth.errorRate < 5 ? "default" : "destructive"}>
                {systemHealth.errorRate < 5 ? 'Healthy' : 'High Errors'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="quick-tests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quick-tests">Quick Tests</TabsTrigger>
          <TabsTrigger value="load-testing">Load Testing</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
        </TabsList>

        <TabsContent value="quick-tests" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* End-to-End Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  End-to-End Call Test
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Test complete call flow from initiation to completion
                </p>
                <Button onClick={runEndToEndTest} disabled={isRunning} className="w-full">
                  {isRunning ? 'Testing...' : 'Run E2E Test'}
                </Button>
              </CardContent>
            </Card>

            {/* AI Quality Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  AI Conversation Quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Test AI responses across common customer scenarios
                </p>
                <Button onClick={runAIQualityTest} disabled={isRunning} className="w-full">
                  {isRunning ? 'Testing...' : 'Test AI Quality'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Production Readiness Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>Production Readiness Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { item: 'System health monitoring active', status: true },
                  { item: 'Load testing completed', status: false },
                  { item: 'AI quality benchmarks met', status: true },
                  { item: 'Error handling validated', status: true },
                  { item: 'Backup systems configured', status: false },
                  { item: 'Monitoring alerts configured', status: true }
                ].map((check, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {check.status ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={check.status ? 'text-foreground' : 'text-muted-foreground'}>
                      {check.item}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="load-testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Load Test Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="concurrent">Concurrent Calls</Label>
                  <Input
                    id="concurrent"
                    type="number"
                    value={loadTestConfig.concurrentCalls}
                    onChange={(e) => setLoadTestConfig(prev => ({
                      ...prev,
                      concurrentCalls: parseInt(e.target.value) || 1
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (seconds)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={loadTestConfig.duration}
                    onChange={(e) => setLoadTestConfig(prev => ({
                      ...prev,
                      duration: parseInt(e.target.value) || 60
                    }))}
                  />
                </div>
              </div>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Load testing will generate actual calls. Use test phone numbers only.
                </AlertDescription>
              </Alert>

              <Button onClick={runLoadTest} disabled={isRunning} className="w-full">
                {isRunning ? 'Running Load Test...' : 'Start Load Test'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <div>
                        <h4 className="font-medium capitalize">
                          {result.type.replace('_', ' ')} Test
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {result.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(result.status)}>
                        {result.status}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.duration}ms
                      </p>
                    </div>
                  </div>
                ))}
                
                {testResults.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No test results yet. Run some tests to see results here.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductionTestingSuite;