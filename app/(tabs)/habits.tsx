import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Circle, XCircle } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/colors';

export default function HabitsScreen() {
  const { habits, toggleHabit } = useApp();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const goodHabits = habits.filter(h => h.type === 'good');
  const badHabits = habits.filter(h => h.type === 'bad');

  const renderHabit = (habit: typeof habits[0]) => {
    const isGood = habit.type === 'good';
    const Icon = habit.completedToday
      ? (isGood ? CheckCircle2 : XCircle)
      : Circle;
    
    const iconColor = habit.completedToday
      ? (isGood ? Colors.dark.success : Colors.dark.danger)
      : Colors.dark.textTertiary;

    return (
      <TouchableOpacity
        key={habit.id}
        style={[
          styles.habitCard,
          habit.completedToday && (isGood ? styles.habitCardCompleted : styles.habitCardFailed),
        ]}
        onPress={() => toggleHabit(habit.id)}
      >
        <View style={styles.habitIcon}>
          <Icon size={28} color={iconColor} strokeWidth={2} />
        </View>
        <View style={styles.habitContent}>
          <Text style={styles.habitTitle}>{habit.title}</Text>
          <View style={styles.habitMeta}>
            <Text style={styles.habitCategory}>{habit.category}</Text>
            {isGood && (
              <>
                <View style={styles.dot} />
                <Text style={styles.habitStreak}>{habit.streak} day streak</Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
    >
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Build These</Text>
          <Text style={styles.sectionSubtitle}>Good habits to develop</Text>
        </View>
        {goodHabits.map(renderHabit)}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, styles.sectionTitleDanger]}>Break These</Text>
          <Text style={styles.sectionSubtitle}>Bad habits to eliminate</Text>
        </View>
        {badHabits.map(renderHabit)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  sectionTitleDanger: {
    color: Colors.dark.danger,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  habitCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.dark.border,
  },
  habitCardCompleted: {
    borderColor: Colors.dark.success,
    backgroundColor: Colors.dark.success + '10',
  },
  habitCardFailed: {
    borderColor: Colors.dark.danger,
    backgroundColor: Colors.dark.danger + '10',
  },
  habitIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  habitContent: {
    flex: 1,
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitCategory: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    textTransform: 'capitalize',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.dark.textTertiary,
    marginHorizontal: 6,
  },
  habitStreak: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
});