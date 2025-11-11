import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Navigate } from "react-router-dom";
import { MessageSquare, TrendingUp, Shield, Zap } from "lucide-react";

export default function Index() {
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
        <Navigate to="/dashboard" replace />
      </Authenticated>
    </>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 mb-16">
          <div className="inline-block px-4 py-2 bg-primary/10 rounded-full mb-4">
            <span className="text-sm font-medium text-primary">SAYELE SMS Platform</span>
          </div>
          <h1 className="text-5xl md:text-6xl text-balance font-bold tracking-tight">
            Enterprise SMS Management
            <br />
            <span className="text-primary">Made Simple</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful SMS API platform for businesses. Send messages, track delivery, and manage your communications all in one place.
          </p>
          <div className="flex gap-4 justify-center mt-8">
            <SignInButton>
              <button className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                Get Started
              </button>
            </SignInButton>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
          <FeatureCard
            icon={<MessageSquare className="h-8 w-8 text-primary" />}
            title="Easy Integration"
            description="Simple REST API with comprehensive documentation for quick integration."
          />
          <FeatureCard
            icon={<TrendingUp className="h-8 w-8 text-primary" />}
            title="Real-time Analytics"
            description="Track delivery status, engagement metrics, and performance in real-time."
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8 text-primary" />}
            title="Secure & Reliable"
            description="Enterprise-grade security with 99.9% uptime guarantee."
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8 text-primary" />}
            title="Lightning Fast"
            description="High-speed message delivery across multiple carriers worldwide."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 bg-card border rounded-lg hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
