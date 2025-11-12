import { Authenticated } from "convex/react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Sparkles, Send, Lightbulb, Wand2, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AIAssistantPage() {
  return (
    <Authenticated>
      <AIAssistantContent />
    </Authenticated>
  );
}

function AIAssistantContent() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const chatAssistant = useAction(api.ai.chatAssistant);
  const generateMessage = useAction(api.ai.generateMessage);
  const suggestImprovements = useAction(api.ai.suggestImprovements);

  const handleSendMessage = async () => {
    if (!input.trim()) {
      toast.error("Please enter a message");
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const result = await chatAssistant({
        message: userMessage,
        context: messages.map((m) => `${m.role}: ${m.content}`).join("\n"),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: result.response }]);
    } catch (error) {
      toast.error("Failed to get response");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    const prompts: Record<string, string> = {
      "best-practices": "What are the best practices for bulk SMS marketing campaigns?",
      "deliverability": "How can I improve my message deliverability rates?",
      "engagement": "What are some tips for creating engaging messages?",
      "compliance": "What compliance considerations should I be aware of for messaging?",
    };

    const prompt = prompts[action];
    if (prompt) {
      setInput(prompt);
      setMessages((prev) => [...prev, { role: "user", content: prompt }]);
      setIsLoading(true);

      try {
        const result = await chatAssistant({
          message: prompt,
          context: messages.map((m) => `${m.role}: ${m.content}`).join("\n"),
        });
        setMessages((prev) => [...prev, { role: "assistant", content: result.response }]);
      } catch (error) {
        toast.error("Failed to get response");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-purple-500" />
          AI Assistant
        </h1>
        <p className="text-muted-foreground">
          Get help with messaging strategies, best practices, and platform features
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chat with AI Assistant</CardTitle>
              <CardDescription>
                Ask questions about messaging, campaigns, or get advice on platform features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="min-h-[400px] max-h-[500px] overflow-y-auto space-y-4 p-4 bg-muted/30 rounded-lg">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Start a conversation</p>
                    <p className="text-sm text-muted-foreground">
                      Ask me anything about messaging, campaigns, or best practices
                    </p>
                  </div>
                ) : (
                  messages.map((message, idx) => (
                    <div
                      key={idx}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background border"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-background border rounded-lg p-3">
                      <Spinner />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Textarea
                  placeholder="Ask me anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  className="flex-1"
                />
                <div className="flex flex-col gap-2">
                  <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                  {messages.length > 0 && (
                    <Button onClick={handleClearChat} variant="outline" size="icon">
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleQuickAction("best-practices")}
                disabled={isLoading}
              >
                <Lightbulb className="mr-2 h-4 w-4" />
                Best Practices
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleQuickAction("deliverability")}
                disabled={isLoading}
              >
                <Send className="mr-2 h-4 w-4" />
                Improve Deliverability
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleQuickAction("engagement")}
                disabled={isLoading}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Engagement Tips
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleQuickAction("compliance")}
                disabled={isLoading}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Compliance Info
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 mt-0.5 text-purple-500" />
                <div>
                  <p className="font-medium">Message Generation</p>
                  <p className="text-xs text-muted-foreground">
                    Create engaging messages for any channel
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Wand2 className="h-4 w-4 mt-0.5 text-blue-500" />
                <div>
                  <p className="font-medium">Message Improvement</p>
                  <p className="text-xs text-muted-foreground">
                    Enhance tone, grammar, and clarity
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 mt-0.5 text-green-500" />
                <div>
                  <p className="font-medium">Bulk Variations</p>
                  <p className="text-xs text-muted-foreground">
                    Generate multiple message variations
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-500" />
                <div>
                  <p className="font-medium">Smart Suggestions</p>
                  <p className="text-xs text-muted-foreground">
                    Get optimization recommendations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Pro Tip</p>
                  <p className="text-xs text-muted-foreground">
                    Use AI to test different message variations and improve your campaign performance over time.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
