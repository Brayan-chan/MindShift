import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AppState,
  Modal,
  Platform,
  TextInput,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play, Pause, X, ShieldAlert } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { fulltoast } from 'fulltoast';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/colors';
import { FOCUS_REWARD_BY_MINUTES, getFocusXpForMinutes } from '@/constants/focusRewards';

const FOCUS_OPTIONS = [10, 25, 50] as const;
const DEFAULT_FOCUS_MINUTES = 25;
const FOCUS_NOTIFICATION_CHANNEL_ID = 'focus_sessions';

const formatTimer = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.ceil(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function FocusScreen() {
  const { appSettings, startFocusSession, endFocusSession, addDistraction } = useApp();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [focusMinutes, setFocusMinutes] = useState(DEFAULT_FOCUS_MINUTES);
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_FOCUS_MINUTES * 60 * 1000);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [strictLocked, setStrictLocked] = useState(false);
  const [pinAttempt, setPinAttempt] = useState('');
  const [strictExitCount, setStrictExitCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const targetEndTimeRef = useRef<number | null>(null);
  const completionTriggeredRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const awayRecordedRef = useRef(false);
  const focusNotificationIdsRef = useRef<string[]>([]);
  const progressNotificationIdRef = useRef<string | null>(null);
  const focusDuration = focusMinutes * 60 * 1000;
  const focusRewardXp = getFocusXpForMinutes(focusMinutes);
  const strictModeEnabled = appSettings.focusMode.strictModeEnabled;
  const strictPin = appSettings.focusMode.strictPin || '1234';
  const exitPenalty = appSettings.focusMode.exitPenalty;

  const ensureFocusNotificationPermissions = useCallback(async () => {
    if (Platform.OS === 'web' || !appSettings.notifications.focusSessions) return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(FOCUS_NOTIFICATION_CHANNEL_ID, {
        name: t('focus.notificationChannelName'),
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 120, 80, 120],
        lightColor: Colors.dark.primary,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    const currentPermissions = await Notifications.getPermissionsAsync();
    const finalPermissions = currentPermissions.granted
      ? currentPermissions
      : await Notifications.requestPermissionsAsync();

    return finalPermissions.granted;
  }, [appSettings.notifications.focusSessions, t]);

  const trackNotificationId = useCallback((id: string) => {
    focusNotificationIdsRef.current = [...focusNotificationIdsRef.current, id];
  }, []);

  const clearFocusNotifications = useCallback(async () => {
    const ids = focusNotificationIdsRef.current;
    progressNotificationIdRef.current = null;
    focusNotificationIdsRef.current = [];

    await Promise.allSettled(ids.flatMap(id => [
      Notifications.cancelScheduledNotificationAsync(id),
      Notifications.dismissNotificationAsync(id),
    ]));
  }, []);

  const scheduleFocusCompletionNotification = useCallback(async (
    remainingMs: number,
    totalMs: number,
    rewardXp: number,
    activeSessionId: string
  ) => {
    const hasPermission = await ensureFocusNotificationPermissions();
    if (!hasPermission) return;

    const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: t('focus.notificationCompleteTitle'),
        body: t('focus.notificationCompleteBody').replace('{xp}', String(rewardXp)),
        subtitle: t('focus.notificationCompleteSubtitle'),
        sound: true,
        categoryIdentifier: 'focus_session',
        data: {
          type: 'focus-session',
          status: 'completed',
          url: '/(tabs)/focus',
          sessionId: activeSessionId,
          totalMs,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: FOCUS_NOTIFICATION_CHANNEL_ID,
      },
    });

    trackNotificationId(id);
  }, [ensureFocusNotificationPermissions, t, trackNotificationId]);

  const showFocusProgressNotification = useCallback(async (
    remainingMs: number,
    totalMs: number,
    activeSessionId: string
  ) => {
    const hasPermission = await ensureFocusNotificationPermissions();
    if (!hasPermission) return;

    if (progressNotificationIdRef.current) {
      await Notifications.dismissNotificationAsync(progressNotificationIdRef.current).catch(() => undefined);
    }

    const progressPercent = Math.max(
      0,
      Math.min(100, Math.round((1 - remainingMs / totalMs) * 100))
    );
    const minutesRemaining = Math.max(1, Math.ceil(remainingMs / 60000));
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: t('focus.notificationTitle'),
        subtitle: t('focus.notificationSubtitle'),
        body: t('focus.notificationBody')
          .replace('{remaining}', formatTimer(remainingMs))
          .replace('{total}', formatTimer(totalMs))
          .replace('{minutes}', String(minutesRemaining))
          .replace('{progress}', String(progressPercent)),
        sound: false,
        categoryIdentifier: 'focus_session',
        data: {
          type: 'focus-session',
          status: 'running',
          url: '/(tabs)/focus',
          sessionId: activeSessionId,
          remainingMs,
          totalMs,
          progressPercent,
        },
      },
      trigger: null,
    });

    progressNotificationIdRef.current = id;
    trackNotificationId(id);
  }, [ensureFocusNotificationPermissions, t, trackNotificationId]);

  const handleComplete = useCallback(async () => {
    setIsActive(false);
    if (sessionId) {
      await endFocusSession(sessionId, true, focusDuration);
    }
    await clearFocusNotifications();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      t('focus.focusComplete'),
      t('focus.rewardMessage').replace('{xp}', String(focusRewardXp))
    );
    setTimeRemaining(focusDuration);
    setSessionId(null);
    setStrictLocked(false);
    setPinAttempt('');
    setStrictExitCount(0);
    targetEndTimeRef.current = null;
  }, [endFocusSession, focusDuration, focusRewardXp, sessionId, t]);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        const remaining = Math.max(
          (targetEndTimeRef.current ?? Date.now()) - Date.now(),
          0
        );
        setTimeRemaining(remaining);

        if (remaining === 0 && !completionTriggeredRef.current) {
          completionTriggeredRef.current = true;
          handleComplete();
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, handleComplete]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasActive = appStateRef.current === 'active';
      const isLeaving = wasActive && nextAppState.match(/inactive|background/);
      const isReturning = appStateRef.current.match(/inactive|background/) && nextAppState === 'active';

      if (sessionId && isActive && isLeaving && !awayRecordedRef.current) {
        const remaining = Math.max((targetEndTimeRef.current ?? Date.now()) - Date.now(), 0);
        awayRecordedRef.current = true;
        showFocusProgressNotification(remaining, focusDuration, sessionId).catch(error => {
          console.log('Could not show focus progress notification:', error);
        });

        if (strictModeEnabled) {
          addDistraction(sessionId).catch(error => {
            console.log('Could not persist strict focus breach:', error);
          });
          setStrictExitCount(count => count + 1);
        }
      }

      if (sessionId && isReturning && awayRecordedRef.current) {
        awayRecordedRef.current = false;
        if (progressNotificationIdRef.current) {
          Notifications.dismissNotificationAsync(progressNotificationIdRef.current).catch(() => undefined);
          progressNotificationIdRef.current = null;
        }
        const remaining = Math.max((targetEndTimeRef.current ?? Date.now()) - Date.now(), 0);
        setTimeRemaining(remaining);

        if (strictModeEnabled && remaining > 0) {
          setStrictLocked(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
          fulltoast.error({
            title: t('focus.strictBreachTitle'),
            description: t('focus.strictBreachBody').replace('{xp}', String(exitPenalty)),
            duration: 4200,
          });
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [addDistraction, exitPenalty, focusDuration, isActive, sessionId, showFocusProgressNotification, strictModeEnabled, t]);

  const handleStart = async () => {
    const id = await startFocusSession();
    if (id) {
      await clearFocusNotifications();
      setSessionId(id);
      targetEndTimeRef.current = Date.now() + timeRemaining;
      completionTriggeredRef.current = false;
      setIsActive(true);
      scheduleFocusCompletionNotification(timeRemaining, focusDuration, focusRewardXp, id).catch(error => {
        console.log('Could not schedule focus completion notification:', error);
      });
    }
  };

  const handleResume = () => {
    targetEndTimeRef.current = Date.now() + timeRemaining;
    completionTriggeredRef.current = false;
    setIsActive(true);
    if (sessionId) {
      clearFocusNotifications()
        .then(() => scheduleFocusCompletionNotification(timeRemaining, focusDuration, focusRewardXp, sessionId))
        .catch(error => {
          console.log('Could not reschedule focus notification:', error);
        });
    }
  };

  const handlePause = () => {
    if (targetEndTimeRef.current) {
      setTimeRemaining(Math.max(targetEndTimeRef.current - Date.now(), 0));
    }
    targetEndTimeRef.current = null;
    setIsActive(false);
    clearFocusNotifications().catch(error => {
      console.log('Could not clear focus notification on pause:', error);
    });
  };

  const handleCancel = async () => {
    setIsActive(false);
    if (sessionId) {
      await endFocusSession(sessionId, false, focusDuration - timeRemaining);
    }
    await clearFocusNotifications();
    setTimeRemaining(focusDuration);
    setSessionId(null);
    setStrictLocked(false);
    setPinAttempt('');
    setStrictExitCount(0);
    targetEndTimeRef.current = null;
  };

  const handleUnlockStrictMode = () => {
    if (pinAttempt.trim() !== strictPin) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      fulltoast.error({
        title: t('focus.invalidPinTitle'),
        description: t('focus.invalidPinBody'),
        duration: 2600,
      });
      return;
    }

    setPinAttempt('');
    setStrictLocked(false);
  };

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  const progress = 1 - (timeRemaining / focusDuration);

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <Text style={styles.title}>{t('focus.title')}</Text>
        <Text style={styles.subtitle}>
          {isActive ? t('focus.stayFocused') : t('focus.ready')}
        </Text>

        <View style={[
          styles.strictBanner,
          strictModeEnabled ? styles.strictBannerActive : styles.strictBannerIdle,
        ]}>
          <ShieldAlert
            size={18}
            color={strictModeEnabled ? Colors.dark.warning : Colors.dark.textTertiary}
            strokeWidth={2.3}
          />
          <View style={styles.strictBannerCopy}>
            <Text style={styles.strictBannerTitle}>
              {strictModeEnabled ? t('focus.strictModeOn') : t('focus.strictModeOff')}
            </Text>
            <Text style={styles.strictBannerText}>
              {strictModeEnabled
                ? t('focus.strictModeBody').replace('{xp}', String(exitPenalty))
                : t('focus.strictModeOffBody')}
            </Text>
          </View>
        </View>

        <View style={styles.durationSelector}>
          {FOCUS_OPTIONS.map(option => (
            <TouchableOpacity
              key={option}
              style={[
                styles.durationOption,
                focusMinutes === option && styles.durationOptionSelected,
              ]}
              onPress={() => {
                if (!sessionId) {
                  setFocusMinutes(option);
                  setTimeRemaining(option * 60 * 1000);
                }
              }}
              disabled={Boolean(sessionId)}
            >
              <Text
                style={[
                  styles.durationText,
                  focusMinutes === option && styles.durationTextSelected,
                ]}
              >
                {option} {t('dashboard.minutes')}
              </Text>
              <Text
                style={[
                  styles.durationReward,
                  focusMinutes === option && styles.durationRewardSelected,
                ]}
              >
                +{FOCUS_REWARD_BY_MINUTES[option]} XP
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.timerContainer}>
          <View style={styles.progressRing}>
            <View style={[styles.progressFill, { height: `${progress * 100}%` }]} />
          </View>
          <View style={styles.timerContent}>
            <Text style={styles.timer}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </Text>
            <Text style={styles.timerLabel}>{t('focus.minutesRemaining')}</Text>
          </View>
        </View>

        <View style={styles.controls}>
          {!isActive && timeRemaining === focusDuration && (
            <TouchableOpacity style={styles.buttonPrimary} onPress={handleStart}>
              <Play size={24} color={Colors.dark.text} fill={Colors.dark.text} strokeWidth={2} />
              <Text style={styles.buttonPrimaryText}>{t('focus.startSession')}</Text>
            </TouchableOpacity>
          )}

          {isActive && (
            <>
              <TouchableOpacity style={styles.buttonSecondary} onPress={handlePause}>
                <Pause size={20} color={Colors.dark.text} strokeWidth={2} />
                <Text style={styles.buttonSecondaryText}>{t('focus.pauseSession')}</Text>
              </TouchableOpacity>
            </>
          )}

          {!isActive && timeRemaining < focusDuration && (
            <>
              <TouchableOpacity style={styles.buttonPrimary} onPress={handleResume}>
                <Play size={24} color={Colors.dark.text} fill={Colors.dark.text} strokeWidth={2} />
                <Text style={styles.buttonPrimaryText}>{t('focus.resumeSession')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.buttonSecondary} onPress={handleCancel}>
                <X size={20} color={Colors.dark.text} strokeWidth={2} />
                <Text style={styles.buttonSecondaryText}>{t('focus.cancelSession')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.rewardText}>
          {t('focus.rewardMessage').replace('{xp}', String(focusRewardXp))}
        </Text>
      </View>

      <Modal
        visible={strictLocked}
        transparent
        animationType="fade"
        onRequestClose={() => undefined}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.strictModal}>
            <View style={styles.strictModalIcon}>
              <ShieldAlert size={28} color={Colors.dark.warning} strokeWidth={2.5} />
            </View>
            <Text style={styles.strictModalTitle}>{t('focus.strictVerifyTitle')}</Text>
            <Text style={styles.strictModalText}>
              {t('focus.strictVerifyBody')
                .replace('{count}', String(strictExitCount))
                .replace('{xp}', String(strictExitCount * exitPenalty))}
            </Text>
            <TextInput
              value={pinAttempt}
              onChangeText={setPinAttempt}
              placeholder={t('focus.pinPlaceholder')}
              placeholderTextColor={Colors.dark.textTertiary}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
              style={styles.pinInput}
            />
            <TouchableOpacity style={styles.buttonPrimary} onPress={handleUnlockStrictMode}>
              <Text style={styles.buttonPrimaryText}>{t('focus.unlockSession')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.strictCancelButton} onPress={handleCancel}>
              <Text style={styles.strictCancelText}>{t('focus.cancelSession')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  strictBanner: {
    width: '100%',
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  strictBannerActive: {
    backgroundColor: Colors.dark.warning + '12',
    borderColor: Colors.dark.warning + '44',
  },
  strictBannerIdle: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
  },
  strictBannerCopy: {
    flex: 1,
  },
  strictBannerTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  strictBannerText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.dark.textSecondary,
  },
  durationSelector: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 4,
    marginBottom: 28,
  },
  durationOption: {
    flex: 1,
    minHeight: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationOptionSelected: {
    backgroundColor: Colors.dark.primary,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  durationTextSelected: {
    color: Colors.dark.background,
  },
  durationReward: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: Colors.dark.warning,
  },
  durationRewardSelected: {
    color: Colors.dark.background,
  },
  timerContainer: {
    width: 280,
    height: 280,
    marginBottom: 48,
    position: 'relative',
  },
  progressRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 140,
    borderWidth: 8,
    borderColor: Colors.dark.surface,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  progressFill: {
    width: '100%',
    backgroundColor: Colors.dark.primary,
  },
  timerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timer: {
    fontSize: 56,
    fontWeight: '700',
    color: Colors.dark.text,
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 4,
  },
  controls: {
    width: '100%',
    gap: 12,
  },
  rewardText: {
    marginTop: 14,
    fontSize: 13,
    color: Colors.dark.warning,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.84)',
    justifyContent: 'center',
    padding: 20,
  },
  strictModal: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 20,
  },
  strictModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.dark.warning + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  strictModalTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  strictModalText: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.dark.textSecondary,
  },
  pinInput: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 4,
  },
  strictCancelButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  strictCancelText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: Colors.dark.textSecondary,
  },
  buttonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.primary,
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
  },
  buttonPrimaryText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  buttonSecondaryText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  buttonDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.danger + '20',
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.dark.danger,
  },
  buttonDangerText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark.danger,
  },
});
