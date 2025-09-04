import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Volume2, 
  Search, 
  Filter, 
  TrendingUp, 
  Users, 
  Phone,
  Star,
  Play,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  name: string;
  purpose: string;
  language: string;
  voice_id: string;
  personality: string;
  opening_message: string;
  success_rate: number;
  avg_call_duration: string;
  type: 'preset' | 'custom';
}

interface OptimizedAgentSelectorProps {
  onAgentSelect: (agent: Agent) => void;
  selectedAgentId?: string;
  showQuickActions?: boolean;
}

const OptimizedAgentSelector: React.FC<OptimizedAgentSelectorProps> = ({
  onAgentSelect,
  selectedAgentId,
  showQuickActions = true
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'success_rate' | 'name' | 'recent'>('success_rate');
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    filterAndSortAgents();
  }, [agents, searchTerm, purposeFilter, sortBy]);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('is_active', true)
        .order('success_rate', { ascending: false });

      if (error) throw error;
      
      // Type-cast the data to match our Agent interface
      const typedAgents: Agent[] = (data || []).map(agent => ({
        ...agent,
        type: agent.type as 'preset' | 'custom'
      }));
      
      setAgents(typedAgents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error loading agents",
        description: "Please refresh the page",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortAgents = () => {
    let filtered = agents.filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           agent.purpose.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPurpose = purposeFilter === 'all' || agent.purpose === purposeFilter;
      
      return matchesSearch && matchesPurpose;
    });

    // Sort agents
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'success_rate':
          return b.success_rate - a.success_rate;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
          return a.type === 'custom' ? -1 : 1; // Custom agents first
        default:
          return 0;
      }
    });

    setFilteredAgents(filtered);
  };

  const playVoicePreview = async (agent: Agent) => {
    if (playingVoice === agent.id) return;
    
    setPlayingVoice(agent.id);
    try {
      const sampleText = agent.opening_message.length > 100 
        ? agent.opening_message.substring(0, 100) + "..." 
        : agent.opening_message;

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: sampleText,
          voice_id: agent.voice_id,
          model: 'eleven_multilingual_v2'
        }
      });

      if (error) throw error;

      if (data?.audioContent) {
        const audioBlob = new Blob([
          Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))
        ], { type: 'audio/mpeg' });
        
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.play();
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          setPlayingVoice(null);
        };

        toast({
          title: "🎵 Voice Preview",
          description: `Playing ${agent.name}'s voice`,
        });
      }
    } catch (error) {
      console.error('Error playing voice preview:', error);
      toast({
        title: "Preview failed",
        description: "Unable to play voice sample",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setPlayingVoice(null), 3000); // Auto-clear after 3s
    }
  };

  const getAgentRecommendation = (agent: Agent): string | null => {
    if (agent.success_rate >= 90) return "Top Performer";
    if (agent.type === 'custom') return "Your Custom Agent";
    if (agent.purpose === 'sales' && agent.success_rate >= 80) return "Sales Specialist";
    return null;
  };

  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 90) return "text-green-600 bg-green-50";
    if (rate >= 75) return "text-blue-600 bg-blue-50";
    if (rate >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Choose Your AI Agent</h3>
          <p className="text-sm text-muted-foreground">
            Select the perfect agent for your campaign
          </p>
        </div>
        
        {showQuickActions && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Create Custom Agent
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={purposeFilter} onValueChange={setPurposeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Purpose" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Purposes</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="support">Support</SelectItem>
            <SelectItem value="appointment">Appointments</SelectItem>
            <SelectItem value="survey">Surveys</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="success_rate">Success Rate</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="recent">Custom First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((agent) => {
          const recommendation = getAgentRecommendation(agent);
          const isSelected = selectedAgentId === agent.id;
          
          return (
            <Card 
              key={agent.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected 
                  ? 'ring-2 ring-primary bg-primary/5 border-primary' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => onAgentSelect(agent)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {agent.name}
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-primary" />
                      )}
                    </CardTitle>
                    {recommendation && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        {recommendation}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      playVoicePreview(agent);
                    }}
                    disabled={playingVoice === agent.id}
                  >
                    {playingVoice === agent.id ? (
                      <Volume2 className="w-4 h-4 animate-pulse text-primary" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-3">
                {/* Key Stats */}
                <div className="flex items-center justify-between text-sm">
                  <Badge variant="outline" className="capitalize">
                    {agent.purpose}
                  </Badge>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSuccessRateColor(agent.success_rate)}`}>
                    {Math.round(agent.success_rate)}% success
                  </div>
                </div>

                {/* Opening Message Preview */}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  "{agent.opening_message}"
                </p>

                {/* Agent Details */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {agent.personality}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {agent.avg_call_duration}
                  </span>
                </div>

                {/* Language & Voice */}
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="outline" className="text-xs">
                    {agent.language}
                  </Badge>
                  {agent.type === 'custom' && (
                    <Badge variant="default" className="text-xs">
                      Your Agent
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No agents found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search or filters
          </p>
          <Button variant="outline">
            Create Custom Agent
          </Button>
        </div>
      )}
    </div>
  );
};

export default OptimizedAgentSelector;