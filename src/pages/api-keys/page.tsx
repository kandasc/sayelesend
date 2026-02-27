import { Authenticated } from "convex/react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Plus, Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { usePagination } from "@/hooks/use-pagination.ts";
import PaginationControls from "@/components/ui/pagination-controls.tsx";
import { useIntl } from "react-intl";
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
  keyHash?: string;
  keyPreview?: string;
  name: string;
  isActive: boolean;
  lastUsedAt?: number;
  requestCount?: number;
  lastRequestAt?: number;
};

export default function ApiKeys() {
  return (
    <Authenticated>
      <ApiKeysContent />
    </Authenticated>
  );
}

function ApiKeysContent() {
  const intl = useIntl();
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
          <h1 className="text-3xl font-bold">
            {intl.formatMessage({ id: "page.apiKeys.title" })}
          </h1>
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: "page.apiKeys.subtitle" })}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: "page.apiKeys.createApiKey" })}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {intl.formatMessage({ id: "page.apiKeys.createNewApiKey" })}
              </DialogTitle>
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
            <CardTitle className="text-lg">
              {intl.formatMessage({ id: "page.apiKeys.newKeyCreated" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {intl.formatMessage({ id: "page.apiKeys.copyWarning" })}
            </p>
            <div className="flex gap-2">
              <Input value={newApiKey} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(newApiKey);
                  toast.success(
                    intl.formatMessage({ id: "page.apiKeys.keyCopied" })
                  );
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
              {intl.formatMessage({ id: "page.apiKeys.keySaved" })}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {intl.formatMessage({ id: "page.apiKeys.yourKeys" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!apiKeys || apiKeys.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {intl.formatMessage({ id: "page.apiKeys.noKeys" })}
            </p>
          ) : (
            <ApiKeyList apiKeys={apiKeys} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {intl.formatMessage({ id: "page.apiKeys.apiDoc" })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">
              {intl.formatMessage({ id: "page.apiKeys.sendSms" })}
            </h3>
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
            <h3 className="font-semibold mb-2">
              {intl.formatMessage({ id: "page.apiKeys.checkStatus" })}
            </h3>
            <code className="block bg-secondary p-3 rounded text-sm overflow-x-auto">
              GET /api/v1/sms/status/:messageId
            </code>
          </div>
          <div>
            <h3 className="font-semibold mb-2">
              {intl.formatMessage({ id: "page.apiKeys.authentication" })}
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              {intl.formatMessage({ id: "page.apiKeys.authDesc" })}
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

function ApiKeyList({ apiKeys }: { apiKeys: ApiKey[] }) {
  const keysPagination = usePagination(apiKeys, { pageSize: 10 });

  return (
    <div className="space-y-3">
      {keysPagination.paginatedItems.map((key) => (
        <ApiKeyItem key={key._id} apiKey={key} />
      ))}
      <PaginationControls {...keysPagination} itemLabel="API keys" />
    </div>
  );
}

function ApiKeyItem({ apiKey }: { apiKey: ApiKey }) {
  const intl = useIntl();
  const toggleApiKey = useMutation(api.apiKeys.toggleApiKey);
  const deleteApiKey = useMutation(api.apiKeys.deleteApiKey);

  const handleToggle = async () => {
    try {
      await toggleApiKey({
        apiKeyId: apiKey._id,
        isActive: !apiKey.isActive,
      });
      toast.success(
        intl.formatMessage({
          id: apiKey.isActive ? "page.apiKeys.keyDisabled" : "page.apiKeys.keyEnabled"
        })
      );
    } catch (error) {
      toast.error("Failed to update API key");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteApiKey({ apiKeyId: apiKey._id });
      toast.success(
        intl.formatMessage({ id: "page.apiKeys.keyDeleted" })
      );
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
            {intl.formatMessage({
              id: apiKey.isActive ? "page.apiKeys.enabled" : "page.apiKeys.disabled"
            })}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <code className="text-sm text-muted-foreground font-mono">
            {apiKey.keyPreview || "****"}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (apiKey.keyPreview) {
                navigator.clipboard.writeText(apiKey.keyPreview);
                toast.success("API key preview copied");
              }
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        {apiKey.lastUsedAt && (
          <p className="text-xs text-muted-foreground">
            {intl.formatMessage({ id: "page.apiKeys.lastUsed" })}
            {" "}
            {format(new Date(apiKey.lastUsedAt), "PPp")}
          </p>
        )}
        {apiKey.requestCount !== undefined && apiKey.requestCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {intl.formatMessage({ id: "page.apiKeys.totalRequests" })}: {apiKey.requestCount}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`toggle-${apiKey._id}`} className="text-sm">
            {intl.formatMessage({
              id: apiKey.isActive ? "page.apiKeys.enabled" : "page.apiKeys.disabled"
            })}
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
              <AlertDialogTitle>
                {intl.formatMessage({ id: "page.apiKeys.deleteApiKey" })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {intl.formatMessage({ id: "page.apiKeys.deleteApiKeyDesc" })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {intl.formatMessage({ id: "buttons.cancel" })}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                {intl.formatMessage({ id: "buttons.delete" })}
              </AlertDialogAction>
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
  const intl = useIntl();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const createApiKey = useAction(api.apiKeys.createApiKey);

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
      toast.success(
        intl.formatMessage({ id: "page.apiKeys.keyCreated" })
      );
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
        <Label htmlFor="name">
          {intl.formatMessage({ id: "page.apiKeys.apiKeyName" })}
        </Label>
        <Input
          id="name"
          placeholder="Production Server"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          {intl.formatMessage({ id: "page.apiKeys.apiKeyNameDesc" })}
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? intl.formatMessage({ id: "buttons.creating" })
            : intl.formatMessage({ id: "page.apiKeys.createApiKey" })}
        </Button>
      </div>
    </form>
  );
}
