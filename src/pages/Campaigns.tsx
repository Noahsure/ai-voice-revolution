import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Plus, BarChart3, Pause, Play, Edit, Users, Phone, TrendingUp, CheckCircle, PhoneCall, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import CampaignBuilder from '@/components/campaigns/CampaignBuilder';

interface Campaign {
  id: string;
  name: string;
  status: string;
  created_at: string;
  total_contacts: number;
  completed_calls: number;
  success_rate: number;
  agent_id: string;
  ai_agents?: {
    name: string;
  };
}

const Campaigns: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user]);

  const fetchCampaigns = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        ai_agents (name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns:', error);
      return;
    }

    setCampaigns(data || []);
    setLoading(false);
  };

  const launchCampaign = async (campaignId: string) => {
    try {
      // Get campaign with agent details
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select(`
          *,
          ai_agents (
            name,
            voice_id,
            opening_message,
            system_prompt
          )
        `)
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      if (!campaign.agent_id) {
        toast({
          title: "No agent assigned",
          description: "Please assign an AI agent to this campaign before launching.",
          variant: "destructive",
        });
        return;
      }

      // Get campaign contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('call_status', 'pending')
        .limit(10); // Start with first 10 contacts

      if (!contacts || contacts.length === 0) {
        toast({
          title: "No contacts available",
          description: "Add contacts to this campaign before launching.",
          variant: "destructive",
        });
        return;
      }

      // Update campaign status
      await supabase
        .from('campaigns')
        .update({ status: 'active' })
        .eq('id', campaignId);

      toast({
        title: "Campaign launched",
        description: `Starting calls for ${contacts.length} contacts with ${campaign.ai_agents?.name}`,
      });

      // Start calling contacts (simplified for demo - in production this would be handled by background jobs)
      for (const contact of contacts.slice(0, 3)) { // Demo: only first 3 contacts
        const { error } = await supabase.functions.invoke('initiate-outbound-call', {
          body: {
            campaignId,
            contactId: contact.id,
            agentId: campaign.agent_id,
            phoneNumber: contact.phone_number
          }
        });

        if (error) {
          console.error('Error initiating call:', error);
        }

        // Wait 5 seconds between calls for demo
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      fetchCampaigns();
    } catch (error) {
      console.error('Error launching campaign:', error);
      toast({
        title: "Error",
        description: "Failed to launch campaign",
        variant: "destructive",
      });
    }
  };

  const pauseCampaign = async (campaignId: string) => {
    await supabase
      .from('campaigns')
      .update({ status: 'paused' })
      .eq('id', campaignId);
    
    fetchCampaigns();
  };

  const resumeCampaign = async (campaignId: string) => {
    await supabase
      .from('campaigns')
      .update({ status: 'active' })
      .eq('id', campaignId);
    
    fetchCampaigns();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'draft': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-3 h-3 mr-1" />;
      case 'paused': return <Pause className="w-3 h-3 mr-1" />;
      case 'completed': return <CheckCircle className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Voice Campaigns</h1>
            <p className="text-muted-foreground">Manage and monitor your AI voice calling campaigns</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/live-monitoring')} variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Live Monitoring
          </Button>
          <CampaignBuilder onCampaignCreated={fetchCampaigns}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </CampaignBuilder>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter(c => c.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Calls</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.reduce((sum, c) => sum + (c.completed_calls || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {campaigns.length > 0 
                ? Math.round(campaigns.reduce((sum, c) => sum + (c.success_rate || 0), 0) / campaigns.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Average across campaigns</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Campaigns</CardTitle>
          <CardDescription>
            Manage your AI voice calling campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first voice campaign to start reaching your contacts.
              </p>
              <CampaignBuilder onCampaignCreated={fetchCampaigns}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </CampaignBuilder>
            </div>
          ) : (
            <div className="space-y-6">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{campaign.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
                          <span>Agent: {campaign.ai_agents?.name || 'No agent assigned'}</span>
                        </div>
                      </div>
                      <Badge className={getStatusColor(campaign.status)}>
                        {getStatusIcon(campaign.status)}
                        {campaign.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold">{campaign.total_contacts || 0}</div>
                        <div className="text-xs text-muted-foreground">Total Contacts</div>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold">{campaign.completed_calls || 0}</div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round(campaign.success_rate || 0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Success Rate</div>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold">
                          ${((campaign.completed_calls || 0) * 0.05).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">Est. Cost</div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>
                          {campaign.total_contacts > 0 
                            ? Math.round(((campaign.completed_calls || 0) / campaign.total_contacts) * 100)
                            : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={campaign.total_contacts > 0 
                          ? ((campaign.completed_calls || 0) / campaign.total_contacts) * 100
                          : 0} 
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/live-monitoring')}
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Monitor
                        </Button>
                        {campaign.status === 'active' ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => pauseCampaign(campaign.id)}
                          >
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </Button>
                        ) : campaign.status === 'paused' ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => resumeCampaign(campaign.id)}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </Button>
                        ) : campaign.status === 'draft' ? (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => launchCampaign(campaign.id)}
                          >
                            <PhoneCall className="w-4 h-4 mr-2" />
                            Launch
                          </Button>
                        ) : null}
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Campaigns;