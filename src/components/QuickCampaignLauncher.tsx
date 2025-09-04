import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Phone, Rocket, CheckCircle, Clock, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { normalizePhoneNumber, validateE164PhoneNumber } from '@/lib/phoneUtils';

interface Agent {
  id: string;
  name: string;
  purpose: string;
  voice_id: string;
  success_rate: number;
  opening_message: string;
}

const QuickCampaignLauncher = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [campaignName, setCampaignName] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTopAgents();
  }, []);

  const fetchTopAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('is_active', true)
        .order('success_rate', { ascending: false })
        .limit(3); // Show only top 3 agents for simplicity

      if (error) throw error;
      setAgents(data || []);
      
      // Auto-select the best performing agent
      if (data && data.length > 0) {
        setSelectedAgent(data[0]);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
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
        // Auto-detect phone column
        const headers = Object.keys(results.data[0] || {});
        const phoneColumn = headers.find(h => 
          h.toLowerCase().includes('phone') || 
          h.toLowerCase().includes('number') ||
          h.toLowerCase().includes('mobile')
        );

        if (!phoneColumn) {
          toast({
            title: "No phone column found",
            description: "Please ensure your CSV has a column with 'phone' or 'number' in the name",
            variant: "destructive",
          });
          setUploading(false);
          return;
        }

        // Process contacts
        const processedContacts = results.data
          .map((row: any) => {
            const phone = row[phoneColumn] || '';
            const normalized = normalizePhoneNumber(phone, '+1'); // Default to US
            return {
              phone_number: normalized,
              first_name: row.first_name || row.name || row.First_Name || '',
              last_name: row.last_name || row.Last_Name || '',
              company: row.company || row.Company || '',
            };
          })
          .filter(contact => validateE164PhoneNumber(contact.phone_number));

        setContacts(processedContacts);
        setUploading(false);
        
        toast({
          title: "Contacts uploaded",
          description: `Ready to call ${processedContacts.length} contacts`,
        });
      },
      error: () => {
        toast({
          title: "Upload failed",
          description: "Please check your CSV file format",
          variant: "destructive",
        });
        setUploading(false);
      }
    });
  };

  const launchCampaign = async () => {
    if (!campaignName || !selectedAgent || contacts.length === 0) return;

    setLoading(true);
    try {
      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          name: campaignName,
          status: 'active',
          user_id: user?.id,
          agent_id: selectedAgent.id,
          total_contacts: contacts.length,
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
        title: "🚀 Campaign Launched!",
        description: `${campaignName} is now live with ${contacts.length} contacts`,
      });

      // Reset for next campaign
      setCampaignName('');
      setContacts([]);
      setStep(1);

    } catch (error) {
      console.error('Error launching campaign:', error);
      toast({
        title: "Launch failed",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Launch Campaign in 3 Clicks</h1>
        <p className="text-muted-foreground">Name it. Upload contacts. Launch.</p>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                ${step >= i ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                {step > i ? <CheckCircle className="w-5 h-5" /> : i}
              </div>
              {i < 3 && (
                <div className={`w-12 h-1 ${step > i ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Name Campaign */}
      {step === 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Step 1: Name Your Campaign
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Enter campaign name (e.g., Q1 Sales Outreach)"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="text-lg"
              autoFocus
            />
            <Button 
              className="mt-4 w-full" 
              onClick={() => setStep(2)}
              disabled={!campaignName.trim()}
            >
              Next: Choose Agent
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Top Agent */}
      {step === 2 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Step 2: Your Best Performing Agent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {agents.map((agent, index) => (
                <div
                  key={agent.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-all
                    ${selectedAgent?.id === agent.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'}`}
                  onClick={() => setSelectedAgent(agent)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{agent.name}</h3>
                      <p className="text-sm text-muted-foreground">{agent.purpose}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        {Math.round(agent.success_rate)}% success
                      </Badge>
                      {index === 0 && (
                        <div className="text-xs text-primary mt-1">Recommended</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button 
              className="mt-4 w-full" 
              onClick={() => setStep(3)}
              disabled={!selectedAgent}
            >
              Next: Upload Contacts
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Upload Contacts */}
      {step === 3 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Step 3: Upload Your Contact List
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Drop your CSV file here</h3>
                <p className="text-muted-foreground mb-4">
                  Must include a phone number column
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                  disabled={uploading}
                />
                <Button asChild disabled={uploading}>
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    {uploading ? 'Processing...' : 'Choose CSV File'}
                  </label>
                </Button>
              </div>
            ) : (
              <div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">
                      {contacts.length} contacts ready to call
                    </span>
                  </div>
                </div>
                
                {/* Final Launch Button */}
                <Button 
                  className="w-full text-lg py-6 bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary transition-all duration-300"
                  onClick={launchCampaign}
                  disabled={loading}
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  {loading ? 'Launching...' : `🚀 Launch ${campaignName}`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Campaign Summary */}
      {step === 3 && contacts.length > 0 && (
        <div className="grid grid-cols-3 gap-4 text-center">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{campaignName}</div>
              <div className="text-sm text-muted-foreground">Campaign Name</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{selectedAgent?.name}</div>
              <div className="text-sm text-muted-foreground">AI Agent</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{contacts.length}</div>
              <div className="text-sm text-muted-foreground">Contacts</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default QuickCampaignLauncher;