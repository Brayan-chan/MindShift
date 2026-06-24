import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play, Pause, X, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/colors';
import { FOCUS_REWARD_BY_MINUTES, getFocusXpForMinutes } from '@/constants/focusRewards';

const FOCUS_OPTIONS = [10, 25, 50] as const;
const DEFAULT_FOCUS_MINUTES = 25;

export default function FocusScreen() {
  const { startFocusSession, endFocusSession, addDistraction } = useApp();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [focusMinutes, setFocusMinutes] = useState(DEFAULT_FOCUS_MINUTES);
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_FOCUS_MINUTES * 60 * 1000);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const targetEndTimeRef = useRef<number | null>(null);
  const completionTriggeredRef = useRef(false);
  const focusDuration = focusMinutes * 60 * 1000;
  const focusRewardXp = getFocusXpForMinutes(focusMinutes);

  const handleComplete = useCallback(async () => {
    setIsActive(false);
    if (sessionId) {
      await endFocusSession(sessionId, true, focusDuration);
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      t('focus.focusComplete'),
      t('focus.rewardMessage').replace('{xp}', String(focusRewardXp))
    );
    setTimeRemaining(focusDuration);
    setSessionId(null);
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

  const handleStart = async () => {
    const id = await startFocusSession();
    if (id) {
      setSessionId(id);
      targetEndTimeRef.current = Date.now() + timeRemaining;
      completionTriggeredRef.current = false;
      setIsActive(true);
    }
  };

  const handleResume = () => {
    targetEndTimeRef.current = Date.now() + timeRemaining;
    completionTriggeredRef.current = false;
    setIsActive(true);
  };

  const handlePause = () => {
    if (targetEndTimeRef.current) {
      setTimeRemaining(Math.max(targetEndTimeRef.current - Date.now(), 0));
    }
    targetEndTimeRef.current = null;
    setIsActive(false);
  };

  const handleCancel = async () => {
    setIsActive(false);
    if (sessionId) {
      await endFocusSession(sessionId, false, focusDuration - timeRemaining);
    }
    setTimeRemaining(focusDuration);
    setSessionId(null);
    targetEndTimeRef.current = null;
  };

  const handleDistraction = async () => {
    if (sessionId) {
      await addDistraction(sessionId);
    }
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

              <TouchableOpacity style={styles.buttonDanger} onPress={handleDistraction}>
                <AlertCircle size={20} color={Colors.dark.danger} strokeWidth={2} />
                <Text style={styles.buttonDangerText}>{t('focus.logDistraction')}</Text>
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
  durationSelector: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    borderRadius: 8,
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
