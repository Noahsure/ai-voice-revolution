import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { AnalyticsOverview } from '@/components/analytics/AnalyticsOverview';
import { CampaignPerformanceChart } from '@/components/analytics/CampaignPerformanceChart';
import { AgentComparisonChart } from '@/components/analytics/AgentComparisonChart';
import { CallOutcomeDistribution } from '@/components/analytics/CallOutcomeDistribution';
import { QualityControlDashboard } from '@/components/analytics/QualityControlDashboard';
import { ExportReports } from '@/components/analytics/ExportReports';
import { 
  TrendingUp, 
  Users, 
  Phone, 
  DollarSign, 
  Target, 
  Clock,
  BarChart3,
  PieChart,
  Download,
  Filter,
  Calendar,
  TestTube,
  PlayCircle,
  Volume2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addDays, subDays } from 'date-fns';

interface AnalyticsData {
  totalCalls: number;
  totalConnected: number;
  totalCompleted: number;
  totalHotLeads: number;
  totalWarmLeads: number;
  totalColdLeads: number;
  totalAppointments: number;
  totalSales: number;
  totalCostCents: number;
  averageConversionRate: number;
  averageTalkTime: string;
}

interface Campaign {
  id: string;
  name: string;
}

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalCalls: 0,
    totalConnected: 0,
    totalCompleted: 0,
    totalHotLeads: 0,
    totalWarmLeads: 0,
    totalColdLeads: 0,
    totalAppointments: 0,
    totalSales: 0,
    totalCostCents: 0,
    averageConversionRate: 0,
    averageTalkTime: '0:00'
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [testingAllCampaigns, setTestingAllCampaigns] = useState(false);
  const [testResults, setTestResults] = useState<Array<{campaignId: string, campaignName: string, status: 'running' | 'passed' | 'failed', details?: any}>>([]);

  useEffect(() => {
    if (!user) return;
    
    fetchCampaigns();
    fetchAnalyticsData();
  }, [user, selectedCampaign, dateRange]);

  const fetchCampaigns = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching campaigns:', error);
      return;
    }

    setCampaigns(data || []);
  };

  const fetchAnalyticsData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Build query based on selected campaign and date range
      let query = supabase
        .from('campaign_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', dateRange.from.toISOString().split('T')[0])
        .lte('date', dateRange.to.toISOString().split('T')[0]);

      if (selectedCampaign !== 'all') {
        query = query.eq('campaign_id', selectedCampaign);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching analytics:', error);
        toast({
          title: "Error",
          description: "Failed to fetch analytics data",
          variant: "destructive",
        });
        return;
      }

      // Aggregate the analytics data
      const aggregated = (data || []).reduce((acc, record) => ({
        totalCalls: acc.totalCalls + record.calls_attempted,
        totalConnected: acc.totalConnected + record.calls_connected,
        totalCompleted: acc.totalCompleted + record.calls_completed,
        totalHotLeads: acc.totalHotLeads + record.hot_leads,
        totalWarmLeads: acc.totalWarmLeads + record.warm_leads,
        totalColdLeads: acc.totalColdLeads + record.cold_leads,
        totalAppointments: acc.totalAppointments + record.appointments_booked,
        totalSales: acc.totalSales + record.sales_closed,
        totalCostCents: acc.totalCostCents + record.cost_total_cents,
        averageConversionRate: 0, // Will calculate separately
        averageTalkTime: '0:00' // Will calculate separately
      }), {
        totalCalls: 0,
        totalConnected: 0,
        totalCompleted: 0,
        totalHotLeads: 0,
        totalWarmLeads: 0,
        totalColdLeads: 0,
        totalAppointments: 0,
        totalSales: 0,
        totalCostCents: 0,
        averageConversionRate: 0,
        averageTalkTime: '0:00'
      });

      // Calculate conversion rate
      const successfulLeads = aggregated.totalHotLeads + aggregated.totalWarmLeads + aggregated.totalAppointments + aggregated.totalSales;
      aggregated.averageConversionRate = aggregated.totalCompleted > 0 
        ? (successfulLeads / aggregated.totalCompleted) * 100 
        : 0;

      setAnalyticsData(aggregated);
    } catch (error) {
      console.error('Error in fetchAnalyticsData:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const calculateROI = () => {
    if (analyticsData.totalCostCents === 0) return 0;
    // Assuming each sale is worth $1000 on average
    const estimatedRevenue = analyticsData.totalSales * 100000; // $1000 in cents
    return ((estimatedRevenue - analyticsData.totalCostCents) / analyticsData.totalCostCents) * 100;
  };

  const testAllCampaigns = async () => {
    if (campaigns.length === 0) {
      toast({
        title: "No campaigns found",
        description: "Create some campaigns first to test them",
        variant: "destructive"
      });
      return;
    }

    setTestingAllCampaigns(true);
    setTestResults([]);

    toast({
      title: "Testing all campaigns",
      description: `Starting tests for ${campaigns.length} campaigns...`,
    });

    for (const campaign of campaigns) {
      // Set status to running
      setTestResults(prev => [...prev.filter(r => r.campaignId !== campaign.id), {
        campaignId: campaign.id,
        campaignName: campaign.name,
        status: 'running'
      }]);

      try {
        // Test campaign by running a test call
        const { data: testResult, error } = await supabase.functions.invoke('test-call-components', {
          body: {
            test_type: 'campaign_test',
            campaign_id: campaign.id,
            phone_number: '+15551234567' // Test number
          }
        });

        if (error) throw error;

        // Update result
        setTestResults(prev => [...prev.filter(r => r.campaignId !== campaign.id), {
          campaignId: campaign.id,
          campaignName: campaign.name,
          status: testResult.success ? 'passed' : 'failed',
          details: testResult
        }]);

        toast({
          title: `Campaign "${campaign.name}" ${testResult.success ? 'passed' : 'failed'}`,
          description: testResult.message || 'Test completed',
          variant: testResult.success ? 'default' : 'destructive'
        });

      } catch (error) {
        setTestResults(prev => [...prev.filter(r => r.campaignId !== campaign.id), {
          campaignId: campaign.id,
          campaignName: campaign.name,
          status: 'failed',
          details: { error: error.message }
        }]);

        toast({
          title: `Campaign "${campaign.name}" failed`,
          description: error.message,
          variant: "destructive"
        });
      }

      // Wait 2 seconds between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    setTestingAllCampaigns(false);
    
    const passedTests = testResults.filter(r => r.status === 'passed').length;
    toast({
      title: "All campaign tests completed",
      description: `${passedTests}/${campaigns.length} campaigns passed tests`,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics & Business Intelligence</h1>
          <p className="text-muted-foreground">Comprehensive insights into your AI voice campaign performance</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={testAllCampaigns}
            disabled={testingAllCampaigns || campaigns.length === 0}
            variant="default"
          >
            {testingAllCampaigns ? (
              <>
                <TestTube className="w-4 h-4 mr-2 animate-pulse" />
                Testing...
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4 mr-2" />
                Test All Campaigns
              </>
            )}
          </Button>
          
          <Button
            onClick={() => navigate('/voice-monitor')}
            variant="outline"
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Voice Monitor
          </Button>
          
          <DatePickerWithRange
            date={dateRange}
            onDateChange={(range) => {
              if (range?.from && range?.to) {
                setDateRange({ from: range.from, to: range.to });
              }
            }}
          />
          
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <ExportReports
            dateRange={dateRange}
            selectedCampaign={selectedCampaign}
            analyticsData={analyticsData}
          />
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalCalls.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">
                {analyticsData.totalConnected} connected
              </Badge>
              <span className="text-xs text-muted-foreground">
                {analyticsData.totalCalls > 0 ? ((analyticsData.totalConnected / analyticsData.totalCalls) * 100).toFixed(1) : 0}% rate
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analyticsData.averageConversionRate.toFixed(1)}%
            </div>
            <Progress value={analyticsData.averageConversionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {analyticsData.totalHotLeads + analyticsData.totalWarmLeads + analyticsData.totalAppointments + analyticsData.totalSales} successful outcomes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Impact</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(analyticsData.totalCostCents)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={calculateROI() > 0 ? "default" : "destructive"}>
                ROI: {calculateROI().toFixed(1)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analyticsData.totalSales} sales closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lead Quality</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Hot Leads</span>
                <Badge variant="destructive">{analyticsData.totalHotLeads}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Warm Leads</span>
                <Badge variant="outline">{analyticsData.totalWarmLeads}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Appointments</span>
                <Badge variant="default">{analyticsData.totalAppointments}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Campaign Test Results
            </CardTitle>
            <CardDescription>
              Results from testing all campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result) => (
                <div key={result.campaignId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {result.status === 'running' && <TestTube className="w-4 h-4 text-yellow-600 animate-pulse" />}
                      {result.status === 'passed' && <div className="w-2 h-2 bg-green-600 rounded-full" />}
                      {result.status === 'failed' && <div className="w-2 h-2 bg-red-600 rounded-full" />}
                    </div>
                    <span className="font-medium">{result.campaignName}</span>
                  </div>
                  <Badge 
                    variant={result.status === 'passed' ? 'default' : result.status === 'failed' ? 'destructive' : 'outline'}
                  >
                    {result.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="outcomes" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Outcomes
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Quality
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AnalyticsOverview 
            dateRange={dateRange}
            selectedCampaign={selectedCampaign}
          />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <CampaignPerformanceChart 
            dateRange={dateRange}
            selectedCampaign={selectedCampaign}
          />
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <AgentComparisonChart 
            dateRange={dateRange}
            selectedCampaign={selectedCampaign}
          />
        </TabsContent>

        <TabsContent value="outcomes" className="space-y-6">
          <CallOutcomeDistribution 
            dateRange={dateRange}
            selectedCampaign={selectedCampaign}
          />
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <QualityControlDashboard 
            dateRange={dateRange}
            selectedCampaign={selectedCampaign}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;