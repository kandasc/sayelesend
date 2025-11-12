import { Authenticated } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Plus } from "lucide-react";
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

export default function Messages() {
  return (
    <Authenticated>
      <MessagesContent />
    </Authenticated>
  );
}

function MessagesContent() {
  const currentUser = useQuery(api.testMode.getEffectiveUser, {});
  const client = useQuery(
    api.clients.getCurrentClient,
    currentUser?.role === "client" ? {} : "skip"
  );
  const messages = useQuery(
    api.messages.getMessages,
    currentUser && client ? { clientId: client._id } : "skip"
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">View and send SMS messages</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Send SMS
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send New SMS</DialogTitle>
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
          <CardTitle>All Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {!messages || messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No messages found
            </p>
          ) : (
            <div className="space-y-2">
              {messages.map((message) => (
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
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {message.message}
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
      });
      toast.success("SMS sent successfully");
      setTo("");
      setMessage("");
      onSuccess();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send SMS";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="to">Recipient Phone Number</Label>
        <Input
          id="to"
          placeholder="+1234567890"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          placeholder="Enter your message here..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
        />
        <p className="text-xs text-muted-foreground">
          {message.length} characters
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send SMS"}
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
