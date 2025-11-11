import { Authenticated } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import DashboardLayout from "@/components/dashboard-layout.tsx";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Plus, Send, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

export default function BulkSMS() {
  return (
    <Authenticated>
      <DashboardLayout>
        <BulkSMSContent />
      </DashboardLayout>
    </Authenticated>
  );
}

function BulkSMSContent() {
  const bulkMessages = useQuery(api.bulk.getBulkMessages, {});
  const client = useQuery(api.clients.getCurrentClient, {});
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<Id<"bulkMessages"> | null>(null);

  if (!bulkMessages || !client) {
    return <BulkSMSSkeleton />;
  }

  const pendingCampaigns = bulkMessages.filter(
    (b) => b.status === "pending" || b.status === "processing"
  );
  const completedCampaigns = bulkMessages.filter((b) => b.status === "completed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bulk SMS</h1>
          <p className="text-muted-foreground">Send SMS to multiple recipients</p>
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
              <DialogTitle>Create Bulk SMS Campaign</DialogTitle>
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
          <TabsTrigger value="pending">
            Active ({pendingCampaigns.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedCampaigns.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <CampaignList campaigns={bulkMessages} onViewDetails={setDetailsId} />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <CampaignList campaigns={pendingCampaigns} onViewDetails={setDetailsId} />
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

  const handleRecipientsChange = (value: string) => {
    setRecipients(value);
    const numbers = value
      .split(/[\n,;]/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    setRecipientCount(numbers.length);
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

    try {
      await createBulk({
        name: formData.get("name") as string,
        message: formData.get("message") as string,
        recipients: numbers,
        from: (formData.get("from") as string) || undefined,
      });
      toast.success(`Bulk SMS campaign created with ${numbers.length} recipients`);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedCost = client ? recipientCount * 1 : 0; // Assuming 1 credit per SMS

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Campaign Name</Label>
        <Input id="name" name="name" placeholder="Spring Sale 2025" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="Your message here..."
          rows={4}
          required
          maxLength={160}
        />
        <p className="text-xs text-muted-foreground">Max 160 characters</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="from">Sender ID (Optional)</Label>
        <Input id="from" name="from" placeholder="SAYELE" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recipients">Recipients</Label>
        <Textarea
          id="recipients"
          value={recipients}
          onChange={(e) => handleRecipientsChange(e.target.value)}
          placeholder="Enter phone numbers (one per line, or comma/semicolon separated)&#10;+1234567890&#10;+0987654321"
          rows={6}
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
      </div>

      {client && estimatedCost > client.credits && (
        <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-sm text-destructive font-medium">
            Insufficient credits. You need {estimatedCost} credits but only have{" "}
            {client.credits} available.
          </p>
        </div>
      )}

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting || (client && estimatedCost > client.credits)}>
          {isSubmitting ? "Creating..." : "Create Campaign"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function CampaignDetails({ bulkMessageId }: { bulkMessageId: Id<"bulkMessages"> }) {
  const details = useQuery(api.bulk.getBulkMessageDetails, { bulkMessageId });

  if (!details) {
    return <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>;
  }

  const { bulkMessage, recipients } = details;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">{bulkMessage.name}</h3>
        <p className="text-sm text-muted-foreground">{bulkMessage.message}</p>
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
