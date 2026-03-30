import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ThemeProvider } from "next-themes";
import { convex } from "@/lib/convex.ts";
import { Toaster } from "@/components/ui/sonner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { QueryClientProvider } from "@/components/providers/query-client.tsx";
import { UpdateCurrentUserProvider } from "@/components/providers/update-current-user.tsx";

export function DefaultProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? ""}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <QueryClientProvider>
          <UpdateCurrentUserProvider>
            <TooltipProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
              >
                <Toaster />
                {children}
              </ThemeProvider>
            </TooltipProvider>
          </UpdateCurrentUserProvider>
        </QueryClientProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
