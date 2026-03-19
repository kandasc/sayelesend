import { Authenticated } from "convex/react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
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
  FileText,
  Sparkles,
  Copy,
  Check,
  Heart,
  Trash2,
  Presentation,
  Gavel,
  BarChart3,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Wand2,
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useIntl } from "react-intl";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

// ─── Types ───────────────────────────────────────────────────

type DocumentSection = {
  title: string;
  content: string;
};

type DocumentType = "product_presentation" | "tender_response" | "techno_commercial";

// ─── Constants ───────────────────────────────────────────────

const DOCUMENT_TYPES = [
  {
    value: "product_presentation" as const,
    labelKey: "page.docAgent.productPresentation",
    descKey: "page.docAgent.productPresentationDesc",
    icon: <Presentation className="h-5 w-5" />,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    value: "tender_response" as const,
    labelKey: "page.docAgent.tenderResponse",
    descKey: "page.docAgent.tenderResponseDesc",
    icon: <Gavel className="h-5 w-5" />,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    value: "techno_commercial" as const,
    labelKey: "page.docAgent.technoCommercial",
    descKey: "page.docAgent.technoCommercialDesc",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
] as const;

const LANGUAGES = [
  { value: "Français", label: "Français" },
  { value: "English", label: "English" },
  { value: "Arabic", label: "العربية" },
  { value: "Spanish", label: "Español" },
  { value: "Portuguese", label: "Português" },
] as const;

function getDocTypeInfo(docType: string) {
  return DOCUMENT_TYPES.find((d) => d.value === docType) || DOCUMENT_TYPES[0];
}

// ─── Main Export ─────────────────────────────────────────────

export default function DocumentAgent() {
  return (
    <Authenticated>
      <DocumentAgentContent />
    </Authenticated>
  );
}

// ─── Document Agent Content ─────────────────────────────────

function DocumentAgentContent() {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState("create");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" />
          {intl.formatMessage({ id: "page.docAgent.title" })}
        </h1>
        <p className="text-muted-foreground mt-1">
          {intl.formatMessage({ id: "page.docAgent.subtitle" })}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="create" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {intl.formatMessage({ id: "page.docAgent.create" })}
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            <FileText className="h-4 w-4" />
            {intl.formatMessage({ id: "page.docAgent.library" })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <CreateTab onGenerated={() => setActiveTab("library")} />
        </TabsContent>

        <TabsContent value="library">
          <LibraryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Create Tab ─────────────────────────────────────────────

function CreateTab({ onGenerated }: { onGenerated: () => void }) {
  const intl = useIntl();
  const createDocument = useMutation(api.documents.createDocument);
  const generateDocument = useAction(api.documentActions.generateDocument);

  const [documentType, setDocumentType] = useState<DocumentType>("product_presentation");
  const [title, setTitle] = useState("");
  const [briefing, setBriefing] = useState("");
  const [language, setLanguage] = useState("Français");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!title.trim() || !briefing.trim()) {
      toast.error("Please provide a title and briefing");
      return;
    }
    setIsGenerating(true);
    try {
      const docId = await createDocument({
        documentType,
        title: title.trim(),
        briefing: briefing.trim(),
        language,
      });

      // Fire-and-forget the generation
      generateDocument({
        documentId: docId,
        documentType,
        briefing: briefing.trim(),
        language,
        title: title.trim(),
      }).then(() => {
        toast.success(intl.formatMessage({ id: "page.docAgent.generated" }));
      }).catch(() => {
        toast.error(intl.formatMessage({ id: "page.docAgent.generationFailed" }));
      });

      toast.info(intl.formatMessage({ id: "page.docAgent.generatingDoc" }));
      
      // Reset form
      setTitle("");
      setBriefing("");
      onGenerated();
    } catch (error) {
      const msg = error instanceof ConvexError
        ? (error.data as { message: string }).message
        : "Generation failed";
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Document Type Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium">
          {intl.formatMessage({ id: "page.docAgent.documentType" })}
        </label>
        {DOCUMENT_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setDocumentType(type.value)}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
              documentType === type.value
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/30 hover:bg-accent/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${type.bg}`}>
                <span className={type.color}>{type.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {intl.formatMessage({ id: type.labelKey })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {intl.formatMessage({ id: type.descKey })}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Right: Form */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {intl.formatMessage({ id: getDocTypeInfo(documentType).labelKey })}
            </CardTitle>
            <CardDescription>
              {intl.formatMessage({ id: getDocTypeInfo(documentType).descKey })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {intl.formatMessage({ id: "page.docAgent.title_field" })}
              </label>
              <Input
                placeholder={intl.formatMessage({ id: "page.docAgent.titlePlaceholder" })}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Language */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {intl.formatMessage({ id: "page.docAgent.language" })}
              </label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Briefing */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {intl.formatMessage({ id: "page.docAgent.briefing" })}
              </label>
              <Textarea
                placeholder={intl.formatMessage({ id: "page.docAgent.briefingPlaceholder" })}
                value={briefing}
                onChange={(e) => setBriefing(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !title.trim() || !briefing.trim()}
              className="w-full gap-2 h-11"
              size="lg"
            >
              {isGenerating ? <Spinner /> : <Sparkles className="h-4 w-4" />}
              {isGenerating
                ? intl.formatMessage({ id: "page.docAgent.generating" })
                : intl.formatMessage({ id: "page.docAgent.generate" })}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Library Tab ────────────────────────────────────────────

function LibraryTab() {
  const intl = useIntl();
  const [filterType, setFilterType] = useState("all");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const documents = useQuery(api.documents.listDocuments, {
    documentType: filterType === "all" ? undefined : filterType,
  });
  const deleteDocument = useMutation(api.documents.deleteDocument);
  const toggleFavorite = useMutation(api.documents.toggleFavorite);

  if (documents === undefined) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  const handleDelete = async (id: Id<"generatedDocuments">) => {
    await deleteDocument({ documentId: id });
    toast.success(intl.formatMessage({ id: "page.docAgent.deleted" }));
    if (selectedDocId === id) setSelectedDocId(null);
  };

  const handleFavorite = async (id: Id<"generatedDocuments">) => {
    await toggleFavorite({ documentId: id });
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filterType === "all" ? "default" : "secondary"}
          onClick={() => setFilterType("all")}
        >
          {intl.formatMessage({ id: "page.docAgent.allTypes" })}
        </Button>
        {DOCUMENT_TYPES.map((type) => (
          <Button
            key={type.value}
            size="sm"
            variant={filterType === type.value ? "default" : "secondary"}
            onClick={() => setFilterType(type.value)}
            className="gap-1.5"
          >
            {type.icon}
            {intl.formatMessage({ id: type.labelKey })}
          </Button>
        ))}
      </div>

      {documents.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>{intl.formatMessage({ id: "page.docAgent.noDocuments" })}</EmptyTitle>
            <EmptyDescription>
              {intl.formatMessage({ id: "page.docAgent.noDocumentsDesc" })}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const typeInfo = getDocTypeInfo(doc.documentType);
            const sections = parseSections(doc.sections);

            return (
              <Card
                key={doc._id}
                className="group cursor-pointer hover:shadow-md transition-all"
                onClick={() => setSelectedDocId(doc._id)}
              >
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${typeInfo.bg}`}>
                        <span className={typeInfo.color}>{typeInfo.icon}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {intl.formatMessage({ id: typeInfo.labelKey })}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFavorite(doc._id);
                        }}
                      >
                        <Heart
                          className={`h-3.5 w-3.5 ${doc.isFavorite ? "fill-red-500 text-red-500" : ""}`}
                        />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc._id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-sm line-clamp-2">{doc.title}</h3>

                  <p className="text-xs text-muted-foreground line-clamp-2">{doc.briefing}</p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>
                      {doc.status === "generating" ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Spinner /> {intl.formatMessage({ id: "page.docAgent.generating" })}
                        </Badge>
                      ) : doc.status === "completed" ? (
                        <span>{sections.length} {intl.formatMessage({ id: "page.docAgent.sections" })}</span>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          {intl.formatMessage({ id: "common.error" })}
                        </Badge>
                      )}
                    </span>
                    <span>{doc.language}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Document Detail Dialog */}
      {selectedDocId && (
        <DocumentDetailDialog
          documentId={selectedDocId as Id<"generatedDocuments">}
          onClose={() => setSelectedDocId(null)}
        />
      )}
    </div>
  );
}

// ─── Document Detail Dialog ─────────────────────────────────

function DocumentDetailDialog({
  documentId,
  onClose,
}: {
  documentId: Id<"generatedDocuments">;
  onClose: () => void;
}) {
  const intl = useIntl();
  const document = useQuery(api.documents.getDocument, { documentId });
  const updateSections = useMutation(api.documents.updateDocumentSections);
  const regenerateSection = useAction(api.documentActions.regenerateSection);
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editInstruction, setEditInstruction] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);

  const toggleSection = useCallback((index: number) => {
    setExpandedSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }, []);

  if (!document) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-4 py-8">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const sections = parseSections(document.sections);
  const typeInfo = getDocTypeInfo(document.documentType);

  const handleCopyAll = () => {
    const text = sections
      .map((s) => `# ${s.title}\n\n${s.content}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(intl.formatMessage({ id: "page.docAgent.copied" }));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateSection = async (index: number) => {
    if (!editInstruction.trim()) return;
    setIsRegenerating(true);
    try {
      const section = sections[index];
      if (!section) return;

      const result = await regenerateSection({
        documentId,
        sectionIndex: index,
        sectionTitle: section.title,
        instruction: editInstruction.trim(),
        currentContent: section.content,
        language: document.language,
        documentType: document.documentType,
        fullBriefing: document.briefing,
      });

      // Update the section locally
      const updated = [...sections];
      updated[index] = { ...section, content: result.content };

      await updateSections({
        documentId,
        sections: JSON.stringify(updated),
        status: "completed",
      });

      toast.success(intl.formatMessage({ id: "page.docAgent.saved" }));
      setEditingSection(null);
      setEditInstruction("");
    } catch (error) {
      const msg = error instanceof ConvexError
        ? (error.data as { message: string }).message
        : "Regeneration failed";
      toast.error(msg);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${typeInfo.bg}`}>
              <span className={typeInfo.color}>{typeInfo.icon}</span>
            </div>
            <div>
              <DialogTitle className="text-xl">{document.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">
                  {intl.formatMessage({ id: typeInfo.labelKey })}
                </Badge>
                <span>{document.language}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {document.status === "generating" ? (
          <div className="py-12 text-center space-y-4">
            <Spinner />
            <p className="text-muted-foreground">
              {intl.formatMessage({ id: "page.docAgent.generatingDoc" })}
            </p>
          </div>
        ) : document.status === "failed" ? (
          <div className="py-12 text-center">
            <p className="text-destructive font-medium">
              {intl.formatMessage({ id: "page.docAgent.generationFailed" })}
            </p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {/* Copy All button */}
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={handleCopyAll} className="gap-2">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {intl.formatMessage({ id: "page.docAgent.copyAll" })}
              </Button>
            </div>

            {/* Sections */}
            {sections.map((section, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSection(index)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors text-left"
                >
                  <span className="font-medium text-sm flex items-center gap-2">
                    <span className="text-muted-foreground text-xs font-mono w-6">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.title}
                  </span>
                  {expandedSections[index] ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {expandedSections[index] && (
                  <div className="px-4 pb-4 border-t">
                    <div className="prose prose-sm dark:prose-invert max-w-none mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                      {section.content}
                    </div>

                    {/* Section actions */}
                    <div className="mt-3 pt-3 border-t flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs gap-1"
                        onClick={() => {
                          navigator.clipboard.writeText(section.content);
                          toast.success(intl.formatMessage({ id: "page.docAgent.copied" }));
                        }}
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs gap-1"
                        onClick={() =>
                          setEditingSection(editingSection === index ? null : index)
                        }
                      >
                        <RefreshCw className="h-3 w-3" />
                        {intl.formatMessage({ id: "page.docAgent.regenerateSection" })}
                      </Button>
                    </div>

                    {/* Regenerate inline form */}
                    {editingSection === index && (
                      <div className="mt-2 space-y-2 p-3 rounded-lg bg-muted/50">
                        <label className="text-xs font-medium text-muted-foreground">
                          {intl.formatMessage({ id: "page.docAgent.instruction" })}
                        </label>
                        <Textarea
                          placeholder={intl.formatMessage({
                            id: "page.docAgent.instructionPlaceholder",
                          })}
                          value={editInstruction}
                          onChange={(e) => setEditInstruction(e.target.value)}
                          rows={2}
                          className="resize-none text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleRegenerateSection(index)}
                          disabled={isRegenerating || !editInstruction.trim()}
                          className="gap-1"
                        >
                          {isRegenerating ? <Spinner /> : <Wand2 className="h-3 w-3" />}
                          {intl.formatMessage({ id: "page.docAgent.apply" })}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function parseSections(sectionsJson: string): DocumentSection[] {
  try {
    const parsed = JSON.parse(sectionsJson) as DocumentSection[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
