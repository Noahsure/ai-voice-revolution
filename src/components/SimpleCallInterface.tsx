import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Phone, Upload, Play, Users, Brain, Zap } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const SimpleCallInterface = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("Hello! This is a test call from your Neurovoice AI assistant.");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleManualCall = async () => {
    if (!phoneNumber) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number to call",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call to initiate manual call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Call Initiated",
        description: `Starting call to ${phoneNumber}`,
      });
    } catch (error) {
      toast({
        title: "Call Failed", 
        description: "Failed to initiate call. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchUpload = async () => {
    if (!csvFile) {
      toast({
        title: "File Required",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Simulate CSV processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Batch Campaign Started",
        description: `Processing ${csvFile.name} for batch calling`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to process CSV file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Manual Call Interface */}
      <Card className="border-2 border-neurovoice-primary/20 bg-gradient-to-br from-neurovoice-primary/5 to-neural-silver/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-neurovoice-primary" />
            Manual Call
            <Badge variant="outline" className="ml-auto">
              <Brain className="w-3 h-3 mr-1" />
              AI Powered
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phone-number">Phone Number</Label>
            <Input
              id="phone-number"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="message">AI Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Customize the AI's opening message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 min-h-[80px]"
            />
          </div>

          <Button
            onClick={handleManualCall}
            disabled={isLoading}
            className="w-full bg-neurovoice-primary hover:bg-neurovoice-primary-dark"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Calling...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Call
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Batch Call Interface */}
      <Card className="border-2 border-electric-blue/20 bg-gradient-to-br from-electric-blue/5 to-neural-silver/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-electric-blue" />
            Batch Calls
            <Badge variant="outline" className="ml-auto">
              <Zap className="w-3 h-3 mr-1" />
              Bulk Processing
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="csv-upload">Upload Contact List (CSV)</Label>
            <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-electric-blue/50 transition-colors">
              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <input
                id="csv-upload"
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer text-sm text-gray-600 hover:text-electric-blue"
              >
                {csvFile ? csvFile.name : "Click to upload CSV or Excel file"}
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Format: Name, Phone, Company
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="batch-message">Batch Message Template</Label>
            <Textarea
              id="batch-message"
              placeholder="Hi {Name}, this is an AI assistant calling from {Company}..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 min-h-[80px]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use {`{Name}`}, {`{Company}`} for personalization
            </p>
          </div>

          <Button
            onClick={handleBatchUpload}
            disabled={isLoading || !csvFile}
            className="w-full bg-electric-blue hover:bg-electric-blue-dark"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Start Batch Campaign
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};