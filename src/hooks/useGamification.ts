import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserProfile {
  xp: number;
  level: number;
  streak_days: number;
  last_activity_date: string | null;
}

// XP required for each level (cumulative)
const getLevelThreshold = (level: number): number => {
  return level * 100; // Level 1: 100 XP, Level 2: 200 XP, etc.
};

export const useGamification = () => {
  const awardXP = async (userId: string, amount: number, reason?: string): Promise<boolean> => {
    try {
      // Get current profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('xp, level, streak_days, last_activity_date')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const currentXP = profile?.xp || 0;
      const currentLevel = profile?.level || 1;
      const newXP = currentXP + amount;

      // Calculate new level
      let newLevel = currentLevel;
      while (newXP >= getLevelThreshold(newLevel)) {
        newLevel++;
      }

      // Check if level up occurred
      const leveledUp = newLevel > currentLevel;

      // Update streak
      const today = new Date().toISOString().split('T')[0];
      const lastActivity = profile?.last_activity_date;
      let newStreak = profile?.streak_days || 0;

      if (lastActivity) {
        const lastDate = new Date(lastActivity);
        const todayDate = new Date(today);
        const diffDays = Math.floor(
          (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          // Consecutive day - increase streak
          newStreak += 1;
        } else if (diffDays > 1) {
          // Missed a day - reset streak
          newStreak = 1;
        }
        // Same day - no change to streak
      } else {
        newStreak = 1;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          xp: newXP,
          level: newLevel,
          streak_days: newStreak,
          last_activity_date: today,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Show toast notifications
      if (reason) {
        toast.success(`+${amount} XP - ${reason}`);
      }

      if (leveledUp) {
        toast.success(`🎉 Level Up! You're now Level ${newLevel}!`, {
          duration: 5000,
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to award XP:', error);
      return false;
    }
  };

  const getUserStats = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('xp, level, streak_days, last_activity_date')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return null;
    }
  };

  return { awardXP, getUserStats, getLevelThreshold };
};
