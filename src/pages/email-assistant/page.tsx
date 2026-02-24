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
  const baseUrl = "https://api.sayele.co";

  const endpoints = [
    {
      method: "POST",
      path: "/api/v1/email/summarize",
      description: "Summarize an email and extract key points, sentiment, action items",
      body: `{
  "emailContent": "Full email text...",
  "language": "English"
}`,
      response: `{
  "success": true,
  "summary": "...",
  "keyPoints": ["..."],
  "sentiment": "positive|negative|neutral|urgent",
  "actionItems": ["..."],
  "priority": "high|medium|low"
}`,
    },
    {
      method: "POST",
      path: "/api/v1/email/reply",
      description: "Draft a reply to an email with a specific tone",
      body: `{
  "originalEmail": "...",
  "tone": "professional",
  "instructions": "Agree to meeting",
  "language": "English"
}`,
      response: `{
  "success": true,
  "reply": "...",
  "subject": "Re: ..."
}`,
    },
    {
      method: "POST",
      path: "/api/v1/email/compose",
      description: "Compose a new email from a prompt",
      body: `{
  "prompt": "Write a follow-up email...",
  "tone": "friendly",
  "recipientContext": "client",
  "language": "English"
}`,
      response: `{
  "success": true,
  "subject": "...",
  "body": "...",
  "greeting": "...",
  "closing": "..."
}`,
    },
    {
      method: "POST",
      path: "/api/v1/email/review",
      description: "Review and proofread a document",
      body: `{
  "content": "Text to review...",
  "reviewType": "comprehensive",
  "language": "English"
}`,
      response: `{
  "success": true,
  "correctedText": "...",
  "changes": ["..."],
  "score": 85,
  "suggestions": ["..."]
}`,
    },
    {
      method: "POST",
      path: "/api/v1/email/improve",
      description: "Improve writing style or translate",
      body: `{
  "text": "Text to improve...",
  "improvement": "professional",
  "targetLanguage": "French"
}`,
      response: `{
  "success": true,
  "improvedText": "..."
}`,
    },
  ];

  const curlExample = `curl -X POST ${baseUrl}/api/v1/email/summarize \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"emailContent": "Dear team, please review the Q4 report..."}'`;

  const pythonExample = `import requests

API_KEY = "YOUR_API_KEY"
BASE_URL = "${baseUrl}"

response = requests.post(
    f"{BASE_URL}/api/v1/email/summarize",
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    },
    json={"emailContent": "Dear team, please review..."}
)
data = response.json()
print(data["summary"])`;

  const outlookSummarizeCode = `// taskpane.js - Summarize the currently open email
Office.onReady(() => {
  document.getElementById("summarize-btn")
    .addEventListener("click", summarizeEmail);
});

async function summarizeEmail() {
  const item = Office.context.mailbox.item;

  // Read the email body
  item.body.getAsync(Office.CoercionType.Text, async (result) => {
    if (result.status !== Office.AsyncResultStatus.Succeeded) {
      showError("Could not read email body");
      return;
    }

    try {
      const response = await fetch("${baseUrl}/api/v1/email/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer YOUR_API_KEY"
        },
        body: JSON.stringify({ emailContent: result.value })
      });

      const data = await response.json();
      if (data.success) {
        document.getElementById("summary").innerText = data.summary;
        document.getElementById("sentiment").innerText = data.sentiment;
        showKeyPoints(data.keyPoints);
        showActionItems(data.actionItems);
      }
    } catch (err) {
      showError("Failed to summarize: " + err.message);
    }
  });
}`;

  const outlookReplyCode = `// Draft a reply using AI and insert it into a new reply
async function draftAIReply() {
  const item = Office.context.mailbox.item;

  item.body.getAsync(Office.CoercionType.Text, async (result) => {
    if (result.status !== Office.AsyncResultStatus.Succeeded) return;

    const response = await fetch("${baseUrl}/api/v1/email/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_API_KEY"
      },
      body: JSON.stringify({
        originalEmail: result.value,
        tone: "professional",
        instructions: document.getElementById("instructions").value
      })
    });

    const data = await response.json();
    if (data.success) {
      // Display the draft for the user to review and copy
      document.getElementById("draft-reply").innerText = data.reply;
      document.getElementById("draft-subject").innerText = data.subject;
    }
  });
}`;

  const outlookComposeCode = `// Compose a new email and insert into the Outlook compose window
async function composeWithAI() {
  const prompt = document.getElementById("compose-prompt").value;
  const tone = document.getElementById("tone-select").value;

  const response = await fetch("${baseUrl}/api/v1/email/compose", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_API_KEY"
    },
    body: JSON.stringify({ prompt, tone })
  });

  const data = await response.json();
  if (data.success) {
    // Insert the composed email into Outlook's compose body
    const fullBody = data.greeting + "\\n\\n" + data.body + "\\n\\n" + data.closing;
    Office.context.mailbox.item.body.setAsync(
      fullBody,
      { coercionType: Office.CoercionType.Text },
      (res) => {
        if (res.status === Office.AsyncResultStatus.Succeeded) {
          Office.context.mailbox.item.subject.setAsync(data.subject);
        }
      }
    );
  }
}`;

  const manifestSnippet = `<!-- manifest.xml - Key sections for your SAYELE Email Add-in -->
<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
           xsi:type="MailApp">
  <Id>YOUR-UNIQUE-GUID-HERE</Id>
  <Version>1.0.0</Version>
  <ProviderName>SAYELE</ProviderName>
  <DefaultLocale>en-US</DefaultLocale>
  <DisplayName DefaultValue="SAYELE AI Email Assistant" />
  <Description DefaultValue="AI-powered email summarization, replies, and composition" />
  
  <Hosts>
    <Host Name="Mailbox" />
  </Hosts>
  
  <Requirements>
    <Sets>
      <Set Name="Mailbox" MinVersion="1.1" />
    </Sets>
  </Requirements>

  <FormSettings>
    <Form xsi:type="ItemRead">
      <DesktopSettings>
        <SourceLocation DefaultValue="https://your-addin-host.com/taskpane.html" />
        <RequestedHeight>450</RequestedHeight>
      </DesktopSettings>
    </Form>
    <Form xsi:type="ItemEdit">
      <DesktopSettings>
        <SourceLocation DefaultValue="https://your-addin-host.com/taskpane.html" />
        <RequestedHeight>450</RequestedHeight>
      </DesktopSettings>
    </Form>
  </FormSettings>

  <Permissions>ReadWriteMailbox</Permissions>
  
  <Rule xsi:type="RuleCollection" Mode="Or">
    <Rule xsi:type="ItemIs" ItemType="Message" FormType="Read" />
    <Rule xsi:type="ItemIs" ItemType="Message" FormType="Edit" />
  </Rule>
</OfficeApp>`;

  return (
    <div className="space-y-6">
      {/* Base URL & Auth */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            SAYELE Email Assistant API
          </CardTitle>
          <CardDescription>
            Integrate AI email tools into Outlook, Microsoft 365, or any application using the SAYELE REST API.
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
              All endpoints require a Bearer token. Generate your API key from the <strong>API Keys</strong> page, then include it in every request.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono">
                {"Authorization: Bearer sk_live_xxxxxxxxxxxxxxxx"}
              </code>
              <CopyButton text="Authorization: Bearer sk_live_xxxxxxxxxxxxxxxx" />
            </div>
          </div>
          <div>
            <Label>Rate Limits</Label>
            <p className="text-sm text-muted-foreground mt-1">
              API requests are rate-limited per key. If you exceed the limit, you will receive a <code className="bg-muted px-1 rounded text-foreground">429</code> response with a <code className="bg-muted px-1 rounded text-foreground">Retry-After</code> header.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Start</CardTitle>
          <CardDescription>Test the API with cURL or Python</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-muted-foreground">cURL</Label>
              <CopyButton text={curlExample} />
            </div>
            <pre className="bg-muted px-3 py-2 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {curlExample}
            </pre>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-muted-foreground">Python</Label>
              <CopyButton text={pythonExample} />
            </div>
            <pre className="bg-muted px-3 py-2 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {pythonExample}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <div>
        <h3 className="text-lg font-semibold mb-4">API Endpoints</h3>
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
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-muted-foreground">Request body</Label>
                    <CopyButton text={ep.body} />
                  </div>
                  <pre className="bg-muted px-3 py-2 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                    {ep.body}
                  </pre>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-muted-foreground">Response</Label>
                    <CopyButton text={ep.response} />
                  </div>
                  <pre className="bg-muted px-3 py-2 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap text-green-700 dark:text-green-400">
                    {ep.response}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Outlook Integration Guide */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Code className="h-5 w-5" />
          Outlook / Microsoft 365 Integration Guide
        </h3>

        {/* Step 1: Overview */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              You can integrate SAYELE AI Email Assistant into <strong>Outlook Desktop</strong>, <strong>Outlook Web (OWA)</strong>, and <strong>Microsoft 365</strong> by building an <strong>Office Add-in</strong>. The add-in runs as a taskpane inside Outlook and calls the SAYELE API to process emails.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 mt-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <MailOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium text-foreground text-xs">Read Mode</p>
                <p className="text-xs mt-1">Summarize, extract action items from any email</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Reply className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium text-foreground text-xs">Reply Mode</p>
                <p className="text-xs mt-1">AI-draft replies with custom tone and instructions</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <PenLine className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium text-foreground text-xs">Compose Mode</p>
                <p className="text-xs mt-1">Generate new emails from a brief prompt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Prerequisites */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Step 1: Prerequisites</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                <span><strong>Node.js 18+</strong> installed on your development machine</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                <span><strong>SAYELE API Key</strong> &mdash; generate one from the API Keys page in your SAYELE dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                <span><strong>Microsoft 365 account</strong> (for testing the add-in in Outlook)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                <span><strong>Yeoman + Office Add-in Generator</strong> &mdash; install with the command below</span>
              </li>
            </ul>
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-muted-foreground">Install generator</Label>
                <CopyButton text="npm install -g yo generator-office" />
              </div>
              <pre className="bg-muted px-3 py-2 rounded-md text-xs font-mono">
                {"npm install -g yo generator-office"}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Create Project */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Step 2: Create the Add-in Project</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-muted-foreground">Generate a new Outlook Add-in</Label>
                <CopyButton text='yo office --projectType taskpane --name "SAYELE Email AI" --host outlook --js' />
              </div>
              <pre className="bg-muted px-3 py-2 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                {'yo office --projectType taskpane --name "SAYELE Email AI" --host outlook --js'}
              </pre>
            </div>
            <p>
              This generates a project with <code className="bg-muted px-1 rounded text-foreground">manifest.xml</code>, <code className="bg-muted px-1 rounded text-foreground">taskpane.html</code>, and <code className="bg-muted px-1 rounded text-foreground">taskpane.js</code>. The taskpane is the side panel that appears inside Outlook.
            </p>
          </CardContent>
        </Card>

        {/* Step 4: manifest.xml */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Step 3: Configure manifest.xml</CardTitle>
            <CardDescription>
              The manifest tells Outlook how to load your add-in. Key sections below:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-muted-foreground">manifest.xml</Label>
              <CopyButton text={manifestSnippet} />
            </div>
            <pre className="bg-muted px-3 py-2 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
              {manifestSnippet}
            </pre>
            <p className="text-xs text-muted-foreground mt-2">
              <strong>Note:</strong> Replace <code className="bg-muted px-1 rounded text-foreground">{"https://your-addin-host.com"}</code> with the URL where your add-in is hosted (or <code className="bg-muted px-1 rounded text-foreground">https://localhost:3000</code> for local development).
            </p>
          </CardContent>
        </Card>

        {/* Step 5: Summarize */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Step 4: Summarize Current Email</CardTitle>
            <CardDescription>Read the open email and send it to SAYELE for summarization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-muted-foreground">taskpane.js &mdash; Summarize</Label>
              <CopyButton text={outlookSummarizeCode} />
            </div>
            <pre className="bg-muted px-3 py-2 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-72 overflow-y-auto">
              {outlookSummarizeCode}
            </pre>
          </CardContent>
        </Card>

        {/* Step 6: Draft Reply */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Step 5: Draft an AI Reply</CardTitle>
            <CardDescription>Generate a reply draft and display it for user review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-muted-foreground">taskpane.js &mdash; Draft Reply</Label>
              <CopyButton text={outlookReplyCode} />
            </div>
            <pre className="bg-muted px-3 py-2 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-72 overflow-y-auto">
              {outlookReplyCode}
            </pre>
          </CardContent>
        </Card>

        {/* Step 7: Compose */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Step 6: Compose with AI</CardTitle>
            <CardDescription>Generate a full email and insert it into Outlook&apos;s compose window</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-muted-foreground">taskpane.js &mdash; Compose</Label>
              <CopyButton text={outlookComposeCode} />
            </div>
            <pre className="bg-muted px-3 py-2 rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-72 overflow-y-auto">
              {outlookComposeCode}
            </pre>
          </CardContent>
        </Card>

        {/* Step 8: Test & Deploy */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Step 7: Test & Deploy</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <div>
              <p className="font-medium text-foreground mb-2">Local Testing</p>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-muted-foreground">Start the dev server</Label>
                <CopyButton text="npm start" />
              </div>
              <pre className="bg-muted px-3 py-2 rounded-md text-xs font-mono">{"npm start"}</pre>
              <p className="mt-2">This starts a local HTTPS server and side-loads the add-in into Outlook. The taskpane will appear when you select an email.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-2">Deployment Options</p>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span><strong>Centralized (IT Admin)</strong> &mdash; Upload the manifest to your Microsoft 365 admin center for org-wide deployment</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span><strong>AppSource</strong> &mdash; Submit to the Microsoft AppSource marketplace for public distribution</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span><strong>Sideload</strong> &mdash; Manually load via Outlook settings for personal or testing use</span>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground mb-2">Sideload in Outlook Web</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open <strong>Outlook on the web</strong> (outlook.office.com)</li>
                <li>Click the <strong>gear icon</strong> &rarr; <strong>View all Outlook settings</strong></li>
                <li>Go to <strong>Mail</strong> &rarr; <strong>Customize actions</strong> &rarr; <strong>Get add-ins</strong></li>
                <li>Click <strong>My add-ins</strong> &rarr; <strong>Add a custom add-in</strong> &rarr; <strong>Add from file</strong></li>
                <li>Upload your <code className="bg-muted px-1 rounded text-foreground">manifest.xml</code></li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Security Note */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Security Best Practice
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Never hardcode your API key</strong> in the add-in JavaScript that gets distributed. Instead:
            </p>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span>Use a lightweight proxy server that holds the API key and forwards requests to SAYELE</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span>Or use Azure Key Vault / environment variables on your hosting platform</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span>For internal/org-only add-ins, restrict your SAYELE API key to your organization&apos;s IP range</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
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
