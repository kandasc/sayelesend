import { Authenticated } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useIntl } from "react-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { FileText, Plus, Edit, Trash2, Search, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { usePagination } from "@/hooks/use-pagination.ts";
import PaginationControls from "@/components/ui/pagination-controls.tsx";

export default function Templates() {
  return (
    <Authenticated>
      <TemplatesContent />
    </Authenticated>
  );
}

function TemplatesContent() {
  const intl = useIntl();
  const templates = useQuery(api.templates.listTemplates);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);

  const filteredTemplates = templates?.filter((t) =>
    t.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    t.message.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const pagination = usePagination(filteredTemplates, { pageSize: 15 });

  if (templates === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{intl.formatMessage({ id: "page.templates.title" })}</h1>
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: "page.templates.subtitle" })}
          </p>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{intl.formatMessage({ id: "page.templates.title" })}</h1>
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: "page.templates.subtitle" })}
          </p>
        </div>
        <CreateTemplateDialog />
      </div>

      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                {intl.formatMessage({ id: "page.templates.usingVariables" })}
              </p>
              <p className="text-blue-800 dark:text-blue-200">
                Add variables to your templates using curly braces like <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">{"{name}"}</code>, <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">{"{code}"}</code>, or <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">{"{amount}"}</code>. These will be automatically detected and can be replaced with actual values when sending messages.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={intl.formatMessage({ id: "page.templates.searchPlaceholder" })}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {!filteredTemplates || filteredTemplates.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>
              {searchQuery
                ? intl.formatMessage({ id: "page.templates.noTemplatesSearch" })
                : intl.formatMessage({ id: "page.templates.noTemplates" })}
            </EmptyTitle>
            <EmptyDescription>
              {searchQuery
                ? intl.formatMessage({ id: "page.templates.tryAdjusting" })
                : intl.formatMessage({ id: "page.templates.noTemplatesDesc" })}
            </EmptyDescription>
          </EmptyHeader>
          {!searchQuery && (
            <EmptyContent>
              <CreateTemplateDialog />
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {pagination.paginatedItems.map((template) => (
              <TemplateCard key={template._id} template={template} />
            ))}
          </div>
          <PaginationControls {...pagination} itemLabel="templates" />
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template }: { template: { _id: Id<"templates">; name: string; message: string; variables: string[] } }) {
  const intl = useIntl();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteTemplate = useMutation(api.templates.deleteTemplate);

  const handleDelete = async () => {
    try {
      await deleteTemplate({ templateId: template._id });
      toast.success(intl.formatMessage({ id: "page.templates.templateDeleted" }));
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {template.message}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <EditTemplateDialog template={template} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {template.variables.length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">{intl.formatMessage({ id: "page.templates.variables" })}</span>
              {template.variables.map((variable) => (
                <Badge key={variable} variant="secondary">
                  {"{" + variable + "}"}
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{intl.formatMessage({ id: "page.templates.deleteTemplate" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {intl.formatMessage({ id: "page.templates.deleteConfirm" }, { name: template.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{intl.formatMessage({ id: "buttons.cancel" })}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{intl.formatMessage({ id: "page.templates.deleteTemplate" })}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CreateTemplateDialog() {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const createTemplate = useMutation(api.templates.createTemplate);
  const variables = useQuery(api.templates.extractVariables, message ? { message } : "skip");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !message.trim()) {
      toast.error(intl.formatMessage({ id: "page.templates.fillAllFields" }));
      return;
    }

    try {
      await createTemplate({
        name: name.trim(),
        message: message.trim(),
        variables: variables || [],
      });
      toast.success(intl.formatMessage({ id: "page.templates.templateCreated" }));
      setOpen(false);
      setName("");
      setMessage("");
    } catch (error) {
      toast.error("Failed to create template");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {intl.formatMessage({ id: "page.templates.createTemplate" })}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: "page.templates.createTemplate" })}</DialogTitle>
            <DialogDescription>
              {intl.formatMessage({ id: "page.templates.createReusable" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{intl.formatMessage({ id: "page.templates.templateName" })}</Label>
              <Input
                id="name"
                placeholder="Welcome Message"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Hello {name}, your verification code is {code}. It expires in {minutes} minutes."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{variable}"} to add placeholders. Example: {"{name}"}, {"{code}"}, {"{amount}"}
              </p>
            </div>
            {variables && variables.length > 0 && (
              <div className="space-y-2">
                <Label>{intl.formatMessage({ id: "page.templates.detectedVariables" })}</Label>
                <div className="flex flex-wrap gap-2">
                  {variables.map((variable) => (
                    <Badge key={variable} variant="secondary">
                      {"{" + variable + "}"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {intl.formatMessage({ id: "buttons.cancel" })}
            </Button>
            <Button type="submit">{intl.formatMessage({ id: "page.templates.createTemplate" })}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditTemplateDialog({ template }: { template: { _id: Id<"templates">; name: string; message: string; variables: string[] } }) {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(template.name);
  const [message, setMessage] = useState(template.message);
  const updateTemplate = useMutation(api.templates.updateTemplate);
  const variables = useQuery(api.templates.extractVariables, message ? { message } : "skip");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !message.trim()) {
      toast.error(intl.formatMessage({ id: "page.templates.fillAllFields" }));
      return;
    }

    try {
      await updateTemplate({
        templateId: template._id,
        name: name.trim(),
        message: message.trim(),
        variables: variables || [],
      });
      toast.success(intl.formatMessage({ id: "page.templates.templateUpdated" }));
      setOpen(false);
    } catch (error) {
      toast.error("Failed to update template");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{intl.formatMessage({ id: "page.templates.editTemplate" })}</DialogTitle>
            <DialogDescription>
              {intl.formatMessage({ id: "page.templates.updateTemplate" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{intl.formatMessage({ id: "page.templates.templateName" })}</Label>
              <Input
                id="edit-name"
                placeholder="Welcome Message"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-message">Message</Label>
              <Textarea
                id="edit-message"
                placeholder="Hello {name}, your verification code is {code}."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{variable}"} to add placeholders. Example: {"{name}"}, {"{code}"}, {"{amount}"}
              </p>
            </div>
            {variables && variables.length > 0 && (
              <div className="space-y-2">
                <Label>{intl.formatMessage({ id: "page.templates.detectedVariables" })}</Label>
                <div className="flex flex-wrap gap-2">
                  {variables.map((variable) => (
                    <Badge key={variable} variant="secondary">
                      {"{" + variable + "}"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {intl.formatMessage({ id: "buttons.cancel" })}
            </Button>
            <Button type="submit">{intl.formatMessage({ id: "page.templates.editTemplate" })}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
