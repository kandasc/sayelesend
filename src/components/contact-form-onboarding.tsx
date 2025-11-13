import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth.ts";
import Logo from "@/components/logo.tsx";
import { Home, LogOut, Building2 } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  contactName: z.string().min(2, "Contact name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(8, "Phone number must be at least 8 characters"),
  country: z.string().min(2, "Please select a country"),
  industry: z.string().optional(),
  expectedMonthlyVolume: z.string().optional(),
  useCase: z.string().optional(),
  additionalNotes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ContactFormOnboarding() {
  const { signoutRedirect } = useAuth();
  const { lng } = useParams();
  const lang = lng || "en";
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitContactForm = useMutation(api.contactForm.submitContactForm);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const country = watch("country");

  const handleLogout = async () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
      
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      await signoutRedirect();
      
      setTimeout(() => {
        window.location.href = `/${lang}`;
      }, 100);
    } catch (error) {
      console.error("Sign out error:", error);
      window.location.href = `/${lang}`;
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await submitContactForm({
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        country: data.country,
        industry: data.industry,
        expectedMonthlyVolume: data.expectedMonthlyVolume,
        useCase: data.useCase,
        additionalNotes: data.additionalNotes,
      });
      toast.success("Contact information submitted successfully!");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to submit contact information");
      }
    } finally {
      setIsSubmitting(false);
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
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome to SAYELE</CardTitle>
            <CardDescription className="text-base">
              Please provide your company details so we can set up your account and contact you to get started.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="companyName"
                  placeholder="Acme Corporation"
                  {...register("companyName")}
                />
                {errors.companyName && (
                  <p className="text-sm text-destructive">{errors.companyName.message}</p>
                )}
              </div>

              {/* Contact Name */}
              <div className="space-y-2">
                <Label htmlFor="contactName">
                  Contact Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contactName"
                  placeholder="John Smith"
                  {...register("contactName")}
                />
                {errors.contactName && (
                  <p className="text-sm text-destructive">{errors.contactName.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="country">
                  Country <span className="text-destructive">*</span>
                </Label>
                <Select value={country} onValueChange={(value) => setValue("country", value)}>
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="BF">Burkina Faso</SelectItem>
                    <SelectItem value="CI">Côte d'Ivoire</SelectItem>
                    <SelectItem value="GH">Ghana</SelectItem>
                    <SelectItem value="KE">Kenya</SelectItem>
                    <SelectItem value="NG">Nigeria</SelectItem>
                    <SelectItem value="SN">Senegal</SelectItem>
                    <SelectItem value="ZA">South Africa</SelectItem>
                    <SelectItem value="TZ">Tanzania</SelectItem>
                    <SelectItem value="UG">Uganda</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.country && (
                  <p className="text-sm text-destructive">{errors.country.message}</p>
                )}
              </div>

              {/* Industry */}
              <div className="space-y-2">
                <Label htmlFor="industry">Industry (Optional)</Label>
                <Input
                  id="industry"
                  placeholder="E-commerce, Healthcare, Education..."
                  {...register("industry")}
                />
              </div>

              {/* Expected Monthly Volume */}
              <div className="space-y-2">
                <Label htmlFor="expectedMonthlyVolume">Expected Monthly Message Volume (Optional)</Label>
                <Select
                  value={watch("expectedMonthlyVolume")}
                  onValueChange={(value) => setValue("expectedMonthlyVolume", value)}
                >
                  <SelectTrigger id="expectedMonthlyVolume">
                    <SelectValue placeholder="Select expected volume" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-1000">0 - 1,000 messages</SelectItem>
                    <SelectItem value="1000-10000">1,000 - 10,000 messages</SelectItem>
                    <SelectItem value="10000-50000">10,000 - 50,000 messages</SelectItem>
                    <SelectItem value="50000-100000">50,000 - 100,000 messages</SelectItem>
                    <SelectItem value="100000+">100,000+ messages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Use Case */}
              <div className="space-y-2">
                <Label htmlFor="useCase">Primary Use Case (Optional)</Label>
                <Textarea
                  id="useCase"
                  placeholder="Tell us about how you plan to use the platform..."
                  rows={3}
                  {...register("useCase")}
                />
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
                <Textarea
                  id="additionalNotes"
                  placeholder="Any additional information you'd like to share..."
                  rows={2}
                  {...register("additionalNotes")}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Information"}
              </Button>
            </form>
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
