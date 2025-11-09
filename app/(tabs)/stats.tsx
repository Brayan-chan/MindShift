import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, Flame, Clock, CheckCircle } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/colors';
import LanguageSelector from '@/components/LanguageSelector';

export default function StatsScreen() {
  const { habits, sessions, currentStreak, totalFocusTime } = useApp();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const completedHabits = habits.filter(h => h.completedToday).length;
  const totalHabits = habits.length;
  const completionRate = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;
  
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.completed).length;
  const totalDistractions = sessions.reduce((acc, s) => acc + s.distractions, 0);
  
  const focusHours = Math.floor(totalFocusTime / (1000 * 60 * 60));
  const focusMinutes = Math.floor((totalFocusTime % (1000 * 60 * 60)) / (1000 * 60));

  const stats = [
    {
      icon: Flame,
      title: t('stats.currentStreak'),
      value: `${currentStreak} ${t('dashboard.days')}`,
      subtitle: 'Keep going!',
      color: Colors.dark.warning,
    },
    {
      icon: TrendingUp,
      title: 'Completion Rate',
      value: `${completionRate}%`,
      subtitle: `${completedHabits}/${totalHabits} habits today`,
      color: Colors.dark.success,
    },
    {
      icon: Clock,
      title: t('stats.totalFocusTime'),
      value: `${focusHours}h ${focusMinutes}m`,
      subtitle: `${completedSessions} sessions completed`,
      color: Colors.dark.primary,
    },
    {
      icon: CheckCircle,
      title: 'Focus Sessions',
      value: totalSessions.toString(),
      subtitle: `${totalDistractions} distractions logged`,
      color: Colors.dark.primary,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('stats.title')}</Text>
        <Text style={styles.subtitle}>Track your transformation journey</Text>
      </View>

      <LanguageSelector />

      <View style={styles.grid}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <View key={index} style={styles.card}>
              <View style={[styles.iconContainer, { backgroundColor: stat.color + '20' }]}>
                <Icon size={28} color={stat.color} strokeWidth={2} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{stat.title}</Text>
                <Text style={styles.cardValue}>{stat.value}</Text>
                <Text style={styles.cardSubtitle}>{stat.subtitle}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('habits.title')}</Text>
        {habits.map(habit => (
          <View key={habit.id} style={styles.habitRow}>
            <View style={styles.habitInfo}>
              <Text style={styles.habitName}>{habit.title}</Text>
              <Text style={styles.habitType}>
                {habit.type === 'good' ? t('habits.good') : t('habits.bad')}
              </Text>
            </View>
            <View style={styles.habitStats}>
              <Text style={styles.habitStreak}>{habit.streak} {t('habits.streak')}</Text>
              {habit.completedToday && (
                <View style={styles.completedBadge}>
                  <CheckCircle size={16} color={Colors.dark.success} strokeWidth={2} />
                </View>
              )}
            </View>
          </View>
        ))}
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
  },
  grid: {
    gap: 16,
    marginBottom: 32,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.dark.textTertiary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 16,
  },
  habitRow: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  habitType: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  habitStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  habitStreak: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.dark.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
});