import { Authenticated } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Plus, Search, Download, Calendar as CalendarIcon, FileText, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format, startOfDay, endOfDay } from "date-fns";
import { useIntl } from "react-intl";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { AIAssistant } from "@/components/ai-assistant.tsx";
import { AIImprover } from "@/components/ai-improver.tsx";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { usePagination } from "@/hooks/use-pagination.ts";
import PaginationControls from "@/components/ui/pagination-controls.tsx";
import jsPDF from "jspdf";
import type { DateRange } from "react-day-picker";

export default function Messages() {
  return (
    <Authenticated>
      <MessagesContent />
    </Authenticated>
  );
}

function MessagesContent() {
  const intl = useIntl();
  const currentUser = useQuery(api.testMode.getEffectiveUser, {});
  const client = useQuery(api.clients.getCurrentClient, {});
  const messages = useQuery(
    api.messages.getMessages,
    client ? { clientId: client._id } : "skip"
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const triggerCleanup = useMutation(api.messages.triggerBulkMarkDelivered);
  const [cleanupRunning, setCleanupRunning] = useState(false);
  
  type MessageType = NonNullable<typeof messages>[number];
  const [selectedMessage, setSelectedMessage] = useState<MessageType | null>(null);

  const filteredMessages = messages?.filter((m) => {
    // Search filter
    const matchesSearch = m.to.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      m.message.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    // Date range filter
    if (dateRange?.from) {
      const messageDate = new Date(m._creationTime);
      const fromDate = startOfDay(dateRange.from);
      const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      
      if (messageDate < fromDate || messageDate > toDate) {
        return false;
      }
    }
    
    return matchesSearch;
  });

  const pagination = usePagination(filteredMessages, { pageSize: 15 });

  const getTruncatedMessage = (text: string) => {
    const words = text.split(' ');
    if (words.length <= 2) return text;
    return words.slice(0, 2).join(' ') + '...';
  };

  const handleExportCSV = () => {
    if (!filteredMessages || filteredMessages.length === 0) {
      toast.error(intl.formatMessage({ id: "page.messages.noExportData" }));
      return;
    }

    try {
      const companyHeader = ["SAYELE Message - Outgoing Messages Report"];
      const clientInfo = client ? [`Client: ${client.companyName}`] : ["Client: N/A"];
      const dateInfo = [`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`];
      const emptyRow = [""];
      
      const headers = ["Recipient", "Message", "Channel", "Status", "Credits Used", "Sent At"];
      const rows = filteredMessages.map(m => [
        m.to,
        m.message.replace(/"/g, '""'),
        m.channel || "sms",
        m.status,
        m.creditsUsed.toString(),
        format(new Date(m._creationTime), "yyyy-MM-dd HH:mm:ss")
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
      link.setAttribute("download", `outgoing_messages_${format(new Date(), "yyyy-MM-dd")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(intl.formatMessage({ id: "page.messages.csvExported" }));
    } catch (error) {
      console.error("Export error:", error);
      toast.error(intl.formatMessage({ id: "page.messages.csvExportFailed" }));
    }
  };

  const handleExportPDF = async () => {
    if (!filteredMessages || filteredMessages.length === 0) {
      toast.error(intl.formatMessage({ id: "page.messages.noExportData" }));
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - (margin * 2);
      
      // Load and add logo
      const logoUrl = "https://cdn.hercules.app/file_07jHYGpRDUJEALB5zWEPNQjd";
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = logoUrl;
        });
        
        // Add logo image (adjust size to fit nicely in header)
        const logoHeight = 12;
        const logoWidth = (img.width / img.height) * logoHeight;
        doc.addImage(img, "PNG", margin, 10, logoWidth, logoHeight);
      } catch (error) {
        // Fallback to text if image fails to load
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("SAYELE Message", margin, 15);
      }
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const clientText = client ? client.companyName : "N/A";
      doc.text(`Client: ${clientText}`, margin, 24);
      
      // Separator line after header
      doc.setDrawColor(200);
      doc.line(margin, 28, pageWidth - margin, 28);
      
      // Title
      let yPos = 36;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Outgoing Messages Report", margin, yPos);
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
        
        // Recipient
        doc.text(`To: ${message.to}`, margin, yPos);
        yPos += 5;
        
        // Channel and Status
        const channelText = `Channel: ${message.channel || "SMS"} | Status: ${message.status}`;
        doc.text(channelText, margin, yPos);
        yPos += 5;
        
        // Credits
        doc.text(`Credits: ${message.creditsUsed}`, margin, yPos);
        yPos += 5;
        
        // Timestamp
        doc.text(`Sent: ${format(new Date(message._creationTime), "MMM dd, yyyy HH:mm")}`, margin, yPos);
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
      
      doc.save(`outgoing_messages_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success(intl.formatMessage({ id: "page.messages.pdfExported" }));
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(intl.formatMessage({ id: "page.messages.pdfExportFailed" }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{intl.formatMessage({ id: "page.messages.title" })}</h1>
          <p className="text-muted-foreground">{intl.formatMessage({ id: "page.messages.subtitle" })}</p>
        </div>
        {currentUser?.role === "admin" && (
          <Button
            variant="secondary"
            size="sm"
            disabled={cleanupRunning}
            onClick={async () => {
              setCleanupRunning(true);
              try {
                await triggerCleanup({});
                toast.success("Bulk status update started. Old 'sent' messages will be marked as 'delivered' in batches.");
              } catch {
                toast.error("Failed to start cleanup");
              } finally {
                setCleanupRunning(false);
              }
            }}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${cleanupRunning ? "animate-spin" : ""}`} />
            {intl.formatMessage({ id: "page.messages.updateOldStatus" })}
          </Button>
        )}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: "page.messages.sendMessage" })}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{intl.formatMessage({ id: "page.messages.sendNewMessage" })}</DialogTitle>
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
            <CardTitle>{intl.formatMessage({ id: "page.messages.allMessages" })}</CardTitle>
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
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={intl.formatMessage({ id: "page.messages.searchPlaceholder" })}
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
                    <span>{intl.formatMessage({ id: "page.messages.pickDateRange" })}</span>
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
                      {intl.formatMessage({ id: "buttons.clearDates" })}
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {!filteredMessages || filteredMessages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchQuery 
                ? intl.formatMessage({ id: "page.messages.noMessagesSearch" })
                : intl.formatMessage({ id: "page.messages.noMessages" })}
            </p>
          ) : (
            <>
              <div className="space-y-2">
              {pagination.paginatedItems.map((message) => (
                <div
                  key={message._id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedMessage(message)}
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
                      {getTruncatedMessage(message.message)}
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
            <PaginationControls {...pagination} itemLabel="messages" />
            </>
          )}
        </CardContent>
      </Card>

      {/* Message Detail Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: "page.messages.messageDetails" })}</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">{intl.formatMessage({ id: "common.recipient" })}</Label>
                  <p className="font-medium">{selectedMessage.to}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{intl.formatMessage({ id: "common.status" })}</Label>
                  <div className="mt-1">
                    <Badge variant={getStatusVariant(selectedMessage.status)}>
                      {selectedMessage.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{intl.formatMessage({ id: "common.channel" })}</Label>
                  <p className="font-medium capitalize">
                    {selectedMessage.channel === "facebook_messenger" ? "Facebook Messenger" : 
                     selectedMessage.channel || "SMS"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{intl.formatMessage({ id: "common.creditsUsed" })}</Label>
                  <p className="font-medium">{selectedMessage.creditsUsed}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{intl.formatMessage({ id: "common.sentAt" })}</Label>
                  <p className="font-medium">{format(new Date(selectedMessage._creationTime), "PPpp")}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">{intl.formatMessage({ id: "common.message" })}</Label>
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

function SendMessageForm({
  clientId,
  onSuccess,
}: {
  clientId?: Id<"clients">;
  onSuccess: () => void;
}) {
  const intl = useIntl();
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
        <Label htmlFor="channel">{intl.formatMessage({ id: "common.channel" })}</Label>
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
          {channel === "telegram" 
            ? intl.formatMessage({ id: "page.messages.usernameOrChatId" })
            : intl.formatMessage({ id: "page.messages.recipientPhone" })}
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
          <Label htmlFor="message">{intl.formatMessage({ id: "common.message" })}</Label>
          <AIAssistant 
            channel={channel}
            onMessageGenerated={(msg) => setMessage(msg)}
          />
        </div>
        <Textarea
          id="message"
          placeholder={intl.formatMessage({ id: "page.messages.enterMessage" })}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {message.length} {intl.formatMessage({ id: "common.characters" })}
          </p>
          <AIImprover 
            message={message}
            onMessageImproved={(msg) => setMessage(msg)}
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? intl.formatMessage({ id: "buttons.sending" }) : intl.formatMessage({ id: "page.messages.sendMessage" })}
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
