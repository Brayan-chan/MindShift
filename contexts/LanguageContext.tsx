import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Language } from '@/types';
import { getTranslation } from '@/constants/translations';

const LANGUAGE_STORAGE_KEY = '@apex_language';

export const [LanguageProvider, useLanguage] = createContextHook(() => {
  const [language, setLanguageState] = useState<Language>('es');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'es' || stored === 'en') {
        setLanguageState(stored);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = useCallback(async (newLanguage: Language) => {
    try {
      setLanguageState(newLanguage);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
      console.log('Language saved:', newLanguage);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  }, []);

  const t = useCallback((key: string): string => {
    return getTranslation(language, key);
  }, [language]);

  return useMemo(() => ({
    language,
    setLanguage,
    t,
    isLoading,
  }), [language, setLanguage, t, isLoading]);
});