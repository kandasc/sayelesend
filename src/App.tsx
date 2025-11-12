import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import DashboardLayout from "./components/dashboard-layout.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Dashboard from "./pages/dashboard/page.tsx";
import Messages from "./pages/messages/page.tsx";
import Templates from "./pages/templates/page.tsx";
import ApiKeys from "./pages/api-keys/page.tsx";
import Settings from "./pages/settings/page.tsx";
import BulkSMS from "./pages/bulk/page.tsx";
import Reports from "./pages/reports/page.tsx";
import IncomingMessages from "./pages/incoming/page.tsx";
import Webhooks from "./pages/webhooks/page.tsx";
import AdminAnalytics from "./pages/admin/analytics/page.tsx";
import AdminClients from "./pages/admin/clients/page.tsx";
import AdminUsers from "./pages/admin/users/page.tsx";
import AdminProviders from "./pages/admin/providers/page.tsx";
import AdminAIAssistant from "./pages/admin/ai-assistant/page.tsx";
import Contacts from "./pages/contacts/page.tsx";
import Groups from "./pages/groups/page.tsx";

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/messages" element={<DashboardLayout><Messages /></DashboardLayout>} />
          <Route path="/incoming" element={<DashboardLayout><IncomingMessages /></DashboardLayout>} />
          <Route path="/bulk" element={<DashboardLayout><BulkSMS /></DashboardLayout>} />
          <Route path="/contacts" element={<DashboardLayout><Contacts /></DashboardLayout>} />
          <Route path="/groups" element={<DashboardLayout><Groups /></DashboardLayout>} />
          <Route path="/templates" element={<DashboardLayout><Templates /></DashboardLayout>} />
          <Route path="/webhooks" element={<DashboardLayout><Webhooks /></DashboardLayout>} />
          <Route path="/reports" element={<DashboardLayout><Reports /></DashboardLayout>} />
          <Route path="/api-keys" element={<DashboardLayout><ApiKeys /></DashboardLayout>} />
          <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
          <Route path="/admin/analytics" element={<DashboardLayout><AdminAnalytics /></DashboardLayout>} />
          <Route path="/admin/clients" element={<DashboardLayout><AdminClients /></DashboardLayout>} />
          <Route path="/admin/users" element={<DashboardLayout><AdminUsers /></DashboardLayout>} />
          <Route path="/admin/providers" element={<DashboardLayout><AdminProviders /></DashboardLayout>} />
          <Route path="/admin/ai-assistant" element={<DashboardLayout><AdminAIAssistant /></DashboardLayout>} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
