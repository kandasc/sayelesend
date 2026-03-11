import { Mail, Clock, CheckCircle2, Home, LogOut, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Link, useParams } from "react-router-dom";
import Logo from "@/components/logo.tsx";

type PendingActivationProps = {
  rejected?: boolean;
};

export default function PendingActivation({ rejected = false }: PendingActivationProps) {
  const { lng } = useParams();
  const lang = lng || "en";

  const handleLogout = () => {
    try {
      // Clear ALL storage
      sessionStorage.clear();
      localStorage.clear();
      
      // Reset language preference
      const stored = localStorage.getItem("preferredLanguage");
      const preferredLang = stored && ["en", "fr"].includes(stored) ? stored : "en";
      localStorage.setItem("preferredLanguage", preferredLang);
      
      // Direct redirect without OIDC signout (to avoid "no end session endpoint" error)
      window.location.href = `/${lang}`;
    } catch (error) {
      console.error("Sign out error:", error);
      window.location.href = `/${lang}`;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={`/${lang}`}>
            <Logo size="sm" showText={true} clickable={false} />
          </Link>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/${lang}`}>
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardContent className="p-8 space-y-6">
            <div className="flex justify-center">
              <div className={`h-20 w-20 rounded-full flex items-center justify-center ${
                rejected ? "bg-destructive/10" : "bg-primary/10"
              }`}>
                {rejected ? (
                  <XCircle className="h-10 w-10 text-destructive" />
                ) : (
                  <Clock className="h-10 w-10 text-primary" />
                )}
              </div>
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">
                {rejected ? "Access Request Denied" : "Account Pending Activation"}
              </h1>
              <p className="text-muted-foreground">
                {rejected
                  ? "Your request to access the platform has been reviewed and was not approved at this time."
                  : "Thank you for signing up! Your account is currently pending activation."}
              </p>
            </div>

            <div className="space-y-4 pt-4">
              {rejected ? (
                <>
                  <div className="flex gap-4 p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                    <div className="flex-shrink-0 mt-1">
                      <XCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">What does this mean?</p>
                      <p className="text-sm text-muted-foreground">
                        Your registration was reviewed by our team and was not approved. 
                        This could be due to incomplete information or other eligibility criteria.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">Need more information?</p>
                      <p className="text-sm text-muted-foreground">
                        If you believe this was a mistake or would like to appeal, 
                        please contact our support team. We will be happy to review your case.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">What happens next?</p>
                      <p className="text-sm text-muted-foreground">
                        Our team is reviewing your registration. Once your account is activated, 
                        you'll be able to access all platform features including SMS, WhatsApp, 
                        Telegram, and Facebook Messenger messaging.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">You'll be notified</p>
                      <p className="text-sm text-muted-foreground">
                        We'll send you an email notification as soon as your account is activated. 
                        This usually takes 1-2 business days.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-center text-muted-foreground">
                Need help? Contact our support team at{" "}
                <a 
                  href="mailto:support@sayele.co" 
                  className="text-primary hover:underline font-medium"
                >
                  support@sayele.co
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-4">
        <div className="container mx-auto px-4 text-center">
          <a
            href="https://sayele.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            Developed by <span className="font-semibold text-primary">SAYELE</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
