import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mic, MicOff, Play, Square, Volume2 } from 'lucide-react';

const ELEVENLABS_VOICES = [
  { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George' }
];

export default function VoiceTestingPanel() {
  const { toast } = useToast();
  const [testText, setTestText] = useState('Hello! This is a test of the voice synthesis system. How does this sound?');
  const [selectedVoice, setSelectedVoice] = useState('9BWtsMINqrJLrRacOk9x');
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Text-to-Speech Testing
  const testTextToSpeech = useCallback(async () => {
    if (!testText.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to synthesize",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: testText,
          voiceId: selectedVoice,
          provider: 'elevenlabs'
        }
      });

      if (error) throw error;

      if (data.audioContent) {
        // Create audio blob and URL
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        toast({
          title: "Success",
          description: `Audio generated using ${data.provider} with voice ${data.voiceId}`,
        });
      }
    } catch (error) {
      console.error('TTS Error:', error);
      toast({
        title: "TTS Error",
        description: error.message || 'Failed to generate speech',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [testText, selectedVoice, toast]);

  // Play generated audio
  const playAudio = useCallback(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    }
  }, [audioUrl]);

  // Speech-to-Text Testing
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioForTranscription(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(100);
      setIsRecording(true);

      toast({
        title: "Recording Started",
        description: "Speak now to test speech recognition",
      });
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: "Recording Error", 
        description: "Could not access microphone",
        variant: "destructive"
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const processAudioForTranscription = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: {
          audio: base64Audio,
          language: 'en'
        }
      });

      if (error) throw error;

      setTranscriptionResult(data.text || 'No speech detected');
      
      toast({
        title: "Transcription Complete",
        description: `Detected: "${data.text}"`,
      });
    } catch (error) {
      console.error('STT Error:', error);
      toast({
        title: "Transcription Error",
        description: error.message || 'Failed to transcribe audio',
        variant: "destructive"
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Text-to-Speech Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Text-to-Speech Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Test Text</label>
            <Textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter text to synthesize..."
              rows={3}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Voice</label>
            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {ELEVENLABS_VOICES.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={testTextToSpeech}
              disabled={isGenerating || !testText.trim()}
            >
              {isGenerating ? 'Generating...' : 'Generate Speech'}
            </Button>
            
            {audioUrl && (
              <Button variant="outline" onClick={playAudio}>
                <Play className="h-4 w-4 mr-2" />
                Play Audio
              </Button>
            )}
          </div>

          <audio ref={audioRef} controls className={audioUrl ? 'block' : 'hidden'} />
        </CardContent>
      </Card>

      {/* Speech-to-Text Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Speech-to-Text Testing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {!isRecording ? (
              <Button onClick={startRecording}>
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="destructive">
                <MicOff className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            )}
          </div>

          {isTranscribing && (
            <div className="text-sm text-muted-foreground">
              Transcribing audio...
            </div>
          )}

          {transcriptionResult && (
            <div>
              <label className="text-sm font-medium">Transcription Result</label>
              <div className="p-3 bg-muted rounded-md">
                {transcriptionResult}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>Voice System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>ElevenLabs TTS:</strong>{' '}
              <span className="text-green-600">✓ Configured</span>
            </div>
            <div>
              <strong>OpenAI Whisper:</strong>{' '}
              <span className="text-green-600">✓ Configured</span>
            </div>
            <div>
              <strong>Microphone Access:</strong>{' '}
              <span className="text-yellow-600">? Permission Required</span>
            </div>
            <div>
              <strong>Audio Playback:</strong>{' '}
              <span className="text-green-600">✓ Available</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}