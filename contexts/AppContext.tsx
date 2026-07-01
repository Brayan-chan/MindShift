import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fulltoast } from 'fulltoast';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';
import type {
  Habit,
  FocusSession,
  Reflection,
  UserIdentity,
  DailyVideo,
  RoutineReminder,
  RoutineReminderId,
  AppSettings,
  UserProfile,
} from '@/types';
import { MOTIVATIONAL_VIDEOS, getRandomVideo } from '@/constants/videos';
import { getFocusXpForDuration } from '@/constants/focusRewards';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, clearAuthToken, getAuthToken } from '@/lib/api';

const STORAGE_KEYS = {
  HABITS: '@apex_habits',
  SESSIONS: '@apex_sessions',
  REFLECTIONS: '@apex_reflections',
  IDENTITY: '@apex_identity',
  DAILY_VIDEOS: '@apex_daily_videos',
  LAST_VIDEO_CHECK: '@apex_last_video_check',
  ROUTINE_REMINDERS: '@apex_routine_reminders',
  APP_SETTINGS: '@apex_app_settings',
} as const;

const DAILY_XP_GOAL = 50;
const AUTO_DAILY_XP_GOAL_MAX = 120;
const AUTO_DAILY_XP_GOAL_STEP = 10;
const HABIT_XP = 10;
const VIDEO_XP = 10;

const DEFAULT_APP_SETTINGS: AppSettings = {
  language: 'es',
  darkMode: true,
  gamification: {
    goalMode: 'auto',
    manualDailyXpGoal: DAILY_XP_GOAL,
    sanctionsEnabled: true,
    badHabitPenalty: 10,
    missedGoalPenalty: 10,
  },
  notifications: {
    habits: true,
    reflections: true,
    focusSessions: true,
    motivational: true,
  },
  focusMode: {
    defaultDuration: 25,
    breakDuration: 5,
    longBreakAfter: 4,
    strictModeEnabled: true,
    strictPin: '1234',
    exitPenalty: 10,
  },
};

const DEFAULT_ROUTINE_REMINDERS: RoutineReminder[] = [
  { id: 'morning', enabled: true, time: '07:00' },
  { id: 'afternoon', enabled: true, time: '15:00' },
  { id: 'evening', enabled: true, time: '21:30' },
  { id: 'streak', enabled: true, time: '20:30' },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DEFAULT_IDENTITY: UserIdentity = {
  currentIdentity: '',
  targetIdentity: '',
  whyTransform: '',
  setupComplete: false,
  videoIntroComplete: false,
  coreValues: [],
};

type PendingHabitSync = {
  desiredCompleted: boolean;
  version: number;
  timer: ReturnType<typeof setTimeout> | null;
  inFlight: boolean;
};

export const DEFAULT_HABIT_TRANSLATION_KEYS: Record<string, string> = {
  '1': 'habits.defaultMorningWorkout',
  '2': 'habits.defaultDeepWork',
  '3': 'habits.defaultSocialMedia',
  '4': 'habits.defaultWakeEarly',
  '5': 'habits.defaultMorningWater',
  '6': 'habits.defaultMorningTeeth',
  '7': 'habits.defaultMeditation',
  '8': 'habits.defaultLearnSomething',
  '9': 'habits.defaultAfternoonWater',
  '10': 'habits.defaultDevicesAway',
  '11': 'habits.defaultNightTeeth',
  '12': 'habits.defaultSleepEarly',
};

const DEFAULT_HABITS: Habit[] = [
  {
    id: '1',
    title: 'Morning workout',
    type: 'good',
    category: 'physical',
    streak: 0,
    completedToday: false,
    history: {},
    createdAt: Date.now(),
  },
  {
    id: '2',
    title: 'Deep work session',
    type: 'good',
    category: 'productivity',
    streak: 0,
    completedToday: false,
    history: {},
    createdAt: Date.now(),
  },
  {
    id: '3',
    title: 'Scroll social media',
    type: 'bad',
    category: 'productivity',
    streak: 0,
    completedToday: false,
    history: {},
    createdAt: Date.now(),
  },
  {
    id: '4',
    title: 'Wake up early',
    type: 'good',
    category: 'physical',
    streak: 0,
    completedToday: false,
    history: {},
    createdAt: Date.now(),
  },
  {
    id: '5',
    title: 'Drink water after waking up',
    type: 'good',
    category: 'physical',
    streak: 0,
    completedToday: false,
    history: {},
    createdAt: Date.now(),
  },
  {
    id: '6',
    title: 'Brush teeth after waking up',
    type: 'good',
    category: 'physical',
    streak: 0,
    completedToday: false,
    history: {},
    createdAt: Date.now(),
  },
  {
    id: '7',
    title: 'Meditate for 10 minutes without devices nearby',
    type: 'good',
    category: 'mental',
    streak: 0,
    completedToday: false,
    history: {},
    createdAt: Date.now(),
  },
  {
    id: '8',
    title: 'Learn something new',
    type: 'good',
    category: 'mental',
    streak: 0,
    completedToday: false,
    history: {},
    createdAt: Date.now(),
  },
  {
    id: '9',
    title: 'Drink water in the afternoon',
    type: 'good',
    category: 'physical',
    streak: 0,
    completedToday: false,
    history: {},
    createdAt: Date.now(),
  },
  {
    id: '10',
    title: 'Put devices away before 10 PM',
    type: 'good',
    category: 'mental',
    streak: 0,
    completedToday: false,
    history: {},
    createdAt: Date.now(),
  },
  {
    id: '11',
    title: 'Brush teeth before bed',
    type: 'good',
    category: 'physical',
    streak: 0,
    completedToday: false,
    history: {},
    createdAt: Date.now(),
  },
  {
    id: '12',
    title: 'Go to sleep early',
    type: 'good',
    category: 'physical',
    streak: 0,
    completedToday: false,
    history: {},
    createdAt: Date.now(),
  },
];

const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getTodayKey = () => getDateKey();

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getDateRange = (startDateKey: string, length: number) => {
  const startDate = parseDateKey(startDateKey);

  return Array.from({ length }, (_, index) => getDateKey(addDays(startDate, index)));
};

const mergeAppSettings = (settings?: Partial<AppSettings>): AppSettings => ({
  ...DEFAULT_APP_SETTINGS,
  ...settings,
  gamification: {
    ...DEFAULT_APP_SETTINGS.gamification,
    ...settings?.gamification,
  },
  notifications: {
    ...DEFAULT_APP_SETTINGS.notifications,
    ...settings?.notifications,
  },
  focusMode: {
    ...DEFAULT_APP_SETTINGS.focusMode,
    ...settings?.focusMode,
  },
});

const calculateAutoDailyXpGoal = (dailyXpByDate: Record<string, number>) => {
  const activityDates = Object.keys(dailyXpByDate)
    .filter(date => dailyXpByDate[date] > 0)
    .sort();

  if (activityDates.length === 0) return DAILY_XP_GOAL;

  let goal = DAILY_XP_GOAL;
  let weekStart = activityDates[0];
  const today = getTodayKey();

  while (getDateKey(addDays(parseDateKey(weekStart), 6)) < today) {
    const weekDates = getDateRange(weekStart, 7);
    const weekCompleted = weekDates.every(date => (dailyXpByDate[date] || 0) >= goal);

    if (weekCompleted) {
      goal = Math.min(goal + AUTO_DAILY_XP_GOAL_STEP, AUTO_DAILY_XP_GOAL_MAX);
    }

    weekStart = getDateKey(addDays(parseDateKey(weekStart), 7));
  }

  return goal;
};

const calculateHabitStreak = (history: Record<string, boolean>) => {
  let streak = 0;
  const checkDate = new Date();

  if (!history[getDateKey(checkDate)]) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (history[getDateKey(checkDate)]) {
    streak += 1;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
};

const applyHabitCompletedState = (
  habits: Habit[],
  habitId: string,
  completed: boolean,
  dateKey = getTodayKey()
) => habits.map(habit => {
  if (habit.id !== habitId) return habit;

  const history = {
    ...habit.history,
    [dateKey]: completed,
  };

  return {
    ...habit,
    completedToday: completed,
    history,
    streak: habit.type === 'good' ? calculateHabitStreak(history) : habit.streak,
  };
});

const normalizeHabitsForToday = (rawHabits: Habit[]) => {
  const storedHabitIds = new Set(rawHabits.map(habit => habit.id));
  const missingDefaultHabits = DEFAULT_HABITS.filter(
    habit => !storedHabitIds.has(habit.id)
  );

  return [...rawHabits, ...missingDefaultHabits].map(habit => ({
    ...habit,
    completedToday: Boolean(habit.history[getTodayKey()]),
    streak: habit.type === 'good'
      ? calculateHabitStreak(habit.history)
      : habit.streak,
  }));
};

const mergeHabitHistory = (
  first: Record<string, boolean>,
  second: Record<string, boolean>
) => {
  const dates = new Set([...Object.keys(first), ...Object.keys(second)]);

  return Array.from(dates).reduce<Record<string, boolean>>((acc, date) => {
    acc[date] = Boolean(first[date] || second[date]);
    return acc;
  }, {});
};

const dedupeRemoteHabits = (rawHabits: Habit[]) => {
  const habitsByKey = new Map<string, Habit>();
  const deduped: Habit[] = [];

  rawHabits.forEach((habit) => {
    const key = habit.legacyId ? `legacy:${habit.legacyId}` : `id:${habit.id}`;
    const existing = habitsByKey.get(key);

    if (!existing) {
      habitsByKey.set(key, habit);
      deduped.push(habit);
      return;
    }

    const mergedHistory = mergeHabitHistory(existing.history, habit.history);
    const existingCompletionCount = Object.values(existing.history).filter(Boolean).length;
    const currentCompletionCount = Object.values(habit.history).filter(Boolean).length;
    const preferred = currentCompletionCount > existingCompletionCount ? habit : existing;
    const mergedHabit: Habit = {
      ...preferred,
      history: mergedHistory,
      completedToday: Boolean(mergedHistory[getTodayKey()]),
      streak: preferred.type === 'good'
        ? calculateHabitStreak(mergedHistory)
        : preferred.streak,
    };
    const index = deduped.findIndex(item => item.id === existing.id);

    habitsByKey.set(key, mergedHabit);
    if (index >= 0) {
      deduped[index] = mergedHabit;
    }
  });

  return deduped;
};

const getSourceVideoIdFromUrl = (videoUrl?: string) => {
  return MOTIVATIONAL_VIDEOS.find(video => video.url === videoUrl)?.id;
};

const createDailyVideo = (date: string, previousVideo?: DailyVideo): DailyVideo => {
  const previousSourceVideoId = getSourceVideoIdFromUrl(previousVideo?.videoUrl);
  const randomVideo = getRandomVideo(previousSourceVideoId);

  return {
    id: `daily-video-${date}`,
    date,
    videoUrl: randomVideo.url,
    watched: false,
  };
};

const parseReminderTime = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return { hour, minute };
};

const HABIT_SYNC_TOAST_ID = 'habit-sync-status';
const HABIT_SYNC_LOADING_DELAY = 900;

type BootstrapProfile = {
  id?: string;
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
  currentIdentity?: string | null;
  targetIdentity?: string | null;
  whyTransform?: string | null;
  coreValues?: string[];
  setupComplete?: boolean;
  appSettings?: AppSettings;
};

type BootstrapPayload = {
  profile?: BootstrapProfile | null;
  habits?: Habit[];
  app_state?: Partial<{
    sessions: FocusSession[];
    reflections: Reflection[];
    dailyVideos: DailyVideo[];
    routineReminders: RoutineReminder[];
    videoIntroComplete: boolean;
  }>;
};

export const [AppProvider, useApp] = createContextHook(() => {
  const { t, setLanguage, isLoading: isLanguageLoading } = useLanguage();
  const [identity, setIdentity] = useState<UserIdentity>(DEFAULT_IDENTITY);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [dailyVideos, setDailyVideos] = useState<DailyVideo[]>([]);
  const [routineReminders, setRoutineReminders] = useState<RoutineReminder[]>(
    DEFAULT_ROUTINE_REMINDERS
  );
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [shouldShowVideo, setShouldShowVideo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const appState = useRef(AppState.currentState);
  const habitSyncQueue = useRef<Record<string, PendingHabitSync>>({});
  const habitSyncToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionsRef = useRef<FocusSession[]>([]);
  const reflectionsRef = useRef<Reflection[]>([]);
  const dailyVideosRef = useRef<DailyVideo[]>([]);
  const routineRemindersRef = useRef<RoutineReminder[]>(DEFAULT_ROUTINE_REMINDERS);
  const isAuthenticatedRef = useRef(false);
  const videoIntroCompleteRef = useRef(false);
  const isHydratingRemoteRef = useRef(false);
  const skipNextAppStateSyncRef = useRef(false);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    reflectionsRef.current = reflections;
  }, [reflections]);

  useEffect(() => {
    dailyVideosRef.current = dailyVideos;
  }, [dailyVideos]);

  useEffect(() => {
    routineRemindersRef.current = routineReminders;
  }, [routineReminders]);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    videoIntroCompleteRef.current = identity.videoIntroComplete;
  }, [identity.videoIntroComplete]);

  const checkPendingVideo = useCallback(async () => {
    try {
      if (!isAuthenticatedRef.current || !videoIntroCompleteRef.current) return;

      const today = getTodayKey();
      let videos: DailyVideo[] = dailyVideosRef.current;
      let todayVideo = videos.find((v: DailyVideo) => v.date === today);

      if (!todayVideo) {
        todayVideo = createDailyVideo(today, videos[videos.length - 1]);
        videos = [...videos, todayVideo];
        setDailyVideos(videos);
      }

      if (!todayVideo.watched) {
        console.log('🔔 Pending video detected, showing modal');
        setShouldShowVideo(true);
      } else {
        console.log('✅ Video already watched today');
      }
    } catch (error) {
      console.error('Error checking pending video:', error);
    }
  }, []);

  const persistAppStateNow = useCallback(async (overrides?: Partial<BootstrapPayload['app_state']>) => {
    const token = await getAuthToken();
    if (!token) return;

    await apiRequest('/me/app-state', {
      method: 'PUT',
      body: JSON.stringify({
        data: {
          sessions: sessionsRef.current,
          reflections: reflectionsRef.current,
          dailyVideos: dailyVideosRef.current,
          routineReminders: routineRemindersRef.current,
          videoIntroComplete: videoIntroCompleteRef.current,
          ...overrides,
        },
      }),
    });
  }, []);

  useEffect(() => {
    loadData();

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      try {
        if (
          isAuthenticatedRef.current &&
          videoIntroCompleteRef.current &&
          response?.notification?.request?.content?.data?.type === 'daily-video'
        ) {
          setShouldShowVideo(true);
        }
      } catch (e) {
        console.error('❌ Error handling notification response:', e);
      }
    });

    (async () => {
      try {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (
          isAuthenticatedRef.current &&
          videoIntroCompleteRef.current &&
          lastResponse?.notification?.request?.content?.data?.type === 'daily-video'
        ) {
          setShouldShowVideo(true);
        }
      } catch (e) {
        console.log('⚠️ getLastNotificationResponseAsync failed:', e);
      }
    })();

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkPendingVideo();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      appStateSubscription.remove();
    };
  }, [checkPendingVideo]);

  const setupNotifications = useCallback(async () => {
    if (Platform.OS === 'web') return;

    try {
      // Solicitar permisos de notificaciones
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return;
      }

      // Para Android 13+: Obtener el push token (esto fuerza la solicitud de permisos adicionales)
      if (Platform.OS === 'android') {
        try {
          const pushToken = await Notifications.getDevicePushTokenAsync();
          console.log('Android push token obtained:', pushToken.data);
        } catch (error) {
          console.log('Error getting Android push token:', error);
          // Continuar de todos modos, puede que las notificaciones locales funcionen
        }
      }

      // Cancelar notificaciones previas
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Programar notificación diaria a las 5:00 AM
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('notifications.dailyVideoTitle'),
          body: t('notifications.dailyVideoBody'),
          data: { type: 'daily-video' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 5,
          minute: 0,
        },
      });

      for (const reminder of routineReminders) {
        if (!reminder.enabled) continue;

        const parsedTime = parseReminderTime(reminder.time);
        if (!parsedTime) continue;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: t(`notifications.${reminder.id}Title`),
            body: t(`notifications.${reminder.id}Body`),
            data: { type: 'routine-reminder', reminderId: reminder.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: parsedTime.hour,
            minute: parsedTime.minute,
          },
        });
      }

      console.log('Daily notifications scheduled successfully');
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  }, [routineReminders, t]);

  useEffect(() => {
    if (!isLanguageLoading) {
      setupNotifications();
    }
  }, [isLanguageLoading, setupNotifications]);

  useEffect(() => {
    return () => {
      Object.values(habitSyncQueue.current).forEach(sync => {
        if (sync.timer) clearTimeout(sync.timer);
      });
      if (habitSyncToastTimer.current) clearTimeout(habitSyncToastTimer.current);
      if (appStateSyncTimer.current) clearTimeout(appStateSyncTimer.current);
    };
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (isHydratingRemoteRef.current) return;
    if (skipNextAppStateSyncRef.current) {
      skipNextAppStateSyncRef.current = false;
      return;
    }

    if (appStateSyncTimer.current) {
      clearTimeout(appStateSyncTimer.current);
    }

    appStateSyncTimer.current = setTimeout(() => {
      getAuthToken()
        .then(token => {
          if (!token) return null;

          return apiRequest('/me/app-state', {
            method: 'PUT',
            body: JSON.stringify({
              data: {
                sessions,
                reflections,
                dailyVideos,
                routineReminders,
                videoIntroComplete: identity.videoIntroComplete,
              },
            }),
          });
        })
        .catch(error => {
          console.log('Could not sync app state:', error);
        });
    }, 900);
  }, [
    dailyVideos,
    identity.videoIntroComplete,
    isAuthenticated,
    isLoading,
    reflections,
    routineReminders,
    sessions,
  ]);

  const loadData = async () => {
    try {
      isHydratingRemoteRef.current = true;
      const authToken = await getAuthToken();

      if (!authToken) {
        setIsAuthenticated(false);
        setProfile(null);
        setIdentity(DEFAULT_IDENTITY);
        setHabits([]);
        setSessions([]);
        setReflections([]);
        setDailyVideos([]);
        setRoutineReminders(DEFAULT_ROUTINE_REMINDERS);
        setAppSettings(DEFAULT_APP_SETTINGS);
        setShouldShowVideo(false);
        return;
      }

      setIsAuthenticated(true);
      const bootstrap = await apiRequest<BootstrapPayload>('/bootstrap');

      if (bootstrap.profile) {
        setProfile({
          id: bootstrap.profile.id,
          email: bootstrap.profile.email,
          username: bootstrap.profile.username,
          displayName: bootstrap.profile.displayName,
        });

        const remoteIdentity: UserIdentity = {
          currentIdentity: bootstrap.profile.currentIdentity ?? '',
          targetIdentity: bootstrap.profile.targetIdentity ?? '',
          whyTransform: bootstrap.profile.whyTransform ?? '',
          setupComplete: Boolean(bootstrap.profile.setupComplete),
          videoIntroComplete: Boolean(bootstrap.app_state?.videoIntroComplete),
          coreValues: bootstrap.profile.coreValues ?? [],
        };
        videoIntroCompleteRef.current = remoteIdentity.videoIntroComplete;
        setIdentity(remoteIdentity);

        if (bootstrap.profile.appSettings) {
          const remoteSettings = mergeAppSettings(bootstrap.profile.appSettings);
          setAppSettings(remoteSettings);
          setLanguage(remoteSettings.language).catch(error => {
            console.log('Could not apply remote language:', error);
          });
        }
      }

      setHabits(dedupeRemoteHabits(bootstrap.habits ?? []));
      skipNextAppStateSyncRef.current = true;
      const remoteSessions = bootstrap.app_state?.sessions ?? [];
      const remoteReflections = bootstrap.app_state?.reflections ?? [];
      const remoteRoutineReminders = bootstrap.app_state?.routineReminders ?? DEFAULT_ROUTINE_REMINDERS;

      sessionsRef.current = remoteSessions;
      reflectionsRef.current = remoteReflections;
      routineRemindersRef.current = remoteRoutineReminders;
      setSessions(remoteSessions);
      setReflections(remoteReflections);
      setRoutineReminders(remoteRoutineReminders);

      const today = getTodayKey();
      let videos: DailyVideo[] = bootstrap.app_state?.dailyVideos ?? [];
      let todayVideo = videos.find((v: DailyVideo) => v.date === today);

      if (!todayVideo) {
        todayVideo = createDailyVideo(today, videos[videos.length - 1]);
        videos = [...videos, todayVideo];
      }

      dailyVideosRef.current = videos;
      setDailyVideos(videos);
      setShouldShowVideo(Boolean(bootstrap.app_state?.videoIntroComplete) && !todayVideo.watched);
    } catch (error) {
      console.error('Error loading data:', error);
      await clearAuthToken();
      setIsAuthenticated(false);
      setProfile(null);
      setIdentity(DEFAULT_IDENTITY);
      setHabits([]);
      setSessions([]);
      setReflections([]);
      setDailyVideos([]);
      setRoutineReminders(DEFAULT_ROUTINE_REMINDERS);
      setAppSettings(DEFAULT_APP_SETTINGS);
      setShouldShowVideo(false);
      videoIntroCompleteRef.current = false;
    } finally {
      setTimeout(() => {
        isHydratingRemoteRef.current = false;
      }, 0);
      setIsLoading(false);
    }
  };

  const saveIdentity = useCallback(async (newIdentity: UserIdentity) => {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No hay sesión activa.');
    }

    await apiRequest('/me/identity', {
      method: 'PATCH',
      body: JSON.stringify(newIdentity),
    });
    setIdentity(newIdentity);
  }, []);

  const completeVideoIntro = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No hay sesión activa.');
    }

    await apiRequest('/me/app-state', {
      method: 'PUT',
      body: JSON.stringify({
        data: {
          sessions: sessionsRef.current,
          reflections: reflectionsRef.current,
          dailyVideos: dailyVideosRef.current,
          routineReminders: routineRemindersRef.current,
          videoIntroComplete: true,
        },
      }),
    });

    videoIntroCompleteRef.current = true;
    setIdentity(prev => ({
      ...prev,
      videoIntroComplete: true,
    }));
  }, []);

  const refreshSessionData = useCallback(async () => {
    setIsLoading(true);
    await loadData();
  }, []);

  const logoutSession = useCallback(async () => {
    await clearAuthToken();
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    setIsAuthenticated(false);
    setProfile(null);
    setIdentity(DEFAULT_IDENTITY);
    setHabits([]);
    setSessions([]);
    setReflections([]);
    setDailyVideos([]);
    setRoutineReminders(DEFAULT_ROUTINE_REMINDERS);
    setAppSettings(DEFAULT_APP_SETTINGS);
    setShouldShowVideo(false);
    videoIntroCompleteRef.current = false;
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const updatedProfile = await apiRequest<UserProfile>('/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setProfile(updatedProfile);
    return updatedProfile;
  }, []);

  const updateAppSettings = useCallback(async (updates: Partial<AppSettings>) => {
    setAppSettings(prev => {
      const next = mergeAppSettings({
        ...prev,
        ...updates,
        gamification: {
          ...prev.gamification,
          ...updates.gamification,
        },
        notifications: {
          ...prev.notifications,
          ...updates.notifications,
        },
        focusMode: {
          ...prev.focusMode,
          ...updates.focusMode,
        },
      });

      getAuthToken()
        .then(token => {
          if (!token) return null;

          return apiRequest('/me/settings', {
            method: 'PATCH',
            body: JSON.stringify({ appSettings: next }),
          });
        })
        .catch(error => {
          console.log('Could not sync app settings:', error);
        });
      return next;
    });
  }, []);

  const flushHabitSync = useCallback(async (habitId: string) => {
    const sync = habitSyncQueue.current[habitId];
    if (!sync || sync.inFlight) return;

    sync.inFlight = true;
    sync.timer = null;
    const completedToPersist = sync.desiredCompleted;
    const versionToPersist = sync.version;
    const clientMutationId = `${habitId}:${versionToPersist}`;
    if (habitSyncToastTimer.current) clearTimeout(habitSyncToastTimer.current);
    let promiseToastStarted = false;
    const requestPromise = apiRequest<
      Pick<Habit, 'id' | 'completedToday' | 'history'> & { clientMutationId?: string }
    >(`/habits/${habitId}/completion`, {
      method: 'PATCH',
      body: JSON.stringify({
        completed: completedToPersist,
        clientMutationId,
        localDate: getTodayKey(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Merida',
      }),
    });

    habitSyncToastTimer.current = setTimeout(() => {
      promiseToastStarted = true;
      fulltoast.promise(requestPromise, {
        loading: {
          id: HABIT_SYNC_TOAST_ID,
          title: 'Guardando cambios',
          description: 'Sincronizando tus hábitos...',
        },
        success: {
          id: HABIT_SYNC_TOAST_ID,
          title: 'Cambios guardados',
          description: '',
          duration: 1500,
        },
        error: {
          id: HABIT_SYNC_TOAST_ID,
          title: 'No se pudo guardar',
          description: 'Revisa tu conexión e intenta de nuevo.',
          duration: 6000,
          button: {
            title: 'Reintentar',
            onPress: () => {
              fulltoast.dismiss(HABIT_SYNC_TOAST_ID);
              flushHabitSync(habitId);
            },
          },
        },
      }).catch(() => undefined);
    }, HABIT_SYNC_LOADING_DELAY);

    try {
      const remoteHabit = await requestPromise;

      const latestSync = habitSyncQueue.current[habitId];
      if (latestSync?.version === versionToPersist) {
        const today = getTodayKey();

        setHabits(prev => {
          return applyHabitCompletedState(
            prev,
            habitId,
            remoteHabit.completedToday,
            Object.keys(remoteHabit.history)[0] ?? today
          );
        });
        if (habitSyncToastTimer.current) {
          clearTimeout(habitSyncToastTimer.current);
          habitSyncToastTimer.current = null;
        }
      }
    } catch (error) {
      const latestSync = habitSyncQueue.current[habitId];

      if (latestSync?.version === versionToPersist) {
        console.log('Could not sync habit completion:', error);
        if (habitSyncToastTimer.current) {
          clearTimeout(habitSyncToastTimer.current);
          habitSyncToastTimer.current = null;
        }
        if (!promiseToastStarted) {
          fulltoast.error({
            id: HABIT_SYNC_TOAST_ID,
            title: 'No se pudo guardar',
            description: 'Revisa tu conexión e intenta de nuevo.',
            duration: 6000,
            button: {
              title: 'Reintentar',
              onPress: () => {
                fulltoast.dismiss(HABIT_SYNC_TOAST_ID);
                flushHabitSync(habitId);
              },
            },
          });
        }
      }
    } finally {
      const latestSync = habitSyncQueue.current[habitId];
      if (!latestSync) return;

      latestSync.inFlight = false;

      if (
        latestSync.version !== versionToPersist ||
        latestSync.desiredCompleted !== completedToPersist
      ) {
        latestSync.timer = setTimeout(() => {
          flushHabitSync(habitId);
        }, 300);
      }
    }
  }, []);

  const queueHabitSync = useCallback((habitId: string, completed: boolean) => {
    const existing = habitSyncQueue.current[habitId];
    const nextVersion = (existing?.version ?? 0) + 1;

    if (existing?.timer) {
      clearTimeout(existing.timer);
    }

    habitSyncQueue.current[habitId] = {
      desiredCompleted: completed,
      version: nextVersion,
      timer: setTimeout(() => {
        flushHabitSync(habitId);
      }, 300),
      inFlight: existing?.inFlight ?? false,
    };

  }, [flushHabitSync]);

  const toggleHabit = useCallback(async (habitId: string) => {
    let nextCompleted = false;

    setHabits(prev => {
      const habit = prev.find(item => item.id === habitId);
      nextCompleted = !habit?.completedToday;
      return applyHabitCompletedState(prev, habitId, nextCompleted);
    });

    queueHabitSync(habitId, nextCompleted);
  }, [queueHabitSync]);

  const addHabit = useCallback(async (habit: Omit<Habit, 'id'>) => {
    const newHabit = await apiRequest<Habit>('/habits', {
      method: 'POST',
      body: JSON.stringify({
        title: habit.title,
        type: habit.type,
        category: habit.category,
        targetDays: habit.targetDays,
      }),
    });

    setHabits(prev => {
      return [...prev, newHabit];
    });
  }, []);

  const startFocusSession = useCallback(async () => {
    const session: FocusSession = {
      id: Date.now().toString(),
      startTime: Date.now(),
      duration: 0,
      distractions: 0,
      completed: false,
      type: 'deep-work',
    };

    const updated = [...sessionsRef.current, session];
    sessionsRef.current = updated;
    setSessions(updated);
    persistAppStateNow({ sessions: updated }).catch(error => {
      console.log('Could not persist focus session start:', error);
    });

    return session.id;
  }, [persistAppStateNow]);

  const endFocusSession = useCallback(async (
    sessionId: string,
    completed: boolean,
    activeDuration?: number
  ) => {
    const updated = sessionsRef.current.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          endTime: Date.now(),
          duration: activeDuration ?? Date.now() - session.startTime,
          completed,
        };
      }
      return session;
    });

    sessionsRef.current = updated;
    setSessions(updated);
    persistAppStateNow({ sessions: updated }).catch(error => {
      console.log('Could not persist focus session end:', error);
    });
  }, [persistAppStateNow]);

  const addDistraction = useCallback(async (sessionId: string) => {
    const updated = sessionsRef.current.map(session => {
      if (session.id === sessionId) {
        return { ...session, distractions: session.distractions + 1 };
      }
      return session;
    });

    sessionsRef.current = updated;
    setSessions(updated);
    persistAppStateNow({ sessions: updated }).catch(error => {
      console.log('Could not persist distraction:', error);
    });
  }, [persistAppStateNow]);

  const saveReflection = useCallback(async (reflection: Omit<Reflection, 'id'>) => {
    const existingReflection = reflectionsRef.current.find(item => item.date === reflection.date);
    const nextReflection: Reflection = {
      ...reflection,
      id: existingReflection?.id ?? Date.now().toString(),
    };
    const updated = existingReflection
      ? reflectionsRef.current.map(item => item.date === reflection.date ? nextReflection : item)
      : [...reflectionsRef.current, nextReflection];

    reflectionsRef.current = updated;
    setReflections(updated);
    await persistAppStateNow({ reflections: updated });
  }, [persistAppStateNow]);

  const markVideoAsWatched = useCallback(async (videoId: string) => {
    const today = getTodayKey();
    const currentVideos = dailyVideosRef.current;
    const existingVideo = currentVideos.find(v => v.id === videoId) ?? currentVideos.find(v => v.date === today);
    let updated: DailyVideo[];

    if (existingVideo) {
      updated = currentVideos.map(v =>
        v.id === existingVideo.id
          ? { ...v, watched: true, watchedAt: Date.now() }
          : v
      );
    } else {
      const newVideo: DailyVideo = {
        ...createDailyVideo(today, currentVideos[currentVideos.length - 1]),
        watched: true,
        watchedAt: Date.now(),
      };
      updated = [...currentVideos, newVideo];
    }

    dailyVideosRef.current = updated;
    setDailyVideos(updated);
    setShouldShowVideo(false);
    await persistAppStateNow({ dailyVideos: updated });
  }, [persistAppStateNow]);

  const skipVideo = useCallback(async () => {
    console.log('⏭️ User skipped video, closing modal');
    setShouldShowVideo(false);
  }, []);

  const getTodayVideo = useCallback((): DailyVideo | null => {
    const today = getTodayKey();
    const todayVideo = dailyVideos.find(v => v.date === today);

    if (todayVideo) {
      return todayVideo;
    }

    return null;
  }, [dailyVideos]);

  const updateRoutineReminder = useCallback(async (
    reminderId: RoutineReminderId,
    updates: Partial<Pick<RoutineReminder, 'enabled' | 'time'>>
  ) => {
    const updated = routineRemindersRef.current.map(reminder =>
      reminder.id === reminderId ? { ...reminder, ...updates } : reminder
    );

    routineRemindersRef.current = updated;
    setRoutineReminders(updated);
    persistAppStateNow({ routineReminders: updated }).catch(error => {
      console.log('Could not persist routine reminder:', error);
    });
  }, [persistAppStateNow]);

  const todayReflection = reflections.find(
    r => r.date === getTodayKey()
  );

  const todaysSessions = sessions.filter(
    s => new Date(s.startTime).toDateString() === new Date().toDateString()
  );

  const totalFocusTime = sessions.reduce((acc, s) => acc + s.duration, 0);

  const dailyXpByDate = useMemo(() => {
    const xpByDate: Record<string, number> = {};

    habits
      .forEach(habit => {
        Object.entries(habit.history).forEach(([date, completed]) => {
          if (completed && habit.type === 'good') {
            xpByDate[date] = (xpByDate[date] || 0) + HABIT_XP;
          }

          if (
            completed &&
            habit.type === 'bad' &&
            appSettings.gamification.sanctionsEnabled
          ) {
            xpByDate[date] = (xpByDate[date] || 0) - appSettings.gamification.badHabitPenalty;
          }
        });
      });

    sessions
      .filter(session => session.completed)
      .forEach(session => {
        const date = getDateKey(new Date(session.startTime));
        xpByDate[date] = (xpByDate[date] || 0) + getFocusXpForDuration(session.duration);
      });

    if (appSettings.gamification.sanctionsEnabled) {
      sessions
        .filter(session => session.distractions > 0)
        .forEach(session => {
          const date = getDateKey(new Date(session.startTime));
          xpByDate[date] = (xpByDate[date] || 0) - (
            session.distractions * appSettings.focusMode.exitPenalty
          );
        });
    }

    dailyVideos
      .filter(video => video.watched)
      .forEach(video => {
        xpByDate[video.date] = (xpByDate[video.date] || 0) + VIDEO_XP;
      });

    return xpByDate;
  }, [
    appSettings.gamification.badHabitPenalty,
    appSettings.gamification.sanctionsEnabled,
    appSettings.focusMode.exitPenalty,
    dailyVideos,
    habits,
    sessions,
  ]);

  const autoDailyXpGoal = useMemo(
    () => calculateAutoDailyXpGoal(dailyXpByDate),
    [dailyXpByDate]
  );

  const dailyXpGoal = appSettings.gamification.goalMode === 'manual'
    ? appSettings.gamification.manualDailyXpGoal
    : autoDailyXpGoal;

  const dailyPenaltyByDate = useMemo(() => {
    if (!appSettings.gamification.sanctionsEnabled) return {};

    const today = getTodayKey();
    return Object.entries(dailyXpByDate).reduce<Record<string, number>>((acc, [date, xp]) => {
      if (date < today && xp > 0 && xp < dailyXpGoal) {
        acc[date] = appSettings.gamification.missedGoalPenalty;
      }

      return acc;
    }, {});
  }, [
    appSettings.gamification.missedGoalPenalty,
    appSettings.gamification.sanctionsEnabled,
    dailyXpByDate,
    dailyXpGoal,
  ]);

  const missedGoalPenaltyXp = Object.values(dailyPenaltyByDate).reduce((sum, xp) => sum + xp, 0);
  const badHabitPenaltyXp = appSettings.gamification.sanctionsEnabled
    ? habits
      .filter(habit => habit.type === 'bad')
      .reduce((sum, habit) => {
        const completions = Object.values(habit.history).filter(Boolean).length;
        return sum + completions * appSettings.gamification.badHabitPenalty;
      }, 0)
    : 0;
  const focusExitPenaltyXp = appSettings.gamification.sanctionsEnabled
    ? sessions.reduce(
      (sum, session) => sum + (session.distractions * appSettings.focusMode.exitPenalty),
      0
    )
    : 0;
  const totalPenaltyXp = missedGoalPenaltyXp + badHabitPenaltyXp + focusExitPenaltyXp;

  const todayXp = dailyXpByDate[getTodayKey()] || 0;
  const totalXp = Math.max(
    0,
    Object.values(dailyXpByDate).reduce((sum, xp) => sum + xp, 0) - missedGoalPenaltyXp
  );
  const level = Math.floor(totalXp / 500) + 1;

  const currentStreak = (() => {
    let streak = 0;
    const checkDate = new Date();

    if ((dailyXpByDate[getDateKey(checkDate)] || 0) < dailyXpGoal) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while ((dailyXpByDate[getDateKey(checkDate)] || 0) >= dailyXpGoal) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  })();

  const longestStreak = (() => {
    const completedDates = Object.entries(dailyXpByDate)
      .filter(([, xp]) => xp >= dailyXpGoal)
      .map(([date]) => date)
      .sort();
    let longest = 0;
    let running = 0;
    let previousDate: Date | null = null;

    completedDates.forEach(dateKey => {
      const [year, month, day] = dateKey.split('-').map(Number);
      const currentDate = new Date(year, month - 1, day);
      const isConsecutive = previousDate
        ? Math.round((currentDate.getTime() - previousDate.getTime()) / 86400000) === 1
        : false;

      running = isConsecutive ? running + 1 : 1;
      longest = Math.max(longest, running);
      previousDate = currentDate;
    });

    return longest;
  })();

  const weeklyActivity = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dateKey = getDateKey(date);

    return {
      date: dateKey,
      xp: dailyXpByDate[dateKey] || 0,
      goalReached: (dailyXpByDate[dateKey] || 0) >= dailyXpGoal,
      penalty: dailyPenaltyByDate[dateKey] || 0,
    };
  });

  const videoStreak = (() => {
    const watchedVideos = [...dailyVideos]
      .filter(v => v.watched)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (watchedVideos.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Verificar si hay video visto hoy
    const todayDate = getTodayKey();
    const hasWatchedToday = watchedVideos.some(v => v.date === todayDate);

    // Si no hay video visto hoy, empezar desde ayer
    let checkDate = new Date(today);
    if (!hasWatchedToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Contar días consecutivos hacia atrás
    for (let i = 0; i < watchedVideos.length; i++) {
      const dateToCheck = getDateKey(checkDate);
      const videoForDate = watchedVideos.find(v => v.date === dateToCheck);

      if (videoForDate) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  })();

  return useMemo(() => ({
    identity,
    profile,
    habits,
    sessions,
    reflections,
    dailyVideos,
    routineReminders,
    appSettings,
    isLoading,
    isAuthenticated,
    shouldShowVideo,
    saveIdentity,
    completeVideoIntro,
    refreshSessionData,
    logoutSession,
    updateProfile,
    updateAppSettings,
    toggleHabit,
    addHabit,
    startFocusSession,
    endFocusSession,
    addDistraction,
    saveReflection,
    markVideoAsWatched,
    skipVideo,
    getTodayVideo,
    updateRoutineReminder,
    todayReflection,
    todaysSessions,
    totalFocusTime,
    currentStreak,
    longestStreak,
    videoStreak,
    todayXp,
    totalXp,
    totalPenaltyXp,
    dailyXpGoal,
    autoDailyXpGoal,
    level,
    weeklyActivity,
  }), [
    identity,
    profile,
    habits,
    sessions,
    reflections,
    dailyVideos,
    routineReminders,
    appSettings,
    isLoading,
    isAuthenticated,
    shouldShowVideo,
    saveIdentity,
    completeVideoIntro,
    refreshSessionData,
    logoutSession,
    updateProfile,
    updateAppSettings,
    toggleHabit,
    addHabit,
    startFocusSession,
    endFocusSession,
    addDistraction,
    saveReflection,
    markVideoAsWatched,
    skipVideo,
    getTodayVideo,
    updateRoutineReminder,
    todayReflection,
    todaysSessions,
    totalFocusTime,
    currentStreak,
    longestStreak,
    videoStreak,
    todayXp,
    totalXp,
    totalPenaltyXp,
    dailyXpGoal,
    autoDailyXpGoal,
    level,
    weeklyActivity,
  ]);
});
