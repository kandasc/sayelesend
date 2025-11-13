import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Coins, TrendingUp, TrendingDown, Gift, Plus, Minus, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function AdminCreditsPage() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deductDialogOpen, setDeductDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<Id<"clients"> | undefined>(undefined);
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState<"purchase" | "bonus" | "adjustment" | "refund">("purchase");
  const [description, setDescription] = useState("");

  const clients = useQuery(api.admin.listClients);
  const stats = useQuery(api.credits.getCreditStats, {});
  const transactions = useQuery(api.credits.getAllTransactions, { limit: 100 });
  const addCredits = useMutation(api.credits.addCredits);
  const deductCredits = useMutation(api.credits.deductCredits);

  const handleAddCredits = async () => {
    if (!selectedClientId || !amount || parseFloat(amount) <= 0) {
      toast.error("Please fill in all fields with valid values");
      return;
    }

    try {
      await addCredits({
        clientId: selectedClientId,
        amount: parseFloat(amount),
        type: transactionType,
        description: description || `${transactionType} credits`,
      });
      toast.success("Credits added successfully");
      setAddDialogOpen(false);
      setAmount("");
      setDescription("");
      setSelectedClientId(undefined);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to add credits");
      }
    }
  };

  const handleDeductCredits = async () => {
    if (!selectedClientId || !amount || parseFloat(amount) <= 0) {
      toast.error("Please fill in all fields with valid values");
      return;
    }

    try {
      await deductCredits({
        clientId: selectedClientId,
        amount: parseFloat(amount),
        description: description || "Manual deduction",
      });
      toast.success("Credits deducted successfully");
      setDeductDialogOpen(false);
      setAmount("");
      setDescription("");
      setSelectedClientId(undefined);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to deduct credits");
      }
    }
  };

  if (clients === undefined || clients === null || stats === undefined || transactions === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credit Management</h1>
          <p className="text-muted-foreground">
            Manage client credits and view transaction history
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Credits
          </Button>
          <Button variant="outline" onClick={() => setDeductDialogOpen(true)}>
            <Minus className="mr-2 h-4 w-4" />
            Deduct Credits
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <Coins className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCredits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Available across all clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchased</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.purchasedCredits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total purchased credits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.usedCredits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total credits used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bonus</CardTitle>
            <Gift className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bonusCredits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Bonus credits given</p>
          </CardContent>
        </Card>
      </div>

      {/* Client Credits Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Client Credits</CardTitle>
          <CardDescription>
            Current credit balance for each client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No clients found
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client._id}>
                    <TableCell className="font-medium">{client.companyName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold">{client.credits.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.credits === 0 ? (
                        <Badge variant="destructive">No Credits</Badge>
                      ) : client.credits < 100 ? (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          Low Credits
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-600">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedClientId(client._id);
                            setAddDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedClientId(client._id);
                            setDeductDialogOpen(true);
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Last 100 credit transactions across all clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance After</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Performed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction: { _id: Id<"creditTransactions">; _creationTime: number; clientName: string; type: string; amount: number; balanceAfter: number; description: string; performerName: string; }) => (
                  <TableRow key={transaction._id}>
                    <TableCell className="text-sm">
                      {new Date(transaction._creationTime).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">{transaction.clientName}</TableCell>
                    <TableCell>
                      {transaction.type === "purchase" && (
                        <Badge variant="default" className="bg-blue-600">
                          <DollarSign className="h-3 w-3 mr-1" />
                          Purchase
                        </Badge>
                      )}
                      {transaction.type === "deduction" && (
                        <Badge variant="destructive">
                          <Minus className="h-3 w-3 mr-1" />
                          Deduction
                        </Badge>
                      )}
                      {transaction.type === "bonus" && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          <Gift className="h-3 w-3 mr-1" />
                          Bonus
                        </Badge>
                      )}
                      {transaction.type === "refund" && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Refund
                        </Badge>
                      )}
                      {transaction.type === "adjustment" && (
                        <Badge variant="outline">
                          Adjustment
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={transaction.amount >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                        {transaction.amount >= 0 ? "+" : ""}{transaction.amount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>{transaction.balanceAfter.toLocaleString()}</TableCell>
                    <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                    <TableCell className="text-sm">{transaction.performerName}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Credits Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credits</DialogTitle>
            <DialogDescription>
              Add credits to a client account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="addClient">Client</Label>
              <Select
                value={selectedClientId}
                onValueChange={(value) => setSelectedClientId(value as Id<"clients">)}
              >
                <SelectTrigger id="addClient">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.companyName} (Current: {client.credits})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addType">Transaction Type</Label>
              <Select
                value={transactionType}
                onValueChange={(value) => setTransactionType(value as "purchase" | "bonus" | "adjustment" | "refund")}
              >
                <SelectTrigger id="addType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addAmount">Amount</Label>
              <Input
                id="addAmount"
                type="number"
                placeholder="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addDescription">Description (Optional)</Label>
              <Textarea
                id="addDescription"
                placeholder="Reason for adding credits..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCredits}>
              Add Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deduct Credits Dialog */}
      <Dialog open={deductDialogOpen} onOpenChange={setDeductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deduct Credits</DialogTitle>
            <DialogDescription>
              Deduct credits from a client account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deductClient">Client</Label>
              <Select
                value={selectedClientId}
                onValueChange={(value) => setSelectedClientId(value as Id<"clients">)}
              >
                <SelectTrigger id="deductClient">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.companyName} (Current: {client.credits})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deductAmount">Amount</Label>
              <Input
                id="deductAmount"
                type="number"
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deductDescription">Description (Optional)</Label>
              <Textarea
                id="deductDescription"
                placeholder="Reason for deducting credits..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeductDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeductCredits}>
              Deduct Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
