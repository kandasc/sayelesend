import { Authenticated } from "convex/react";
import { useQuery, useMutation } from "convex/react";
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
import { Plus, Edit, DollarSign, Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

export default function AdminClients() {
  return (
    <Authenticated>
      <ClientsContent />
    </Authenticated>
  );
}

function ClientsContent() {
  const clients = useQuery(api.clients.listClients, {});
  const providers = useQuery(api.providers.listProviders, {});
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Id<"clients"> | null>(null);

  if (!clients || !providers) {
    return <ClientsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Management</h1>
          <p className="text-muted-foreground">Manage client accounts and access</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Client</DialogTitle>
            </DialogHeader>
            <CreateClientForm
              providers={providers}
              onSuccess={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {clients.map((client) => {
          const provider = providers.find((p) => p._id === client.smsProviderId);
          return (
            <Card key={client._id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{client.companyName}</h3>
                      <Badge
                        variant={
                          client.status === "active"
                            ? "default"
                            : client.status === "suspended"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {client.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Contact</p>
                        <p className="font-medium">{client.contactName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{client.email}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">{client.phone}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Single SMS Provider</p>
                        <p className="font-medium">{provider?.name || "N/A"}</p>
                      </div>
                      {client.bulkSmsProviderId && (
                        <div>
                          <p className="text-muted-foreground">Bulk SMS Provider</p>
                          <p className="font-medium">
                            {providers.find((p) => p._id === client.bulkSmsProviderId)?.name || "N/A"}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Credits</p>
                        <p className="font-medium text-lg">{client.credits.toLocaleString()}</p>
                      </div>
                      {client.whatsappProviderId && (
                        <div>
                          <p className="text-muted-foreground">WhatsApp</p>
                          <p className="font-medium">
                            {providers.find((p) => p._id === client.whatsappProviderId)?.name || "N/A"}
                          </p>
                        </div>
                      )}
                      {client.telegramProviderId && (
                        <div>
                          <p className="text-muted-foreground">Telegram</p>
                          <p className="font-medium">
                            {providers.find((p) => p._id === client.telegramProviderId)?.name || "N/A"}
                          </p>
                        </div>
                      )}
                      {client.facebookMessengerProviderId && (
                        <div>
                          <p className="text-muted-foreground">Facebook Messenger</p>
                          <p className="font-medium">
                            {providers.find((p) => p._id === client.facebookMessengerProviderId)?.name || "N/A"}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium">
                          {format(new Date(client._creationTime), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <AddCreditsDialog clientId={client._id} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedClient(client._id);
                        setEditOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editOpen && selectedClient && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
            </DialogHeader>
            <EditClientForm
              clientId={selectedClient}
              providers={providers}
              onSuccess={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CreateClientForm({
  providers,
  onSuccess,
}: {
  providers: Array<{ _id: Id<"smsProviders">; name: string; channel?: "sms" | "whatsapp" | "telegram" | "facebook_messenger" }>;
  onSuccess: () => void;
}) {
  const createClient = useMutation(api.admin.createClientWithAdmin);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    try {
      const whatsappId = formData.get("whatsappProviderId") as string;
      const telegramId = formData.get("telegramProviderId") as string;
      const facebookId = formData.get("facebookMessengerProviderId") as string;

      const result = await createClient({
        companyName: formData.get("companyName") as string,
        contactName: formData.get("contactName") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        credits: Number(formData.get("credits")),
        smsProviderId: formData.get("providerId") as Id<"smsProviders">,
        whatsappProviderId: whatsappId && whatsappId !== "none" ? whatsappId as Id<"smsProviders"> : undefined,
        telegramProviderId: telegramId && telegramId !== "none" ? telegramId as Id<"smsProviders"> : undefined,
        facebookMessengerProviderId: facebookId && facebookId !== "none" ? facebookId as Id<"smsProviders"> : undefined,
        webhookUrl: (formData.get("webhookUrl") as string) || undefined,
        senderId: (formData.get("senderId") as string) || undefined,
        remoteId: (formData.get("remoteId") as string) || undefined,
        adminEmail: formData.get("adminEmail") as string,
        adminName: formData.get("adminName") as string,
      });
      toast.success(result.message);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create client");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input id="companyName" name="companyName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactName">Contact Name</Label>
          <Input id="contactName" name="contactName" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Company Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="credits">Initial Credits</Label>
        <Input id="credits" name="credits" type="number" min="0" defaultValue="100" required />
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-4">Channel Providers</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="providerId">SMS Provider *</Label>
            <Select name="providerId" required>
              <SelectTrigger>
                <SelectValue placeholder="Select SMS provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.filter((p) => !p.channel || p.channel === "sms").map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsappProviderId">WhatsApp Provider</Label>
            <Select name="whatsappProviderId">
              <SelectTrigger>
                <SelectValue placeholder="Select WhatsApp provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {providers.filter((p) => p.channel === "whatsapp").map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegramProviderId">Telegram Provider</Label>
            <Select name="telegramProviderId">
              <SelectTrigger>
                <SelectValue placeholder="Select Telegram provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {providers.filter((p) => p.channel === "telegram").map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebookMessengerProviderId">Facebook Messenger Provider</Label>
            <Select name="facebookMessengerProviderId">
              <SelectTrigger>
                <SelectValue placeholder="Select Messenger provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {providers.filter((p) => p.channel === "facebook_messenger").map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
        <Input id="webhookUrl" name="webhookUrl" type="url" placeholder="https://example.com/webhook" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="senderId">Sender ID (Optional)</Label>
          <Input id="senderId" name="senderId" placeholder="COMPANY" />
          <p className="text-xs text-muted-foreground">
            Used for MTarget SMS provider
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="remoteId">Remote ID (Optional)</Label>
          <Input id="remoteId" name="remoteId" placeholder="company_id" />
          <p className="text-xs text-muted-foreground">
            Used for MTarget SMS provider
          </p>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-4">Admin User Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="adminName">Admin Name</Label>
            <Input id="adminName" name="adminName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Admin Email</Label>
            <Input id="adminEmail" name="adminEmail" type="email" required />
            <p className="text-xs text-muted-foreground">
              User must sign in with this email to be assigned
            </p>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Client"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditClientForm({
  clientId,
  providers,
  onSuccess,
}: {
  clientId: Id<"clients">;
  providers: Array<{ _id: Id<"smsProviders">; name: string; channel?: "sms" | "whatsapp" | "telegram" | "facebook_messenger" }>;
  onSuccess: () => void;
}) {
  const client = useQuery(api.clients.getClient, { clientId });
  const updateClient = useMutation(api.clients.updateClient);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!client) {
    return <div>Loading...</div>;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    try {
      const bulkSmsId = formData.get("bulkSmsProviderId") as string;
      const whatsappId = formData.get("whatsappProviderId") as string;
      const telegramId = formData.get("telegramProviderId") as string;
      const facebookId = formData.get("facebookMessengerProviderId") as string;

      await updateClient({
        clientId,
        companyName: formData.get("companyName") as string,
        contactName: formData.get("contactName") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        smsProviderId: formData.get("providerId") as Id<"smsProviders">,
        bulkSmsProviderId: bulkSmsId && bulkSmsId !== "none" ? bulkSmsId as Id<"smsProviders"> : undefined,
        whatsappProviderId: whatsappId && whatsappId !== "none" ? whatsappId as Id<"smsProviders"> : undefined,
        telegramProviderId: telegramId && telegramId !== "none" ? telegramId as Id<"smsProviders"> : undefined,
        facebookMessengerProviderId: facebookId && facebookId !== "none" ? facebookId as Id<"smsProviders"> : undefined,
        status: formData.get("status") as "active" | "suspended" | "inactive",
        webhookUrl: (formData.get("webhookUrl") as string) || undefined,
        senderId: (formData.get("senderId") as string) || undefined,
        remoteId: (formData.get("remoteId") as string) || undefined,
      });
      toast.success("Client updated successfully");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update client");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col max-h-[70vh]">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input id="companyName" name="companyName" defaultValue={client.companyName} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactName">Contact Name</Label>
            <Input id="contactName" name="contactName" defaultValue={client.contactName} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={client.email} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={client.phone} required />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={client.status} required>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-4">SMS Providers</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="providerId">Single SMS Provider *</Label>
              <Select name="providerId" defaultValue={client.smsProviderId} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providers.filter((p) => !p.channel || p.channel === "sms").map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Used for single SMS sending</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulkSmsProviderId">Bulk SMS Provider</Label>
              <Select name="bulkSmsProviderId" defaultValue={client.bulkSmsProviderId || "none"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Same as Single SMS</SelectItem>
                  {providers.filter((p) => !p.channel || p.channel === "sms").map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Used for bulk campaigns (optional)</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-4">Other Channel Providers</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappProviderId">WhatsApp Provider</Label>
              <Select name="whatsappProviderId" defaultValue={client.whatsappProviderId || "none"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {providers.filter((p) => p.channel === "whatsapp").map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegramProviderId">Telegram Provider</Label>
              <Select name="telegramProviderId" defaultValue={client.telegramProviderId || "none"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {providers.filter((p) => p.channel === "telegram").map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebookMessengerProviderId">Facebook Messenger Provider</Label>
              <Select name="facebookMessengerProviderId" defaultValue={client.facebookMessengerProviderId || "none"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {providers.filter((p) => p.channel === "facebook_messenger").map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="webhookUrl">Webhook URL</Label>
          <Input
            id="webhookUrl"
            name="webhookUrl"
            type="url"
            defaultValue={client.webhookUrl}
            placeholder="https://example.com/webhook"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="senderId">Sender ID</Label>
            <Input
              id="senderId"
              name="senderId"
              defaultValue={client.senderId}
              placeholder="COMPANY"
            />
            <p className="text-xs text-muted-foreground">
              Used for MTarget SMS provider
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="remoteId">Remote ID</Label>
            <Input
              id="remoteId"
              name="remoteId"
              defaultValue={client.remoteId}
              placeholder="company_id"
            />
            <p className="text-xs text-muted-foreground">
              Used for MTarget SMS provider
            </p>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 pt-4 mt-4 border-t">
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Client"}
          </Button>
        </DialogFooter>
      </div>
    </form>
  );
}

function AddCreditsDialog({ clientId }: { clientId: Id<"clients"> }) {
  const addCredits = useMutation(api.clients.addCredits);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await addCredits({ clientId, amount: Number(amount) });
      toast.success("Credits added successfully");
      setOpen(false);
      setAmount("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add credits");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <DollarSign className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Credits</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Credits"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ClientsSkeleton() {
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
