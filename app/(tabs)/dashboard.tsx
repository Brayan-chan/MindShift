import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Flame, TrendingUp, Brain, Clock, Zap, Trophy, CheckCircle2 } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/colors';

export default function DashboardScreen() {
  const {
    identity,
    habits,
    currentStreak,
    totalFocusTime,
    todaysSessions,
    todayXp,
    totalXp,
    dailyXpGoal,
    level,
    weeklyActivity,
    todayReflection,
  } = useApp();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
  const xpProgress = Math.min(Math.max(todayXp, 0) / dailyXpGoal, 1);

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

      <View style={styles.progressPanel}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressEyebrow}>{t('dashboard.dailyGoal')}</Text>
            <Text style={styles.progressValue}>
              {t('dashboard.xpToday')
                .replace('{current}', todayXp.toString())
                .replace('{goal}', dailyXpGoal.toString())}
            </Text>
          </View>
          <View style={styles.levelBadge}>
            <Zap size={18} color={Colors.dark.warning} fill={Colors.dark.warning} />
            <Text style={styles.levelText}>
              {t('dashboard.level').replace('{level}', level.toString())}
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${xpProgress * 100}%` }]} />
        </View>

        <View style={styles.streakRow}>
          <View style={styles.streakCopy}>
            <Flame size={23} color={Colors.dark.warning} fill={Colors.dark.warning} />
            <View>
              <Text style={styles.streakValue}>{currentStreak}</Text>
              <Text style={styles.streakLabel}>
                {todayXp >= dailyXpGoal
                  ? t('dashboard.streakActive')
                  : t('dashboard.streakPending')}
              </Text>
            </View>
          </View>
          <View style={styles.totalXp}>
            <Trophy size={18} color={Colors.dark.primary} />
            <Text style={styles.totalXpText}>{totalXp} XP</Text>
          </View>
        </View>

        <Text style={styles.weekTitle}>{t('dashboard.weeklyConsistency')}</Text>
        <View style={styles.weekRow}>
          {weeklyActivity.map(day => {
            const [year, month, date] = day.date.split('-').map(Number);
            const dayLabel = new Intl.DateTimeFormat(
              language === 'es' ? 'es-MX' : 'en-US',
              { weekday: 'narrow' }
            ).format(new Date(year, month - 1, date));
            const intensity = Math.min(Math.max(day.xp, 0) / dailyXpGoal, 1);

            return (
              <View key={day.date} style={styles.weekDay}>
                <Text style={styles.weekDayLabel}>{dayLabel}</Text>
                <View
                  style={[
                    styles.weekCell,
                    day.xp > 0 && {
                      backgroundColor: day.goalReached
                        ? Colors.dark.success
                        : Colors.dark.primary,
                      opacity: 0.35 + intensity * 0.65,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
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
        <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(tabs)/focus')}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionIcon}>
              <Clock size={20} color={Colors.dark.primary} strokeWidth={2} />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>{t('dashboard.startFocus')}</Text>
              <Text style={styles.actionSubtitle}>{t('dashboard.startFocusSubtitle')}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/reflection')}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionIcon}>
              {todayReflection ? (
                <CheckCircle2 size={20} color={Colors.dark.success} strokeWidth={2} />
              ) : (
                <Brain size={20} color={Colors.dark.success} strokeWidth={2} />
              )}
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>{t('dashboard.dailyReflection')}</Text>
              <Text style={styles.actionSubtitle}>
                {todayReflection
                  ? t('reflection.savedBody')
                  : t('dashboard.dailyReflectionSubtitle')}
              </Text>
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
  progressPanel: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 18,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  progressEyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
    marginBottom: 3,
  },
  progressValue: {
    fontSize: 21,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.dark.warning,
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.dark.background,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 18,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: Colors.dark.warning,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  streakCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  streakLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    maxWidth: 190,
  },
  totalXp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  totalXpText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.dark.primary,
  },
  weekTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
    marginTop: 20,
    marginBottom: 10,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDay: {
    alignItems: 'center',
    gap: 6,
  },
  weekDayLabel: {
    fontSize: 11,
    color: Colors.dark.textTertiary,
  },
  weekCell: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
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
