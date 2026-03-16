import { Authenticated } from "convex/react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import {
  CreditCard,
  Smartphone,
  Zap,
  Star,
  Crown,
  Building,
  Rocket,
  Check,
  Coins,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  History,
  ShoppingCart,
  MessageSquare,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { usePagination } from "@/hooks/use-pagination.ts";
import PaginationControls from "@/components/ui/pagination-controls.tsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function PaymentsPage() {
  return (
    <Authenticated>
      <PaymentsContent />
    </Authenticated>
  );
}

// ─── Main Content ────────────────────────────────────────────

function PaymentsContent() {
  const { lng } = useParams();
  const [searchParams] = useSearchParams();
  const usageStats = useQuery(api.credits.getMyUsageStats, {});
  const packages = useQuery(api.paymentMutations.getCreditPackages, {});
  const paymentHistory = useQuery(api.paymentMutations.getPaymentHistory, {});
  const client = useQuery(api.clients.getCurrentClient, {});
  const verifyPayment = useAction(api.payments.verifyPayment);
  const [verifying, setVerifying] = useState(false);

  // Support direct navigation to a specific tab via ?tab=buy
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "buy" ? "buy" : tabParam === "history" ? "history" : "usage";
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Check for payment success callback
  useEffect(() => {
    const transactionId = searchParams.get("transaction_id");
    const status = searchParams.get("status");

    if (transactionId && status === "success" && !verifying) {
      setVerifying(true);
      verifyPayment({ transactionId })
        .then((result) => {
          if (result.success) {
            toast.success(result.message);
          } else {
            toast.error(result.message);
          }
        })
        .catch((error) => {
          toast.error(
            error instanceof Error ? error.message : "Payment verification failed"
          );
        })
        .finally(() => {
          setVerifying(false);
          window.history.replaceState({}, "", `/${lng}/payments`);
        });
    }
  }, [searchParams, verifyPayment, lng, verifying]);

  if (!client || !usageStats) {
    return <PaymentsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Coins className="h-6 w-6" />
          Credits & Billing
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor your credit balance, usage, and purchase more credits.
        </p>
      </div>

      {/* Verifying payment notice */}
      {verifying && (
        <Card className="border-primary">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <div>
              <p className="font-medium">Verifying your payment...</p>
              <p className="text-sm text-muted-foreground">
                Please wait while we confirm your transaction
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Balance Warning */}
      {usageStats.isCriticalBalance && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-destructive">Critical balance</p>
              <p className="text-sm text-muted-foreground">
                You have only {usageStats.currentBalance.toLocaleString()} credits
                remaining. Purchase more credits to continue sending messages.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setActiveTab("buy")}
            >
              Buy Credits
            </Button>
          </CardContent>
        </Card>
      )}

      {!usageStats.isCriticalBalance && usageStats.isLowBalance && (
        <Card className="border-orange-400 bg-orange-500/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-full bg-orange-500/10 p-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-orange-600">Low balance</p>
              <p className="text-sm text-muted-foreground">
                Your credits are running low ({usageStats.currentBalance.toLocaleString()}{" "}
                remaining). Consider purchasing more soon.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold">
                  {usageStats.currentBalance.toLocaleString()}
                </p>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <Coins className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">SMS credits available</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Purchased</p>
                <p className="text-2xl font-bold">
                  {usageStats.totalPurchased.toLocaleString()}
                </p>
              </div>
              <div className="rounded-full bg-green-500/10 p-3">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">All-time purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Used</p>
                <p className="text-2xl font-bold">
                  {usageStats.totalUsed.toLocaleString()}
                </p>
              </div>
              <div className="rounded-full bg-destructive/10 p-3">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Credits consumed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Channels Active</p>
                <p className="text-2xl font-bold">
                  {Object.keys(usageStats.channelUsage).length}
                </p>
              </div>
              <div className="rounded-full bg-blue-500/10 p-3">
                <MessageSquare className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Messaging channels used</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Usage
          </TabsTrigger>
          <TabsTrigger value="buy" id="buy-credits-tab" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Buy Credits
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usage">
          <UsageTab usageStats={usageStats} />
        </TabsContent>

        <TabsContent value="buy">
          <BuyCreditsTab packages={packages} lng={lng} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab
            transactions={usageStats.recentTransactions}
            paymentHistory={paymentHistory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Usage Tab ───────────────────────────────────────────────

const CHANNEL_COLORS: Record<string, string> = {
  sms: "hsl(var(--primary))",
  whatsapp: "#25D366",
  telegram: "#0088cc",
  facebook_messenger: "#0084FF",
};

const CHANNEL_LABELS: Record<string, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  facebook_messenger: "Messenger",
};

type UsageStats = {
  currentBalance: number;
  totalPurchased: number;
  totalUsed: number;
  isLowBalance: boolean;
  isCriticalBalance: boolean;
  channelUsage: Record<string, { sent: number; credits: number }>;
  monthlyUsage: { month: string; credits: number }[];
  recentTransactions: {
    _id: string;
    _creationTime: number;
    amount: number;
    type: string;
    description: string;
    balanceAfter: number;
  }[];
};

function UsageTab({ usageStats }: { usageStats: UsageStats }) {
  const channelData = Object.entries(usageStats.channelUsage).map(
    ([channel, data]) => ({
      name: CHANNEL_LABELS[channel] || channel,
      value: data.credits,
      sent: data.sent,
      fill: CHANNEL_COLORS[channel] || "hsl(var(--muted-foreground))",
    })
  );

  const totalCreditsUsedByChannel = channelData.reduce(
    (sum, d) => sum + d.value,
    0
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Monthly Usage Chart */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Monthly Credit Usage</CardTitle>
          <CardDescription>Credits consumed over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          {usageStats.monthlyUsage.every((m) => m.credits === 0) ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BarChart3 />
                </EmptyMedia>
                <EmptyTitle>No usage data yet</EmptyTitle>
                <EmptyDescription>
                  Send some messages and your usage chart will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={usageStats.monthlyUsage}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  className="text-xs fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  className="text-xs fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value: number) => [
                    `${value.toLocaleString()} credits`,
                    "Usage",
                  ]}
                />
                <Bar
                  dataKey="credits"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Channel Breakdown Pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage by Channel</CardTitle>
          <CardDescription>Credit distribution across channels</CardDescription>
        </CardHeader>
        <CardContent>
          {channelData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              No channel data yet
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={channelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {channelData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [
                      `${value.toLocaleString()} credits`,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center">
                {channelData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2 text-sm">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: entry.fill }}
                    />
                    <span>{entry.name}</span>
                    <span className="text-muted-foreground">
                      {totalCreditsUsedByChannel > 0
                        ? Math.round(
                            (entry.value / totalCreditsUsedByChannel) * 100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Channel Details</CardTitle>
          <CardDescription>Messages sent and credits consumed per channel</CardDescription>
        </CardHeader>
        <CardContent>
          {channelData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              No channel data yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelData.map((entry) => (
                  <TableRow key={entry.name}>
                    <TableCell className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: entry.fill }}
                      />
                      {entry.name}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.sent.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.value.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-mono">
                    {channelData
                      .reduce((s, d) => s + d.sent, 0)
                      .toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {totalCreditsUsedByChannel.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Buy Credits Tab ─────────────────────────────────────────

type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  amount: number;
  currency: string;
};

function BuyCreditsTab({
  packages,
  lng,
}: {
  packages: CreditPackage[] | undefined;
  lng: string | undefined;
}) {
  const createPaymentIntent = useAction(api.payments.createPaymentIntent);
  const [processingPackage, setProcessingPackage] = useState<string | null>(null);

  if (!packages) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  const handlePurchase = async (packageId: string) => {
    setProcessingPackage(packageId);
    try {
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/${lng}/payments?status=success&transaction_id={transaction_id}`;
      const cancelUrl = `${baseUrl}/${lng}/payments?status=cancelled`;

      const { clientSecret } = await createPaymentIntent({
        packageId,
        successUrl,
        cancelUrl,
      });

      // Redirect directly to SayeleGate checkout page
      const params = new URLSearchParams({
        client_secret: clientSecret,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      window.location.href = `https://gate.sayele.co/checkout?${params.toString()}`;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to initiate payment"
      );
      setProcessingPackage(null);
    }
  };

  const getPackageIcon = (packageId: string) => {
    switch (packageId) {
      case "starter":
        return <Zap className="h-6 w-6" />;
      case "basic":
        return <Check className="h-6 w-6" />;
      case "standard":
        return <Star className="h-6 w-6" />;
      case "premium":
        return <Crown className="h-6 w-6" />;
      case "business":
        return <Building className="h-6 w-6" />;
      case "enterprise":
        return <Rocket className="h-6 w-6" />;
      default:
        return <CreditCard className="h-6 w-6" />;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getBestValue = (packageId: string) => {
    return packageId === "business" || packageId === "premium";
  };

  return (
    <div className="space-y-6">
      {/* Payment Methods */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CreditCard className="h-4 w-4" />
          <span>Card</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Smartphone className="h-4 w-4" />
          <span>Mobile Money</span>
        </div>
      </div>

      {/* Credit Packages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <Card
            key={pkg.id}
            className={`relative transition-all hover:shadow-lg ${
              getBestValue(pkg.id) ? "border-primary ring-2 ring-primary/20" : ""
            }`}
          >
            {getBestValue(pkg.id) && (
              <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                Best Value
              </Badge>
            )}
            <CardHeader className="text-center pb-2">
              <div
                className={`mx-auto p-3 rounded-full ${
                  getBestValue(pkg.id) ? "bg-primary/10 text-primary" : "bg-muted"
                }`}
              >
                {getPackageIcon(pkg.id)}
              </div>
              <CardTitle className="text-xl">{pkg.name}</CardTitle>
              <CardDescription>{pkg.credits.toLocaleString()} SMS</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div>
                <p className="text-3xl font-bold">
                  {formatAmount(pkg.amount, pkg.currency)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatAmount(pkg.amount / pkg.credits, pkg.currency)} per SMS
                </p>
              </div>
              <Button
                className="w-full"
                variant={getBestValue(pkg.id) ? "default" : "secondary"}
                onClick={() => handlePurchase(pkg.id)}
                disabled={processingPackage !== null}
              >
                {processingPackage === pkg.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Processing...
                  </>
                ) : (
                  "Buy Now"
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── History Tab ─────────────────────────────────────────────

type Transaction = {
  _id: string;
  _creationTime: number;
  amount: number;
  type: string;
  description: string;
  balanceAfter: number;
};

type PaymentTx = {
  _id: string;
  _creationTime: number;
  packageId: string;
  credits: number;
  amount: number;
  currency: string;
  status: string;
};

function HistoryTab({
  transactions,
  paymentHistory,
}: {
  transactions: Transaction[];
  paymentHistory: PaymentTx[] | undefined;
}) {
  const txPagination = usePagination(transactions, { pageSize: 15 });
  const payPagination = usePagination(paymentHistory ?? [], { pageSize: 15 });

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Credit Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credit Transactions</CardTitle>
          <CardDescription>
            Recent credits added, used, and adjusted on your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <History />
                </EmptyMedia>
                <EmptyTitle>No transactions yet</EmptyTitle>
                <EmptyDescription>
                  Your credit transaction history will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txPagination.paginatedItems.map((tx) => (
                  <TableRow key={tx._id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(tx._creationTime), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <TransactionTypeBadge type={tx.type} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      {tx.description}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-semibold flex items-center justify-end gap-1 ${
                          tx.amount >= 0
                            ? "text-green-600"
                            : "text-destructive"
                        }`}
                      >
                        {tx.amount >= 0 ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        )}
                        {tx.amount >= 0 ? "+" : ""}
                        {tx.amount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {tx.balanceAfter.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            <PaginationControls {...txPagination} itemLabel="transactions" />
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Transactions */}
      {paymentHistory && paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
            <CardDescription>Payments made through the gateway</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payPagination.paginatedItems.map((tx) => (
                  <TableRow key={tx._id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(tx._creationTime), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="capitalize text-sm">
                      {tx.packageId}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {tx.credits.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatAmount(tx.amount, tx.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tx.status === "completed"
                            ? "default"
                            : tx.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {tx.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            <PaginationControls {...payPagination} itemLabel="payments" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Transaction Badge ───────────────────────────────────────

function TransactionTypeBadge({ type }: { type: string }) {
  switch (type) {
    case "purchase":
    case "add":
      return (
        <Badge className="bg-blue-600/10 text-blue-600 border-blue-600/20 text-xs">
          Purchase
        </Badge>
      );
    case "deduction":
      return (
        <Badge variant="destructive" className="text-xs">
          Deduction
        </Badge>
      );
    case "bonus":
      return (
        <Badge className="bg-purple-600/10 text-purple-600 border-purple-600/20 text-xs">
          Bonus
        </Badge>
      );
    case "refund":
      return (
        <Badge className="bg-green-600/10 text-green-600 border-green-600/20 text-xs">
          Refund
        </Badge>
      );
    case "adjustment":
      return (
        <Badge variant="secondary" className="text-xs">
          Adjustment
        </Badge>
      );
    default:
      return <Badge variant="secondary" className="text-xs capitalize">{type}</Badge>;
  }
}

// ─── Skeleton ────────────────────────────────────────────────

function PaymentsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
