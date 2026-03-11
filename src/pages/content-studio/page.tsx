import { Authenticated } from "convex/react";
import { useQuery, useAction, useMutation } from "convex/react";
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
  PenLine,
  Sparkles,
  Copy,
  Check,
  Heart,
  Trash2,
  RefreshCw,
  Save,
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  Twitter,
  Hash,
  ArrowRight,
  Wand2,
  LayoutGrid,
  List,
  Music2,
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useIntl } from "react-intl";
import { ConvexError } from "convex/values";
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

const TONES = [
  { value: "professional", label: "Professional", emoji: "💼" },
  { value: "casual", label: "Casual", emoji: "😊" },
  { value: "humorous", label: "Humorous", emoji: "😄" },
  { value: "inspirational", label: "Inspirational", emoji: "✨" },
  { value: "promotional", label: "Promotional", emoji: "📢" },
  { value: "educational", label: "Educational", emoji: "📚" },
] as const;

const LANGUAGES = [
  { value: "English", label: "English" },
  { value: "French", label: "Français" },
  { value: "Arabic", label: "العربية" },
  { value: "Spanish", label: "Español" },
  { value: "Portuguese", label: "Português" },
] as const;

function getPlatformIcon(platform: string) {
  const found = PLATFORMS.find((p) => p.value === platform);
  return found?.icon ?? <LayoutGrid className="h-4 w-4" />;
}

function getPlatformLabel(platform: string) {
  const found = PLATFORMS.find((p) => p.value === platform);
  return found?.label ?? platform;
}

// ─── Main Export ──────────────────────────────────────────────

export default function ContentStudio() {
  return (
    <Authenticated>
      <ContentStudioContent />
    </Authenticated>
  );
}

// ─── Content Studio Content ──────────────────────────────────

function ContentStudioContent() {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState("create");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PenLine className="h-6 w-6" />
          {intl.formatMessage({ id: "nav.contentStudio" })}
        </h1>
        <p className="text-muted-foreground mt-1">
          Create engaging social media content with AI
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="create" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Create
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            <List className="h-4 w-4" />
            Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <CreateTab onSaved={() => setActiveTab("library")} />
        </TabsContent>

        <TabsContent value="library">
          <LibraryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Create Tab ──────────────────────────────────────────────

function CreateTab({ onSaved }: { onSaved: () => void }) {
  const generatePost = useAction(api.marketingActions.generatePost);
  const generateVariations = useAction(api.marketingActions.generateVariations);
  const improveContent = useAction(api.marketingActions.improveContent);
  const saveContent = useMutation(api.marketing.saveContent);

  const [platform, setPlatform] = useState("facebook");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("French");
  const [topic, setTopic] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");

  const [generatedText, setGeneratedText] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [variations, setVariations] = useState<string[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }
    setIsGenerating(true);
    setVariations([]);
    try {
      const result = await generatePost({
        topic: topic.trim(),
        platform,
        tone,
        language,
        additionalContext: additionalContext.trim() || undefined,
      });
      setGeneratedText(result.text);
      setHashtags(result.hashtags);
      setCallToAction(result.callToAction);
      toast.success("Content generated!");
    } catch (error) {
      const msg = error instanceof ConvexError
        ? (error.data as { message: string }).message
        : "Generation failed";
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVariations = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    try {
      const result = await generateVariations({
        topic: topic.trim(),
        platform,
        tone,
        language,
        count: 3,
      });
      setVariations(result.variations);
      toast.success(`${result.variations.length} variations generated!`);
    } catch {
      toast.error("Failed to generate variations");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImprove = async (instruction: string) => {
    if (!generatedText) return;
    setIsImproving(true);
    try {
      const result = await improveContent({
        text: generatedText,
        instruction,
        language,
      });
      setGeneratedText(result.text);
      toast.success("Content improved!");
    } catch {
      toast.error("Failed to improve content");
    } finally {
      setIsImproving(false);
    }
  };

  const handleSave = async () => {
    if (!generatedText) return;
    setIsSaving(true);
    try {
      await saveContent({
        platform: platform as "facebook" | "instagram" | "x" | "linkedin" | "whatsapp" | "tiktok" | "general",
        tone: tone as "professional" | "casual" | "humorous" | "inspirational" | "promotional" | "educational",
        language,
        topic,
        generatedText,
        hashtags: hashtags || undefined,
        callToAction: callToAction || undefined,
      });
      toast.success("Content saved to library!");
      onSaved();
    } catch {
      toast.error("Failed to save content");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = useCallback(() => {
    const fullText = [generatedText, hashtags && `\n\n${hashtags}`, callToAction && `\n\n${callToAction}`]
      .filter(Boolean)
      .join("");
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }, [generatedText, hashtags, callToAction]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Input Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Content
          </CardTitle>
          <CardDescription>
            Describe what you want to post and let AI craft it for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Platform Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <Button
                  key={p.value}
                  size="sm"
                  variant={platform === p.value ? "default" : "secondary"}
                  onClick={() => setPlatform(p.value)}
                  className="gap-1.5"
                >
                  {p.icon}
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Tone Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <Button
                  key={t.value}
                  size="sm"
                  variant={tone === t.value ? "default" : "secondary"}
                  onClick={() => setTone(t.value)}
                >
                  {t.emoji} {t.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Language</label>
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

          {/* Topic */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Topic / Subject</label>
            <Textarea
              placeholder="e.g. Launch of our new premium plan with 50% off for early adopters..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
            />
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Context (optional)</label>
            <Input
              placeholder="e.g. Target audience: SMBs in West Africa"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
            />
          </div>

          {/* Generate Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className="flex-1 gap-2"
            >
              {isGenerating ? <Spinner /> : <Sparkles className="h-4 w-4" />}
              Generate Post
            </Button>
            <Button
              variant="secondary"
              onClick={handleVariations}
              disabled={isGenerating || !topic.trim()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              3 Variations
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Right: Output Panel */}
      <div className="space-y-4">
        {/* Main Generated Content */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {getPlatformIcon(platform)}
                {getPlatformLabel(platform)} Post
              </CardTitle>
              {generatedText && (
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Spinner /> : <Save className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!generatedText && !isGenerating ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Your generated content will appear here</p>
                <p className="text-sm mt-1">Fill in the details and click Generate</p>
              </div>
            ) : isGenerating && !generatedText ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <Textarea
                  value={generatedText}
                  onChange={(e) => setGeneratedText(e.target.value)}
                  rows={6}
                  className="resize-none text-base"
                />

                {hashtags && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Hash className="h-3 w-3" /> Hashtags
                    </label>
                    <Input
                      value={hashtags}
                      onChange={(e) => setHashtags(e.target.value)}
                      className="text-sm text-primary"
                    />
                  </div>
                )}

                {callToAction && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" /> Call to Action
                    </label>
                    <Input
                      value={callToAction}
                      onChange={(e) => setCallToAction(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                )}

                {/* Quick Improve Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <label className="text-xs font-medium text-muted-foreground w-full flex items-center gap-1">
                    <Wand2 className="h-3 w-3" /> Quick Improve
                  </label>
                  {["Make it shorter", "Make it longer", "More engaging", "Add emoji", "More formal"].map(
                    (instruction) => (
                      <Button
                        key={instruction}
                        size="sm"
                        variant="secondary"
                        className="text-xs"
                        disabled={isImproving}
                        onClick={() => handleImprove(instruction)}
                      >
                        {isImproving ? <Spinner /> : instruction}
                      </Button>
                    )
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Variations */}
        {variations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Variations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {variations.map((v, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setGeneratedText(v);
                    toast.success("Variation selected");
                  }}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors text-sm"
                >
                  <Badge variant="secondary" className="mb-1 text-xs">
                    #{i + 1}
                  </Badge>
                  <p className="line-clamp-3">{v}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Library Tab ─────────────────────────────────────────────

function LibraryTab() {
  const contents = useQuery(api.marketing.listContent, {});
  const updateContent = useMutation(api.marketing.updateContent);
  const deleteContent = useMutation(api.marketing.deleteContent);
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  if (contents === undefined) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  const filtered = filterPlatform === "all"
    ? contents
    : contents.filter((c) => c.platform === filterPlatform);

  const handleCopy = (id: string, text: string, htags?: string) => {
    const fullText = [text, htags && `\n\n${htags}`].filter(Boolean).join("");
    navigator.clipboard.writeText(fullText);
    setCopied(id);
    toast.success("Copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFavorite = async (id: Id<"marketingContent">, current: boolean) => {
    await updateContent({ contentId: id, isFavorite: !current });
  };

  const handleDelete = async (id: Id<"marketingContent">) => {
    await deleteContent({ contentId: id });
    toast.success("Content deleted");
    if (selectedContent === id) setSelectedContent(null);
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filterPlatform === "all" ? "default" : "secondary"}
          onClick={() => setFilterPlatform("all")}
        >
          All
        </Button>
        {PLATFORMS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={filterPlatform === p.value ? "default" : "secondary"}
            onClick={() => setFilterPlatform(p.value)}
            className="gap-1"
          >
            {p.icon}
            {p.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PenLine />
            </EmptyMedia>
            <EmptyTitle>No content yet</EmptyTitle>
            <EmptyDescription>
              Generate and save content from the Create tab
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <p className="text-sm text-muted-foreground">
              Your saved posts will appear here
            </p>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((content) => (
            <Card
              key={content._id}
              className="group cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedContent(content._id)}
            >
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(content.platform)}
                    <Badge variant="secondary" className="text-xs">
                      {getPlatformLabel(content.platform)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(content._id, content.generatedText, content.hashtags);
                      }}
                    >
                      {copied === content._id ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFavorite(content._id, content.isFavorite ?? false);
                      }}
                    >
                      <Heart
                        className={`h-3.5 w-3.5 ${content.isFavorite ? "fill-red-500 text-red-500" : ""}`}
                      />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(content._id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm line-clamp-4">{content.generatedText}</p>

                {content.hashtags && (
                  <p className="text-xs text-primary truncate">{content.hashtags}</p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                  <span className="capitalize">{content.tone}</span>
                  <span>{content.language}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Content Detail Dialog */}
      {selectedContent && (
        <ContentDetailDialog
          contentId={selectedContent as Id<"marketingContent">}
          onClose={() => setSelectedContent(null)}
        />
      )}
    </div>
  );
}

// ─── Content Detail Dialog ───────────────────────────────────

function ContentDetailDialog({
  contentId,
  onClose,
}: {
  contentId: Id<"marketingContent">;
  onClose: () => void;
}) {
  const content = useQuery(api.marketing.getContent, { contentId });
  const [copied, setCopied] = useState(false);

  if (!content) return null;

  const handleCopy = () => {
    const fullText = [
      content.generatedText,
      content.hashtags && `\n\n${content.hashtags}`,
      content.callToAction && `\n\n${content.callToAction}`,
    ]
      .filter(Boolean)
      .join("");
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getPlatformIcon(content.platform)}
            {getPlatformLabel(content.platform)} Post
          </DialogTitle>
          <DialogDescription>
            {content.tone} tone in {content.language}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 whitespace-pre-wrap text-sm">
            {content.generatedText}
          </div>

          {content.hashtags && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Hashtags</label>
              <p className="text-sm text-primary mt-1">{content.hashtags}</p>
            </div>
          )}

          {content.callToAction && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Call to Action
              </label>
              <p className="text-sm mt-1">{content.callToAction}</p>
            </div>
          )}

          {content.imageUrl && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Image</label>
              <img
                src={content.imageUrl}
                alt="Generated creative"
                className="mt-1 rounded-lg w-full object-cover max-h-64"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Badge variant="secondary">{content.topic}</Badge>
            <Badge variant="secondary" className="capitalize">{content.status}</Badge>
          </div>

          <Button onClick={handleCopy} className="w-full gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy to Clipboard"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
