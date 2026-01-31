import { Authenticated } from "convex/react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CreditCard, Smartphone, Check, Zap, Star, Crown, Building, Rocket } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PaymentsPage() {
  return (
    <Authenticated>
      <PaymentsContent />
    </Authenticated>
  );
}

function PaymentsContent() {
  const { lng } = useParams();
  const [searchParams] = useSearchParams();
  const packages = useQuery(api.paymentMutations.getCreditPackages, {});
  const paymentHistory = useQuery(api.paymentMutations.getPaymentHistory, {});
  const client = useQuery(api.clients.getCurrentClient, {});
  const createPayment = useAction(api.payments.createPaymentSession);
  const verifyPayment = useAction(api.payments.verifyPayment);
  const [processingPackage, setProcessingPackage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

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
          toast.error(error instanceof Error ? error.message : "Payment verification failed");
        })
        .finally(() => {
          setVerifying(false);
          // Clear URL params
          window.history.replaceState({}, "", `/${lng}/payments`);
        });
    }
  }, [searchParams, verifyPayment, lng, verifying]);

  if (!packages || !client) {
    return <PaymentsSkeleton />;
  }

  const handlePurchase = async (packageId: string) => {
    setProcessingPackage(packageId);
    try {
      const baseUrl = window.location.origin;
      const { paymentUrl } = await createPayment({
        packageId,
        successUrl: `${baseUrl}/${lng}/payments?status=success&transaction_id={transaction_id}`,
        cancelUrl: `${baseUrl}/${lng}/payments?status=cancelled`,
      });
      window.location.href = paymentUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to initiate payment");
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Buy Credits</h1>
        <p className="text-muted-foreground">
          Purchase credits to send messages. Current balance:{" "}
          <span className="font-semibold text-primary">{client.credits.toLocaleString()} credits</span>
        </p>
      </div>

      {/* Verifying payment notice */}
      {verifying && (
        <Card className="border-primary">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <div>
              <p className="font-medium">Verifying your payment...</p>
              <p className="text-sm text-muted-foreground">Please wait while we confirm your transaction</p>
            </div>
          </CardContent>
        </Card>
      )}

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
              <div className={`mx-auto p-3 rounded-full ${
                getBestValue(pkg.id) ? "bg-primary/10 text-primary" : "bg-muted"
              }`}>
                {getPackageIcon(pkg.id)}
              </div>
              <CardTitle className="text-xl">{pkg.name}</CardTitle>
              <CardDescription>
                {pkg.credits.toLocaleString()} credits
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div>
                <p className="text-3xl font-bold">
                  {formatAmount(pkg.amount, pkg.currency)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatAmount(pkg.amount / pkg.credits, pkg.currency)} per credit
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

      {/* Payment History */}
      {paymentHistory && paymentHistory.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Payment History</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Package</th>
                      <th className="text-left p-4 font-medium">Credits</th>
                      <th className="text-left p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((tx) => (
                      <tr key={tx._id} className="border-t">
                        <td className="p-4 text-sm">
                          {format(new Date(tx._creationTime), "MMM d, yyyy HH:mm")}
                        </td>
                        <td className="p-4 text-sm capitalize">{tx.packageId}</td>
                        <td className="p-4 text-sm">{tx.credits.toLocaleString()}</td>
                        <td className="p-4 text-sm">
                          {formatAmount(tx.amount, tx.currency)}
                        </td>
                        <td className="p-4">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function PaymentsSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  );
}
