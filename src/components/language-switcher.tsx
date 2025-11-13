import { useIntl } from "react-intl";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const intl = useIntl();
  const navigate = useNavigate();
  const location = useLocation();

  const changeLanguage = (lng: string) => {
    const pathParts = location.pathname.split("/");
    // Check if current path starts with a language code
    const currentLang = ["en", "fr"].includes(pathParts[1]) ? pathParts[1] : null;
    
    if (currentLang) {
      // Replace language in path
      pathParts[1] = lng;
      navigate(pathParts.join("/"));
    } else {
      // Add language to path
      navigate(`/${lng}${location.pathname}`);
    }
  };

  const languages = [
    { value: "en", label: "English" },
    { value: "fr", label: "Français" },
  ];

  return (
    <Select value={intl.locale} onValueChange={changeLanguage}>
      <SelectTrigger className="w-[140px] h-9">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.value} value={lang.value}>
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
