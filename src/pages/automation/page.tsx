import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePagination } from "@/hooks/use-pagination.ts";
import PaginationControls from "@/components/ui/pagination-controls.tsx";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Zap,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  MessageSquare,
  Clock,
  Hash,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

export default function AutomationPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<Id<"automationRules"> | null>(null);

  const rules = useQuery(api.automation.listAutomationRules);
  const stats = useQuery(api.automation.getAutomationStats);
  const templates = useQuery(api.templates.listTemplates);
  const groups = useQuery(api.contactGroups.listGroups, {});

  const createRule = useMutation(api.automation.createAutomationRule);
  const updateRule = useMutation(api.automation.updateAutomationRule);
  const deleteRule = useMutation(api.automation.deleteAutomationRule);
  const toggleRule = useMutation(api.automation.toggleAutomationRule);

  const handleCreateRule = async (data: Parameters<typeof createRule>[0]) => {
    try {
      await createRule(data);
      setIsCreateDialogOpen(false);
      toast.success("Automation rule created");
    } catch (error) {
      toast.error("Failed to create rule");
      console.error(error);
    }
  };

  const handleUpdateRule = async (ruleId: Id<"automationRules">, data: Omit<Parameters<typeof updateRule>[0], "ruleId">) => {
    try {
      await updateRule({ ruleId, ...data });
      setEditingRuleId(null);
      toast.success("Rule updated");
    } catch (error) {
      toast.error("Failed to update rule");
      console.error(error);
    }
  };

  const handleDeleteRule = async (ruleId: Id<"automationRules">) => {
    if (!confirm("Are you sure you want to delete this automation rule?")) return;
    
    try {
      await deleteRule({ ruleId });
      toast.success("Rule deleted");
    } catch (error) {
      toast.error("Failed to delete rule");
      console.error(error);
    }
  };

  const handleToggleRule = async (ruleId: Id<"automationRules">) => {
    try {
      await toggleRule({ ruleId });
      toast.success("Rule status updated");
    } catch (error) {
      toast.error("Failed to update rule");
      console.error(error);
    }
  };

  if (rules === undefined || stats === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const pagination = usePagination(rules, { pageSize: 15 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automation</h1>
          <p className="text-muted-foreground mt-1">
            Set up automated responses and workflows
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Automation Rule</DialogTitle>
              <DialogDescription>
                Automatically respond to incoming messages based on triggers
              </DialogDescription>
            </DialogHeader>
            <AutomationRuleForm
              templates={templates || []}
              groups={groups || []}
              onSubmit={handleCreateRule}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRules}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRules}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Triggers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTriggers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Rules</CardTitle>
          <CardDescription>
            Manage your automated message workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No automation rules yet</h3>
              <p className="text-muted-foreground mt-2">
                Create your first rule to automate message responses
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="mt-4"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {pagination.paginatedItems.map((rule) => (
                <div
                  key={rule._id}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{rule.name}</h3>
                      <Badge variant={rule.isActive ? "default" : "secondary"}>
                        {rule.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {rule.channel && (
                        <Badge variant="outline">{rule.channel}</Badge>
                      )}
                    </div>
                    {rule.description && (
                      <p className="text-sm text-muted-foreground">
                        {rule.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Trigger: {formatTriggerType(rule.triggerType)}
                        {rule.keywords && rule.keywords.length > 0 && (
                          <> ({rule.keywords.join(", ")})</>
                        )}
                      </span>
                      <span>Action: {formatActionType(rule.actionType)}</span>
                      <span>Triggered: {rule.triggerCount}x</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => handleToggleRule(rule._id)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setEditingRuleId(rule._id)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteRule(rule._id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
              <PaginationControls {...pagination} itemLabel="rules" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingRuleId && (
        <Dialog
          open={editingRuleId !== null}
          onOpenChange={(open) => !open && setEditingRuleId(null)}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Automation Rule</DialogTitle>
              <DialogDescription>
                Update your automation rule settings
              </DialogDescription>
            </DialogHeader>
            <AutomationRuleForm
              ruleId={editingRuleId}
              templates={templates || []}
              groups={groups || []}
              onSubmit={(data) => handleUpdateRule(editingRuleId, data)}
              onCancel={() => setEditingRuleId(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AutomationRuleForm({
  ruleId,
  templates,
  groups,
  onSubmit,
  onCancel,
}: {
  ruleId?: Id<"automationRules">;
  templates: Array<{ _id: Id<"templates">; name: string; message: string }>;
  groups: Array<{ _id: Id<"contactGroups">; name: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const existingRule = useQuery(
    api.automation.getAutomationRule,
    ruleId ? { ruleId } : "skip"
  );

  const [name, setName] = useState(existingRule?.name || "");
  const [description, setDescription] = useState(existingRule?.description || "");
  const [triggerType, setTriggerType] = useState<string>(
    existingRule?.triggerType || "keyword"
  );
  const [keywords, setKeywords] = useState(
    existingRule?.keywords?.join(", ") || ""
  );
  const [matchType, setMatchType] = useState(existingRule?.matchType || "contains");
  const [channel, setChannel] = useState(existingRule?.channel || "sms");
  const [actionType, setActionType] = useState(existingRule?.actionType || "send_reply");
  const [replyMessage, setReplyMessage] = useState(existingRule?.replyMessage || "");
  const [replyTemplateId, setReplyTemplateId] = useState<string>(
    existingRule?.replyTemplateId || ""
  );
  const [forwardNumbers, setForwardNumbers] = useState(
    existingRule?.forwardToNumbers?.join(", ") || ""
  );
  const [addToGroupId, setAddToGroupId] = useState<string>(
    existingRule?.addToGroupId || ""
  );
  const [addTags, setAddTags] = useState(existingRule?.addTags?.join(", ") || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {
      name,
      description,
      triggerType,
      matchType,
      channel,
      actionType,
    };

    // Add trigger-specific fields
    if (triggerType === "keyword") {
      data.keywords = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    }

    // Add action-specific fields
    if (actionType === "send_reply") {
      if (replyTemplateId) {
        data.replyTemplateId = replyTemplateId as Id<"templates">;
      } else {
        data.replyMessage = replyMessage;
      }
    } else if (actionType === "forward_to_human") {
      data.forwardToNumbers = forwardNumbers
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
    } else if (actionType === "add_to_group") {
      data.addToGroupId = addToGroupId as Id<"contactGroups">;
    } else if (actionType === "tag_contact") {
      data.addTags = addTags.split(",").map((t) => t.trim()).filter(Boolean);
    }

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Rule Name*</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Welcome message"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Send welcome message to new contacts"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="channel">Channel</Label>
          <Select
            value={channel}
            onValueChange={(v) =>
              setChannel(
                v as "sms" | "whatsapp" | "telegram" | "facebook_messenger"
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="facebook_messenger">Messenger</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="triggerType">Trigger Type*</Label>
          <Select value={triggerType} onValueChange={setTriggerType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="keyword">Keyword Match</SelectItem>
              <SelectItem value="any_message">Any Message</SelectItem>
              <SelectItem value="first_message">First Message</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {triggerType === "keyword" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (comma-separated)*</Label>
            <Input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="hello, hi, help"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="matchType">Match Type</Label>
            <Select
              value={matchType}
              onValueChange={(v) =>
                setMatchType(
                  v as "exact" | "contains" | "starts_with" | "ends_with"
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="exact">Exact Match</SelectItem>
                <SelectItem value="starts_with">Starts With</SelectItem>
                <SelectItem value="ends_with">Ends With</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="actionType">Action*</Label>
        <Select
          value={actionType}
          onValueChange={(v) =>
            setActionType(
              v as
                | "send_reply"
                | "forward_to_human"
                | "add_to_group"
                | "tag_contact"
            )
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="send_reply">Send Auto-Reply</SelectItem>
            <SelectItem value="forward_to_human">Forward to Human</SelectItem>
            <SelectItem value="add_to_group">Add to Group</SelectItem>
            <SelectItem value="tag_contact">Tag Contact</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {actionType === "send_reply" && (
        <>
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="template">Use Template (optional)</Label>
              <Select value={replyTemplateId} onValueChange={setReplyTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None - Use custom message</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template._id} value={template._id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!replyTemplateId && (
            <div className="space-y-2">
              <Label htmlFor="replyMessage">Reply Message*</Label>
              <Textarea
                id="replyMessage"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Thank you for your message! We'll get back to you soon."
                rows={3}
                required={!replyTemplateId}
              />
            </div>
          )}
        </>
      )}

      {actionType === "forward_to_human" && (
        <div className="space-y-2">
          <Label htmlFor="forwardNumbers">
            Forward to Numbers (comma-separated)*
          </Label>
          <Input
            id="forwardNumbers"
            value={forwardNumbers}
            onChange={(e) => setForwardNumbers(e.target.value)}
            placeholder="+1234567890, +0987654321"
            required
          />
        </div>
      )}

      {actionType === "add_to_group" && (
        <div className="space-y-2">
          <Label htmlFor="addToGroupId">Add to Group*</Label>
          <Select value={addToGroupId} onValueChange={setAddToGroupId}>
            <SelectTrigger>
              <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group._id} value={group._id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {actionType === "tag_contact" && (
        <div className="space-y-2">
          <Label htmlFor="addTags">Tags (comma-separated)*</Label>
          <Input
            id="addTags"
            value={addTags}
            onChange={(e) => setAddTags(e.target.value)}
            placeholder="new-customer, interested, follow-up"
            required
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {ruleId ? "Update Rule" : "Create Rule"}
        </Button>
      </div>
    </form>
  );
}

function formatTriggerType(type: string): string {
  switch (type) {
    case "keyword":
      return "Keyword Match";
    case "any_message":
      return "Any Message";
    case "first_message":
      return "First Message";
    case "time_based":
      return "Time-Based";
    default:
      return type;
  }
}

function formatActionType(type: string): string {
  switch (type) {
    case "send_reply":
      return "Send Auto-Reply";
    case "forward_to_human":
      return "Forward to Human";
    case "add_to_group":
      return "Add to Group";
    case "tag_contact":
      return "Tag Contact";
    default:
      return type;
  }
}
