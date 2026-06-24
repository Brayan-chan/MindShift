import type { ComponentType } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { BarChart3, CheckCircle, Flame, ShieldAlert, Target, Timer, Trophy, Zap } from 'lucide-react-native';
import { DEFAULT_HABIT_TRANSLATION_KEYS, useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Colors from '@/constants/colors';
import type { Habit } from '@/types';

const CHART_HEIGHT = 190;
const LINE_CHART_HEIGHT = 152;
const HABIT_LINE_COLORS = [
  Colors.dark.primary,
  '#22D3EE',
  '#E879F9',
  Colors.dark.warning,
  Colors.dark.success,
  '#F472B6',
  '#818CF8',
  '#FB7185',
] as const;

const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getRecentDateKeys = (days: number) => {
  const today = new Date();
  return Array.from({ length: days }, (_, index) => (
    getDateKey(addDays(today, index - (days - 1)))
  ));
};

export default function StatsScreen() {
  const {
    habits,
    sessions,
    currentStreak,
    longestStreak,
    totalFocusTime,
    dailyVideos,
    videoStreak,
    totalXp,
    totalPenaltyXp,
    level,
    dailyXpGoal,
    weeklyActivity,
  } = useApp();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const chartWidth = Math.min(width - 72, 330);
  const locale = language === 'es' ? 'es-MX' : 'en-US';
  const goodHabits = habits.filter(habit => habit.type === 'good');
  const chartHabits = [...goodHabits].sort((a, b) => b.streak - a.streak);
  const completedHabits = goodHabits.filter(habit => habit.completedToday).length;
  const completionRate = goodHabits.length > 0
    ? Math.round((completedHabits / goodHabits.length) * 100)
    : 0;
  const totalVideosWatched = dailyVideos.filter(video => video.watched).length;
  const completedSessions = sessions.filter(session => session.completed).length;
  const totalDistractions = sessions.reduce((acc, session) => acc + session.distractions, 0);
  const focusHours = Math.floor(totalFocusTime / 3600000);
  const focusMinutes = Math.floor((totalFocusTime % 3600000) / 60000);
  const weekDateKeys = getRecentDateKeys(7);
  const monthDateKeys = getRecentDateKeys(30);
  const todayXp = weeklyActivity[weeklyActivity.length - 1]?.xp ?? 0;
  const todayProgress = Math.min(Math.max(todayXp, 0) / dailyXpGoal, 1);

  const getHabitTitle = (habit: Habit) => {
    const translationKey = DEFAULT_HABIT_TRANSLATION_KEYS[habit.legacyId ?? habit.id];
    return translationKey ? t(translationKey) : habit.title;
  };
  const getWeeklyHabitCount = (habit: Habit) => (
    weekDateKeys.filter(dateKey => habit.history[dateKey]).length
  );

  const weeklyFocusMinutes = weekDateKeys.map(dateKey => {
    const minutes = sessions
      .filter(session => getDateKey(new Date(session.startTime)) === dateKey)
      .reduce((sum, session) => sum + Math.round(session.duration / 60000), 0);

    return { date: dateKey, minutes };
  });
  const maxFocusMinutes = Math.max(25, ...weeklyFocusMinutes.map(day => day.minutes));

  const monthlyActivity = monthDateKeys.map(dateKey => {
    const goodCompleted = goodHabits.filter(habit => habit.history[dateKey]).length;
    const ratio = goodHabits.length > 0 ? goodCompleted / goodHabits.length : 0;

    return { date: dateKey, ratio };
  });

  const records = [
    {
      icon: Flame,
      label: t('stats.currentStreak'),
      value: currentStreak.toString(),
      color: Colors.dark.warning,
    },
    {
      icon: Trophy,
      label: t('gamification.longestStreak'),
      value: longestStreak.toString(),
      color: Colors.dark.primary,
    },
    {
      icon: CheckCircle,
      label: t('stats.completionRate'),
      value: `${completionRate}%`,
      color: Colors.dark.success,
    },
    {
      icon: ShieldAlert,
      label: t('gamification.penalties'),
      value: `-${totalPenaltyXp}`,
      color: Colors.dark.danger,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('stats.title')}</Text>
        <Text style={styles.subtitle}>{t('stats.subtitle')}</Text>
      </View>

      <View style={styles.heroPanel}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroEyebrow}>{t('stats.performance')}</Text>
            <Text style={styles.heroValue}>{totalXp} XP</Text>
          </View>
          <View style={styles.levelPill}>
            <Zap size={17} color={Colors.dark.warning} fill={Colors.dark.warning} />
            <Text style={styles.levelText}>
              {t('dashboard.level').replace('{level}', level.toString())}
            </Text>
          </View>
        </View>

        <View style={styles.heroProgressTrack}>
          <View style={[styles.heroProgressFill, { width: `${todayProgress * 100}%` }]} />
        </View>

        <View style={styles.heroStats}>
          <MetricPill
            icon={Target}
            label={t('stats.dailyProgress')}
            value={`${Math.max(todayXp, 0)}/${dailyXpGoal}`}
            color={Colors.dark.warning}
          />
          <MetricPill
            icon={Timer}
            label={t('stats.totalFocusTime')}
            value={`${focusHours}h ${focusMinutes}m`}
            color={Colors.dark.primary}
          />
        </View>
      </View>

      <SectionHeader title={t('stats.progress')} range={t('stats.last7Days')} />
      <View style={styles.chartCard}>
        <WeeklyProgressBars
          data={weeklyActivity}
          goal={dailyXpGoal}
          locale={locale}
        />
      </View>

      <SectionHeader title={t('stats.calendar')} range={t('stats.last30Days')} />
      <View style={styles.calendarCard}>
        <View style={styles.calendarGrid}>
          {monthlyActivity.map(day => (
            <CalendarDot
              key={day.date}
              dateKey={day.date}
              ratio={day.ratio}
              locale={locale}
            />
          ))}
        </View>
      </View>

      <SectionHeader title={t('stats.habitTrends')} range={t('stats.last7Days')} />
      <View style={styles.chartCard}>
        <HabitLineChart
          habits={chartHabits}
          dateKeys={weekDateKeys}
          width={chartWidth}
          locale={locale}
          emptyText={t('stats.noData')}
        />
        <View style={styles.habitLegendClip}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.habitLegendContent}
          >
            {chartHabits.map((habit, index) => (
              <View key={habit.id} style={styles.habitLegendPill}>
                <View
                  style={[
                    styles.habitLegendDot,
                    { backgroundColor: HABIT_LINE_COLORS[index % HABIT_LINE_COLORS.length] },
                  ]}
                />
                <Text style={styles.habitLegendText} numberOfLines={1}>
                  {getHabitTitle(habit)}
                </Text>
                <Text style={styles.habitLegendCount}>
                  {getWeeklyHabitCount(habit)}/7
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      <SectionHeader title={t('stats.focusTrend')} range={t('stats.last7Days')} />
      <View style={styles.chartCard}>
        <FocusBars
          data={weeklyFocusMinutes}
          maxMinutes={maxFocusMinutes}
          locale={locale}
        />
        <View style={styles.focusSummary}>
          <MetricPill
            icon={CheckCircle}
            label={t('stats.focusSessions')}
            value={completedSessions.toString()}
            color={Colors.dark.success}
          />
          <MetricPill
            icon={ShieldAlert}
            label={t('stats.distractions')}
            value={totalDistractions.toString()}
            color={Colors.dark.danger}
          />
        </View>
      </View>

      <SectionHeader title={t('stats.records')} range={t('stats.last30Days')} />
      <View style={styles.recordsGrid}>
        {records.map(record => {
          const Icon = record.icon;
          return (
            <View key={record.label} style={styles.recordCard}>
              <Text style={styles.recordValue}>{record.value}</Text>
              <Text style={styles.recordLabel}>{record.label}</Text>
              <Icon
                size={25}
                color={record.color}
                strokeWidth={2.2}
                style={styles.recordIcon}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.videoCard}>
        <View style={[styles.videoIcon, { backgroundColor: Colors.dark.warning + '20' }]}>
          <Zap size={22} color={Colors.dark.warning} fill={Colors.dark.warning} />
        </View>
        <View style={styles.videoCopy}>
          <Text style={styles.videoTitle}>{t('stats.videosWatched')}</Text>
          <Text style={styles.videoSubtitle}>
            {totalVideosWatched} - {videoStreak} {t('stats.videoStreak')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

interface MetricPillProps {
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number; fill?: string }>;
  label: string;
  value: string;
  color: string;
}

function MetricPill({ icon: Icon, label, value, color }: MetricPillProps) {
  return (
    <View style={styles.metricPill}>
      <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
        <Icon size={17} color={color} strokeWidth={2.3} />
      </View>
      <View style={styles.metricCopy}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
  range: string;
}

function SectionHeader({ title, range }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionRange}>{range}</Text>
    </View>
  );
}

interface WeeklyProgressBarsProps {
  data: Array<{ date: string; xp: number; goalReached: boolean }>;
  goal: number;
  locale: string;
}

function WeeklyProgressBars({ data, goal, locale }: WeeklyProgressBarsProps) {
  return (
    <View style={styles.progressChart}>
      <View style={styles.chartAxisLabels}>
        <Text style={styles.axisText}>100%</Text>
        <Text style={styles.axisText}>50%</Text>
        <Text style={styles.axisText}>0%</Text>
      </View>
      <View style={styles.barPlot}>
        <View style={[styles.gridLine, { top: 0 }]} />
        <View style={[styles.gridLine, { top: '50%' }]} />
        <View style={[styles.gridLine, { bottom: 0 }]} />
        {data.map(day => {
          const date = parseDateKey(day.date);
          const ratio = Math.min(Math.max(day.xp, 0) / goal, 1);
          const label = new Intl.DateTimeFormat(locale, { weekday: 'short' })
            .format(date)
            .replace('.', '');

          return (
            <View key={day.date} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.max(ratio * 100, day.xp > 0 ? 10 : 0)}%`,
                      backgroundColor: day.goalReached
                        ? Colors.dark.success
                        : Colors.dark.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface CalendarDotProps {
  dateKey: string;
  ratio: number;
  locale: string;
}

function CalendarDot({ dateKey, ratio, locale }: CalendarDotProps) {
  const date = parseDateKey(dateKey);
  const today = dateKey === getDateKey();
  const dayNumber = date.getDate();
  const opacity = ratio > 0 ? 0.35 + ratio * 0.65 : 0.18;

  return (
    <View style={styles.calendarDay}>
      <Svg width={34} height={34}>
        <Circle
          cx={17}
          cy={17}
          r={14}
          stroke={Colors.dark.borderFocus}
          strokeWidth={4}
          fill={today ? Colors.dark.primary + '20' : Colors.dark.surfaceElevated}
        />
        {ratio > 0 && (
          <Circle
            cx={17}
            cy={17}
            r={14}
            stroke={Colors.dark.primary}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(ratio, 0.08) * 88} 88`}
            rotation="-90"
            origin="17, 17"
            opacity={opacity}
            fill="transparent"
          />
        )}
      </Svg>
      <Text
        style={[
          styles.calendarDayText,
          today && styles.calendarDayTextToday,
        ]}
        accessibilityLabel={new Intl.DateTimeFormat(locale, {
          day: 'numeric',
          month: 'long',
        }).format(date)}
      >
        {dayNumber}
      </Text>
    </View>
  );
}

interface HabitLineChartProps {
  habits: Habit[];
  dateKeys: string[];
  width: number;
  locale: string;
  emptyText: string;
}

function HabitLineChart({
  habits,
  dateKeys,
  width,
  locale,
  emptyText,
}: HabitLineChartProps) {
  const leftPadding = 20;
  const rightPadding = 14;
  const topPadding = 20;
  const bottomPadding = 28;
  const plotWidth = width - leftPadding - rightPadding;
  const plotHeight = LINE_CHART_HEIGHT - topPadding - bottomPadding;
  const maxY = 1;
  const hasData = habits.some(habit => dateKeys.some(dateKey => habit.history[dateKey]));

  const getPoint = (dateIndex: number, completed: boolean) => {
    const x = leftPadding + (plotWidth / Math.max(dateKeys.length - 1, 1)) * dateIndex;
    const y = topPadding + plotHeight - ((completed ? 1 : 0) / maxY) * plotHeight;

    return `${x},${y}`;
  };

  return (
    <View style={styles.lineChartWrap}>
      <Svg width={width} height={LINE_CHART_HEIGHT}>
        {[0, 0.5, 1].map(level => {
          const y = topPadding + plotHeight - level * plotHeight;
          return (
            <Line
              key={level}
              x1={leftPadding}
              x2={width - rightPadding}
              y1={y}
              y2={y}
              stroke={Colors.dark.borderFocus}
              strokeWidth={1}
            />
          );
        })}
        {habits.map((habit, habitIndex) => (
          <Polyline
            key={habit.id}
            points={dateKeys
              .map((dateKey, dateIndex) => getPoint(dateIndex, Boolean(habit.history[dateKey])))
              .join(' ')}
            fill="none"
            stroke={HABIT_LINE_COLORS[habitIndex % HABIT_LINE_COLORS.length]}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
      <View style={styles.lineXAxis}>
        {dateKeys.map(dateKey => (
          <Text key={dateKey} style={styles.lineAxisText}>
            {new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
              .format(parseDateKey(dateKey))}
          </Text>
        ))}
      </View>
      {!hasData && (
        <View style={styles.emptyOverlay}>
          <BarChart3 size={24} color={Colors.dark.textTertiary} />
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      )}
    </View>
  );
}

interface FocusBarsProps {
  data: Array<{ date: string; minutes: number }>;
  maxMinutes: number;
  locale: string;
}

function FocusBars({ data, maxMinutes, locale }: FocusBarsProps) {
  return (
    <View style={styles.focusBars}>
      {data.map(day => {
        const ratio = Math.min(day.minutes / maxMinutes, 1);
        const label = new Intl.DateTimeFormat(locale, { weekday: 'short' })
          .format(parseDateKey(day.date))
          .replace('.', '');

        return (
          <View key={day.date} style={styles.focusColumn}>
            <View style={styles.focusTrack}>
              <View style={[
                styles.focusFill,
                { height: `${Math.max(ratio * 100, day.minutes > 0 ? 8 : 0)}%` },
              ]} />
            </View>
            <Text style={styles.focusMinutes}>{day.minutes}</Text>
            <Text style={styles.focusLabel}>{label}</Text>
          </View>
        );
      })}
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
    paddingBottom: 34,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.dark.textSecondary,
  },
  heroPanel: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 18,
    marginBottom: 26,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    color: Colors.dark.textSecondary,
    fontWeight: '700',
  },
  heroValue: {
    marginTop: 3,
    fontSize: 34,
    lineHeight: 40,
    color: Colors.dark.text,
    fontWeight: '800',
  },
  levelPill: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 10,
  },
  levelText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: Colors.dark.warning,
  },
  heroProgressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.dark.background,
    marginTop: 18,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: Colors.dark.warning,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  metricPill: {
    flex: 1,
    minHeight: 64,
    borderRadius: 8,
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  metricCopy: {
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  metricLabel: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.dark.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  sectionRange: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: Colors.dark.primary,
  },
  chartCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
    marginBottom: 26,
  },
  progressChart: {
    height: CHART_HEIGHT,
    flexDirection: 'row',
  },
  chartAxisLabels: {
    width: 40,
    height: CHART_HEIGHT - 24,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  axisText: {
    fontSize: 11,
    lineHeight: 14,
    color: Colors.dark.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  barPlot: {
    flex: 1,
    height: CHART_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.dark.borderFocus,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '68%',
    height: CHART_HEIGHT - 26,
    borderRadius: 8,
    backgroundColor: Colors.dark.primary + '22',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barLabel: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.dark.textSecondary,
    textTransform: 'lowercase',
  },
  calendarCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 15,
    marginBottom: 26,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  calendarDay: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayText: {
    position: 'absolute',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  calendarDayTextToday: {
    color: Colors.dark.text,
  },
  lineChartWrap: {
    minHeight: 166,
    alignItems: 'center',
  },
  lineXAxis: {
    position: 'absolute',
    left: 18,
    right: 12,
    top: LINE_CHART_HEIGHT - 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lineAxisText: {
    fontSize: 11,
    lineHeight: 14,
    color: Colors.dark.textSecondary,
    textTransform: 'lowercase',
  },
  emptyOverlay: {
    position: 'absolute',
    top: 50,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 17,
    color: Colors.dark.textSecondary,
    fontWeight: '700',
  },
  habitLegendClip: {
    marginTop: 8,
    marginHorizontal: -2,
    overflow: 'hidden',
  },
  habitLegendContent: {
    paddingHorizontal: 2,
    gap: 8,
  },
  habitLegendPill: {
    maxWidth: 190,
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  habitLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 7,
  },
  habitLegendText: {
    maxWidth: 110,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.dark.textSecondary,
    fontWeight: '700',
  },
  habitLegendCount: {
    marginLeft: 8,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.dark.text,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  focusBars: {
    height: 170,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  focusColumn: {
    flex: 1,
    alignItems: 'center',
  },
  focusTrack: {
    width: '58%',
    height: 116,
    borderRadius: 8,
    backgroundColor: Colors.dark.surfaceElevated,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  focusFill: {
    width: '100%',
    borderRadius: 8,
    backgroundColor: Colors.dark.primary,
  },
  focusMinutes: {
    marginTop: 7,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.dark.text,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  focusLabel: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.dark.textSecondary,
    textTransform: 'lowercase',
  },
  focusSummary: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  recordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 26,
  },
  recordCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 88,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 14,
    position: 'relative',
  },
  recordValue: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  recordLabel: {
    marginTop: 5,
    paddingRight: 30,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
    textTransform: 'uppercase',
  },
  recordIcon: {
    position: 'absolute',
    right: 13,
    top: 13,
  },
  videoCard: {
    minHeight: 72,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  videoIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  videoCopy: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  videoSubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.dark.textSecondary,
  },
});
