import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Play, Download, Search, Filter, Clock, User, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";

interface CallRecord {
  id: string;
  phone_number: string;
  call_status: string;
  duration_seconds: number;
  recording_url?: string;
  transcript?: string;
  created_at: string;
  ai_summary?: string;
  contacts?: {
    first_name?: string;
    last_name?: string;
    company?: string;
  };
}

export const CallRecordingsPanel = () => {
  const [recordings, setRecordings] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('call_records')
        .select(`
          *,
          contacts(first_name, last_name, company)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRecordings(data || []);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch call recordings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRecordings = recordings.filter(record => {
    const matchesSearch = 
      record.phone_number.includes(searchTerm) ||
      record.contacts?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.contacts?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.contacts?.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || record.call_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayRecording = (recordingUrl: string) => {
    if (recordingUrl) {
      window.open(recordingUrl, '_blank');
    }
  };

  const handleDownloadRecording = async (recordingUrl: string, phoneNumber: string) => {
    if (recordingUrl) {
      try {
        const response = await fetch(recordingUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `call-${phoneNumber}-${Date.now()}.mp3`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        toast({
          title: "Download Error",
          description: "Failed to download recording",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Call Recordings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neurovoice-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Call Recordings ({filteredRecordings.length})
        </CardTitle>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by phone, name, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="in-progress">In Progress</option>
            </select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredRecordings.length === 0 ? (
          <div className="text-center py-8">
            <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No call recordings found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecordings.map((record) => (
              <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">
                        {record.contacts?.first_name && record.contacts?.last_name
                          ? `${record.contacts.first_name} ${record.contacts.last_name}`
                          : record.phone_number}
                      </span>
                    </div>
                    {record.contacts?.company && (
                      <Badge variant="outline" className="text-xs">
                        {record.contacts.company}
                      </Badge>
                    )}
                  </div>
                  <Badge className={getStatusColor(record.call_status)}>
                    {record.call_status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {record.phone_number}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(record.duration_seconds)}
                  </div>
                  <div>
                    {formatDistanceToNow(new Date(record.created_at), { addSuffix: true })}
                  </div>
                </div>

                {record.ai_summary && (
                  <div className="bg-blue-50 p-3 rounded mb-3">
                    <p className="text-sm text-blue-800">
                      <strong>AI Summary:</strong> {record.ai_summary}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {record.recording_url && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePlayRecording(record.recording_url!)}
                        className="flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Play
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadRecording(record.recording_url!, record.phone_number)}
                        className="flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                    </>
                  )}
                  {!record.recording_url && (
                    <span className="text-xs text-gray-500">No recording available</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};