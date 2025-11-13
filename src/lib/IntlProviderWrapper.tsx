import { defaultLanguage, messages } from "@/locales";
import type { SupportedLanguage } from "@/locales";
import type { ReactNode } from "react";
import { IntlProvider } from "react-intl";

interface IntlProviderWrapperProps {
  locale: string;
  children: ReactNode;
}

export function IntlProviderWrapper({
  locale,
  children,
}: IntlProviderWrapperProps) {
  const supportedLocale = (
    locale in messages ? locale : defaultLanguage
  ) as SupportedLanguage;

  return (
    <IntlProvider
      locale={supportedLocale}
      defaultLocale={defaultLanguage}
      messages={messages[supportedLocale]}
    >
      {children}
    </IntlProvider>
  );
}
