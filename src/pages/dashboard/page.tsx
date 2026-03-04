import { Authenticated } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { MessageSquare, CheckCircle, XCircle, Coins, Send, Plus, RefreshCw, Clock, AlertTriangle, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { format } from "date-fns";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { useIntl } from "react-intl";
import { generatePresentationPDF } from "@/lib/presentation-pdf.ts";

export default function Dashboard() {
  return (
    <Authenticated>
      <DashboardContent />
    </Authenticated>
  );
}

function DashboardContent() {
  const intl = useIntl();
  const { lng } = useParams();
  const currentUser = useQuery(api.testMode.getEffectiveUser, {});
  const client = useQuery(api.clients.getCurrentClient, {});
  const stats = useQuery(
    api.clients.getClientStats,
    currentUser?.role === "client" && client ? { clientId: client._id } : "skip"
  );
  const recentMessages = useQuery(
    api.messages.getRecentMessages,
    currentUser?.role === "client" && client
      ? { clientId: client._id, limit: 5 }
      : "skip"
  );

  if (!currentUser) {
    return <DashboardSkeleton />;
  }

  if (currentUser.role === "admin") {
    return <AdminDashboard />;
  }

  if (!client || !stats) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {intl.formatMessage({ id: "page.dashboard.title" })}
          </h1>
          <p className="text-muted-foreground">
            {intl.formatMessage(
              { id: "page.dashboard.welcome" },
              { name: currentUser.name || "User" }
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/${lng}/messages`}>
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: "page.dashboard.sendMessage" })}
            </Button>
          </Link>
          <Link to={`/${lng}/bulk`}>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: "page.dashboard.bulkMessage" })}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={intl.formatMessage({ id: "page.dashboard.availableCredits" })}
          value={client.credits.toLocaleString()}
          icon={<Coins className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title={intl.formatMessage({ id: "page.dashboard.totalSent" })}
          value={stats.totalSent.toLocaleString()}
          icon={<MessageSquare className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title={intl.formatMessage({ id: "common.delivered" })}
          value={stats.totalDelivered.toLocaleString()}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
        />
        <StatCard
          title={intl.formatMessage({ id: "common.failed" })}
          value={stats.totalFailed.toLocaleString()}
          icon={<XCircle className="h-5 w-5 text-destructive" />}
        />
      </div>

      {/* Low balance warning */}
      {client.credits < 100 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-destructive">
                {client.credits === 0
                  ? intl.formatMessage({ id: "page.dashboard.noCredits" })
                  : intl.formatMessage({
                      id: "page.dashboard.criticalBalance",
                    })}
              </p>
              <p className="text-sm text-muted-foreground">
                {client.credits === 0
                  ? intl.formatMessage({
                      id: "page.dashboard.purchaseCredits",
                    })
                  : intl.formatMessage(
                      {
                        id: "page.dashboard.lowCriticalMessage",
                      },
                      { credits: client.credits.toLocaleString() }
                    )}
              </p>
            </div>
            <Link to={`/${lng}/payments`}>
              <Button size="sm">
                {intl.formatMessage({ id: "page.dashboard.buyCredits" })}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
      {client.credits >= 100 && client.credits < 500 && (
        <Card className="border-orange-400 bg-orange-500/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-full bg-orange-500/10 p-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-orange-600">
                {intl.formatMessage({ id: "page.dashboard.lowBalance" })}
              </p>
              <p className="text-sm text-muted-foreground">
                {intl.formatMessage(
                  {
                    id: "page.dashboard.lowBalanceMessage",
                  },
                  { credits: client.credits.toLocaleString() }
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {intl.formatMessage({ id: "page.dashboard.recentMessages" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentMessages || recentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-center text-muted-foreground">
                  {intl.formatMessage({ id: "page.dashboard.noMessages" })}
                </p>
                <Link to={`/${lng}/messages`}>
                  <Button size="sm" className="mt-4">
                    {intl.formatMessage({
                      id: "page.dashboard.sendFirstSms",
                    })}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMessages.map((message) => (
                  <div
                    key={message._id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{message.to}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {message.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(message._creationTime), "MMM d, h:mm a")}
                      </span>
                      <Badge variant={getStatusVariant(message.status)}>
                        {message.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {intl.formatMessage({ id: "page.dashboard.quickActions" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to={`/${lng}/messages`} className="block">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: "page.dashboard.sendSingleSms" })}
              </Button>
            </Link>
            <Link to={`/${lng}/bulk`} className="block">
              <Button variant="outline" className="w-full justify-start">
                <Send className="h-4 w-4 mr-2" />
                {intl.formatMessage({
                  id: "page.dashboard.createBulkCampaign",
                })}
              </Button>
            </Link>
            <Link to={`/${lng}/templates`} className="block">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: "page.dashboard.createTemplate" })}
              </Button>
            </Link>
            <Link to={`/${lng}/api-keys`} className="block">
              <Button variant="outline" className="w-full justify-start">
                <Coins className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: "page.dashboard.viewApiKeys" })}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const intl = useIntl();
  const { lng } = useParams();
  const allClients = useQuery(api.clients.listClients, {});
  const systemStats = useQuery(api.admin.getSystemStats, {});
  const retryPendingMessages = useMutation(api.admin.retryPendingMessages);
  const cleanupPendingBulk = useMutation(api.admin.cleanupPendingBulkMessages);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  // Get pending message count
  const pendingMessages = useQuery(api.messages.getMessages, { status: "pending" });
  const singlePendingCount = pendingMessages?.filter(m => m.type === "single").length || 0;
  const bulkPendingCount = pendingMessages?.filter(m => m.type === "bulk").length || 0;

  const handleRetryPending = async () => {
    setIsRetrying(true);
    try {
      const result = await retryPendingMessages({});
      if (result.remaining > 0) {
        toast.success(`Scheduled ${result.scheduledCount} messages. ${result.remaining} remaining - click again to continue.`);
      } else if (result.scheduledCount > 0) {
        toast.success(`Scheduled ${result.scheduledCount} pending messages for retry`);
      } else {
        toast.info(`No single messages to retry. ${result.bulkPendingCount} bulk messages need cleanup.`);
      }
    } catch (error) {
      toast.error("Failed to retry pending messages");
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCleanupBulk = async () => {
    setIsCleaning(true);
    try {
      const result = await cleanupPendingBulk({});
      if (result.remaining > 0) {
        toast.success(`Cleaned up ${result.cleanedCount} bulk messages. ${result.remaining} remaining - click again.`);
      } else {
        toast.success(`Cleaned up ${result.cleanedCount} orphaned bulk messages`);
      }
    } catch (error) {
      toast.error("Failed to cleanup bulk messages");
    } finally {
      setIsCleaning(false);
    }
  };

  if (!allClients || !systemStats) {
    return <DashboardSkeleton />;
  }

  const activeClients = allClients.filter((c) => c.status === "active").length;
  const totalCredits = allClients.reduce((sum, c) => sum + c.credits, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {intl.formatMessage({ id: "page.dashboard.admin.title" })}
          </h1>
          <p className="text-muted-foreground">
            {intl.formatMessage({
              id: "page.dashboard.admin.subtitle",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          {singlePendingCount > 0 && (
            <Button 
              variant="outline" 
              onClick={handleRetryPending}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Clock className="h-4 w-4 mr-2" />
              )}
              {intl.formatMessage({
                id: "page.dashboard.admin.retrySingle",
              })} ({singlePendingCount})
            </Button>
          )}
          {bulkPendingCount > 0 && (
            <Button 
              variant="secondary" 
              onClick={handleCleanupBulk}
              disabled={isCleaning}
            >
              {isCleaning ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {intl.formatMessage({
                id: "page.dashboard.admin.cleanupBulk",
              })} ({bulkPendingCount})
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await generatePresentationPDF();
                toast.success(intl.formatMessage({ id: "page.dashboard.admin.pdfGenerated" }));
              } catch {
                toast.error(intl.formatMessage({ id: "page.dashboard.admin.pdfError" }));
              }
            }}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: "page.dashboard.admin.downloadPresentation" })}
          </Button>
          <Link to={`/${lng}/admin/clients`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: "page.dashboard.admin.newClient" })}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={intl.formatMessage({
            id: "page.dashboard.admin.totalClients",
          })}
          value={allClients.length.toString()}
          icon={<MessageSquare className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title={intl.formatMessage({
            id: "page.dashboard.admin.activeClients",
          })}
          value={activeClients.toString()}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
        />
        <StatCard
          title={intl.formatMessage({
            id: "page.dashboard.admin.totalCredits",
          })}
          value={totalCredits.toLocaleString()}
          icon={<Coins className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title={intl.formatMessage({
            id: "page.dashboard.admin.messagesSent",
          })}
          value={systemStats.totalSent.toLocaleString()}
          icon={<Send className="h-5 w-5 text-blue-500" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {intl.formatMessage({
                id: "page.dashboard.admin.recentClients",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allClients.slice(0, 5).map((client) => (
                <div
                  key={client._id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{client.companyName}</p>
                    <p className="text-sm text-muted-foreground">{client.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {client.credits}{" "}
                      {intl.formatMessage({ id: "common.credits" })}
                    </span>
                    <Badge variant={client.status === "active" ? "default" : "secondary"}>
                      {client.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {intl.formatMessage({
                id: "page.dashboard.admin.systemStats",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {intl.formatMessage({
                  id: "page.dashboard.admin.totalMessages",
                })}
              </span>
              <span className="text-lg font-semibold">
                {systemStats.totalMessages.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: "common.delivered" })}
              </span>
              <span className="text-lg font-semibold text-green-600">
                {systemStats.totalDelivered.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {intl.formatMessage({
                  id: "page.dashboard.admin.deliveryRate",
                })}
              </span>
              <span className="text-lg font-semibold">
                {systemStats.totalMessages > 0
                  ? ((systemStats.totalDelivered / systemStats.totalMessages) * 100).toFixed(1)
                  : "0"}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "delivered":
      return "default";
    case "sent":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}
