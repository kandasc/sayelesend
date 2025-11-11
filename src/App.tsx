import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Dashboard from "./pages/dashboard/page.tsx";
import Messages from "./pages/messages/page.tsx";
import Templates from "./pages/templates/page.tsx";
import ApiKeys from "./pages/api-keys/page.tsx";
import Settings from "./pages/settings/page.tsx";
import BulkSMS from "./pages/bulk/page.tsx";
import AdminClients from "./pages/admin/clients/page.tsx";
import AdminProviders from "./pages/admin/providers/page.tsx";

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/bulk" element={<BulkSMS />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/api-keys" element={<ApiKeys />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin/clients" element={<AdminClients />} />
          <Route path="/admin/providers" element={<AdminProviders />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
