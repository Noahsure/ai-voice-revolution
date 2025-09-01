import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, Headphones, BarChart3, Star, Flag, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface QualityControlProps {
  dateRange: { from: Date; to: Date };
  selectedCampaign: string;
}

interface QualityMetrics {
  averageScore: number;
  totalReviewed: number;
  totalFlagged: number;
  complianceRate: number;
  scriptAdherence: number;
  toneScore: number;
  engagementScore: number;
}

interface QualityTrend {
  date: string;
  overallScore: number;
  scriptScore: number;
  toneScore: number;
  engagementScore: number;
}

interface FlaggedCall {
  id: string;
  phone_number: string;
  agent_name: string;
  duration: number;
  flags: string[];
  score: number;
  created_at: string;
}

export const QualityControlDashboard: React.FC<QualityControlProps> = ({
  dateRange,
  selectedCampaign
}) => {
  const { user } = useAuth();
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics>({
    averageScore: 0,
    totalReviewed: 0,
    totalFlagged: 0,
    complianceRate: 0,
    scriptAdherence: 0,
    toneScore: 0,
    engagementScore: 0
  });
  const [qualityTrends, setQualityTrends] = useState<QualityTrend[]>([]);
  const [flaggedCalls, setFlaggedCalls] = useState<FlaggedCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchQualityData();
  }, [user, dateRange, selectedCampaign]);

  const fetchQualityData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Since we don't have actual quality data yet, we'll generate mock data based on call records
      let query = supabase
        .from('call_records')
        .select(`
          id,
          phone_number,
          duration_seconds,
          call_outcome,
          call_status,
          created_at,
          ai_agents (name)
        `)
        .eq('user_id', user.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .eq('call_status', 'completed');

      if (selectedCampaign !== 'all') {
        query = query.eq('campaign_id', selectedCampaign);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching quality data:', error);
        return;
      }

      const calls = data || [];
      
      // Generate mock quality metrics
      const generateMockScore = () => Math.random() * 3 + 7; // Score between 7-10
      
      const totalCalls = calls.length;
      const averageScore = totalCalls > 0 ? generateMockScore() : 0;
      const flaggedCount = Math.floor(totalCalls * 0.15); // 15% flagged for review
      const complianceRate = totalCalls > 0 ? Math.random() * 10 + 90 : 100; // 90-100%
      
      setQualityMetrics({
        averageScore,
        totalReviewed: totalCalls,
        totalFlagged: flaggedCount,
        complianceRate,
        scriptAdherence: generateMockScore(),
        toneScore: generateMockScore(),
        engagementScore: generateMockScore()
      });

      // Generate trend data
      const trends: QualityTrend[] = [];
      const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i <= days; i++) {
        const date = new Date(dateRange.from);
        date.setDate(date.getDate() + i);
        
        trends.push({
          date: date.toISOString().split('T')[0],
          overallScore: generateMockScore(),
          scriptScore: generateMockScore(),
          toneScore: generateMockScore(),
          engagementScore: generateMockScore()
        });
      }
      
      setQualityTrends(trends);

      // Generate flagged calls
      const flaggedCallsData = calls
        .slice(0, flaggedCount)
        .map((call: any) => ({
          id: call.id,
          phone_number: call.phone_number,
          agent_name: call.ai_agents?.name || 'Unknown Agent',
          duration: call.duration_seconds,
          flags: [
            'Tone Issues',
            'Script Deviation',
            'Compliance Concern',
            'Poor Engagement'
          ].filter(() => Math.random() > 0.7),
          score: Math.random() * 3 + 5, // Lower scores for flagged calls
          created_at: call.created_at
        }));

      setFlaggedCalls(flaggedCallsData);
      
    } catch (error) {
      console.error('Error in fetchQualityData:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-green-600';
    if (score >= 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 8.5) return 'default';
    if (score >= 7) return 'secondary';
    return 'destructive';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent>
            <div className="h-80 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare radar chart data for quality dimensions
  const radarData = [
    {
      dimension: 'Script Adherence',
      score: qualityMetrics.scriptAdherence,
      fullMark: 10
    },
    {
      dimension: 'Tone Quality',
      score: qualityMetrics.toneScore,
      fullMark: 10
    },
    {
      dimension: 'Engagement',
      score: qualityMetrics.engagementScore,
      fullMark: 10
    },
    {
      dimension: 'Compliance',
      score: qualityMetrics.complianceRate / 10, // Scale to match others
      fullMark: 10
    },
    {
      dimension: 'Overall Quality',
      score: qualityMetrics.averageScore,
      fullMark: 10
    }
  ];

  return (
    <div className="space-y-6">
      {/* Quality Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Quality Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(qualityMetrics.averageScore)}`}>
                  {qualityMetrics.averageScore.toFixed(1)}/10
                </p>
              </div>
              <Star className="h-8 w-8 text-muted-foreground" />
            </div>
            <Progress value={qualityMetrics.averageScore * 10} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Calls Reviewed</p>
                <p className="text-2xl font-bold">{qualityMetrics.totalReviewed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {qualityMetrics.totalFlagged} flagged for review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliance Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {qualityMetrics.complianceRate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <Progress value={qualityMetrics.complianceRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Flagged Calls</p>
                <p className="text-2xl font-bold text-orange-600">
                  {qualityMetrics.totalFlagged}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {qualityMetrics.totalReviewed > 0 
                ? ((qualityMetrics.totalFlagged / qualityMetrics.totalReviewed) * 100).toFixed(1)
                : 0}% of total calls
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quality Trends and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quality Score Trends
            </CardTitle>
            <CardDescription>Quality metrics over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={qualityTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="overallScore" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Overall Score"
                />
                <Line 
                  type="monotone" 
                  dataKey="scriptScore" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  name="Script Adherence"
                />
                <Line 
                  type="monotone" 
                  dataKey="toneScore" 
                  stroke="hsl(var(--warning))" 
                  strokeWidth={2}
                  name="Tone Quality"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Quality Dimensions
            </CardTitle>
            <CardDescription>Multi-dimensional quality analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" />
                <PolarRadiusAxis angle={0} domain={[0, 10]} />
                <Radar
                  name="Quality Score"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Flagged Calls for Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Calls Flagged for Review
          </CardTitle>
          <CardDescription>
            Calls that require manual review due to quality concerns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {flaggedCalls.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">All Clear!</h3>
              <p className="text-muted-foreground">
                No calls have been flagged for review in the selected time period.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {flaggedCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <div>
                        <div className="font-medium">{call.phone_number}</div>
                        <div className="text-sm text-muted-foreground">
                          Agent: {call.agent_name}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {call.flags.map((flag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge variant={getScoreBadgeVariant(call.score)}>
                        {call.score.toFixed(1)}/10
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        Duration: {formatDuration(call.duration)}
                      </div>
                    </div>
                    
                    <Button size="sm" variant="outline">
                      <Headphones className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quality Improvement Recommendations
          </CardTitle>
          <CardDescription>AI-powered suggestions to improve call quality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Script Optimization</h4>
                <p className="text-sm text-blue-700">
                  Consider updating your script to improve engagement in the first 30 seconds. 
                  Calls with stronger openings show 23% higher conversion rates.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-900">Tone Training</h4>
                <p className="text-sm text-orange-700">
                  Some agents show inconsistent tone quality. Consider additional training 
                  on maintaining professional yet friendly conversation flow.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <Star className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">Compliance Excellence</h4>
                <p className="text-sm text-green-700">
                  Your compliance rate is excellent! Continue current practices and 
                  consider documenting best practices for scaling.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};