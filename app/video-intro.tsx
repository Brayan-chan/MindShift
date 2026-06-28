import { type ComponentType, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BellRing, CalendarCheck2 } from 'lucide-react-native';
import { fulltoast } from 'fulltoast';
import Colors from '@/constants/colors';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApp } from '@/contexts/AppContext';
import AppIconMark from '@/components/AppIconMark';

export default function VideoIntroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { completeVideoIntro } = useApp();
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await completeVideoIntro();
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      fulltoast.error({
        title: t('auth.errorTitle'),
        description: error instanceof Error ? error.message : t('auth.errorBody'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}>
      <View style={styles.heroIcon}>
        <AppIconMark size={82} />
      </View>
      <Text style={styles.title}>{t('videoIntro.title')}</Text>
      <Text style={styles.subtitle}>{t('videoIntro.subtitle')}</Text>

      <View style={styles.list}>
        <IntroItem
          icon={BellRing}
          title={t('videoIntro.dailyTitle')}
          body={t('videoIntro.dailyBody')}
          color={Colors.dark.warning}
        />
        <IntroItem
          icon={CalendarCheck2}
          title={t('videoIntro.firstTitle')}
          body={t('videoIntro.firstBody')}
          color={Colors.dark.success}
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.86}
        disabled={isSaving}
        onPress={handleContinue}
        style={[styles.button, isSaving && styles.buttonDisabled]}
      >
        {isSaving ? (
          <ActivityIndicator color={Colors.dark.background} />
        ) : (
          <Text style={styles.buttonText}>{t('videoIntro.continue')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

type IntroItemProps = {
  icon: ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  title: string;
  body: string;
  color: string;
};

function IntroItem({ icon: Icon, title, body, color }: IntroItemProps) {
  return (
    <View style={styles.item}>
      <View style={[styles.itemIcon, { backgroundColor: color + '20' }]}>
        <Icon size={22} color={color} strokeWidth={2.2} />
      </View>
      <View style={styles.itemCopy}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  heroIcon: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.dark.textSecondary,
  },
  list: {
    gap: 12,
    marginTop: 28,
  },
  item: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 14,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemCopy: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  itemBody: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.dark.textSecondary,
  },
  button: {
    minHeight: 54,
    borderRadius: 20,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  buttonText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: Colors.dark.background,
  },
});
