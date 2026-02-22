import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";
import { Authenticated, AuthLoading } from "convex/react";
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
          <EmptyTitle>Access denied</EmptyTitle>
          <EmptyDescription>You do not have permission to view AI Assistants.</EmptyDescription>
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
          <EmptyTitle>No AI assistants</EmptyTitle>
          <EmptyDescription>Your account is not yet linked to a company. Contact your administrator.</EmptyDescription>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Assistants</h1>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin
              ? "Create and manage AI chatbots for your clients"
              : "View and manage your AI chatbots"}
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
                <Label>Select Client</Label>
                <Select
                  value={selectedClientId ?? "all"}
                  onValueChange={(val) => {
                    setSelectedClientId(val === "all" ? null : val as Id<"clients">);
                    setSelectedAssistant(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
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
            <EmptyTitle>No AI assistants yet</EmptyTitle>
            <EmptyDescription>
              {isSuperAdmin
                ? selectedClientId
                  ? "Create an AI assistant for this client."
                  : "Select a client to create an assistant, or view all assistants."
                : "No AI assistants have been set up for your company yet. Contact your administrator."}
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
            {assistant.isActive ? "Active" : "Inactive"}
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
  const createAssistant = useMutation(api.aiAssistants.create);

  const handleCreate = async () => {
    if (!name.trim() || !companyName.trim()) {
      toast.error("Name and company name are required");
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
      toast.success("AI Assistant created!");
      setOpen(false);
      setName(""); setDescription(""); setCompanyDescription("");
      setIndustry(""); setWelcomeMessage(""); setCustomInstructions("");
    } catch {
      toast.error("Failed to create assistant");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setCompanyName(clientName); }}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />Create Assistant</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create AI Assistant</DialogTitle>
          <DialogDescription>
            Set up a new AI chatbot for <strong>{clientName}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assistant Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Support Bot" />
            </div>
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Short Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this assistant does" />
          </div>
          <div className="space-y-2">
            <Label>Company Description</Label>
            <Textarea value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} placeholder="Products, services, and more..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Technology" />
            </div>
            <div className="space-y-2">
              <Label>Personality</Label>
              <Select value={personality} onValueChange={(v) => setPersonality(v as Personality)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Welcome Message</Label>
            <Textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} placeholder="First message visitors see" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Brand Color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-12 cursor-pointer rounded border" />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Custom Instructions</Label>
            <Textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} placeholder="Additional rules or behaviors" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Create Assistant</Button>
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

  if (assistant === undefined) return <Skeleton className="h-96 w-full" />;
  if (!assistant) {
    return (
      <div className="text-center py-8">
        <p>Assistant not found.</p>
        <Button variant="ghost" onClick={onBack} className="mt-2">Go back</Button>
      </div>
    );
  }

  const clientName = clients?.find((c) => c._id === assistant.clientId)?.companyName ?? assistant.companyName;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${assistant.primaryColor ?? "#3B82F6"}20` }}>
              <Bot className="h-5 w-5" style={{ color: assistant.primaryColor ?? "#3B82F6" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{assistant.name}</h1>
              {isSuperAdmin && <p className="text-sm text-muted-foreground">Client: {clientName}</p>}
            </div>
            <Badge variant={assistant.isActive ? "default" : "secondary"}>{assistant.isActive ? "Active" : "Inactive"}</Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={async () => {
          await updateAssistant({ assistantId, isActive: !assistant.isActive });
          toast.success(assistant.isActive ? "Deactivated" : "Activated");
        }}>
          {assistant.isActive ? <><PowerOff className="h-4 w-4 mr-1" />Deactivate</> : <><Power className="h-4 w-4 mr-1" />Activate</>}
        </Button>
        {isSuperAdmin && (
          <Button variant="destructive" size="sm" onClick={async () => {
            if (!confirm("Delete this assistant and all its data?")) return;
            await deleteAssistant({ assistantId });
            toast.success("Deleted");
            onBack();
          }}>
            <Trash2 className="h-4 w-4 mr-1" />Delete
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Conversations", value: assistant.totalConversations },
          { label: "Messages", value: assistant.totalMessages },
          { label: "Knowledge Entries", value: knowledgeBase?.length ?? 0 },
          { label: "Tasks", value: tasks?.length ?? 0 },
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
          <TabsTrigger value="knowledge"><Brain className="h-4 w-4 mr-1" />Knowledge</TabsTrigger>
          <TabsTrigger value="training"><GraduationCap className="h-4 w-4 mr-1" />Training</TabsTrigger>
          <TabsTrigger value="tasks"><Zap className="h-4 w-4 mr-1" />Tasks</TabsTrigger>
          <TabsTrigger value="test"><MessageSquare className="h-4 w-4 mr-1" />Test Chat</TabsTrigger>
          <TabsTrigger value="conversations"><Eye className="h-4 w-4 mr-1" />Conversations</TabsTrigger>
          <TabsTrigger value="logs"><Activity className="h-4 w-4 mr-1" />Execution Logs</TabsTrigger>
          <TabsTrigger value="handovers"><ArrowRightLeft className="h-4 w-4 mr-1" />Handovers{handoverRequests && handoverRequests.filter(h => h.status !== "resolved").length > 0 ? ` (${handoverRequests.filter(h => h.status !== "resolved").length})` : ""}</TabsTrigger>
          <TabsTrigger value="api"><Code className="h-4 w-4 mr-1" />API / Integration</TabsTrigger>
          <TabsTrigger value="settings"><Pencil className="h-4 w-4 mr-1" />Settings</TabsTrigger>
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
  const ASSISTANT_ID = "${assistantId}";
  const API_URL = "${API_BASE}/api/v1/ai/chat";
  const HANDOVER_URL = "${API_BASE}/api/v1/ai/handover";
  const COLOR = "${assistant.primaryColor ?? "#3B82F6"}";
  const NAME = "${assistant.name}";
  let sessionId = "widget_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  let isHandedOver = false;

  // ── Helper: open / close chat ──
  function openChat() {
    document.getElementById("sc-popup").style.display = "flex";
    document.getElementById("sc-toggle").style.display = "none";
  }
  function closeChat() {
    document.getElementById("sc-popup").style.display = "none";
    document.getElementById("sc-toggle").style.display = "flex";
  }

  // ── Build Widget UI ──
  const widget = document.createElement("div");
  widget.id = "sayele-chat-widget";
  widget.innerHTML = \`
    <div style="position:fixed;bottom:20px;right:20px;z-index:9999;font-family:system-ui,-apple-system,sans-serif;">
      <div id="sc-popup" style="display:none;width:380px;height:540px;
        border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.18);
        background:#fff;flex-direction:column;overflow:hidden;">
        <div style="background:\${COLOR};color:white;
          padding:16px 20px;font-weight:600;display:flex;justify-content:space-between;align-items:center;font-size:15px;">
          <span>\${NAME}</span>
          <button id="sc-close"
            style="background:none;border:none;color:white;cursor:pointer;font-size:20px;line-height:1;">&#10005;</button>
        </div>
        <div id="sc-messages" style="flex:1;overflow-y:auto;padding:16px;font-size:14px;"></div>
        <div id="sc-input-area" style="padding:12px;border-top:1px solid #eee;display:flex;gap:8px;align-items:center;">
          <button id="sc-mic" title="Voice input"
            style="background:none;border:1px solid #ddd;border-radius:50%;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;">
            &#127908;
          </button>
          <input id="sc-input" type="text" placeholder="Type a message..."
            style="flex:1;padding:8px 14px;border:1px solid #ddd;border-radius:20px;outline:none;font-size:14px;" />
          <button id="sc-send"
            style="background:\${COLOR};color:white;border:none;border-radius:20px;padding:8px 16px;cursor:pointer;font-weight:500;font-size:14px;flex-shrink:0;">
            Send</button>
          <button id="sc-handover" title="Talk to a human"
            style="background:none;border:1px solid #ddd;border-radius:50%;width:36px;height:36px;cursor:pointer;display:none;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;">
            &#128100;
          </button>
        </div>
      </div>
      <button id="sc-toggle"
        style="width:60px;height:60px;border-radius:50%;
        background:\${COLOR};color:white;
        border:none;cursor:pointer;font-size:26px;
        box-shadow:0 4px 16px rgba(0,0,0,0.18);display:flex;align-items:center;justify-content:center;">
        &#128172;
      </button>
    </div>\`;
  document.body.appendChild(widget);

  // ── Toggle / Close listeners ──
  document.getElementById("sc-toggle").addEventListener("click", openChat);
  document.getElementById("sc-close").addEventListener("click", closeChat);

  var hasMessages = false;
  var SpeechRecog = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = SpeechRecog ? new SpeechRecog() : null;
  if (recognition) { recognition.continuous = false; recognition.interimResults = false; }

  // ── Send Message ──
  document.getElementById("sc-send").addEventListener("click", sendMessage);
  document.getElementById("sc-input").addEventListener("keydown", function(e) {
    if (e.key === "Enter") sendMessage();
  });

  async function sendMessage(textOverride) {
    if (isHandedOver) return;
    var input = document.getElementById("sc-input");
    var msg = (typeof textOverride === "string") ? textOverride : input.value.trim();
    if (!msg) return;
    input.value = "";
    addMessage(msg, "user");
    showTyping();

    try {
      var res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistantId: ASSISTANT_ID, message: msg,
          sessionId: sessionId, channel: "web"
        })
      });
      var data = await res.json();
      hideTyping();
      var reply = data.response || "Sorry, something went wrong.";
      addMessage(reply, "bot");
      // Auto-speak bot replies
      if (window.speechSynthesis) {
        var u = new SpeechSynthesisUtterance(reply);
        u.rate = 1; u.pitch = 1;
        window.speechSynthesis.speak(u);
      }
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
      recognition.stop();
      btn.dataset.recording = "false";
      btn.style.background = "none"; btn.style.color = "#333";
      return;
    }
    btn.dataset.recording = "true";
    btn.style.background = "#ef4444"; btn.style.color = "white";
    recognition.start();
    recognition.onresult = function(e) {
      var text = e.results[0][0].transcript;
      if (text.trim()) sendMessage(text.trim());
    };
    recognition.onend = function() {
      btn.dataset.recording = "false";
      btn.style.background = "none"; btn.style.color = "#333";
    };
    recognition.onerror = function() {
      btn.dataset.recording = "false";
      btn.style.background = "none"; btn.style.color = "#333";
    };
  });

  // ── Voice Output (click speaker icon on bot messages) ──
  function speakText(text, btn) {
    if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); return; }
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 1; u.pitch = 1;
    u.onend = function() { btn.style.opacity = "0.6"; };
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
        body: JSON.stringify({
          assistantId: ASSISTANT_ID, sessionId: sessionId,
          reason: "Customer requested human agent via widget"
        })
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
    div.style.cssText = "margin-bottom:12px;display:flex;" +
      (sender === "user" ? "justify-content:flex-end;" :
       sender === "system" ? "justify-content:center;" : "justify-content:flex-start;");

    if (sender === "system") {
      div.innerHTML = '<div style="background:#fef3c7;color:#92400e;padding:8px 14px;border-radius:10px;font-size:12px;text-align:center;max-width:90%;font-style:italic;">' +
        text.replace(/</g,"&lt;") + '</div>';
    } else if (sender === "bot") {
      div.innerHTML = '<div style="display:flex;align-items:flex-end;gap:4px;">' +
        '<div style="max-width:75%;padding:10px 14px;border-radius:14px;background:#f3f4f6;color:#333;line-height:1.4;">' +
        text.replace(/</g,"&lt;") + '</div>' +
        '<button onclick="(function(b){window.__sayeleSpeak(b.parentElement.querySelector(\\'div\\').innerText,b);})(this)" ' +
        'style="background:none;border:none;cursor:pointer;font-size:14px;opacity:0.6;flex-shrink:0;" title="Listen">&#128264;</button></div>';
    } else {
      div.innerHTML = '<div style="max-width:75%;padding:10px 14px;border-radius:14px;background:' + COLOR + ';color:white;line-height:1.4;">' +
        text.replace(/</g,"&lt;") + '</div>';
    }
    c.appendChild(div); c.scrollTop = c.scrollHeight;
  }

  function showTyping() {
    var c = document.getElementById("sc-messages");
    var div = document.createElement("div");
    div.id = "sc-typing";
    div.style.cssText = "margin-bottom:12px;display:flex;justify-content:flex-start;";
    div.innerHTML = '<div style="padding:10px 18px;border-radius:14px;background:#f3f4f6;color:#999;font-size:13px;">Typing...</div>';
    c.appendChild(div); c.scrollTop = c.scrollHeight;
  }
  function hideTyping() { var t = document.getElementById("sc-typing"); if (t) t.remove(); }

  // Expose speak function globally for inline onclick
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
  const addKnowledge = useMutation(api.aiAssistants.addKnowledge);
  const removeKnowledge = useMutation(api.aiAssistants.removeKnowledge);
  const updateKnowledge = useMutation(api.aiAssistants.updateKnowledge);
  const fetchSource = useAction(api.aiAssistantsActions.fetchSourceContent);
  const [syncing, setSyncing] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (sourceType === "manual" && !content.trim()) { toast.error("Content is required"); return; }
    if ((sourceType === "api" || sourceType === "website") && !sourceUrl.trim()) {
      toast.error("Source URL is required");
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
      toast.success("Knowledge entry added");
      setTitle(""); setContent(""); setCategory(""); setSourceUrl(""); setSourceHeaders("");
      setSourceType("manual"); setShowAdd(false);
    } catch {
      toast.error("Failed to add entry");
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
        toast.success("Content synced successfully");
      } else {
        toast.error(result.error ?? "Sync failed");
      }
    } catch {
      toast.error("Sync failed");
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
          <h3 className="text-lg font-semibold">Knowledge Base</h3>
          <p className="text-sm text-muted-foreground">Feed your assistant with company data from multiple sources</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}><Plus className="h-4 w-4 mr-1" />Add Entry</Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Text</SelectItem>
                  <SelectItem value="api">API Endpoint</SelectItem>
                  <SelectItem value="website">Website URL</SelectItem>
                  <SelectItem value="document">Document / Paste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Business Hours, Return Policy" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. General, Products" />
              </div>
            </div>

            {(sourceType === "api" || sourceType === "website") && (
              <>
                <div className="space-y-2">
                  <Label>Source URL *</Label>
                  <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder={sourceType === "api" ? "https://api.example.com/data" : "https://example.com/about"} />
                </div>
                {sourceType === "api" && (
                  <div className="space-y-2">
                    <Label>Headers (JSON)</Label>
                    <Textarea value={sourceHeaders} onChange={(e) => setSourceHeaders(e.target.value)}
                      placeholder={'{"Authorization": "Bearer YOUR_TOKEN"}'} rows={2} />
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label>{sourceType === "manual" || sourceType === "document" ? "Content *" : "Initial Content (or leave empty to sync)"}</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)}
                placeholder={sourceType === "document" ? "Paste your document content here..." : "Information the assistant should know..."}
                rows={5} />
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>Save Entry</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><BookOpen /></EmptyMedia>
            <EmptyTitle>No knowledge entries</EmptyTitle>
            <EmptyDescription>Add data from text, APIs, documents, or website URLs.</EmptyDescription>
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
                        {entry.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {entry.sourceUrl && (
                      <p className="text-xs text-muted-foreground mb-1 truncate">
                        Source: {entry.sourceUrl}
                      </p>
                    )}
                    {entry.lastSyncedAt && (
                      <p className="text-xs text-muted-foreground mb-1">
                        Last synced: {new Date(entry.lastSyncedAt).toLocaleString()}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-2">{entry.content}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
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
                      if (confirm("Delete this entry?")) {
                        await removeKnowledge({ entryId: entry._id });
                        toast.success("Deleted");
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
    </div>
  );
}

// ─── Tasks Tab ──────────────────────────────────────────────────────────────

type TaskParameter = { name: string; description: string; type: "string" | "number" | "boolean"; required: boolean };

function TasksTab({
  assistantId, clientId, tasks,
}: {
  assistantId: Id<"aiAssistants">;
  clientId: Id<"clients">;
  tasks: Doc<"aiAssistantTasks">[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [httpMethod, setHttpMethod] = useState<HttpMethod>("POST");
  const [headers, setHeaders] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [parameters, setParameters] = useState<TaskParameter[]>([]);
  const createTask = useMutation(api.aiAssistants.createTask);
  const updateTask = useMutation(api.aiAssistants.updateTask);
  const removeTask = useMutation(api.aiAssistants.removeTask);

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

  const handleCreate = async () => {
    if (!name.trim() || !description.trim() || !apiEndpoint.trim()) {
      toast.error("Name, description, and API endpoint are required");
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
      toast.success("Task created");
      resetForm();
    } catch {
      toast.error("Failed to create task");
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
          <h3 className="text-lg font-semibold">Tasks</h3>
          <p className="text-sm text-muted-foreground">
            Define actions the AI can execute via your API endpoints
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" />Add Task
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Task Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Check Order Status" />
              </div>
              <div className="space-y-2">
                <Label>HTTP Method</Label>
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
              <Label>Description * (tells the AI when to use this task)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Look up the status of a customer order by order number" rows={2} />
            </div>

            <div className="space-y-2">
              <Label>API Endpoint *</Label>
              <Input value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder="https://api.yourcompany.com/orders/status" />
            </div>

            <div className="space-y-2">
              <Label>Custom Headers (JSON)</Label>
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
                <Label>Parameters (info the AI needs to collect from user)</Label>
                <Button size="sm" variant="ghost" onClick={addParam}><Plus className="h-3 w-3 mr-1" />Add</Button>
              </div>
              {parameters.map((param, i) => (
                <div key={i} className="flex items-end gap-2 p-3 border rounded-lg">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={param.name} onChange={(e) => updateParam(i, "name", e.target.value)} placeholder="order_id" className="h-8 text-sm" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input value={param.description} onChange={(e) => updateParam(i, "description", e.target.value)} placeholder="The order number" className="h-8 text-sm" />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Type</Label>
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
                    <Label className="text-xs">Required</Label>
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

            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate}>Create Task</Button>
              <Button size="sm" variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tasks.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Zap /></EmptyMedia>
            <EmptyTitle>No tasks defined</EmptyTitle>
            <EmptyDescription>
              Define tasks with your API endpoints so the AI can take action for customers.
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
                        {task.isActive ? "Active" : "Inactive"}
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
                      <span>{task.executionCount} executions</span>
                      {task.lastExecutedAt && <span>Last: {new Date(task.lastExecutedAt).toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button variant="ghost" size="sm" onClick={() =>
                      updateTask({ taskId: task._id, isActive: !task.isActive })
                    }>
                      {task.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      if (confirm("Delete this task?")) {
                        await removeTask({ taskId: task._id });
                        toast.success("Deleted");
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
    </div>
  );
}

// ─── Test Chat Tab ──────────────────────────────────────────────────────────

function TestChatTab({ assistantId }: { assistantId: Id<"aiAssistants"> }) {
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
          toast.error("Recording too short");
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
            toast.error("Could not understand the audio");
          }
        } catch {
          toast.error("Transcription failed");
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied. Please allow microphone access.");
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
      toast.error("No active test session found. Send at least one message first.");
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
        toast.success("Handover requested successfully");
      } else {
        toast.error(result.error ?? "Handover failed");
      }
    } catch {
      toast.error("Failed to request handover");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Test Chat
        </CardTitle>
        <CardDescription>Test your assistant with voice and text. Click the mic to speak.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg flex flex-col h-96">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8 space-y-2">
                <Mic className="h-8 w-8 mx-auto opacity-50" />
                <p>Send a message or tap the mic to speak</p>
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
                  <Spinner /> Transcribing...
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
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={handedOver ? "Conversation handed over" : "Type or speak a message..."}
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
                <CardTitle className="text-base">{session?.visitorName || "Anonymous"} ({session?.channel})</CardTitle>
                <CardDescription>{session?.messageCount} messages</CardDescription>
              </div>
              {session?.status === "handed_over" && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <UserCheck className="h-3 w-3" /> Handed Over
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
          <EmptyTitle>No conversations yet</EmptyTitle>
          <EmptyDescription>Conversations appear here when visitors chat with your assistant.</EmptyDescription>
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
                <p className="font-medium text-sm">{session.visitorName || "Anonymous"}</p>
                <p className="text-xs text-muted-foreground">{session.visitorEmail || session.sessionId.slice(0, 16)}</p>
              </div>
              <div className="text-right flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">{session.channel}</Badge>
                {session.status === "handed_over" && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <UserCheck className="h-3 w-3" /> Handover
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
  const taskMap = new Map(tasks.map((t) => [t._id, t.name]));

  if (logs.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Activity /></EmptyMedia>
          <EmptyTitle>No task executions yet</EmptyTitle>
          <EmptyDescription>Logs appear here when the AI executes tasks during conversations.</EmptyDescription>
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
                <h4 className="font-medium text-sm">{taskMap.get(log.taskId) ?? "Unknown Task"}</h4>
                <Badge variant={log.success ? "default" : "destructive"} className="text-xs">
                  {log.success ? "Success" : "Failed"}
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
      toast.success("You have taken over this conversation");
    } catch {
      toast.error("Failed to take over");
    }
  };

  const handleSendAgentReply = async () => {
    if (!selectedSession || !agentReply.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      await sendAgentMessage({ sessionId: selectedSession, content: agentReply.trim() });
      setAgentReply("");
    } catch {
      toast.error("Failed to send message");
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
                  <CardTitle className="text-base">AI Summary</CardTitle>
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
                  {request.status === "resolved" ? "Resolved" :
                   request.status === "in_progress" ? "Agent Active" :
                   request.status === "email_sent" ? "Email Sent" : "Pending"}
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
                    <UserCheck className="h-4 w-4 mr-1" />Take Over Chat
                  </Button>
                )}
                {request.status !== "resolved" && (
                  <Button size="sm" variant="secondary" onClick={async () => {
                    await resolveHandover({ handoverId: request._id });
                    toast.success("Marked as resolved");
                  }}>
                    <CheckCircle className="h-4 w-4 mr-1" />Mark Resolved
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live conversation with agent reply */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{session?.visitorName || "Anonymous"} - Live Conversation</CardTitle>
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
                    placeholder="Type your reply to the visitor..."
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
          <EmptyTitle>No handover requests</EmptyTitle>
          <EmptyDescription>
            When visitors request to speak with a human agent, their requests appear here with an AI-generated conversation summary.
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
                    {request.status === "resolved" ? "Resolved" :
                     request.status === "in_progress" ? "Agent Active" :
                     request.status === "email_sent" ? "Email Sent" : "Pending"}
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
                      toast.success("Taken over");
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
                      toast.success("Resolved");
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
      toast.success("Training settings saved");
    } catch {
      toast.error("Failed to save training settings");
    }
  };

  const addSampleQA = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error("Both question and answer are required");
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
      toast.error("Both term and definition are required");
      return;
    }
    setVocabulary([...vocabulary, { term: newTerm.trim(), definition: newDefinition.trim() }]);
    setNewTerm("");
    setNewDefinition("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Training & Tone</h3>
        <p className="text-sm text-muted-foreground">
          Train your AI on how to respond based on your company{"'"}s habits, tone, and style.
        </p>
      </div>

      {/* Tone & Language */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Languages className="h-4 w-4" /> Tone & Language
          </CardTitle>
          <CardDescription>Define the voice and style of your assistant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tone Description</Label>
            <Textarea
              value={toneDescription}
              onChange={(e) => setToneDescription(e.target.value)}
              placeholder="Describe how the assistant should communicate. Example: 'Speak like a friendly local shopkeeper. Use short sentences. Add warmth without being overly casual. Use humor sparingly.'"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Describe in detail how you want the AI to sound — personality, formality, warmth, humor, etc.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Response Length</Label>
              <Select value={responseLength} onValueChange={(v) => setResponseLength(v as ResponseLength)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short (1-2 sentences)</SelectItem>
                  <SelectItem value="medium">Medium (2-4 sentences)</SelectItem>
                  <SelectItem value="detailed">Detailed (full explanations)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Primary Language</Label>
              <Input
                value={primaryLanguage}
                onChange={(e) => setPrimaryLanguage(e.target.value)}
                placeholder="e.g. French, English, Arabic"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Greeting Style</Label>
              <Textarea
                value={greetingStyle}
                onChange={(e) => setGreetingStyle(e.target.value)}
                placeholder="e.g. 'Always greet with Bonjour! and the visitor's name if known.'"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Closing Style</Label>
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
            <MessageSquare className="h-4 w-4" /> Example Conversations
          </CardTitle>
          <CardDescription>
            Teach the AI by example — provide sample questions and the ideal response
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sampleQA.map((qa, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <p className="text-sm"><span className="font-medium text-muted-foreground">Customer:</span> {qa.question}</p>
                  <p className="text-sm"><span className="font-medium text-primary">AI:</span> {qa.answer}</p>
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
              <Label className="text-xs">Customer Question</Label>
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="e.g. What are your delivery times?"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Ideal AI Response</Label>
              <Textarea
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="e.g. Our standard delivery takes 2-3 business days within Abidjan. For other cities, it's 5-7 days. Need it faster? We offer express 24h delivery for 2000 FCFA extra!"
                rows={3}
              />
            </div>
            <Button size="sm" onClick={addSampleQA}>
              <Plus className="h-3 w-3 mr-1" />Add Example
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Response Guidelines (Do's) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> Response Guidelines
          </CardTitle>
          <CardDescription>Rules the AI should always follow</CardDescription>
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
            <Ban className="h-4 w-4" /> Restrictions
          </CardTitle>
          <CardDescription>Things the AI should never do</CardDescription>
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
            <BookA className="h-4 w-4" /> Company Vocabulary
          </CardTitle>
          <CardDescription>Terms and definitions the AI should know and use consistently</CardDescription>
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
          Save Training Settings
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
      toast.success("Settings updated");
    } catch {
      toast.error("Failed to update");
    }
  };

  const addDepartment = () => {
    if (!newDeptName.trim() || !newDeptDesc.trim()) {
      toast.error("Department name and description are required");
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
      toast.error("Topic is required");
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
          <CardTitle className="text-base">General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Assistant Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Company Name</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="space-y-2"><Label>Company Description</Label><Textarea value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Industry</Label><Input value={industry} onChange={(e) => setIndustry(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Personality</Label>
              <Select value={personality} onValueChange={(v) => setPersonality(v as Personality)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Welcome Message</Label><Textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={2} /></div>
          <div className="space-y-2">
            <Label>Brand Color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-12 cursor-pointer rounded border" />
              <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
            </div>
          </div>
          <div className="space-y-2"><Label>Custom Instructions</Label><Textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} rows={3} /></div>
        </CardContent>
      </Card>

      {/* Human Handover Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> Handover Settings
          </CardTitle>
          <CardDescription>Configure how conversations are transferred to human agents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Handover Email</Label>
              <Input
                type="email"
                value={handoverEmail}
                onChange={(e) => setHandoverEmail(e.target.value)}
                placeholder="support@yourcompany.com"
              />
              <p className="text-xs text-muted-foreground">
                Email to receive handover notifications with conversation summaries
              </p>
            </div>
            <div className="space-y-2">
              <Label>Phone Number (for call option)</Label>
              <Input
                type="tel"
                value={handoverPhoneNumber}
                onChange={(e) => setHandoverPhoneNumber(e.target.value)}
                placeholder="+225 01 23 45 67 89"
              />
              <p className="text-xs text-muted-foreground">
                Customers can choose to call instead of chatting with an agent
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Specialist Departments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Specialist Departments
          </CardTitle>
          <CardDescription>
            Define departments so the AI can route customers to the right specialist
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
                <Label className="text-xs">Department Name *</Label>
                <Input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="e.g. Sales, Technical Support" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description *</Label>
                <Input value={newDeptDesc} onChange={(e) => setNewDeptDesc(e.target.value)} placeholder="e.g. Handles pricing and quotes" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email (optional)</Label>
                <Input value={newDeptEmail} onChange={(e) => setNewDeptEmail(e.target.value)} placeholder="sales@company.com" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone (optional)</Label>
                <Input value={newDeptPhone} onChange={(e) => setNewDeptPhone(e.target.value)} placeholder="+225 01 23 45 67 89" />
              </div>
            </div>
            <Button size="sm" onClick={addDepartment}><Plus className="h-3 w-3 mr-1" />Add Department</Button>
          </div>
        </CardContent>
      </Card>

      {/* Handover Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4" /> Proactive Handover Subjects
          </CardTitle>
          <CardDescription>
            Topics where the AI should proactively offer to connect the customer with a human specialist
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
                <Label className="text-xs">Topic *</Label>
                <Input value={newSubjectTopic} onChange={(e) => setNewSubjectTopic(e.target.value)}
                  placeholder="e.g. Complaints, Pricing, Account cancellation" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Route to Department</Label>
                <Select value={newSubjectDept || "none"} onValueChange={(v) => setNewSubjectDept(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific department</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Custom AI Message (optional)</Label>
              <Input value={newSubjectMsg} onChange={(e) => setNewSubjectMsg(e.target.value)}
                placeholder="e.g. I'd recommend speaking with our sales team for detailed pricing." />
            </div>
            <Button size="sm" onClick={addSubject}><Plus className="h-3 w-3 mr-1" />Add Subject</Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">Save All Settings</Button>
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
