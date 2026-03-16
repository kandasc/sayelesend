import { Authenticated } from "convex/react";
import { useQuery } from "convex/react";
import { useIntl } from "react-intl";
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
  const intl = useIntl();
  const currentUser = useQuery(api.testMode.getEffectiveUser, {});
  const client = useQuery(api.clients.getCurrentClient, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{intl.formatMessage({ id: "page.settings.title" })}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">{intl.formatMessage({ id: "page.settings.subtitle" })}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{intl.formatMessage({ id: "page.settings.accountInfo" })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentUser && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-sm font-medium text-muted-foreground">
                  {intl.formatMessage({ id: "common.name" })}
                </div>
                <div className="sm:col-span-2">{currentUser.name || intl.formatMessage({ id: "page.settings.notSet" })}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-sm font-medium text-muted-foreground">
                  {intl.formatMessage({ id: "common.email" })}
                </div>
                <div className="sm:col-span-2">{currentUser.email || intl.formatMessage({ id: "page.settings.notSet" })}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-sm font-medium text-muted-foreground">
                  {intl.formatMessage({ id: "page.settings.role" })}
                </div>
                <div className="sm:col-span-2">
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
            <CardTitle>{intl.formatMessage({ id: "page.settings.clientDetails" })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-sm font-medium text-muted-foreground">
                {intl.formatMessage({ id: "page.settings.companyName" })}
              </div>
              <div className="sm:col-span-2">{client.companyName}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-sm font-medium text-muted-foreground">
                {intl.formatMessage({ id: "page.settings.contactName" })}
              </div>
              <div className="sm:col-span-2">{client.contactName}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-sm font-medium text-muted-foreground">
                {intl.formatMessage({ id: "common.phone" })}
              </div>
              <div className="sm:col-span-2">{client.phone}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-sm font-medium text-muted-foreground">
                {intl.formatMessage({ id: "common.status" })}
              </div>
              <div className="sm:col-span-2">
                <Badge
                  variant={client.status === "active" ? "default" : "secondary"}
                >
                  {client.status}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-sm font-medium text-muted-foreground">
                {intl.formatMessage({ id: "page.settings.availableCredits" })}
              </div>
              <div className="sm:col-span-2 font-semibold">
                {client.credits.toLocaleString()}
              </div>
            </div>
            {client.webhookUrl && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-sm font-medium text-muted-foreground">
                  {intl.formatMessage({ id: "page.settings.webhookUrl" })}
                </div>
                <div className="sm:col-span-2 font-mono text-sm break-all">
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
