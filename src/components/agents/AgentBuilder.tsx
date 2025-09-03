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
    // Personality Traits
    professionalism: [7],
    friendliness: [6],
    persistence: [5],
    patience: [7],
    empathy: [6],
    confidence: [7],
    humor: [4],
    adaptability: [6],
    // Communication Style
    speaking_pace: [5],
    enthusiasm: [6],
    formality: [6],
    assertiveness: [5],
    // Advanced Behavioral Settings
    interruption_handling: 'polite',
    silence_handling: 'encouraging',
    objection_style: 'consultative',
    closing_technique: 'assumptive',
    rapport_building: 'mirroring',
    emotional_intelligence: [7],
    cultural_awareness: [6],
    industry_expertise: [5],
    // Response Patterns
    response_variety: [7],
    natural_pauses: [6],
    conversational_memory: [8],
    context_retention: [7]
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const totalSteps = 6;

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
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold gradient-text mb-2">Core Personality Matrix</h3>
              <p className="text-muted-foreground">Fine-tune your agent's psychological traits for maximum human-like authenticity</p>
            </div>

            {/* Primary Personality Traits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-primary/20">
                <h4 className="font-semibold mb-4 text-primary">Fundamental Traits</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Professionalism</Label>
                      <Badge variant="outline" className="text-xs">{formData.professionalism[0]}/10</Badge>
                    </div>
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
                      <span>Corporate Executive</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Empathy</Label>
                      <Badge variant="outline" className="text-xs">{formData.empathy[0]}/10</Badge>
                    </div>
                    <Slider
                      value={formData.empathy}
                      onValueChange={(value) => updateFormData('empathy', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Task-Focused</span>
                      <span>Deeply Caring</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Confidence</Label>
                      <Badge variant="outline" className="text-xs">{formData.confidence[0]}/10</Badge>
                    </div>
                    <Slider
                      value={formData.confidence}
                      onValueChange={(value) => updateFormData('confidence', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Humble</span>
                      <span>Authoritative</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Adaptability</Label>
                      <Badge variant="outline" className="text-xs">{formData.adaptability[0]}/10</Badge>
                    </div>
                    <Slider
                      value={formData.adaptability}
                      onValueChange={(value) => updateFormData('adaptability', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Structured</span>
                      <span>Highly Flexible</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-secondary/5 via-background to-accent/5 border-secondary/20">
                <h4 className="font-semibold mb-4 text-secondary">Social Dynamics</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Friendliness</Label>
                      <Badge variant="outline" className="text-xs">{formData.friendliness[0]}/10</Badge>
                    </div>
                    <Slider
                      value={formData.friendliness}
                      onValueChange={(value) => updateFormData('friendliness', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Reserved</span>
                      <span>Warm & Engaging</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Patience</Label>
                      <Badge variant="outline" className="text-xs">{formData.patience[0]}/10</Badge>
                    </div>
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
                      <span>Endlessly Patient</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Humor Level</Label>
                      <Badge variant="outline" className="text-xs">{formData.humor[0]}/10</Badge>
                    </div>
                    <Slider
                      value={formData.humor}
                      onValueChange={(value) => updateFormData('humor', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Serious</span>
                      <span>Light & Witty</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Persistence</Label>
                      <Badge variant="outline" className="text-xs">{formData.persistence[0]}/10</Badge>
                    </div>
                    <Slider
                      value={formData.persistence}
                      onValueChange={(value) => updateFormData('persistence', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Respectful</span>
                      <span>Highly Persistent</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Advanced Intelligence Traits */}
            <Card className="p-6 bg-gradient-to-r from-accent/10 via-background to-primary/10 border-accent/30">
              <h4 className="font-semibold mb-4 text-accent flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                Advanced Intelligence Matrix
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm font-medium">Emotional Intelligence</Label>
                    <Badge variant="outline" className="text-xs bg-accent/10">{formData.emotional_intelligence[0]}/10</Badge>
                  </div>
                  <Slider
                    value={formData.emotional_intelligence}
                    onValueChange={(value) => updateFormData('emotional_intelligence', value)}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Ability to read and respond to emotions</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm font-medium">Cultural Awareness</Label>
                    <Badge variant="outline" className="text-xs bg-accent/10">{formData.cultural_awareness[0]}/10</Badge>
                  </div>
                  <Slider
                    value={formData.cultural_awareness}
                    onValueChange={(value) => updateFormData('cultural_awareness', value)}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Sensitivity to cultural differences</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm font-medium">Industry Expertise</Label>
                    <Badge variant="outline" className="text-xs bg-accent/10">{formData.industry_expertise[0]}/10</Badge>
                  </div>
                  <Slider
                    value={formData.industry_expertise}
                    onValueChange={(value) => updateFormData('industry_expertise', value)}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Domain-specific knowledge depth</p>
                </div>
              </div>
            </Card>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold gradient-text mb-2">Communication Mastery</h3>
              <p className="text-muted-foreground">Perfect your agent's speaking style and conversational flow</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Speaking Dynamics */}
              <Card className="p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-primary/20">
                <h4 className="font-semibold mb-4 text-primary">Speaking Dynamics</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Speaking Pace</Label>
                      <Badge variant="outline" className="text-xs">{formData.speaking_pace[0]}/10</Badge>
                    </div>
                    <Slider
                      value={formData.speaking_pace}
                      onValueChange={(value) => updateFormData('speaking_pace', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Slow & Deliberate</span>
                      <span>Fast & Energetic</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Enthusiasm Level</Label>
                      <Badge variant="outline" className="text-xs">{formData.enthusiasm[0]}/10</Badge>
                    </div>
                    <Slider
                      value={formData.enthusiasm}
                      onValueChange={(value) => updateFormData('enthusiasm', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Calm & Measured</span>
                      <span>Highly Enthusiastic</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Formality Level</Label>
                      <Badge variant="outline" className="text-xs">{formData.formality[0]}/10</Badge>
                    </div>
                    <Slider
                      value={formData.formality}
                      onValueChange={(value) => updateFormData('formality', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Casual & Relaxed</span>
                      <span>Highly Formal</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Assertiveness</Label>
                      <Badge variant="outline" className="text-xs">{formData.assertiveness[0]}/10</Badge>
                    </div>
                    <Slider
                      value={formData.assertiveness}
                      onValueChange={(value) => updateFormData('assertiveness', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Gentle & Supportive</span>
                      <span>Bold & Direct</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Natural Conversation Flow */}
              <Card className="p-4 bg-gradient-to-br from-secondary/5 via-background to-accent/5 border-secondary/20">
                <h4 className="font-semibold mb-4 text-secondary">Natural Flow</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Response Variety</Label>
                      <Badge variant="outline" className="text-xs">{formData.response_variety[0]}/10</Badge>
                    </div>
                    <Slider
                      value={formData.response_variety}
                      onValueChange={(value) => updateFormData('response_variety', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Consistent</span>
                      <span>Highly Varied</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Natural Pauses</Label>
                      <Badge variant="outline" className="text-xs">{formData.natural_pauses[0]}/10</Badge>
                    </div>
                    <Slider
                      value={formData.natural_pauses}
                      onValueChange={(value) => updateFormData('natural_pauses', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Continuous</span>
                      <span>Thoughtful Pauses</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Memory Retention</Label>
                      <Badge variant="outline" className="text-xs">{formData.conversational_memory[0]}/10</Badge>
                    </div>
                    <Slider
                      value={formData.conversational_memory}
                      onValueChange={(value) => updateFormData('conversational_memory', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Basic Recall</span>
                      <span>Perfect Memory</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Context Awareness</Label>
                      <Badge variant="outline" className="text-xs">{formData.context_retention[0]}/10</Badge>
                    </div>
                    <Slider
                      value={formData.context_retention}
                      onValueChange={(value) => updateFormData('context_retention', value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Focus on Present</span>
                      <span>Full Context Mastery</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold gradient-text mb-2">Advanced Behavioral Intelligence</h3>
              <p className="text-muted-foreground">Define sophisticated interaction patterns and situational responses</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Interaction Handling */}
              <Card className="p-6 bg-gradient-to-br from-primary/10 via-background to-accent/10 border-primary/30">
                <h4 className="font-semibold mb-4 text-primary flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  Interaction Mastery
                </h4>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Interruption Handling</Label>
                    <Select value={formData.interruption_handling} onValueChange={(value) => updateFormData('interruption_handling', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-background border shadow-lg">
                        <SelectItem value="polite" className="cursor-pointer px-3 py-2 hover:bg-accent">Polite & Understanding</SelectItem>
                        <SelectItem value="assertive" className="cursor-pointer px-3 py-2 hover:bg-accent">Assertive but Respectful</SelectItem>
                        <SelectItem value="adaptive" className="cursor-pointer px-3 py-2 hover:bg-accent">Adaptive to Context</SelectItem>
                        <SelectItem value="firm" className="cursor-pointer px-3 py-2 hover:bg-accent">Firm & Direct</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Silence Handling</Label>
                    <Select value={formData.silence_handling} onValueChange={(value) => updateFormData('silence_handling', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-background border shadow-lg">
                        <SelectItem value="encouraging" className="cursor-pointer px-3 py-2 hover:bg-accent">Encouraging & Supportive</SelectItem>
                        <SelectItem value="patient" className="cursor-pointer px-3 py-2 hover:bg-accent">Patient Wait</SelectItem>
                        <SelectItem value="prompting" className="cursor-pointer px-3 py-2 hover:bg-accent">Gentle Prompting</SelectItem>
                        <SelectItem value="direct" className="cursor-pointer px-3 py-2 hover:bg-accent">Direct Follow-up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Rapport Building Style</Label>
                    <Select value={formData.rapport_building} onValueChange={(value) => updateFormData('rapport_building', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-background border shadow-lg">
                        <SelectItem value="mirroring" className="cursor-pointer px-3 py-2 hover:bg-accent">Mirroring & Matching</SelectItem>
                        <SelectItem value="personal" className="cursor-pointer px-3 py-2 hover:bg-accent">Personal Connection</SelectItem>
                        <SelectItem value="professional" className="cursor-pointer px-3 py-2 hover:bg-accent">Professional Trust</SelectItem>
                        <SelectItem value="authentic" className="cursor-pointer px-3 py-2 hover:bg-accent">Authentic Relating</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Sales & Persuasion Intelligence */}
              <Card className="p-6 bg-gradient-to-br from-secondary/10 via-background to-primary/10 border-secondary/30">
                <h4 className="font-semibold mb-4 text-secondary flex items-center gap-2">
                  <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
                  Persuasion Intelligence
                </h4>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Objection Handling Style</Label>
                    <Select value={formData.objection_style} onValueChange={(value) => updateFormData('objection_style', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-background border shadow-lg">
                        <SelectItem value="consultative" className="cursor-pointer px-3 py-2 hover:bg-accent">Consultative Approach</SelectItem>
                        <SelectItem value="empathetic" className="cursor-pointer px-3 py-2 hover:bg-accent">Empathetic Understanding</SelectItem>
                        <SelectItem value="logical" className="cursor-pointer px-3 py-2 hover:bg-accent">Logical Reasoning</SelectItem>
                        <SelectItem value="collaborative" className="cursor-pointer px-3 py-2 hover:bg-accent">Collaborative Problem-Solving</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Closing Technique</Label>
                    <Select value={formData.closing_technique} onValueChange={(value) => updateFormData('closing_technique', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-background border shadow-lg">
                        <SelectItem value="assumptive" className="cursor-pointer px-3 py-2 hover:bg-accent">Assumptive Close</SelectItem>
                        <SelectItem value="consultative" className="cursor-pointer px-3 py-2 hover:bg-accent">Consultative Close</SelectItem>
                        <SelectItem value="urgency" className="cursor-pointer px-3 py-2 hover:bg-accent">Urgency-Based</SelectItem>
                        <SelectItem value="benefit" className="cursor-pointer px-3 py-2 hover:bg-accent">Benefit Summary</SelectItem>
                        <SelectItem value="alternative" className="cursor-pointer px-3 py-2 hover:bg-accent">Alternative Choice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            </div>

            {/* Behavioral Intelligence Preview */}
            <Card className="p-6 bg-gradient-to-r from-accent/5 via-background to-primary/5 border-dashed border-accent/40">
              <div className="text-center">
                <h4 className="font-semibold mb-2 text-accent">Behavioral Intelligence Preview</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Your agent will adapt its responses based on these advanced behavioral patterns, creating more natural and effective conversations.
                </p>
                <div className="flex justify-center gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">Human-like Responses</Badge>
                  <Badge variant="secondary" className="bg-secondary/10 text-secondary">Contextual Awareness</Badge>
                  <Badge variant="secondary" className="bg-accent/10 text-accent">Adaptive Intelligence</Badge>
                </div>
              </div>
            </Card>
          </div>
        );

      case 6:
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
                  (currentStep === 2 && !formData.voice_id) ||
                  (currentStep === 3 && formData.professionalism[0] < 1) ||
                  (currentStep === 4 && formData.speaking_pace[0] < 1) ||
                  (currentStep === 5 && !formData.interruption_handling)
                }
                className="gradient-primary text-white"
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
                    Creating Advanced Agent...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Advanced Agent
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