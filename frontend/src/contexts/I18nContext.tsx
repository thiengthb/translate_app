import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { i18nApi } from "@/api/features/i18n.api";

interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, fallback?: string) => string;
  translations: Record<string, string>;
  loading: boolean;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key: string) => key,
  translations: {},
  loading: false,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<string>(
    () => localStorage.getItem("app-locale") || "en",
  );
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const setLocale = useCallback((newLocale: string) => {
    setLocaleState(newLocale);
    localStorage.setItem("app-locale", newLocale);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    i18nApi
      .getTranslations(locale)
      .then((data) => {
        if (!cancelled) {
          setTranslations(data);
        }
      })
      .catch(() => {
        // Translations may not exist yet, use keys as fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const t = useCallback(
    (key: string, fallback?: string) => {
      return translations[key] || fallback || key;
    },
    [translations],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, translations, loading }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
