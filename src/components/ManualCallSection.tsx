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
    
    // Handle UK numbers (11 digits starting with 44 or just 11 digits)
    if (digits.length === 11 && (digits.startsWith('44') || digits.startsWith('07') || digits.startsWith('01') || digits.startsWith('02'))) {
      // UK format: +44 XXXX XXX XXX or 0XXXX XXX XXX
      if (digits.startsWith('44')) {
        return `+${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
      } else {
        return `${digits.slice(0, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
      }
    }
    // US format: (XXX) XXX-XXXX
    else if (digits.length >= 6 && digits.length <= 10) {
      if (digits.length >= 6) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
      } else if (digits.length >= 3) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      }
    }
    // International format: just return digits with + if it starts with country code
    else if (digits.length > 11) {
      return `+${digits}`;
    }
    
    return digits;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const validatePhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    // Accept US (10 digits), UK (11 digits), or international (7-15 digits)
    return digits.length >= 7 && digits.length <= 15;
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
        description: "Please enter a valid phone number (7-15 digits)",
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
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          useSimpleTwiml: true // Debug: route via simple TwiML to isolate AI handler issues
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
    <Card className="border border-muted bg-card shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-foreground">
          <div className="p-2 rounded-lg bg-muted/50">
            <Phone className="w-5 h-5 text-muted-foreground" />
          </div>
          Manual Call
        </CardTitle>
        <CardDescription className="text-muted-foreground leading-relaxed">
          Initiate an instant call with any AI agent to a specific phone number
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="agent-select" className="text-sm font-medium text-foreground">
            AI Agent Selection
          </Label>
          <Select value={selectedAgent} onValueChange={setSelectedAgent} disabled={fetchingAgents}>
            <SelectTrigger className="h-11 border-muted focus:border-muted-foreground transition-colors">
              <SelectValue placeholder={fetchingAgents ? "Loading agents..." : "Select an AI agent"} />
            </SelectTrigger>
            <SelectContent className="max-h-80 bg-card border-muted">
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id} className="py-4 px-3 focus:bg-muted/50">
                  <div className="flex items-start gap-3 w-full">
                    <div className="p-1.5 rounded-md bg-muted/80 border border-muted mt-0.5 shrink-0">
                      <Bot className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="font-medium text-sm text-foreground truncate">{agent.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {agent.purpose}
                      </div>
                      <div className="flex items-center gap-1 pt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted border border-muted-foreground/20 text-muted-foreground">
                          {agent.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label htmlFor="phone-input" className="text-sm font-medium text-foreground">
            Phone Number
          </Label>
          <Input
            id="phone-input"
            type="tel"
            placeholder="UK: 07XXX XXX XXX or US: (555) 123-4567"
            value={phoneNumber}
            onChange={handlePhoneChange}
            maxLength={20}
            className="h-11 font-mono border-muted focus:border-muted-foreground transition-colors"
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Supports UK (+44), US, and international phone number formats
          </p>
        </div>

        <Button 
          onClick={handleMakeCall}
          disabled={loading || !selectedAgent || !phoneNumber || !validatePhoneNumber(phoneNumber)}
          className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Initiating Call...
            </>
          ) : (
            <>
              <Phone className="w-4 h-4 mr-2" />
              Initiate Call
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};