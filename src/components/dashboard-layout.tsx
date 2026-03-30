import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth.ts";
import { Button } from "@/components/ui/button.tsx";
import Logo from "@/components/logo.tsx";
import { LanguageSwitcher } from "@/components/language-switcher.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useIntl } from "react-intl";
import {
  Home,
  MessageSquare,
  Key,
  Settings,
  Users,
  Server,
  BarChart3,
  FileText,
  LogOut,
  Send,
  TestTube2,
  Webhook,
  UserPlus,
  Folders,
  Sparkles,
  BookOpen,
  SendHorizontal,
  Inbox,
  Coins,
  Zap,
  CreditCard,
  Bot,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Mail,
  MessagesSquare,
  Code,
  Shield,
  MailOpen,
  Megaphone,
  PenLine,
  ImageIcon,
  Library,
  Menu,
  Wand2,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import PendingActivation from "@/components/pending-activation.tsx";
import ContactFormOnboarding from "@/components/contact-form-onboarding.tsx";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet.tsx";

type NavItem = {
  path: string;
  label: string;
  icon: React.ReactNode;
};

type NavGroup = {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  defaultOpen?: boolean;
};

function NavGroupSection({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isAnyActive = group.items.some((item) => pathname === item.path);
  const [open, setOpen] = useState(group.defaultOpen || isAnyActive);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-3">
          {group.icon}
          {group.label}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
          {group.items.map((item) => (
            <Link key={item.path} to={item.path} onClick={onNavigate}>
              <button
                className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  pathname === item.path
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Shared sidebar content used in both desktop sidebar and mobile sheet
function SidebarContent({
  user,
  intl,
  lang,
  pathname,
  isRealAdmin,
  isTestMode,
  isAdmin,
  isSuperAdmin,
  hasEmailAssistant,
  hasMarketing,
  clients,
  setTestMode,
  topItems,
  navGroups,
  bottomItems,
  adminGroup,
  onNavigate,
}: {
  user: ReturnType<typeof useAuth>["user"];
  intl: ReturnType<typeof useIntl>;
  lang: string;
  pathname: string;
  isRealAdmin: boolean;
  isTestMode: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasEmailAssistant: boolean;
  hasMarketing: boolean;
  clients: Array<{ _id: Id<"clients">; companyName: string }> | undefined;
  setTestMode: (args: { clientId: Id<"clients"> | null }) => void;
  topItems: NavItem[];
  navGroups: NavGroup[];
  bottomItems: NavItem[];
  adminGroup: NavGroup;
  onNavigate?: () => void;
}) {
  return (
    <>
      {isRealAdmin && (
        <div className="p-4 border-b bg-muted/50">
          {isTestMode ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TestTube2 className="h-4 w-4 text-orange-500" />
                <Badge variant="outline" className="text-xs">{intl.formatMessage({ id: "dashboard.testMode" })}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {intl.formatMessage({ id: "dashboard.viewingAsClient" })}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setTestMode({ clientId: null })}
              >
                {intl.formatMessage({ id: "dashboard.exitTestMode" })}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-medium">{intl.formatMessage({ id: "dashboard.testAsClient" })}</label>
              <Select
                onValueChange={(value) => {
                  if (value && value !== "none") {
                    setTestMode({ clientId: value as Id<"clients"> });
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={intl.formatMessage({ id: "dashboard.selectClient" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{intl.formatMessage({ id: "dashboard.selectClient" })}</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {topItems.map((item) => (
          <Link key={item.path} to={item.path} onClick={onNavigate}>
            <button
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.path
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          </Link>
        ))}

        {navGroups.map((group) => (
          <NavGroupSection
            key={group.label}
            group={group}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}

        {bottomItems.map((item) => (
          <Link key={item.path} to={item.path} onClick={onNavigate}>
            <button
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.path
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          </Link>
        ))}

        {isAdmin && (
          <div className="pt-3 mt-2 border-t">
            <NavGroupSection group={adminGroup} pathname={pathname} onNavigate={onNavigate} />
          </div>
        )}
      </nav>

      <div className="p-4 border-t space-y-3">
        <LanguageSwitcher />
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-primary">
              {user?.profile.name?.charAt(0) || "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.profile.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.profile.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            try {
              sessionStorage.clear();
              localStorage.clear();
              
              const stored = localStorage.getItem("preferredLanguage");
              const langPref = stored && ["en", "fr"].includes(stored) ? stored : "en";
              localStorage.setItem("preferredLanguage", langPref);
              
              window.location.href = `/${langPref}`;
            } catch (error) {
              console.error("Sign out error:", error);
              window.location.href = "/";
            }
          }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {intl.formatMessage({ id: "buttons.signOut" })}
        </Button>
        <div className="mt-4 pt-4 border-t text-center">
          <a
            href="https://www.sayelesend.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            {intl.formatMessage({ id: "footer.developedBy" })} <span className="font-semibold text-primary">Sayelesend</span>
          </a>
        </div>
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const { lng } = useParams();
  const lang = lng || "en";
  const intl = useIntl();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const realUser = useQuery(api.users.getCurrentUser, {});
  const effectiveUser = useQuery(api.testMode.getEffectiveUser, {});
  const clients = useQuery(api.admin.listClients, realUser?.role === "admin" ? {} : "skip");
  const setTestMode = useMutation(api.testMode.setTestMode);

  const currentClient = useQuery(api.clients.getCurrentClient, {});

  const isAdmin = effectiveUser?.role === "admin";
  const isRealAdmin = realUser?.role === "admin";
  const isTestMode = effectiveUser?.isTestMode ?? false;
  const isSuperAdmin = isAdmin && !effectiveUser?.clientId;
  
  const hasEmailAssistant = currentClient?.emailAssistantEnabled === true;
  const hasMarketing = currentClient?.marketingEnabled === true;

  const isRejected = effectiveUser?.status === "rejected";
  
  const isPendingActivation = 
    effectiveUser?.role === "client" && 
    !effectiveUser?.clientId && 
    !isTestMode;

  const needsContactForm = 
    isPendingActivation && 
    !effectiveUser?.hasSubmittedContactForm;

  if (needsContactForm) {
    return <ContactFormOnboarding />;
  }

  if (isRejected && !isRealAdmin) {
    return <PendingActivation rejected />;
  }

  if (isPendingActivation) {
    return <PendingActivation />;
  }

  // Top-level standalone items
  const topItems: NavItem[] = [
    { path: `/${lang}/dashboard`, label: intl.formatMessage({ id: "nav.dashboard" }), icon: <Home className="h-5 w-5" /> },
  ];

  // Messaging group
  const messagingGroup: NavGroup = {
    label: intl.formatMessage({ id: "nav.group.messaging" }),
    icon: <Mail className="h-5 w-5" />,
    defaultOpen: true,
    items: [
      { path: `/${lang}/inbox`, label: intl.formatMessage({ id: "nav.inbox" }), icon: <MessagesSquare className="h-4 w-4" /> },
      { path: `/${lang}/messages`, label: intl.formatMessage({ id: "nav.outgoing" }), icon: <SendHorizontal className="h-4 w-4" /> },
      { path: `/${lang}/incoming`, label: intl.formatMessage({ id: "nav.incoming" }), icon: <Inbox className="h-4 w-4" /> },
      { path: `/${lang}/bulk`, label: intl.formatMessage({ id: "nav.bulk" }), icon: <Send className="h-4 w-4" /> },
      { path: `/${lang}/templates`, label: intl.formatMessage({ id: "nav.templates" }), icon: <FileText className="h-4 w-4" /> },
    ],
  };

  // Contacts & Automation group
  const contactsGroup: NavGroup = {
    label: intl.formatMessage({ id: "nav.group.contactsAutomation" }),
    icon: <UserPlus className="h-5 w-5" />,
    items: [
      { path: `/${lang}/contacts`, label: intl.formatMessage({ id: "nav.contacts" }), icon: <UserPlus className="h-4 w-4" /> },
      { path: `/${lang}/groups`, label: intl.formatMessage({ id: "nav.groups" }), icon: <Folders className="h-4 w-4" /> },
      { path: `/${lang}/automation`, label: intl.formatMessage({ id: "nav.automation" }), icon: <Zap className="h-4 w-4" /> },
      { path: `/${lang}/compliance`, label: intl.formatMessage({ id: "nav.compliance" }), icon: <ShieldCheck className="h-4 w-4" /> },
    ],
  };

  // Developer group
  const developerGroup: NavGroup = {
    label: intl.formatMessage({ id: "nav.group.developer" }),
    icon: <Code className="h-5 w-5" />,
    items: [
      { path: `/${lang}/webhooks`, label: intl.formatMessage({ id: "nav.webhooks" }), icon: <Webhook className="h-4 w-4" /> },
      { path: `/${lang}/api-keys`, label: intl.formatMessage({ id: "nav.apiKeys" }), icon: <Key className="h-4 w-4" /> },
      { path: `/${lang}/api-docs`, label: intl.formatMessage({ id: "nav.apiDocs" }), icon: <BookOpen className="h-4 w-4" /> },
    ],
  };

  // Marketing group
  const marketingGroup: NavGroup = {
    label: intl.formatMessage({ id: "nav.group.marketing" }),
    icon: <Megaphone className="h-5 w-5" />,
    items: [
      { path: `/${lang}/content-studio`, label: intl.formatMessage({ id: "nav.contentStudio" }), icon: <PenLine className="h-4 w-4" /> },
      { path: `/${lang}/image-creator`, label: intl.formatMessage({ id: "nav.imageCreator" }), icon: <ImageIcon className="h-4 w-4" /> },
      { path: `/${lang}/content-library`, label: intl.formatMessage({ id: "nav.contentLibrary" }), icon: <Library className="h-4 w-4" /> },
      { path: `/${lang}/document-agent`, label: intl.formatMessage({ id: "nav.documentAgent" }), icon: <Wand2 className="h-4 w-4" /> },
    ],
  };

  // Bottom standalone items
  const bottomItems: NavItem[] = [
    { path: `/${lang}/reports`, label: intl.formatMessage({ id: "nav.reports" }), icon: <BarChart3 className="h-5 w-5" /> },
    ...(!isSuperAdmin ? [{ path: `/${lang}/ai-assistants`, label: intl.formatMessage({ id: "nav.aiAssistants" }), icon: <Bot className="h-5 w-5" /> }] : []),
    ...(hasEmailAssistant ? [{ path: `/${lang}/email-assistant`, label: intl.formatMessage({ id: "nav.emailAssistant" }), icon: <MailOpen className="h-5 w-5" /> }] : []),
    { path: `/${lang}/payments`, label: intl.formatMessage({ id: "nav.creditsBilling" }), icon: <CreditCard className="h-5 w-5" /> },
    { path: `/${lang}/settings`, label: intl.formatMessage({ id: "nav.settings" }), icon: <Settings className="h-5 w-5" /> },
  ];

  // Admin group
  const adminGroup: NavGroup = {
    label: intl.formatMessage({ id: "nav.group.administration" }),
    icon: <Shield className="h-5 w-5" />,
    items: [
      { path: `/${lang}/admin/analytics`, label: intl.formatMessage({ id: "nav.analytics" }), icon: <BarChart3 className="h-4 w-4" /> },
      { path: `/${lang}/admin/clients`, label: intl.formatMessage({ id: "nav.clients" }), icon: <Users className="h-4 w-4" /> },
      { path: `/${lang}/admin/users`, label: intl.formatMessage({ id: "nav.users" }), icon: <Users className="h-4 w-4" /> },
      { path: `/${lang}/admin/providers`, label: intl.formatMessage({ id: "nav.providers" }), icon: <Server className="h-4 w-4" /> },
      { path: `/${lang}/admin/credits`, label: intl.formatMessage({ id: "nav.credits" }), icon: <Coins className="h-4 w-4" /> },
      { path: `/${lang}/admin/submissions`, label: intl.formatMessage({ id: "nav.submissions" }), icon: <FileText className="h-4 w-4" /> },
      { path: `/${lang}/ai-assistants`, label: intl.formatMessage({ id: "nav.aiAssistants" }), icon: <Bot className="h-4 w-4" /> },
      { path: `/${lang}/admin/ai-assistant`, label: intl.formatMessage({ id: "nav.aiAssistant" }), icon: <Sparkles className="h-4 w-4" /> },
    ],
  };

  const navGroups = [messagingGroup, contactsGroup, ...(hasMarketing || isSuperAdmin ? [marketingGroup] : []), developerGroup];

  const sidebarProps = {
    user,
    intl,
    lang,
    pathname: location.pathname,
    isRealAdmin: isRealAdmin ?? false,
    isTestMode,
    isAdmin: isAdmin ?? false,
    isSuperAdmin: isSuperAdmin ?? false,
    hasEmailAssistant,
    hasMarketing,
    clients: clients as Array<{ _id: Id<"clients">; companyName: string }> | undefined,
    setTestMode,
    topItems,
    navGroups,
    bottomItems,
    adminGroup,
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar - hidden on mobile */}
      <aside className="hidden lg:flex w-64 border-r bg-card flex-col shrink-0">
        <div className="p-6 border-b">
          <Link to={`/${lang}`}>
            <Logo size="sm" showText={true} clickable={false} />
          </Link>
        </div>
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile sidebar sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="p-4 border-b">
            <Link to={`/${lang}`} onClick={() => setMobileOpen(false)}>
              <Logo size="sm" showText={true} clickable={false} />
            </Link>
          </div>
          <div className="flex flex-col flex-1 overflow-hidden h-[calc(100vh-65px)]">
            <SidebarContent {...sidebarProps} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b bg-card shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Logo size="sm" showText={true} clickable={false} />
        </header>

        <main className="flex-1 overflow-auto">
          <div className="mx-auto p-4 sm:p-6 max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
