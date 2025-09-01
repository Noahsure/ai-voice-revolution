import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, FileText, Table, BarChart3, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportReportsProps {
  dateRange: { from: Date; to: Date };
  selectedCampaign: string;
  analyticsData: any;
}

interface ExportOptions {
  format: 'csv' | 'pdf' | 'json';
  includeCharts: boolean;
  includeRawData: boolean;
  includeSummary: boolean;
  sections: string[];
}

const EXPORT_SECTIONS = [
  { id: 'overview', label: 'Performance Overview', description: 'Key metrics and KPIs' },
  { id: 'campaigns', label: 'Campaign Analysis', description: 'Campaign-specific performance data' },
  { id: 'agents', label: 'Agent Performance', description: 'AI agent effectiveness metrics' },
  { id: 'outcomes', label: 'Call Outcomes', description: 'Detailed outcome distribution' },
  { id: 'quality', label: 'Quality Control', description: 'Quality scores and flagged calls' },
  { id: 'trends', label: 'Time-based Trends', description: 'Historical performance trends' }
];

export const ExportReports: React.FC<ExportReportsProps> = ({
  dateRange,
  selectedCampaign,
  analyticsData
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    includeCharts: false,
    includeRawData: true,
    includeSummary: true,
    sections: ['overview', 'campaigns']
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleQuickExport = async (format: 'csv' | 'pdf') => {
    setIsExporting(true);
    
    try {
      await generateReport({
        ...exportOptions,
        format,
        sections: ['overview', 'campaigns', 'agents']
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCustomExport = async () => {
    setIsExporting(true);
    
    try {
      await generateReport(exportOptions);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const generateReport = async (options: ExportOptions) => {
    if (!user) return;

    // Fetch data based on selected sections
    const reportData = await fetchReportData(options.sections);
    
    if (options.format === 'csv') {
      generateCSV(reportData, options);
    } else if (options.format === 'pdf') {
      generatePDF(reportData, options);
    } else if (options.format === 'json') {
      generateJSON(reportData, options);
    }

    toast({
      title: "Export Successful",
      description: `Report exported as ${options.format.toUpperCase()}`,
    });
  };

  const fetchReportData = async (sections: string[]) => {
    if (!user) return {};

    const data: any = {};

    try {
      // Fetch campaign analytics if needed
      if (sections.includes('campaigns') || sections.includes('overview')) {
        let query = supabase
          .from('campaign_analytics')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', dateRange.from.toISOString().split('T')[0])
          .lte('date', dateRange.to.toISOString().split('T')[0]);

        if (selectedCampaign !== 'all') {
          query = query.eq('campaign_id', selectedCampaign);
        }

        const { data: campaignData } = await query;
        data.campaignAnalytics = campaignData || [];
      }

      // Fetch call records if needed
      if (sections.includes('agents') || sections.includes('outcomes') || sections.includes('quality')) {
        let query = supabase
          .from('call_records')
          .select(`
            *,
            ai_agents (name),
            campaigns (name),
            contacts (first_name, last_name, company)
          `)
          .eq('user_id', user.id)
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());

        if (selectedCampaign !== 'all') {
          query = query.eq('campaign_id', selectedCampaign);
        }

        const { data: callData } = await query;
        data.callRecords = callData || [];
      }

    } catch (error) {
      console.error('Error fetching report data:', error);
    }

    return data;
  };

  const generateCSV = (data: any, options: ExportOptions) => {
    let csvContent = '';
    
    // Add summary section
    if (options.includeSummary) {
      csvContent += 'NEXAVOICE Analytics Report\n';
      csvContent += `Report Period: ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}\n`;
      csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
    }

    // Add campaign analytics
    if (data.campaignAnalytics && data.campaignAnalytics.length > 0) {
      csvContent += 'Campaign Analytics\n';
      csvContent += 'Date,Calls Attempted,Calls Connected,Conversions,Hot Leads,Warm Leads,Appointments,Sales,Cost\n';
      
      data.campaignAnalytics.forEach((record: any) => {
        csvContent += `${record.date},${record.calls_attempted},${record.calls_connected},`;
        csvContent += `${record.hot_leads + record.warm_leads + record.appointments_booked + record.sales_closed},`;
        csvContent += `${record.hot_leads},${record.warm_leads},${record.appointments_booked},`;
        csvContent += `${record.sales_closed},${(record.cost_total_cents / 100).toFixed(2)}\n`;
      });
      csvContent += '\n';
    }

    // Add call records if requested
    if (options.includeRawData && data.callRecords && data.callRecords.length > 0) {
      csvContent += 'Call Records\n';
      csvContent += 'Date,Phone,Duration,Status,Outcome,Agent,Campaign,Contact\n';
      
      data.callRecords.forEach((record: any) => {
        const contact = `${record.contacts?.first_name || ''} ${record.contacts?.last_name || ''}`.trim();
        csvContent += `${new Date(record.created_at).toLocaleDateString()},`;
        csvContent += `${record.phone_number},${record.duration_seconds},`;
        csvContent += `${record.call_status},${record.call_outcome || ''},`;
        csvContent += `${record.ai_agents?.name || ''},${record.campaigns?.name || ''},`;
        csvContent += `${contact}\n`;
      });
    }

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nexavoice-analytics-${dateRange.from.toISOString().split('T')[0]}-${dateRange.to.toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const generatePDF = (data: any, options: ExportOptions) => {
    // For PDF generation, we'll create a simple HTML version and use the browser's print functionality
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>NEXAVOICE Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>NEXAVOICE Analytics Report</h1>
        <div class="summary">
          <p><strong>Report Period:</strong> ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <h2>Performance Summary</h2>
        <table>
          <tr><th>Metric</th><th>Value</th></tr>
          <tr><td>Total Calls</td><td>${analyticsData.totalCalls}</td></tr>
          <tr><td>Connected Calls</td><td>${analyticsData.totalConnected}</td></tr>
          <tr><td>Conversion Rate</td><td>${analyticsData.averageConversionRate.toFixed(1)}%</td></tr>
          <tr><td>Total Cost</td><td>$${(analyticsData.totalCostCents / 100).toFixed(2)}</td></tr>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const generateJSON = (data: any, options: ExportOptions) => {
    const reportData = {
      metadata: {
        reportPeriod: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        },
        generatedAt: new Date().toISOString(),
        selectedCampaign,
        exportOptions: options
      },
      summary: options.includeSummary ? analyticsData : null,
      data: options.includeRawData ? data : null
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nexavoice-analytics-${dateRange.from.toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleSectionToggle = (sectionId: string, checked: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      sections: checked 
        ? [...prev.sections, sectionId]
        : prev.sections.filter(id => id !== sectionId)
    }));
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isExporting}>
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleQuickExport('csv')}>
            <Table className="w-4 h-4 mr-2" />
            Quick CSV Export
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickExport('pdf')}>
            <FileText className="w-4 h-4 mr-2" />
            Quick PDF Export
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Custom Export...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Custom Report Export
            </DialogTitle>
            <DialogDescription>
              Configure your analytics report export settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select 
                value={exportOptions.format} 
                onValueChange={(value: 'csv' | 'pdf' | 'json') => 
                  setExportOptions(prev => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Excel Compatible)</SelectItem>
                  <SelectItem value="pdf">PDF Report</SelectItem>
                  <SelectItem value="json">JSON Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Content Options */}
            <div className="space-y-4">
              <Label>Include in Export</Label>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="summary" 
                    checked={exportOptions.includeSummary}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeSummary: checked as boolean }))
                    }
                  />
                  <Label htmlFor="summary">Summary & Key Metrics</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="rawdata" 
                    checked={exportOptions.includeRawData}
                    onCheckedChange={(checked) => 
                      setExportOptions(prev => ({ ...prev, includeRawData: checked as boolean }))
                    }
                  />
                  <Label htmlFor="rawdata">Raw Call Data</Label>
                </div>

                {exportOptions.format === 'pdf' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="charts" 
                      checked={exportOptions.includeCharts}
                      onCheckedChange={(checked) => 
                        setExportOptions(prev => ({ ...prev, includeCharts: checked as boolean }))
                      }
                    />
                    <Label htmlFor="charts">Charts & Visualizations</Label>
                  </div>
                )}
              </div>
            </div>

            {/* Section Selection */}
            <div className="space-y-4">
              <Label>Report Sections</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {EXPORT_SECTIONS.map(section => (
                  <div key={section.id} className="flex items-start space-x-2 p-3 border rounded-lg">
                    <Checkbox 
                      id={section.id}
                      checked={exportOptions.sections.includes(section.id)}
                      onCheckedChange={(checked) => handleSectionToggle(section.id, checked as boolean)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor={section.id} className="font-medium">
                        {section.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Button */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCustomExport} disabled={isExporting || exportOptions.sections.length === 0}>
                {isExporting ? 'Exporting...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};