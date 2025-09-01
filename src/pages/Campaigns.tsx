import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, ArrowLeft, Plus, Play, Pause, BarChart3, Users, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Campaigns = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns] = useState([
    {
      id: '1',
      name: 'Q1 Lead Generation',
      status: 'active',
      contacts: 1250,
      completed: 320,
      inProgress: 15,
      scheduled: 915,
      created: '2024-01-15',
      agent: 'Sarah - Sales Pro'
    },
    {
      id: '2', 
      name: 'Customer Follow-up',
      status: 'paused',
      contacts: 500,
      completed: 500,
      inProgress: 0,
      scheduled: 0,
      created: '2024-01-10',
      agent: 'Mike - Support Specialist'
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/20';
      case 'paused': return 'bg-warning/10 text-warning border-warning/20';
      case 'completed': return 'bg-muted text-muted-foreground border-muted';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-3 h-3 mr-1" />;
      case 'paused': return <Pause className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Phone className="w-6 h-6 text-nexavoice-primary" />
                <span className="text-xl font-bold nexavoice-text-gradient">NEXAVOICE</span>
              </div>
            </div>
            <Button 
              variant="hero" 
              onClick={() => navigate('/campaigns/new')}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">AI Voice Campaigns</h1>
          <p className="text-muted-foreground text-lg">
            Manage your automated calling campaigns
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Campaigns</CardDescription>
              <CardTitle className="text-3xl nexavoice-text-gradient">
                {campaigns.filter(c => c.status === 'active').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Contacts</CardDescription>
              <CardTitle className="text-3xl nexavoice-text-gradient">
                {campaigns.reduce((sum, c) => sum + c.contacts, 0).toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Calls Completed</CardDescription>
              <CardTitle className="text-3xl nexavoice-text-gradient">
                {campaigns.reduce((sum, c) => sum + c.completed, 0).toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Success Rate</CardDescription>
              <CardTitle className="text-3xl nexavoice-text-gradient">89%</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Campaigns List */}
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <Phone className="w-16 h-16 text-muted-foreground/50" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">No campaigns yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Create your first AI voice campaign to get started
                  </p>
                  <Button 
                    variant="hero"
                    onClick={() => navigate('/campaigns/new')}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Campaign
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{campaign.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Created {new Date(campaign.created).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className={getStatusColor(campaign.status)}>
                      {getStatusIcon(campaign.status)}
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{campaign.contacts.toLocaleString()} contacts</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-success font-medium">{campaign.completed}</span> completed
                    </div>
                    <div className="text-sm">
                      <span className="text-nexavoice-primary font-medium">{campaign.inProgress}</span> in progress
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground font-medium">{campaign.scheduled}</span> scheduled
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{Math.round((campaign.completed / campaign.contacts) * 100)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-hero h-2 rounded-full transition-all"
                        style={{ width: `${(campaign.completed / campaign.contacts) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Agent: <span className="text-foreground font-medium">{campaign.agent}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Analytics
                      </Button>
                      <Button variant="outline" size="sm">
                        {campaign.status === 'active' ? 'Pause' : 'Resume'}
                      </Button>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Campaigns;