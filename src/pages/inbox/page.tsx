import { Authenticated } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  MessageSquare,
  Search,
  Send,
  ArrowLeft,
  Archive,
  ArchiveRestore,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Phone,
  User,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { useIntl } from "react-intl";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { cn } from "@/lib/utils.ts";

export default function Inbox() {
  return (
    <Authenticated>
      <InboxContent />
    </Authenticated>
  );
}

type Channel = "sms" | "whatsapp" | "telegram" | "facebook_messenger";

function InboxContent() {
  const intl = useIntl();
  const client = useQuery(api.clients.getCurrentClient, {});
  const [selectedId, setSelectedId] = useState<Id<"conversations"> | null>(null);
  const [channelFilter, setChannelFilter] = useState<Channel | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [showArchived, setShowArchived] = useState(false);

  const currentUser = useQuery(api.testMode.getEffectiveUser, {});
  const conversations = useQuery(
    api.conversations.listConversations,
    client
      ? {
          clientId: client._id,
          status: showArchived ? "archived" : "active",
          ...(channelFilter !== "all" ? { channel: channelFilter } : {}),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        }
      : "skip"
  );

  const totalUnread = useQuery(
    api.conversations.getTotalUnread,
    client ? { clientId: client._id } : "skip"
  );

  const buildHistory = useMutation(api.conversations.triggerBuildHistory);
  const [buildingHistory, setBuildingHistory] = useState(false);
  const isAdmin = currentUser?.role === "admin";

  if (!client) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-4 h-[calc(100vh-12rem)]">
          <Skeleton className="w-80 h-full" />
          <Skeleton className="flex-1 h-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{intl.formatMessage({ id: "page.inbox.title" })}</h1>
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: "page.inbox.subtitle" })}
            {totalUnread ? ` — ${totalUnread} unread` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              disabled={buildingHistory}
              onClick={async () => {
                setBuildingHistory(true);
                try {
                  await buildHistory({});
                  toast.success("Building conversations from message history...");
                } catch {
                  toast.error("Failed to start history build");
                } finally {
                  setBuildingHistory(false);
                }
              }}
            >
              {buildingHistory ? intl.formatMessage({ id: "page.inbox.building" }) : intl.formatMessage({ id: "page.inbox.syncHistory" })}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowArchived(!showArchived);
              setSelectedId(null);
            }}
          >
            {showArchived ? (
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: "common.active" })}
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                {intl.formatMessage({ id: "page.inbox.archived" })}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex gap-0 h-[calc(100vh-14rem)] border rounded-xl overflow-hidden bg-card">
        {/* Left panel: conversation list */}
        <div className="w-80 border-r flex flex-col shrink-0">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={intl.formatMessage({ id: "page.contacts.searchPlaceholder" })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select
              value={channelFilter}
              onValueChange={(v) => setChannelFilter(v as Channel | "all")}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{intl.formatMessage({ id: "page.inbox.allChannels" })}</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="facebook_messenger">Messenger</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations === undefined ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? intl.formatMessage({ id: "page.inbox.noConversations" })
                  : showArchived
                    ? intl.formatMessage({ id: "page.inbox.noArchivedConversations" })
                    : intl.formatMessage({ id: "page.inbox.noConversationsYet" })}
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv._id}
                  conversation={conv}
                  isSelected={selectedId === conv._id}
                  onClick={() => setSelectedId(conv._id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel: thread or empty state */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedId ? (
            <ConversationThread
              conversationId={selectedId}
              clientId={client._id}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageSquare />
                  </EmptyMedia>
                  <EmptyTitle>{intl.formatMessage({ id: "page.inbox.selectConversation" })}</EmptyTitle>
                  <EmptyDescription>
                    {intl.formatMessage({ id: "page.inbox.selectDesc" })}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Conversation list item ─────────────────────────────────────────────────

function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: {
    _id: Id<"conversations">;
    contactPhone: string;
    contactName?: string;
    channel: string;
    lastMessageText: string;
    lastMessageAt: string;
    lastMessageDirection: string;
    unreadCount: number;
  };
  isSelected: boolean;
  onClick: () => void;
}) {
  const intl = useIntl();
  const displayName = conversation.contactName || conversation.contactPhone;
  const lastDate = new Date(conversation.lastMessageAt);

  const timeLabel = isToday(lastDate)
    ? format(lastDate, "HH:mm")
    : isYesterday(lastDate)
      ? intl.formatMessage({ id: "common.yesterday" })
      : format(lastDate, "MMM d");

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 text-left transition-colors border-b border-border/50",
        isSelected
          ? "bg-primary/10"
          : "hover:bg-accent/50",
        conversation.unreadCount > 0 && !isSelected && "bg-primary/5"
      )}
    >
      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
        {conversation.contactName ? (
          <User className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Phone className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm truncate",
              conversation.unreadCount > 0 ? "font-semibold" : "font-medium"
            )}
          >
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">{timeLabel}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={cn(
              "text-xs truncate",
              conversation.unreadCount > 0
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            {conversation.lastMessageDirection === "outbound" && "You: "}
            {conversation.lastMessageText}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <ChannelBadge channel={conversation.channel} />
            {conversation.unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Channel badge ──────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: string }) {
  const labels: Record<string, string> = {
    sms: "SMS",
    whatsapp: "WA",
    telegram: "TG",
    facebook_messenger: "FB",
  };
  return (
    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0">
      {labels[channel] ?? channel}
    </Badge>
  );
}

// ─── Message status icon ────────────────────────────────────────────────────

function StatusIcon({ status }: { status?: string }) {
  switch (status) {
    case "delivered":
      return <CheckCheck className="h-3 w-3 text-primary" />;
    case "sent":
      return <Check className="h-3 w-3 text-muted-foreground" />;
    case "failed":
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    case "pending":
    case "queued":
      return <Clock className="h-3 w-3 text-muted-foreground" />;
    default:
      return null;
  }
}

// ─── Conversation thread panel ──────────────────────────────────────────────

function ConversationThread({
  conversationId,
  clientId,
  onBack,
}: {
  conversationId: Id<"conversations">;
  clientId: Id<"clients">;
  onBack: () => void;
}) {
  const intl = useIntl();
  const conversation = useQuery(api.conversations.getConversation, { conversationId });
  const messages = useQuery(api.conversations.getConversationMessages, {
    conversationId,
    limit: 200,
  });
  const markAsRead = useMutation(api.conversations.markAsRead);
  const archiveConversation = useMutation(api.conversations.archiveConversation);
  const unarchiveConversation = useMutation(api.conversations.unarchiveConversation);
  const sendSms = useMutation(api.messages.sendSms);

  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mark as read when opening
  useEffect(() => {
    if (conversation && conversation.unreadCount > 0) {
      void markAsRead({ conversationId });
    }
  }, [conversationId, conversation, markAsRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !conversation) return;

    setIsSending(true);
    try {
      await sendSms({
        to: conversation.contactPhone,
        message: replyText.trim(),
        clientId,
        channel: conversation.channel,
      });
      setReplyText("");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to send";
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendReply();
    }
  };

  if (!conversation || messages === undefined) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-3/4" />
          ))}
        </div>
      </div>
    );
  }

  const displayName = conversation.contactName || conversation.contactPhone;

  return (
    <>
      {/* Thread header */}
      <div className="flex items-center gap-3 p-3 border-b bg-card">
        <Button variant="ghost" size="sm" className="shrink-0 lg:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
          {conversation.contactName ? (
            <User className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Phone className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {conversation.contactPhone}
            {conversation.contactName ? ` — ${conversation.channel.toUpperCase()}` : ""}
          </p>
        </div>
        <ChannelBadge channel={conversation.channel} />
        {conversation.status === "active" ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await archiveConversation({ conversationId });
              toast.success(intl.formatMessage({ id: "page.inbox.conversationArchived" }));
              onBack();
            }}
          >
            <Archive className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await unarchiveConversation({ conversationId });
              toast.success(intl.formatMessage({ id: "page.inbox.conversationRestored" }));
            }}
          >
            <ArchiveRestore className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            {intl.formatMessage({ id: "page.inbox.noMessagesYet" })}
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              // Show date separator when day changes
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const showDateSep =
                !prevMsg ||
                new Date(msg.timestamp).toDateString() !==
                  new Date(prevMsg.timestamp).toDateString();

              return (
                <div key={msg._id}>
                  {showDateSep && (
                    <div className="flex items-center justify-center my-3">
                      <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {isToday(new Date(msg.timestamp))
                          ? intl.formatMessage({ id: "common.today" })
                          : isYesterday(new Date(msg.timestamp))
                            ? intl.formatMessage({ id: "common.yesterday" })
                            : format(new Date(msg.timestamp), "MMMM d, yyyy")}
                      </span>
                    </div>
                  )}
                  <MessageBubble message={msg} />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Reply input */}
      <div className="p-3 border-t bg-card">
        <div className="flex gap-2 items-end">
          <Textarea
            placeholder={intl.formatMessage({ id: "page.inbox.typeMessage" })}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="min-h-[40px] max-h-32 resize-none"
          />
          <Button
            size="sm"
            disabled={!replyText.trim() || isSending}
            onClick={handleSendReply}
            className="shrink-0 h-10 w-10 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {intl.formatMessage({ id: "page.inbox.pressEnter" })}
        </p>
      </div>
    </>
  );
}

// ─── Chat bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  message,
}: {
  message: {
    _id: string;
    direction: "inbound" | "outbound";
    text: string;
    timestamp: number;
    status?: string;
  };
}) {
  const isOutbound = message.direction === "outbound";

  return (
    <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
          isOutbound
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <div
          className={cn(
            "flex items-center gap-1 mt-1",
            isOutbound ? "justify-end" : "justify-start"
          )}
        >
          <span
            className={cn(
              "text-[10px]",
              isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {format(new Date(message.timestamp), "HH:mm")}
          </span>
          {isOutbound && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}
