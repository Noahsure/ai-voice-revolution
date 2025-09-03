import { useState } from 'react';
import { ArrowLeft, ArrowRight, Save, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AIScriptBuilder from './AIScriptBuilder';

interface AgentBuilderProps {
  onClose: () => void;
}

const voices = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (Professional Female)' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam (Energetic Male)' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica (Warm Female)' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (Deep Male)' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily (Friendly Female)' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian (Professional Male)' },
];

const AgentBuilder = ({ onClose }: AgentBuilderProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    purpose: '',
    voice_id: '',
    language: 'en-US',
    personality: 'professional',
    opening_message: '',
    system_prompt: '',
    knowledge_base: '',
    max_call_duration: 300,
    professionalism: [7],
    friendliness: [6],
    persistence: [5],
    patience: [7]
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const totalSteps = 4;

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveAgent = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const agentData = {
        user_id: user.id,
        name: formData.name,
        type: 'custom',
        purpose: formData.purpose,
        voice_id: formData.voice_id,
        language: formData.language,
        personality: formData.personality,
        opening_message: formData.opening_message,
        system_prompt: formData.system_prompt,
        knowledge_base: formData.knowledge_base,
        max_call_duration: formData.max_call_duration,
        objection_handlers: {},
        success_rate: 0,
        avg_call_duration: '0:00'
      };

      const { error } = await supabase
        .from('ai_agents')
        .insert([agentData]);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your custom AI agent has been created successfully.",
      });

      onClose();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast({
        title: "Error",
        description: "Failed to create agent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAIContentGenerated = (content: string, type: 'opening' | 'system' | 'knowledge') => {
    switch (type) {
      case 'opening':
        updateFormData('opening_message', content);
        break;
      case 'system':
        updateFormData('system_prompt', content);
        break;
      case 'knowledge':
        updateFormData('knowledge_base', content);
        break;
    }
  };

  const testVoice = async (voiceId: string) => {
    try {
      const sampleText = "Hello! This is a preview of my voice. I'm excited to help you with your business needs and provide excellent customer service. How does this sound?";
      
      toast({
        title: "Voice Preview",
        description: "Generating voice sample...",
      });

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: sampleText,
          voiceId: voiceId,
          provider: 'elevenlabs'
        }
      });

      if (error) throw error;

      if (data.audioContent) {
        // Create audio blob and play it
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.play().then(() => {
          toast({
            title: "Voice Preview",
            description: "Playing voice sample - listen carefully!",
          });
          
          // Clean up the URL after playing
          audio.onended = () => URL.revokeObjectURL(audioUrl);
        }).catch((error) => {
          console.error('Audio playback failed:', error);
          toast({
            title: "Playback Error",
            description: "Could not play audio. Please check your browser settings.",
            variant: "destructive",
          });
        });
      }
    } catch (error) {
      console.error('Voice preview error:', error);
      toast({
        title: "Voice Preview Error",
        description: error.message || 'Failed to generate voice preview',
        variant: "destructive",
      });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Alex - Custom Sales Agent"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="purpose">Purpose</Label>
                  <Select value={formData.purpose} onValueChange={(value) => updateFormData('purpose', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select agent purpose" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-background border shadow-lg">
                      <SelectItem value="sales" className="cursor-pointer px-3 py-2 hover:bg-accent">Sales Specialist</SelectItem>
                      <SelectItem value="support" className="cursor-pointer px-3 py-2 hover:bg-accent">Customer Support</SelectItem>
                      <SelectItem value="appointment" className="cursor-pointer px-3 py-2 hover:bg-accent">Appointment Booking</SelectItem>
                      <SelectItem value="survey" className="cursor-pointer px-3 py-2 hover:bg-accent">Survey & Research</SelectItem>
                      <SelectItem value="collection" className="cursor-pointer px-3 py-2 hover:bg-accent">Debt Collection</SelectItem>
                      <SelectItem value="qualification" className="cursor-pointer px-3 py-2 hover:bg-accent">Lead Qualification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={formData.language} onValueChange={(value) => updateFormData('language', value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-background border shadow-lg">
                      <SelectItem value="en-US" className="cursor-pointer px-3 py-2 hover:bg-accent">English (US)</SelectItem>
                      <SelectItem value="en-GB" className="cursor-pointer px-3 py-2 hover:bg-accent">English (UK)</SelectItem>
                      <SelectItem value="es-ES" className="cursor-pointer px-3 py-2 hover:bg-accent">Spanish</SelectItem>
                      <SelectItem value="fr-FR" className="cursor-pointer px-3 py-2 hover:bg-accent">French</SelectItem>
                      <SelectItem value="de-DE" className="cursor-pointer px-3 py-2 hover:bg-accent">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">Voice Selection</h3>
              <div className="grid gap-4">
                {voices.map((voice) => (
                  <Card
                    key={voice.id}
                    className={`cursor-pointer transition-all ${
                      formData.voice_id === voice.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => updateFormData('voice_id', voice.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{voice.name}</h4>
                          {formData.voice_id === voice.id && (
                            <Badge className="mt-1 bg-primary text-white">Selected</Badge>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            testVoice(voice.id);
                          }}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-4">Personality & Traits</h3>
              <div className="space-y-6">
                <div>
                  <Label>Professionalism</Label>
                  <div className="px-3 pt-2">
                    <Slider
                      value={formData.professionalism}
                      onValueChange={(value) => updateFormData('professionalism', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Casual</span>
                      <span>Very Professional</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Friendliness</Label>
                  <div className="px-3 pt-2">
                    <Slider
                      value={formData.friendliness}
                      onValueChange={(value) => updateFormData('friendliness', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Formal</span>
                      <span>Very Friendly</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Persistence</Label>
                  <div className="px-3 pt-2">
                    <Slider
                      value={formData.persistence}
                      onValueChange={(value) => updateFormData('persistence', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Gentle</span>
                      <span>Very Persistent</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Patience</Label>
                  <div className="px-3 pt-2">
                    <Slider
                      value={formData.patience}
                      onValueChange={(value) => updateFormData('patience', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Direct</span>
                      <span>Very Patient</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {/* AI Script Builder Section */}
            <AIScriptBuilder onContentGenerated={handleAIContentGenerated} />
            
            {/* Separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or customize manually</span>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">Manual Script & Knowledge Entry</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="opening_message">Opening Message</Label>
                  <Textarea
                    id="opening_message"
                    placeholder="Hi, this is [Name] calling about..."
                    value={formData.opening_message}
                    onChange={(e) => updateFormData('opening_message', e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="system_prompt">System Prompt</Label>
                  <Textarea
                    id="system_prompt"
                    placeholder="You are a helpful agent specializing in..."
                    value={formData.system_prompt}
                    onChange={(e) => updateFormData('system_prompt', e.target.value)}
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="knowledge_base">Knowledge Base</Label>
                  <Textarea
                    id="knowledge_base"
                    placeholder="Key information, FAQs, product details..."
                    value={formData.knowledge_base}
                    onChange={(e) => updateFormData('knowledge_base', e.target.value)}
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="max_duration">Max Call Duration (seconds)</Label>
                  <Input
                    id="max_duration"
                    type="number"
                    value={formData.max_call_duration}
                    onChange={(e) => updateFormData('max_call_duration', parseInt(e.target.value))}
                    min={60}
                    max={1800}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Create Custom AI Agent</CardTitle>
              <CardDescription>
                Step {currentStep} of {totalSteps}
              </CardDescription>
            </div>
            <Button variant="ghost" onClick={onClose}>
              ×
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2 mt-4">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {renderStep()}
        </CardContent>

        <div className="border-t p-6">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={nextStep}
                disabled={
                  (currentStep === 1 && (!formData.name || !formData.purpose)) ||
                  (currentStep === 2 && !formData.voice_id)
                }
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={saveAgent}
                disabled={saving || !formData.opening_message || !formData.system_prompt}
                className="gradient-primary text-white"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Agent
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AgentBuilder;