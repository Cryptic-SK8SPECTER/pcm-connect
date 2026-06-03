import { useLocale } from "@/context/LocaleProvider";
import { getTranslations, TranslationKeys } from "@/lib/translations";

export function useTranslations(): TranslationKeys {
  const { locale } = useLocale();
  return getTranslations(locale);
}
