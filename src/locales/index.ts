import enCommon from "./en/common.json";
import enHome from "./en/home.json";
import frCommon from "./fr/common.json";
import frHome from "./fr/home.json";

export const messages = {
  en: {
    ...enCommon,
    ...enHome,
  },
  fr: {
    ...frCommon,
    ...frHome,
  },
};

export const supportedLanguages = ["en", "fr"] as const;
export const defaultLanguage = "en";

export type SupportedLanguage = (typeof supportedLanguages)[number];
