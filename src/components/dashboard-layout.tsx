import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth.ts";
import { Button } from "@/components/ui/button.tsx";
import Logo from "@/components/logo.tsx";
import { LanguageSwitcher } from "@/components/language-switcher.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
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
}: {
  group: NavGroup;
  pathname: string;
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
            <Link key={item.path} to={item.path}>
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const { lng } = useParams();
  const lang = lng || "en";
  
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

  if (isPendingActivation) {
    return <PendingActivation />;
  }

  // Top-level standalone items
  const topItems: NavItem[] = [
    { path: `/${lang}/dashboard`, label: "Dashboard", icon: <Home className="h-5 w-5" /> },
  ];

  // Messaging group
  const messagingGroup: NavGroup = {
    label: "Messaging",
    icon: <Mail className="h-5 w-5" />,
    defaultOpen: true,
    items: [
      { path: `/${lang}/inbox`, label: "Inbox", icon: <MessagesSquare className="h-4 w-4" /> },
      { path: `/${lang}/messages`, label: "Outgoing", icon: <SendHorizontal className="h-4 w-4" /> },
      { path: `/${lang}/incoming`, label: "Incoming", icon: <Inbox className="h-4 w-4" /> },
      { path: `/${lang}/bulk`, label: "Bulk SMS", icon: <Send className="h-4 w-4" /> },
      { path: `/${lang}/templates`, label: "Templates", icon: <FileText className="h-4 w-4" /> },
    ],
  };

  // Contacts & Automation group
  const contactsGroup: NavGroup = {
    label: "Contacts & Automation",
    icon: <UserPlus className="h-5 w-5" />,
    items: [
      { path: `/${lang}/contacts`, label: "Contacts", icon: <UserPlus className="h-4 w-4" /> },
      { path: `/${lang}/groups`, label: "Groups", icon: <Folders className="h-4 w-4" /> },
      { path: `/${lang}/automation`, label: "Automation", icon: <Zap className="h-4 w-4" /> },
      { path: `/${lang}/compliance`, label: "Compliance", icon: <ShieldCheck className="h-4 w-4" /> },
    ],
  };

  // Developer group
  const developerGroup: NavGroup = {
    label: "Developer",
    icon: <Code className="h-5 w-5" />,
    items: [
      { path: `/${lang}/webhooks`, label: "Webhooks", icon: <Webhook className="h-4 w-4" /> },
      { path: `/${lang}/api-keys`, label: "API Keys", icon: <Key className="h-4 w-4" /> },
      { path: `/${lang}/api-docs`, label: "API Docs", icon: <BookOpen className="h-4 w-4" /> },
    ],
  };

  // Bottom standalone items
  const bottomItems: NavItem[] = [
    { path: `/${lang}/reports`, label: "Reports", icon: <BarChart3 className="h-5 w-5" /> },
    ...(!isSuperAdmin ? [{ path: `/${lang}/ai-assistants`, label: "AI Assistants", icon: <Bot className="h-5 w-5" /> }] : []),
    ...(hasEmailAssistant ? [{ path: `/${lang}/email-assistant`, label: "Email Assistant", icon: <MailOpen className="h-5 w-5" /> }] : []),
    { path: `/${lang}/payments`, label: "Credits & Billing", icon: <CreditCard className="h-5 w-5" /> },
    { path: `/${lang}/settings`, label: "Settings", icon: <Settings className="h-5 w-5" /> },
  ];

  // Admin group
  const adminGroup: NavGroup = {
    label: "Administration",
    icon: <Shield className="h-5 w-5" />,
    items: [
      { path: `/${lang}/admin/analytics`, label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
      { path: `/${lang}/admin/clients`, label: "Clients", icon: <Users className="h-4 w-4" /> },
      { path: `/${lang}/admin/users`, label: "Users", icon: <Users className="h-4 w-4" /> },
      { path: `/${lang}/admin/providers`, label: "Providers", icon: <Server className="h-4 w-4" /> },
      { path: `/${lang}/admin/credits`, label: "Credits", icon: <Coins className="h-4 w-4" /> },
      { path: `/${lang}/admin/submissions`, label: "Submissions", icon: <FileText className="h-4 w-4" /> },
      { path: `/${lang}/ai-assistants`, label: "AI Assistants", icon: <Bot className="h-4 w-4" /> },
      { path: `/${lang}/admin/ai-assistant`, label: "AI Assistant", icon: <Sparkles className="h-4 w-4" /> },
    ],
  };

  const navGroups = [messagingGroup, contactsGroup, developerGroup];

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <Link to={`/${lang}`}>
            <Logo size="sm" showText={true} clickable={false} />
          </Link>
        </div>

        {isRealAdmin && (
          <div className="p-4 border-b bg-muted/50">
            {isTestMode ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TestTube2 className="h-4 w-4 text-orange-500" />
                  <Badge variant="outline" className="text-xs">Test Mode</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Viewing as client admin
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setTestMode({ clientId: null })}
                >
                  Exit Test Mode
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-medium">Test as Client</label>
                <Select
                  onValueChange={(value) => {
                    if (value && value !== "none") {
                      setTestMode({ clientId: value as Id<"clients"> });
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select a client</SelectItem>
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
          {/* Top standalone items */}
          {topItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            </Link>
          ))}

          {/* Collapsible groups */}
          {navGroups.map((group) => (
            <NavGroupSection
              key={group.label}
              group={group}
              pathname={location.pathname}
            />
          ))}

          {/* Bottom standalone items */}
          {bottomItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            </Link>
          ))}

          {/* Admin section */}
          {isAdmin && (
            <div className="pt-3 mt-2 border-t">
              <NavGroupSection group={adminGroup} pathname={location.pathname} />
            </div>
          )}
        </nav>

        <div className="p-4 border-t space-y-3">
          <LanguageSwitcher />
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
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
            Sign Out
          </Button>
          <div className="mt-4 pt-4 border-t text-center">
            <a
              href="https://sayele.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              Developed by <span className="font-semibold text-primary">SAYELE</span>
            </a>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
