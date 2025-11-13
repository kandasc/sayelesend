import { Mail, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";

export default function PendingActivation() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-8 space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-10 w-10 text-primary" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Account Pending Activation</h1>
            <p className="text-muted-foreground">
              Thank you for signing up! Your account is currently pending activation.
            </p>
          </div>

          <div className="space-y-4 pt-4">
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
    </div>
  );
}
