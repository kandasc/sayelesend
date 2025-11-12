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
import { Plus, Edit } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

export default function AdminProviders() {
  return (
    <Authenticated>
      <ProvidersContent />
    </Authenticated>
  );
}

function ProvidersContent() {
  const providers = useQuery(api.providers.listProviders, {});
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
          <h1 className="text-3xl font-bold">SMS Providers</h1>
          <p className="text-muted-foreground">Manage SMS gateway providers</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add SMS Provider</DialogTitle>
            </DialogHeader>
            <CreateProviderForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => (
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

      {editOpen && selectedProvider && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl">
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const config: Record<string, string> = {};

    // Build config based on provider type
    if (providerType === "twilio") {
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
    } else {
      config.endpoint = formData.get("endpoint") as string;
      config.apiKey = formData.get("apiKey") as string;
      config.senderId = formData.get("senderId") as string;
    }

    try {
      await createProvider({
        name: formData.get("name") as string,
        type: providerType as "twilio" | "vonage" | "africas_talking" | "mtarget" | "whatsapp" | "telegram" | "facebook_messenger" | "custom",
        channel: "sms",
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
          <div className="space-y-2">
            <Label htmlFor="accountSid">Account SID</Label>
            <Input id="accountSid" name="accountSid" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="authToken">Auth Token</Label>
            <Input id="authToken" name="authToken" type="password" required />
          </div>
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
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Configure DLR Webhook in MTarget
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                To receive delivery receipts, configure this URL in your MTarget account:
              </p>
              <code className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded block mb-2">
                {window.location.origin.replace("https://", "https://your-deployment.").replace(":3000", "")}/webhooks/sms/delivery/mtarget
              </code>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                MTarget will send DLR callbacks with Status codes: 3=delivered, 4=refused, 6=not delivered
              </p>
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
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Configure DLR Webhook in MTarget
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                To receive delivery receipts, configure this URL in your MTarget account:
              </p>
              <code className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded block mb-2">
                {window.location.origin.replace("https://", "https://your-deployment.").replace(":3000", "")}/webhooks/sms/delivery/mtarget
              </code>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                MTarget will send DLR callbacks with Status codes: 3=delivered, 4=refused, 6=not delivered
              </p>
            </CardContent>
          </Card>
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
