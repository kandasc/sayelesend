import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { toast } from "sonner";
import {
  MailOpen,
  Reply,
  PenLine,
  FileSearch,
  Wand2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle,
  Flame,
  ChevronRight,
  Code,
  Globe,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

type SummarizeResult = {
  summary: string;
  keyPoints: string[];
  sentiment: string;
  actionItems: string[];
  priority: string;
};

type ReplyResult = {
  reply: string;
  subject: string;
};

type ComposeResult = {
  subject: string;
  body: string;
  greeting: string;
  closing: string;
};

type ReviewResult = {
  correctedText: string;
  changes: string[];
  score: number;
  suggestions: string[];
};

type ImproveResult = {
  improvedText: string;
};

// ─── Helper: Copy to Clipboard ─────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      <span className="ml-1 text-xs">{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}

// ─── Sentiment / Priority badges ────────────────────────────────────────────

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const config: Record<string, { icon: React.ReactNode; className: string }> = {
    positive: { icon: <ArrowUpCircle className="h-3.5 w-3.5" />, className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    negative: { icon: <ArrowDownCircle className="h-3.5 w-3.5" />, className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
    neutral: { icon: <MinusCircle className="h-3.5 w-3.5" />, className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
    urgent: { icon: <Flame className="h-3.5 w-3.5" />, className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  };
  const c = config[sentiment] || config.neutral;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      {c.icon}
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[priority] || colors.medium}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)} priority
    </span>
  );
}

// ─── Summarize Tab ──────────────────────────────────────────────────────────

function SummarizeTab() {
  const summarize = useAction(api.emailAssistantActions.summarizeEmail);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SummarizeResult | null>(null);

  const handleSummarize = async () => {
    if (!input.trim()) { toast.error("Please paste an email to summarize"); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await summarize({ emailContent: input });
      setResult(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to summarize email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <Label>Paste your email</Label>
          <Textarea
            placeholder="Paste the full email content here..."
            className="mt-1.5 min-h-[280px] font-mono text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <Button onClick={handleSummarize} disabled={loading} className="w-full">
          {loading ? <Spinner className="mr-2" /> : <MailOpen className="h-4 w-4 mr-2" />}
          {loading ? "Analyzing..." : "Summarize Email"}
        </Button>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {result && !loading && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Analysis</CardTitle>
                <div className="flex items-center gap-2">
                  <SentimentBadge sentiment={result.sentiment} />
                  <PriorityBadge priority={result.priority} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Summary</h4>
                  <CopyButton text={result.summary} />
                </div>
                <p className="mt-1 text-sm leading-relaxed">{result.summary}</p>
              </div>

              {result.keyPoints.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Key Points</h4>
                  <ul className="mt-1 space-y-1">
                    {result.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.actionItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Action Items</h4>
                  <ul className="mt-1 space-y-1">
                    {result.actionItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground">
            <MailOpen className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Paste an email to get started</p>
            <p className="text-sm mt-1">We'll extract key points, sentiment, and action items</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Draft Reply Tab ────────────────────────────────────────────────────────

function DraftReplyTab() {
  const draftReply = useAction(api.emailAssistantActions.draftReply);
  const [input, setInput] = useState("");
  const [instructions, setInstructions] = useState("");
  const [tone, setTone] = useState<"professional" | "friendly" | "formal" | "casual" | "apologetic" | "assertive">("professional");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReplyResult | null>(null);

  const handleDraft = async () => {
    if (!input.trim()) { toast.error("Please paste the original email"); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await draftReply({
        originalEmail: input,
        instructions: instructions || undefined,
        tone,
      });
      setResult(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to draft reply");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <Label>Original email</Label>
          <Textarea
            placeholder="Paste the email you want to reply to..."
            className="mt-1.5 min-h-[200px] font-mono text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <div>
          <Label>Reply instructions (optional)</Label>
          <Input
            placeholder="e.g., Agree to the meeting time, suggest Wednesday instead..."
            className="mt-1.5"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>
        <div>
          <Label>Tone</Label>
          <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="apologetic">Apologetic</SelectItem>
              <SelectItem value="assertive">Assertive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleDraft} disabled={loading} className="w-full">
          {loading ? <Spinner className="mr-2" /> : <Reply className="h-4 w-4 mr-2" />}
          {loading ? "Drafting..." : "Draft Reply"}
        </Button>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
        {result && !loading && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Draft Reply</CardTitle>
                <CopyButton text={`Subject: ${result.subject}\n\n${result.reply}`} />
              </div>
              <CardDescription>Subject: {result.subject}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/50 rounded-lg p-4">
                {result.reply}
              </div>
            </CardContent>
          </Card>
        )}
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground">
            <Reply className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Paste an email to draft a reply</p>
            <p className="text-sm mt-1">Set the tone and any specific instructions</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Compose Tab ────────────────────────────────────────────────────────────

function ComposeTab() {
  const compose = useAction(api.emailAssistantActions.composeEmail);
  const [prompt, setPrompt] = useState("");
  const [recipientContext, setRecipientContext] = useState("");
  const [tone, setTone] = useState<"professional" | "friendly" | "formal" | "casual" | "marketing" | "persuasive">("professional");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComposeResult | null>(null);

  const handleCompose = async () => {
    if (!prompt.trim()) { toast.error("Please describe what you want to write"); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await compose({
        prompt,
        tone,
        recipientContext: recipientContext || undefined,
      });
      setResult(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to compose email");
    } finally {
      setLoading(false);
    }
  };

  const fullEmail = result
    ? `Subject: ${result.subject}\n\n${result.greeting}\n\n${result.body}\n\n${result.closing}`
    : "";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <Label>What do you want to write?</Label>
          <Textarea
            placeholder="e.g., Write a follow-up email after a job interview at Google for a PM role..."
            className="mt-1.5 min-h-[160px]"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <div>
          <Label>Recipient context (optional)</Label>
          <Input
            placeholder="e.g., HR manager, potential client, team member..."
            className="mt-1.5"
            value={recipientContext}
            onChange={(e) => setRecipientContext(e.target.value)}
          />
        </div>
        <div>
          <Label>Tone</Label>
          <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="persuasive">Persuasive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCompose} disabled={loading} className="w-full">
          {loading ? <Spinner className="mr-2" /> : <PenLine className="h-4 w-4 mr-2" />}
          {loading ? "Composing..." : "Compose Email"}
        </Button>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}
        {result && !loading && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Composed Email</CardTitle>
                <CopyButton text={fullEmail} />
              </div>
              <CardDescription>Subject: {result.subject}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="font-medium">{result.greeting}</p>
                <p>{result.body}</p>
                <p className="font-medium">{result.closing}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground">
            <PenLine className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Describe the email you want</p>
            <p className="text-sm mt-1">AI will compose a full email with subject and body</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Review / Proofread Tab ─────────────────────────────────────────────────

function ReviewTab() {
  const review = useAction(api.emailAssistantActions.reviewDocument);
  const [input, setInput] = useState("");
  const [reviewType, setReviewType] = useState<"grammar" | "style" | "clarity" | "comprehensive">("comprehensive");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);

  const handleReview = async () => {
    if (!input.trim()) { toast.error("Please paste content to review"); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await review({ content: input, reviewType });
      setResult(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to review document");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <Label>Paste your document or email</Label>
          <Textarea
            placeholder="Paste the text you want reviewed..."
            className="mt-1.5 min-h-[240px] font-mono text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <div>
          <Label>Review type</Label>
          <Select value={reviewType} onValueChange={(v) => setReviewType(v as typeof reviewType)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comprehensive">Comprehensive</SelectItem>
              <SelectItem value="grammar">Grammar & Spelling</SelectItem>
              <SelectItem value="style">Writing Style</SelectItem>
              <SelectItem value="clarity">Clarity & Readability</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleReview} disabled={loading} className="w-full">
          {loading ? <Spinner className="mr-2" /> : <FileSearch className="h-4 w-4 mr-2" />}
          {loading ? "Reviewing..." : "Review Document"}
        </Button>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
        {result && !loading && (
          <div className="space-y-4">
            {/* Score card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Quality Score</p>
                    <p className={`text-4xl font-bold ${scoreColor(result.score)}`}>{result.score}<span className="text-lg">/100</span></p>
                  </div>
                  <Badge variant="secondary" className="text-sm">{reviewType}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Corrected text */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Corrected Text</CardTitle>
                  <CopyButton text={result.correctedText} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {result.correctedText}
                </div>
              </CardContent>
            </Card>

            {/* Changes */}
            {result.changes.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Changes Made ({result.changes.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {result.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {result.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Wand2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground">
            <FileSearch className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Paste content to review</p>
            <p className="text-sm mt-1">Get grammar checks, style suggestions, and a quality score</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Improve Tab ────────────────────────────────────────────────────────────

function ImproveTab() {
  const improve = useAction(api.emailAssistantActions.improveWriting);
  const [input, setInput] = useState("");
  const [improvement, setImprovement] = useState<"shorten" | "expand" | "professional" | "simplify" | "persuasive" | "translate">("professional");
  const [targetLanguage, setTargetLanguage] = useState("French");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImproveResult | null>(null);

  const handleImprove = async () => {
    if (!input.trim()) { toast.error("Please paste text to improve"); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await improve({
        text: input,
        improvement,
        targetLanguage: improvement === "translate" ? targetLanguage : undefined,
      });
      setResult(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to improve text");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <Label>Your text</Label>
          <Textarea
            placeholder="Paste the text you want to improve..."
            className="mt-1.5 min-h-[200px]"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <div>
          <Label>Improvement</Label>
          <Select value={improvement} onValueChange={(v) => setImprovement(v as typeof improvement)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Make Professional</SelectItem>
              <SelectItem value="shorten">Shorten & Condense</SelectItem>
              <SelectItem value="expand">Expand & Detail</SelectItem>
              <SelectItem value="simplify">Simplify Language</SelectItem>
              <SelectItem value="persuasive">Make Persuasive</SelectItem>
              <SelectItem value="translate">Translate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {improvement === "translate" && (
          <div>
            <Label>Target language</Label>
            <Input
              placeholder="e.g., French, Spanish, Arabic..."
              className="mt-1.5"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
            />
          </div>
        )}
        <Button onClick={handleImprove} disabled={loading} className="w-full">
          {loading ? <Spinner className="mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
          {loading ? "Improving..." : "Improve Text"}
        </Button>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
        {result && !loading && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Improved Text</CardTitle>
                <CopyButton text={result.improvedText} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/50 rounded-lg p-4">
                {result.improvedText}
              </div>
            </CardContent>
          </Card>
        )}
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground">
            <Wand2 className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Paste text to improve</p>
            <p className="text-sm mt-1">Choose an improvement style and let AI transform your writing</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── API Integration Tab ────────────────────────────────────────────────────

function ApiTab() {
  const baseUrl = import.meta.env.VITE_CONVEX_SITE_URL || "https://api.sayele.co";

  const endpoints = [
    {
      method: "POST",
      path: "/api/v1/email/summarize",
      description: "Summarize an email and extract key points, sentiment, action items",
      body: `{ "emailContent": "Full email text...", "language": "English" }`,
    },
    {
      method: "POST",
      path: "/api/v1/email/reply",
      description: "Draft a reply to an email with a specific tone",
      body: `{ "originalEmail": "...", "tone": "professional", "instructions": "Agree to meeting" }`,
    },
    {
      method: "POST",
      path: "/api/v1/email/compose",
      description: "Compose a new email from a prompt",
      body: `{ "prompt": "Write a follow-up email...", "tone": "friendly", "recipientContext": "client" }`,
    },
    {
      method: "POST",
      path: "/api/v1/email/review",
      description: "Review and proofread a document",
      body: `{ "content": "Text to review...", "reviewType": "comprehensive" }`,
    },
    {
      method: "POST",
      path: "/api/v1/email/improve",
      description: "Improve writing style or translate",
      body: `{ "text": "Text to improve...", "improvement": "professional" }`,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            API Integration
          </CardTitle>
          <CardDescription>
            Integrate the Email Assistant into Outlook, Microsoft Office, or any mail client using our REST API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Base URL</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono break-all">
                {baseUrl}
              </code>
              <CopyButton text={baseUrl} />
            </div>
          </div>
          <div>
            <Label>Authentication</Label>
            <p className="text-sm text-muted-foreground mt-1">
              All endpoints require a Bearer token. Use your SAYELE API key in the Authorization header.
            </p>
            <code className="block mt-2 bg-muted px-3 py-2 rounded-md text-sm font-mono">
              {"Authorization: Bearer YOUR_API_KEY"}
            </code>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {endpoints.map((ep) => (
          <Card key={ep.path}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600 text-white">{ep.method}</Badge>
                <code className="text-sm font-mono">{ep.path}</code>
              </div>
              <CardDescription>{ep.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-muted-foreground">Request body</Label>
                <CopyButton text={ep.body} />
              </div>
              <pre className="bg-muted px-3 py-2 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                {ep.body}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code className="h-5 w-5" />
            Outlook / Office Add-in Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            To integrate this AI Email Assistant into Outlook or Microsoft Office:
          </p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Create an Office Add-in project using the Yeoman generator or Visual Studio</li>
            <li>Use the <code className="bg-muted px-1 rounded text-foreground">Office.js</code> API to read the current email content</li>
            <li>Call SAYELE Email Assistant API endpoints with the email content</li>
            <li>Display the AI response in a taskpane or dialog</li>
          </ol>
          <div className="mt-3">
            <Label className="text-xs text-muted-foreground">Example: Summarize current email in Outlook</Label>
            <pre className="mt-1.5 bg-muted px-3 py-2 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`// In your Office Add-in JavaScript
const item = Office.context.mailbox.item;
item.body.getAsync("text", async (result) => {
  const response = await fetch("${baseUrl}/api/v1/email/summarize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_API_KEY"
    },
    body: JSON.stringify({ emailContent: result.value })
  });
  const data = await response.json();
  // Display data.summary, data.keyPoints, etc.
});`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

function EmailAssistantInner() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Email Assistant</h1>
        <p className="text-muted-foreground mt-1">
          Summarize emails, draft replies, compose messages, and review documents with AI
        </p>
      </div>

      <Tabs defaultValue="summarize" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="summarize" className="gap-1.5">
            <MailOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Summarize</span>
          </TabsTrigger>
          <TabsTrigger value="reply" className="gap-1.5">
            <Reply className="h-4 w-4" />
            <span className="hidden sm:inline">Reply</span>
          </TabsTrigger>
          <TabsTrigger value="compose" className="gap-1.5">
            <PenLine className="h-4 w-4" />
            <span className="hidden sm:inline">Compose</span>
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-1.5">
            <FileSearch className="h-4 w-4" />
            <span className="hidden sm:inline">Review</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-1.5">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">API</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summarize">
          <SummarizeTab />
        </TabsContent>
        <TabsContent value="reply">
          <DraftReplyTab />
        </TabsContent>
        <TabsContent value="compose">
          <ComposeTab />
        </TabsContent>
        <TabsContent value="review">
          <ReviewTab />
        </TabsContent>
        <TabsContent value="api">
          <ApiTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EmailAssistant() {
  return (
    <>
      <AuthLoading>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-12 w-full max-w-2xl" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MailOpen className="h-16 w-16 mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Sign in to use Email Assistant</h2>
          <p className="text-muted-foreground mb-4">AI-powered email tools to help you work smarter</p>
          <SignInButton />
        </div>
      </Unauthenticated>
      <Authenticated>
        <EmailAssistantInner />
      </Authenticated>
    </>
  );
}
