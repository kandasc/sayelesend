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
import { Switch } from "@/components/ui/switch.tsx";
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
} from "lucide-react";

type Personality = "professional" | "friendly" | "casual" | "formal";

function AIAssistantsInner() {
  const effectiveUser = useQuery(api.testMode.getEffectiveUser, {});
  const clientId = effectiveUser?.clientId;
  const assistants = useQuery(
    api.aiAssistants.listByClient,
    clientId ? { clientId } : "skip"
  );

  const [selectedAssistant, setSelectedAssistant] = useState<Id<"aiAssistants"> | null>(null);

  if (!clientId) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Bot /></EmptyMedia>
          <EmptyTitle>No client account</EmptyTitle>
          <EmptyDescription>You need a client account to use AI Assistants.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (assistants === undefined) {
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
        clientId={clientId}
        onBack={() => setSelectedAssistant(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Assistants</h1>
          <p className="text-muted-foreground mt-1">
            Create intelligent chatbots powered by your company data
          </p>
        </div>
        <CreateAssistantDialog clientId={clientId} />
      </div>

      {assistants.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Bot /></EmptyMedia>
            <EmptyTitle>No AI assistants yet</EmptyTitle>
            <EmptyDescription>
              Create your first AI assistant to help respond to customers automatically.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreateAssistantDialog clientId={clientId} />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assistants.map((assistant) => (
            <Card
              key={assistant._id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedAssistant(assistant._id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: assistant.primaryColor
                          ? `${assistant.primaryColor}20`
                          : "hsl(var(--primary) / 0.1)",
                      }}
                    >
                      <Bot
                        className="h-5 w-5"
                        style={{ color: assistant.primaryColor || "hsl(var(--primary))" }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base">{assistant.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {assistant.companyName}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={assistant.isActive ? "default" : "secondary"}>
                    {assistant.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {assistant.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {assistant.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {assistant.totalConversations} chats
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    {assistant.totalMessages} messages
                  </span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {assistant.personality}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create Dialog ──────────────────────────────────────────────────────────

function CreateAssistantDialog({ clientId }: { clientId: Id<"clients"> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
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
        primaryColor: primaryColor || undefined,
        customInstructions: customInstructions.trim() || undefined,
      });
      toast.success("AI Assistant created!");
      setOpen(false);
      resetForm();
    } catch {
      toast.error("Failed to create assistant");
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCompanyName("");
    setCompanyDescription("");
    setIndustry("");
    setWelcomeMessage("");
    setPersonality("professional");
    setPrimaryColor("#3B82F6");
    setCustomInstructions("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Assistant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create AI Assistant</DialogTitle>
          <DialogDescription>
            Set up a new AI chatbot powered by your company data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assistant Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Support Bot, Sales Assistant"
              />
            </div>
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Short Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this assistant does"
            />
          </div>

          <div className="space-y-2">
            <Label>Company Description</Label>
            <Textarea
              value={companyDescription}
              onChange={(e) => setCompanyDescription(e.target.value)}
              placeholder="Describe your company, products, services..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Technology, Healthcare"
              />
            </div>
            <div className="space-y-2">
              <Label>Personality</Label>
              <Select value={personality} onValueChange={(v) => setPersonality(v as Personality)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
            <Textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="The first message visitors see when they open the chat"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Brand Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded border"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1"
                placeholder="#3B82F6"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custom Instructions</Label>
            <Textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Additional rules or behavior. E.g. 'Always suggest scheduling a demo call.'"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create Assistant</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assistant Detail ───────────────────────────────────────────────────────

function AssistantDetail({
  assistantId,
  clientId,
  onBack,
}: {
  assistantId: Id<"aiAssistants">;
  clientId: Id<"clients">;
  onBack: () => void;
}) {
  const assistant = useQuery(api.aiAssistants.getById, { assistantId });
  const knowledgeBase = useQuery(api.aiAssistants.getKnowledgeBase, { assistantId });
  const sessions = useQuery(api.aiAssistants.getChatSessions, { assistantId });
  const updateAssistant = useMutation(api.aiAssistants.update);
  const deleteAssistant = useMutation(api.aiAssistants.remove);

  if (assistant === undefined) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!assistant) {
    return (
      <div className="text-center py-8">
        <p>Assistant not found.</p>
        <Button variant="ghost" onClick={onBack} className="mt-2">
          Go back
        </Button>
      </div>
    );
  }

  const handleToggleActive = async () => {
    await updateAssistant({ assistantId, isActive: !assistant.isActive });
    toast.success(assistant.isActive ? "Assistant deactivated" : "Assistant activated");
  };

  const handleDelete = async () => {
    if (!confirm("Delete this assistant and all its data? This cannot be undone.")) return;
    try {
      await deleteAssistant({ assistantId });
      toast.success("Assistant deleted");
      onBack();
    } catch {
      toast.error("Failed to delete assistant");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: assistant.primaryColor
                  ? `${assistant.primaryColor}20`
                  : "hsl(var(--primary) / 0.1)",
              }}
            >
              <Bot
                className="h-5 w-5"
                style={{ color: assistant.primaryColor || "hsl(var(--primary))" }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{assistant.name}</h1>
              <p className="text-sm text-muted-foreground">{assistant.companyName}</p>
            </div>
            <Badge variant={assistant.isActive ? "default" : "secondary"}>
              {assistant.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleToggleActive}>
            {assistant.isActive ? (
              <><PowerOff className="h-4 w-4 mr-1" /> Deactivate</>
            ) : (
              <><Power className="h-4 w-4 mr-1" /> Activate</>
            )}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{assistant.totalConversations}</div>
            <p className="text-xs text-muted-foreground">Total Conversations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{assistant.totalMessages}</div>
            <p className="text-xs text-muted-foreground">Total Messages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{knowledgeBase?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">Knowledge Entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold capitalize">{assistant.personality}</div>
            <p className="text-xs text-muted-foreground">Personality</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="knowledge">
        <TabsList>
          <TabsTrigger value="knowledge">
            <Brain className="h-4 w-4 mr-1" /> Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="test">
            <MessageSquare className="h-4 w-4 mr-1" /> Test Chat
          </TabsTrigger>
          <TabsTrigger value="conversations">
            <Eye className="h-4 w-4 mr-1" /> Conversations
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Pencil className="h-4 w-4 mr-1" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge" className="mt-4">
          <KnowledgeBaseTab assistantId={assistantId} clientId={clientId} entries={knowledgeBase ?? []} />
        </TabsContent>

        <TabsContent value="test" className="mt-4">
          <TestChatTab assistantId={assistantId} />
        </TabsContent>

        <TabsContent value="conversations" className="mt-4">
          <ConversationsTab sessions={sessions ?? []} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <SettingsTab assistant={assistant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Knowledge Base Tab ─────────────────────────────────────────────────────

function KnowledgeBaseTab({
  assistantId,
  clientId,
  entries,
}: {
  assistantId: Id<"aiAssistants">;
  clientId: Id<"clients">;
  entries: Doc<"aiKnowledgeBase">[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const addKnowledge = useMutation(api.aiAssistants.addKnowledge);
  const removeKnowledge = useMutation(api.aiAssistants.removeKnowledge);
  const updateKnowledge = useMutation(api.aiAssistants.updateKnowledge);

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    try {
      await addKnowledge({
        assistantId,
        clientId,
        title: title.trim(),
        content: content.trim(),
        category: category.trim() || undefined,
      });
      toast.success("Knowledge entry added");
      setTitle("");
      setContent("");
      setCategory("");
      setShowAdd(false);
    } catch {
      toast.error("Failed to add entry");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Knowledge Base</h3>
          <p className="text-sm text-muted-foreground">
            Add information your assistant should know about
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Entry
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Business Hours, Return Policy"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. General, Products, Support"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Detailed information the assistant should know..."
                rows={5}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd}>Save Entry</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><BookOpen /></EmptyMedia>
            <EmptyTitle>No knowledge entries</EmptyTitle>
            <EmptyDescription>
              Add information about your products, services, FAQs, and policies.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry._id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{entry.title}</h4>
                      {entry.category && (
                        <Badge variant="outline" className="text-xs">
                          {entry.category}
                        </Badge>
                      )}
                      <Badge
                        variant={entry.isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {entry.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {entry.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateKnowledge({
                          entryId: entry._id,
                          isActive: !entry.isActive,
                        })
                      }
                    >
                      {entry.isActive ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (confirm("Delete this knowledge entry?")) {
                          await removeKnowledge({ entryId: entry._id });
                          toast.success("Entry deleted");
                        }
                      }}
                    >
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
      toast.error("Failed to get response");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Test Chat</CardTitle>
        <CardDescription>Test your assistant before deploying it</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg flex flex-col h-96">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                Send a message to test your assistant
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Spinner />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a test message..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isLoading}
            />
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
  const chatMessages = useQuery(
    api.aiAssistants.getChatMessages,
    selectedSession ? { sessionId: selectedSession } : "skip"
  );

  if (selectedSession && chatMessages) {
    const session = sessions.find((s) => s._id === selectedSession);
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to conversations
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {session?.visitorName || "Anonymous"} - {session?.channel}
            </CardTitle>
            <CardDescription>
              {session?.messageCount} messages
              {session?.lastMessageAt && ` · Last: ${new Date(session.lastMessageAt).toLocaleString()}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {chatMessages.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
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
          <EmptyDescription>
            Conversations will appear here once visitors start chatting with your assistant.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <Card
          key={session._id}
          className="cursor-pointer hover:shadow-sm transition-shadow"
          onClick={() => setSelectedSession(session._id)}
        >
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">
                  {session.visitorName || "Anonymous Visitor"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.visitorEmail || session.visitorPhone || session.sessionId.slice(0, 16)}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-xs capitalize">
                  {session.channel}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {session.messageCount} messages
                </p>
              </div>
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
        assistantId: assistant._id,
        name: name.trim(),
        description: description.trim() || undefined,
        companyName: companyName.trim(),
        companyDescription: companyDescription.trim() || undefined,
        industry: industry.trim() || undefined,
        welcomeMessage: welcomeMessage.trim() || undefined,
        personality,
        primaryColor: primaryColor || undefined,
        customInstructions: customInstructions.trim() || undefined,
      });
      toast.success("Settings updated");
    } catch {
      toast.error("Failed to update settings");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assistant Settings</CardTitle>
        <CardDescription>Update your assistant configuration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Assistant Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Company Description</Label>
          <Textarea
            value={companyDescription}
            onChange={(e) => setCompanyDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Industry</Label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Personality</Label>
            <Select value={personality} onValueChange={(v) => setPersonality(v as Personality)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
          <Textarea
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Brand Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded border"
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Custom Instructions</Label>
          <Textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            rows={3}
            placeholder="Additional behavioral rules for the assistant"
          />
        </div>

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
