import { Authenticated } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";

export default function Settings() {
  return (
    <Authenticated>
      <SettingsContent />
    </Authenticated>
  );
}

function SettingsContent() {
  const currentUser = useQuery(api.testMode.getEffectiveUser, {});
  const client = useQuery(
    api.clients.getCurrentClient,
    currentUser?.role === "client" ? {} : "skip"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentUser && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Name
                </div>
                <div className="col-span-2">{currentUser.name || "Not set"}</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Email
                </div>
                <div className="col-span-2">{currentUser.email || "Not set"}</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Role
                </div>
                <div className="col-span-2">
                  <Badge>{currentUser.role}</Badge>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {client && currentUser?.role === "client" && (
        <Card>
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm font-medium text-muted-foreground">
                Company Name
              </div>
              <div className="col-span-2">{client.companyName}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm font-medium text-muted-foreground">
                Contact Name
              </div>
              <div className="col-span-2">{client.contactName}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm font-medium text-muted-foreground">
                Phone
              </div>
              <div className="col-span-2">{client.phone}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm font-medium text-muted-foreground">
                Status
              </div>
              <div className="col-span-2">
                <Badge
                  variant={client.status === "active" ? "default" : "secondary"}
                >
                  {client.status}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm font-medium text-muted-foreground">
                Available Credits
              </div>
              <div className="col-span-2 font-semibold">
                {client.credits.toLocaleString()}
              </div>
            </div>
            {client.webhookUrl && (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Webhook URL
                </div>
                <div className="col-span-2 font-mono text-sm break-all">
                  {client.webhookUrl}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
