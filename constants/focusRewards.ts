export const FOCUS_REWARD_BY_MINUTES = {
  10: 5,
  25: 15,
  50: 30,
} as const;

export type FocusRewardMinutes = keyof typeof FOCUS_REWARD_BY_MINUTES;

export const getFocusXpForMinutes = (minutes: number) => {
  if (minutes >= 50) return FOCUS_REWARD_BY_MINUTES[50];
  if (minutes >= 25) return FOCUS_REWARD_BY_MINUTES[25];
  if (minutes >= 10) return FOCUS_REWARD_BY_MINUTES[10];

  return 0;
};

export const getFocusXpForDuration = (durationMs: number) => {
  return getFocusXpForMinutes(Math.round(durationMs / 60000));
};
