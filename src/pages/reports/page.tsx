import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { CalendarIcon, TrendingUp, TrendingDown, Activity, CheckCircle, XCircle, Clock, BarChart3, Download, FileSpreadsheet, FileText, Search, X } from "lucide-react";
import { format as formatDate, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/use-debounce";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedClientId, setSelectedClientId] = useState<Id<"clients"> | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);

  const currentUser = useQuery(api.testMode.getEffectiveUser);
  const clients = useQuery(api.admin.listClients);

  const startDate = startOfDay(dateRange.from).getTime();
  const endDate = endOfDay(dateRange.to).getTime();

  const messageStats = useQuery(api.analytics.getMessageStats, {
    startDate,
    endDate,
    clientId: selectedClientId,
    searchQuery: debouncedSearchQuery,
  });

  const dailyVolume = useQuery(api.analytics.getDailyMessageVolume, {
    startDate,
    endDate,
    clientId: selectedClientId,
    searchQuery: debouncedSearchQuery,
  });

  const providerStats = useQuery(api.analytics.getProviderStats, {
    startDate,
    endDate,
    clientId: selectedClientId,
    searchQuery: debouncedSearchQuery,
  });

  const topRecipients = useQuery(api.analytics.getTopRecipients, {
    startDate,
    endDate,
    clientId: selectedClientId,
    limit: 10,
    searchQuery: debouncedSearchQuery,
  });

  const clientUsage = useQuery(
    api.analytics.getClientUsageStats,
    currentUser?.role === "admin" ? { startDate, endDate } : "skip"
  );

  const isAdmin = currentUser?.role === "admin";

  const exportCSV = useAction(api.reports.exportReportCSV);
  const exportExcel = useAction(api.reports.exportReportExcel);
  const exportPDF = useAction(api.reports.exportReportPDF);

  const handleDownload = async (format: "csv" | "excel" | "pdf") => {
    try {
      toast.loading(`Generating ${format.toUpperCase()} report...`);
      
      let result;
      let filename;
      let mimeType;
      
      if (format === "csv") {
        result = await exportCSV({
          startDate,
          endDate,
          clientId: selectedClientId,
          searchQuery: debouncedSearchQuery,
        });
        filename = `report_${formatDate(dateRange.from, "yyyy-MM-dd")}_${formatDate(dateRange.to, "yyyy-MM-dd")}.csv`;
        mimeType = "text/csv";
        
        // Create download link for CSV
        const blob = new Blob([result], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else if (format === "excel") {
        result = await exportExcel({
          startDate,
          endDate,
          clientId: selectedClientId,
          searchQuery: debouncedSearchQuery,
        });
        filename = `report_${formatDate(dateRange.from, "yyyy-MM-dd")}_${formatDate(dateRange.to, "yyyy-MM-dd")}.xlsx`;
        mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        
        // Convert base64 to blob
        const binaryString = atob(result);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else if (format === "pdf") {
        result = await exportPDF({
          startDate,
          endDate,
          clientId: selectedClientId,
          searchQuery: debouncedSearchQuery,
        });
        filename = `report_${formatDate(dateRange.from, "yyyy-MM-dd")}_${formatDate(dateRange.to, "yyyy-MM-dd")}.pdf`;
        mimeType = "application/pdf";
        
        // Convert base64 to blob
        const binaryString = atob(result);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
      toast.dismiss();
      toast.success(`${format.toUpperCase()} report downloaded successfully`);
    } catch (error) {
      toast.dismiss();
      const errorMessage = error instanceof Error ? error.message : "Failed to download report";
      toast.error(errorMessage);
    }
  };

  if (currentUser === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const stats = messageStats || {
    totalMessages: 0,
    sentMessages: 0,
    deliveredMessages: 0,
    failedMessages: 0,
    pendingMessages: 0,
    deliveryRate: 0,
    failureRate: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your SMS messaging performance
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by phone, message, reference, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Date Range Picker */}
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal min-w-[280px]")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDate(dateRange.from, "LLL dd, y")} - {formatDate(dateRange.to, "LLL dd, y")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="flex flex-col gap-2 p-3 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      setDateRange({ from: subDays(new Date(), 7), to: new Date() });
                      setShowDatePicker(false);
                    }}
                  >
                    Last 7 days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      setDateRange({ from: subDays(new Date(), 30), to: new Date() });
                      setShowDatePicker(false);
                    }}
                  >
                    Last 30 days
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start"
                    onClick={() => {
                      setDateRange({ from: subDays(new Date(), 90), to: new Date() });
                      setShowDatePicker(false);
                    }}
                  >
                    Last 90 days
                  </Button>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium mb-2">Custom Range</p>
                  <div className="grid gap-2">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                    <p className="text-xs text-muted-foreground text-center">to</p>
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => {
                        if (date) {
                          setDateRange({ ...dateRange, to: date });
                          setShowDatePicker(false);
                        }
                      }}
                      disabled={(date) => date > new Date() || date < dateRange.from}
                      initialFocus
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Client Filter (Admin Only) */}
            {isAdmin && clients && (
              <Select
                value={selectedClientId || "all"}
                onValueChange={(value) => setSelectedClientId(value === "all" ? undefined : value as Id<"clients">)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Export Report Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload("csv")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("excel")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Download Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload("pdf")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Download PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingMessages} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deliveredMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.deliveryRate.toFixed(1)}% delivery rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failedMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.failureRate.toFixed(1)}% failure rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            {stats.deliveryRate >= 95 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-orange-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deliveryRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.deliveryRate >= 95 ? "Excellent" : stats.deliveryRate >= 90 ? "Good" : "Needs attention"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="volume" className="space-y-4">
        <TabsList>
          <TabsTrigger value="volume">Message Volume</TabsTrigger>
          <TabsTrigger value="providers">Provider Performance</TabsTrigger>
          <TabsTrigger value="recipients">Top Recipients</TabsTrigger>
          {isAdmin && <TabsTrigger value="clients">Client Usage</TabsTrigger>}
        </TabsList>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Message Volume</CardTitle>
              <CardDescription>
                Messages sent, delivered, and failed over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dailyVolume === undefined ? (
                <Skeleton className="h-[300px] w-full" />
              ) : dailyVolume.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No data available for the selected date range
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyVolume}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sent" stroke="#0088FE" name="Sent" />
                    <Line type="monotone" dataKey="delivered" stroke="#00C49F" name="Delivered" />
                    <Line type="monotone" dataKey="failed" stroke="#FF8042" name="Failed" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message Status Distribution</CardTitle>
              <CardDescription>
                Breakdown of message statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {messageStats === undefined ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Delivered", value: stats.deliveredMessages },
                        { name: "Sent", value: stats.sentMessages - stats.deliveredMessages },
                        { name: "Failed", value: stats.failedMessages },
                        { name: "Pending", value: stats.pendingMessages },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: "Delivered", value: stats.deliveredMessages },
                        { name: "Sent", value: stats.sentMessages - stats.deliveredMessages },
                        { name: "Failed", value: stats.failedMessages },
                        { name: "Pending", value: stats.pendingMessages },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Provider Performance</CardTitle>
              <CardDescription>
                Delivery rates and message volume by SMS provider
              </CardDescription>
            </CardHeader>
            <CardContent>
              {providerStats === undefined ? (
                <Skeleton className="h-[300px] w-full" />
              ) : providerStats.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No provider data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={providerStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="total" fill="#0088FE" name="Total Messages" />
                    <Bar yAxisId="left" dataKey="delivered" fill="#00C49F" name="Delivered" />
                    <Bar yAxisId="right" dataKey="deliveryRate" fill="#FFBB28" name="Delivery Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Recipients</CardTitle>
              <CardDescription>
                Most frequently messaged phone numbers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topRecipients === undefined ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : topRecipients.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                  No recipient data available
                </div>
              ) : (
                <div className="space-y-2">
                  {topRecipients.map((recipient, index) => (
                    <div key={recipient.phone} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {index + 1}
                        </div>
                        <div className="font-mono">{recipient.phone}</div>
                      </div>
                      <div className="text-sm font-semibold">
                        {recipient.count} {recipient.count === 1 ? "message" : "messages"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Client Usage Statistics</CardTitle>
                <CardDescription>
                  Message volume and performance by client
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
                    <BarChart data={clientUsage}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="clientName" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalMessages" fill="#0088FE" name="Total Messages" />
                      <Bar dataKey="deliveredMessages" fill="#00C49F" name="Delivered" />
                      <Bar dataKey="failedMessages" fill="#FF8042" name="Failed" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Details</CardTitle>
                <CardDescription>
                  Detailed statistics for each client
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clientUsage === undefined ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientUsage.map((client) => (
                      <div key={client.clientId} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{client.clientName}</h4>
                            <div className="mt-2 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                              <div>
                                <span className="text-muted-foreground">Total:</span>{" "}
                                <span className="font-medium">{client.totalMessages}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Delivered:</span>{" "}
                                <span className="font-medium text-green-600">{client.deliveredMessages}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Failed:</span>{" "}
                                <span className="font-medium text-red-600">{client.failedMessages}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Rate:</span>{" "}
                                <span className="font-medium">{client.deliveryRate}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Credits</div>
                            <div className="text-lg font-bold">{client.credits.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
