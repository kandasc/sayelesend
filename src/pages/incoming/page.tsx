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
import { MessageSquare, Search, Check, Clock, Download, Calendar as CalendarIcon, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { format, startOfDay, endOfDay } from "date-fns";
import { Label } from "@/components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import jsPDF from "jspdf";
import type { DateRange } from "react-day-picker";

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
  const client = useQuery(api.clients.getCurrentClient, {});
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  type MessageType = NonNullable<typeof messages>[number];
  const [selectedMessage, setSelectedMessage] = useState<MessageType | null>(null);

  const filteredMessages = messages?.filter((m) => {
    // Search filter
    const matchesSearch = m.from.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      m.to.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      m.message.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    // Date range filter
    if (dateRange?.from) {
      const messageDate = new Date(m.receivedAt);
      const fromDate = startOfDay(dateRange.from);
      const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      
      if (messageDate < fromDate || messageDate > toDate) {
        return false;
      }
    }
    
    return matchesSearch;
  });

  const getTruncatedMessage = (text: string) => {
    const words = text.split(' ');
    if (words.length <= 2) return text;
    return words.slice(0, 2).join(' ') + '...';
  };

  const handleExportCSV = () => {
    if (!filteredMessages || filteredMessages.length === 0) {
      toast.error("No messages to export");
      return;
    }

    try {
      const companyHeader = ["SAYELE Message - Incoming Messages Report"];
      const clientInfo = client ? [`Client: ${client.companyName}`] : ["Client: N/A"];
      const dateInfo = [`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`];
      const emptyRow = [""];
      
      const headers = ["Sender", "Recipient", "Message", "Processed", "Received At"];
      const rows = filteredMessages.map(m => [
        m.from,
        m.to,
        m.message.replace(/"/g, '""'),
        m.processed ? "Yes" : "No",
        format(new Date(m.receivedAt), "yyyy-MM-dd HH:mm:ss")
      ]);
      
      const footer = [""];
      const madeBy = ["Made by SAYELE"];

      const csvContent = [
        companyHeader.join(","),
        clientInfo.join(","),
        dateInfo.join(","),
        emptyRow.join(","),
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
        footer.join(","),
        madeBy.join(",")
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `incoming_messages_${format(new Date(), "yyyy-MM-dd")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("CSV exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export CSV");
    }
  };

  const handleExportPDF = () => {
    if (!filteredMessages || filteredMessages.length === 0) {
      toast.error("No messages to export");
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - (margin * 2);
      
      // Header - Logo and Client Name
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("SAYELE Message", margin, 15);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const clientText = client ? client.companyName : "N/A";
      doc.text(`Client: ${clientText}`, margin, 22);
      
      // Separator line after header
      doc.setDrawColor(200);
      doc.line(margin, 26, pageWidth - margin, 26);
      
      // Title
      let yPos = 34;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Incoming Messages Report", margin, yPos);
      yPos += 8;
      
      // Date range if applicable
      if (dateRange?.from) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const dateText = dateRange.to 
          ? `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
          : format(dateRange.from, "MMM dd, yyyy");
        doc.text(`Period: ${dateText}`, margin, yPos);
        yPos += 6;
      }
      
      // Summary
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total Messages: ${filteredMessages.length}`, margin, yPos);
      const processedCount = filteredMessages.filter(m => m.processed).length;
      yPos += 5;
      doc.text(`Processed: ${processedCount} | Unprocessed: ${filteredMessages.length - processedCount}`, margin, yPos);
      yPos += 10;
      
      // Messages
      doc.setFontSize(9);
      filteredMessages.forEach((message, index) => {
        // Check if we need a new page (leave space for footer)
        if (yPos > 255) {
          // Add footer to current page
          doc.setFontSize(8);
          doc.setFont("helvetica", "italic");
          doc.text("Made by SAYELE", pageWidth / 2, pageHeight - 10, { align: "center" });
          
          doc.addPage();
          yPos = 20;
        }
        
        // Message header
        doc.setFont("helvetica", "bold");
        doc.text(`Message ${index + 1}`, margin, yPos);
        yPos += 5;
        
        doc.setFont("helvetica", "normal");
        
        // From
        doc.text(`From: ${message.from}`, margin, yPos);
        yPos += 5;
        
        // To
        doc.text(`To: ${message.to}`, margin, yPos);
        yPos += 5;
        
        // Status
        doc.text(`Status: ${message.processed ? "Processed" : "Unprocessed"}`, margin, yPos);
        yPos += 5;
        
        // Timestamp
        doc.text(`Received: ${format(new Date(message.receivedAt), "MMM dd, yyyy HH:mm")}`, margin, yPos);
        yPos += 5;
        
        // Message content
        doc.text("Message:", margin, yPos);
        yPos += 5;
        
        const messageLines = doc.splitTextToSize(message.message, contentWidth - 4);
        messageLines.forEach((line: string) => {
          if (yPos > 255) {
            // Add footer to current page
            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.text("Made by SAYELE", pageWidth / 2, pageHeight - 10, { align: "center" });
            
            doc.addPage();
            yPos = 20;
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
          }
          doc.text(line, margin + 4, yPos);
          yPos += 4;
        });
        
        yPos += 6;
        
        // Separator line
        if (index < filteredMessages.length - 1) {
          doc.setDrawColor(200);
          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 6;
        }
      });
      
      // Add footer to the last page
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text("Made by SAYELE", pageWidth / 2, pageHeight - 10, { align: "center" });
      
      doc.save(`incoming_messages_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={!filteredMessages || filteredMessages.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={!filteredMessages || filteredMessages.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
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

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[240px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                  </>
                ) : (
                  format(dateRange.from, "MMM dd, yyyy")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              initialFocus
            />
            {dateRange?.from && (
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setDateRange(undefined)}
                >
                  Clear dates
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
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
            <IncomingMessageCard 
              key={message._id} 
              message={message} 
              getTruncatedMessage={getTruncatedMessage}
              onClick={() => setSelectedMessage(message)}
            />
          ))}
        </div>
      )}

      {/* Message Detail Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Incoming Message Details</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <p className="font-medium">{selectedMessage.from}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <p className="font-medium">{selectedMessage.to}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant={selectedMessage.processed ? "default" : "secondary"}>
                      {selectedMessage.processed ? "Processed" : "Unprocessed"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Received At</Label>
                  <p className="font-medium">{format(new Date(selectedMessage.receivedAt), "PPpp")}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Message</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IncomingMessageCard({
  message,
  getTruncatedMessage,
  onClick,
}: {
  message: {
    _id: Id<"incomingMessages">;
    from: string;
    to: string;
    message: string;
    receivedAt: number;
    processed: boolean;
  };
  getTruncatedMessage: (text: string) => string;
  onClick: () => void;
}) {
  const markAsProcessed = useMutation(api.incomingMessages.markAsProcessed);

  const handleMarkAsProcessed = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    try {
      await markAsProcessed({ messageId: message._id });
      toast.success("Message marked as processed");
    } catch (error) {
      toast.error("Failed to mark as processed");
    }
  };

  return (
    <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={onClick}>
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
        <p className="text-sm text-muted-foreground">
          {getTruncatedMessage(message.message)}
        </p>
      </CardContent>
    </Card>
  );
}
