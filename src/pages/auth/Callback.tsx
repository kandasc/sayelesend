import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth.ts";
import { Spinner } from "@/components/ui/spinner.tsx";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { lng } = useParams();
  const { isLoading, isAuthenticated, error } = useAuth();

  useEffect(() => {
    // Get preferred language
    const getPreferredLanguage = () => {
      const stored = localStorage.getItem("preferredLanguage");
      if (stored && ["en", "fr"].includes(stored)) return stored;
      
      const browserLang = navigator.language.split("-")[0];
      return ["en", "fr"].includes(browserLang) ? browserLang : "en";
    };

    const targetLang = lng || getPreferredLanguage();

    // Redirect to home after auth completes
    if (!isLoading && isAuthenticated) {
      navigate(`/${targetLang}/dashboard`, { replace: true });
    }
    // Handle auth errors
    else if (!isLoading && error) {
      console.error("Authentication error:", error);
      navigate(`/${targetLang}`, { replace: true });
    }
    // Handle auth cancellation/failure
    else if (!isLoading && !isAuthenticated && !error) {
      console.warn(
        "Authentication completed without success or explicit error",
      );
      navigate(`/${targetLang}`, { replace: true });
    }
  }, [isLoading, isAuthenticated, error, navigate, lng]);

  return (
    <div className="flex items-center justify-center h-[100svh]">
      <Spinner className="size-8" />
    </div>
  );
}
