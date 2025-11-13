import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Navigate, Link, useParams } from "react-router-dom";
import Logo from "@/components/logo.tsx";
import { MessageSquare, TrendingUp, Shield, Zap, BarChart3, Globe, Users, BookOpen } from "lucide-react";
import { useIntl, FormattedMessage } from "react-intl";
import { LanguageSwitcher } from "@/components/language-switcher.tsx";

export default function Index() {
  const { lng } = useParams();
  
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
        <Navigate to={`/${lng || 'en'}/dashboard`} replace />
      </Authenticated>
    </>
  );
}

function LandingPage() {
  const intl = useIntl();
  const { lng } = useParams();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-end mb-8">
          <LanguageSwitcher />
        </div>
        <div className="text-center space-y-8 mb-16">
          <div className="flex justify-center mb-6">
            <Logo size="lg" showText={false} clickable={false} />
          </div>
          <h1 className="text-5xl md:text-6xl text-balance font-bold tracking-tight">
            <FormattedMessage id="home.hero.title" />
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            <FormattedMessage id="home.hero.subtitle" />
          </p>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            <FormattedMessage id="home.hero.description" />
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <SignInButton>
              <button className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                <FormattedMessage id="buttons.getStarted" />
              </button>
            </SignInButton>
            <Link to={`/${lng || 'en'}/docs`}>
              <button className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-colors flex items-center gap-2 justify-center w-full">
                <BookOpen className="h-5 w-5" />
                <FormattedMessage id="buttons.apiDocumentation" />
              </button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
          <FeatureCard
            icon={<MessageSquare className="h-8 w-8 text-primary" />}
            title={intl.formatMessage({ id: "home.features.multiChannel.title" })}
            description={intl.formatMessage({ id: "home.features.multiChannel.description" })}
          />
          <FeatureCard
            icon={<BarChart3 className="h-8 w-8 text-primary" />}
            title={intl.formatMessage({ id: "home.features.analytics.title" })}
            description={intl.formatMessage({ id: "home.features.analytics.description" })}
          />
          <FeatureCard
            icon={<Globe className="h-8 w-8 text-primary" />}
            title={intl.formatMessage({ id: "home.features.multiProvider.title" })}
            description={intl.formatMessage({ id: "home.features.multiProvider.description" })}
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8 text-primary" />}
            title={intl.formatMessage({ id: "home.features.fast.title" })}
            description={intl.formatMessage({ id: "home.features.fast.description" })}
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8 text-primary" />}
            title={intl.formatMessage({ id: "home.features.secure.title" })}
            description={intl.formatMessage({ id: "home.features.secure.description" })}
          />
          <FeatureCard
            icon={<TrendingUp className="h-8 w-8 text-primary" />}
            title={intl.formatMessage({ id: "home.features.bulk.title" })}
            description={intl.formatMessage({ id: "home.features.bulk.description" })}
          />
          <FeatureCard
            icon={<Users className="h-8 w-8 text-primary" />}
            title={intl.formatMessage({ id: "home.features.contacts.title" })}
            description={intl.formatMessage({ id: "home.features.contacts.description" })}
          />
          <FeatureCard
            icon={<MessageSquare className="h-8 w-8 text-primary" />}
            title={intl.formatMessage({ id: "home.features.templates.title" })}
            description={intl.formatMessage({ id: "home.features.templates.description" })}
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
