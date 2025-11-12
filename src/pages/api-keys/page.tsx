import { Authenticated } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Plus, Eye, EyeOff, Copy, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Switch } from "@/components/ui/switch.tsx";

type ApiKey = {
  _id: Id<"apiKeys">;
  _creationTime: number;
  clientId: Id<"clients">;
  key: string;
  name: string;
  isActive: boolean;
  lastUsedAt?: number;
};

export default function ApiKeys() {
  return (
    <Authenticated>
      <ApiKeysContent />
    </Authenticated>
  );
}

function ApiKeysContent() {
  const currentUser = useQuery(api.testMode.getEffectiveUser, {});
  const client = useQuery(api.clients.getCurrentClient, {});
  const apiKeys = useQuery(
    api.apiKeys.listApiKeys,
    client ? { clientId: client._id } : "skip"
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">
            Manage your API keys for programmatic access
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
            </DialogHeader>
            <CreateApiKeyForm
              clientId={client?._id}
              onSuccess={(key) => {
                setNewApiKey(key);
                setIsDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {newApiKey && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-lg">New API Key Created</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Make sure to copy your API key now. You won't be able to see it again!
            </p>
            <div className="flex gap-2">
              <Input value={newApiKey} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(newApiKey);
                  toast.success("API key copied to clipboard");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setNewApiKey(null)}
            >
              I've saved my API key
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {!apiKeys || apiKeys.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No API keys created yet
            </p>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <ApiKeyItem key={key._id} apiKey={key} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Send SMS</h3>
            <code className="block bg-secondary p-3 rounded text-sm overflow-x-auto">
              POST /api/v1/sms/send
            </code>
            <pre className="bg-secondary p-3 rounded mt-2 text-xs overflow-x-auto">
{`{
  "to": "+1234567890",
  "message": "Hello World",
  "from": "SAYELE" // optional
}`}
            </pre>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Check Message Status</h3>
            <code className="block bg-secondary p-3 rounded text-sm overflow-x-auto">
              GET /api/v1/sms/status/:messageId
            </code>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Authentication</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Include your API key in the Authorization header:
            </p>
            <code className="block bg-secondary p-3 rounded text-sm">
              Authorization: Bearer YOUR_API_KEY
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ApiKeyItem({ apiKey }: { apiKey: ApiKey }) {
  const [showKey, setShowKey] = useState(false);
  const toggleApiKey = useMutation(api.apiKeys.toggleApiKey);
  const deleteApiKey = useMutation(api.apiKeys.deleteApiKey);

  const maskedKey = apiKey.key.substring(0, 10) + "...";

  const handleToggle = async () => {
    try {
      await toggleApiKey({
        apiKeyId: apiKey._id,
        isActive: !apiKey.isActive,
      });
      toast.success(
        apiKey.isActive ? "API key disabled" : "API key enabled"
      );
    } catch (error) {
      toast.error("Failed to update API key");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteApiKey({ apiKeyId: apiKey._id });
      toast.success("API key deleted");
    } catch (error) {
      toast.error("Failed to delete API key");
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{apiKey.name}</p>
          <Badge variant={apiKey.isActive ? "default" : "secondary"}>
            {apiKey.isActive ? "Active" : "Disabled"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <code className="text-sm text-muted-foreground font-mono">
            {showKey ? apiKey.key : maskedKey}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowKey(!showKey)}
          >
            {showKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(apiKey.key);
              toast.success("API key copied");
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        {apiKey.lastUsedAt && (
          <p className="text-xs text-muted-foreground">
            Last used: {format(new Date(apiKey.lastUsedAt), "PPp")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`toggle-${apiKey._id}`} className="text-sm">
            {apiKey.isActive ? "Enabled" : "Disabled"}
          </Label>
          <Switch
            id={`toggle-${apiKey._id}`}
            checked={apiKey.isActive}
            onCheckedChange={handleToggle}
          />
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Applications using this key will
                no longer be able to access the API.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function CreateApiKeyForm({
  clientId,
  onSuccess,
}: {
  clientId?: Id<"clients">;
  onSuccess: (key: string) => void;
}) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const createApiKey = useMutation(api.apiKeys.createApiKey);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast.error("Client not found");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createApiKey({
        name,
        clientId,
      });
      toast.success("API key created successfully");
      setName("");
      onSuccess(result.key);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create API key";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">API Key Name</Label>
        <Input
          id="name"
          placeholder="Production Server"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Give your API key a descriptive name for easy identification
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create API Key"}
        </Button>
      </div>
    </form>
  );
}
