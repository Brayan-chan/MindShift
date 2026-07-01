import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  AtSign,
  Bell,
  KeyRound,
  LogOut,
  Mail,
  Minus,
  Plus,
  ShieldAlert,
  SlidersHorizontal,
  Target,
  User,
  Zap,
} from 'lucide-react-native';
import { fulltoast } from 'fulltoast';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/colors';
import LanguageSelector from '@/components/LanguageSelector';
import RoutineReminderSettings from '@/components/RoutineReminderSettings';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function SettingsScreen() {
  const router = useRouter();
  const {
    appSettings,
    profile,
    updateAppSettings,
    updateProfile,
    dailyXpGoal,
    autoDailyXpGoal,
    totalPenaltyXp,
    logoutSession,
  } = useApp();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { gamification } = appSettings;
  const { focusMode } = appSettings;
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');

  useEffect(() => {
    setDisplayName(profile?.displayName ?? '');
  }, [profile?.displayName]);

  const updateGamification = (updates: Partial<typeof gamification>) => {
    updateAppSettings({
      gamification: {
        ...gamification,
        ...updates,
      },
    });
  };

  const updateFocusMode = (updates: Partial<typeof focusMode>) => {
    updateAppSettings({
      focusMode: {
        ...focusMode,
        ...updates,
      },
    });
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({ displayName: displayName.trim() });
      fulltoast.success({
        title: t('settings.profileSaved'),
        description: t('settings.profileSavedBody'),
      });
    } catch (error) {
      fulltoast.error({
        title: t('common.error'),
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const testNotification = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        t('stats.notificationUnsupportedTitle'),
        t('stats.notificationUnsupportedBody')
      );
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('stats.testNotificationTitle'),
          body: t('stats.testNotificationBody'),
          data: { type: 'daily-video' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
        },
      });

      fulltoast.success({
        title: t('stats.notificationScheduledTitle'),
        description: t('stats.notificationScheduledBody'),
      });
    } catch (error) {
      fulltoast.error({
        title: t('common.error'),
        description: t('stats.notificationError').replace('{error}', String(error)),
      });
    }
  };

  const setManualGoal = (nextGoal: number) => {
    updateGamification({
      manualDailyXpGoal: clamp(nextGoal, 30, 200),
    });
  };

  const setPenalty = (
    key: 'badHabitPenalty' | 'missedGoalPenalty',
    nextPenalty: number
  ) => {
    updateGamification({
      [key]: clamp(nextPenalty, 0, 50),
    });
  };

  const setExitPenalty = (nextPenalty: number) => {
    updateFocusMode({
      exitPenalty: clamp(nextPenalty, 0, 50),
    });
  };

  const handleLogout = async () => {
    await logoutSession();
    router.replace('/auth');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <User size={20} color={Colors.dark.primary} />
          </View>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>{t('settings.profileTitle')}</Text>
            <Text style={styles.sectionDescription}>{t('settings.profileDescription')}</Text>
          </View>
        </View>

        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={t('auth.displayName')}
          placeholderTextColor={Colors.dark.textTertiary}
          style={styles.textInput}
        />

        <View style={styles.accountRows}>
          <View style={styles.accountRow}>
            <Mail size={18} color={Colors.dark.textTertiary} />
            <Text style={styles.accountText} numberOfLines={1}>
              {profile?.email ?? t('settings.noEmail')}
            </Text>
          </View>
          <View style={styles.accountRow}>
            <AtSign size={18} color={Colors.dark.textTertiary} />
            <Text style={styles.accountText} numberOfLines={1}>
              {profile?.username ? `@${profile.username}` : t('settings.noUsername')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.86}
          style={[
            styles.saveProfileButton,
            displayName.trim().length === 0 && styles.saveProfileButtonDisabled,
          ]}
          onPress={handleSaveProfile}
          disabled={displayName.trim().length === 0}
        >
          <Text style={styles.saveProfileText}>{t('common.save')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Target size={20} color={Colors.dark.primary} />
          </View>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>{t('settings.dailyGoalTitle')}</Text>
            <Text style={styles.sectionDescription}>{t('settings.dailyGoalDescription')}</Text>
          </View>
        </View>

        <View style={styles.goalSummary}>
          <View>
            <Text style={styles.goalLabel}>{t('settings.currentGoal')}</Text>
            <Text style={styles.goalValue}>{dailyXpGoal} XP</Text>
          </View>
          <View style={styles.goalBadge}>
            <Zap size={16} color={Colors.dark.warning} fill={Colors.dark.warning} />
            <Text style={styles.goalBadgeText}>
              {gamification.goalMode === 'auto' ? t('settings.auto') : t('settings.manual')}
            </Text>
          </View>
        </View>

        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segment,
              gamification.goalMode === 'auto' && styles.segmentActive,
            ]}
            onPress={() => updateGamification({ goalMode: 'auto' })}
          >
            <Text
              style={[
                styles.segmentText,
                gamification.goalMode === 'auto' && styles.segmentTextActive,
              ]}
            >
              {t('settings.auto')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segment,
              gamification.goalMode === 'manual' && styles.segmentActive,
            ]}
            onPress={() => updateGamification({ goalMode: 'manual' })}
          >
            <Text
              style={[
                styles.segmentText,
                gamification.goalMode === 'manual' && styles.segmentTextActive,
              ]}
            >
              {t('settings.manual')}
            </Text>
          </TouchableOpacity>
        </View>

        {gamification.goalMode === 'auto' ? (
          <View style={styles.infoPanel}>
            <Text style={styles.infoTitle}>{t('settings.autoGoal')}</Text>
            <Text style={styles.infoText}>
              {t('settings.autoGoalBody')
                .replace('{goal}', autoDailyXpGoal.toString())
                .replace('{max}', '120')}
            </Text>
          </View>
        ) : (
          <Stepper
            label={t('settings.manualGoal')}
            value={gamification.manualDailyXpGoal}
            suffix="XP"
            onDecrease={() => setManualGoal(gamification.manualDailyXpGoal - 10)}
            onIncrease={() => setManualGoal(gamification.manualDailyXpGoal + 10)}
          />
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, styles.warningIcon]}>
            <ShieldAlert size={20} color={Colors.dark.warning} />
          </View>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>{t('settings.strictFocusTitle')}</Text>
            <Text style={styles.sectionDescription}>{t('settings.strictFocusDescription')}</Text>
          </View>
          <Switch
            value={focusMode.strictModeEnabled}
            onValueChange={value => updateFocusMode({ strictModeEnabled: value })}
            thumbColor={Colors.dark.text}
            trackColor={{ false: Colors.dark.border, true: Colors.dark.warning }}
          />
        </View>

        <View style={styles.pinRow}>
          <View style={styles.pinIcon}>
            <KeyRound size={18} color={Colors.dark.warning} />
          </View>
          <TextInput
            value={focusMode.strictPin}
            onChangeText={value => updateFocusMode({ strictPin: value.replace(/\D/g, '').slice(0, 8) })}
            placeholder="1234"
            placeholderTextColor={Colors.dark.textTertiary}
            keyboardType="number-pad"
            secureTextEntry
            style={styles.pinInput}
          />
        </View>

        <Stepper
          label={t('settings.exitPenalty')}
          value={focusMode.exitPenalty}
          suffix="XP"
          onDecrease={() => setExitPenalty(focusMode.exitPenalty - 5)}
          onIncrease={() => setExitPenalty(focusMode.exitPenalty + 5)}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, styles.warningIcon]}>
            <ShieldAlert size={20} color={Colors.dark.warning} />
          </View>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>{t('settings.sanctionsTitle')}</Text>
            <Text style={styles.sectionDescription}>{t('settings.sanctionsDescription')}</Text>
          </View>
          <Switch
            value={gamification.sanctionsEnabled}
            onValueChange={value => updateGamification({ sanctionsEnabled: value })}
            thumbColor={Colors.dark.text}
            trackColor={{ false: Colors.dark.border, true: Colors.dark.warning }}
          />
        </View>

        {gamification.sanctionsEnabled && (
          <>
            <Stepper
              label={t('settings.badHabitPenalty')}
              value={gamification.badHabitPenalty}
              suffix="XP"
              onDecrease={() => setPenalty('badHabitPenalty', gamification.badHabitPenalty - 5)}
              onIncrease={() => setPenalty('badHabitPenalty', gamification.badHabitPenalty + 5)}
            />
            <Stepper
              label={t('settings.missedGoalPenalty')}
              value={gamification.missedGoalPenalty}
              suffix="XP"
              onDecrease={() => setPenalty('missedGoalPenalty', gamification.missedGoalPenalty - 5)}
              onIncrease={() => setPenalty('missedGoalPenalty', gamification.missedGoalPenalty + 5)}
            />
            <View style={styles.infoPanel}>
              <Text style={styles.infoTitle}>{t('settings.penaltiesApplied')}</Text>
              <Text style={styles.infoText}>
                {t('settings.penaltiesAppliedBody').replace('{penalty}', totalPenaltyXp.toString())}
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <SlidersHorizontal size={20} color={Colors.dark.primary} />
          </View>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          </View>
        </View>
        <LanguageSelector />
      </View>

      <RoutineReminderSettings />

      {__DEV__ && (
        <TouchableOpacity style={styles.testButton} onPress={testNotification}>
          <Bell size={20} color={Colors.dark.background} strokeWidth={2} />
          <Text style={styles.testButtonText}>{t('stats.testNotification')}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity activeOpacity={0.86} style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color={Colors.dark.danger} strokeWidth={2.2} />
        <View style={styles.logoutCopy}>
          <Text style={styles.logoutTitle}>{t('settings.logout')}</Text>
          <Text style={styles.logoutSubtitle}>{t('settings.logoutSubtitle')}</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

type StepperProps = {
  label: string;
  value: number;
  suffix: string;
  onDecrease: () => void;
  onIncrease: () => void;
};

function Stepper({ label, value, suffix, onDecrease, onIncrease }: StepperProps) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity style={styles.stepperButton} onPress={onDecrease}>
          <Minus size={18} color={Colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.stepperValue}>
          <Text style={styles.stepperNumber}>{value}</Text>
          <Text style={styles.stepperSuffix}>{suffix}</Text>
        </View>
        <TouchableOpacity style={styles.stepperButton} onPress={onIncrease}>
          <Plus size={18} color={Colors.dark.text} />
        </TouchableOpacity>
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
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: Colors.dark.textSecondary,
  },
  section: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningIcon: {
    backgroundColor: Colors.dark.warning + '18',
  },
  sectionCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionDescription: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  textInput: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  accountRows: {
    gap: 8,
  },
  accountRow: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  accountText: {
    flex: 1,
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  saveProfileButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveProfileButtonDisabled: {
    opacity: 0.45,
  },
  saveProfileText: {
    color: Colors.dark.background,
    fontSize: 15,
    fontWeight: '800',
  },
  goalSummary: {
    backgroundColor: Colors.dark.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  goalValue: {
    color: Colors.dark.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalBadgeText: {
    color: Colors.dark.warning,
    fontWeight: '800',
    fontSize: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 4,
    marginBottom: 12,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  segmentActive: {
    backgroundColor: Colors.dark.primary,
  },
  segmentText: {
    color: Colors.dark.textSecondary,
    fontWeight: '800',
    fontSize: 13,
  },
  segmentTextActive: {
    color: Colors.dark.text,
  },
  infoPanel: {
    backgroundColor: Colors.dark.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 14,
    marginTop: 4,
  },
  infoTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  infoText: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  stepper: {
    backgroundColor: Colors.dark.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 14,
    marginTop: 10,
  },
  stepperLabel: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    alignItems: 'center',
  },
  stepperNumber: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '800',
  },
  stepperSuffix: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  pinRow: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    marginTop: 2,
  },
  pinIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.dark.warning + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinInput: {
    flex: 1,
    minHeight: 52,
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 4,
  },
  testButton: {
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: Colors.dark.warning,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  testButtonText: {
    color: Colors.dark.background,
    fontSize: 14,
    fontWeight: '800',
  },
  logoutButton: {
    minHeight: 66,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.danger + '55',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  logoutCopy: {
    flex: 1,
  },
  logoutTitle: {
    color: Colors.dark.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  logoutSubtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
});
