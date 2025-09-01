import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Bot, TrendingUp, Clock, Target } from 'lucide-react';

interface AgentComparisonProps {
  dateRange: { from: Date; to: Date };
  selectedCampaign: string;
}

interface AgentPerformance {
  id: string;
  name: string;
  totalCalls: number;
  connectedCalls: number;
  conversions: number;
  conversionRate: number;
  averageCallDuration: number;
  qualityScore: number;
  costPerLead: number;
  efficiency: number;
}

export const AgentComparisonChart: React.FC<AgentComparisonProps> = ({
  dateRange,
  selectedCampaign
}) => {
  const { user } = useAuth();
  const [agentData, setAgentData] = useState<AgentPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchAgentPerformance();
  }, [user, dateRange, selectedCampaign]);

  const fetchAgentPerformance = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch call records with agent data
      let query = supabase
        .from('call_records')
        .select(`
          agent_id,
          call_status,
          call_outcome,
          duration_seconds,
          cost_cents,
          ai_agents (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .not('agent_id', 'is', null);

      if (selectedCampaign !== 'all') {
        query = query.eq('campaign_id', selectedCampaign);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching agent performance:', error);
        return;
      }

      // Group by agent and calculate metrics
      const agentGroups = (data || []).reduce((acc: Record<string, any>, record: any) => {
        const agentId = record.agent_id;
        const agentName = record.ai_agents?.name || 'Unknown Agent';
        
        if (!acc[agentId]) {
          acc[agentId] = {
            id: agentId,
            name: agentName,
            calls: [],
            totalCost: 0
          };
        }
        
        acc[agentId].calls.push(record);
        acc[agentId].totalCost += record.cost_cents || 0;
        
        return acc;
      }, {});

      // Calculate performance metrics for each agent
      const processedData = Object.values(agentGroups).map((agent: any) => {
        const calls = agent.calls;
        const totalCalls = calls.length;
        const connectedCalls = calls.filter((c: any) => 
          ['completed', 'in_progress'].includes(c.call_status)
        ).length;
        
        const conversions = calls.filter((c: any) => 
          ['hot_lead', 'warm_lead', 'appointment', 'sale'].includes(c.call_outcome)
        ).length;
        
        const conversionRate = connectedCalls > 0 ? (conversions / connectedCalls) * 100 : 0;
        
        const totalDuration = calls
          .filter((c: any) => c.duration_seconds > 0)
          .reduce((sum: number, c: any) => sum + c.duration_seconds, 0);
        
        const averageCallDuration = calls.length > 0 ? totalDuration / calls.length : 0;
        
        const costPerLead = conversions > 0 ? (agent.totalCost / conversions) / 100 : 0;
        
        // Calculate efficiency score (higher conversion rate + lower cost per lead = higher efficiency)
        const efficiency = conversionRate > 0 && costPerLead > 0 ? (conversionRate / costPerLead) * 10 : 0;
        
        // Mock quality score (in real app, this would come from call_quality_scores table)
        const qualityScore = Math.min(10, conversionRate / 2 + Math.random() * 3);

        return {
          id: agent.id,
          name: agent.name,
          totalCalls,
          connectedCalls,
          conversions,
          conversionRate,
          averageCallDuration,
          qualityScore,
          costPerLead,
          efficiency
        };
      }) as AgentPerformance[];

      setAgentData(processedData);
    } catch (error) {
      console.error('Error in fetchAgentPerformance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Prepare radar chart data
  const radarData = agentData.map(agent => ({
    agent: agent.name.substring(0, 10),
    conversionRate: agent.conversionRate,
    qualityScore: agent.qualityScore * 10, // Scale to match conversion rate
    efficiency: agent.efficiency * 10, // Scale for visibility
  }));

  return (
    <div className="space-y-6">
      {/* Agent Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agentData.map((agent) => (
          <Card key={agent.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bot className="h-4 w-4" />
                {agent.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Calls</span>
                  <div className="font-medium">{agent.totalCalls}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Conversions</span>
                  <div className="font-medium">{agent.conversions}</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Conversion Rate</span>
                  <Badge variant={agent.conversionRate > 15 ? "default" : "secondary"}>
                    {agent.conversionRate.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={agent.conversionRate} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Quality Score</span>
                  <Badge variant={agent.qualityScore > 7 ? "default" : "secondary"}>
                    {agent.qualityScore.toFixed(1)}/10
                  </Badge>
                </div>
                <Progress value={agent.qualityScore * 10} className="h-2" />
              </div>

              <div className="pt-2 border-t space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Call Duration</span>
                  <span className="font-medium">{formatDuration(agent.averageCallDuration)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cost per Lead</span>
                  <span className="font-medium">${agent.costPerLead.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversion Rate Comparison
            </CardTitle>
            <CardDescription>Compare conversion rates across all agents</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, 'Conversion Rate']} />
                <Bar 
                  dataKey="conversionRate" 
                  fill="hsl(var(--success))"
                  name="Conversion Rate %" 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Call Duration Analysis
            </CardTitle>
            <CardDescription>Average call duration by agent</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => [formatDuration(value), 'Avg Call Duration']} />
                <Bar 
                  dataKey="averageCallDuration" 
                  fill="hsl(var(--primary))"
                  name="Avg Duration (seconds)" 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance Radar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Multi-Dimensional Performance Analysis
          </CardTitle>
          <CardDescription>Compare agents across multiple performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="agent" />
              <PolarRadiusAxis angle={0} domain={[0, 100]} />
              <Radar
                name="Conversion Rate"
                dataKey="conversionRate"
                stroke="hsl(var(--success))"
                fill="hsl(var(--success))"
                fillOpacity={0.1}
              />
              <Radar
                name="Quality Score"
                dataKey="qualityScore"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.1}
              />
              <Radar
                name="Efficiency"
                dataKey="efficiency"
                stroke="hsl(var(--warning))"
                fill="hsl(var(--warning))"
                fillOpacity={0.1}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};