import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import { IntlProviderWrapper } from "./lib/IntlProviderWrapper.tsx";
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
import AdminCredits from "./pages/admin/credits/page.tsx";
import AdminSubmissions from "./pages/admin/submissions/page.tsx";
import AdminAIAssistant from "./pages/admin/ai-assistant/page.tsx";
import Contacts from "./pages/contacts/page.tsx";
import Groups from "./pages/groups/page.tsx";
import Automation from "./pages/automation/page.tsx";
import ApiDocs from "./pages/api-docs/page.tsx";
import PublicApiDocs from "./pages/docs/page.tsx";
import Payments from "./pages/payments/page.tsx";
import AIAssistants from "./pages/ai-assistants/page.tsx";
import UnifiedInbox from "./pages/inbox/page.tsx";
import Compliance from "./pages/compliance/page.tsx";
import EmailAssistant from "./pages/email-assistant/page.tsx";
import ContentStudio from "./pages/content-studio/page.tsx";
import ImageCreator from "./pages/image-creator/page.tsx";
import ContentLibrary from "./pages/content-library/page.tsx";

function LanguageWrapper({ children }: { children: React.ReactNode }) {
  const { lng } = useParams();

  useEffect(() => {
    if (lng) {
      document.documentElement.lang = lng;
      localStorage.setItem("preferredLanguage", lng);
    }
  }, [lng]);

  return (
    <IntlProviderWrapper locale={lng || "en"}>{children}</IntlProviderWrapper>
  );
}

export default function App() {
  // Get preferred language from localStorage or browser
  const getPreferredLanguage = () => {
    const stored = localStorage.getItem("preferredLanguage");
    if (stored && ["en", "fr"].includes(stored)) return stored;
    
    const browserLang = navigator.language.split("-")[0];
    return ["en", "fr"].includes(browserLang) ? browserLang : "en";
  };

  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          {/* Redirect root to preferred language */}
          <Route path="/" element={<Navigate to={`/${getPreferredLanguage()}`} replace />} />
          
          {/* Language-prefixed routes */}
          <Route path="/:lng" element={<LanguageWrapper><Index /></LanguageWrapper>} />
          <Route path="/:lng/docs" element={<LanguageWrapper><PublicApiDocs /></LanguageWrapper>} />
          <Route path="/:lng/dashboard" element={<LanguageWrapper><DashboardLayout><Dashboard /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/messages" element={<LanguageWrapper><DashboardLayout><Messages /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/incoming" element={<LanguageWrapper><DashboardLayout><IncomingMessages /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/inbox" element={<LanguageWrapper><DashboardLayout><UnifiedInbox /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/bulk" element={<LanguageWrapper><DashboardLayout><BulkSMS /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/contacts" element={<LanguageWrapper><DashboardLayout><Contacts /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/groups" element={<LanguageWrapper><DashboardLayout><Groups /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/automation" element={<LanguageWrapper><DashboardLayout><Automation /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/compliance" element={<LanguageWrapper><DashboardLayout><Compliance /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/email-assistant" element={<LanguageWrapper><DashboardLayout><EmailAssistant /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/content-studio" element={<LanguageWrapper><DashboardLayout><ContentStudio /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/image-creator" element={<LanguageWrapper><DashboardLayout><ImageCreator /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/content-library" element={<LanguageWrapper><DashboardLayout><ContentLibrary /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/templates" element={<LanguageWrapper><DashboardLayout><Templates /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/webhooks" element={<LanguageWrapper><DashboardLayout><Webhooks /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/reports" element={<LanguageWrapper><DashboardLayout><Reports /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/api-keys" element={<LanguageWrapper><DashboardLayout><ApiKeys /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/api-docs" element={<LanguageWrapper><DashboardLayout><ApiDocs /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/settings" element={<LanguageWrapper><DashboardLayout><Settings /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/payments" element={<LanguageWrapper><DashboardLayout><Payments /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/ai-assistants" element={<LanguageWrapper><DashboardLayout><AIAssistants /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/admin/analytics" element={<LanguageWrapper><DashboardLayout><AdminAnalytics /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/admin/clients" element={<LanguageWrapper><DashboardLayout><AdminClients /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/admin/users" element={<LanguageWrapper><DashboardLayout><AdminUsers /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/admin/providers" element={<LanguageWrapper><DashboardLayout><AdminProviders /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/admin/credits" element={<LanguageWrapper><DashboardLayout><AdminCredits /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/admin/submissions" element={<LanguageWrapper><DashboardLayout><AdminSubmissions /></DashboardLayout></LanguageWrapper>} />
          <Route path="/:lng/admin/ai-assistant" element={<LanguageWrapper><DashboardLayout><AdminAIAssistant /></DashboardLayout></LanguageWrapper>} />
          
          {/* Auth callback routes - both language-prefixed and non-prefixed for OIDC compatibility */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/:lng/auth/callback" element={<LanguageWrapper><AuthCallback /></LanguageWrapper>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<Navigate to={`/${getPreferredLanguage()}`} replace />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
