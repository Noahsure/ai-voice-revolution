import { useState } from 'react';
import { Wand2, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AIScriptBuilderProps {
  onContentGenerated: (content: string, type: 'opening' | 'system' | 'knowledge') => void;
}

const AIScriptBuilder = ({ onContentGenerated }: AIScriptBuilderProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [showGenerated, setShowGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    purpose: '',
    industry: '',
    targetAudience: '',
    tone: 'professional',
    scriptType: 'opening' as 'opening' | 'system' | 'knowledge',
    additionalContext: ''
  });
  const { toast } = useToast();

  const generateContent = async () => {
    if (!formData.purpose) {
      toast({
        title: "Missing Information",
        description: "Please provide at least the purpose/goal for the AI agent.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-script-generator', {
        body: formData
      });

      if (error) throw error;

      setGeneratedContent(data.content);
      setShowGenerated(true);
      
      toast({
        title: "Content Generated!",
        description: `AI-generated ${formData.scriptType} content is ready to use.`,
      });

    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const useGenerated = () => {
    onContentGenerated(generatedContent, formData.scriptType);
    toast({
      title: "Content Applied!",
      description: `The generated ${formData.scriptType} has been applied to your agent.`,
    });
    setShowGenerated(false);
    setGeneratedContent('');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Content copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy content to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Wand2 className="w-5 h-5" />
          AI Script Builder
        </CardTitle>
        <CardDescription>
          Generate intelligent scripts and knowledge bases powered by AI
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="scriptType">Content Type</Label>
            <Select 
              value={formData.scriptType} 
              onValueChange={(value: 'opening' | 'system' | 'knowledge') => 
                setFormData(prev => ({ ...prev, scriptType: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background border shadow-lg">
                <SelectItem value="opening" className="cursor-pointer px-3 py-2 hover:bg-accent">
                  Opening Message
                </SelectItem>
                <SelectItem value="system" className="cursor-pointer px-3 py-2 hover:bg-accent">
                  System Prompt
                </SelectItem>
                <SelectItem value="knowledge" className="cursor-pointer px-3 py-2 hover:bg-accent">
                  Knowledge Base
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tone">Tone</Label>
            <Select 
              value={formData.tone} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, tone: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background border shadow-lg">
                <SelectItem value="professional" className="cursor-pointer px-3 py-2 hover:bg-accent">
                  Professional
                </SelectItem>
                <SelectItem value="friendly" className="cursor-pointer px-3 py-2 hover:bg-accent">
                  Friendly
                </SelectItem>
                <SelectItem value="authoritative" className="cursor-pointer px-3 py-2 hover:bg-accent">
                  Authoritative
                </SelectItem>
                <SelectItem value="conversational" className="cursor-pointer px-3 py-2 hover:bg-accent">
                  Conversational
                </SelectItem>
                <SelectItem value="empathetic" className="cursor-pointer px-3 py-2 hover:bg-accent">
                  Empathetic
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="purpose">Purpose/Goal *</Label>
          <Input
            id="purpose"
            placeholder="e.g., Generate leads for solar panel installations"
            value={formData.purpose}
            onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              placeholder="e.g., Real Estate, Healthcare, Technology"
              value={formData.industry}
              onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Input
              id="targetAudience"
              placeholder="e.g., Homeowners, Small business owners"
              value={formData.targetAudience}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="additionalContext">Additional Context</Label>
          <Textarea
            id="additionalContext"
            placeholder="Any specific requirements, restrictions, or additional information..."
            value={formData.additionalContext}
            onChange={(e) => setFormData(prev => ({ ...prev, additionalContext: e.target.value }))}
            rows={3}
          />
        </div>

        <Button 
          onClick={generateContent} 
          disabled={isGenerating || !formData.purpose}
          className="w-full gradient-primary text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Content...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Generate {formData.scriptType === 'opening' ? 'Opening Message' : 
                      formData.scriptType === 'system' ? 'System Prompt' : 'Knowledge Base'}
            </>
          )}
        </Button>

        {showGenerated && generatedContent && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-green-800">
                  Generated {formData.scriptType === 'opening' ? 'Opening Message' : 
                           formData.scriptType === 'system' ? 'System Prompt' : 'Knowledge Base'}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="text-green-700 border-green-300 hover:bg-green-100"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="bg-white border rounded-lg p-4 mb-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {generatedContent}
                </pre>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={useGenerated} 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Use This Content
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowGenerated(false)}
                  className="border-green-300 text-green-700 hover:bg-green-50"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default AIScriptBuilder;