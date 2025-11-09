export type Language = 'es' | 'en';

export type Habit = {
  id: string;
  title: string;
  description?: string;
  type: 'good' | 'bad';
  category: 'physical' | 'mental' | 'productivity' | 'social';
  streak: number;
  completedToday: boolean;
  history: Record<string, boolean>;
  createdAt: number;
  targetDays?: number;
  reminder?: {
    enabled: boolean;
    time: string;
  };
};

export type FocusSession = {
  id: string;
  startTime: number;
  endTime?: number;
  duration: number;
  distractions: number;
  completed: boolean;
  type: 'deep-work' | 'study' | 'exercise' | 'meditation' | 'custom';
  notes?: string;
};

export type Distraction = {
  id: string;
  timestamp: number;
  trigger: string;
  emotion: string;
  action: 'resisted' | 'gave-in';
  notes?: string;
};

export type Reflection = {
  id: string;
  date: string;
  wins: string;
  improvements: string;
  tomorrowGoals: string;
  energy: number;
  mood: number;
  gratitude?: string;
  identityAffirmation?: string;
};

export type Goal = {
  id: string;
  title: string;
  description: string;
  category: 'health' | 'career' | 'relationships' | 'personal-growth' | 'financial';
  deadline: string;
  milestones: Milestone[];
  progress: number;
  createdAt: number;
};

export type Milestone = {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: number;
};

export type PhysicalTracking = {
  date: string;
  water: number;
  sleep: number;
  exercise: boolean;
  exerciseDuration?: number;
  energy: number;
  notes?: string;
};

export type WarMode = {
  active: boolean;
  startTime?: number;
  duration: number;
  blockedApps: string[];
};

export type Stats = {
  totalFocusTime: number;
  currentStreak: number;
  longestStreak: number;
  habitsCompleted: number;
  totalHabits: number;
  weeklyCompletion: number[];
  totalDistractions: number;
  resistedDistractions: number;
  avgDailyFocusTime: number;
  disciplineScore: number;
};

export type UserIdentity = {
  currentIdentity: string;
  targetIdentity: string;
  whyTransform: string;
  setupComplete: boolean;
  coreValues: string[];
};

export type AppSettings = {
  language: Language;
  darkMode: boolean;
  notifications: {
    habits: boolean;
    reflections: boolean;
    focusSessions: boolean;
    motivational: boolean;
  };
  focusMode: {
    defaultDuration: number;
    breakDuration: number;
    longBreakAfter: number;
  };
};