import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/types';
import Colors from '@/constants/colors';
import { Check } from 'lucide-react-native';

export default function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();

  const languages: { code: Language; name: string; nativeName: string }[] = [
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'en', name: 'English', nativeName: 'English' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('settings.language')}</Text>
      <View style={styles.optionsContainer}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.option,
              language === lang.code && styles.optionSelected,
            ]}
            onPress={() => setLanguage(lang.code)}
            activeOpacity={0.7}
          >
            <View style={styles.optionContent}>
              <View>
                <Text style={styles.languageName}>{lang.nativeName}</Text>
                <Text style={styles.languageSubtext}>{lang.name}</Text>
              </View>
              {language === lang.code && (
                <Check size={24} color={Colors.dark.primary} strokeWidth={3} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.dark.border,
  },
  optionSelected: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.surfaceHover,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 2,
  },
  languageSubtext: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
});