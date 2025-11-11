import { MessageSquare } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  variant?: "default" | "light";
}

export default function Logo({ size = "md", showText = true, variant = "default" }: LogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  const subtextSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconColor = variant === "light" ? "text-white" : "text-primary";
  const textColor = variant === "light" ? "text-white" : "text-foreground";

  return (
    <div className="flex items-center gap-3">
      <div className={`relative ${iconColor}`}>
        <MessageSquare className={sizeClasses[size]} strokeWidth={2} fill="currentColor" fillOpacity={0.1} />
      </div>
      {showText && (
        <div className="flex flex-col">
          <h1 className={`${textSizeClasses[size]} font-bold leading-tight ${textColor}`}>
            Sayele Message
          </h1>
          <p className={`${subtextSizeClasses[size]} text-muted-foreground leading-tight`}>
            SMS Platform
          </p>
        </div>
      )}
    </div>
  );
}
