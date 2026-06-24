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
} from '@/types';
import { MOTIVATIONAL_VIDEOS, getRandomVideo } from '@/constants/videos';
import { getFocusXpForDuration } from '@/constants/focusRewards';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest } from '@/lib/api';

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

export const [AppProvider, useApp] = createContextHook(() => {
  const { t, isLoading: isLanguageLoading } = useLanguage();
  const [identity, setIdentity] = useState<UserIdentity>(DEFAULT_IDENTITY);
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [dailyVideos, setDailyVideos] = useState<DailyVideo[]>([]);
  const [routineReminders, setRoutineReminders] = useState<RoutineReminder[]>(
    DEFAULT_ROUTINE_REMINDERS
  );
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [shouldShowVideo, setShouldShowVideo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const appState = useRef(AppState.currentState);
  const habitSyncQueue = useRef<Record<string, PendingHabitSync>>({});
  const habitSyncToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Verificar si hay video pendiente
  const checkPendingVideo = useCallback(async () => {
    try {
      const videosData = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_VIDEOS);
      const today = getTodayKey();
      let videos: DailyVideo[] = videosData ? JSON.parse(videosData) : [];
      let todayVideo = videos.find((v: DailyVideo) => v.date === today);

      if (!todayVideo) {
        todayVideo = createDailyVideo(today, videos[videos.length - 1]);
        videos = [...videos, todayVideo];
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_VIDEOS, JSON.stringify(videos));
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

  useEffect(() => {
    // Cargar datos y configurar listeners
    loadData();

    // Listener para cuando el usuario interactúa con una notificación (app en foreground/background)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Notification response received:', response?.notification?.request?.content?.data);
      try {
        if (response?.notification?.request?.content?.data?.type === 'daily-video') {
          console.log('✅ Setting shouldShowVideo to TRUE');
          setShouldShowVideo(true);
        }
      } catch (e) {
        console.error('❌ Error handling notification response:', e);
      }
    });

    // Si la app fue abierta desde una notificación (cold start), obtener la última respuesta
    (async () => {
      try {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        console.log('🔍 Checking lastNotificationResponse:', lastResponse?.notification?.request?.content?.data);
        if (lastResponse?.notification?.request?.content?.data?.type === 'daily-video') {
          console.log('🚀 App opened from notification (cold start) - showing video');
          setShouldShowVideo(true);
        }
      } catch (e) {
        console.log('⚠️ getLastNotificationResponseAsync failed:', e);
      }
    })();

    // Listener para cuando la app vuelve al foreground (detecta si hay video pendiente)
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📲 App has come to the foreground, checking for pending video');
        checkPendingVideo();
      }
      appState.current = nextAppState;
    });

    // Cleanup
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
    };
  }, []);

  const loadData = async () => {
    try {
      const [
        identityData,
        habitsData,
        sessionsData,
        reflectionsData,
        videosData,
        lastCheckData,
        remindersData,
        appSettingsData,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.IDENTITY),
        AsyncStorage.getItem(STORAGE_KEYS.HABITS),
        AsyncStorage.getItem(STORAGE_KEYS.SESSIONS),
        AsyncStorage.getItem(STORAGE_KEYS.REFLECTIONS),
        AsyncStorage.getItem(STORAGE_KEYS.DAILY_VIDEOS),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_VIDEO_CHECK),
        AsyncStorage.getItem(STORAGE_KEYS.ROUTINE_REMINDERS),
        AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS),
      ]);

      if (identityData) setIdentity(JSON.parse(identityData));
      if (appSettingsData) {
        const mergedSettings = mergeAppSettings(JSON.parse(appSettingsData));
        setAppSettings(mergedSettings);
        await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(mergedSettings));
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(DEFAULT_APP_SETTINGS));
      }
      try {
        const remoteHabits = await apiRequest<Habit[]>('/habits');
        setHabits(remoteHabits);
        await AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(remoteHabits));
      } catch (error) {
        console.log('Using local habits because API is unavailable:', error);

        if (habitsData) {
          const normalizedHabits = normalizeHabitsForToday(JSON.parse(habitsData));

          setHabits(normalizedHabits);
          await AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(normalizedHabits));
        } else {
          setHabits(DEFAULT_HABITS);
          await AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(DEFAULT_HABITS));
        }
      }
      if (sessionsData) setSessions(JSON.parse(sessionsData));
      if (reflectionsData) setReflections(JSON.parse(reflectionsData));
      if (remindersData) {
        setRoutineReminders(JSON.parse(remindersData));
      } else {
        await AsyncStorage.setItem(
          STORAGE_KEYS.ROUTINE_REMINDERS,
          JSON.stringify(DEFAULT_ROUTINE_REMINDERS)
        );
      }
      const today = getTodayKey();
      const lastCheck = lastCheckData || '';

      // Verificar si hay video pendiente cada vez que se carga la app
      let videos: DailyVideo[] = videosData ? JSON.parse(videosData) : [];
      let todayVideo = videos.find((v: DailyVideo) => v.date === today);

      if (!todayVideo) {
        todayVideo = createDailyVideo(today, videos[videos.length - 1]);
        videos = [...videos, todayVideo];
        await AsyncStorage.setItem(STORAGE_KEYS.DAILY_VIDEOS, JSON.stringify(videos));
      }

      setDailyVideos(videos);

      console.log('📅 Today:', today);
      console.log('📹 Today video:', todayVideo);
      console.log('🕐 Last check:', lastCheck);

      // Mostrar video si:
      // 1. Existe pero no se ha visto
      // 2. Si no existía, ya se creó y guardó antes de abrir el modal
      if (!todayVideo.watched) {
        console.log('📺 Video exists but not watched, will show modal');
        setShouldShowVideo(true);
      } else {
        console.log('✅ Video already watched today');
        setShouldShowVideo(false);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveIdentity = useCallback(async (newIdentity: UserIdentity) => {
    setIdentity(newIdentity);
    await AsyncStorage.setItem(STORAGE_KEYS.IDENTITY, JSON.stringify(newIdentity));
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

      AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(next));
      return next;
    });
  }, []);

  const persistHabits = useCallback((nextHabits: Habit[]) => {
    AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(nextHabits));
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
          duration: 1200,
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
          const updated = applyHabitCompletedState(
            prev,
            habitId,
            remoteHabit.completedToday,
            Object.keys(remoteHabit.history)[0] ?? today
          );
          persistHabits(updated);
          return updated;
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
  }, [persistHabits]);

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
      const updated = applyHabitCompletedState(prev, habitId, nextCompleted);
      persistHabits(updated);
      return updated;
    });

    queueHabitSync(habitId, nextCompleted);
  }, [persistHabits, queueHabitSync]);

  const addHabit = useCallback(async (habit: Omit<Habit, 'id'>) => {
    let newHabit: Habit;

    try {
      newHabit = await apiRequest<Habit>('/habits', {
        method: 'POST',
        body: JSON.stringify({
          title: habit.title,
          type: habit.type,
          category: habit.category,
          targetDays: habit.targetDays,
        }),
      });
    } catch (error) {
      console.log('Creating habit locally because API is unavailable:', error);
      newHabit = {
        ...habit,
        id: Date.now().toString(),
      };
    }

    setHabits(prev => {
      const updated = [...prev, newHabit];
      AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(updated));
      return updated;
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

    setSessions(prev => {
      const updated = [...prev, session];
      AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
      return updated;
    });

    return session.id;
  }, []);

  const endFocusSession = useCallback(async (
    sessionId: string,
    completed: boolean,
    activeDuration?: number
  ) => {
    setSessions(prev => {
      const updated = prev.map(session => {
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
      AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addDistraction = useCallback(async (sessionId: string) => {
    setSessions(prev => {
      const updated = prev.map(session => {
        if (session.id === sessionId) {
          return { ...session, distractions: session.distractions + 1 };
        }
        return session;
      });
      AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const saveReflection = useCallback(async (reflection: Omit<Reflection, 'id'>) => {
    setReflections(prev => {
      const existingReflection = prev.find(item => item.date === reflection.date);
      const nextReflection: Reflection = {
        ...reflection,
        id: existingReflection?.id ?? Date.now().toString(),
      };
      const updated = existingReflection
        ? prev.map(item => item.date === reflection.date ? nextReflection : item)
        : [...prev, nextReflection];

      AsyncStorage.setItem(STORAGE_KEYS.REFLECTIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markVideoAsWatched = useCallback(async (videoId: string) => {
    const today = getTodayKey();

    setDailyVideos(prev => {
      const existingVideo = prev.find(v => v.id === videoId) ?? prev.find(v => v.date === today);
      let updated: DailyVideo[];

      if (existingVideo) {
        updated = prev.map(v =>
          v.id === existingVideo.id
            ? { ...v, watched: true, watchedAt: Date.now() }
            : v
        );
      } else {
        const newVideo: DailyVideo = {
          ...createDailyVideo(today, prev[prev.length - 1]),
          watched: true,
          watchedAt: Date.now(),
        };
        updated = [...prev, newVideo];
      }

      AsyncStorage.setItem(STORAGE_KEYS.DAILY_VIDEOS, JSON.stringify(updated));
      return updated;
    });

    // Actualizar el último check para evitar mostrar el video nuevamente hoy
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_VIDEO_CHECK, today);

    setShouldShowVideo(false);
    console.log('✅ Video marked as watched, shouldShowVideo set to false');
  }, []);

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
    setRoutineReminders(prev => {
      const updated = prev.map(reminder =>
        reminder.id === reminderId ? { ...reminder, ...updates } : reminder
      );
      AsyncStorage.setItem(
        STORAGE_KEYS.ROUTINE_REMINDERS,
        JSON.stringify(updated)
      );
      return updated;
    });
  }, []);

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

    dailyVideos
      .filter(video => video.watched)
      .forEach(video => {
        xpByDate[video.date] = (xpByDate[video.date] || 0) + VIDEO_XP;
      });

    return xpByDate;
  }, [
    appSettings.gamification.badHabitPenalty,
    appSettings.gamification.sanctionsEnabled,
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
  const totalPenaltyXp = missedGoalPenaltyXp + badHabitPenaltyXp;

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
    habits,
    sessions,
    reflections,
    dailyVideos,
    routineReminders,
    appSettings,
    isLoading,
    shouldShowVideo,
    saveIdentity,
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
    habits,
    sessions,
    reflections,
    dailyVideos,
    routineReminders,
    appSettings,
    isLoading,
    shouldShowVideo,
    saveIdentity,
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
