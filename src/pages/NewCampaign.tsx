import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Users, Phone, ArrowLeft, Volume2, CheckCircle, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import AgentBuilder from '@/components/agents/AgentBuilder';

interface Agent {
  id: string;
  name: string;
  purpose: string;
  language: string;
  voice_id: string;
  personality: string;
  opening_message: string;
  success_rate: number;
}

const NewCampaign = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  // Campaign data
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [customScript, setCustomScript] = useState('');
  const [customKnowledgeBase, setCustomKnowledgeBase] = useState('');
  
  // Agents and contacts
  const [agents, setAgents] = useState<Agent[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<{[key: string]: string}>({});
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAgentBuilder, setShowAgentBuilder] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

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
        description: "Failed to fetch agents",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Auto-detect column mappings
        const headers = Object.keys(results.data[0] || {});
        const mapping: {[key: string]: string} = {};
        
        headers.forEach(header => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('phone') || lowerHeader.includes('number')) {
            mapping['phone_number'] = header;
          } else if (lowerHeader.includes('first') || lowerHeader.includes('fname')) {
            mapping['first_name'] = header;
          } else if (lowerHeader.includes('last') || lowerHeader.includes('lname')) {
            mapping['last_name'] = header;
          } else if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
            mapping['email'] = header;
          } else if (lowerHeader.includes('company') || lowerHeader.includes('business')) {
            mapping['company'] = header;
          }
        });
        
        setColumnMapping(mapping);
        
        // Transform data for preview
        const transformedContacts = results.data.map((row: any) => ({
          phone_number: row[mapping.phone_number] || '',
          first_name: row[mapping.first_name] || '',
          last_name: row[mapping.last_name] || '',
          email: row[mapping.email] || '',
          company: row[mapping.company] || '',
        })).filter(contact => contact.phone_number);
        
        setContacts(transformedContacts);
        setUploading(false);
        
        toast({
          title: "File uploaded",
          description: `Found ${transformedContacts.length} valid contacts`,
        });
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast({
          title: "Error",
          description: "Failed to parse CSV file",
          variant: "destructive",
        });
        setUploading(false);
      }
    });
  };

  const playVoicePreview = async (agent: Agent) => {
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: agent.opening_message.substring(0, 100) + "...",
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
        };

        toast({
          title: "Playing voice preview",
          description: `${agent.name} - ${agent.language}`,
        });
      }
    } catch (error) {
      console.error('Error playing voice preview:', error);
      toast({
        title: "Error",
        description: "Failed to play voice preview",
        variant: "destructive",
      });
    }
  };

  const createCampaign = async () => {
    if (!campaignName.trim() || !selectedAgent || contacts.length === 0) {
      toast({
        title: "Missing information",
        description: "Please complete all steps before creating the campaign",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          name: campaignName,
          status: 'draft',
          user_id: user?.id,
          agent_id: selectedAgent,
          total_contacts: contacts.length,
          custom_script: customScript.trim() || null,
          custom_knowledge_base: customKnowledgeBase.trim() || null
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Insert contacts
      const contactsToInsert = contacts.map(contact => ({
        ...contact,
        user_id: user?.id,
        campaign_id: campaign.id,
        call_status: 'pending'
      }));

      const { error: contactsError } = await supabase
        .from('contacts')
        .insert(contactsToInsert);

      if (contactsError) throw contactsError;

      toast({
        title: "Campaign created successfully",
        description: `${campaignName} with ${contacts.length} contacts is ready to launch`,
      });

      // Navigate to campaigns page
      navigate('/campaigns');
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && (!campaignName.trim())) {
      toast({
        title: "Campaign name required",
        description: "Please enter a campaign name",
        variant: "destructive",
      });
      return;
    }
    if (step === 2 && !selectedAgent) {
      toast({
        title: "Agent selection required",
        description: "Please select an AI agent for your campaign",
        variant: "destructive",
      });
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleAgentCreated = () => {
    setShowAgentBuilder(false);
    fetchAgents(); // Refresh agents list
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/campaigns')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Campaigns
            </Button>
            <h1 className="text-2xl font-bold">Create New Campaign</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[
            { num: 1, label: "Details" },
            { num: 2, label: "Agent" },
            { num: 3, label: "Contacts" }
          ].map((stepItem, index) => (
            <div key={stepItem.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-2
                  ${step >= stepItem.num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {step > stepItem.num ? <CheckCircle className="w-5 h-5" /> : stepItem.num}
                </div>
                <span className="text-sm font-medium">{stepItem.label}</span>
              </div>
              {index < 2 && (
                <div className={`w-24 h-1 mx-8 mt-[-20px] ${step > stepItem.num ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardContent className="p-6">
            {/* Step 1: Campaign Details */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Campaign Details</h3>
                  <p className="text-muted-foreground">Set up your campaign name, description, and AI instructions</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-base">Campaign Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter campaign name..."
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-base">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your campaign objectives..."
                      value={campaignDescription}
                      onChange={(e) => setCampaignDescription(e.target.value)}
                      className="mt-2 min-h-[100px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="script" className="text-base">Custom Script/Instructions (Optional)</Label>
                    <Textarea
                      id="script"
                      placeholder="Enter specific talking points or script for this campaign..."
                      value={customScript}
                      onChange={(e) => setCustomScript(e.target.value)}
                      className="mt-2 min-h-[120px]"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      This will be combined with your selected agent's base script
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="knowledge" className="text-base">Campaign Knowledge Base (Optional)</Label>
                    <Textarea
                      id="knowledge"
                      placeholder="Enter specific product info, FAQs, or company details for this campaign..."
                      value={customKnowledgeBase}
                      onChange={(e) => setCustomKnowledgeBase(e.target.value)}
                      className="mt-2 min-h-[120px]"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Additional context that will help the AI answer campaign-specific questions
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Select Agent */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Select AI Agent</h3>
                  <p className="text-muted-foreground">Choose the AI agent that will handle your campaign calls</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
                  {/* Create New Agent Card */}
                  <Card 
                    className="cursor-pointer transition-all hover:shadow-lg border-2 border-dashed border-primary/30 hover:border-primary/50"
                    onClick={() => setShowAgentBuilder(true)}
                  >
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center min-h-[200px]">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <Plus className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="font-bold text-lg mb-2">Create New Agent</h4>
                      <p className="text-muted-foreground text-sm">
                        Build a custom AI agent tailored to your specific needs
                      </p>
                    </CardContent>
                  </Card>

                  {agents.map((agent) => (
                    <Card 
                      key={agent.id} 
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        selectedAgent === agent.id ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedAgent(agent.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-bold text-lg">{agent.name}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              playVoicePreview(agent);
                            }}
                          >
                            <Volume2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{agent.purpose}</Badge>
                            <Badge variant="outline">{agent.language}</Badge>
                            <Badge variant="outline">{agent.personality}</Badge>
                          </div>
                          <p className="text-muted-foreground text-sm line-clamp-3">
                            {agent.opening_message}
                          </p>
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-sm font-medium text-green-600">
                              {Math.round(agent.success_rate)}% success rate
                            </span>
                            {selectedAgent === agent.id && (
                              <CheckCircle className="w-5 h-5 text-primary" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Upload Contacts */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Upload Contacts</h3>
                  <p className="text-muted-foreground">Upload a CSV file with your contact information</p>
                </div>
                
                {contacts.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                    <Upload className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">Upload contact file</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Upload a CSV file with your contacts. Required column: phone_number. 
                      Optional columns: first_name, last_name, email, company
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      disabled={uploading}
                    />
                    <label htmlFor="file-upload">
                      <Button variant="hero" size="lg" disabled={uploading} asChild>
                        <span>{uploading ? 'Processing...' : 'Choose CSV File'}</span>
                      </Button>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                          <Users className="w-6 h-6 text-success" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">{contacts.length} contacts ready</h4>
                          <p className="text-muted-foreground">Your contacts have been processed successfully</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setContacts([]);
                          setColumnMapping({});
                        }}
                      >
                        Upload Different File
                      </Button>
                    </div>
                    
                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                      <div className="font-semibold mb-3">Contact Preview:</div>
                      <div className="space-y-2">
                        {contacts.slice(0, 5).map((contact, index) => (
                          <div key={index} className="flex items-center gap-4 p-2 bg-muted/30 rounded">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{contact.phone_number}</span>
                            <span className="text-muted-foreground">
                              {contact.first_name} {contact.last_name}
                            </span>
                            {contact.company && (
                              <Badge variant="outline" className="text-xs">{contact.company}</Badge>
                            )}
                          </div>
                        ))}
                        {contacts.length > 5 && (
                          <div className="text-center text-muted-foreground text-sm py-2">
                            ... and {contacts.length - 5} more contacts
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            size="lg"
            onClick={prevStep}
            disabled={step === 1}
          >
            Previous
          </Button>
          
          {step < 3 ? (
            <Button size="lg" onClick={nextStep} variant="hero">
              Next Step
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={createCampaign}
              disabled={loading || contacts.length === 0}
              variant="hero"
            >
              {loading ? 'Creating Campaign...' : 'Create Campaign'}
            </Button>
          )}
        </div>
      </div>

      {/* Agent Builder Modal */}
      {showAgentBuilder && (
        <AgentBuilder onClose={handleAgentCreated} />
      )}
    </div>
  );
};

export default NewCampaign;