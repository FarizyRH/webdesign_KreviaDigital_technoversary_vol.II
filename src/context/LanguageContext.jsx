import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from '../i18n/en';
import id from '../i18n/id';

const STORAGE_KEY = 'igee_lang';
const DEFAULT_LANG = 'id';
const DICTIONARIES = { id, en };

const LanguageContext = createContext(null);

function isValidLang(value) {
  return value === 'id' || value === 'en';
}

function readStoredLang() {
  if (typeof window === 'undefined') {
    return DEFAULT_LANG;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isValidLang(stored) ? stored : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

function resolveDotPath(dictionary, key) {
  if (!dictionary || typeof key !== 'string' || !key) {
    return undefined;
  }
  const segments = key.split('.');
  let current = dictionary;
  for (let i = 0; i < segments.length; i += 1) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    const segment = segments[i];
    if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return typeof current === 'string' || typeof current === 'number'
    ? String(current)
    : undefined;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // Ignore storage errors in restricted or private browsing contexts
      }
    }
  }, [lang]);

  const setLang = useCallback((nextLang) => {
    if (isValidLang(nextLang)) {
      setLangState(nextLang);
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'id' ? 'en' : 'id'));
  }, []);

  const t = useCallback(
    (key) => {
      if (typeof key !== 'string') {
        return String(key ?? '');
      }
      const primary = resolveDotPath(DICTIONARIES[lang], key);
      if (primary !== undefined) {
        return primary;
      }
      if (lang !== 'en') {
        const fallback = resolveDotPath(DICTIONARIES.en, key);
        if (fallback !== undefined) {
          return fallback;
        }
      }
      return key;
    },
    [lang]
  );

  const pick = useCallback(
    (bilingualObj) => {
      if (bilingualObj == null) {
        return '';
      }
      if (typeof bilingualObj === 'string' || typeof bilingualObj === 'number') {
        return String(bilingualObj);
      }
      if (typeof bilingualObj === 'object') {
        const candidate = bilingualObj[lang] ?? bilingualObj.en ?? bilingualObj.id;
        return typeof candidate === 'string' || typeof candidate === 'number'
          ? String(candidate)
          : '';
      }
      return '';
    },
    [lang]
  );

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
      t,
      pick,
    }),
    [lang, setLang, toggleLang, t, pick]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
