import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Play, Pause, X, AlertCircle } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/colors';

const FOCUS_DURATION = 25 * 60 * 1000;

export default function FocusScreen() {
  const { startFocusSession, endFocusSession, addDistraction } = useApp();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(FOCUS_DURATION);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const handleComplete = useCallback(async () => {
    setIsActive(false);
    if (sessionId) {
      await endFocusSession(sessionId, true);
    }
    setTimeRemaining(FOCUS_DURATION);
    setSessionId(null);
  }, [sessionId, endFocusSession]);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1000) {
            handleComplete();
            return 0;
          }
          return prev - 1000;
        });
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
      setIsActive(true);
    }
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleCancel = async () => {
    setIsActive(false);
    if (sessionId) {
      await endFocusSession(sessionId, false);
    }
    setTimeRemaining(FOCUS_DURATION);
    setSessionId(null);
  };

  const handleDistraction = async () => {
    if (sessionId) {
      await addDistraction(sessionId);
    }
  };

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  const progress = 1 - (timeRemaining / FOCUS_DURATION);

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Deep Work</Text>
        <Text style={styles.subtitle}>
          {isActive ? 'Stay focused. Eliminate distractions.' : 'Ready to focus?'}
        </Text>

        <View style={styles.timerContainer}>
          <View style={styles.progressRing}>
            <View style={[styles.progressFill, { height: `${progress * 100}%` }]} />
          </View>
          <View style={styles.timerContent}>
            <Text style={styles.timer}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </Text>
            <Text style={styles.timerLabel}>minutes remaining</Text>
          </View>
        </View>

        <View style={styles.controls}>
          {!isActive && timeRemaining === FOCUS_DURATION && (
            <TouchableOpacity style={styles.buttonPrimary} onPress={handleStart}>
              <Play size={24} color={Colors.dark.text} fill={Colors.dark.text} strokeWidth={2} />
              <Text style={styles.buttonPrimaryText}>Start Session</Text>
            </TouchableOpacity>
          )}

          {isActive && (
            <>
              <TouchableOpacity style={styles.buttonSecondary} onPress={handlePause}>
                <Pause size={20} color={Colors.dark.text} strokeWidth={2} />
                <Text style={styles.buttonSecondaryText}>Pause</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.buttonDanger} onPress={handleDistraction}>
                <AlertCircle size={20} color={Colors.dark.danger} strokeWidth={2} />
                <Text style={styles.buttonDangerText}>Log Distraction</Text>
              </TouchableOpacity>
            </>
          )}

          {!isActive && timeRemaining < FOCUS_DURATION && (
            <>
              <TouchableOpacity style={styles.buttonPrimary} onPress={() => setIsActive(true)}>
                <Play size={24} color={Colors.dark.text} fill={Colors.dark.text} strokeWidth={2} />
                <Text style={styles.buttonPrimaryText}>Resume</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.buttonSecondary} onPress={handleCancel}>
                <X size={20} color={Colors.dark.text} strokeWidth={2} />
                <Text style={styles.buttonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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
    marginBottom: 48,
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