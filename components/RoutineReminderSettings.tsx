import { useState } from 'react';
import { View, Text, StyleSheet, Switch, Modal, Pressable, TouchableOpacity } from 'react-native';
import { Sun, CloudSun, Moon, Flame, Clock3, ChevronDown, ChevronUp } from 'lucide-react-native';
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

const parseTime = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return {
    hour: Number.isFinite(hour) ? hour : 7,
    minute: Number.isFinite(minute) ? minute : 0,
  };
};

const formatTime = (hour: number, minute: number) => {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const wrapValue = (value: number, delta: number, max: number) => {
  return (value + delta + max + 1) % (max + 1);
};

export default function RoutineReminderSettings() {
  const { routineReminders, updateRoutineReminder } = useApp();
  const { t } = useLanguage();
  const [selectedReminderId, setSelectedReminderId] = useState<RoutineReminderId | null>(null);
  const [pickerHour, setPickerHour] = useState(7);
  const [pickerMinute, setPickerMinute] = useState(0);

  const selectedReminder = routineReminders.find(reminder => reminder.id === selectedReminderId);
  const selectedMeta = selectedReminder ? REMINDER_META[selectedReminder.id] : null;
  const SelectedIcon = selectedMeta?.icon ?? Clock3;

  const openTimePicker = (id: RoutineReminderId, time: string) => {
    const parsedTime = parseTime(time);
    setPickerHour(parsedTime.hour);
    setPickerMinute(parsedTime.minute);
    setSelectedReminderId(id);
  };

  const closeTimePicker = () => {
    setSelectedReminderId(null);
  };

  const confirmTime = () => {
    if (!selectedReminderId) return;

    updateRoutineReminder(selectedReminderId, {
      time: formatTime(pickerHour, pickerMinute),
    });
    closeTimePicker();
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
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => openTimePicker(reminder.id, reminder.time)}
                  disabled={!reminder.enabled}
                  style={[
                    styles.timeButton,
                    !reminder.enabled && styles.timeButtonDisabled,
                  ]}
                  accessibilityLabel={t('reminders.timeLabel')}
                >
                  <Clock3 size={15} color={reminder.enabled ? Colors.dark.text : Colors.dark.textTertiary} />
                  <Text style={[
                    styles.timeButtonText,
                    !reminder.enabled && styles.timeButtonTextDisabled,
                  ]}>
                    {reminder.time}
                  </Text>
                </TouchableOpacity>
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

      <Modal
        visible={Boolean(selectedReminder)}
        transparent
        animationType="fade"
        onRequestClose={closeTimePicker}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.timeModal}>
            <View style={styles.modalHeader}>
              <View style={[
                styles.modalIcon,
                selectedMeta && { backgroundColor: selectedMeta.color + '20' },
              ]}>
                <SelectedIcon
                  size={22}
                  color={selectedMeta?.color ?? Colors.dark.primary}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.modalCopy}>
                <Text style={styles.modalTitle}>{t('reminders.selectTime')}</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedReminder ? t(`reminders.${selectedReminder.id}Label`) : t('reminders.timeLabel')}
                </Text>
              </View>
            </View>

            <Text style={styles.previewTime}>{formatTime(pickerHour, pickerMinute)}</Text>

            <View style={styles.pickerControls}>
              <TimeUnit
                label={t('reminders.hour')}
                value={String(pickerHour).padStart(2, '0')}
                onIncrement={() => setPickerHour(hour => wrapValue(hour, 1, 23))}
                onDecrement={() => setPickerHour(hour => wrapValue(hour, -1, 23))}
              />
              <Text style={styles.timeSeparator}>:</Text>
              <TimeUnit
                label={t('reminders.minute')}
                value={String(pickerMinute).padStart(2, '0')}
                onIncrement={() => setPickerMinute(minute => wrapValue(minute, 5, 59))}
                onDecrement={() => setPickerMinute(minute => wrapValue(minute, -5, 59))}
              />
            </View>

            <View style={styles.minuteShortcuts}>
              {[0, 15, 30, 45].map(minute => (
                <Pressable
                  key={minute}
                  onPress={() => setPickerMinute(minute)}
                  style={[
                    styles.minuteChip,
                    pickerMinute === minute && styles.minuteChipActive,
                  ]}
                >
                  <Text style={[
                    styles.minuteChipText,
                    pickerMinute === minute && styles.minuteChipTextActive,
                  ]}>
                    {String(minute).padStart(2, '0')}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={closeTimePicker}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={confirmTime}
                style={styles.confirmButton}
              >
                <Text style={styles.confirmButtonText}>{t('reminders.confirmTime')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

interface TimeUnitProps {
  label: string;
  value: string;
  onIncrement: () => void;
  onDecrement: () => void;
}

function TimeUnit({ label, value, onIncrement, onDecrement }: TimeUnitProps) {
  return (
    <View style={styles.timeUnit}>
      <Text style={styles.timeUnitLabel}>{label}</Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onIncrement}
        style={styles.stepButton}
        accessibilityLabel={`${label} +`}
      >
        <ChevronUp size={22} color={Colors.dark.text} />
      </TouchableOpacity>
      <Text style={styles.timeUnitValue}>{value}</Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onDecrement}
        style={styles.stepButton}
        accessibilityLabel={`${label} -`}
      >
        <ChevronDown size={22} color={Colors.dark.text} />
      </TouchableOpacity>
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
  timeButton: {
    minWidth: 82,
    height: 38,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  timeButtonDisabled: {
    opacity: 0.45,
  },
  timeButtonText: {
    color: Colors.dark.text,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  timeButtonTextDisabled: {
    color: Colors.dark.textTertiary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    padding: 20,
  },
  timeModal: {
    backgroundColor: Colors.dark.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.dark.borderFocus,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.45,
    shadowRadius: 26,
    elevation: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalCopy: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  modalSubtitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.dark.textSecondary,
  },
  previewTime: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '800',
    color: Colors.dark.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    marginBottom: 18,
  },
  pickerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timeUnit: {
    width: 104,
    alignItems: 'center',
  },
  timeUnitLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  stepButton: {
    width: 48,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  timeUnitValue: {
    width: 82,
    textAlign: 'center',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: Colors.dark.text,
    fontVariant: ['tabular-nums'],
    marginVertical: 8,
  },
  timeSeparator: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    color: Colors.dark.textSecondary,
    marginTop: 22,
  },
  minuteShortcuts: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  minuteChip: {
    width: 52,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
  },
  minuteChipActive: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.primary + '20',
  },
  minuteChipText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  minuteChipTextActive: {
    color: Colors.dark.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
  },
  cancelButtonText: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  confirmButton: {
    flex: 1.4,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 12,
  },
  confirmButtonText: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    color: Colors.dark.background,
    textAlign: 'center',
  },
});
