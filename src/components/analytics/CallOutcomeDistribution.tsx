import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, FunnelChart, Funnel, LabelList } from 'recharts';
import { PieChart as PieChartIcon, TrendingUp, Target, Users } from 'lucide-react';

interface CallOutcomeProps {
  dateRange: { from: Date; to: Date };
  selectedCampaign: string;
}

interface OutcomeData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface CallStatusData {
  status: string;
  count: number;
  percentage: number;
}

export const CallOutcomeDistribution: React.FC<CallOutcomeProps> = ({
  dateRange,
  selectedCampaign
}) => {
  const { user } = useAuth();
  const [outcomeData, setOutcomeData] = useState<OutcomeData[]>([]);
  const [statusData, setStatusData] = useState<CallStatusData[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchOutcomeDistribution();
  }, [user, dateRange, selectedCampaign]);

  const fetchOutcomeDistribution = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('call_records')
        .select('call_status, call_outcome, duration_seconds')
        .eq('user_id', user.id)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (selectedCampaign !== 'all') {
        query = query.eq('campaign_id', selectedCampaign);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching outcome distribution:', error);
        return;
      }

      const records = data || [];
      const totalCalls = records.length;

      // Process call outcomes
      const outcomeCounts = records.reduce((acc: Record<string, number>, record) => {
        const outcome = record.call_outcome || 'no_outcome';
        acc[outcome] = (acc[outcome] || 0) + 1;
        return acc;
      }, {});

      const outcomeColors: Record<string, string> = {
        'hot_lead': '#ef4444',      // Red
        'warm_lead': '#f97316',     // Orange
        'cold_lead': '#3b82f6',     // Blue
        'appointment': '#22c55e',   // Green
        'sale': '#8b5cf6',          // Purple
        'complaint': '#dc2626',     // Dark red
        'no_answer': '#6b7280',     // Gray
        'no_outcome': '#9ca3af'     // Light gray
      };

      const outcomeLabels: Record<string, string> = {
        'hot_lead': 'Hot Lead',
        'warm_lead': 'Warm Lead',
        'cold_lead': 'Cold Lead',
        'appointment': 'Appointment',
        'sale': 'Sale',
        'complaint': 'Complaint',
        'no_answer': 'No Answer',
        'no_outcome': 'No Outcome'
      };

      const processedOutcomes = Object.entries(outcomeCounts).map(([outcome, count]) => ({
        name: outcomeLabels[outcome] || outcome,
        value: count,
        color: outcomeColors[outcome] || '#6b7280',
        percentage: totalCalls > 0 ? (count / totalCalls) * 100 : 0
      }));

      setOutcomeData(processedOutcomes);

      // Process call statuses
      const statusCounts = records.reduce((acc: Record<string, number>, record) => {
        const status = record.call_status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const processedStatuses = Object.entries(statusCounts).map(([status, count]) => ({
        status: status.replace('_', ' ').toUpperCase(),
        count,
        percentage: totalCalls > 0 ? (count / totalCalls) * 100 : 0
      }));

      setStatusData(processedStatuses);

      // Create funnel data
      const initiated = records.length;
      const connected = records.filter(r => ['completed', 'in_progress'].includes(r.call_status)).length;
      const engaged = records.filter(r => r.duration_seconds > 30).length;
      const qualified = records.filter(r => ['hot_lead', 'warm_lead', 'appointment', 'sale'].includes(r.call_outcome)).length;
      const converted = records.filter(r => ['appointment', 'sale'].includes(r.call_outcome)).length;

      const funnelSteps = [
        { name: 'Calls Initiated', value: initiated, fill: 'hsl(var(--primary))' },
        { name: 'Calls Connected', value: connected, fill: 'hsl(var(--success))' },
        { name: 'Engaged (>30s)', value: engaged, fill: 'hsl(var(--warning))' },
        { name: 'Qualified Leads', value: qualified, fill: 'hsl(var(--accent))' },
        { name: 'Conversions', value: converted, fill: 'hsl(var(--destructive))' }
      ];

      setFunnelData(funnelSteps);

    } catch (error) {
      console.error('Error in fetchOutcomeDistribution:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent>
                <div className="h-80 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalOutcomes = outcomeData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      {/* Outcome Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm font-medium">Hot Leads</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {outcomeData.find(d => d.name === 'Hot Lead')?.value || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              {(outcomeData.find(d => d.name === 'Hot Lead')?.percentage || 0).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm font-medium">Warm Leads</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {outcomeData.find(d => d.name === 'Warm Lead')?.value || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              {(outcomeData.find(d => d.name === 'Warm Lead')?.percentage || 0).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Appointments</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {outcomeData.find(d => d.name === 'Appointment')?.value || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              {(outcomeData.find(d => d.name === 'Appointment')?.percentage || 0).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-sm font-medium">Sales</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {outcomeData.find(d => d.name === 'Sale')?.value || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              {(outcomeData.find(d => d.name === 'Sale')?.percentage || 0).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outcome Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Call Outcome Distribution
            </CardTitle>
            <CardDescription>
              Breakdown of call outcomes ({totalOutcomes} total calls)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={outcomeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {outcomeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    `${value} calls (${((value / totalOutcomes) * 100).toFixed(1)}%)`, 
                    name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {outcomeData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm">{item.name}</span>
                  <Badge variant="outline" className="ml-auto">
                    {item.percentage.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Call Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Call Status Distribution
            </CardTitle>
            <CardDescription>Current status of all calls</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Conversion Funnel
          </CardTitle>
          <CardDescription>Call progression from initiation to conversion</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={funnelData} 
              layout="horizontal"
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
          
          {/* Conversion rates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {funnelData.slice(1).map((step, index) => {
              const prevStep = funnelData[index];
              const conversionRate = prevStep.value > 0 ? (step.value / prevStep.value) * 100 : 0;
              return (
                <div key={step.name} className="text-center">
                  <div className="text-sm text-muted-foreground">{step.name}</div>
                  <div className="text-lg font-bold">{conversionRate.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">
                    {step.value} / {prevStep.value}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};