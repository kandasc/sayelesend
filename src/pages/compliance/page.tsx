import { useState } from "react";
import { useIntl } from "react-intl";
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
  const intl = useIntl();
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
              <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: "page.compliance.optedOut" })}</p>
              <p className="text-2xl font-bold">{stats.optedOut}</p>
            </div>
            <div className="rounded-full bg-destructive/10 p-3">
              <Ban className="h-5 w-5 text-destructive" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {intl.formatMessage({ id: "page.compliance.optOutRate" }, { rate: stats.optOutRate })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: "page.compliance.activeContacts" })}</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
            <div className="rounded-full bg-green-500/10 p-3">
              <Users className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {intl.formatMessage({ id: "page.compliance.ofTotalContacts" }, { total: stats.totalContacts })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: "page.compliance.recentOptOuts" })}</p>
              <p className="text-2xl font-bold">{stats.recentOptOuts}</p>
            </div>
            <div className="rounded-full bg-orange-500/10 p-3">
              <TrendingDown className="h-5 w-5 text-orange-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{intl.formatMessage({ id: "page.compliance.last30Days" })}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: "page.compliance.reSubscribed" })}</p>
              <p className="text-2xl font-bold">{stats.recentOptIns}</p>
            </div>
            <div className="rounded-full bg-blue-500/10 p-3">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{intl.formatMessage({ id: "page.compliance.last30Days" })}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Suppression List Tab ───────────────────────────────────

function SuppressionList() {
  const intl = useIntl();
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
      toast.success(intl.formatMessage({ id: "page.compliance.reSubscribeSuccess" }));
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={intl.formatMessage({ id: "page.compliance.searchByPhone" })}
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
            <EmptyTitle>{intl.formatMessage({ id: "page.compliance.emptySuppressionTitle" })}</EmptyTitle>
            <EmptyDescription>
              {intl.formatMessage({ id: "page.compliance.emptySuppressionDesc" })}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
        <Card>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{intl.formatMessage({ id: "common.phoneNumber" })}</TableHead>
                <TableHead>{intl.formatMessage({ id: "common.name" })}</TableHead>
                <TableHead>{intl.formatMessage({ id: "page.compliance.optedOutColumn" })}</TableHead>
                <TableHead className="text-right">{intl.formatMessage({ id: "page.compliance.actionColumn" })}</TableHead>
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
                      {intl.formatMessage({ id: "page.compliance.reSubscribe" })}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>
        <PaginationControls {...pagination} itemLabel="contacts" />
        </>
      )}

      {/* Confirm re-subscribe dialog */}
      <Dialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: "page.compliance.reSubscribeTitle" })}</DialogTitle>
            <DialogDescription>
              {intl.formatMessage({ id: "page.compliance.reSubscribeDesc" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmId(null)}>
              {intl.formatMessage({ id: "buttons.cancel" })}
            </Button>
            <Button onClick={handleOptIn}>
              <UserCheck className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: "page.compliance.reSubscribe" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Add to Suppression Dialog ──────────────────────────────

function AddToSuppressionDialog() {
  const intl = useIntl();
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
      toast.success(intl.formatMessage({ id: "page.compliance.numberAdded" }));
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
        {intl.formatMessage({ id: "page.compliance.addNumber" })}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: "page.compliance.addToSuppression" })}</DialogTitle>
            <DialogDescription>
              {intl.formatMessage({ id: "page.compliance.addToSuppressionDesc" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: "common.phoneNumber" })}</Label>
              <Input
                placeholder="+225XXXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: "common.channel" })}</Label>
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
              <Label>{intl.formatMessage({ id: "page.compliance.noteOptional" })}</Label>
              <Input
                placeholder={intl.formatMessage({ id: "page.compliance.reasonForOptOut" })}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {intl.formatMessage({ id: "buttons.cancel" })}
            </Button>
            <Button onClick={handleSubmit}>
              <Ban className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: "page.compliance.addToSuppressionBtn" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Activity Log Tab ───────────────────────────────────────

function ActivityLog() {
  const intl = useIntl();
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={intl.formatMessage({ id: "page.compliance.searchByPhoneLog" })}
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
            <SelectItem value="all">{intl.formatMessage({ id: "page.compliance.allEvents" })}</SelectItem>
            <SelectItem value="opt_out">{intl.formatMessage({ id: "page.compliance.optOuts" })}</SelectItem>
            <SelectItem value="opt_in">{intl.formatMessage({ id: "page.compliance.optIns" })}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {logs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Activity />
            </EmptyMedia>
            <EmptyTitle>{intl.formatMessage({ id: "page.compliance.noActivity" })}</EmptyTitle>
            <EmptyDescription>
              {intl.formatMessage({ id: "page.compliance.noActivityDesc" })}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{intl.formatMessage({ id: "common.date" })}</TableHead>
                <TableHead>{intl.formatMessage({ id: "common.phone" })}</TableHead>
                <TableHead>{intl.formatMessage({ id: "page.compliance.actionColumn" })}</TableHead>
                <TableHead>{intl.formatMessage({ id: "page.compliance.source" })}</TableHead>
                <TableHead>{intl.formatMessage({ id: "common.channel" })}</TableHead>
                <TableHead>{intl.formatMessage({ id: "page.compliance.details" })}</TableHead>
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
                        {intl.formatMessage({ id: "page.compliance.optOuts" })}
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                        <UserCheck className="h-3 w-3 mr-1" />
                        {intl.formatMessage({ id: "page.compliance.optIns" })}
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
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Settings Tab ───────────────────────────────────────────

function ComplianceSettingsTab() {
  const intl = useIntl();
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
      toast.success(intl.formatMessage({ id: "page.compliance.settingsSaved" }));
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
            {intl.formatMessage({ id: "page.compliance.blockingEnforcement" })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage({ id: "page.compliance.blockingDesc" })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{intl.formatMessage({ id: "page.compliance.blockSending" })}</p>
              <p className="text-xs text-muted-foreground">
                {intl.formatMessage({ id: "page.compliance.blockSendingDesc" })}
              </p>
            </div>
            <Switch checked={blockOptedOut} onCheckedChange={setBlockOptedOut} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{intl.formatMessage({ id: "page.compliance.addUnsubFooter" })}</p>
              <p className="text-xs text-muted-foreground">
                {intl.formatMessage({ id: "page.compliance.addUnsubFooterDesc" })}
              </p>
            </div>
            <Switch checked={addUnsubscribeFooter} onCheckedChange={setAddUnsubscribeFooter} />
          </div>
          {addUnsubscribeFooter && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <Label>{intl.formatMessage({ id: "page.compliance.footerText" })}</Label>
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
            {intl.formatMessage({ id: "page.compliance.optOutKeywords" })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage({ id: "page.compliance.optOutKeywordsDesc" })}
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
              placeholder={intl.formatMessage({ id: "page.compliance.addKeyword" })}
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
            {intl.formatMessage({ id: "page.compliance.optInKeywords" })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage({ id: "page.compliance.optInKeywordsDesc" })}
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
              placeholder={intl.formatMessage({ id: "page.compliance.addKeyword" })}
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
            {intl.formatMessage({ id: "page.compliance.autoReplyMessages" })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage({ id: "page.compliance.autoReplyDesc" })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{intl.formatMessage({ id: "page.compliance.enableAutoReplies" })}</p>
              <p className="text-xs text-muted-foreground">
                {intl.formatMessage({ id: "page.compliance.enableAutoRepliesDesc" })}
              </p>
            </div>
            <Switch checked={autoReplyEnabled} onCheckedChange={setAutoReplyEnabled} />
          </div>
          {autoReplyEnabled && (
            <>
              <div className="space-y-2">
                <Label>{intl.formatMessage({ id: "page.compliance.optOutConfirmation" })}</Label>
                <Textarea
                  placeholder="You have been unsubscribed. Reply START to resubscribe."
                  value={optOutAutoReply}
                  onChange={(e) => setOptOutAutoReply(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>{intl.formatMessage({ id: "page.compliance.optInConfirmation" })}</Label>
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
          {intl.formatMessage({ id: "page.compliance.saveSettings" })}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function CompliancePage() {
  const intl = useIntl();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          {intl.formatMessage({ id: "page.compliance.title" })}
        </h1>
        <p className="text-muted-foreground mt-1">
          {intl.formatMessage({ id: "page.compliance.subtitle" })}
        </p>
      </div>

      <StatsOverview />

      <Tabs defaultValue="suppression" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suppression" className="gap-2">
            <Ban className="h-4 w-4" />
            {intl.formatMessage({ id: "page.compliance.suppressionList" })}
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            {intl.formatMessage({ id: "page.compliance.activityLog" })}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="h-4 w-4" />
            {intl.formatMessage({ id: "page.compliance.settings" })}
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
