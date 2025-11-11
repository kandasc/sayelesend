import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Server, 
  Activity,
  CheckCircle,
  XCircle,
  DollarSign,
  BarChart3
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B9D'];

export default function AdminAnalyticsPage() {
  const systemStats = useQuery(api.admin.getSystemStats);
  const clientUsage = useQuery(api.analytics.getClientUsageStats, {});
  const clients = useQuery(api.admin.listClients);
  const providers = useQuery(api.providers.listProviders, {});
  const recentMessages = useQuery(api.messages.getRecentMessages, { limit: 10 });

  if (systemStats === undefined || clients === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const activeClients = clients.filter((c) => c.status === "active").length;
  const inactiveClients = clients.filter((c) => c.status === "inactive").length;

  // Calculate provider distribution
  const providerDistribution = providers?.reduce((acc: Record<string, number>, provider) => {
    const clientCount = clients.filter((c) => c.smsProviderId === provider._id).length;
    if (clientCount > 0) {
      acc[provider.name] = clientCount;
    }
    return acc;
  }, {}) || {};

  const providerChartData = Object.entries(providerDistribution).map(([name, count]) => ({
    name,
    clients: count,
  }));

  // Calculate credit distribution
  const creditRanges = {
    "0-1000": 0,
    "1001-5000": 0,
    "5001-10000": 0,
    "10000+": 0,
  };

  clients.forEach((client) => {
    if (client.credits <= 1000) creditRanges["0-1000"]++;
    else if (client.credits <= 5000) creditRanges["1001-5000"]++;
    else if (client.credits <= 10000) creditRanges["5001-10000"]++;
    else creditRanges["10000+"]++;
  });

  const creditChartData = Object.entries(creditRanges).map(([range, count]) => ({
    range,
    count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Analytics</h1>
        <p className="text-muted-foreground">
          System-wide overview and performance metrics
        </p>
      </div>

      {/* Key System Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              {activeClients} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Successfully sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalDelivered.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {systemStats.totalMessages > 0 
                ? `${((systemStats.totalDelivered / systemStats.totalMessages) * 100).toFixed(1)}%` 
                : '0%'} rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats.totalCredits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Providers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{providers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Configured
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Client Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Clients by Message Volume</CardTitle>
            <CardDescription>
              Clients ranked by total messages sent
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clientUsage === undefined ? (
              <Skeleton className="h-[300px] w-full" />
            ) : clientUsage.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No client data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={clientUsage.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="clientName" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalMessages" fill="#0088FE" name="Total" />
                  <Bar dataKey="deliveredMessages" fill="#00C49F" name="Delivered" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Provider Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Clients by Provider</CardTitle>
            <CardDescription>
              Distribution of clients across SMS providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {providers === undefined ? (
              <Skeleton className="h-[300px] w-full" />
            ) : providerChartData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No provider data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={providerChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="clients"
                  >
                    {providerChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Credit Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Credit Distribution</CardTitle>
            <CardDescription>
              Number of clients in each credit range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={creditChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#FFBB28" name="Clients" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Client Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Client Status Overview</CardTitle>
            <CardDescription>
              Active vs inactive clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Active", value: activeClients },
                    { name: "Inactive", value: inactiveClients },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#00C49F" />
                  <Cell fill="#FF8042" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
          <CardDescription>
            Latest SMS messages across all clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentMessages === undefined ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentMessages.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No messages yet
            </div>
          ) : (
            <div className="space-y-3">
              {recentMessages.map((message) => (
                <div
                  key={message._id}
                  className="flex items-start justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{message.to}</span>
                      {message.status === "delivered" && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {message.status === "failed" && (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {message.message}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-xs text-muted-foreground">
                      {new Date(message._creationTime).toLocaleDateString()}
                    </div>
                    <div className="text-xs font-medium capitalize">
                      {message.status}
                    </div>
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
