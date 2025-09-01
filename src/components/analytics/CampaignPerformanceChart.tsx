import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Target, DollarSign } from 'lucide-react';

interface CampaignPerformanceProps {
  dateRange: { from: Date; to: Date };
  selectedCampaign: string;
}

interface CampaignData {
  id: string;
  name: string;
  totalCalls: number;
  connectedCalls: number;
  conversions: number;
  conversionRate: number;
  totalCost: number;
  costPerLead: number;
  roi: number;
}

export const CampaignPerformanceChart: React.FC<CampaignPerformanceProps> = ({
  dateRange,
  selectedCampaign
}) => {
  const { user } = useAuth();
  const [campaignData, setCampaignData] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchCampaignPerformance();
  }, [user, dateRange, selectedCampaign]);

  const fetchCampaignPerformance = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch campaigns with analytics data
      let query = supabase
        .from('campaigns')
        .select(`
          id,
          name,
          campaign_analytics (
            calls_attempted,
            calls_connected,
            hot_leads,
            warm_leads,
            appointments_booked,
            sales_closed,
            cost_total_cents
          )
        `)
        .eq('user_id', user.id);

      if (selectedCampaign !== 'all') {
        query = query.eq('id', selectedCampaign);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching campaign performance:', error);
        return;
      }

      // Process the data
      const processedData = (data || []).map((campaign: any) => {
        const analytics = campaign.campaign_analytics || [];
        
        const totals = analytics.reduce((acc: any, record: any) => ({
          calls: acc.calls + record.calls_attempted,
          connected: acc.connected + record.calls_connected,
          conversions: acc.conversions + record.hot_leads + record.warm_leads + record.appointments_booked + record.sales_closed,
          cost: acc.cost + record.cost_total_cents
        }), { calls: 0, connected: 0, conversions: 0, cost: 0 });

        const conversionRate = totals.connected > 0 ? (totals.conversions / totals.connected) * 100 : 0;
        const costPerLead = totals.conversions > 0 ? totals.cost / totals.conversions / 100 : 0;
        const estimatedRevenue = totals.conversions * 100000; // $1000 per conversion
        const roi = totals.cost > 0 ? ((estimatedRevenue - totals.cost) / totals.cost) * 100 : 0;

        return {
          id: campaign.id,
          name: campaign.name,
          totalCalls: totals.calls,
          connectedCalls: totals.connected,
          conversions: totals.conversions,
          conversionRate,
          totalCost: totals.cost / 100,
          costPerLead,
          roi
        };
      });

      setCampaignData(processedData);
    } catch (error) {
      console.error('Error in fetchCampaignPerformance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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
        <Card className="animate-pulse">
          <CardContent>
            <div className="h-80 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campaign Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {campaignData.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium truncate">{campaign.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Conversion Rate</span>
                  <Badge variant={campaign.conversionRate > 15 ? "default" : "secondary"}>
                    {campaign.conversionRate.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={campaign.conversionRate} className="mt-1" />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Calls</span>
                  <div className="font-medium">{campaign.totalCalls.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Conversions</span>
                  <div className="font-medium">{campaign.conversions}</div>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ROI</span>
                  <span className={`font-medium ${campaign.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {campaign.roi.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cost/Lead</span>
                  <span className="font-medium">
                    ${campaign.costPerLead.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Campaign Performance Comparison
          </CardTitle>
          <CardDescription>Compare key metrics across all campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={campaignData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'totalCost') return [`$${value.toFixed(2)}`, 'Total Cost'];
                  if (name === 'conversionRate') return [`${value.toFixed(1)}%`, 'Conversion Rate'];
                  return [value, name];
                }}
              />
              <Bar dataKey="totalCalls" fill="hsl(var(--primary))" name="Total Calls" />
              <Bar dataKey="conversions" fill="hsl(var(--success))" name="Conversions" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ROI and Cost Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              ROI Analysis
            </CardTitle>
            <CardDescription>Return on investment by campaign</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, 'ROI']} />
                <Bar 
                  dataKey="roi" 
                  fill="hsl(var(--success))"
                  name="ROI %" 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Cost Efficiency
            </CardTitle>
            <CardDescription>Cost per lead by campaign</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => [`$${value.toFixed(2)}`, 'Cost per Lead']} />
                <Bar 
                  dataKey="costPerLead" 
                  fill="hsl(var(--warning))"
                  name="Cost per Lead" 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};