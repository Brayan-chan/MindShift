import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, Platform } from 'react-native';
import { Sun, CloudSun, Moon, Flame } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { RoutineReminderId } from '@/types';
import Colors from '@/constants/colors';

const REMINDER_META = {
  morning: { icon: Sun, color: Colors.dark.warning },
  afternoon: { icon: CloudSun, color: Colors.dark.primary },
  evening: { icon: Moon, color: '#A78BFA' },
  streak: { icon: Flame, color: Colors.dark.danger },
} as const;

const isValidTime = (time: string) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return Boolean(match);
};

export default function RoutineReminderSettings() {
  const { routineReminders, updateRoutineReminder } = useApp();
  const { t } = useLanguage();
  const [draftTimes, setDraftTimes] = useState<Record<RoutineReminderId, string>>(
    () => Object.fromEntries(
      routineReminders.map(reminder => [reminder.id, reminder.time])
    ) as Record<RoutineReminderId, string>
  );

  useEffect(() => {
    setDraftTimes(
      Object.fromEntries(
        routineReminders.map(reminder => [reminder.id, reminder.time])
      ) as Record<RoutineReminderId, string>
    );
  }, [routineReminders]);

  const commitTime = (id: RoutineReminderId) => {
    const draft = draftTimes[id];
    const reminder = routineReminders.find(item => item.id === id);

    if (isValidTime(draft)) {
      updateRoutineReminder(id, { time: draft });
    } else if (reminder) {
      setDraftTimes(prev => ({ ...prev, [id]: reminder.time }));
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t('reminders.title')}</Text>
      <Text style={styles.subtitle}>{t('reminders.subtitle')}</Text>

      <View style={styles.list}>
        {routineReminders.map(reminder => {
          const meta = REMINDER_META[reminder.id];
          const Icon = meta.icon;

          return (
            <View key={reminder.id} style={styles.row}>
              <View style={[styles.iconContainer, { backgroundColor: meta.color + '20' }]}>
                <Icon size={21} color={meta.color} strokeWidth={2} />
              </View>

              <View style={styles.copy}>
                <Text style={styles.label}>{t(`reminders.${reminder.id}Label`)}</Text>
                <Text style={styles.description}>
                  {t(`reminders.${reminder.id}Description`)}
                </Text>
              </View>

              <View style={styles.controls}>
                <TextInput
                  value={draftTimes[reminder.id] ?? reminder.time}
                  onChangeText={time => {
                    setDraftTimes(prev => ({ ...prev, [reminder.id]: time }));
                  }}
                  onEndEditing={() => commitTime(reminder.id)}
                  onSubmitEditing={() => commitTime(reminder.id)}
                  editable={reminder.enabled}
                  maxLength={5}
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
                  style={[
                    styles.timeInput,
                    !reminder.enabled && styles.timeInputDisabled,
                  ]}
                  accessibilityLabel={t('reminders.timeLabel')}
                />
                <Switch
                  value={reminder.enabled}
                  onValueChange={enabled => {
                    updateRoutineReminder(reminder.id, { enabled });
                  }}
                  trackColor={{
                    false: Colors.dark.border,
                    true: Colors.dark.primaryDark,
                  }}
                  thumbColor={reminder.enabled ? Colors.dark.primary : Colors.dark.textTertiary}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.dark.textSecondary,
    marginBottom: 16,
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  row: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    paddingVertical: 14,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  copy: {
    flex: 1,
    paddingRight: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 3,
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.dark.textSecondary,
  },
  controls: {
    alignItems: 'center',
    gap: 6,
  },
  timeInput: {
    width: 58,
    height: 32,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 6,
    color: Colors.dark.text,
    backgroundColor: Colors.dark.surface,
    textAlign: 'center',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  timeInputDisabled: {
    opacity: 0.45,
  },
});
