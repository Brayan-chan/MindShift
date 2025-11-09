import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flame, TrendingUp, Brain, Clock } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/colors';

export default function DashboardScreen() {
  const { identity, habits, currentStreak, totalFocusTime, todaysSessions } = useApp();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const goodHabitsCompleted = habits.filter(
    h => h.type === 'good' && h.completedToday
  ).length;
  const totalGoodHabits = habits.filter(h => h.type === 'good').length;
  const completionRate = totalGoodHabits > 0
    ? Math.round((goodHabitsCompleted / totalGoodHabits) * 100)
    : 0;

  const focusTimeHours = Math.floor(totalFocusTime / (1000 * 60 * 60));
  const todayFocusMinutes = Math.floor(
    todaysSessions.reduce((acc, s) => acc + s.duration, 0) / (1000 * 60)
  );

  const stats = [
    {
      icon: Flame,
      value: currentStreak,
      label: t('dashboard.dayStreak'),
      color: Colors.dark.warning,
    },
    {
      icon: TrendingUp,
      value: `${completionRate}%`,
      label: t('dashboard.today'),
      color: Colors.dark.success,
    },
    {
      icon: Clock,
      value: todayFocusMinutes,
      label: t('dashboard.focusMin'),
      color: Colors.dark.primary,
    },
    {
      icon: Brain,
      value: focusTimeHours,
      label: t('dashboard.totalHours'),
      color: Colors.dark.primary,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>{t('dashboard.transformation')}</Text>
        <Text style={styles.subGreeting}>
          {identity.targetIdentity || t('dashboard.buildingBest')}
        </Text>
      </View>

      <View style={styles.identityCard}>
        <View style={styles.identitySection}>
          <Text style={styles.identityLabel}>{t('dashboard.from')}</Text>
          <Text style={styles.identityText} numberOfLines={2}>
            {identity.currentIdentity || t('dashboard.defineStart')}
          </Text>
        </View>
        <View style={styles.arrowContainer}>
          <View style={styles.arrow} />
        </View>
        <View style={styles.identitySection}>
          <Text style={[styles.identityLabel, styles.identityLabelTarget]}>{t('dashboard.to')}</Text>
          <Text style={[styles.identityText, styles.identityTextTarget]} numberOfLines={2}>
            {identity.targetIdentity || t('dashboard.defineDestination')}
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
                <Icon size={24} color={stat.color} strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionCard}>
          <View style={styles.actionContent}>
            <View style={styles.actionIcon}>
              <Clock size={20} color={Colors.dark.primary} strokeWidth={2} />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Start Focus Session</Text>
              <Text style={styles.actionSubtitle}>Enter deep work mode</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <View style={styles.actionContent}>
            <View style={styles.actionIcon}>
              <Brain size={20} color={Colors.dark.success} strokeWidth={2} />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Daily Reflection</Text>
              <Text style={styles.actionSubtitle}>Review your day</Text>
            </View>
          </View>
        </TouchableOpacity>
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
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subGreeting: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
  },
  identityCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  identitySection: {
    flex: 1,
  },
  identityLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.dark.textTertiary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  identityLabelTarget: {
    color: Colors.dark.primary,
  },
  identityText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  identityTextTarget: {
    color: Colors.dark.text,
    fontWeight: '600',
  },
  arrowContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    width: 16,
    height: 2,
    backgroundColor: Colors.dark.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
});