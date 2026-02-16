import { Authenticated } from "convex/react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Plus, Send, Users, CheckCircle, XCircle, Clock, Calendar as CalendarIcon, Upload, FileText, RefreshCw, Activity } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import Papa from "papaparse";
import { format, addDays, set } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { cn } from "@/lib/utils.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { AIAssistant } from "@/components/ai-assistant.tsx";
import { AIImprover } from "@/components/ai-improver.tsx";
import { AIBulkGenerator } from "@/components/ai-bulk-generator.tsx";

export default function BulkSMS() {
  return (
    <Authenticated>
      <BulkSMSContent />
    </Authenticated>
  );
}

function BulkSMSContent() {
  const bulkMessages = useQuery(api.bulk.getBulkMessages, {});
  const currentUser = useQuery(api.testMode.getEffectiveUser, {});
  const client = useQuery(api.clients.getCurrentClient, {});
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<Id<"bulkMessages"> | null>(null);

  if (!bulkMessages || !currentUser) {
    return <BulkSMSSkeleton />;
  }

  // If admin user, show message that bulk SMS is for client users only
  if (currentUser.role === "admin") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bulk Messaging</h1>
            <p className="text-muted-foreground">Send messages to multiple recipients across SMS, WhatsApp, Telegram, and Facebook Messenger</p>
          </div>
          <UpdateBulkStatusButton />
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Send className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-center">Admin View</p>
            <p className="text-muted-foreground text-center">
              Bulk SMS campaigns are managed by client users. You can view all campaigns below.
            </p>
          </CardContent>
        </Card>
        {bulkMessages.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">All Campaigns</h2>
            <CampaignList campaigns={bulkMessages} onViewDetails={setDetailsId} />
          </div>
        )}
        {detailsId && (
          <Dialog open={!!detailsId} onOpenChange={() => setDetailsId(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Campaign Details</DialogTitle>
              </DialogHeader>
              <CampaignDetails bulkMessageId={detailsId} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Bulk Messaging</h1>
          <p className="text-muted-foreground">Send messages to multiple recipients across SMS, WhatsApp, Telegram, and Facebook Messenger</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Send className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-center">No Client Account</p>
            <p className="text-muted-foreground text-center">
              You need to be associated with a client account to send bulk messages.
              Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = Date.now();
  const scheduledCampaigns = bulkMessages.filter(
    (b) => b.scheduledAt && b.scheduledAt > now && b.status === "pending"
  );
  const activeCampaigns = bulkMessages.filter(
    (b) => (!b.scheduledAt || b.scheduledAt <= now) && (b.status === "pending" || b.status === "processing")
  );
  const completedCampaigns = bulkMessages.filter((b) => b.status === "completed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bulk Messaging</h1>
          <p className="text-muted-foreground">Send messages to multiple recipients across SMS, WhatsApp, Telegram, and Facebook Messenger</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Bulk Messaging Campaign</DialogTitle>
              <DialogDescription>
                Available credits: <span className="font-semibold">{client.credits.toLocaleString()}</span>
              </DialogDescription>
            </DialogHeader>
            <CreateBulkForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Campaigns</TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeCampaigns.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled ({scheduledCampaigns.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedCampaigns.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <CampaignList campaigns={bulkMessages} onViewDetails={setDetailsId} />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <CampaignList campaigns={activeCampaigns} onViewDetails={setDetailsId} />
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <CampaignList campaigns={scheduledCampaigns} onViewDetails={setDetailsId} />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <CampaignList campaigns={completedCampaigns} onViewDetails={setDetailsId} />
        </TabsContent>
      </Tabs>

      {detailsId && (
        <Dialog open={!!detailsId} onOpenChange={() => setDetailsId(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Campaign Details</DialogTitle>
            </DialogHeader>
            <CampaignDetails bulkMessageId={detailsId} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CampaignList({
  campaigns,
  onViewDetails,
}: {
  campaigns: Array<{
    _id: Id<"bulkMessages">;
    name: string;
    message: string;
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    status: string;
    scheduledAt?: number;
    creditsUsed: number;
    _creationTime: number;
  }>;
  onViewDetails: (id: Id<"bulkMessages">) => void;
}) {
  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Send className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-center">No campaigns yet</p>
          <p className="text-muted-foreground text-center">
            Create your first bulk SMS campaign
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {campaigns.map((campaign) => (
        <Card key={campaign._id} className="hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => onViewDetails(campaign._id)}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{campaign.name}</h3>
                  <Badge variant={getStatusVariant(campaign.status)}>
                    {campaign.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {campaign.message}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="text-muted-foreground">
                  {format(new Date(campaign._creationTime), "MMM d, h:mm a")}
                </p>
                {campaign.scheduledAt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(campaign.scheduledAt), "MMM d, h:mm a")}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Recipients</p>
                  <p className="font-semibold">{campaign.totalRecipients}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Sent</p>
                  <p className="font-semibold">{campaign.sentCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Delivered</p>
                  <p className="font-semibold">{campaign.deliveredCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="font-semibold">{campaign.failedCount}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Credits used: <span className="font-medium">{campaign.creditsUsed}</span>
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(campaign._id);
                }}
              >
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreateBulkForm({ onSuccess }: { onSuccess: () => void }) {
  const createBulk = useMutation(api.bulk.createBulkMessage);
  const client = useQuery(api.clients.getCurrentClient, {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recipients, setRecipients] = useState("");
  const [recipientCount, setRecipientCount] = useState(0);
  const [isScheduled, setIsScheduled] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("12:00");
  const [channel, setChannel] = useState<"sms" | "whatsapp" | "telegram" | "facebook_messenger">("sms");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRecipientsChange = (value: string) => {
    setRecipients(value);
    const numbers = value
      .split(/[\n,;]/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    setRecipientCount(numbers.length);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    // Check file size (max 10MB for larger files)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    toast.info("Processing CSV file...");

    // Use streaming mode for large files
    const phoneNumbers: string[] = [];
    let isFirstRow = true;
    let hasHeader = false;
    const headerKeywords = ["phone", "number", "mobile", "tel", "contact", "msisdn", "recipient"];

    Papa.parse(file, {
      skipEmptyLines: true,
      step: (row) => {
        const data = row.data as string[];
        
        // Check if first row is header
        if (isFirstRow) {
          isFirstRow = false;
          hasHeader = data.some(cell => 
            cell && headerKeywords.some(keyword => cell.toLowerCase().includes(keyword))
          );
          if (hasHeader) return; // Skip header row
        }

        // Try to find phone number in any column
        for (const cell of data) {
          if (!cell) continue;
          const trimmed = cell.trim();
          // Basic phone number validation (starts with + or has enough digits)
          if (trimmed && (trimmed.startsWith("+") || /^\d{9,}$/.test(trimmed.replace(/[\s().-]/g, "")))) {
            // Normalize phone number
            let normalized = trimmed.replace(/[\s().-]/g, "");
            if (!normalized.startsWith("+")) {
              normalized = "+" + normalized;
            }
            // Validate it looks like a real phone number
            if (/^\+\d{9,15}$/.test(normalized)) {
              phoneNumbers.push(normalized);
              break; // Take first valid phone number from row
            }
          }
        }
      },
      complete: () => {
        // Check if we exceeded the limit
        if (phoneNumbers.length > 10000) {
          toast.error(`CSV contains ${phoneNumbers.length} numbers. Maximum is 10,000 per campaign.`);
          const truncated = phoneNumbers.slice(0, 10000);
          setRecipients(truncated.join("\n"));
          setRecipientCount(truncated.length);
          return;
        }

        if (phoneNumbers.length === 0) {
          toast.error("No valid phone numbers found in CSV. Ensure numbers are in E.164 format (e.g., +22507XXXXXXX)");
          return;
        }

        // Update recipients
        setRecipients(phoneNumbers.join("\n"));
        setRecipientCount(phoneNumbers.length);
        toast.success(`Imported ${phoneNumbers.length} phone numbers`);
      },
      error: (error) => {
        toast.error(`Error reading file: ${error.message}`);
      },
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const numbers = recipients
      .split(/[\n,;]/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (numbers.length === 0) {
      toast.error("Please enter at least one recipient");
      setIsSubmitting(false);
      return;
    }

    let scheduledAt: number | undefined;
    
    if (isScheduled && selectedDate) {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const scheduledDateTime = set(selectedDate, { hours, minutes, seconds: 0, milliseconds: 0 });
      
      if (scheduledDateTime.getTime() <= Date.now()) {
        toast.error("Scheduled time must be in the future");
        setIsSubmitting(false);
        return;
      }
      
      scheduledAt = scheduledDateTime.getTime();
    }

    try {
      await createBulk({
        name: formData.get("name") as string,
        message,
        recipients: numbers,
        from: (formData.get("from") as string) || undefined,
        channel,
        scheduledAt,
      });
      
      const channelName = channel === "facebook_messenger" ? "Facebook Messenger" : 
                         channel.charAt(0).toUpperCase() + channel.slice(1);
      const successMessage = isScheduled 
        ? `${channelName} campaign scheduled for ${format(scheduledAt!, "PPP 'at' p")} with ${numbers.length} recipients`
        : `Bulk ${channelName} campaign created with ${numbers.length} recipients`;
      
      toast.success(successMessage);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedCost = client ? recipientCount * 1 : 0; // Assuming 1 credit per SMS

  return (
    <form onSubmit={handleSubmit} className="flex flex-col max-h-[70vh]">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        <div className="space-y-2">
          <Label htmlFor="name">Campaign Name</Label>
          <Input id="name" name="name" placeholder="Spring Sale 2025" required />
        </div>

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
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="message">Message</Label>
            <div className="flex gap-2">
              <AIBulkGenerator 
                channel={channel}
                onMessagesGenerated={(msgs) => {
                  if (msgs.length > 0) {
                    setMessage(msgs[0]);
                    toast.info(`${msgs.length} variations generated. Using first one. You can use others in future campaigns.`);
                  }
                }}
              />
              <AIAssistant 
                channel={channel}
                onMessageGenerated={setMessage}
              />
            </div>
          </div>
          <Textarea
            id="message"
            placeholder="Your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            required
            maxLength={channel === "sms" ? 160 : undefined}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {message.length} characters
              {channel === "sms" && " (max 160)"}
            </p>
            <AIImprover 
              message={message}
              onMessageImproved={setMessage}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="from">Sender ID (Optional)</Label>
          <Input id="from" name="from" placeholder="SAYELE" />
        </div>

        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="schedule">Schedule for Later</Label>
              <p className="text-xs text-muted-foreground">
                Send this campaign at a specific date and time
              </p>
            </div>
            <Switch
              id="schedule"
              checked={isScheduled}
              onCheckedChange={setIsScheduled}
            />
          </div>

          {isScheduled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="recipients">Recipients</Label>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
            </div>
          </div>
          <Textarea
            id="recipients"
            value={recipients}
            onChange={(e) => handleRecipientsChange(e.target.value)}
            placeholder="Enter phone numbers (one per line, or comma/semicolon separated)&#10;+1234567890&#10;+0987654321&#10;&#10;Or upload a CSV file with phone numbers"
            className="h-32 resize-none"
            required
          />
          <div className="flex justify-between text-xs">
            <p className="text-muted-foreground">
              {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
            </p>
            <p className="text-muted-foreground">
              Estimated cost: <span className="font-medium">{estimatedCost} credits</span>
            </p>
          </div>
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">CSV Format:</p>
              <p>• Upload a CSV file with phone numbers in any column</p>
              <p>• Supports headers like "phone", "number", "mobile", "msisdn", etc.</p>
              <p>• Phone numbers in E.164 format (e.g., +22507XXXXXXX)</p>
              <p>• Maximum: <span className="font-semibold">10,000 recipients</span> per campaign</p>
              <p>• Maximum file size: 10MB</p>
            </div>
          </div>
        </div>

        {client && estimatedCost > client.credits && (
          <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive font-medium">
              Insufficient credits. You need {estimatedCost} credits but only have{" "}
              {client.credits} available.
            </p>
          </div>
        )}
      </div>

      {/* Fixed footer with submit button */}
      <div className="flex-shrink-0 pt-4 mt-4 border-t bg-background">
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={
              isSubmitting || 
              (client ? estimatedCost > client.credits : false) ||
              (isScheduled && !selectedDate)
            }
          >
            {isSubmitting ? "Creating..." : isScheduled ? "Schedule Campaign" : "Create Campaign"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function CampaignDetails({ bulkMessageId }: { bulkMessageId: Id<"bulkMessages"> }) {
  const details = useQuery(api.bulk.getBulkMessageDetails, { bulkMessageId });
  const resendCampaign = useMutation(api.bulk.resendBulkMessage);
  const checkDlr = useAction(api.sms.send.checkBulkDlr);
  const [isResending, setIsResending] = useState(false);
  const [isCheckingDlr, setIsCheckingDlr] = useState(false);

  if (!details) {
    return <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>;
  }

  const { bulkMessage, recipients } = details;

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendCampaign({ bulkMessageId });
      toast.success("Campaign resent successfully! A new campaign has been created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to resend campaign");
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckDlr = async () => {
    setIsCheckingDlr(true);
    try {
      const result = await checkDlr({ bulkMessageId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          `DLR check complete: ${result.checked} checked, ${result.delivered} delivered, ${result.failed} failed, ${result.unchanged} unchanged`
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to check DLR");
    } finally {
      setIsCheckingDlr(false);
    }
  };

  const canResend = bulkMessage.status === "completed" || bulkMessage.status === "failed";
  const hasPendingRecipients = recipients.some(
    (r) => r.status === "sending" || r.status === "sent"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold mb-2">{bulkMessage.name}</h3>
          <p className="text-sm text-muted-foreground">{bulkMessage.message}</p>
        </div>
        <div className="flex gap-2">
          {hasPendingRecipients && (
            <Button 
              onClick={handleCheckDlr} 
              disabled={isCheckingDlr}
              variant="secondary"
            >
              <Activity className={cn("h-4 w-4 mr-2", isCheckingDlr && "animate-pulse")} />
              {isCheckingDlr ? "Checking..." : "Check DLR"}
            </Button>
          )}
          {canResend && (
            <Button 
              onClick={handleResend} 
              disabled={isResending}
              variant="secondary"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isResending && "animate-spin")} />
              {isResending ? "Resending..." : "Resend Campaign"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{bulkMessage.totalRecipients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{bulkMessage.sentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{bulkMessage.deliveredCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{bulkMessage.failedCount}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h4 className="font-semibold mb-3">Recipients ({recipients.length})</h4>
        <div className="border rounded-lg max-h-96 overflow-auto">
          <table className="w-full">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Phone Number</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((recipient, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-3 text-sm">{recipient.phoneNumber}</td>
                  <td className="p-3">
                    <Badge variant={getStatusVariant(recipient.status)}>
                      {recipient.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BulkSMSSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "delivered":
    case "completed":
    case "sent":
      return "default";
    case "processing":
    case "pending":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

function UpdateBulkStatusButton() {
  const triggerUpdate = useMutation(api.messages.triggerBulkRecipientsMarkDelivered);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await triggerUpdate();
      toast.success("Bulk status update started. Recipients will be updated in batches.");
    } catch {
      toast.error("Failed to start bulk status update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
      Update Bulk Status
    </Button>
  );
}
