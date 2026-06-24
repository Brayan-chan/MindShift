import { useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BatteryCharging, Check, ChevronLeft, Heart, Save, Sparkles } from 'lucide-react-native';
import { fulltoast } from 'fulltoast';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/colors';

const todayKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export default function ReflectionScreen() {
  const { saveReflection, todayReflection } = useApp();
  const { t, language } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [wins, setWins] = useState(todayReflection?.wins ?? '');
  const [improvements, setImprovements] = useState(todayReflection?.improvements ?? '');
  const [tomorrowGoals, setTomorrowGoals] = useState(todayReflection?.tomorrowGoals ?? '');
  const [gratitude, setGratitude] = useState(todayReflection?.gratitude ?? '');
  const [identityAffirmation, setIdentityAffirmation] = useState(
    todayReflection?.identityAffirmation ?? ''
  );
  const [energy, setEnergy] = useState(todayReflection?.energy ?? 3);
  const [mood, setMood] = useState(todayReflection?.mood ?? 3);

  const dateLabel = useMemo(() => {
    return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
  }, [language]);

  const canSave = Boolean(
    wins.trim() ||
    improvements.trim() ||
    tomorrowGoals.trim() ||
    gratitude.trim() ||
    identityAffirmation.trim()
  );

  const handleSave = async () => {
    if (!canSave) return;

    await saveReflection({
      date: todayKey(),
      wins: wins.trim(),
      improvements: improvements.trim(),
      tomorrowGoals: tomorrowGoals.trim(),
      gratitude: gratitude.trim(),
      identityAffirmation: identityAffirmation.trim(),
      energy,
      mood,
    });

    fulltoast.success({
      title: t('reflection.savedTitle'),
      description: t('reflection.savedBody'),
      duration: 1500,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel={t('common.back')}
          >
            <ChevronLeft size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.dateLabel}>{dateLabel}</Text>
            <Text style={styles.title}>{t('reflection.title')}</Text>
            <Text style={styles.subtitle}>{t('reflection.subtitle')}</Text>
          </View>
        </View>

        <View style={styles.statusBand}>
          <View style={styles.statusIcon}>
            {todayReflection ? (
              <Check size={21} color={Colors.dark.success} strokeWidth={2.4} />
            ) : (
              <Sparkles size={21} color={Colors.dark.warning} strokeWidth={2.4} />
            )}
          </View>
          <Text style={styles.statusText}>
            {todayReflection
              ? t('reflection.savedBody')
              : t('dashboard.dailyReflectionSubtitle')}
          </Text>
        </View>

        <View style={styles.form}>
          <ReflectionField
            label={t('reflection.todaysWins')}
            value={wins}
            placeholder={t('reflection.winsPlaceholder')}
            onChangeText={setWins}
          />
          <ReflectionField
            label={t('reflection.improvements')}
            value={improvements}
            placeholder={t('reflection.improvementsPlaceholder')}
            onChangeText={setImprovements}
          />
          <ReflectionField
            label={t('reflection.tomorrowGoals')}
            value={tomorrowGoals}
            placeholder={t('reflection.goalsPlaceholder')}
            onChangeText={setTomorrowGoals}
          />
          <ReflectionField
            label={t('reflection.gratitude')}
            value={gratitude}
            placeholder={t('reflection.gratitudePlaceholder')}
            onChangeText={setGratitude}
          />
          <ReflectionField
            label={t('reflection.identityAffirmation')}
            value={identityAffirmation}
            placeholder={t('reflection.affirmationPlaceholder')}
            onChangeText={setIdentityAffirmation}
          />

          <View style={styles.scoreGrid}>
            <ScorePicker
              icon={BatteryCharging}
              label={t('reflection.energy')}
              value={energy}
              onChange={setEnergy}
              color={Colors.dark.primary}
            />
            <ScorePicker
              icon={Heart}
              label={t('reflection.mood')}
              value={mood}
              onChange={setMood}
              color={Colors.dark.danger}
            />
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          onPress={handleSave}
          disabled={!canSave}
          style={[
            styles.saveButton,
            !canSave && styles.saveButtonDisabled,
          ]}
        >
          <Save size={21} color={Colors.dark.background} strokeWidth={2.4} />
          <Text style={styles.saveButtonText}>{t('reflection.saveReflection')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface ReflectionFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
}

function ReflectionField({ label, value, placeholder, onChangeText }: ReflectionFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.dark.textTertiary}
        multiline
        textAlignVertical="top"
        style={styles.textArea}
      />
    </View>
  );
}

interface ScorePickerProps {
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  value: number;
  onChange: (value: number) => void;
  color: string;
}

function ScorePicker({ icon: Icon, label, value, onChange, color }: ScorePickerProps) {
  return (
    <View style={styles.scorePanel}>
      <View style={styles.scoreHeader}>
        <View style={[styles.scoreIcon, { backgroundColor: color + '20' }]}>
          <Icon size={18} color={color} strokeWidth={2.3} />
        </View>
        <Text style={styles.scoreLabel}>{label}</Text>
      </View>
      <View style={styles.scoreOptions}>
        {[1, 2, 3, 4, 5].map(score => (
          <TouchableOpacity
            key={score}
            activeOpacity={0.78}
            onPress={() => onChange(score)}
            style={[
              styles.scoreButton,
              value === score && { backgroundColor: color, borderColor: color },
            ]}
          >
            <Text style={[
              styles.scoreButtonText,
              value === score && styles.scoreButtonTextSelected,
            ]}>
              {score}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginRight: 12,
  },
  headerCopy: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: Colors.dark.primary,
    textTransform: 'capitalize',
    marginBottom: 3,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  subtitle: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.dark.textSecondary,
  },
  statusBand: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  statusIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.background,
    marginRight: 10,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  form: {
    gap: 14,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  textArea: {
    minHeight: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    color: Colors.dark.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 21,
  },
  scoreGrid: {
    gap: 12,
    marginTop: 2,
  },
  scorePanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    padding: 14,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  scoreLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  scoreOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreButton: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  scoreButtonText: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    color: Colors.dark.textSecondary,
  },
  scoreButtonTextSelected: {
    color: Colors.dark.background,
  },
  saveButton: {
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: Colors.dark.background,
  },
});
