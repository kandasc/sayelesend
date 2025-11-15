import { Authenticated } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Plus, Search, Download, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { AIAssistant } from "@/components/ai-assistant.tsx";
import { AIImprover } from "@/components/ai-improver.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";

export default function Messages() {
  return (
    <Authenticated>
      <MessagesContent />
    </Authenticated>
  );
}

function MessagesContent() {
  const currentUser = useQuery(api.testMode.getEffectiveUser, {});
  const client = useQuery(api.clients.getCurrentClient, {});
  const messages = useQuery(
    api.messages.getMessages,
    client ? { clientId: client._id } : "skip"
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [showContent, setShowContent] = useState(false);

  const filteredMessages = messages?.filter((m) =>
    m.to.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    m.message.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handleExport = () => {
    if (!filteredMessages || filteredMessages.length === 0) {
      toast.error("No messages to export");
      return;
    }

    try {
      // Create CSV content
      const headers = ["Recipient", "Message", "Channel", "Status", "Credits Used", "Sent At"];
      const rows = filteredMessages.map(m => [
        m.to,
        m.message.replace(/"/g, '""'), // Escape quotes
        m.channel || "sms",
        m.status,
        m.creditsUsed.toString(),
        format(new Date(m._creationTime), "yyyy-MM-dd HH:mm:ss")
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `outgoing_messages_${format(new Date(), "yyyy-MM-dd")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Messages exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export messages");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Outgoing Messages</h1>
          <p className="text-muted-foreground">Send messages via SMS, WhatsApp, Telegram, and Facebook Messenger</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send New Message</DialogTitle>
            </DialogHeader>
            <SendMessageForm
              clientId={client?._id}
              onSuccess={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Messages</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowContent(!showContent)}
              >
                {showContent ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Content
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Content
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!filteredMessages || filteredMessages.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by recipient or message content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {!filteredMessages || filteredMessages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchQuery ? "No messages found matching your search" : "No messages found"}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredMessages.map((message) => (
                <div
                  key={message._id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{message.to}</p>
                      <Badge variant={getStatusVariant(message.status)}>
                        {message.status}
                      </Badge>
                      {message.channel && message.channel !== "sms" && (
                        <Badge variant="outline">
                          {message.channel === "facebook_messenger" ? "Messenger" : 
                           message.channel.charAt(0).toUpperCase() + message.channel.slice(1)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {showContent ? message.message : "••••••••••••"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sent: {format(new Date(message._creationTime), "PPp")}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground ml-4">
                    {message.creditsUsed} credit{message.creditsUsed !== 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SendMessageForm({
  clientId,
  onSuccess,
}: {
  clientId?: Id<"clients">;
  onSuccess: () => void;
}) {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<"sms" | "whatsapp" | "telegram" | "facebook_messenger">("sms");
  const [isLoading, setIsLoading] = useState(false);
  const sendSms = useMutation(api.messages.sendSms);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast.error("Client not found");
      return;
    }

    setIsLoading(true);
    try {
      await sendSms({
        to,
        message,
        clientId,
        channel,
      });
      const channelName = channel === "facebook_messenger" ? "Facebook Messenger" : 
                         channel.charAt(0).toUpperCase() + channel.slice(1);
      toast.success(`${channelName} message sent successfully`);
      setTo("");
      setMessage("");
      onSuccess();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send message";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="channel">Channel</Label>
        <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
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
        <Label htmlFor="to">
          {channel === "telegram" ? "Username or Chat ID" : "Recipient Phone Number"}
        </Label>
        <Input
          id="to"
          placeholder={channel === "telegram" ? "@username or chat_id" : "+1234567890"}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="message">Message</Label>
          <AIAssistant 
            channel={channel}
            onMessageGenerated={(msg) => setMessage(msg)}
          />
        </div>
        <Textarea
          id="message"
          placeholder="Enter your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {message.length} characters
          </p>
          <AIImprover 
            message={message}
            onMessageImproved={(msg) => setMessage(msg)}
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send Message"}
        </Button>
      </div>
    </form>
  );
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "delivered":
      return "default";
    case "sent":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}
