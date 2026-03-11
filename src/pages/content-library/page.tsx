import { Authenticated } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Input } from "@/components/ui/input.tsx";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Library,
  CalendarDays,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  MessageCircle,
  Music2,
  LayoutGrid,
  Search,
  Heart,
  Trash2,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  FileText,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Send,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useIntl } from "react-intl";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, isToday } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

// ─── Constants ────────────────────────────────────────────────

const PLATFORMS = [
  { value: "facebook", label: "Facebook", icon: <Facebook className="h-4 w-4" /> },
  { value: "instagram", label: "Instagram", icon: <Instagram className="h-4 w-4" /> },
  { value: "x", label: "X (Twitter)", icon: <Twitter className="h-4 w-4" /> },
  { value: "linkedin", label: "LinkedIn", icon: <Linkedin className="h-4 w-4" /> },
  { value: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" /> },
  { value: "tiktok", label: "TikTok", icon: <Music2 className="h-4 w-4" /> },
  { value: "general", label: "General", icon: <LayoutGrid className="h-4 w-4" /> },
] as const;

function getPlatformIcon(platform: string) {
  const found = PLATFORMS.find((p) => p.value === platform);
  return found?.icon ?? <LayoutGrid className="h-4 w-4" />;
}

function getPlatformLabel(platform: string) {
  const found = PLATFORMS.find((p) => p.value === platform);
  return found?.label ?? platform;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  saved: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  scheduled: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  published: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

// ─── Main Export ──────────────────────────────────────────────

export default function ContentLibrary() {
  return (
    <Authenticated>
      <ContentLibraryContent />
    </Authenticated>
  );
}

// ─── Content Library Content ─────────────────────────────────

function ContentLibraryContent() {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState("library");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Library className="h-6 w-6" />
          {intl.formatMessage({ id: "page.contentLibrary.title" })}
        </h1>
        <p className="text-muted-foreground mt-1">
          {intl.formatMessage({ id: "page.contentLibrary.subtitle" })}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="library" className="gap-2">
            <Library className="h-4 w-4" />
            {intl.formatMessage({ id: "page.contentLibrary.library" })}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            {intl.formatMessage({ id: "page.contentLibrary.calendar" })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <LibraryTab />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Library Tab ────────────────────────────────────────────

function LibraryTab() {
  const intl = useIntl();
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [status, setStatus] = useState("all");
  const [itemType, setItemType] = useState<"all" | "content" | "image">("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [scheduleDialogItem, setScheduleDialogItem] = useState<string | null>(null);

  const items = useQuery(api.marketing.listAllLibraryItems, {
    platform: platform !== "all" ? platform : undefined,
    status: status !== "all" ? status : undefined,
    itemType: itemType !== "all" ? itemType : undefined,
    search: search.trim() || undefined,
    favoritesOnly: favoritesOnly || undefined,
  });

  const updateContent = useMutation(api.marketing.updateContent);
  const deleteContent = useMutation(api.marketing.deleteContent);
  const updateImage = useMutation(api.marketing.updateImage);
  const deleteImage = useMutation(api.marketing.deleteImage);
  const markPublished = useMutation(api.marketing.markPublished);

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Copied!");
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleFavorite = async (item: { _id: string; itemType: string; isFavorite: boolean }) => {
    if (item.itemType === "content") {
      await updateContent({ contentId: item._id as Id<"marketingContent">, isFavorite: !item.isFavorite });
    } else {
      await updateImage({ imageId: item._id as Id<"marketingImages">, isFavorite: !item.isFavorite });
    }
  };

  const handleDelete = async (item: { _id: string; itemType: string }) => {
    if (item.itemType === "content") {
      await deleteContent({ contentId: item._id as Id<"marketingContent"> });
    } else {
      await deleteImage({ imageId: item._id as Id<"marketingImages"> });
    }
    toast.success("Deleted");
  };

  const handleMarkPublished = async (id: string) => {
    await markPublished({ contentId: id as Id<"marketingContent"> });
    toast.success(intl.formatMessage({ id: "page.contentLibrary.publishSuccess" }));
  };

  if (items === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={intl.formatMessage({ id: "page.contentLibrary.searchPlaceholder" })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={itemType} onValueChange={(v) => setItemType(v as "all" | "content" | "image")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{intl.formatMessage({ id: "page.contentLibrary.allTypes" })}</SelectItem>
            <SelectItem value="content">{intl.formatMessage({ id: "page.contentLibrary.textContent" })}</SelectItem>
            <SelectItem value="image">{intl.formatMessage({ id: "page.contentLibrary.images" })}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{intl.formatMessage({ id: "common.all" })}</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{intl.formatMessage({ id: "page.contentLibrary.allStatuses" })}</SelectItem>
            <SelectItem value="draft">{intl.formatMessage({ id: "page.contentLibrary.draft" })}</SelectItem>
            <SelectItem value="saved">{intl.formatMessage({ id: "page.contentLibrary.saved" })}</SelectItem>
            <SelectItem value="scheduled">{intl.formatMessage({ id: "page.contentLibrary.scheduled" })}</SelectItem>
            <SelectItem value="published">{intl.formatMessage({ id: "page.contentLibrary.published" })}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant={favoritesOnly ? "default" : "secondary"}
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          className="gap-1.5"
        >
          <Heart className={`h-3.5 w-3.5 ${favoritesOnly ? "fill-current" : ""}`} />
          {intl.formatMessage({ id: "page.contentLibrary.favoritesOnly" })}
        </Button>
      </div>

      {/* Content Grid */}
      {items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Library />
            </EmptyMedia>
            <EmptyTitle>
              {search || platform !== "all" || status !== "all"
                ? intl.formatMessage({ id: "page.contentLibrary.noContentFiltered" })
                : intl.formatMessage({ id: "page.contentLibrary.noContent" })}
            </EmptyTitle>
            <EmptyDescription>
              {intl.formatMessage({ id: "page.contentLibrary.noContentDesc" })}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card
              key={item._id}
              className="group hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Image preview */}
              {item.imageUrl && (
                <div className="relative h-40 bg-muted overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.topic}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge variant="secondary" className="text-[10px] bg-background/80 backdrop-blur-sm">
                      {item.itemType === "image" ? "Image" : "Post"}
                    </Badge>
                  </div>
                </div>
              )}

              <CardContent className={`space-y-3 ${item.imageUrl ? "pt-3" : "pt-4"}`}>
                {/* Header row: platform + status + actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {getPlatformIcon(item.platform)}
                    <Badge variant="secondary" className="text-xs truncate">
                      {getPlatformLabel(item.platform)}
                    </Badge>
                    <Badge className={`text-[10px] ${STATUS_COLORS[item.status] ?? ""}`}>
                      {item.status === "scheduled" && <Clock className="h-2.5 w-2.5 mr-0.5" />}
                      {item.status === "published" && <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />}
                      {item.status}
                    </Badge>
                  </div>
                  {!item.imageUrl && (
                    <Badge variant="secondary" className="text-[10px]">
                      {item.itemType === "image" ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                    </Badge>
                  )}
                </div>

                {/* Text preview */}
                <p className="text-sm line-clamp-3">{item.text}</p>

                {item.hashtags && (
                  <p className="text-xs text-primary truncate">{item.hashtags}</p>
                )}

                {/* Scheduled/published info */}
                {item.scheduledAt && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {intl.formatMessage({ id: "page.contentLibrary.scheduledFor" })} {format(new Date(item.scheduledAt), "PPp")}
                  </p>
                )}
                {item.publishedAt && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {intl.formatMessage({ id: "page.contentLibrary.publishedOn" })} {format(new Date(item.publishedAt), "PPp")}
                  </p>
                )}

                {/* Footer meta */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                  <span>{format(new Date(item._creationTime), "PP")}</span>
                  {item.tone && <span className="capitalize">{item.tone}</span>}
                  {item.style && <span className="capitalize">{item.style}</span>}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 pt-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleCopy(item._id, item.text + (item.hashtags ? `\n\n${item.hashtags}` : ""))}
                  >
                    {copied === item._id ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleFavorite(item)}
                  >
                    <Heart className={`h-3.5 w-3.5 ${item.isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                  {item.itemType === "content" && item.status !== "published" && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setScheduleDialogItem(item._id)}
                        title={intl.formatMessage({ id: "page.contentLibrary.schedule" })}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-green-600"
                        onClick={() => handleMarkPublished(item._id)}
                        title={intl.formatMessage({ id: "page.contentLibrary.markPublished" })}
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  <div className="flex-1" />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Dialog */}
      {scheduleDialogItem && (
        <ScheduleDialog
          contentId={scheduleDialogItem as Id<"marketingContent">}
          onClose={() => setScheduleDialogItem(null)}
        />
      )}
    </div>
  );
}

// ─── Schedule Dialog ────────────────────────────────────────

function ScheduleDialog({
  contentId,
  onClose,
}: {
  contentId: Id<"marketingContent">;
  onClose: () => void;
}) {
  const intl = useIntl();
  const scheduleContent = useMutation(api.marketing.scheduleContent);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [isScheduling, setIsScheduling] = useState(false);

  const handleSchedule = async () => {
    if (!date) {
      toast.error(intl.formatMessage({ id: "page.contentLibrary.selectDate" }));
      return;
    }
    setIsScheduling(true);
    try {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
      await scheduleContent({ contentId, scheduledAt });
      toast.success(intl.formatMessage({ id: "page.contentLibrary.scheduleSuccess" }));
      onClose();
    } catch {
      toast.error("Failed to schedule content");
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {intl.formatMessage({ id: "page.contentLibrary.scheduleContent" })}
          </DialogTitle>
          <DialogDescription>
            {intl.formatMessage({ id: "page.contentLibrary.scheduleDesc" })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {intl.formatMessage({ id: "page.contentLibrary.selectDate" })}
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {intl.formatMessage({ id: "page.contentLibrary.selectTime" })}
            </label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {intl.formatMessage({ id: "buttons.cancel" })}
          </Button>
          <Button onClick={handleSchedule} disabled={isScheduling || !date} className="gap-2">
            {isScheduling ? <Spinner /> : <Calendar className="h-4 w-4" />}
            {intl.formatMessage({ id: "page.contentLibrary.schedule" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Calendar Tab ───────────────────────────────────────────

function CalendarTab() {
  const intl = useIntl();
  const locale = intl.locale === "fr" ? fr : enUS;
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const calendarItems = useQuery(api.marketing.listCalendarContent, {
    startDate: monthStart.toISOString(),
    endDate: monthEnd.toISOString(),
  });

  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

  // Pad start of month to align with day of week (Mon=0)
  const startPadding = useMemo(() => {
    const dayOfWeek = getDay(monthStart);
    // Convert Sunday=0 to Monday-first: Mon=0, Tue=1, ..., Sun=6
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  }, [monthStart]);

  const dayNames = useMemo(() => {
    const names = intl.locale === "fr"
      ? ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return names;
  }, [intl.locale]);

  const getItemsForDay = useCallback(
    (day: Date) => {
      if (!calendarItems) return [];
      return calendarItems.filter((item) => {
        const itemDate = item.scheduledAt ?? item.publishedAt;
        if (!itemDate) return false;
        return isSameDay(new Date(itemDate), day);
      });
    },
    [calendarItems]
  );

  const hasAnyItems = calendarItems && calendarItems.length > 0;

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          title={intl.formatMessage({ id: "page.contentLibrary.previousMonth" })}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <h2 className="text-lg font-semibold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale })}
        </h2>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          title={intl.formatMessage({ id: "page.contentLibrary.nextMonth" })}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {calendarItems === undefined ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : !hasAnyItems ? (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarDays />
                </EmptyMedia>
                <EmptyTitle>
                  {intl.formatMessage({ id: "page.contentLibrary.noScheduled" })}
                </EmptyTitle>
                <EmptyDescription>
                  {intl.formatMessage({ id: "page.contentLibrary.noScheduledDesc" })}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map((name) => (
              <div
                key={name}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {name}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Padding cells */}
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} className="h-24 rounded-lg bg-muted/30" />
            ))}

            {/* Day cells */}
            {days.map((day) => {
              const dayItems = getItemsForDay(day);
              const isTodayDate = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`h-24 rounded-lg border p-1.5 overflow-hidden transition-colors ${
                    isTodayDate
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-xs font-medium ${
                        isTodayDate
                          ? "text-primary font-bold"
                          : "text-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 overflow-hidden">
                    {dayItems.slice(0, 2).map((item) => (
                      <div
                        key={item._id}
                        className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${
                          item.status === "published"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                        }`}
                        title={item.topic}
                      >
                        <span className="flex items-center gap-0.5">
                          {getPlatformIcon(item.platform)}
                          <span className="truncate">{item.topic}</span>
                        </span>
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <div className="text-[10px] text-muted-foreground text-center">
                        +{dayItems.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming scheduled items list */}
      {hasAnyItems && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              {intl.formatMessage({ id: "page.contentLibrary.scheduled" })} - {format(currentMonth, "MMMM yyyy", { locale })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {calendarItems
                .sort((a, b) => {
                  const dateA = a.scheduledAt ?? a.publishedAt ?? "";
                  const dateB = b.scheduledAt ?? b.publishedAt ?? "";
                  return dateA.localeCompare(dateB);
                })
                .map((item) => {
                  const itemDate = item.scheduledAt ?? item.publishedAt;
                  return (
                    <div
                      key={item._id}
                      className="flex items-center gap-3 p-2 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="shrink-0">
                        {getPlatformIcon(item.platform)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.topic}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {item.generatedText}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge className={`text-[10px] ${STATUS_COLORS[item.status] ?? ""}`}>
                          {item.status}
                        </Badge>
                        {itemDate && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {format(new Date(itemDate), "PP", { locale })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
