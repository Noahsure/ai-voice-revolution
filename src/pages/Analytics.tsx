import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  Calendar
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
        
        <div className="flex flex-wrap gap-2">
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