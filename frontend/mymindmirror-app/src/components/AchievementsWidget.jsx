import React from 'react';
import { useGamificationStats } from '../hooks/useGamification';
import { useTheme } from '../contexts/ThemeContext';
import { Flame, Award, Target, Star, Trophy, Sparkles } from 'lucide-react';

const badgeIcons = {
  FIRST_STEP: { icon: Star, label: 'First Step', color: 'text-yellow-500', description: 'Completed your first task' },
  THREE_DAY_STREAK: { icon: Flame, label: '3‑Day Streak', color: 'text-orange-500', description: 'Maintained a 3‑day streak' },
  SEVEN_DAY_STREAK: { icon: Flame, label: '7‑Day Streak', color: 'text-red-500', description: 'Maintained a 7‑day streak' },
  TASK_MASTER: { icon: Target, label: 'Task Master', color: 'text-blue-500', description: 'Completed 10 tasks' },
  ROADMAP_FINISHER: { icon: Trophy, label: 'Roadmap Finisher', color: 'text-purple-500', description: 'Completed a full roadmap' },
};

function AchievementsWidget() {
  const { theme } = useTheme();
  const { data: stats, isLoading, isError } = useGamificationStats();

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl bg-white/60 dark:bg-black/40 backdrop-blur-md shadow-inner animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
    );
  }

  if (isError || !stats) {
    return null;
  }

  const badges = stats.badges || [];
  const bgClass = theme === 'dark' ? 'bg-black/40' : 'bg-white/60';
  const textClass = theme === 'dark' ? 'text-gray-200' : 'text-gray-800';
  const borderClass = theme === 'dark' ? 'border-white/10' : 'border-gray-200';

  return (
    <div className={`p-4 rounded-xl ${bgClass} backdrop-blur-md shadow-inner border ${borderClass}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-lg font-poppins font-semibold ${textClass}`}>
          🏆 Achievements
        </h3>
        {stats.currentStreak > 0 && (
          <div className="flex items-center gap-1 text-orange-500">
            <Flame size={18} />
            <span className="font-bold">{stats.currentStreak} day streak</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {badges.map((badgeKey) => {
          const badge = badgeIcons[badgeKey];
          if (!badge) return null;
          const Icon = badge.icon;
          return (
            <div
              key={badgeKey}
              className="group relative flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium"
              title={badge.description}
            >
              <Icon size={14} className={badge.color} />
              <span className="text-gray-700 dark:text-gray-300">{badge.label}</span>
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap bg-black/80 text-white opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                {badge.description}
              </div>
            </div>
          );
        })}
      </div>

      {stats.longestStreak > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Longest streak: {stats.longestStreak} days
        </p>
      )}
      {badges.length === 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          Complete tasks to earn badges and start a streak!
        </p>
      )}
    </div>
  );
}

export default AchievementsWidget;