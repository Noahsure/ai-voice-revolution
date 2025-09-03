import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Bot, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Agent {
  id: string;
  name: string;
  type: string;
  purpose: string;
}

export const ManualCallSection = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingAgents, setFetchingAgents] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('id, name, type, purpose')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast({
        title: "Error",
        description: "Failed to load agents",
        variant: "destructive",
      });
    } finally {
      setFetchingAgents(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length >= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    } else if (digits.length >= 3) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return digits;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const validatePhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10;
  };

  const handleMakeCall = async () => {
    if (!selectedAgent) {
      toast({
        title: "Agent Required",
        description: "Please select an AI agent",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create a temporary contact for this manual call
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          phone_number: phoneNumber.replace(/\D/g, ''),
          first_name: 'Manual Call',
          last_name: '',
          user_id: user?.id,
          call_status: 'pending'
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // Initiate the call
      const { data, error } = await supabase.functions.invoke('initiate-outbound-call', {
        body: {
          campaignId: null,
          contactId: contact.id,
          agentId: selectedAgent,
          phoneNumber: phoneNumber.replace(/\D/g, '')
        }
      });

      if (error) throw error;

      toast({
        title: "Call Initiated",
        description: `Manual call to ${phoneNumber} has been started`,
      });

      // Reset form
      setPhoneNumber('');
      setSelectedAgent('');

    } catch (error) {
      console.error('Error making manual call:', error);
      toast({
        title: "Call Failed",
        description: error instanceof Error ? error.message : "Failed to initiate call",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-accent" />
          Make Manual Call
        </CardTitle>
        <CardDescription>
          Start an instant call with any AI agent to a specific number
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="agent-select">Select AI Agent</Label>
          <Select value={selectedAgent} onValueChange={setSelectedAgent} disabled={fetchingAgents}>
            <SelectTrigger>
              <SelectValue placeholder={fetchingAgents ? "Loading agents..." : "Choose an agent"} />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {agent.purpose} • {agent.type}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone-input">Phone Number</Label>
          <Input
            id="phone-input"
            type="tel"
            placeholder="(555) 123-4567"
            value={phoneNumber}
            onChange={handlePhoneChange}
            maxLength={14}
          />
        </div>

        <Button 
          onClick={handleMakeCall}
          disabled={loading || !selectedAgent || !phoneNumber || !validatePhoneNumber(phoneNumber)}
          className="w-full"
          variant="hero"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Initiating Call...
            </>
          ) : (
            <>
              <Phone className="w-4 h-4 mr-2" />
              Make Call Now
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};