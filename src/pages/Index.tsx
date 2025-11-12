import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Navigate, Link } from "react-router-dom";
import Logo from "@/components/logo.tsx";
import { MessageSquare, TrendingUp, Shield, Zap, BarChart3, Globe, Users, BookOpen } from "lucide-react";

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
          <div className="flex justify-center mb-6">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-5xl md:text-6xl text-balance font-bold tracking-tight">
            Sayele Message
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Professional SMS Platform
          </p>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful SMS API platform for businesses. Send messages, track delivery, and manage your communications with advanced analytics and multi-provider support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <SignInButton>
              <button className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                Get Started
              </button>
            </SignInButton>
            <Link to="/docs">
              <button className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-colors flex items-center gap-2 justify-center w-full">
                <BookOpen className="h-5 w-5" />
                API Documentation
              </button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
          <FeatureCard
            icon={<MessageSquare className="h-8 w-8 text-primary" />}
            title="Easy Integration"
            description="Simple REST API with comprehensive documentation for quick integration."
          />
          <FeatureCard
            icon={<BarChart3 className="h-8 w-8 text-primary" />}
            title="Advanced Analytics"
            description="Track delivery rates, message volume, and performance metrics in real-time."
          />
          <FeatureCard
            icon={<Globe className="h-8 w-8 text-primary" />}
            title="Multi-Provider"
            description="Connect with Twilio, Vonage, Africa's Talking, and MTarget for reliability."
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8 text-primary" />}
            title="Lightning Fast"
            description="High-speed message delivery across multiple carriers worldwide."
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8 text-primary" />}
            title="Secure & Reliable"
            description="Enterprise-grade security with webhook callbacks and automatic failover."
          />
          <FeatureCard
            icon={<TrendingUp className="h-8 w-8 text-primary" />}
            title="Bulk Messaging"
            description="Send thousands of messages at once with campaign management and scheduling."
          />
          <FeatureCard
            icon={<Users className="h-8 w-8 text-primary" />}
            title="Client Management"
            description="Powerful admin dashboard for managing multiple clients and users."
          />
          <FeatureCard
            icon={<MessageSquare className="h-8 w-8 text-primary" />}
            title="Templates & Webhooks"
            description="Save time with message templates and real-time delivery notifications."
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
