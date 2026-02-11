import { useState } from "react";
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
} from "lucide-react";

type Personality = "professional" | "friendly" | "casual" | "formal";
type SourceType = "manual" | "api" | "document" | "website";
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

// ─── Main Page (Admin + Client) ────────────────────────────────────────────

function AIAssistantsInner() {
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const clients = useQuery(api.clients.listClients, currentUser?.role === "admin" ? {} : "skip");
  const [selectedClientId, setSelectedClientId] = useState<Id<"clients"> | null>(null);

  // Admin uses listAll with optional filter; client uses listMyAssistants
  const adminAssistants = useQuery(
    api.aiAssistants.listAll,
    currentUser?.role === "admin"
      ? { clientId: selectedClientId ?? undefined }
      : "skip"
  );
  const clientAssistants = useQuery(
    api.aiAssistants.listMyAssistants,
    currentUser?.role === "client" ? {} : "skip"
  );

  const isAdmin = currentUser?.role === "admin";
  const assistants = isAdmin ? adminAssistants : clientAssistants;

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
            {isAdmin
              ? "Create and manage AI chatbots for your clients"
              : "View and manage your AI chatbots"}
          </p>
        </div>
        {isAdmin && selectedClientId && (
          <CreateAssistantDialog clientId={selectedClientId} clientName={selectedClient?.companyName ?? "Client"} />
        )}
      </div>

      {/* Client Selector (Admin only) */}
      {isAdmin && (
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
              {isAdmin
                ? selectedClientId
                  ? "Create an AI assistant for this client."
                  : "Select a client to create an assistant, or view all assistants."
                : "No AI assistants have been set up for your company yet. Contact your administrator."}
            </EmptyDescription>
          </EmptyHeader>
          {isAdmin && selectedClientId && (
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
  onClick,
}: {
  assistant: Doc<"aiAssistants">;
  clients: Doc<"clients">[] | undefined;
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
              <CardDescription className="text-xs">{clientName}</CardDescription>
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
}: {
  assistantId: Id<"aiAssistants">;
  onBack: () => void;
  isAdmin: boolean;
}) {
  const assistant = useQuery(api.aiAssistants.getById, { assistantId });
  const knowledgeBase = useQuery(api.aiAssistants.getKnowledgeBase, { assistantId });
  const tasks = useQuery(api.aiAssistants.getTasks, { assistantId });
  const sessions = useQuery(api.aiAssistants.getChatSessions, { assistantId });
  const executionLogs = useQuery(api.aiAssistants.getTaskExecutionLogs, { assistantId });
  const updateAssistant = useMutation(api.aiAssistants.update);
  const deleteAssistant = useMutation(api.aiAssistants.remove);
  const clients = useQuery(api.clients.listClients, isAdmin ? {} : "skip");

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
              {isAdmin && <p className="text-sm text-muted-foreground">Client: {clientName}</p>}
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
        {isAdmin && (
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
          <TabsTrigger value="tasks"><Zap className="h-4 w-4 mr-1" />Tasks</TabsTrigger>
          <TabsTrigger value="test"><MessageSquare className="h-4 w-4 mr-1" />Test Chat</TabsTrigger>
          <TabsTrigger value="conversations"><Eye className="h-4 w-4 mr-1" />Conversations</TabsTrigger>
          <TabsTrigger value="logs"><Activity className="h-4 w-4 mr-1" />Execution Logs</TabsTrigger>
          <TabsTrigger value="api"><Code className="h-4 w-4 mr-1" />API / Integration</TabsTrigger>
          <TabsTrigger value="settings"><Pencil className="h-4 w-4 mr-1" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge" className="mt-4">
          <KnowledgeBaseTab assistantId={assistantId} clientId={assistant.clientId} entries={knowledgeBase ?? []} />
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

  const widgetExample = `<!-- Embed Chat Widget -->
<script>
(function() {
  const ASSISTANT_ID = "${assistantId}";
  const API_URL = "${API_BASE}/api/v1/ai/chat";
  let sessionId = "widget_" + Date.now() + "_" + Math.random().toString(36).slice(2);

  // Create chat widget UI
  const widget = document.createElement("div");
  widget.id = "sayele-chat-widget";
  widget.innerHTML = \`
    <div style="position:fixed;bottom:20px;right:20px;z-index:9999;">
      <div id="chat-popup" style="display:none;width:380px;height:500px;
        border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.15);
        background:#fff;flex-direction:column;overflow:hidden;">
        <div style="background:${assistant.primaryColor ?? "#3B82F6"};color:white;
          padding:16px;font-weight:bold;display:flex;justify-content:space-between;">
          <span>${assistant.name}</span>
          <button onclick="document.getElementById('chat-popup').style.display='none'"
            style="background:none;border:none;color:white;cursor:pointer;font-size:18px;">&#10005;</button>
        </div>
        <div id="chat-messages" style="flex:1;overflow-y:auto;padding:16px;"></div>
        <div style="padding:12px;border-top:1px solid #eee;display:flex;gap:8px;">
          <input id="chat-input" type="text" placeholder="Type a message..."
            style="flex:1;padding:8px 12px;border:1px solid #ddd;border-radius:8px;outline:none;" />
          <button id="chat-send" style="background:${assistant.primaryColor ?? "#3B82F6"};
            color:white;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;">Send</button>
        </div>
      </div>
      <button id="chat-toggle" onclick="
        var p=document.getElementById('chat-popup');
        p.style.display=p.style.display==='none'?'flex':'none';"
        style="width:60px;height:60px;border-radius:50%;
        background:${assistant.primaryColor ?? "#3B82F6"};color:white;
        border:none;cursor:pointer;font-size:24px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
        &#128172;
      </button>
    </div>\`;
  document.body.appendChild(widget);

  // Chat logic
  document.getElementById("chat-send").addEventListener("click", sendMessage);
  document.getElementById("chat-input").addEventListener("keydown", function(e) {
    if (e.key === "Enter") sendMessage();
  });

  async function sendMessage() {
    const input = document.getElementById("chat-input");
    const msg = input.value.trim();
    if (!msg) return;
    input.value = "";
    addMessage(msg, "user");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistantId: ASSISTANT_ID,
          message: msg,
          sessionId: sessionId,
          channel: "web"
        })
      });
      const data = await res.json();
      addMessage(data.response || "Sorry, something went wrong.", "bot");
      sessionId = data.sessionId || sessionId;
    } catch (err) {
      addMessage("Connection error. Please try again.", "bot");
    }
  }

  function addMessage(text, sender) {
    const container = document.getElementById("chat-messages");
    const div = document.createElement("div");
    div.style.cssText = "margin-bottom:12px;display:flex;" +
      (sender === "user" ? "justify-content:flex-end;" : "justify-content:flex-start;");
    div.innerHTML = '<div style="max-width:80%;padding:10px 14px;border-radius:12px;font-size:14px;' +
      (sender === "user"
        ? 'background:${assistant.primaryColor ?? "#3B82F6"};color:white;'
        : 'background:#f0f0f0;color:#333;') +
      '">' + text.replace(/</g,"&lt;") + '</div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }
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
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const testChat = useAction(api.aiAssistantsActions.testChat);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    try {
      const result = await testChat({ assistantId, message: userMessage });
      setMessages((prev) => [...prev, { role: "assistant", content: result.response }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Test Chat</CardTitle>
        <CardDescription>Test your assistant with knowledge base and tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg flex flex-col h-96">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">Send a message to test</div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2"><Spinner /></div>
              </div>
            )}
          </div>
          <div className="border-t p-3 flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a test message..."
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              disabled={isLoading} />
            <Button size="sm" onClick={handleSend} disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
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
            <CardTitle className="text-base">{session?.visitorName || "Anonymous"} ({session?.channel})</CardTitle>
            <CardDescription>{session?.messageCount} messages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {chatMessages.map((msg) => (
                <div key={msg._id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
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
              <div className="text-right">
                <Badge variant="outline" className="text-xs capitalize">{session.channel}</Badge>
                <p className="text-xs text-muted-foreground mt-1">{session.messageCount} msgs</p>
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

// ─── Settings Tab ───────────────────────────────────────────────────────────

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
  const updateAssistant = useMutation(api.aiAssistants.update);

  const handleSave = async () => {
    try {
      await updateAssistant({
        assistantId: assistant._id, name: name.trim(), description: description.trim() || undefined,
        companyName: companyName.trim(), companyDescription: companyDescription.trim() || undefined,
        industry: industry.trim() || undefined, welcomeMessage: welcomeMessage.trim() || undefined,
        personality, primaryColor, customInstructions: customInstructions.trim() || undefined,
      });
      toast.success("Settings updated");
    } catch {
      toast.error("Failed to update");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assistant Settings</CardTitle>
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
        <Button onClick={handleSave}>Save Changes</Button>
      </CardContent>
    </Card>
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
