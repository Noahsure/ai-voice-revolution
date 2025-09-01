import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface AnalyticsOverviewProps {
  dateRange: { from: Date; to: Date };
  selectedCampaign: string;
}

interface TimeSeriesData {
  date: string;
  calls: number;
  connected: number;
  conversions: number;
  cost: number;
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({
  dateRange,
  selectedCampaign
}) => {
  const { user } = useAuth();
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchTimeSeriesData();
  }, [user, dateRange, selectedCampaign]);

  const fetchTimeSeriesData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('campaign_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', dateRange.from.toISOString().split('T')[0])
        .lte('date', dateRange.to.toISOString().split('T')[0])
        .order('date');

      if (selectedCampaign !== 'all') {
        query = query.eq('campaign_id', selectedCampaign);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching time series data:', error);
        return;
      }

      // Group by date and aggregate
      const groupedData = (data || []).reduce((acc: Record<string, any>, record) => {
        const date = record.date;
        if (!acc[date]) {
          acc[date] = {
            date,
            calls: 0,
            connected: 0,
            conversions: 0,
            cost: 0
          };
        }
        
        acc[date].calls += record.calls_attempted;
        acc[date].connected += record.calls_connected;
        acc[date].conversions += record.hot_leads + record.warm_leads + record.appointments_booked + record.sales_closed;
        acc[date].cost += record.cost_total_cents / 100;
        
        return acc;
      }, {});

      const chartData = Object.values(groupedData) as TimeSeriesData[];
      setTimeSeriesData(chartData);
    } catch (error) {
      console.error('Error in fetchTimeSeriesData:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded"></div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Call Volume Trends
            </CardTitle>
            <CardDescription>Daily call attempts and connections over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="calls" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Calls Attempted"
                />
                <Line 
                  type="monotone" 
                  dataKey="connected" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  name="Calls Connected"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversion Trends
            </CardTitle>
            <CardDescription>Daily conversions and cost analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="conversions" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  name="Conversions"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="cost" 
                  stroke="hsl(var(--warning))" 
                  strokeWidth={2}
                  name="Cost ($)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>Daily performance breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="calls" fill="hsl(var(--primary))" name="Calls Attempted" />
              <Bar dataKey="connected" fill="hsl(var(--success))" name="Calls Connected" />
              <Bar dataKey="conversions" fill="hsl(var(--accent))" name="Conversions" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};