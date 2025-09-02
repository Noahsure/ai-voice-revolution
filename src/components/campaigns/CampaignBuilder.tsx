import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Upload, Plus, Users, Phone, Play, Volume2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

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

interface CampaignBuilderProps {
  onCampaignCreated: () => void;
  children: React.ReactNode;
}

const CampaignBuilder: React.FC<CampaignBuilderProps> = ({ onCampaignCreated, children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  
  // Campaign data
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  
  // Agents and contacts
  const [agents, setAgents] = useState<Agent[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<{[key: string]: string}>({});
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAgents();
    }
  }, [open]);

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
        setCsvData(results.data);
        
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
          total_contacts: contacts.length
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

      // Reset form
      setCampaignName('');
      setCampaignDescription('');
      setSelectedAgent('');
      setContacts([]);
      setCsvData([]);
      setStep(1);
      setOpen(false);

      onCampaignCreated();
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step >= stepNum ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={`w-24 h-1 mx-4 ${step > stepNum ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Campaign Details */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Campaign Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter campaign name..."
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your campaign objectives..."
                    value={campaignDescription}
                    onChange={(e) => setCampaignDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Select Agent */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select AI Agent</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {agents.map((agent) => (
                  <Card 
                    key={agent.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedAgent === agent.id ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedAgent(agent.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{agent.name}</h4>
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
                      <div className="space-y-2 text-sm">
                        <div className="flex gap-2">
                          <Badge variant="outline">{agent.purpose}</Badge>
                          <Badge variant="outline">{agent.language}</Badge>
                        </div>
                        <p className="text-muted-foreground text-xs line-clamp-2">
                          {agent.opening_message}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">{agent.personality}</span>
                          <span className="text-xs font-medium text-green-600">
                            {Math.round(agent.success_rate)}% success
                          </span>
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Upload Contacts</h3>
              
              {contacts.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Upload contact file</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload a CSV file with your contacts. Required column: phone_number
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
                    <Button variant="outline" disabled={uploading} asChild>
                      <span>{uploading ? 'Processing...' : 'Choose CSV File'}</span>
                    </Button>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      <span className="font-medium">{contacts.length} contacts ready</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setContacts([]);
                        setCsvData([]);
                      }}
                    >
                      Clear & Re-upload
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="text-sm font-medium mb-2">Contact Preview:</div>
                    <div className="space-y-1 text-sm">
                      {contacts.slice(0, 5).map((contact, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <Phone className="w-3 h-3" />
                          <span>{contact.phone_number}</span>
                          <span className="text-muted-foreground">
                            {contact.first_name} {contact.last_name}
                          </span>
                          {contact.company && (
                            <span className="text-muted-foreground text-xs">({contact.company})</span>
                          )}
                        </div>
                      ))}
                      {contacts.length > 5 && (
                        <div className="text-muted-foreground text-xs">
                          ... and {contacts.length - 5} more contacts
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={step === 1}
            >
              Previous
            </Button>
            
            {step < 3 ? (
              <Button onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button
                onClick={createCampaign}
                disabled={loading || contacts.length === 0}
              >
                {loading ? 'Creating...' : 'Create Campaign'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignBuilder;