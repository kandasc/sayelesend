import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AIBulkGeneratorProps {
  onMessagesGenerated?: (messages: string[]) => void;
  channel?: "sms" | "whatsapp" | "telegram" | "facebook_messenger";
}

export function AIBulkGenerator({ onMessagesGenerated, channel = "sms" }: AIBulkGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState("5");
  const [personalize, setPersonalize] = useState(true);
  const [generatedMessages, setGeneratedMessages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateBulkMessages = useAction(api.ai.generateBulkMessages);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    const messageCount = parseInt(count);
    if (isNaN(messageCount) || messageCount < 1 || messageCount > 20) {
      toast.error("Please enter a number between 1 and 20");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateBulkMessages({
        prompt,
        count: messageCount,
        channel,
        personalize,
      });
      setGeneratedMessages(result.messages);
      toast.success(`Generated ${result.messages.length} messages!`);
    } catch (error) {
      toast.error("Failed to generate messages");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUse = () => {
    if (onMessagesGenerated && generatedMessages.length > 0) {
      onMessagesGenerated(generatedMessages);
      setOpen(false);
      setPrompt("");
      setGeneratedMessages([]);
      toast.success("Messages ready to use");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="mr-2 h-4 w-4" />
          AI Bulk Generator
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Bulk Message Generator
          </DialogTitle>
          <DialogDescription>
            Generate multiple personalized messages at once for your bulk campaign.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Campaign Description</Label>
            <Textarea
              placeholder="Example: Generate promotional messages for our holiday sale - 30% off everything, valid until Dec 31st"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Number of Variations</Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 10, 15, 20].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} messages
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channel} disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="facebook_messenger">Facebook Messenger</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Personalization</Label>
              <div className="flex items-center h-10 px-3 border rounded-md">
                <Switch
                  checked={personalize}
                  onCheckedChange={setPersonalize}
                />
                <span className="ml-2 text-sm">
                  {personalize ? "Unique" : "Similar"}
                </span>
              </div>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
            {isGenerating ? (
              <>
                <Spinner />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Messages
              </>
            )}
          </Button>

          {generatedMessages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Generated Messages ({generatedMessages.length})</Label>
                <Button onClick={handleGenerate} variant="ghost" size="sm" disabled={isGenerating}>
                  Regenerate
                </Button>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2 rounded-lg border p-4 bg-muted/50">
                {generatedMessages.map((msg, idx) => (
                  <div key={idx} className="p-3 bg-background rounded border text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
                      <p className="flex-1 whitespace-pre-wrap">{msg}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={handleUse} className="w-full">
                Use These Messages
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
