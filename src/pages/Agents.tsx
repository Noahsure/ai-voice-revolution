import { useState, useEffect } from 'react';
import { Plus, Search, Grid, List, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AgentBuilder from '@/components/agents/AgentBuilder';

interface Agent {
  id: string;
  name: string;
  type: string;
  purpose: string;
  voice_id: string;
  language: string;
  personality: string;
  opening_message: string;
  success_rate: number;
  avg_call_duration: string;
  is_active: boolean;
}

const Agents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [purposeFilter, setPurposeFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAgentBuilder, setShowAgentBuilder] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    filterAgents();
  }, [agents, searchQuery, purposeFilter, languageFilter, typeFilter]);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('is_active', true)
        .order('success_rate', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to load AI agents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAgents = () => {
    let filtered = agents;

    if (searchQuery) {
      filtered = filtered.filter(agent =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.personality.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (purposeFilter !== 'all') {
      filtered = filtered.filter(agent => agent.purpose === purposeFilter);
    }

    if (languageFilter !== 'all') {
      filtered = filtered.filter(agent => agent.language === languageFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(agent => agent.type === typeFilter);
    }

    setFilteredAgents(filtered);
  };

  const getPurposeColor = (purpose: string) => {
    const colors = {
      sales: 'gradient-success text-white',
      support: 'gradient-info text-white',
      appointment: 'gradient-warning text-white',
      survey: 'gradient-accent text-white',
      collection: 'gradient-danger text-white',
      qualification: 'gradient-primary text-white'
    };
    return colors[purpose as keyof typeof colors] || 'bg-muted';
  };

  const playVoicePreview = async (voiceId: string, agentName: string) => {
    toast({
      title: "Voice Preview",
      description: `Playing preview for ${agentName}`,
    });
    // TODO: Implement ElevenLabs voice preview
  };

  const testAgent = (agentId: string, agentName: string) => {
    toast({
      title: "Test Agent",
      description: `Starting 30-second demo call with ${agentName}`,
    });
    // TODO: Implement agent testing
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">AI Agent Library</h1>
          <p className="text-muted-foreground mt-2">
            Choose from 50+ pre-built agents or create your own custom agent
          </p>
        </div>
        <Button 
          className="gradient-primary text-white"
          onClick={() => setShowAgentBuilder(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Custom Agent
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search agents by name or personality..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap lg:flex-nowrap">
              <Select value={purposeFilter} onValueChange={setPurposeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Purposes</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="appointment">Appointment</SelectItem>
                  <SelectItem value="survey">Survey</SelectItem>
                  <SelectItem value="collection">Collection</SelectItem>
                  <SelectItem value="qualification">Qualification</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="preset">Preset</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  <SelectItem value="en-US">English</SelectItem>
                  <SelectItem value="es-ES">Spanish</SelectItem>
                  <SelectItem value="fr-FR">French</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAgents.length} of {agents.length} agents
      </div>

      {/* Agents Grid/List */}
      <div className={viewMode === 'grid' 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
        : "space-y-4"
      }>
        {filteredAgents.map((agent) => (
          <Card key={agent.id} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg leading-tight">{agent.name}</CardTitle>
                  <CardDescription className="mt-1 capitalize">
                    {agent.personality} • {agent.language}
                  </CardDescription>
                </div>
                <Badge className={getPurposeColor(agent.purpose)}>
                  {agent.purpose}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {agent.opening_message}
              </p>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Success Rate</span>
                  <div className="font-semibold text-green-600">{agent.success_rate}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Duration</span>
                  <div className="font-semibold">{agent.avg_call_duration}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => playVoicePreview(agent.voice_id, agent.name)}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gradient-primary text-white"
                  onClick={() => testAgent(agent.id, agent.name)}
                >
                  Test Agent
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAgents.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            No agents found matching your criteria
          </div>
          <Button variant="outline" onClick={() => {
            setSearchQuery('');
            setPurposeFilter('all');
            setLanguageFilter('all');
            setTypeFilter('all');
          }}>
            Clear Filters
          </Button>
        </div>
      )}

      {/* Agent Builder Modal */}
      {showAgentBuilder && (
        <AgentBuilder onClose={() => {
          setShowAgentBuilder(false);
          fetchAgents(); // Refresh agents after creating
        }} />
      )}
    </div>
  );
};

export default Agents;