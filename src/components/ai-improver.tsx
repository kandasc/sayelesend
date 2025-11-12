import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Wand2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface AIImproverProps {
  message: string;
  onMessageImproved?: (message: string) => void;
}

export function AIImprover({ message, onMessageImproved }: AIImproverProps) {
  const [open, setOpen] = useState(false);
  const [improving, setImproving] = useState<string | null>(null);

  const improveMessage = useAction(api.ai.improveMessage);

  const handleImprove = async (improvement: "shorten" | "expand" | "professional" | "friendly" | "fix_grammar" | "add_emojis") => {
    if (!message.trim()) {
      toast.error("No message to improve");
      return;
    }

    setImproving(improvement);
    try {
      const result = await improveMessage({
        message,
        improvement,
      });
      if (onMessageImproved) {
        onMessageImproved(result.improvedMessage);
        toast.success("Message improved!");
        setOpen(false);
      }
    } catch (error) {
      toast.error("Failed to improve message");
      console.error(error);
    } finally {
      setImproving(null);
    }
  };

  const improvements = [
    { id: "shorten", label: "Make Shorter", icon: "📏" },
    { id: "expand", label: "Make Longer", icon: "📝" },
    { id: "professional", label: "More Professional", icon: "💼" },
    { id: "friendly", label: "More Friendly", icon: "😊" },
    { id: "fix_grammar", label: "Fix Grammar", icon: "✅" },
    { id: "add_emojis", label: "Add Emojis", icon: "✨" },
  ] as const;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={!message.trim()}>
          <Wand2 className="mr-2 h-4 w-4" />
          Improve with AI
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-2">
          <div className="text-sm font-medium">Improve your message</div>
          <div className="space-y-1">
            {improvements.map((improvement) => (
              <Button
                key={improvement.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleImprove(improvement.id)}
                disabled={improving !== null}
              >
                <span className="mr-2">{improvement.icon}</span>
                {improvement.label}
                {improving === improvement.id ? (
                  <Spinner className="ml-auto h-3 w-3" />
                ) : (
                  <ArrowRight className="ml-auto h-3 w-3" />
                )}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
