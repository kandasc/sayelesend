import { Authenticated } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Plus, Edit, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { usePagination } from "@/hooks/use-pagination.ts";
import PaginationControls from "@/components/ui/pagination-controls.tsx";

const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL as string;

function MTargetWebhookInfo() {
  const [copied, setCopied] = useState(false);
  const singleDlrUrl = `${CONVEX_SITE_URL}/webhooks/sms/delivery/mtarget`;
  const bulkDlrUrl = `${CONVEX_SITE_URL}/webhooks/bulk/delivery/mtarget`;

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
      <CardContent className="pt-4 space-y-3">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
          Configure DLR Webhooks in MTarget
        </p>
        
        <div>
          <p className="text-xs text-blue-800 dark:text-blue-200 mb-1 font-medium">
            Single SMS DLR Webhook:
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded flex-1 break-all">
              {singleDlrUrl}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 shrink-0"
              onClick={() => copyUrl(singleDlrUrl)}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        <div>
          <p className="text-xs text-blue-800 dark:text-blue-200 mb-1 font-medium">
            Bulk SMS DLR Webhook:
          </p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded flex-1 break-all">
              {bulkDlrUrl}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 shrink-0"
              onClick={() => copyUrl(bulkDlrUrl)}
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        <p className="text-xs text-blue-800 dark:text-blue-200">
          Status codes: 3=delivered, 4=refused, 6=not delivered
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminProviders() {
  return (
    <Authenticated>
      <ProvidersContent />
    </Authenticated>
  );
}

function ProvidersContent() {
  const providers = useQuery(api.providers.listProviders, {});
  const providersPagination = usePagination(providers ?? [], { pageSize: 10 });
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Id<"smsProviders"> | null>(
    null
  );

  if (!providers) {
    return <ProvidersSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Messaging Providers</h1>
          <p className="text-muted-foreground">Manage SMS, WhatsApp, Telegram, and Facebook Messenger providers</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Messaging Provider</DialogTitle>
            </DialogHeader>
            <CreateProviderForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {providersPagination.paginatedItems.map((provider) => (
          <Card key={provider._id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{provider.name}</h3>
                    <Badge variant={provider.isActive ? "default" : "secondary"}>
                      {provider.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">
                    Type: {provider.type.replace("_", " ")}
                  </p>
                  {provider.channel && (
                    <p className="text-sm text-muted-foreground capitalize">
                      Channel: {provider.channel.replace("_", " ")}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedProvider(provider._id);
                    setEditOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost per SMS</span>
                  <span className="font-medium">{provider.costPerSms} credits</span>
                </div>
                {provider.config.senderId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sender ID</span>
                    <span className="font-medium">{provider.config.senderId}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <PaginationControls {...providersPagination} itemLabel="providers" />

      {editOpen && selectedProvider && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Provider</DialogTitle>
            </DialogHeader>
            <EditProviderForm
              providerId={selectedProvider}
              onSuccess={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CreateProviderForm({ onSuccess }: { onSuccess: () => void }) {
  const createProvider = useMutation(api.providers.createProvider);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providerType, setProviderType] = useState<string>("twilio");
  const [twilioChannel, setTwilioChannel] = useState<"sms" | "whatsapp">("sms");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const config: Record<string, string> = {};

    // Build config based on provider type
    let channel: "sms" | "whatsapp" | "telegram" | "facebook_messenger" = "sms";

    if (providerType === "twilio") {
      channel = twilioChannel; // Use selected channel for Twilio
      config.accountSid = formData.get("accountSid") as string;
      config.authToken = formData.get("authToken") as string;
      config.senderId = formData.get("senderId") as string;
    } else if (providerType === "vonage") {
      config.apiKey = formData.get("apiKey") as string;
      config.apiSecret = formData.get("apiSecret") as string;
      config.senderId = formData.get("senderId") as string;
    } else if (providerType === "africas_talking") {
      config.username = formData.get("username") as string;
      config.apiKey = formData.get("apiKey") as string;
      config.senderId = formData.get("senderId") as string;
    } else if (providerType === "mtarget") {
      config.username = formData.get("username") as string;
      config.password = formData.get("password") as string;
      config.senderId = formData.get("senderId") as string;
      config.serviceId = formData.get("serviceId") as string;
      config.remoteId = formData.get("remoteId") as string;
      config.uniqueId = formData.get("uniqueId") as string;
    } else if (providerType === "whatsapp") {
      channel = "whatsapp";
      config.phoneNumberId = formData.get("phoneNumberId") as string;
      config.businessAccountId = formData.get("businessAccountId") as string;
      config.accessToken = formData.get("accessToken") as string;
      config.senderId = formData.get("senderId") as string;
    } else if (providerType === "telegram") {
      channel = "telegram";
      config.botToken = formData.get("botToken") as string;
      config.senderId = formData.get("senderId") as string;
    } else if (providerType === "facebook_messenger") {
      channel = "facebook_messenger";
      config.pageAccessToken = formData.get("pageAccessToken") as string;
      config.pageId = formData.get("pageId") as string;
      config.appSecret = formData.get("appSecret") as string;
      config.senderId = formData.get("senderId") as string;
    } else {
      config.endpoint = formData.get("endpoint") as string;
      config.apiKey = formData.get("apiKey") as string;
      config.senderId = formData.get("senderId") as string;
    }

    try {
      await createProvider({
        name: formData.get("name") as string,
        type: providerType as "twilio" | "vonage" | "africas_talking" | "mtarget" | "whatsapp" | "telegram" | "facebook_messenger" | "custom",
        channel,
        costPerSms: Number(formData.get("costPerSms")),
        isActive: formData.get("isActive") === "on",
        config,
      });
      toast.success("Provider created successfully");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create provider");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Provider Name</Label>
          <Input id="name" name="name" placeholder="My Twilio Account" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Provider Type</Label>
          <Select name="type" value={providerType} onValueChange={setProviderType} required>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="twilio">Twilio</SelectItem>
              <SelectItem value="vonage">Vonage</SelectItem>
              <SelectItem value="africas_talking">Africa's Talking</SelectItem>
              <SelectItem value="mtarget">MTarget</SelectItem>
              <SelectItem value="whatsapp">WhatsApp Business API</SelectItem>
              <SelectItem value="telegram">Telegram Bot</SelectItem>
              <SelectItem value="facebook_messenger">Facebook Messenger</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="costPerSms">Cost per SMS (credits)</Label>
          <Input id="costPerSms" name="costPerSms" type="number" min="0" step="0.01" defaultValue="1" required />
        </div>
        <div className="space-y-2 flex items-end pb-2">
          <div className="flex items-center space-x-2">
            <Switch id="isActive" name="isActive" defaultChecked />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </div>
      </div>

      {providerType === "twilio" && (
        <>
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 mb-4">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Twilio Multi-Channel Provider
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Supports SMS and WhatsApp through a single provider. Select the channel below.
              </p>
            </CardContent>
          </Card>
          
          <div className="space-y-2">
            <Label htmlFor="twilioChannel">
              Channel <span className="text-destructive">*</span>
            </Label>
            <Select value={twilioChannel} onValueChange={(value) => setTwilioChannel(value as "sms" | "whatsapp")} required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select which channel this provider will be used for. Create separate providers for each channel.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="accountSid">
              Account SID <span className="text-destructive">*</span>
            </Label>
            <Input 
              id="accountSid" 
              name="accountSid"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              required 
            />
            <p className="text-xs text-muted-foreground">
              Your Twilio Account SID from the Console Dashboard
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="authToken">
              Auth Token <span className="text-destructive">*</span>
            </Label>
            <Input 
              id="authToken" 
              name="authToken" 
              type="password"
              placeholder="••••••••••••••••••••••••••••••••"
              required 
            />
            <p className="text-xs text-muted-foreground">
              Your Twilio Auth Token from the Console Dashboard
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="senderId">Sender Phone Number (Optional)</Label>
            <Input 
              id="senderId" 
              name="senderId"
              placeholder="+15551234567"
            />
            <p className="text-xs text-muted-foreground">
              Your Twilio phone number in E.164 format. For WhatsApp, must be a WhatsApp-enabled number.
            </p>
          </div>
          
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                📋 Setup Instructions
              </p>
              <ol className="text-xs text-amber-800 dark:text-amber-200 space-y-2 list-decimal list-inside">
                <li>Sign up at <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noopener noreferrer" className="underline">twilio.com</a></li>
                <li>Get your Account SID and Auth Token from the Console Dashboard</li>
                <li>For <strong>SMS</strong>: Purchase a phone number or use a Messaging Service</li>
                <li>For <strong>WhatsApp</strong>: Request WhatsApp access and connect your WhatsApp Business number</li>
                <li>Set the "Channel" field when creating this provider (SMS or WhatsApp)</li>
                <li>Create separate provider entries for each channel you want to use</li>
              </ol>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-3 font-medium">
                💡 Tip: Create one Twilio provider for SMS and another for WhatsApp using the same credentials but different channels.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {providerType === "vonage" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input id="apiKey" name="apiKey" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiSecret">API Secret</Label>
            <Input id="apiSecret" name="apiSecret" type="password" required />
          </div>
        </>
      )}

      {providerType === "africas_talking" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input id="apiKey" name="apiKey" type="password" required />
          </div>
        </>
      )}

      {providerType === "mtarget" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" defaultValue="sayele" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" defaultValue="831BlSGoiOTp" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceId">Service ID</Label>
            <Input id="serviceId" name="serviceId" defaultValue="33189" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="remoteId">Remote ID</Label>
            <Input id="remoteId" name="remoteId" defaultValue="dooci" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uniqueId">Unique ID</Label>
            <Input id="uniqueId" name="uniqueId" defaultValue="doocisms05" required />
          </div>
          <MTargetWebhookInfo />
        </>
      )}

      {providerType === "whatsapp" && (
        <>
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 mb-4">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Meta WhatsApp Cloud API
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Direct integration with Meta's WhatsApp Business Platform (no markup, pay Meta's rates directly)
              </p>
            </CardContent>
          </Card>
          
          <div className="space-y-2">
            <Label htmlFor="phoneNumberId">
              Phone Number ID <span className="text-destructive">*</span>
            </Label>
            <Input 
              id="phoneNumberId" 
              name="phoneNumberId" 
              placeholder="123456789012345"
              required 
            />
            <p className="text-xs text-muted-foreground">
              Your WhatsApp Business Phone Number ID from Meta Business Manager
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="businessAccountId">
              Business Account ID (WABA ID) <span className="text-destructive">*</span>
            </Label>
            <Input 
              id="businessAccountId" 
              name="businessAccountId"
              placeholder="123456789012345"
              required 
            />
            <p className="text-xs text-muted-foreground">
              Your WhatsApp Business Account ID from Meta Business Manager
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="accessToken">
              Permanent Access Token <span className="text-destructive">*</span>
            </Label>
            <Input 
              id="accessToken" 
              name="accessToken" 
              type="password"
              placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxx"
              required 
            />
            <p className="text-xs text-muted-foreground">
              System User access token with whatsapp_business_messaging permission
            </p>
          </div>
          
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                📋 Setup Instructions
              </p>
              <ol className="text-xs text-amber-800 dark:text-amber-200 space-y-2 list-decimal list-inside">
                <li>Go to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">business.facebook.com</a> and create a Meta Business Account</li>
                <li>Create a WhatsApp Business App in <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">Meta Developer Portal</a></li>
                <li>Add and verify your phone number in WhatsApp → Getting Started</li>
                <li>Create a System User in Business Settings → Users → System Users</li>
                <li>Generate a permanent access token with <strong>whatsapp_business_messaging</strong> permission</li>
                <li>Copy your Phone Number ID from WhatsApp → API Setup</li>
                <li>Copy your Business Account ID (WABA ID) from WhatsApp Settings</li>
                <li>Important: Phone numbers must be in E.164 format (e.g., +15551234567)</li>
              </ol>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-3 font-medium">
                💰 Pricing: Messages are billed by Meta based on country and conversation type. No markup added by SAYELE.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {providerType === "telegram" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="botToken">Bot Token</Label>
            <Input id="botToken" name="botToken" type="password" required />
          </div>
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Telegram Configuration Guide
              </p>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <li>1. Talk to @BotFather on Telegram</li>
                <li>2. Send /newbot and follow instructions</li>
                <li>3. Copy the bot token provided by BotFather</li>
                <li>4. Your bot can now send and receive messages</li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {providerType === "facebook_messenger" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="pageAccessToken">Page Access Token</Label>
            <Input id="pageAccessToken" name="pageAccessToken" type="password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pageId">Page ID</Label>
            <Input id="pageId" name="pageId" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="appSecret">App Secret</Label>
            <Input id="appSecret" name="appSecret" type="password" required />
          </div>
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Facebook Messenger Configuration Guide
              </p>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <li>1. Create a Facebook App at developers.facebook.com</li>
                <li>2. Add the Messenger product to your app</li>
                <li>3. Create or select a Facebook Page</li>
                <li>4. Generate a Page Access Token</li>
                <li>5. Copy the Page ID and App Secret from settings</li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {providerType === "custom" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="endpoint">API Endpoint</Label>
            <Input id="endpoint" name="endpoint" type="url" placeholder="https://api.example.com/send" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input id="apiKey" name="apiKey" type="password" required />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="senderId">Sender ID / From Number</Label>
        <Input id="senderId" name="senderId" placeholder="SAYELE" required />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Provider"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditProviderForm({
  providerId,
  onSuccess,
}: {
  providerId: Id<"smsProviders">;
  onSuccess: () => void;
}) {
  const provider = useQuery(api.providers.getProvider, { providerId });
  const updateProvider = useMutation(api.providers.updateProvider);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!provider) {
    return <div>Loading...</div>;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const config: Record<string, string> = {};

    // Build config based on provider type
    if (provider.type === "twilio") {
      config.accountSid = formData.get("accountSid") as string;
      config.authToken = formData.get("authToken") as string;
      config.senderId = formData.get("senderId") as string;
    } else if (provider.type === "vonage") {
      config.apiKey = formData.get("apiKey") as string;
      config.apiSecret = formData.get("apiSecret") as string;
      config.senderId = formData.get("senderId") as string;
    } else if (provider.type === "africas_talking") {
      config.username = formData.get("username") as string;
      config.apiKey = formData.get("apiKey") as string;
      config.senderId = formData.get("senderId") as string;
    } else if (provider.type === "mtarget") {
      config.username = formData.get("username") as string;
      config.password = formData.get("password") as string;
      config.senderId = formData.get("senderId") as string;
      config.serviceId = formData.get("serviceId") as string;
      config.remoteId = formData.get("remoteId") as string;
      config.uniqueId = formData.get("uniqueId") as string;
    } else {
      config.endpoint = formData.get("endpoint") as string;
      config.apiKey = formData.get("apiKey") as string;
      config.senderId = formData.get("senderId") as string;
    }

    try {
      await updateProvider({
        providerId,
        name: formData.get("name") as string,
        costPerSms: Number(formData.get("costPerSms")),
        isActive: formData.get("isActive") === "on",
        config,
      });
      toast.success("Provider updated successfully");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update provider");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Provider Name</Label>
          <Input id="name" name="name" defaultValue={provider.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Provider Type</Label>
          <Input id="type" value={provider.type} disabled className="bg-muted" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="costPerSms">Cost per SMS (credits)</Label>
          <Input
            id="costPerSms"
            name="costPerSms"
            type="number"
            min="0"
            step="0.01"
            defaultValue={provider.costPerSms}
            required
          />
        </div>
        <div className="space-y-2 flex items-end pb-2">
          <div className="flex items-center space-x-2">
            <Switch id="isActive" name="isActive" defaultChecked={provider.isActive} />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </div>
      </div>

      {provider.type === "twilio" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="accountSid">Account SID</Label>
            <Input id="accountSid" name="accountSid" defaultValue={provider.config.accountSid} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="authToken">Auth Token</Label>
            <Input
              id="authToken"
              name="authToken"
              type="password"
              defaultValue={provider.config.authToken}
              required
            />
          </div>
        </>
      )}

      {provider.type === "vonage" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input id="apiKey" name="apiKey" defaultValue={provider.config.apiKey} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiSecret">API Secret</Label>
            <Input
              id="apiSecret"
              name="apiSecret"
              type="password"
              defaultValue={provider.config.apiSecret}
              required
            />
          </div>
        </>
      )}

      {provider.type === "africas_talking" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" defaultValue={provider.config.username} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input id="apiKey" name="apiKey" type="password" defaultValue={provider.config.apiKey} required />
          </div>
        </>
      )}

      {provider.type === "mtarget" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" defaultValue={provider.config.username} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              defaultValue={provider.config.password}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceId">Service ID</Label>
            <Input id="serviceId" name="serviceId" defaultValue={provider.config.serviceId} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="remoteId">Remote ID</Label>
            <Input id="remoteId" name="remoteId" defaultValue={provider.config.remoteId} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uniqueId">Unique ID</Label>
            <Input id="uniqueId" name="uniqueId" defaultValue={provider.config.uniqueId} required />
          </div>
          <MTargetWebhookInfo />
        </>
      )}

      {provider.type === "custom" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="endpoint">API Endpoint</Label>
            <Input
              id="endpoint"
              name="endpoint"
              type="url"
              defaultValue={provider.config.endpoint}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input id="apiKey" name="apiKey" type="password" defaultValue={provider.config.apiKey} required />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="senderId">Sender ID / From Number</Label>
        <Input id="senderId" name="senderId" defaultValue={provider.config.senderId} required />
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update Provider"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ProvidersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  );
}
