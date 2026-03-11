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
  ImageIcon,
  Sparkles,
  Download,
  Save,
  Trash2,
  Heart,
  Lightbulb,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  MessageCircle,
  Music2,
  LayoutGrid,
  Palette,
  RectangleHorizontal,
  Square,
  RectangleVertical,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useIntl } from "react-intl";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

// ─── Constants ────────────────────────────────────────────────

const STYLES = [
  { value: "photorealistic", labelKey: "page.imageCreator.style.photorealistic", icon: "📸" },
  { value: "illustration", labelKey: "page.imageCreator.style.illustration", icon: "🎨" },
  { value: "minimalist", labelKey: "page.imageCreator.style.minimalist", icon: "⬜" },
  { value: "vibrant", labelKey: "page.imageCreator.style.vibrant", icon: "🌈" },
  { value: "corporate", labelKey: "page.imageCreator.style.corporate", icon: "💼" },
  { value: "artistic", labelKey: "page.imageCreator.style.artistic", icon: "🖌️" },
  { value: "flat", labelKey: "page.imageCreator.style.flat", icon: "📐" },
  { value: "watercolor", labelKey: "page.imageCreator.style.watercolor", icon: "💧" },
] as const;

const PLATFORMS = [
  { value: "none", label: "None", icon: <LayoutGrid className="h-4 w-4" /> },
  { value: "facebook", label: "Facebook", icon: <Facebook className="h-4 w-4" /> },
  { value: "instagram", label: "Instagram", icon: <Instagram className="h-4 w-4" /> },
  { value: "x", label: "X (Twitter)", icon: <Twitter className="h-4 w-4" /> },
  { value: "linkedin", label: "LinkedIn", icon: <Linkedin className="h-4 w-4" /> },
  { value: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" /> },
  { value: "tiktok", label: "TikTok", icon: <Music2 className="h-4 w-4" /> },
] as const;

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 Square", icon: <Square className="h-4 w-4" /> },
  { value: "16:9", label: "16:9 Landscape", icon: <RectangleHorizontal className="h-4 w-4" /> },
  { value: "9:16", label: "9:16 Portrait", icon: <RectangleVertical className="h-4 w-4" /> },
  { value: "4:3", label: "4:3 Standard", icon: <RectangleHorizontal className="h-4 w-4" /> },
] as const;

// ─── Main Export ──────────────────────────────────────────────

export default function ImageCreator() {
  return (
    <Authenticated>
      <ImageCreatorContent />
    </Authenticated>
  );
}

// ─── Image Creator Content ──────────────────────────────────

function ImageCreatorContent() {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState("create");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ImageIcon className="h-6 w-6" />
          {intl.formatMessage({ id: "page.imageCreator.title" })}
        </h1>
        <p className="text-muted-foreground mt-1">
          {intl.formatMessage({ id: "page.imageCreator.subtitle" })}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="create" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {intl.formatMessage({ id: "page.imageCreator.generateImage" })}
          </TabsTrigger>
          <TabsTrigger value="gallery" className="gap-2">
            <Palette className="h-4 w-4" />
            {intl.formatMessage({ id: "page.imageCreator.gallery" })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <CreateImageTab onSaved={() => setActiveTab("gallery")} />
        </TabsContent>

        <TabsContent value="gallery">
          <GalleryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Create Image Tab ───────────────────────────────────────

function CreateImageTab({ onSaved }: { onSaved: () => void }) {
  const intl = useIntl();
  const generateImage = useAction(api.marketingActions.generateMarketingImage);
  const suggestPrompts = useAction(api.marketingActions.suggestImagePrompts);
  const saveImage = useMutation(api.marketing.saveImage);

  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("photorealistic");
  const [platform, setPlatform] = useState("none");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [suggestionTopic, setSuggestionTopic] = useState("");

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedStorageId, setGeneratedStorageId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error(intl.formatMessage({ id: "page.imageCreator.prompt" }));
      return;
    }
    setIsGenerating(true);
    setGeneratedImageUrl(null);
    setGeneratedStorageId(null);
    try {
      const result = await generateImage({
        prompt: prompt.trim(),
        style,
        platform: platform !== "none" ? platform : undefined,
        aspectRatio,
      });
      setGeneratedImageUrl(result.imageUrl);
      setGeneratedStorageId(result.storageId);
      toast.success(intl.formatMessage({ id: "page.imageCreator.generated" }));
    } catch (error) {
      const msg = error instanceof ConvexError
        ? (error.data as { message: string }).message
        : intl.formatMessage({ id: "page.imageCreator.generationFailed" });
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedStorageId) return;
    setIsSaving(true);
    try {
      await saveImage({
        prompt,
        style,
        platform: platform !== "none" ? platform : undefined,
        aspectRatio,
        storageId: generatedStorageId as Id<"_storage">,
      });
      toast.success(intl.formatMessage({ id: "page.imageCreator.saved" }));
      onSaved();
    } catch {
      toast.error(intl.formatMessage({ id: "page.imageCreator.saveFailed" }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuggest = async () => {
    if (!suggestionTopic.trim()) return;
    setIsSuggesting(true);
    try {
      const result = await suggestPrompts({
        topic: suggestionTopic.trim(),
        platform: platform !== "none" ? platform : undefined,
        style,
      });
      setSuggestions(result.suggestions);
    } catch {
      toast.error("Failed to generate suggestions");
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement("a");
    link.href = generatedImageUrl;
    link.download = `marketing-image-${Date.now()}.png`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Input Panel */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {intl.formatMessage({ id: "page.imageCreator.generateImage" })}
            </CardTitle>
            <CardDescription>
              {intl.formatMessage({ id: "page.imageCreator.prompt" })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Prompt */}
            <div className="space-y-2">
              <Textarea
                placeholder={intl.formatMessage({ id: "page.imageCreator.promptPlaceholder" })}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Style Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {intl.formatMessage({ id: "page.imageCreator.style" })}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STYLES.map((s) => (
                  <Button
                    key={s.value}
                    size="sm"
                    variant={style === s.value ? "default" : "secondary"}
                    onClick={() => setStyle(s.value)}
                    className="gap-1 text-xs"
                  >
                    <span>{s.icon}</span>
                    {intl.formatMessage({ id: s.labelKey })}
                  </Button>
                ))}
              </div>
            </div>

            {/* Platform */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {intl.formatMessage({ id: "page.imageCreator.platform" })}
              </label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        {p.icon}
                        {p.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {intl.formatMessage({ id: "page.imageCreator.aspectRatio" })}
              </label>
              <div className="flex flex-wrap gap-2">
                {ASPECT_RATIOS.map((ar) => (
                  <Button
                    key={ar.value}
                    size="sm"
                    variant={aspectRatio === ar.value ? "default" : "secondary"}
                    onClick={() => setAspectRatio(ar.value)}
                    className="gap-1.5"
                  >
                    {ar.icon}
                    {ar.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full gap-2"
              size="lg"
            >
              {isGenerating ? <Spinner /> : <Sparkles className="h-4 w-4" />}
              {isGenerating
                ? intl.formatMessage({ id: "page.imageCreator.generating" })
                : intl.formatMessage({ id: "page.imageCreator.generateImage" })}
            </Button>
          </CardContent>
        </Card>

        {/* Prompt Suggestions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              {intl.formatMessage({ id: "page.imageCreator.suggestPrompts" })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder={intl.formatMessage({ id: "page.imageCreator.topicForSuggestions" })}
                value={suggestionTopic}
                onChange={(e) => setSuggestionTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSuggest();
                }}
              />
              <Button
                size="sm"
                onClick={handleSuggest}
                disabled={isSuggesting || !suggestionTopic.trim()}
                className="shrink-0"
              >
                {isSuggesting ? <Spinner /> : <Lightbulb className="h-4 w-4" />}
              </Button>
            </div>

            {suggestions.length > 0 && (
              <div className="space-y-2">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPrompt(suggestion);
                      toast.success("Prompt selected");
                    }}
                    className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors text-sm"
                  >
                    <Badge variant="secondary" className="mb-1 text-xs">
                      #{i + 1}
                    </Badge>
                    <p className="line-clamp-2">{suggestion}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Output Panel */}
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Preview
            </CardTitle>
            {generatedImageUrl && (
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={handleDownload} title={intl.formatMessage({ id: "page.imageCreator.downloadImage" })}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSave}
                  disabled={isSaving}
                  title={intl.formatMessage({ id: "page.imageCreator.saveToGallery" })}
                >
                  {isSaving ? <Spinner /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!generatedImageUrl && !isGenerating ? (
            <div className="text-center py-16 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-lg font-medium">
                {intl.formatMessage({ id: "page.imageCreator.prompt" })}
              </p>
              <p className="text-sm mt-1 opacity-70">
                {intl.formatMessage({ id: "page.imageCreator.promptPlaceholder" })}
              </p>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <Skeleton className="h-64 w-64 rounded-xl" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Spinner />
                    <p className="text-sm text-muted-foreground font-medium">
                      {intl.formatMessage({ id: "page.imageCreator.generating" })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border bg-muted">
                <img
                  src={generatedImageUrl!}
                  alt="Generated marketing image"
                  className="w-full object-contain max-h-[500px]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="capitalize">{style}</Badge>
                {platform !== "none" && (
                  <Badge variant="secondary" className="capitalize">{platform}</Badge>
                )}
                <Badge variant="secondary">{aspectRatio}</Badge>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-3 italic">
                {`"${prompt}"`}
              </p>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving} className="flex-1 gap-2">
                  {isSaving ? <Spinner /> : <Save className="h-4 w-4" />}
                  {intl.formatMessage({ id: "page.imageCreator.saveToGallery" })}
                </Button>
                <Button variant="secondary" onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  {intl.formatMessage({ id: "page.imageCreator.downloadImage" })}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Gallery Tab ────────────────────────────────────────────

function GalleryTab() {
  const intl = useIntl();
  const images = useQuery(api.marketing.listImages, {});
  const updateImage = useMutation(api.marketing.updateImage);
  const deleteImage = useMutation(api.marketing.deleteImage);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (images === undefined) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ImageIcon />
          </EmptyMedia>
          <EmptyTitle>
            {intl.formatMessage({ id: "page.imageCreator.noImages" })}
          </EmptyTitle>
          <EmptyDescription>
            {intl.formatMessage({ id: "page.imageCreator.noImagesDesc" })}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <p className="text-sm text-muted-foreground">
            {intl.formatMessage({ id: "page.imageCreator.generateImage" })}
          </p>
        </EmptyContent>
      </Empty>
    );
  }

  const handleFavorite = async (imageId: Id<"marketingImages">, current: boolean) => {
    await updateImage({ imageId, isFavorite: !current });
  };

  const handleDelete = async (imageId: Id<"marketingImages">) => {
    await deleteImage({ imageId });
    toast.success(intl.formatMessage({ id: "page.imageCreator.deleted" }));
    if (selectedImage === imageId) setSelectedImage(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <div
            key={image._id}
            className="group relative rounded-xl overflow-hidden border bg-muted cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedImage(image._id)}
          >
            {image.imageUrl ? (
              <img
                src={image.imageUrl}
                alt={image.prompt}
                className="w-full aspect-square object-cover"
              />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            {/* Overlay with actions */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
              <div className="w-full p-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFavorite(image._id, image.isFavorite ?? false);
                  }}
                >
                  <Heart
                    className={`h-4 w-4 ${image.isFavorite ? "fill-red-500 text-red-500" : ""}`}
                  />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(image._id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Style badge */}
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-[10px] bg-background/80 backdrop-blur-sm capitalize">
                {image.style}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Image Detail Dialog */}
      {selectedImage && (
        <ImageDetailDialog
          imageId={selectedImage as Id<"marketingImages">}
          onClose={() => setSelectedImage(null)}
          onDelete={(id) => handleDelete(id)}
        />
      )}
    </div>
  );
}

// ─── Image Detail Dialog ────────────────────────────────────

function ImageDetailDialog({
  imageId,
  onClose,
  onDelete,
}: {
  imageId: Id<"marketingImages">;
  onClose: () => void;
  onDelete: (id: Id<"marketingImages">) => void;
}) {
  const intl = useIntl();
  const images = useQuery(api.marketing.listImages, {});
  const image = images?.find((img) => img._id === imageId);

  if (!image) return null;

  const handleDownload = () => {
    if (!image.imageUrl) return;
    const link = document.createElement("a");
    link.href = image.imageUrl;
    link.download = `marketing-image-${Date.now()}.png`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {intl.formatMessage({ id: "page.imageCreator.title" })}
          </DialogTitle>
          <DialogDescription className="capitalize">
            {image.style} {image.platform ? `- ${image.platform}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {image.imageUrl && (
            <div className="rounded-xl overflow-hidden border bg-muted">
              <img
                src={image.imageUrl}
                alt={image.prompt}
                className="w-full object-contain max-h-80"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground">Prompt</label>
            <p className="text-sm mt-1 italic">{`"${image.prompt}"`}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">{image.style}</Badge>
            {image.platform && (
              <Badge variant="secondary" className="capitalize">{image.platform}</Badge>
            )}
            {image.aspectRatio && (
              <Badge variant="secondary">{image.aspectRatio}</Badge>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button variant="secondary" onClick={handleDownload} className="gap-2 flex-1">
            <Download className="h-4 w-4" />
            {intl.formatMessage({ id: "page.imageCreator.downloadImage" })}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onDelete(imageId);
              onClose();
            }}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {intl.formatMessage({ id: "buttons.delete" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
