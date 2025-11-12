import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth.ts";
import { Button } from "@/components/ui/button.tsx";
import Logo from "@/components/logo.tsx";
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signoutRedirect } = useAuth();
  const location = useLocation();
  const realUser = useQuery(api.users.getCurrentUser, {});
  const effectiveUser = useQuery(api.testMode.getEffectiveUser, {});
  const clients = useQuery(api.admin.listClients, realUser?.role === "admin" ? {} : "skip");
  const setTestMode = useMutation(api.testMode.setTestMode);

  const isAdmin = effectiveUser?.role === "admin";
  const isRealAdmin = realUser?.role === "admin";
  const isTestMode = effectiveUser?.isTestMode ?? false;

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: <Home className="h-5 w-5" /> },
    { path: "/messages", label: "Messages", icon: <MessageSquare className="h-5 w-5" /> },
    { path: "/bulk", label: "Bulk SMS", icon: <Send className="h-5 w-5" /> },
    { path: "/templates", label: "Templates", icon: <FileText className="h-5 w-5" /> },
    { path: "/reports", label: "Reports", icon: <BarChart3 className="h-5 w-5" /> },
    { path: "/api-keys", label: "API Keys", icon: <Key className="h-5 w-5" /> },
    { path: "/settings", label: "Settings", icon: <Settings className="h-5 w-5" /> },
  ];

  const adminNavItems = [
    { path: "/admin/analytics", label: "Analytics", icon: <BarChart3 className="h-5 w-5" /> },
    { path: "/admin/clients", label: "Clients", icon: <Users className="h-5 w-5" /> },
    { path: "/admin/users", label: "Users", icon: <Users className="h-5 w-5" /> },
    { path: "/admin/providers", label: "Providers", icon: <Server className="h-5 w-5" /> },
  ];

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-card flex flex-col">
        <Link to="/dashboard" className="p-6 border-b block">
          <Logo size="sm" showText={true} />
        </Link>

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
                  variant="outline"
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

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
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

          {isAdmin && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase">
                  Admin
                </p>
              </div>
              {adminNavItems.map((item) => (
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
            </>
          )}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
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
            onClick={async () => {
              try {
                // Clear OIDC-related storage
                Object.keys(sessionStorage).forEach(key => {
                  if (key.startsWith('oidc.')) {
                    sessionStorage.removeItem(key);
                  }
                });
                Object.keys(localStorage).forEach(key => {
                  if (key.startsWith('oidc.')) {
                    localStorage.removeItem(key);
                  }
                });
                
                await signoutRedirect();
                // Force redirect after a short delay
                setTimeout(() => {
                  window.location.href = "/";
                }, 100);
              } catch (error) {
                console.error("Sign out error:", error);
                // Force redirect even if signout fails
                window.location.href = "/";
              }
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
