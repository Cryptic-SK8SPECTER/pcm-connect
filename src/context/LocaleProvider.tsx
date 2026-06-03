import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Locale = "pt" | "en" | "es";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => (localStorage.getItem("app_locale") as Locale) || "pt");

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    // Sync from backend on mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) {
        setTimeout(async () => {
          const { data } = await supabase.from("system_preferences").select("idioma").eq("user_id", session.user.id).maybeSingle();
          if (data?.idioma && ["pt", "en", "es"].includes(data.idioma)) {
            setLocaleState(data.idioma as Locale);
            localStorage.setItem("app_locale", data.idioma);
          }
        }, 0);
      }
    });

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from("system_preferences").select("idioma").eq("user_id", user.id).maybeSingle();
        if (data?.idioma && ["pt", "en", "es"].includes(data.idioma)) {
          setLocaleState(data.idioma as Locale);
          localStorage.setItem("app_locale", data.idioma);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setLocale = useMemo(() => (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("app_locale", l);
    document.documentElement.lang = l;
    // Persist to backend asynchronously
    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("system_preferences").upsert({ user_id: user.id, idioma: l }, { onConflict: 'user_id' });
      }
    }, 0);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
};