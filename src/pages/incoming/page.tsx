import { Authenticated } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { MessageSquare, Search, Check, Clock, Download, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { format } from "date-fns";

export default function IncomingMessages() {
  return (
    <Authenticated>
      <IncomingMessagesContent />
    </Authenticated>
  );
}

function IncomingMessagesContent() {
  const messages = useQuery(api.incomingMessages.listIncomingMessages);
  const stats = useQuery(api.incomingMessages.getIncomingStats);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [showContent, setShowContent] = useState(false);

  const filteredMessages = messages?.filter((m) =>
    m.from.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
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
      const headers = ["Sender", "Recipient", "Message", "Processed", "Received At"];
      const rows = filteredMessages.map(m => [
        m.from,
        m.to,
        m.message.replace(/"/g, '""'), // Escape quotes
        m.processed ? "Yes" : "No",
        format(new Date(m.receivedAt), "yyyy-MM-dd HH:mm:ss")
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
      link.setAttribute("download", `incoming_messages_${format(new Date(), "yyyy-MM-dd")}.csv`);
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

  if (messages === undefined || stats === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Incoming Messages</h1>
          <p className="text-muted-foreground">
            View and manage incoming SMS messages
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Incoming Messages</h1>
          <p className="text-muted-foreground">
            View and manage incoming SMS messages
          </p>
        </div>
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Unprocessed</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unprocessed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {!filteredMessages || filteredMessages.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquare />
            </EmptyMedia>
            <EmptyTitle>
              {searchQuery ? "No messages found" : "No incoming messages yet"}
            </EmptyTitle>
            <EmptyDescription>
              {searchQuery
                ? "Try adjusting your search"
                : "Incoming SMS messages will appear here"}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((message) => (
            <IncomingMessageCard key={message._id} message={message} showContent={showContent} />
          ))}
        </div>
      )}
    </div>
  );
}

function IncomingMessageCard({
  message,
  showContent,
}: {
  message: {
    _id: Id<"incomingMessages">;
    from: string;
    to: string;
    message: string;
    receivedAt: number;
    processed: boolean;
  };
  showContent: boolean;
}) {
  const markAsProcessed = useMutation(api.incomingMessages.markAsProcessed);

  const handleMarkAsProcessed = async () => {
    try {
      await markAsProcessed({ messageId: message._id });
      toast.success("Message marked as processed");
    } catch (error) {
      toast.error("Failed to mark as processed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">From: {message.from}</CardTitle>
              {!message.processed && (
                <Badge variant="secondary">Unprocessed</Badge>
              )}
            </div>
            <CardDescription>
              To: {message.to} • {format(new Date(message.receivedAt), "PPpp")}
            </CardDescription>
          </div>
          {!message.processed && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkAsProcessed}
            >
              <Check className="h-4 w-4 mr-2" />
              Mark Processed
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          {showContent ? message.message : "••••••••••••"}
        </p>
      </CardContent>
    </Card>
  );
}
