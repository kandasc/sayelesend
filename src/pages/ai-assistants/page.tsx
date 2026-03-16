import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, AuthLoading } from "convex/react";
import { useIntl } from "react-intl";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { toast } from "sonner";
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  MessageSquare,
  Send,
  Brain,
  Eye,
  Power,
  PowerOff,
  BarChart3,
  ChevronLeft,
  Globe,
  FileText,
  Plug,
  RefreshCw,
  Zap,
  Activity,
  X,
  Code,
  Copy,
  ShieldAlert,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  UserCheck,
  Mail,
  ArrowRightLeft,
  CheckCircle,
  Clock,
  GraduationCap,
  ListChecks,
  Ban,
  BookA,
  Languages,
  Phone,
  Building2,
  Tag,
} from "lucide-react";

type Personality = "professional" | "friendly" | "casual" | "formal";
type ResponseLength = "short" | "medium" | "detailed";
type SourceType = "manual" | "api" | "document" | "website";
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

// ─── Main Page (Admin + Client) ────────────────────────────────────────────

function AIAssistantsInner() {
  const intl = useIntl();
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const clients = useQuery(api.clients.listClients, currentUser?.role === "admin" && !currentUser?.clientId ? {} : "skip");
  const [selectedClientId, setSelectedClientId] = useState<Id<"clients"> | null>(null);

  // Superadmin uses listAll with optional filter; client admin and client users use listMyAssistants
  const adminAssistants = useQuery(
    api.aiAssistants.listAll,
    currentUser?.role === "admin" && !currentUser?.clientId
      ? { clientId: selectedClientId ?? undefined }
      : "skip"
  );
  const clientAssistants = useQuery(
    api.aiAssistants.listMyAssistants,
    (currentUser?.role === "client" || (currentUser?.role === "admin" && currentUser?.clientId)) ? {} : "skip"
  );

  const isAdmin = currentUser?.role === "admin";
  // Superadmin: admin without clientId; client admin: admin with clientId
  const isSuperAdmin = isAdmin && !currentUser?.clientId;
  const assistants = isSuperAdmin ? adminAssistants : clientAssistants;

  const [selectedAssistant, setSelectedAssistant] = useState<Id<"aiAssistants"> | null>(null);

  // Viewers have no access
  if (currentUser && currentUser.role === "viewer") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><ShieldAlert /></EmptyMedia>
          <EmptyTitle>{intl.formatMessage({ id: "page.ai.accessDenied" })}</EmptyTitle>
          <EmptyDescription>{intl.formatMessage({ id: "page.ai.accessDeniedDesc" })}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // Client without clientId linked
  if (currentUser && currentUser.role === "client" && !currentUser.clientId) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Bot /></EmptyMedia>
          <EmptyTitle>{intl.formatMessage({ id: "page.ai.noAssistants" })}</EmptyTitle>
          <EmptyDescription>{intl.formatMessage({ id: "page.ai.noAssistantsClientDesc" })}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!currentUser || assistants === undefined) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (selectedAssistant) {
    return (
      <AssistantDetail
        assistantId={selectedAssistant}
        onBack={() => setSelectedAssistant(null)}
        isAdmin={isAdmin ?? false}
        isSuperAdmin={isSuperAdmin ?? false}
      />
    );
  }

  // Find client name for display (admin view)
  const selectedClient = clients?.find((c) => c._id === selectedClientId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{intl.formatMessage({ id: "page.ai.title" })}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {isSuperAdmin
              ? intl.formatMessage({ id: "page.ai.subtitleAdmin" })
              : intl.formatMessage({ id: "page.ai.subtitleClient" })}
          </p>
        </div>
        {isSuperAdmin && selectedClientId && (
          <CreateAssistantDialog clientId={selectedClientId} clientName={selectedClient?.companyName ?? "Client"} />
        )}
      </div>

      {/* Client Selector (Superadmin only) */}
      {isSuperAdmin && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-sm space-y-2">
                <Label>{intl.formatMessage({ id: "page.ai.selectClient" })}</Label>
                <Select
                  value={selectedClientId ?? "all"}
                  onValueChange={(val) => {
                    setSelectedClientId(val === "all" ? null : val as Id<"clients">);
                    setSelectedAssistant(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={intl.formatMessage({ id: "page.ai.allClients" })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{intl.formatMessage({ id: "page.ai.allClients" })}</SelectItem>
                    {clients?.map((client) => (
                      <SelectItem key={client._id} value={client._id}>
                        {client.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground pt-6">
                {assistants.length} assistant{assistants.length !== 1 ? "s" : ""} found
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {assistants.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Bot /></EmptyMedia>
            <EmptyTitle>{intl.formatMessage({ id: "page.ai.noAssistantsYet" })}</EmptyTitle>
            <EmptyDescription>
              {isSuperAdmin
                ? selectedClientId
                  ? intl.formatMessage({ id: "page.ai.noAssistantsCreateDesc" })
                  : intl.formatMessage({ id: "page.ai.noAssistantsSelectDesc" })
                : intl.formatMessage({ id: "page.ai.noAssistantsContactAdmin" })}
            </EmptyDescription>
          </EmptyHeader>
          {isSuperAdmin && selectedClientId && (
            <EmptyContent>
              <CreateAssistantDialog clientId={selectedClientId} clientName={selectedClient?.companyName ?? "Client"} />
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assistants.map((assistant) => (
            <AssistantCard
              key={assistant._id}
              assistant={assistant}
              clients={clients}
              showClientName={isSuperAdmin ?? false}
              onClick={() => setSelectedAssistant(assistant._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Assistant Card ────────────────────────────────────────────────────────

function AssistantCard({
  assistant,
  clients,
  showClientName,
  onClick,
}: {
  assistant: Doc<"aiAssistants">;
  clients: Doc<"clients">[] | undefined;
  showClientName: boolean;
  onClick: () => void;
}) {
  const intl = useIntl();
  const clientName = clients?.find((c) => c._id === assistant.clientId)?.companyName ?? "Unknown";

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${assistant.primaryColor ?? "#3B82F6"}20` }}
            >
              <Bot className="h-5 w-5" style={{ color: assistant.primaryColor ?? "#3B82F6" }} />
            </div>
            <div>
              <CardTitle className="text-base">{assistant.name}</CardTitle>
              {showClientName && <CardDescription className="text-xs">{clientName}</CardDescription>}
            </div>
          </div>
          <Badge variant={assistant.isActive ? "default" : "secondary"}>
            {assistant.isActive ? intl.formatMessage({ id: "common.active" }) : intl.formatMessage({ id: "common.inactive" })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {assistant.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{assistant.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {assistant.totalConversations} chats
          </span>
          <span className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            {assistant.totalMessages} msgs
          </span>
          <Badge variant="outline" className="text-xs capitalize">{assistant.personality}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Create Dialog ──────────────────────────────────────────────────────────

function CreateAssistantDialog({ clientId, clientName }: { clientId: Id<"clients">; clientName: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [companyName, setCompanyName] = useState(clientName);
  const [companyDescription, setCompanyDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [personality, setPersonality] = useState<Personality>("professional");
  const [primaryColor, setPrimaryColor] = useState("#3B82F6");
  const [customInstructions, setCustomInstructions] = useState("");
  const intl = useIntl();
  const createAssistant = useMutation(api.aiAssistants.create);

  const handleCreate = async () => {
    if (!name.trim() || !companyName.trim()) {
      toast.error(intl.formatMessage({ id: "page.ai.create.nameRequired" }));
      return;
    }
    try {
      await createAssistant({
        clientId,
        name: name.trim(),
        description: description.trim() || undefined,
        companyName: companyName.trim(),
        companyDescription: companyDescription.trim() || undefined,
        industry: industry.trim() || undefined,
        welcomeMessage: welcomeMessage.trim() || undefined,
        personality,
        primaryColor,
        customInstructions: customInstructions.trim() || undefined,
      });
      toast.success(intl.formatMessage({ id: "page.ai.create.success" }));
      setOpen(false);
      setName(""); setDescription(""); setCompanyDescription("");
      setIndustry(""); setWelcomeMessage(""); setCustomInstructions("");
    } catch {
      toast.error(intl.formatMessage({ id: "page.ai.create.failed" }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setCompanyName(clientName); }}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />{intl.formatMessage({ id: "page.ai.create.button" })}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{intl.formatMessage({ id: "page.ai.create.title" })}</DialogTitle>
          <DialogDescription>
            Set up a new AI chatbot for <strong>{clientName}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: "page.ai.create.assistantName" })}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Support Bot" />
            </div>
            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: "page.ai.create.companyName" })}</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{intl.formatMessage({ id: "page.ai.create.shortDescription" })}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this assistant does" />
          </div>
          <div className="space-y-2">
            <Label>{intl.formatMessage({ id: "page.ai.create.companyDescription" })}</Label>
            <Textarea value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} placeholder="Products, services, and more..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: "page.ai.create.industry" })}</Label>
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Technology" />
            </div>
            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: "page.ai.create.personality" })}</Label>
              <Select value={personality} onValueChange={(v) => setPersonality(v as Personality)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">{intl.formatMessage({ id: "page.ai.personality.professional" })}</SelectItem>
                  <SelectItem value="friendly">{intl.formatMessage({ id: "page.ai.personality.friendly" })}</SelectItem>
                  <SelectItem value="casual">{intl.formatMessage({ id: "page.ai.personality.casual" })}</SelectItem>
                  <SelectItem value="formal">{intl.formatMessage({ id: "page.ai.personality.formal" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{intl.formatMessage({ id: "page.ai.create.welcomeMessage" })}</Label>
            <Textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} placeholder="First message visitors see" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>{intl.formatMessage({ id: "page.ai.create.brandColor" })}</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-12 cursor-pointer rounded border" />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{intl.formatMessage({ id: "page.ai.create.customInstructions" })}</Label>
            <Textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} placeholder="Additional rules or behaviors" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{intl.formatMessage({ id: "buttons.cancel" })}</Button>
          <Button onClick={handleCreate}>{intl.formatMessage({ id: "page.ai.create.button" })}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assistant Detail ───────────────────────────────────────────────────────

function AssistantDetail({
  assistantId,
  onBack,
  isAdmin,
  isSuperAdmin,
}: {
  assistantId: Id<"aiAssistants">;
  onBack: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}) {
  const assistant = useQuery(api.aiAssistants.getById, { assistantId });
  const knowledgeBase = useQuery(api.aiAssistants.getKnowledgeBase, { assistantId });
  const tasks = useQuery(api.aiAssistants.getTasks, { assistantId });
  const sessions = useQuery(api.aiAssistants.getChatSessions, { assistantId });
  const executionLogs = useQuery(api.aiAssistants.getTaskExecutionLogs, { assistantId });
  const handoverRequests = useQuery(api.aiAssistants.getHandoverRequests, { assistantId });
  const updateAssistant = useMutation(api.aiAssistants.update);
  const deleteAssistant = useMutation(api.aiAssistants.remove);
  const clients = useQuery(api.clients.listClients, isSuperAdmin ? {} : "skip");
  const intl = useIntl();

  if (assistant === undefined) return <Skeleton className="h-96 w-full" />;
  if (!assistant) {
    return (
      <div className="text-center py-8">
        <p>{intl.formatMessage({ id: "page.ai.detail.notFound" })}</p>
        <Button variant="ghost" onClick={onBack} className="mt-2">{intl.formatMessage({ id: "page.ai.detail.goBack" })}</Button>
      </div>
    );
  }

  const clientName = clients?.find((c) => c._id === assistant.clientId)?.companyName ?? assistant.companyName;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.detail.back" })}
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${assistant.primaryColor ?? "#3B82F6"}20` }}>
              <Bot className="h-5 w-5" style={{ color: assistant.primaryColor ?? "#3B82F6" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{assistant.name}</h1>
              {isSuperAdmin && <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: "page.ai.detail.client" })}: {clientName}</p>}
            </div>
            <Badge variant={assistant.isActive ? "default" : "secondary"}>{assistant.isActive ? intl.formatMessage({ id: "common.active" }) : intl.formatMessage({ id: "common.inactive" })}</Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={async () => {
          await updateAssistant({ assistantId, isActive: !assistant.isActive });
          toast.success(assistant.isActive ? intl.formatMessage({ id: "page.ai.detail.deactivated" }) : intl.formatMessage({ id: "page.ai.detail.activated" }));
        }}>
          {assistant.isActive ? <><PowerOff className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.detail.deactivate" })}</> : <><Power className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.detail.activate" })}</>}
        </Button>
        {isSuperAdmin && (
          <Button variant="destructive" size="sm" onClick={async () => {
            if (!confirm(intl.formatMessage({ id: "page.ai.detail.deleteConfirm" }))) return;
            await deleteAssistant({ assistantId });
            toast.success(intl.formatMessage({ id: "page.ai.detail.deleted" }));
            onBack();
          }}>
            <Trash2 className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.detail.delete" })}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: intl.formatMessage({ id: "page.ai.detail.conversations" }), value: assistant.totalConversations },
          { label: intl.formatMessage({ id: "page.ai.detail.messages" }), value: assistant.totalMessages },
          { label: intl.formatMessage({ id: "page.ai.detail.knowledgeEntries" }), value: knowledgeBase?.length ?? 0 },
          { label: intl.formatMessage({ id: "page.ai.detail.tasks" }), value: tasks?.length ?? 0 },
          { label: "Personality", value: assistant.personality, capitalize: true },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className={`text-2xl font-bold ${stat.capitalize ? "capitalize" : ""}`}>{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="knowledge">
        <TabsList className="flex-wrap">
          <TabsTrigger value="knowledge"><Brain className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.tabs.knowledge" })}</TabsTrigger>
          <TabsTrigger value="training"><GraduationCap className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.tabs.training" })}</TabsTrigger>
          <TabsTrigger value="tasks"><Zap className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.tabs.tasks" })}</TabsTrigger>
          <TabsTrigger value="test"><MessageSquare className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.tabs.testChat" })}</TabsTrigger>
          <TabsTrigger value="conversations"><Eye className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.tabs.conversations" })}</TabsTrigger>
          <TabsTrigger value="logs"><Activity className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.tabs.executionLogs" })}</TabsTrigger>
          <TabsTrigger value="handovers"><ArrowRightLeft className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.tabs.handovers" })}{handoverRequests && handoverRequests.filter(h => h.status !== "resolved").length > 0 ? ` (${handoverRequests.filter(h => h.status !== "resolved").length})` : ""}</TabsTrigger>
          <TabsTrigger value="api"><Code className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.tabs.api" })}</TabsTrigger>
          <TabsTrigger value="settings"><Pencil className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.tabs.settings" })}</TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge" className="mt-4">
          <KnowledgeBaseTab assistantId={assistantId} clientId={assistant.clientId} entries={knowledgeBase ?? []} />
        </TabsContent>
        <TabsContent value="training" className="mt-4">
          <TrainingTab assistant={assistant} />
        </TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <TasksTab assistantId={assistantId} clientId={assistant.clientId} tasks={tasks ?? []} />
        </TabsContent>
        <TabsContent value="test" className="mt-4">
          <TestChatTab assistantId={assistantId} />
        </TabsContent>
        <TabsContent value="conversations" className="mt-4">
          <ConversationsTab sessions={sessions ?? []} />
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          <ExecutionLogsTab logs={executionLogs ?? []} tasks={tasks ?? []} />
        </TabsContent>
        <TabsContent value="handovers" className="mt-4">
          <HandoversTab requests={handoverRequests ?? []} sessions={sessions ?? []} />
        </TabsContent>
        <TabsContent value="api" className="mt-4">
          <ApiIntegrationTab assistantId={assistantId} assistant={assistant} />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <SettingsTab assistant={assistant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── API / Integration Tab ─────────────────────────────────────────────────

function ApiIntegrationTab({
  assistantId,
  assistant,
}: {
  assistantId: Id<"aiAssistants">;
  assistant: Doc<"aiAssistants">;
}) {
  const API_BASE = "https://api.sayele.co";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const curlExample = `curl -X POST ${API_BASE}/api/v1/ai/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "assistantId": "${assistantId}",
    "message": "Hello, what services do you offer?",
    "sessionId": "unique-session-123",
    "channel": "api",
    "visitorName": "John Doe",
    "visitorEmail": "john@example.com"
  }'`;

  const jsExample = `// JavaScript / Fetch API
const response = await fetch("${API_BASE}/api/v1/ai/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    assistantId: "${assistantId}",
    message: userMessage,
    sessionId: sessionId, // Reuse for conversation continuity
    channel: "web",
    visitorName: "Visitor Name",
    visitorEmail: "visitor@example.com"
  })
});

const data = await response.json();
console.log(data.response); // AI assistant response
console.log(data.sessionId); // Session ID for follow-up messages`;

  const phpExample = `<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${API_BASE}/api/v1/ai/chat");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    "assistantId" => "${assistantId}",
    "message" => "Hello, I need help",
    "sessionId" => "unique-session-123",
    "channel" => "api"
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
echo $data["response"];
?>`;

  const pythonExample = `import requests

response = requests.post(
    "${API_BASE}/api/v1/ai/chat",
    json={
        "assistantId": "${assistantId}",
        "message": "What are your business hours?",
        "sessionId": "unique-session-123",
        "channel": "api",
        "visitorName": "Jane Doe"
    }
)

data = response.json()
print(data["response"])`;

  const widgetExample = `<!-- SAYELE Chat Widget — Full-Featured -->
<script>
(function() {
  var ASSISTANT_ID = "${assistantId}";
  var API_URL = "${API_BASE}/api/v1/ai/chat";
  var HANDOVER_URL = "${API_BASE}/api/v1/ai/handover";
  var COLOR = "${assistant.primaryColor ?? "#3B82F6"}";
  var NAME = "${assistant.name}";
  var WELCOME = "${(assistant.welcomeMessage ?? `Hi! I'm ${assistant.name}. How can I help you today?`).replace(/"/g, '\\"').replace(/\n/g, '\\n')}";
  var sessionId = "widget_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  var isHandedOver = false;
  var welcomeShown = false;
  var hasMessages = false;
  var autoSpeak = false; // TTS auto-play disabled by default

  // SVG icons
  var micSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>';
  var sendSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';
  var speakerSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
  var speakerOffSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>';
  var userSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  var closeSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  var chatSvg = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
  var bigMicSvg = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="' + COLOR + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>';

  // Color helpers
  function hexToRgb(hex) { var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16); return r+","+g+","+b; }
  var colorRgb = hexToRgb(COLOR);

  // ── Open / Close ──
  function openChat() {
    document.getElementById("sc-popup").style.display = "flex";
    document.getElementById("sc-toggle").style.display = "none";
    if (!welcomeShown) {
      welcomeShown = true;
      document.getElementById("sc-empty").style.display = "none";
      addMessage(WELCOME, "bot");
    }
  }
  function closeChat() {
    document.getElementById("sc-popup").style.display = "none";
    document.getElementById("sc-toggle").style.display = "flex";
  }

  // ── Build Widget UI ──
  var widget = document.createElement("div");
  widget.id = "sayele-chat-widget";
  widget.innerHTML =
    '<div style="position:fixed;bottom:20px;right:20px;z-index:9999;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">' +

    '<div id="sc-popup" style="display:none;width:380px;height:560px;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,0.15);background:#fff;flex-direction:column;overflow:hidden;border:1px solid #e5e7eb;">' +

      '<div style="background:' + COLOR + ';color:white;padding:18px 20px;display:flex;justify-content:space-between;align-items:center;">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>' +
          '</div>' +
          '<div>' +
            '<div style="font-weight:600;font-size:15px;">' + NAME + '</div>' +
            '<div style="font-size:11px;opacity:0.85;">Online</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:4px;">' +
          '<button id="sc-auto-speak" title="Auto-speak OFF (click to enable)" style="background:rgba(255,255,255,0.15);border:none;color:white;cursor:pointer;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:background 0.2s;">' + speakerOffSvg + '</button>' +
          '<button id="sc-close" style="background:rgba(255,255,255,0.15);border:none;color:white;cursor:pointer;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:background 0.2s;">' + closeSvg + '</button>' +
        '</div>' +
      '</div>' +

      '<div id="sc-messages" style="flex:1;overflow-y:auto;padding:16px;font-size:14px;background:#fafafa;">' +
        '<div id="sc-empty" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;opacity:0.7;">' +
          bigMicSvg +
          '<div style="font-size:13px;color:#888;text-align:center;">Send a message or tap the mic to speak</div>' +
        '</div>' +
      '</div>' +

      '<div style="padding:12px 14px;border-top:1px solid #eee;display:flex;gap:8px;align-items:center;background:#fff;">' +
        '<button id="sc-mic" title="Voice input" style="background:rgba(' + colorRgb + ',0.08);border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:' + COLOR + ';transition:all 0.2s;">' + micSvg + '</button>' +
        '<input id="sc-input" type="text" placeholder="Type or speak a message..." style="flex:1;padding:10px 16px;border:1px solid #e5e7eb;border-radius:24px;outline:none;font-size:14px;background:#f9fafb;transition:border-color 0.2s;font-family:inherit;" />' +
        '<button id="sc-send" title="Send" style="background:' + COLOR + ';color:white;border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity 0.2s;box-shadow:0 2px 8px rgba(' + colorRgb + ',0.3);">' + sendSvg + '</button>' +
        '<button id="sc-handover" title="Talk to a human" style="background:rgba(' + colorRgb + ',0.08);border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;display:none;align-items:center;justify-content:center;flex-shrink:0;color:' + COLOR + ';transition:all 0.2s;">' + userSvg + '</button>' +
      '</div>' +

    '</div>' +

    '<button id="sc-toggle" style="width:60px;height:60px;border-radius:50%;background:' + COLOR + ';color:white;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(' + colorRgb + ',0.4);display:flex;align-items:center;justify-content:center;transition:transform 0.2s,box-shadow 0.2s;">' + chatSvg + '</button>' +

    '</div>';
  document.body.appendChild(widget);

  // Hover effects
  var toggle = document.getElementById("sc-toggle");
  toggle.onmouseenter = function() { toggle.style.transform = "scale(1.08)"; toggle.style.boxShadow = "0 6px 24px rgba(" + colorRgb + ",0.5)"; };
  toggle.onmouseleave = function() { toggle.style.transform = "scale(1)"; toggle.style.boxShadow = "0 4px 20px rgba(" + colorRgb + ",0.4)"; };
  var scClose = document.getElementById("sc-close");
  scClose.onmouseenter = function() { scClose.style.background = "rgba(255,255,255,0.25)"; };
  scClose.onmouseleave = function() { scClose.style.background = "rgba(255,255,255,0.15)"; };
  var scInput = document.getElementById("sc-input");
  scInput.onfocus = function() { scInput.style.borderColor = COLOR; scInput.style.background = "#fff"; };
  scInput.onblur = function() { scInput.style.borderColor = "#e5e7eb"; scInput.style.background = "#f9fafb"; };

  // ── Listeners ──
  toggle.addEventListener("click", openChat);
  scClose.addEventListener("click", closeChat);

  // ── Auto-speak toggle ──
  var scAutoSpeak = document.getElementById("sc-auto-speak");
  scAutoSpeak.addEventListener("click", function() {
    autoSpeak = !autoSpeak;
    scAutoSpeak.innerHTML = autoSpeak ? speakerSvg : speakerOffSvg;
    scAutoSpeak.style.background = autoSpeak ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)";
    scAutoSpeak.title = autoSpeak ? "Auto-speak ON (click to disable)" : "Auto-speak OFF (click to enable)";
  });
  scAutoSpeak.onmouseenter = function() { scAutoSpeak.style.background = autoSpeak ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.25)"; };
  scAutoSpeak.onmouseleave = function() { scAutoSpeak.style.background = autoSpeak ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)"; };

  var SpeechRecog = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = SpeechRecog ? new SpeechRecog() : null;
  if (recognition) { recognition.continuous = false; recognition.interimResults = false; }

  document.getElementById("sc-send").addEventListener("click", sendMessage);
  scInput.addEventListener("keydown", function(e) { if (e.key === "Enter") sendMessage(); });

  async function sendMessage(textOverride) {
    if (isHandedOver) return;
    var input = document.getElementById("sc-input");
    var msg = (typeof textOverride === "string") ? textOverride : input.value.trim();
    if (!msg) return;
    input.value = "";
    var empty = document.getElementById("sc-empty");
    if (empty) empty.style.display = "none";
    addMessage(msg, "user");
    showTyping();

    try {
      var res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistantId: ASSISTANT_ID, message: msg, sessionId: sessionId, channel: "web" })
      });
      var data = await res.json();
      hideTyping();
      var reply = data.response || "Sorry, something went wrong.";
      addMessage(reply, "bot");
      if (autoSpeak && window.speechSynthesis) { var u = new SpeechSynthesisUtterance(reply); u.rate = 1; u.pitch = 1; window.speechSynthesis.speak(u); }
      sessionId = data.sessionId || sessionId;
      hasMessages = true;
      document.getElementById("sc-handover").style.display = "flex";
    } catch (err) {
      hideTyping();
      addMessage("Connection error. Please try again.", "bot");
    }
  }

  // ── Voice Input ──
  document.getElementById("sc-mic").addEventListener("click", function() {
    if (!recognition) { alert("Voice input is not supported in this browser."); return; }
    if (isHandedOver) return;
    var btn = document.getElementById("sc-mic");
    if (btn.dataset.recording === "true") {
      recognition.stop(); btn.dataset.recording = "false";
      btn.style.background = "rgba(" + colorRgb + ",0.08)"; btn.style.color = COLOR;
      return;
    }
    btn.dataset.recording = "true";
    btn.style.background = "#ef4444"; btn.style.color = "white";
    recognition.start();
    recognition.onresult = function(e) { var text = e.results[0][0].transcript; if (text.trim()) sendMessage(text.trim()); };
    recognition.onend = function() { btn.dataset.recording = "false"; btn.style.background = "rgba(" + colorRgb + ",0.08)"; btn.style.color = COLOR; };
    recognition.onerror = function() { btn.dataset.recording = "false"; btn.style.background = "rgba(" + colorRgb + ",0.08)"; btn.style.color = COLOR; };
  });

  // ── Voice Output ──
  function speakText(text, btn) {
    if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); return; }
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 1; u.pitch = 1;
    u.onend = function() { btn.style.opacity = "0.5"; };
    btn.style.opacity = "1";
    window.speechSynthesis.speak(u);
  }

  // ── Handover ──
  document.getElementById("sc-handover").addEventListener("click", async function() {
    if (!hasMessages || isHandedOver) return;
    var btn = document.getElementById("sc-handover");
    btn.disabled = true; btn.style.opacity = "0.5";
    try {
      var res = await fetch(HANDOVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistantId: ASSISTANT_ID, sessionId: sessionId, reason: "Customer requested human agent via widget" })
      });
      var data = await res.json();
      if (data.success) {
        isHandedOver = true;
        addMessage("Your conversation has been forwarded to a human agent. They will get back to you soon.", "system");
        document.getElementById("sc-input").disabled = true;
        document.getElementById("sc-input").placeholder = "Handed over to agent";
      } else {
        addMessage(data.error || "Could not connect to an agent right now.", "system");
        btn.disabled = false; btn.style.opacity = "1";
      }
    } catch (err) {
      addMessage("Connection error. Please try again.", "system");
      btn.disabled = false; btn.style.opacity = "1";
    }
  });

  // ── UI Helpers ──
  function addMessage(text, sender) {
    var c = document.getElementById("sc-messages");
    var div = document.createElement("div");
    div.style.cssText = "margin-bottom:14px;display:flex;" +
      (sender === "user" ? "justify-content:flex-end;" :
       sender === "system" ? "justify-content:center;" : "justify-content:flex-start;");

    if (sender === "system") {
      div.innerHTML = '<div style="background:#fef3c7;color:#92400e;padding:8px 14px;border-radius:12px;font-size:12px;text-align:center;max-width:90%;font-style:italic;">' + text.replace(/</g,"&lt;") + '</div>';
    } else if (sender === "bot") {
      div.innerHTML = '<div style="display:flex;align-items:flex-end;gap:6px;max-width:80%;">' +
        '<div style="padding:10px 14px;border-radius:16px 16px 16px 4px;background:#fff;color:#333;line-height:1.5;font-size:13.5px;box-shadow:0 1px 3px rgba(0,0,0,0.08);border:1px solid #eee;">' + text.replace(/</g,"&lt;") + '</div>' +
        '<button onclick="(function(b){window.__sayeleSpeak(b.parentElement.querySelector(\\'div\\').innerText,b);})(this)" style="background:none;border:none;cursor:pointer;opacity:0.5;flex-shrink:0;color:#888;padding:2px;transition:opacity 0.2s;" title="Listen">' + speakerSvg + '</button></div>';
    } else {
      div.innerHTML = '<div style="max-width:80%;padding:10px 14px;border-radius:16px 16px 4px 16px;background:' + COLOR + ';color:white;line-height:1.5;font-size:13.5px;box-shadow:0 2px 6px rgba(' + colorRgb + ',0.25);">' + text.replace(/</g,"&lt;") + '</div>';
    }
    c.appendChild(div); c.scrollTop = c.scrollHeight;
  }

  function showTyping() {
    var c = document.getElementById("sc-messages");
    var div = document.createElement("div");
    div.id = "sc-typing";
    div.style.cssText = "margin-bottom:14px;display:flex;justify-content:flex-start;";
    div.innerHTML = '<div style="padding:12px 18px;border-radius:16px 16px 16px 4px;background:#fff;color:#aaa;font-size:13px;box-shadow:0 1px 3px rgba(0,0,0,0.08);border:1px solid #eee;display:flex;align-items:center;gap:4px;"><span style="animation:sc-dot 1.4s infinite;width:6px;height:6px;border-radius:50%;background:#ccc;display:inline-block;"></span><span style="animation:sc-dot 1.4s infinite 0.2s;width:6px;height:6px;border-radius:50%;background:#ccc;display:inline-block;"></span><span style="animation:sc-dot 1.4s infinite 0.4s;width:6px;height:6px;border-radius:50%;background:#ccc;display:inline-block;"></span></div>';
    c.appendChild(div); c.scrollTop = c.scrollHeight;
  }
  function hideTyping() { var t = document.getElementById("sc-typing"); if (t) t.remove(); }

  // Typing animation
  var style = document.createElement("style");
  style.textContent = "@keyframes sc-dot{0%,80%,100%{opacity:0.3;transform:scale(0.8);}40%{opacity:1;transform:scale(1.1);}}";
  document.head.appendChild(style);

  window.__sayeleSpeak = speakText;
})();
</script>`;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">API & Integration</h3>
        <p className="text-sm text-muted-foreground">
          Use the API to integrate this AI assistant into your website, app, or any platform.
        </p>
      </div>

      {/* Assistant ID */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assistant ID</CardTitle>
          <CardDescription>Use this ID in all API requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted px-4 py-2 rounded text-sm font-mono break-all">
              {assistantId}
            </code>
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(assistantId)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="font-mono text-xs">POST</Badge>
              <code className="text-sm font-mono">{API_BASE}/api/v1/ai/chat</code>
            </div>
            <p className="text-sm text-muted-foreground">Send a message and get an AI response. No authentication required.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs">GET</Badge>
              <code className="text-sm font-mono">{API_BASE}/api/v1/ai/assistants/{assistantId}</code>
            </div>
            <p className="text-sm text-muted-foreground">Get assistant public info (name, welcome message, color).</p>
          </div>

          {/* Request/Response docs */}
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Chat Request Body</h4>
            <div className="text-xs space-y-1">
              <div className="grid grid-cols-3 gap-2 font-mono">
                <span className="font-semibold">Field</span>
                <span className="font-semibold">Type</span>
                <span className="font-semibold">Description</span>
              </div>
              {[
                ["assistantId", "string *", "The assistant ID"],
                ["message", "string *", "User's message"],
                ["sessionId", "string", "Session ID for conversation continuity"],
                ["channel", "string", "web, sms, whatsapp, or api (default: api)"],
                ["visitorName", "string", "Visitor's name"],
                ["visitorEmail", "string", "Visitor's email"],
                ["visitorPhone", "string", "Visitor's phone"],
              ].map(([field, type, desc]) => (
                <div key={field} className="grid grid-cols-3 gap-2 text-muted-foreground">
                  <code>{field}</code>
                  <span>{type}</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Chat Response</h4>
            <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto">{`{
  "success": true,
  "response": "Hello! How can I help you today?",
  "sessionId": "api_1707000000_abc123"
}`}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Code Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="widget">Chat Widget</TabsTrigger>
            </TabsList>

            {[
              { value: "curl", code: curlExample },
              { value: "javascript", code: jsExample },
              { value: "php", code: phpExample },
              { value: "python", code: pythonExample },
              { value: "widget", code: widgetExample },
            ].map(({ value, code }) => (
              <TabsContent key={value} value={value} className="mt-3">
                <div className="relative">
                  <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap break-words">
                    {code}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(code)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Knowledge Base Tab ─────────────────────────────────────────────────────

function KnowledgeBaseTab({
  assistantId, clientId, entries,
}: {
  assistantId: Id<"aiAssistants">;
  clientId: Id<"clients">;
  entries: Doc<"aiKnowledgeBase">[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("manual");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceHeaders, setSourceHeaders] = useState("");
  const [editingEntry, setEditingEntry] = useState<Doc<"aiKnowledgeBase"> | null>(null);
  const addKnowledge = useMutation(api.aiAssistants.addKnowledge);
  const removeKnowledge = useMutation(api.aiAssistants.removeKnowledge);
  const updateKnowledge = useMutation(api.aiAssistants.updateKnowledge);
  const fetchSource = useAction(api.aiAssistantsActions.fetchSourceContent);
  const [syncing, setSyncing] = useState<string | null>(null);
  const intl = useIntl();

  const handleAdd = async () => {
    if (!title.trim()) { toast.error(intl.formatMessage({ id: "page.ai.knowledge.titleRequired" })); return; }
    if (sourceType === "manual" && !content.trim()) { toast.error(intl.formatMessage({ id: "page.ai.knowledge.contentRequiredMsg" })); return; }
    if ((sourceType === "api" || sourceType === "website") && !sourceUrl.trim()) {
      toast.error(intl.formatMessage({ id: "page.ai.knowledge.sourceUrlRequired" }));
      return;
    }
    try {
      await addKnowledge({
        assistantId,
        clientId,
        title: title.trim(),
        content: content.trim() || `Pending sync from ${sourceType} source`,
        category: category.trim() || undefined,
        sourceType,
        sourceUrl: sourceUrl.trim() || undefined,
        sourceHeaders: sourceHeaders.trim() || undefined,
      });
      toast.success(intl.formatMessage({ id: "page.ai.knowledge.added" }));
      setTitle(""); setContent(""); setCategory(""); setSourceUrl(""); setSourceHeaders("");
      setSourceType("manual"); setShowAdd(false);
    } catch {
      toast.error(intl.formatMessage({ id: "page.ai.knowledge.addFailed" }));
    }
  };

  const handleSync = async (entry: Doc<"aiKnowledgeBase">) => {
    if (!entry.sourceUrl) return;
    setSyncing(entry._id);
    try {
      const result = await fetchSource({
        url: entry.sourceUrl,
        headers: entry.sourceHeaders,
        entryId: entry._id,
      });
      if (result.success) {
        toast.success(intl.formatMessage({ id: "page.ai.knowledge.synced" }));
      } else {
        toast.error(result.error ?? intl.formatMessage({ id: "page.ai.knowledge.syncFailed" }));
      }
    } catch {
      toast.error(intl.formatMessage({ id: "page.ai.knowledge.syncFailed" }));
    } finally {
      setSyncing(null);
    }
  };

  const sourceIcon = (type: string) => {
    switch (type) {
      case "api": return <Plug className="h-3 w-3" />;
      case "website": return <Globe className="h-3 w-3" />;
      case "document": return <FileText className="h-3 w-3" />;
      default: return <BookOpen className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{intl.formatMessage({ id: "page.ai.knowledge.title" })}</h3>
          <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: "page.ai.knowledge.subtitle" })}</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}><Plus className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.knowledge.addEntry" })}</Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: "page.ai.knowledge.sourceType" })}</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{intl.formatMessage({ id: "page.ai.knowledge.manual" })}</SelectItem>
                  <SelectItem value="api">{intl.formatMessage({ id: "page.ai.knowledge.apiEndpoint" })}</SelectItem>
                  <SelectItem value="website">{intl.formatMessage({ id: "page.ai.knowledge.websiteUrl" })}</SelectItem>
                  <SelectItem value="document">{intl.formatMessage({ id: "page.ai.knowledge.documentPaste" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{intl.formatMessage({ id: "page.ai.knowledge.titleField" })}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Business Hours, Return Policy" />
              </div>
              <div className="space-y-2">
                <Label>{intl.formatMessage({ id: "page.ai.knowledge.category" })}</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. General, Products" />
              </div>
            </div>

            {(sourceType === "api" || sourceType === "website") && (
              <>
                <div className="space-y-2">
                  <Label>{intl.formatMessage({ id: "page.ai.knowledge.sourceUrl" })}</Label>
                  <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder={sourceType === "api" ? "https://api.example.com/data" : "https://example.com/about"} />
                </div>
                {sourceType === "api" && (
                  <div className="space-y-2">
                    <Label>{intl.formatMessage({ id: "page.ai.knowledge.headers" })}</Label>
                    <Textarea value={sourceHeaders} onChange={(e) => setSourceHeaders(e.target.value)}
                      placeholder={'{"Authorization": "Bearer YOUR_TOKEN"}'} rows={2} />
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label>{sourceType === "manual" || sourceType === "document" ? intl.formatMessage({ id: "page.ai.knowledge.contentRequired" }) : intl.formatMessage({ id: "page.ai.knowledge.initialContent" })}</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)}
                placeholder={sourceType === "document" ? "Paste your document content here..." : "Information the assistant should know..."}
                rows={5} />
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>{intl.formatMessage({ id: "page.ai.knowledge.saveEntry" })}</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><BookOpen /></EmptyMedia>
            <EmptyTitle>{intl.formatMessage({ id: "page.ai.knowledge.noEntries" })}</EmptyTitle>
            <EmptyDescription>{intl.formatMessage({ id: "page.ai.knowledge.noEntriesDesc" })}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry._id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-medium">{entry.title}</h4>
                      {entry.category && <Badge variant="outline" className="text-xs">{entry.category}</Badge>}
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        {sourceIcon(entry.sourceType)}{entry.sourceType}
                      </Badge>
                      <Badge variant={entry.isActive ? "default" : "secondary"} className="text-xs">
                        {entry.isActive ? intl.formatMessage({ id: "common.active" }) : intl.formatMessage({ id: "common.inactive" })}
                      </Badge>
                    </div>
                    {entry.sourceUrl && (
                      <p className="text-xs text-muted-foreground mb-1 truncate">
                        {intl.formatMessage({ id: "page.ai.knowledge.source" })}: {entry.sourceUrl}
                      </p>
                    )}
                    {entry.lastSyncedAt && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {intl.formatMessage({ id: "page.ai.knowledge.lastSynced" })}: {new Date(entry.lastSyncedAt).toLocaleString()}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-2">{entry.content}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button variant="ghost" size="sm" onClick={() => setEditingEntry(entry)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {entry.sourceUrl && (
                      <Button variant="ghost" size="sm" onClick={() => handleSync(entry)}
                        disabled={syncing === entry._id}>
                        {syncing === entry._id ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() =>
                      updateKnowledge({ entryId: entry._id, isActive: !entry.isActive })
                    }>
                      {entry.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      if (confirm(intl.formatMessage({ id: "page.ai.knowledge.deleteConfirm" }))) {
                        await removeKnowledge({ entryId: entry._id });
                        toast.success(intl.formatMessage({ id: "page.ai.detail.deleted" }));
                      }
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Knowledge Dialog */}
      <Dialog open={editingEntry !== null} onOpenChange={(open) => { if (!open) setEditingEntry(null); }}>
        {editingEntry && (
          <EditKnowledgeDialog
            key={editingEntry._id}
            entry={editingEntry}
            onClose={() => setEditingEntry(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

// ─── Edit Knowledge Dialog ─────────────────────────────────────────────────

function EditKnowledgeDialog({
  entry, onClose,
}: {
  entry: Doc<"aiKnowledgeBase">;
  onClose: () => void;
}) {
  const intl = useIntl();
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [category, setCategory] = useState(entry.category ?? "");
  const [sourceUrl, setSourceUrl] = useState(entry.sourceUrl ?? "");
  const [sourceHeaders, setSourceHeaders] = useState(entry.sourceHeaders ?? "");
  const [saving, setSaving] = useState(false);
  const updateKnowledge = useMutation(api.aiAssistants.updateKnowledge);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(intl.formatMessage({ id: "page.ai.knowledge.titleRequired" }));
      return;
    }
    if (!content.trim()) {
      toast.error(intl.formatMessage({ id: "page.ai.knowledge.contentRequiredMsg" }));
      return;
    }
    setSaving(true);
    try {
      await updateKnowledge({
        entryId: entry._id,
        title: title.trim(),
        content: content.trim(),
        category: category.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        sourceHeaders: sourceHeaders.trim() || undefined,
      });
      toast.success(intl.formatMessage({ id: "page.ai.knowledge.updated" }));
      onClose();
    } catch {
      toast.error(intl.formatMessage({ id: "page.ai.knowledge.updateFailed" }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{intl.formatMessage({ id: "page.ai.knowledge.editEntry" })}</DialogTitle>
        <DialogDescription>{intl.formatMessage({ id: "page.ai.knowledge.editEntryDesc" })}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{intl.formatMessage({ id: "page.ai.knowledge.titleField" })}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Business Hours, Return Policy" />
          </div>
          <div className="space-y-2">
            <Label>{intl.formatMessage({ id: "page.ai.knowledge.category" })}</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. General, Products" />
          </div>
        </div>

        {(entry.sourceType === "api" || entry.sourceType === "website") && (
          <>
            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: "page.ai.knowledge.sourceUrl" })}</Label>
              <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                placeholder={entry.sourceType === "api" ? "https://api.example.com/data" : "https://example.com/about"} />
            </div>
            {entry.sourceType === "api" && (
              <div className="space-y-2">
                <Label>{intl.formatMessage({ id: "page.ai.knowledge.headers" })}</Label>
                <Textarea value={sourceHeaders} onChange={(e) => setSourceHeaders(e.target.value)}
                  placeholder={'{"Authorization": "Bearer YOUR_TOKEN"}'} rows={2} />
              </div>
            )}
          </>
        )}

        <div className="space-y-2">
          <Label>{intl.formatMessage({ id: "page.ai.knowledge.contentRequired" })}</Label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Information the assistant should know..."
            rows={8} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner className="h-4 w-4 mr-1" /> : null}
          {intl.formatMessage({ id: "page.ai.tasks.saveChanges" })}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ─── Tasks Tab ──────────────────────────────────────────────────────────────

type TaskParameter = { name: string; description: string; type: "string" | "number" | "boolean"; required: boolean };

// ─── Task Form Fields (shared between create & edit) ─────────────────────────

function TaskFormFields({
  name, setName, description, setDescription,
  apiEndpoint, setApiEndpoint, httpMethod, setHttpMethod,
  headers, setHeaders, bodyTemplate, setBodyTemplate,
  parameters, setParameters,
}: {
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  apiEndpoint: string; setApiEndpoint: (v: string) => void;
  httpMethod: HttpMethod; setHttpMethod: (v: HttpMethod) => void;
  headers: string; setHeaders: (v: string) => void;
  bodyTemplate: string; setBodyTemplate: (v: string) => void;
  parameters: TaskParameter[]; setParameters: (v: TaskParameter[]) => void;
}) {
  const intl = useIntl();
  const addParam = () => {
    setParameters([...parameters, { name: "", description: "", type: "string", required: true }]);
  };

  const updateParam = (index: number, field: keyof TaskParameter, value: string | boolean) => {
    const updated = [...parameters];
    if (field === "required") {
      updated[index] = { ...updated[index], [field]: value as boolean };
    } else if (field === "type") {
      updated[index] = { ...updated[index], [field]: value as "string" | "number" | "boolean" };
    } else {
      updated[index] = { ...updated[index], [field]: value as string };
    }
    setParameters(updated);
  };

  const removeParam = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{intl.formatMessage({ id: "page.ai.tasks.taskName" })}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Check Order Status" />
        </div>
        <div className="space-y-2">
          <Label>{intl.formatMessage({ id: "page.ai.tasks.httpMethod" })}</Label>
          <Select value={httpMethod} onValueChange={(v) => setHttpMethod(v as HttpMethod)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{intl.formatMessage({ id: "page.ai.tasks.description" })}</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Look up the status of a customer order by order number" rows={2} />
      </div>

      <div className="space-y-2">
        <Label>{intl.formatMessage({ id: "page.ai.tasks.apiEndpoint" })}</Label>
        <Input value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)}
          placeholder="https://api.yourcompany.com/orders/status" />
      </div>

      <div className="space-y-2">
        <Label>{intl.formatMessage({ id: "page.ai.tasks.customHeaders" })}</Label>
        <Textarea value={headers} onChange={(e) => setHeaders(e.target.value)}
          placeholder={'{"Authorization": "Bearer YOUR_TOKEN", "X-API-Key": "key123"}'} rows={2} />
      </div>

      {(httpMethod === "POST" || httpMethod === "PUT") && (
        <div className="space-y-2">
          <Label>Body Template (JSON with {"{{param}}"} placeholders)</Label>
          <Textarea value={bodyTemplate} onChange={(e) => setBodyTemplate(e.target.value)}
            placeholder={'{"order_id": "{{order_id}}", "action": "check_status"}'} rows={3} />
        </div>
      )}

      {/* Parameters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{intl.formatMessage({ id: "page.ai.tasks.parameters" })}</Label>
          <Button size="sm" variant="ghost" onClick={addParam}><Plus className="h-3 w-3 mr-1" />Add</Button>
        </div>
        {parameters.map((param, i) => (
          <div key={i} className="flex items-end gap-2 p-3 border rounded-lg">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">{intl.formatMessage({ id: "page.ai.tasks.paramName" })}</Label>
              <Input value={param.name} onChange={(e) => updateParam(i, "name", e.target.value)} placeholder="order_id" className="h-8 text-sm" />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">{intl.formatMessage({ id: "page.ai.tasks.paramDescription" })}</Label>
              <Input value={param.description} onChange={(e) => updateParam(i, "description", e.target.value)} placeholder="The order number" className="h-8 text-sm" />
            </div>
            <div className="w-24 space-y-1">
              <Label className="text-xs">{intl.formatMessage({ id: "page.ai.tasks.paramType" })}</Label>
              <Select value={param.type} onValueChange={(v) => updateParam(i, "type", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-20 space-y-1">
              <Label className="text-xs">{intl.formatMessage({ id: "page.ai.tasks.paramRequired" })}</Label>
              <Select value={param.required ? "yes" : "no"} onValueChange={(v) => updateParam(i, "required", v === "yes")}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="ghost" onClick={() => removeParam(i)} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Edit Task Dialog ──────────────────────────────────────────────────────

function EditTaskDialog({
  task, onClose,
}: {
  task: Doc<"aiAssistantTasks">;
  onClose: () => void;
}) {
  const intl = useIntl();
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description);
  const [apiEndpoint, setApiEndpoint] = useState(task.apiEndpoint);
  const [httpMethod, setHttpMethod] = useState<HttpMethod>(task.httpMethod);
  const [headers, setHeaders] = useState(task.headers ?? "");
  const [bodyTemplate, setBodyTemplate] = useState(task.bodyTemplate ?? "");
  const [parameters, setParameters] = useState<TaskParameter[]>(
    task.parameters.map((p) => ({ ...p }))
  );
  const [saving, setSaving] = useState(false);
  const updateTask = useMutation(api.aiAssistants.updateTask);

  const handleSave = async () => {
    if (!name.trim() || !description.trim() || !apiEndpoint.trim()) {
      toast.error(intl.formatMessage({ id: "page.ai.tasks.nameRequired" }));
      return;
    }
    const validParams = parameters.filter((p) => p.name.trim() && p.description.trim());
    setSaving(true);
    try {
      await updateTask({
        taskId: task._id,
        name: name.trim(),
        description: description.trim(),
        apiEndpoint: apiEndpoint.trim(),
        httpMethod,
        headers: headers.trim() || undefined,
        bodyTemplate: bodyTemplate.trim() || undefined,
        parameters: validParams,
      });
      toast.success(intl.formatMessage({ id: "page.ai.tasks.updated" }));
      onClose();
    } catch {
      toast.error(intl.formatMessage({ id: "page.ai.tasks.updateFailed" }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{intl.formatMessage({ id: "page.ai.tasks.editTask" })}</DialogTitle>
        <DialogDescription>{intl.formatMessage({ id: "page.ai.tasks.editTaskDesc" })}</DialogDescription>
      </DialogHeader>
      <TaskFormFields
        name={name} setName={setName}
        description={description} setDescription={setDescription}
        apiEndpoint={apiEndpoint} setApiEndpoint={setApiEndpoint}
        httpMethod={httpMethod} setHttpMethod={setHttpMethod}
        headers={headers} setHeaders={setHeaders}
        bodyTemplate={bodyTemplate} setBodyTemplate={setBodyTemplate}
        parameters={parameters} setParameters={setParameters}
      />
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner className="h-4 w-4 mr-1" /> : null}
          {intl.formatMessage({ id: "page.ai.tasks.saveChanges" })}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ─── Tasks Tab ─────────────────────────────────────────────────────────────

function TasksTab({
  assistantId, clientId, tasks,
}: {
  assistantId: Id<"aiAssistants">;
  clientId: Id<"clients">;
  tasks: Doc<"aiAssistantTasks">[];
}) {
  const intl = useIntl();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [httpMethod, setHttpMethod] = useState<HttpMethod>("POST");
  const [headers, setHeaders] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [parameters, setParameters] = useState<TaskParameter[]>([]);
  const [editingTask, setEditingTask] = useState<Doc<"aiAssistantTasks"> | null>(null);
  const createTask = useMutation(api.aiAssistants.createTask);
  const updateTask = useMutation(api.aiAssistants.updateTask);
  const removeTask = useMutation(api.aiAssistants.removeTask);

  const handleCreate = async () => {
    if (!name.trim() || !description.trim() || !apiEndpoint.trim()) {
      toast.error(intl.formatMessage({ id: "page.ai.tasks.nameRequired" }));
      return;
    }
    const validParams = parameters.filter((p) => p.name.trim() && p.description.trim());
    try {
      await createTask({
        assistantId,
        clientId,
        name: name.trim(),
        description: description.trim(),
        apiEndpoint: apiEndpoint.trim(),
        httpMethod,
        headers: headers.trim() || undefined,
        bodyTemplate: bodyTemplate.trim() || undefined,
        parameters: validParams,
      });
      toast.success(intl.formatMessage({ id: "page.ai.tasks.created" }));
      resetForm();
    } catch {
      toast.error(intl.formatMessage({ id: "page.ai.tasks.createFailed" }));
    }
  };

  const resetForm = () => {
    setName(""); setDescription(""); setApiEndpoint(""); setHttpMethod("POST");
    setHeaders(""); setBodyTemplate(""); setParameters([]); setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{intl.formatMessage({ id: "page.ai.tasks.title" })}</h3>
          <p className="text-sm text-muted-foreground">
            {intl.formatMessage({ id: "page.ai.tasks.subtitle" })}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.tasks.addTask" })}
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <TaskFormFields
              name={name} setName={setName}
              description={description} setDescription={setDescription}
              apiEndpoint={apiEndpoint} setApiEndpoint={setApiEndpoint}
              httpMethod={httpMethod} setHttpMethod={setHttpMethod}
              headers={headers} setHeaders={setHeaders}
              bodyTemplate={bodyTemplate} setBodyTemplate={setBodyTemplate}
              parameters={parameters} setParameters={setParameters}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate}>{intl.formatMessage({ id: "page.ai.tasks.createTask" })}</Button>
              <Button size="sm" variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tasks.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Zap /></EmptyMedia>
            <EmptyTitle>{intl.formatMessage({ id: "page.ai.tasks.noTasks" })}</EmptyTitle>
            <EmptyDescription>
              {intl.formatMessage({ id: "page.ai.tasks.noTasksDesc" })}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task._id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-medium">{task.name}</h4>
                      <Badge variant="outline" className="text-xs font-mono">{task.httpMethod}</Badge>
                      <Badge variant={task.isActive ? "default" : "secondary"} className="text-xs">
                        {task.isActive ? intl.formatMessage({ id: "common.active" }) : intl.formatMessage({ id: "common.inactive" })}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{task.description}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{task.apiEndpoint}</p>
                    {task.parameters.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {task.parameters.map((p) => (
                          <Badge key={p.name} variant="secondary" className="text-xs">
                            {p.name}{p.required ? " *" : ""}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{task.executionCount} {intl.formatMessage({ id: "page.ai.tasks.executions" })}</span>
                      {task.lastExecutedAt && <span>Last: {new Date(task.lastExecutedAt).toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button variant="ghost" size="sm" onClick={() => setEditingTask(task)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() =>
                      updateTask({ taskId: task._id, isActive: !task.isActive })
                    }>
                      {task.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      if (confirm("Delete this task?")) {
                        await removeTask({ taskId: task._id });
                        toast.success(intl.formatMessage({ id: "page.ai.detail.deleted" }));
                      }
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Task Dialog */}
      <Dialog open={editingTask !== null} onOpenChange={(open) => { if (!open) setEditingTask(null); }}>
        {editingTask && (
          <EditTaskDialog
            key={editingTask._id}
            task={editingTask}
            onClose={() => setEditingTask(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

// ─── Test Chat Tab ──────────────────────────────────────────────────────────

function TestChatTab({ assistantId }: { assistantId: Id<"aiAssistants"> }) {
  const intl = useIntl();
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant" | "system"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [handedOver, setHandedOver] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const testChat = useAction(api.aiAssistantsActions.testChat);
  const speechToText = useAction(api.aiAssistantsActions.speechToText);
  const requestHandover = useAction(api.aiHandoverActions.requestHandover);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const sessions = useQuery(api.aiAssistants.getChatSessions, { assistantId });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (text?: string) => {
    const messageText = text ?? input.trim();
    if (!messageText || isLoading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: messageText }]);
    setIsLoading(true);
    try {
      const result = await testChat({ assistantId, message: messageText });
      setMessages((prev) => [...prev, { role: "assistant", content: result.response }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Voice Input (record + transcribe via OpenAI) ──────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size < 100) {
          toast.error(intl.formatMessage({ id: "page.ai.test.recordingShort" }));
          return;
        }
        setIsTranscribing(true);
        try {
          // Upload audio to storage
          const uploadUrl = await generateUploadUrl();
          const uploadRes = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": "audio/webm" },
            body: audioBlob,
          });
          const { storageId } = (await uploadRes.json()) as { storageId: Id<"_storage"> };

          // Transcribe
          const result = await speechToText({ storageId });
          if (result.text.trim()) {
            // Send the transcribed text directly as a message
            await handleSend(result.text.trim());
          } else {
            toast.error(intl.formatMessage({ id: "page.ai.test.noAudio" }));
          }
        } catch {
          toast.error(intl.formatMessage({ id: "page.ai.test.transcriptionFailed" }));
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch {
      toast.error(intl.formatMessage({ id: "page.ai.test.micDenied" }));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // ── Voice Output (browser SpeechSynthesis) ─────────────────────────────
  const playResponse = (text: string, index: number) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setPlayingIndex(null);
      setIsSpeaking(false);
      return;
    }

    setPlayingIndex(index);
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => {
      setPlayingIndex(null);
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      setPlayingIndex(null);
      setIsSpeaking(false);
    };
    window.speechSynthesis.speak(utterance);
  };

  // ── Human Handover ───────────────────────────────────────────────────────
  const handleHandover = async () => {
    // Find the test session for this assistant
    const testSession = sessions?.find(
      (s) => s.sessionId.startsWith("test_") && s.assistantId === assistantId
    );
    if (!testSession) {
      toast.error(intl.formatMessage({ id: "page.ai.test.noSession" }));
      return;
    }
    setIsLoading(true);
    try {
      const result = await requestHandover({
        sessionId: testSession._id,
        assistantId,
        reason: "Manual handover from test chat",
      });
      if (result.success) {
        setHandedOver(true);
        setMessages((prev) => [...prev, {
          role: "system",
          content: "Conversation handed over to a human agent. An email summary has been sent.",
        }]);
        toast.success(intl.formatMessage({ id: "page.ai.test.handoverSuccess" }));
      } else {
        toast.error(result.error ?? intl.formatMessage({ id: "page.ai.test.handoverFailed" }));
      }
    } catch {
      toast.error(intl.formatMessage({ id: "page.ai.test.handoverFailed" }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> {intl.formatMessage({ id: "page.ai.test.title" })}
        </CardTitle>
        <CardDescription>{intl.formatMessage({ id: "page.ai.test.subtitle" })}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg flex flex-col h-96">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8 space-y-2">
                <Mic className="h-8 w-8 mx-auto opacity-50" />
                <p>{intl.formatMessage({ id: "page.ai.test.sendOrSpeak" })}</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : msg.role === "system" ? "justify-center" : "justify-start"} gap-1`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" :
                  msg.role === "system" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-center italic text-xs" :
                  "bg-muted"
                }`}>
                  {msg.content}
                </div>
                {msg.role === "assistant" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 self-end"
                    onClick={() => playResponse(msg.content, i)}
                    title={playingIndex === i ? "Stop" : "Listen"}
                  >
                    {playingIndex === i ? (
                      <VolumeX className="h-3.5 w-3.5" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2"><Spinner /></div>
              </div>
            )}
            {isTranscribing && (
              <div className="flex justify-end">
                <div className="bg-primary/10 text-primary rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                  <Spinner /> {intl.formatMessage({ id: "page.ai.test.transcribing" })}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t p-3 flex gap-2">
            <Button
              size="icon"
              variant={isRecording ? "destructive" : "secondary"}
              className="shrink-0"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || isTranscribing || handedOver}
              title={isRecording ? "Stop recording" : "Start voice input"}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={handedOver ? intl.formatMessage({ id: "page.ai.test.handedOver" }) : intl.formatMessage({ id: "page.ai.test.typeOrSpeak" })}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              disabled={isLoading || isRecording || isTranscribing || handedOver} />
            <Button size="sm" onClick={() => handleSend()} disabled={isLoading || !input.trim() || isRecording || handedOver}>
              <Send className="h-4 w-4" />
            </Button>
            {messages.length > 0 && !handedOver && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleHandover}
                disabled={isLoading}
                title="Transfer to human agent"
              >
                <UserCheck className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Conversations Tab ──────────────────────────────────────────────────────

function ConversationsTab({ sessions }: { sessions: Doc<"aiChatSessions">[] }) {
  const intl = useIntl();
  const [selectedSession, setSelectedSession] = useState<Id<"aiChatSessions"> | null>(null);
  const chatMessages = useQuery(api.aiAssistants.getChatMessages, selectedSession ? { sessionId: selectedSession } : "skip");

  if (selectedSession && chatMessages) {
    const session = sessions.find((s) => s._id === selectedSession);
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{session?.visitorName || intl.formatMessage({ id: "page.ai.conversations.anonymous" })} ({session?.channel})</CardTitle>
                <CardDescription>{session?.messageCount} messages</CardDescription>
              </div>
              {session?.status === "handed_over" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <UserCheck className="h-3 w-3" /> {intl.formatMessage({ id: "page.ai.conversations.handedOver" })}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {chatMessages.map((msg) => (
                <div key={msg._id} className={`flex ${msg.role === "user" ? "justify-end" : msg.role === "system" ? "justify-center" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" :
                    msg.role === "system" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-center italic text-xs" :
                    "bg-muted"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><MessageSquare /></EmptyMedia>
          <EmptyTitle>{intl.formatMessage({ id: "page.ai.conversations.noConversations" })}</EmptyTitle>
          <EmptyDescription>{intl.formatMessage({ id: "page.ai.conversations.noConversationsDesc" })}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Card key={session._id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setSelectedSession(session._id)}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{session.visitorName || intl.formatMessage({ id: "page.ai.conversations.anonymous" })}</p>
                <p className="text-xs text-muted-foreground">{session.visitorEmail || session.sessionId.slice(0, 16)}</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">{session.channel}</Badge>
                {session.status === "handed_over" && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <UserCheck className="h-3 w-3" /> {intl.formatMessage({ id: "page.ai.conversations.handover" })}
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground">{session.messageCount} msgs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Execution Logs Tab ─────────────────────────────────────────────────────

function ExecutionLogsTab({
  logs, tasks,
}: {
  logs: Doc<"aiTaskExecutionLogs">[];
  tasks: Doc<"aiAssistantTasks">[];
}) {
  const intl = useIntl();
  const taskMap = new Map(tasks.map((t) => [t._id, t.name]));

  if (logs.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Activity /></EmptyMedia>
          <EmptyTitle>{intl.formatMessage({ id: "page.ai.logs.noLogs" })}</EmptyTitle>
          <EmptyDescription>{intl.formatMessage({ id: "page.ai.logs.noLogsDesc" })}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <Card key={log._id}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">{taskMap.get(log.taskId) ?? intl.formatMessage({ id: "page.ai.logs.unknownTask" })}</h4>
                <Badge variant={log.success ? "default" : "destructive"} className="text-xs">
                  {log.success ? intl.formatMessage({ id: "page.ai.logs.success" }) : intl.formatMessage({ id: "page.ai.logs.failed" })}
                </Badge>
                <Badge variant="outline" className="text-xs">HTTP {log.responseStatus}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(log.executedAt).toLocaleString()}
              </span>
            </div>
            <div className="text-xs space-y-1">
              <p className="text-muted-foreground">
                <strong>Params:</strong> <code className="bg-muted px-1 rounded">{log.parameters}</code>
              </p>
              {log.responseBody && (
                <p className="text-muted-foreground truncate">
                  <strong>Response:</strong> <code className="bg-muted px-1 rounded">{log.responseBody.slice(0, 200)}</code>
                </p>
              )}
              {log.errorMessage && (
                <p className="text-destructive">
                  <strong>Error:</strong> {log.errorMessage}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Handovers Tab ─────────────────────────────────────────────────────────

function HandoversTab({
  requests,
  sessions,
}: {
  requests: Doc<"aiHandoverRequests">[];
  sessions: Doc<"aiChatSessions">[];
}) {
  const intl = useIntl();
  const resolveHandover = useMutation(api.aiAssistants.resolveHandover);
  const takeOverChat = useMutation(api.aiAssistants.takeOverChat);
  const sendAgentMessage = useMutation(api.aiAssistants.sendAgentMessage);
  const [selectedSession, setSelectedSession] = useState<Id<"aiChatSessions"> | null>(null);
  const [agentReply, setAgentReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const chatMessages = useQuery(api.aiAssistants.getChatMessages, selectedSession ? { sessionId: selectedSession } : "skip");
  const agentMessagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    agentMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleTakeOver = async (handoverId: Id<"aiHandoverRequests">) => {
    try {
      await takeOverChat({ handoverId });
      toast.success(intl.formatMessage({ id: "page.ai.handovers.takenOver" }));
    } catch {
      toast.error(intl.formatMessage({ id: "page.ai.handovers.takeOverFailed" }));
    }
  };

  const handleSendAgentReply = async () => {
    if (!selectedSession || !agentReply.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      await sendAgentMessage({ sessionId: selectedSession, content: agentReply.trim() });
      setAgentReply("");
    } catch {
      toast.error(intl.formatMessage({ id: "page.ai.handovers.sendFailed" }));
    } finally {
      setSendingReply(false);
    }
  };

  if (selectedSession && chatMessages) {
    const request = requests.find((r) => r.sessionId === selectedSession);
    const session = sessions.find((s) => s._id === selectedSession);
    const isInProgress = request?.status === "in_progress";
    const isPendingOrEmailSent = request?.status === "pending" || request?.status === "email_sent";

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" />Back
        </Button>

        {/* Summary card */}
        {request && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{intl.formatMessage({ id: "page.ai.handovers.aiSummary" })}</CardTitle>
                  {request.department && (
                    <Badge variant="secondary" className="text-xs">{request.department}</Badge>
                  )}
                  {request.handoverType && (
                    <Badge variant="outline" className="text-xs capitalize">{request.handoverType}</Badge>
                  )}
                </div>
                <Badge variant={
                  request.status === "resolved" ? "default" :
                  request.status === "in_progress" ? "secondary" :
                  request.status === "email_sent" ? "secondary" : "destructive"
                }>
                  {request.status === "resolved" ? intl.formatMessage({ id: "page.ai.handovers.resolved" }) :
                   request.status === "in_progress" ? intl.formatMessage({ id: "page.ai.handovers.agentActive" }) :
                   request.status === "email_sent" ? intl.formatMessage({ id: "page.ai.handovers.emailSent" }) : intl.formatMessage({ id: "page.ai.handovers.pending" })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap text-muted-foreground mb-4">{request.summary}</div>
              {request.reason && (
                <div className="text-sm"><strong>Reason:</strong> {request.reason}</div>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                {request.visitorName && <span>Name: {request.visitorName}</span>}
                {request.visitorEmail && <span>Email: {request.visitorEmail}</span>}
                {request.visitorPhone && <span>Phone: {request.visitorPhone}</span>}
              </div>
              {request.emailSentTo && (
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email sent to {request.emailSentTo} at {new Date(request.emailSentAt ?? "").toLocaleString()}
                </div>
              )}
              <div className="flex items-center gap-2 mt-4">
                {isPendingOrEmailSent && (
                  <Button size="sm" onClick={() => handleTakeOver(request._id)}>
                    <UserCheck className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.handovers.takeOverChat" })}
                  </Button>
                )}
                {request.status !== "resolved" && (
                  <Button size="sm" variant="secondary" onClick={async () => {
                    await resolveHandover({ handoverId: request._id });
                    toast.success(intl.formatMessage({ id: "page.ai.handovers.markedResolved" }));
                  }}>
                    <CheckCircle className="h-4 w-4 mr-1" />{intl.formatMessage({ id: "page.ai.handovers.markResolved" })}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live conversation with agent reply */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{session?.visitorName || "Anonymous"} - {intl.formatMessage({ id: "page.ai.handovers.liveConversation" })}</CardTitle>
            <CardDescription>{chatMessages.length} messages {isInProgress && " - You are actively responding"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg flex flex-col" style={{ height: isInProgress ? "28rem" : "24rem" }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg) => (
                  <div key={msg._id} className={`flex ${msg.role === "user" ? "justify-end" : msg.role === "system" ? "justify-center" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" :
                      msg.role === "system" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-center italic text-xs" :
                      msg.content.startsWith("[Agent:") ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100" :
                      "bg-muted"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={agentMessagesEndRef} />
              </div>

              {/* Agent reply input - only visible when taken over */}
              {isInProgress && (
                <div className="border-t p-3 flex gap-2">
                  <Input
                    value={agentReply}
                    onChange={(e) => setAgentReply(e.target.value)}
                    placeholder={intl.formatMessage({ id: "page.ai.handovers.replyPlaceholder" })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendAgentReply();
                      }
                    }}
                    disabled={sendingReply}
                  />
                  <Button size="sm" onClick={handleSendAgentReply} disabled={!agentReply.trim() || sendingReply}>
                    {sendingReply ? <Spinner /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><ArrowRightLeft /></EmptyMedia>
          <EmptyTitle>{intl.formatMessage({ id: "page.ai.handovers.noRequests" })}</EmptyTitle>
          <EmptyDescription>
            {intl.formatMessage({ id: "page.ai.handovers.noRequestsDesc" })}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <Card
          key={request._id}
          className="cursor-pointer hover:shadow-sm transition-shadow"
          onClick={() => setSelectedSession(request.sessionId)}
        >
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-medium text-sm">{request.visitorName || "Anonymous"}</p>
                  <Badge
                    variant={
                      request.status === "resolved" ? "default" :
                      request.status === "in_progress" ? "secondary" :
                      request.status === "email_sent" ? "secondary" : "destructive"
                    }
                    className="text-xs"
                  >
                    {request.status === "resolved" ? intl.formatMessage({ id: "page.ai.handovers.resolved" }) :
                     request.status === "in_progress" ? intl.formatMessage({ id: "page.ai.handovers.agentActive" }) :
                     request.status === "email_sent" ? intl.formatMessage({ id: "page.ai.handovers.emailSent" }) : intl.formatMessage({ id: "page.ai.handovers.pending" })}
                  </Badge>
                  {request.department && (
                    <Badge variant="outline" className="text-xs">{request.department}</Badge>
                  )}
                  {request.handoverType === "call" && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Call
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{request.summary.slice(0, 150)}...</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {request.visitorEmail && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{request.visitorEmail}</span>}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(request._creationTime).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="ml-4 flex items-center gap-1">
                {(request.status === "pending" || request.status === "email_sent") && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await takeOverChat({ handoverId: request._id });
                      toast.success(intl.formatMessage({ id: "page.ai.handovers.takenOverShort" }));
                      setSelectedSession(request.sessionId);
                    }}
                    title="Take over this conversation"
                  >
                    <UserCheck className="h-4 w-4" />
                  </Button>
                )}
                {request.status !== "resolved" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await resolveHandover({ handoverId: request._id });
                      toast.success(intl.formatMessage({ id: "page.ai.handovers.resolvedShort" }));
                    }}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Training Tab ──────────────────────────────────────────────────────────

function TrainingTab({ assistant }: { assistant: Doc<"aiAssistants"> }) {
  const intl = useIntl();
  const updateAssistant = useMutation(api.aiAssistants.update);

  // Tone & style
  const [toneDescription, setToneDescription] = useState(assistant.toneDescription ?? "");
  const [responseLength, setResponseLength] = useState<ResponseLength>(assistant.responseLength ?? "medium");
  const [greetingStyle, setGreetingStyle] = useState(assistant.greetingStyle ?? "");
  const [closingStyle, setClosingStyle] = useState(assistant.closingStyle ?? "");
  const [primaryLanguage, setPrimaryLanguage] = useState(assistant.primaryLanguage ?? "");

  // Sample Q&A
  const [sampleQA, setSampleQA] = useState<Array<{ question: string; answer: string }>>(
    assistant.sampleQA ?? []
  );
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  // Guidelines (do's)
  const [responseGuidelines, setResponseGuidelines] = useState<string[]>(
    assistant.responseGuidelines ?? []
  );
  const [newGuideline, setNewGuideline] = useState("");

  // Restrictions (don'ts)
  const [restrictionGuidelines, setRestrictionGuidelines] = useState<string[]>(
    assistant.restrictionGuidelines ?? []
  );
  const [newRestriction, setNewRestriction] = useState("");

  // Vocabulary
  const [vocabulary, setVocabulary] = useState<Array<{ term: string; definition: string }>>(
    assistant.vocabulary ?? []
  );
  const [newTerm, setNewTerm] = useState("");
  const [newDefinition, setNewDefinition] = useState("");

  const handleSaveAll = async () => {
    try {
      await updateAssistant({
        assistantId: assistant._id,
        toneDescription: toneDescription.trim() || undefined,
        responseLength,
        greetingStyle: greetingStyle.trim() || undefined,
        closingStyle: closingStyle.trim() || undefined,
        primaryLanguage: primaryLanguage.trim() || undefined,
        sampleQA: sampleQA.length > 0 ? sampleQA : undefined,
        responseGuidelines: responseGuidelines.length > 0 ? responseGuidelines : undefined,
        restrictionGuidelines: restrictionGuidelines.length > 0 ? restrictionGuidelines : undefined,
        vocabulary: vocabulary.length > 0 ? vocabulary : undefined,
      });
      toast.success(intl.formatMessage({ id: "page.ai.training.saved" }));
    } catch {
      toast.error(intl.formatMessage({ id: "page.ai.training.saveFailed" }));
    }
  };

  const addSampleQA = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error(intl.formatMessage({ id: "page.ai.training.qaRequired" }));
      return;
    }
    setSampleQA([...sampleQA, { question: newQuestion.trim(), answer: newAnswer.trim() }]);
    setNewQuestion("");
    setNewAnswer("");
  };

  const addGuideline = () => {
    if (!newGuideline.trim()) return;
    setResponseGuidelines([...responseGuidelines, newGuideline.trim()]);
    setNewGuideline("");
  };

  const addRestriction = () => {
    if (!newRestriction.trim()) return;
    setRestrictionGuidelines([...restrictionGuidelines, newRestriction.trim()]);
    setNewRestriction("");
  };

  const addVocabulary = () => {
    if (!newTerm.trim() || !newDefinition.trim()) {
      toast.error(intl.formatMessage({ id: "page.ai.training.termRequired" }));
      return;
    }
    setVocabulary([...vocabulary, { term: newTerm.trim(), definition: newDefinition.trim() }]);
    setNewTerm("");
    setNewDefinition("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">{intl.formatMessage({ id: "page.ai.training.title" })}</h3>
        <p className="text-sm text-muted-foreground">
          {intl.formatMessage({ id: "page.ai.training.subtitle" })}
        </p>
      </div>

      {/* Tone & Language */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Languages className="h-4 w-4" /> {intl.formatMessage({ id: "page.ai.training.toneLanguage" })}
          </CardTitle>
          <CardDescription>{intl.formatMessage({ id: "page.ai.training.toneLanguageDesc" })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{intl.formatMessage({ id: "page.ai.training.toneDescription" })}</Label>
            <Textarea
              value={toneDescription}
              onChange={(e) => setToneDescription(e.target.value)}
              placeholder="Describe how the assistant should communicate. Example: 'Speak like a friendly local shopkeeper. Use short sentences. Add warmth without being overly casual. Use humor sparingly.'"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: "page.ai.training.toneDescHint" })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: "page.ai.training.responseLength" })}</Label>
              <Select value={responseLength} onValueChange={(v) => setResponseLength(v as ResponseLength)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">{intl.formatMessage({ id: "page.ai.training.short" })}</SelectItem>
                  <SelectItem value="medium">{intl.formatMessage({ id: "page.ai.training.medium" })}</SelectItem>
                  <SelectItem value="detailed">{intl.formatMessage({ id: "page.ai.training.detailed" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: "page.ai.training.primaryLanguage" })}</Label>
              <Input
                value={primaryLanguage}
                onChange={(e) => setPrimaryLanguage(e.target.value)}
                placeholder="e.g. French, English, Arabic"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: "page.ai.training.greetingStyle" })}</Label>
              <Textarea
                value={greetingStyle}
                onChange={(e) => setGreetingStyle(e.target.value)}
                placeholder="e.g. 'Always greet with Bonjour! and the visitor's name if known.'"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: "page.ai.training.closingStyle" })}</Label>
              <Textarea
                value={closingStyle}
                onChange={(e) => setClosingStyle(e.target.value)}
                placeholder="e.g. 'End conversations with: Merci et bonne journée!'"
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Q&A (Few-shot training) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> {intl.formatMessage({ id: "page.ai.training.exampleConversations" })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage({ id: "page.ai.training.exampleConversationsDesc" })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sampleQA.map((qa, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <p className="text-sm"><span className="font-medium text-muted-foreground">{intl.formatMessage({ id: "page.ai.training.customer" })}:</span> {qa.question}</p>
                  <p className="text-sm"><span className="font-medium text-primary">{intl.formatMessage({ id: "page.ai.training.ai" })}:</span> {qa.answer}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSampleQA(sampleQA.filter((_, i) => i !== index))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="space-y-2">
              <Label className="text-xs">{intl.formatMessage({ id: "page.ai.training.customerQuestion" })}</Label>
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="e.g. What are your delivery times?"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{intl.formatMessage({ id: "page.ai.training.idealResponse" })}</Label>
              <Textarea
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="e.g. Our standard delivery takes 2-3 business days within Abidjan. For other cities, it's 5-7 days. Need it faster? We offer express 24h delivery for 2000 FCFA extra!"
                rows={3}
              />
            </div>
            <Button size="sm" onClick={addSampleQA}>
              <Plus className="h-3 w-3 mr-1" />{intl.formatMessage({ id: "page.ai.training.addExample" })}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Response Guidelines (Do's) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> {intl.formatMessage({ id: "page.ai.training.responseGuidelines" })}
          </CardTitle>
          <CardDescription>{intl.formatMessage({ id: "page.ai.training.guidelinesDesc" })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {responseGuidelines.map((guideline, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              <span className="flex-1">{guideline}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResponseGuidelines(responseGuidelines.filter((_, i) => i !== index))}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newGuideline}
              onChange={(e) => setNewGuideline(e.target.value)}
              placeholder="e.g. Always mention our WhatsApp number for follow-up"
              onKeyDown={(e) => e.key === "Enter" && addGuideline()}
            />
            <Button size="sm" onClick={addGuideline}><Plus className="h-3 w-3" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Restrictions (Don'ts) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Ban className="h-4 w-4" /> {intl.formatMessage({ id: "page.ai.training.restrictions" })}
          </CardTitle>
          <CardDescription>{intl.formatMessage({ id: "page.ai.training.restrictionsDesc" })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {restrictionGuidelines.map((restriction, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <X className="h-4 w-4 text-red-500 shrink-0" />
              <span className="flex-1">{restriction}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRestrictionGuidelines(restrictionGuidelines.filter((_, i) => i !== index))}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newRestriction}
              onChange={(e) => setNewRestriction(e.target.value)}
              placeholder="e.g. Never discuss competitor pricing"
              onKeyDown={(e) => e.key === "Enter" && addRestriction()}
            />
            <Button size="sm" onClick={addRestriction}><Plus className="h-3 w-3" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Company Vocabulary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookA className="h-4 w-4" /> {intl.formatMessage({ id: "page.ai.training.vocabulary" })}
          </CardTitle>
          <CardDescription>{intl.formatMessage({ id: "page.ai.training.vocabularyDesc" })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {vocabulary.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm border rounded-lg p-2">
              <div className="flex-1">
                <span className="font-medium">{entry.term}</span>
                <span className="text-muted-foreground"> — {entry.definition}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVocabulary(vocabulary.filter((_, i) => i !== index))}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2">
            <Input
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              placeholder="Term"
            />
            <Input
              value={newDefinition}
              onChange={(e) => setNewDefinition(e.target.value)}
              placeholder="Definition"
              className="col-span-1"
              onKeyDown={(e) => e.key === "Enter" && addVocabulary()}
            />
            <Button size="sm" onClick={addVocabulary}><Plus className="h-3 w-3 mr-1" />Add</Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveAll} size="lg">
          {intl.formatMessage({ id: "page.ai.training.saveButton" })}
        </Button>
      </div>
    </div>
  );
}

// ─── Settings Tab ───────────────────────────────────────────────────────────

type Department = { name: string; description: string; email?: string; phoneNumber?: string };
type HandoverSubject = { topic: string; department?: string; message?: string };

function SettingsTab({ assistant }: { assistant: Doc<"aiAssistants"> }) {
  const [name, setName] = useState(assistant.name);
  const [description, setDescription] = useState(assistant.description ?? "");
  const [companyName, setCompanyName] = useState(assistant.companyName);
  const [companyDescription, setCompanyDescription] = useState(assistant.companyDescription ?? "");
  const [industry, setIndustry] = useState(assistant.industry ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState(assistant.welcomeMessage ?? "");
  const [personality, setPersonality] = useState<Personality>(assistant.personality);
  const [primaryColor, setPrimaryColor] = useState(assistant.primaryColor ?? "#3B82F6");
  const [customInstructions, setCustomInstructions] = useState(assistant.customInstructions ?? "");
  const [handoverEmail, setHandoverEmail] = useState(assistant.handoverEmail ?? "");
  const [handoverPhoneNumber, setHandoverPhoneNumber] = useState(assistant.handoverPhoneNumber ?? "");
  const [saving, setSaving] = useState(false);
  const intl = useIntl();

  // Departments
  const [departments, setDepartments] = useState<Department[]>(
    assistant.handoverDepartments ?? []
  );
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [newDeptEmail, setNewDeptEmail] = useState("");
  const [newDeptPhone, setNewDeptPhone] = useState("");

  // Handover subjects
  const [subjects, setSubjects] = useState<HandoverSubject[]>(
    assistant.handoverSubjects ?? []
  );
  const [newSubjectTopic, setNewSubjectTopic] = useState("");
  const [newSubjectDept, setNewSubjectDept] = useState("");
  const [newSubjectMsg, setNewSubjectMsg] = useState("");

  const updateAssistant = useMutation(api.aiAssistants.update);

  const handleSave = async () => {
    if (!name.trim() || !companyName.trim()) {
      toast.error(intl.formatMessage({ id: "page.ai.settings.nameRequired" }));
      return;
    }
    setSaving(true);
    try {
      await updateAssistant({
        assistantId: assistant._id, name: name.trim(), description: description.trim() || undefined,
        companyName: companyName.trim(), companyDescription: companyDescription.trim() || undefined,
        industry: industry.trim() || undefined, welcomeMessage: welcomeMessage.trim() || undefined,
        personality, primaryColor, customInstructions: customInstructions.trim() || undefined,
        handoverEmail: handoverEmail.trim() || undefined,
        handoverPhoneNumber: handoverPhoneNumber.trim() || undefined,
        handoverDepartments: departments.length > 0 ? departments : undefined,
        handoverSubjects: subjects.length > 0 ? subjects : undefined,
      });
      toast.success(intl.formatMessage({ id: "page.ai.settings.updated" }));
    } catch {
      toast.error(intl.formatMessage({ id: "page.ai.settings.updateFailed" }));
    } finally {
      setSaving(false);
    }
  };

  const addDepartment = () => {
    if (!newDeptName.trim() || !newDeptDesc.trim()) {
      toast.error(intl.formatMessage({ id: "page.ai.settings.deptRequired" }));
      return;
    }
    setDepartments([...departments, {
      name: newDeptName.trim(),
      description: newDeptDesc.trim(),
      email: newDeptEmail.trim() || undefined,
      phoneNumber: newDeptPhone.trim() || undefined,
    }]);
    setNewDeptName(""); setNewDeptDesc(""); setNewDeptEmail(""); setNewDeptPhone("");
  };

  const addSubject = () => {
    if (!newSubjectTopic.trim()) {
      toast.error(intl.formatMessage({ id: "page.ai.settings.topicRequired" }));
      return;
    }
    setSubjects([...subjects, {
      topic: newSubjectTopic.trim(),
      department: newSubjectDept.trim() || undefined,
      message: newSubjectMsg.trim() || undefined,
    }]);
    setNewSubjectTopic(""); setNewSubjectDept(""); setNewSubjectMsg("");
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{intl.formatMessage({ id: "page.ai.settings.generalSettings" })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>{intl.formatMessage({ id: "page.ai.settings.assistantName" })}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>{intl.formatMessage({ id: "page.ai.settings.companyName" })}</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>{intl.formatMessage({ id: "page.ai.settings.description" })}</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Brief description of what this assistant does" /></div>
          <div className="space-y-2"><Label>{intl.formatMessage({ id: "page.ai.settings.companyDescription" })}</Label><Textarea value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} rows={4} placeholder="Describe your company, products, and services" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>{intl.formatMessage({ id: "page.ai.settings.industry" })}</Label><Input value={industry} onChange={(e) => setIndustry(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: "page.ai.settings.personality" })}</Label>
              <Select value={personality} onValueChange={(v) => setPersonality(v as Personality)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">{intl.formatMessage({ id: "page.ai.personality.professional" })}</SelectItem>
                  <SelectItem value="friendly">{intl.formatMessage({ id: "page.ai.personality.friendly" })}</SelectItem>
                  <SelectItem value="casual">{intl.formatMessage({ id: "page.ai.personality.casual" })}</SelectItem>
                  <SelectItem value="formal">{intl.formatMessage({ id: "page.ai.personality.formal" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>{intl.formatMessage({ id: "page.ai.settings.welcomeMessage" })}</Label><Textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={3} placeholder="The first message visitors see when opening the chat" /></div>
          <div className="space-y-2">
            <Label>{intl.formatMessage({ id: "page.ai.settings.brandColor" })}</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-12 cursor-pointer rounded border" />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
            </div>
          </div>
          <div className="space-y-2"><Label>{intl.formatMessage({ id: "page.ai.settings.customInstructions" })}</Label><Textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} rows={5} placeholder="Additional instructions for the AI assistant (e.g. tone, topics to avoid, specific responses)" /></div>
        </CardContent>
      </Card>

      {/* Human Handover Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> {intl.formatMessage({ id: "page.ai.settings.handoverSettings" })}
          </CardTitle>
          <CardDescription>{intl.formatMessage({ id: "page.ai.settings.handoverSettingsDesc" })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: "page.ai.settings.handoverEmail" })}</Label>
              <Input
                type="email"
                value={handoverEmail}
                onChange={(e) => setHandoverEmail(e.target.value)}
                placeholder="support@yourcompany.com"
              />
              <p className="text-xs text-muted-foreground">
                {intl.formatMessage({ id: "page.ai.settings.handoverEmailDesc" })}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{intl.formatMessage({ id: "page.ai.settings.handoverPhone" })}</Label>
              <Input
                type="tel"
                value={handoverPhoneNumber}
                onChange={(e) => setHandoverPhoneNumber(e.target.value)}
                placeholder="+225 01 23 45 67 89"
              />
              <p className="text-xs text-muted-foreground">
                {intl.formatMessage({ id: "page.ai.settings.handoverPhoneDesc" })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Specialist Departments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> {intl.formatMessage({ id: "page.ai.settings.departments" })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage({ id: "page.ai.settings.departmentsDesc" })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {departments.map((dept, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{dept.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDepartments(departments.filter((_, i) => i !== index))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{dept.description}</p>
              <div className="flex gap-3 text-xs text-muted-foreground">
                {dept.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{dept.email}</span>}
                {dept.phoneNumber && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{dept.phoneNumber}</span>}
              </div>
            </div>
          ))}
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{intl.formatMessage({ id: "page.ai.settings.deptName" })}</Label>
                <Input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="e.g. Sales, Technical Support" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{intl.formatMessage({ id: "page.ai.settings.deptDescription" })}</Label>
                <Input value={newDeptDesc} onChange={(e) => setNewDeptDesc(e.target.value)} placeholder="e.g. Handles pricing and quotes" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{intl.formatMessage({ id: "page.ai.settings.deptEmail" })}</Label>
                <Input value={newDeptEmail} onChange={(e) => setNewDeptEmail(e.target.value)} placeholder="sales@company.com" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{intl.formatMessage({ id: "page.ai.settings.deptPhone" })}</Label>
                <Input value={newDeptPhone} onChange={(e) => setNewDeptPhone(e.target.value)} placeholder="+225 01 23 45 67 89" />
              </div>
            </div>
            <Button size="sm" onClick={addDepartment}><Plus className="h-3 w-3 mr-1" />{intl.formatMessage({ id: "page.ai.settings.addDepartment" })}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Handover Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4" /> {intl.formatMessage({ id: "page.ai.settings.subjects" })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage({ id: "page.ai.settings.subjectsDesc" })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subjects.map((subject, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{subject.topic}</span>
                  {subject.department && <Badge variant="secondary" className="text-xs">{subject.department}</Badge>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSubjects(subjects.filter((_, i) => i !== index))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              {subject.message && <p className="text-xs text-muted-foreground">AI will say: {subject.message}</p>}
            </div>
          ))}
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{intl.formatMessage({ id: "page.ai.settings.subjectTopic" })}</Label>
                <Input value={newSubjectTopic} onChange={(e) => setNewSubjectTopic(e.target.value)}
                  placeholder="e.g. Complaints, Pricing, Account cancellation" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{intl.formatMessage({ id: "page.ai.settings.subjectDepartment" })}</Label>
                <Select value={newSubjectDept || "none"} onValueChange={(v) => setNewSubjectDept(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{intl.formatMessage({ id: "page.ai.settings.noDepartment" })}</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{intl.formatMessage({ id: "page.ai.settings.customAiMessage" })}</Label>
              <Textarea value={newSubjectMsg} onChange={(e) => setNewSubjectMsg(e.target.value)}
                placeholder="e.g. I'd recommend speaking with our sales team for detailed pricing." rows={2} />
            </div>
            <Button size="sm" onClick={addSubject}><Plus className="h-3 w-3 mr-1" />{intl.formatMessage({ id: "page.ai.settings.addSubject" })}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" disabled={saving}>
          {saving ? <><Spinner className="h-4 w-4 mr-2" />{intl.formatMessage({ id: "page.ai.settings.saving" })}</> : intl.formatMessage({ id: "page.ai.settings.saveAll" })}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export default function AIAssistantsPage() {
  return (
    <>
      <AuthLoading>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </AuthLoading>
      <Authenticated>
        <AIAssistantsInner />
      </Authenticated>
    </>
  );
}
