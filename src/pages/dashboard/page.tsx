import { Authenticated } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { MessageSquare, CheckCircle, XCircle, Coins, Send, Plus, RefreshCw, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { format } from "date-fns";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function Dashboard() {
  return (
    <Authenticated>
      <DashboardContent />
    </Authenticated>
  );
}

function DashboardContent() {
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
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {currentUser.name || "User"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/${lng}/messages`}>
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </Link>
          <Link to={`/${lng}/bulk`}>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Bulk Message
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Available Credits"
          value={client.credits.toLocaleString()}
          icon={<Coins className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title="Total Sent"
          value={stats.totalSent.toLocaleString()}
          icon={<MessageSquare className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title="Delivered"
          value={stats.totalDelivered.toLocaleString()}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
        />
        <StatCard
          title="Failed"
          value={stats.totalFailed.toLocaleString()}
          icon={<XCircle className="h-5 w-5 text-destructive" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {!recentMessages || recentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-center text-muted-foreground">
                  No messages sent yet
                </p>
                <Link to={`/${lng}/messages`}>
                  <Button size="sm" className="mt-4">
                    Send Your First SMS
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
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to={`/${lng}/messages`} className="block">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Single SMS
              </Button>
            </Link>
            <Link to={`/${lng}/bulk`} className="block">
              <Button variant="outline" className="w-full justify-start">
                <Send className="h-4 w-4 mr-2" />
                Create Bulk Campaign
              </Button>
            </Link>
            <Link to={`/${lng}/templates`} className="block">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </Link>
            <Link to={`/${lng}/api-keys`} className="block">
              <Button variant="outline" className="w-full justify-start">
                <Coins className="h-4 w-4 mr-2" />
                View API Keys
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { lng } = useParams();
  const allClients = useQuery(api.clients.listClients, {});
  const systemStats = useQuery(api.admin.getSystemStats, {});
  const retryPendingMessages = useMutation(api.admin.retryPendingMessages);
  const [isRetrying, setIsRetrying] = useState(false);

  // Get pending message count
  const pendingMessages = useQuery(api.messages.getMessages, { status: "pending" });
  const pendingCount = pendingMessages?.length || 0;

  const handleRetryPending = async () => {
    setIsRetrying(true);
    try {
      const result = await retryPendingMessages({});
      toast.success(`Scheduled ${result.scheduledCount} pending messages for retry`);
    } catch (error) {
      toast.error("Failed to retry pending messages");
    } finally {
      setIsRetrying(false);
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
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and management</p>
        </div>
        <div className="flex gap-2">
          {pendingCount > 0 && (
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
              Retry Pending ({pendingCount})
            </Button>
          )}
          <Link to={`/${lng}/admin/clients`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Client
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Clients"
          value={allClients.length.toString()}
          icon={<MessageSquare className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title="Active Clients"
          value={activeClients.toString()}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
        />
        <StatCard
          title="Total Credits"
          value={totalCredits.toLocaleString()}
          icon={<Coins className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          title="Messages Sent"
          value={systemStats.totalSent.toLocaleString()}
          icon={<Send className="h-5 w-5 text-blue-500" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Clients</CardTitle>
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
                      {client.credits} credits
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
            <CardTitle>System Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Messages</span>
              <span className="text-lg font-semibold">{systemStats.totalMessages.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Delivered</span>
              <span className="text-lg font-semibold text-green-600">{systemStats.totalDelivered.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Delivery Rate</span>
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
