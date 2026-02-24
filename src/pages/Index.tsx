import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Navigate, Link, useParams } from "react-router-dom";
import Logo from "@/components/logo.tsx";
import { useIntl, FormattedMessage } from "react-intl";
import { LanguageSwitcher } from "@/components/language-switcher.tsx";
import { motion } from "motion/react";
import {
  MessageSquare,
  Send,
  BarChart3,
  Globe,
  Users,
  Zap,
  Shield,
  Bot,
  Mail,
  Inbox,
  FileText,
  Settings,
  Webhook,
  Code,
  Lock,
  Eye,
  UserCog,
  CreditCard,
  FileBarChart,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  ChevronRight,
} from "lucide-react";

export default function Index() {
  const { lng } = useParams();

  return (
    <>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Skeleton className="h-20 w-64" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <LandingPage />
      </Unauthenticated>
      <Authenticated>
        <Navigate to={`/${lng || "en"}/dashboard`} replace />
      </Authenticated>
    </>
  );
}

// ─── Animation wrapper ──────────────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Landing Page ───────────────────────────────────────────────────────────

function LandingPage() {
  const { lng } = useParams();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar lng={lng} />
      <HeroSection lng={lng} />
      <StatsBar />
      <ChannelsSection />
      <FeaturesSection />
      <AISection />
      <SecuritySection />
      <AdminSection />
      <IntegrationSection lng={lng} />
      <CTASection />
      <Footer lng={lng} />
    </div>
  );
}

// ─── Navbar ─────────────────────────────────────────────────────────────────

function Navbar({ lng }: { lng?: string }) {
  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Logo size="sm" clickable={false} />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            to={`/${lng || "en"}/docs`}
            className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <FormattedMessage id="home.cta.viewDocs" />
          </Link>
          <SignInButton>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
              <FormattedMessage id="home.cta.getStarted" />
            </button>
          </SignInButton>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────

function HeroSection({ lng }: { lng?: string }) {
  return (
    <section className="relative py-24 md:py-36 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 text-center">
        <FadeIn>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Zap className="h-4 w-4" />
            <FormattedMessage id="home.hero.trustedBy" />
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance max-w-4xl mx-auto leading-[1.1]">
            <FormattedMessage id="home.hero.subtitle" />
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mt-6 text-balance leading-relaxed">
            <FormattedMessage id="home.hero.description" />
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <SignInButton>
              <button className="px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 text-lg flex items-center gap-2 justify-center">
                <FormattedMessage id="home.cta.getStarted" />
                <ArrowRight className="h-5 w-5" />
              </button>
            </SignInButton>
            <Link to={`/${lng || "en"}/docs`}>
              <button className="px-8 py-3.5 bg-secondary text-secondary-foreground rounded-xl font-semibold hover:bg-secondary/80 transition-all flex items-center gap-2 justify-center w-full text-lg">
                <Code className="h-5 w-5" />
                <FormattedMessage id="home.cta.viewDocs" />
              </button>
            </Link>
          </div>
        </FadeIn>

        {/* Channel icons row */}
        <FadeIn delay={0.4}>
          <div className="flex items-center justify-center gap-8 mt-16">
            {["SMS", "WhatsApp", "Telegram", "Messenger"].map((ch) => (
              <div
                key={ch}
                className="flex items-center gap-2 text-muted-foreground text-sm font-medium"
              >
                <div className="h-2 w-2 rounded-full bg-primary" />
                {ch}
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Stats Bar ──────────────────────────────────────────────────────────────

function StatsBar() {
  const intl = useIntl();
  const stats = [
    { value: "10M+", label: intl.formatMessage({ id: "home.stats.messages" }) },
    { value: "4", label: intl.formatMessage({ id: "home.stats.channels" }) },
    { value: "99.9%", label: intl.formatMessage({ id: "home.stats.uptime" }) },
    { value: "25+", label: intl.formatMessage({ id: "home.stats.countries" }) },
  ];

  return (
    <section className="border-y border-border bg-muted/30">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.1}>
              <div className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stat.label}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Multi-Channel Section ──────────────────────────────────────────────────

function ChannelsSection() {
  const intl = useIntl();
  const channels = [
    {
      icon: <Smartphone className="h-8 w-8" />,
      name: intl.formatMessage({ id: "home.channel.sms" }),
      desc: intl.formatMessage({ id: "home.channel.sms.desc" }),
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      icon: <MessageSquare className="h-8 w-8" />,
      name: intl.formatMessage({ id: "home.channel.whatsapp" }),
      desc: intl.formatMessage({ id: "home.channel.whatsapp.desc" }),
      color: "bg-green-500/10 text-green-600 dark:text-green-400",
    },
    {
      icon: <Send className="h-8 w-8" />,
      name: intl.formatMessage({ id: "home.channel.telegram" }),
      desc: intl.formatMessage({ id: "home.channel.telegram.desc" }),
      color: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      icon: <MessageSquare className="h-8 w-8" />,
      name: intl.formatMessage({ id: "home.channel.messenger" }),
      desc: intl.formatMessage({ id: "home.channel.messenger.desc" }),
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <SectionHeader
          title={intl.formatMessage({ id: "home.section.channels" })}
          subtitle={intl.formatMessage({ id: "home.section.channels.subtitle" })}
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
          {channels.map((ch, i) => (
            <FadeIn key={ch.name} delay={i * 0.1}>
              <div className="p-6 bg-card border border-border rounded-2xl hover:shadow-lg hover:border-primary/20 transition-all group">
                <div
                  className={`h-14 w-14 rounded-xl flex items-center justify-center ${ch.color} mb-5 group-hover:scale-110 transition-transform`}
                >
                  {ch.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{ch.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {ch.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features Section ───────────────────────────────────────────────────────

function FeaturesSection() {
  const intl = useIntl();
  const features = [
    {
      icon: <Send className="h-5 w-5" />,
      title: intl.formatMessage({ id: "home.feature.bulkSms" }),
      desc: intl.formatMessage({ id: "home.feature.bulkSms.desc" }),
    },
    {
      icon: <Inbox className="h-5 w-5" />,
      title: intl.formatMessage({ id: "home.feature.inbox" }),
      desc: intl.formatMessage({ id: "home.feature.inbox.desc" }),
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: intl.formatMessage({ id: "home.feature.contacts" }),
      desc: intl.formatMessage({ id: "home.feature.contacts.desc" }),
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: intl.formatMessage({ id: "home.feature.templates" }),
      desc: intl.formatMessage({ id: "home.feature.templates.desc" }),
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: intl.formatMessage({ id: "home.feature.automation" }),
      desc: intl.formatMessage({ id: "home.feature.automation.desc" }),
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: intl.formatMessage({ id: "home.feature.analytics" }),
      desc: intl.formatMessage({ id: "home.feature.analytics.desc" }),
    },
    {
      icon: <Webhook className="h-5 w-5" />,
      title: intl.formatMessage({ id: "home.feature.webhooks" }),
      desc: intl.formatMessage({ id: "home.feature.webhooks.desc" }),
    },
    {
      icon: <Code className="h-5 w-5" />,
      title: intl.formatMessage({ id: "home.feature.api" }),
      desc: intl.formatMessage({ id: "home.feature.api.desc" }),
    },
    {
      icon: <Globe className="h-5 w-5" />,
      title: intl.formatMessage({ id: "home.feature.multiProvider" }),
      desc: intl.formatMessage({ id: "home.feature.multiProvider.desc" }),
    },
  ];

  return (
    <section className="py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <SectionHeader
          title={intl.formatMessage({ id: "home.section.features" })}
          subtitle={intl.formatMessage({ id: "home.section.features.subtitle" })}
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-14">
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.05}>
              <div className="flex gap-4 p-5 bg-card border border-border rounded-xl hover:shadow-md hover:border-primary/20 transition-all">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── AI Section ─────────────────────────────────────────────────────────────

function AISection() {
  const intl = useIntl();
  const aiFeatures = [
    {
      icon: <Bot className="h-8 w-8" />,
      title: intl.formatMessage({ id: "home.ai.chatbot" }),
      desc: intl.formatMessage({ id: "home.ai.chatbot.desc" }),
      gradient: "from-violet-500/10 to-purple-500/10",
    },
    {
      icon: <Mail className="h-8 w-8" />,
      title: intl.formatMessage({ id: "home.ai.email" }),
      desc: intl.formatMessage({ id: "home.ai.email.desc" }),
      gradient: "from-blue-500/10 to-cyan-500/10",
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: intl.formatMessage({ id: "home.ai.bulk" }),
      desc: intl.formatMessage({ id: "home.ai.bulk.desc" }),
      gradient: "from-amber-500/10 to-orange-500/10",
    },
    {
      icon: <Settings className="h-8 w-8" />,
      title: intl.formatMessage({ id: "home.ai.training" }),
      desc: intl.formatMessage({ id: "home.ai.training.desc" }),
      gradient: "from-emerald-500/10 to-green-500/10",
    },
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <SectionHeader
          title={intl.formatMessage({ id: "home.section.ai" })}
          subtitle={intl.formatMessage({ id: "home.section.ai.subtitle" })}
        />
        <div className="grid md:grid-cols-2 gap-6 mt-14">
          {aiFeatures.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.1}>
              <div
                className={`p-8 rounded-2xl border border-border bg-gradient-to-br ${f.gradient} hover:shadow-lg transition-all`}
              >
                <div className="text-primary mb-4">{f.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Security Section ───────────────────────────────────────────────────────

function SecuritySection() {
  const intl = useIntl();
  const items = [
    {
      icon: <Lock className="h-5 w-5" />,
      title: intl.formatMessage({ id: "home.security.encryption" }),
      desc: intl.formatMessage({ id: "home.security.encryption.desc" }),
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: intl.formatMessage({ id: "home.security.optout" }),
      desc: intl.formatMessage({ id: "home.security.optout.desc" }),
    },
    {
      icon: <UserCog className="h-5 w-5" />,
      title: intl.formatMessage({ id: "home.security.rbac" }),
      desc: intl.formatMessage({ id: "home.security.rbac.desc" }),
    },
    {
      icon: <Eye className="h-5 w-5" />,
      title: intl.formatMessage({ id: "home.security.audit" }),
      desc: intl.formatMessage({ id: "home.security.audit.desc" }),
    },
  ];

  return (
    <section className="py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <SectionHeader
          title={intl.formatMessage({ id: "home.section.security" })}
          subtitle={intl.formatMessage({ id: "home.section.security.subtitle" })}
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
          {items.map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.1}>
              <div className="text-center p-6 bg-card border border-border rounded-2xl hover:shadow-md transition-all">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Admin Tools Section ────────────────────────────────────────────────────

function AdminSection() {
  const intl = useIntl();
  const items = [
    {
      icon: <Users className="h-6 w-6" />,
      title: intl.formatMessage({ id: "home.admin.clients" }),
      desc: intl.formatMessage({ id: "home.admin.clients.desc" }),
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: intl.formatMessage({ id: "home.admin.credits" }),
      desc: intl.formatMessage({ id: "home.admin.credits.desc" }),
    },
    {
      icon: <FileBarChart className="h-6 w-6" />,
      title: intl.formatMessage({ id: "home.admin.reports" }),
      desc: intl.formatMessage({ id: "home.admin.reports.desc" }),
    },
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <SectionHeader
          title={intl.formatMessage({ id: "home.section.admin" })}
          subtitle={intl.formatMessage({ id: "home.section.admin.subtitle" })}
        />
        <div className="grid md:grid-cols-3 gap-8 mt-14">
          {items.map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.1}>
              <div className="p-8 bg-card border border-border rounded-2xl hover:shadow-lg hover:border-primary/20 transition-all">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Integration Section ────────────────────────────────────────────────────

function IntegrationSection({ lng }: { lng?: string }) {
  const intl = useIntl();

  const codeSnippet = `curl -X POST https://api.sayele.co/api/v1/sms/send \\
  -H "Authorization: Bearer sk_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+22890001234",
    "message": "Hello from SAYELE!",
    "channel": "sms"
  }'`;

  return (
    <section className="py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <SectionHeader
          title={intl.formatMessage({ id: "home.section.integration" })}
          subtitle={intl.formatMessage({
            id: "home.section.integration.subtitle",
          })}
        />
        <FadeIn delay={0.1}>
          <div className="max-w-3xl mx-auto mt-14">
            <div className="bg-[#1a1a2e] rounded-2xl p-6 md:p-8 border border-border/50 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-xs text-gray-400 ml-3 font-mono">
                  terminal
                </span>
              </div>
              <pre className="text-sm md:text-base text-green-400 font-mono overflow-x-auto whitespace-pre leading-relaxed">
                {codeSnippet}
              </pre>
            </div>
            <div className="text-center mt-8">
              <Link
                to={`/${lng || "en"}/docs`}
                className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
              >
                <FormattedMessage id="home.cta.viewDocs" />
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── CTA Section ────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <FadeIn>
          <div className="relative bg-primary rounded-3xl p-12 md:p-16 text-center overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4 text-balance">
                <FormattedMessage id="home.cta.getStarted" />
              </h2>
              <p className="text-primary-foreground/80 max-w-lg mx-auto mb-8 text-lg">
                <FormattedMessage id="home.hero.description" />
              </p>
              <SignInButton>
                <button className="px-8 py-3.5 bg-white text-primary rounded-xl font-semibold hover:bg-white/90 transition-all hover:shadow-lg text-lg inline-flex items-center gap-2">
                  <FormattedMessage id="home.cta.getStarted" />
                  <ArrowRight className="h-5 w-5" />
                </button>
              </SignInButton>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────

function Footer({ lng }: { lng?: string }) {
  const intl = useIntl();
  const year = new Date().getFullYear();

  const productLinks = [
    { label: "SMS", href: "#" },
    { label: "WhatsApp", href: "#" },
    { label: "Telegram", href: "#" },
    { label: "Messenger", href: "#" },
    { label: "AI Assistants", href: "#" },
    { label: "Email Assistant", href: "#" },
  ];

  const resourceLinks = [
    {
      label: intl.formatMessage({ id: "home.cta.viewDocs" }),
      href: `/${lng || "en"}/docs`,
    },
    {
      label: intl.formatMessage({ id: "buttons.apiDocumentation" }),
      href: `/${lng || "en"}/api-docs`,
    },
  ];

  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Logo size="sm" clickable={false} />
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              <FormattedMessage id="home.footer.tagline" />
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-sm mb-3">
              <FormattedMessage id="home.footer.product" />
            </h4>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-default">
                    {link.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-sm mb-3">
              <FormattedMessage id="home.footer.resources" />
            </h4>
            <ul className="space-y-2">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Channels */}
          <div>
            <h4 className="font-semibold text-sm mb-3">
              <FormattedMessage id="home.section.channels" />
            </h4>
            <div className="flex flex-wrap gap-2">
              {["SMS", "WhatsApp", "Telegram", "Messenger"].map((ch) => (
                <span
                  key={ch}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-card border border-border rounded-full text-xs text-muted-foreground"
                >
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  {ch}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-10 pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {year} Sayele Message.{" "}
            <FormattedMessage id="home.footer.copyright" />
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Shared Components ──────────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <FadeIn>
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">
          {title}
        </h2>
        <p className="text-muted-foreground mt-3 text-lg">{subtitle}</p>
      </div>
    </FadeIn>
  );
}
