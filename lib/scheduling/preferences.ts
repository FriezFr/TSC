import { UserPreferences } from '@/lib/types';

export const DEFAULT_PREFERENCES: UserPreferences = {
  preferredStudyTimes: ['16:00-20:00', '21:00-23:30'],
  subjectPreferences: {
    Physics: { preferredDays: ['Saturday', 'Monday'], averageDurationMinutes: 75 },
    Chemistry: { preferredDays: ['Sunday', 'Tuesday'], averageDurationMinutes: 60 },
    Mathematics: { preferredDays: ['Sunday', 'Wednesday'], averageDurationMinutes: 90 },
    Biology: { preferredDays: ['Monday', 'Thursday'], averageDurationMinutes: 60 },
    English: { preferredDays: ['Monday', 'Wednesday'], averageDurationMinutes: 45 },
    Arabic: { preferredDays: ['Saturday', 'Tuesday'], averageDurationMinutes: 60 },
  },
  averageTaskCompletionTime: {
    homework: 45,
    revision: 60,
    exam_prep: 90,
  },
  avoidTimes: ['14:00-15:30'], // Midday lunch / rest break
  schedulingRules: [
    'Leave at least 15 minutes break between consecutive study sessions',
    'Do not schedule more than 2 difficult subjects consecutively',
    'Prefer completing homework on the day before the lesson deadline',
  ],
};

const STORAGE_KEY = 'ttasker_user_preferences';

/**
 * Loads user scheduling preferences from Supabase or localStorage.
 */
export async function loadUserPreferences(supabase: any, userId?: string): Promise<UserPreferences> {
  if (supabase && userId) {
    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userId)
        .maybeSingle();

      if (data?.preferences && Object.keys(data.preferences).length > 0) {
        return { ...DEFAULT_PREFERENCES, ...data.preferences };
      }
    } catch {
      // fallback to localStorage
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    } catch {}
  }

  return DEFAULT_PREFERENCES;
}

/**
 * Saves user scheduling preferences.
 */
export async function saveUserPreferences(
  supabase: any,
  userId: string | undefined,
  prefs: UserPreferences
): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {}
  }

  if (supabase && userId) {
    try {
      await supabase.from('user_preferences').upsert({
        user_id: userId,
        preferences: prefs,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error saving user preferences in Supabase:', err);
    }
  }
}

/**
 * Incrementally learns and updates average completion time for a task type.
 */
export function learnTaskDuration(
  currentPrefs: UserPreferences,
  taskType: string,
  actualDurationMinutes: number
): UserPreferences {
  const currentAverage = currentPrefs.averageTaskCompletionTime?.[taskType] || 45;
  // Exponential moving average: 80% old average + 20% new data point
  const updatedAvg = Math.round(currentAverage * 0.8 + actualDurationMinutes * 0.2);

  return {
    ...currentPrefs,
    averageTaskCompletionTime: {
      ...currentPrefs.averageTaskCompletionTime,
      [taskType]: updatedAvg,
    },
  };
}
