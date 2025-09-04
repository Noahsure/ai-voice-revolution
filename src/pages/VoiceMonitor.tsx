import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import VoiceCallMonitor from '@/components/VoiceCallMonitor';

const VoiceMonitor = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Voice Call Monitor</h1>
          <p className="text-muted-foreground">Real-time monitoring of AI voice calls</p>
        </div>
      </div>
      
      <VoiceCallMonitor />
    </div>
  );
};

export default VoiceMonitor;