import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { usePagination } from "@/hooks/use-pagination.ts";
import PaginationControls from "@/components/ui/pagination-controls.tsx";
import {
  ShieldCheck,
  Ban,
  UserCheck,
  Activity,
  Settings2,
  Search,
  Plus,
  RotateCcw,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  Users,
  Clock,
  X,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
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
  EmptyContent,
} from "@/components/ui/empty.tsx";

// ─── Stats Cards ────────────────────────────────────────────

function StatsOverview() {
  const stats = useQuery(api.compliance.getComplianceStats, {});

  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Opted Out</p>
              <p className="text-2xl font-bold">{stats.optedOut}</p>
            </div>
            <div className="rounded-full bg-destructive/10 p-3">
              <Ban className="h-5 w-5 text-destructive" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.optOutRate}% opt-out rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Contacts</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
            <div className="rounded-full bg-green-500/10 p-3">
              <Users className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            of {stats.totalContacts} total contacts
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Recent Opt-outs</p>
              <p className="text-2xl font-bold">{stats.recentOptOuts}</p>
            </div>
            <div className="rounded-full bg-orange-500/10 p-3">
              <TrendingDown className="h-5 w-5 text-orange-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Re-subscribed</p>
              <p className="text-2xl font-bold">{stats.recentOptIns}</p>
            </div>
            <div className="rounded-full bg-blue-500/10 p-3">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Last 30 days</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Suppression List Tab ───────────────────────────────────

function SuppressionList() {
  const [search, setSearch] = useState("");
  const suppressedContacts = useQuery(api.compliance.getSuppressionList, {
    searchQuery: search || undefined,
  });
  const optIn = useMutation(api.compliance.manualOptIn);
  const [confirmId, setConfirmId] = useState<Id<"contacts"> | null>(null);

  const handleOptIn = async () => {
    if (!confirmId) return;
    try {
      await optIn({ contactId: confirmId, note: "Manual re-subscribe from compliance page" });
      toast.success("Contact re-subscribed successfully");
      setConfirmId(null);
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to re-subscribe contact");
      }
    }
  };

  const pagination = usePagination(suppressedContacts ?? [], { pageSize: 15 });

  if (!suppressedContacts) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by phone, name..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <AddToSuppressionDialog />
      </div>

      {suppressedContacts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldCheck />
            </EmptyMedia>
            <EmptyTitle>Suppression list is empty</EmptyTitle>
            <EmptyDescription>
              No contacts are currently opted out. Contacts who reply STOP will appear here automatically.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Opted Out</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginatedItems.map((contact) => (
                <TableRow key={contact._id}>
                  <TableCell className="font-mono">{contact.phoneNumber}</TableCell>
                  <TableCell>
                    {contact.firstName || contact.lastName
                      ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {contact.optedOutAt
                      ? new Date(contact.optedOutAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmId(contact._id)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Re-subscribe
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <PaginationControls {...pagination} itemLabel="contacts" />
        </>
      )}

      {/* Confirm re-subscribe dialog */}
      <Dialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-subscribe Contact</DialogTitle>
            <DialogDescription>
              This will remove the contact from the suppression list and allow messages to be sent to them again. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
            <Button onClick={handleOptIn}>
              <UserCheck className="h-4 w-4 mr-2" />
              Re-subscribe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Add to Suppression Dialog ──────────────────────────────

function AddToSuppressionDialog() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<"sms" | "whatsapp" | "telegram" | "facebook_messenger">("sms");
  const [note, setNote] = useState("");
  const optOut = useMutation(api.compliance.manualOptOut);

  const handleSubmit = async () => {
    if (!phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    try {
      await optOut({
        phoneNumber: phone.trim(),
        channel,
        note: note || undefined,
      });
      toast.success("Number added to suppression list");
      setPhone("");
      setNote("");
      setOpen(false);
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to add to suppression list");
      }
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Number
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Suppression List</DialogTitle>
            <DialogDescription>
              Manually opt out a phone number from receiving messages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                placeholder="+225XXXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="facebook_messenger">Facebook Messenger</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input
                placeholder="Reason for opt-out"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <Ban className="h-4 w-4 mr-2" />
              Add to Suppression
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Activity Log Tab ───────────────────────────────────────

function ActivityLog() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "opt_out" | "opt_in">("all");
  const logs = useQuery(api.compliance.getOptOutLog, {
    searchQuery: search || undefined,
    actionFilter: filter === "all" ? undefined : filter,
  });

  if (!logs) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by phone number..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="opt_out">Opt-outs</SelectItem>
            <SelectItem value="opt_in">Opt-ins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {logs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Activity />
            </EmptyMedia>
            <EmptyTitle>No activity yet</EmptyTitle>
            <EmptyDescription>
              Opt-out and opt-in events will be logged here as they occur.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log._id}>
                  <TableCell className="text-sm">
                    {new Date(log._creationTime).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.phoneNumber}</TableCell>
                  <TableCell>
                    {log.action === "opt_out" ? (
                      <Badge variant="destructive" className="text-xs">
                        <Ban className="h-3 w-3 mr-1" />
                        Opt-out
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Opt-in
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {log.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{log.channel}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.keyword && `Keyword: "${log.keyword}"`}
                    {log.note && log.note}
                    {!log.keyword && !log.note && "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// ─── Settings Tab ───────────────────────────────────────────

function ComplianceSettingsTab() {
  const settings = useQuery(api.compliance.getComplianceSettings, {});
  const saveSettings = useMutation(api.compliance.saveComplianceSettings);

  const [optOutKeywords, setOptOutKeywords] = useState<string[]>([]);
  const [optInKeywords, setOptInKeywords] = useState<string[]>([]);
  const [optOutAutoReply, setOptOutAutoReply] = useState("");
  const [optInAutoReply, setOptInAutoReply] = useState("");
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [blockOptedOut, setBlockOptedOut] = useState(true);
  const [addUnsubscribeFooter, setAddUnsubscribeFooter] = useState(false);
  const [unsubscribeFooterText, setUnsubscribeFooterText] = useState("");
  const [newOptOutKeyword, setNewOptOutKeyword] = useState("");
  const [newOptInKeyword, setNewOptInKeyword] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Load settings once
  if (settings && !loaded) {
    setOptOutKeywords(settings.optOutKeywords);
    setOptInKeywords(settings.optInKeywords);
    setOptOutAutoReply(settings.optOutAutoReply || "");
    setOptInAutoReply(settings.optInAutoReply || "");
    setAutoReplyEnabled(settings.autoReplyEnabled);
    setBlockOptedOut(settings.blockOptedOut);
    setAddUnsubscribeFooter(settings.addUnsubscribeFooter);
    setUnsubscribeFooterText(settings.unsubscribeFooterText || "");
    setLoaded(true);
  }

  if (!settings) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await saveSettings({
        optOutKeywords,
        optInKeywords,
        optOutAutoReply: optOutAutoReply || undefined,
        optInAutoReply: optInAutoReply || undefined,
        autoReplyEnabled,
        blockOptedOut,
        addUnsubscribeFooter,
        unsubscribeFooterText: unsubscribeFooterText || undefined,
      });
      toast.success("Compliance settings saved");
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to save settings");
      }
    }
  };

  const addKeyword = (type: "optOut" | "optIn") => {
    const keyword = type === "optOut" ? newOptOutKeyword.trim().toUpperCase() : newOptInKeyword.trim().toUpperCase();
    if (!keyword) return;

    if (type === "optOut") {
      if (!optOutKeywords.includes(keyword)) {
        setOptOutKeywords([...optOutKeywords, keyword]);
      }
      setNewOptOutKeyword("");
    } else {
      if (!optInKeywords.includes(keyword)) {
        setOptInKeywords([...optInKeywords, keyword]);
      }
      setNewOptInKeyword("");
    }
  };

  const removeKeyword = (type: "optOut" | "optIn", keyword: string) => {
    if (type === "optOut") {
      setOptOutKeywords(optOutKeywords.filter((k) => k !== keyword));
    } else {
      setOptInKeywords(optInKeywords.filter((k) => k !== keyword));
    }
  };

  return (
    <div className="space-y-6">
      {/* Blocking Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Blocking & Enforcement
          </CardTitle>
          <CardDescription>
            Control how opted-out contacts are handled when sending messages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Block sending to opted-out contacts</p>
              <p className="text-xs text-muted-foreground">
                Prevent any messages from being sent to contacts on the suppression list
              </p>
            </div>
            <Switch checked={blockOptedOut} onCheckedChange={setBlockOptedOut} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Add unsubscribe footer</p>
              <p className="text-xs text-muted-foreground">
                Append an opt-out instruction to outgoing messages
              </p>
            </div>
            <Switch checked={addUnsubscribeFooter} onCheckedChange={setAddUnsubscribeFooter} />
          </div>
          {addUnsubscribeFooter && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <Label>Footer Text</Label>
              <Input
                placeholder="Reply STOP to unsubscribe"
                value={unsubscribeFooterText}
                onChange={(e) => setUnsubscribeFooterText(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keywords Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Opt-out Keywords
          </CardTitle>
          <CardDescription>
            When a recipient sends one of these keywords, they will be automatically opted out.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {optOutKeywords.map((kw) => (
              <Badge key={kw} variant="secondary" className="gap-1 pr-1">
                {kw}
                <button
                  onClick={() => removeKeyword("optOut", kw)}
                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add keyword..."
              value={newOptOutKeyword}
              onChange={(e) => setNewOptOutKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addKeyword("optOut"); }}
            />
            <Button variant="secondary" size="sm" onClick={() => addKeyword("optOut")}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Opt-in Keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Opt-in Keywords
          </CardTitle>
          <CardDescription>
            When a recipient sends one of these keywords, they will be re-subscribed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {optInKeywords.map((kw) => (
              <Badge key={kw} variant="secondary" className="gap-1 pr-1">
                {kw}
                <button
                  onClick={() => removeKeyword("optIn", kw)}
                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add keyword..."
              value={newOptInKeyword}
              onChange={(e) => setNewOptInKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addKeyword("optIn"); }}
            />
            <Button variant="secondary" size="sm" onClick={() => addKeyword("optIn")}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto-reply Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Auto-reply Messages
          </CardTitle>
          <CardDescription>
            Automatically send confirmation messages when contacts opt out or opt in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable auto-replies</p>
              <p className="text-xs text-muted-foreground">
                Send a confirmation message after opt-out/opt-in
              </p>
            </div>
            <Switch checked={autoReplyEnabled} onCheckedChange={setAutoReplyEnabled} />
          </div>
          {autoReplyEnabled && (
            <>
              <div className="space-y-2">
                <Label>Opt-out confirmation message</Label>
                <Textarea
                  placeholder="You have been unsubscribed. Reply START to resubscribe."
                  value={optOutAutoReply}
                  onChange={(e) => setOptOutAutoReply(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Opt-in confirmation message</Label>
                <Textarea
                  placeholder="Welcome back! You have been resubscribed."
                  value={optInAutoReply}
                  onChange={(e) => setOptInAutoReply(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          Opt-out & Compliance
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage opt-out preferences, suppression lists, and messaging compliance.
        </p>
      </div>

      <StatsOverview />

      <Tabs defaultValue="suppression" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suppression" className="gap-2">
            <Ban className="h-4 w-4" />
            Suppression List
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            Activity Log
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suppression">
          <SuppressionList />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityLog />
        </TabsContent>

        <TabsContent value="settings">
          <ComplianceSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
