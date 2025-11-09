import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Habit, FocusSession, Reflection, UserIdentity, Distraction, Goal, PhysicalTracking } from '@/types';

const STORAGE_KEYS = {
  HABITS: '@apex_habits',
  SESSIONS: '@apex_sessions',
  REFLECTIONS: '@apex_reflections',
  IDENTITY: '@apex_identity',
} as const;

const DEFAULT_IDENTITY: UserIdentity = {
  currentIdentity: '',
  targetIdentity: '',
  whyTransform: '',
  setupComplete: false,
  coreValues: [],
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
];

export const [AppProvider, useApp] = createContextHook(() => {
  const [identity, setIdentity] = useState<UserIdentity>(DEFAULT_IDENTITY);
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [identityData, habitsData, sessionsData, reflectionsData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.IDENTITY),
        AsyncStorage.getItem(STORAGE_KEYS.HABITS),
        AsyncStorage.getItem(STORAGE_KEYS.SESSIONS),
        AsyncStorage.getItem(STORAGE_KEYS.REFLECTIONS),
      ]);

      if (identityData) setIdentity(JSON.parse(identityData));
      if (habitsData) setHabits(JSON.parse(habitsData));
      if (sessionsData) setSessions(JSON.parse(sessionsData));
      if (reflectionsData) setReflections(JSON.parse(reflectionsData));
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

  const toggleHabit = useCallback(async (habitId: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    setHabits(prev => {
      const updated = prev.map(habit => {
        if (habit.id === habitId) {
          const newCompleted = !habit.completedToday;
          const newHistory = { ...habit.history, [today]: newCompleted };
          
          let newStreak = habit.streak;
          if (newCompleted && habit.type === 'good') {
            newStreak = habit.streak + 1;
          } else if (!newCompleted && habit.type === 'good') {
            newStreak = 0;
          }
          
          return {
            ...habit,
            completedToday: newCompleted,
            history: newHistory,
            streak: newStreak,
          };
        }
        return habit;
      });
      
      AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addHabit = useCallback(async (habit: Omit<Habit, 'id'>) => {
    const newHabit: Habit = {
      ...habit,
      id: Date.now().toString(),
    };
    
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

  const endFocusSession = useCallback(async (sessionId: string, completed: boolean) => {
    setSessions(prev => {
      const updated = prev.map(session => {
        if (session.id === sessionId) {
          return {
            ...session,
            endTime: Date.now(),
            duration: Date.now() - session.startTime,
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
    const newReflection: Reflection = {
      ...reflection,
      id: Date.now().toString(),
    };
    
    setReflections(prev => {
      const updated = [...prev, newReflection];
      AsyncStorage.setItem(STORAGE_KEYS.REFLECTIONS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const todayReflection = reflections.find(
    r => r.date === new Date().toISOString().split('T')[0]
  );

  const todaysSessions = sessions.filter(
    s => new Date(s.startTime).toDateString() === new Date().toDateString()
  );

  const totalFocusTime = sessions.reduce((acc, s) => acc + s.duration, 0);

  const currentStreak = (() => {
    const sortedDates = Object.keys(habits[0]?.history || {}).sort().reverse();
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < sortedDates.length; i++) {
      const date = new Date(sortedDates[i]);
      const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i && habits[0]?.history[sortedDates[i]]) {
        streak++;
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
    isLoading,
    saveIdentity,
    toggleHabit,
    addHabit,
    startFocusSession,
    endFocusSession,
    addDistraction,
    saveReflection,
    todayReflection,
    todaysSessions,
    totalFocusTime,
    currentStreak,
  }), [
    identity,
    habits,
    sessions,
    reflections,
    isLoading,
    saveIdentity,
    toggleHabit,
    addHabit,
    startFocusSession,
    endFocusSession,
    addDistraction,
    saveReflection,
    todayReflection,
    todaysSessions,
    totalFocusTime,
    currentStreak,
  ]);
});