import { Authenticated } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import DashboardLayout from "@/components/dashboard-layout.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { MessageSquare, CheckCircle, XCircle, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { format } from "date-fns";

export default function Dashboard() {
  return (
    <Authenticated>
      <DashboardLayout>
        <DashboardContent />
      </DashboardLayout>
    </Authenticated>
  );
}

function DashboardContent() {
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const client = useQuery(
    api.clients.getCurrentClient,
    currentUser?.role === "client" ? {} : "skip"
  );
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
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {currentUser.name || "User"}
        </p>
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

      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentMessages || recentMessages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No messages sent yet
            </p>
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
    </div>
  );
}

function AdminDashboard() {
  const allClients = useQuery(api.clients.listClients, {});

  if (!allClients) {
    return <DashboardSkeleton />;
  }

  const activeClients = allClients.filter((c) => c.status === "active").length;
  const totalCredits = allClients.reduce((sum, c) => sum + c.credits, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">System overview and management</p>
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
          title="Suspended"
          value={(allClients.length - activeClients).toString()}
          icon={<XCircle className="h-5 w-5 text-destructive" />}
        />
      </div>

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
