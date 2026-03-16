import { Authenticated } from "convex/react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import {
  Webhook,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Send,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useIntl } from "react-intl";
import { usePagination } from "@/hooks/use-pagination.ts";
import PaginationControls from "@/components/ui/pagination-controls.tsx";

export default function Webhooks() {
  return (
    <Authenticated>
      <WebhooksContent />
    </Authenticated>
  );
}

function WebhooksContent() {
  const intl = useIntl();
  const events = useQuery(api.webhookEvents.listWebhookEvents, { limit: 100 });
  const stats = useQuery(api.webhookEvents.getWebhookStats);
  const client = useQuery(api.clients.getCurrentClient);
  const testWebhook = useAction(api.webhookActions.testWebhook);
  const [testing, setTesting] = useState(false);
  const pagination = usePagination(events || [], { pageSize: 15 });

  const handleTestWebhook = async () => {
    setTesting(true);
    try {
      const result = await testWebhook({});
      if (result.success) {
        toast.success(`Webhook test successful (${result.statusCode})`);
      } else {
        toast.error(`Webhook test failed (${result.statusCode}): ${result.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  if (events === undefined || stats === undefined || client === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            {intl.formatMessage({ id: "page.webhooks.title" })}
          </h1>
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: "page.webhooks.subtitle" })}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {intl.formatMessage({ id: "page.webhooks.title" })}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {intl.formatMessage({ id: "page.webhooks.subtitle" })}
          </p>
        </div>
        {client?.webhookUrl && (
          <Button onClick={handleTestWebhook} disabled={testing}>
            <Send className="h-4 w-4 mr-2" />
            {testing
              ? intl.formatMessage({ id: "page.webhooks.testing" })
              : intl.formatMessage({ id: "page.webhooks.testWebhook" })}
          </Button>
        )}
      </div>

      {!client?.webhookUrl && (
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  {intl.formatMessage({ id: "page.webhooks.noWebhookUrl" })}
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  {intl.formatMessage({ id: "page.webhooks.noWebhookUrlDesc" })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {intl.formatMessage({ id: "page.webhooks.totalEvents" })}
            </CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {intl.formatMessage({ id: "page.webhooks.success" })}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.success}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {intl.formatMessage({ id: "common.pending" })}
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              {intl.formatMessage({ id: "common.failed" })}
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {events.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Webhook />
            </EmptyMedia>
            <EmptyTitle>
              {intl.formatMessage({ id: "page.webhooks.noEvents" })}
            </EmptyTitle>
            <EmptyDescription>
              {intl.formatMessage({ id: "page.webhooks.noEventsDesc" })}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {pagination.paginatedItems.map((event) => (
            <WebhookEventCard key={event._id} event={event} />
          ))}
          <PaginationControls {...pagination} itemLabel="events" />
        </div>
      )}
    </div>
  );
}

type WebhookEvent = {
  _id: Id<"webhookEvents">;
  eventType: "message.sent" | "message.delivered" | "message.failed" | "message.received";
  status: "pending" | "success" | "failed";
  attempts: number;
  lastAttemptAt?: number;
  nextRetryAt?: number;
  responseCode?: number;
  errorMessage?: string;
  _creationTime: number;
};

function WebhookEventCard({ event }: { event: WebhookEvent }) {
  const intl = useIntl();
  const retryWebhook = useMutation(api.webhookEvents.retryWebhookEvent);
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retryWebhook({ eventId: event._id });
      toast.success(intl.formatMessage({ id: "page.webhooks.retryQueued" }));
    } catch (error) {
      toast.error("Failed to queue retry");
    } finally {
      setRetrying(false);
    }
  };

  const getStatusIcon = () => {
    switch (event.status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-amber-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (event.status) {
      case "success":
        return (
          <Badge className="bg-green-600">
            {intl.formatMessage({ id: "page.webhooks.success" })}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            {intl.formatMessage({ id: "common.failed" })}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            {intl.formatMessage({ id: "common.pending" })}
          </Badge>
        );
    }
  };

  const getEventTypeLabel = () => {
    switch (event.eventType) {
      case "message.sent":
        return intl.formatMessage({ id: "page.webhooks.messageSent" });
      case "message.delivered":
        return intl.formatMessage({ id: "page.webhooks.messageDelivered" });
      case "message.failed":
        return intl.formatMessage({ id: "page.webhooks.messageFailed" });
      case "message.received":
        return intl.formatMessage({ id: "page.webhooks.messageReceived" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getStatusIcon()}
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{getEventTypeLabel()}</CardTitle>
                {getStatusBadge()}
              </div>
              <CardDescription>
                {format(new Date(event._creationTime), "PPpp")} • Attempts: {event.attempts}
                {event.responseCode && ` • HTTP ${event.responseCode}`}
              </CardDescription>
            </div>
          </div>
          {event.status === "failed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              disabled={retrying}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: "buttons.retry" })}
            </Button>
          )}
        </div>
      </CardHeader>
      {event.errorMessage && (
        <CardContent>
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            <p className="font-medium">
              {intl.formatMessage({ id: "page.webhooks.error" })}
            </p>
            <p>{event.errorMessage}</p>
          </div>
        </CardContent>
      )}
      {event.nextRetryAt && event.status === "pending" && (
        <CardContent>
          <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 text-sm p-3 rounded-md">
            <p>Next retry: {format(new Date(event.nextRetryAt), "PPpp")}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
