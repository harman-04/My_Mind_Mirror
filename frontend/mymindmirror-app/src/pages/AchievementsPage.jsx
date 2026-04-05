import React from 'react';
import { useGamificationStats } from '../hooks/useGamification';
import { useTheme } from '../contexts/ThemeContext';
import { Flame, Award, Target, Star, Trophy, Sparkles, CheckCircle, Clock } from 'lucide-react';

const allBadges = {
  FIRST_STEP: { icon: Star, label: 'First Step', color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30', description: 'Completed your first task', requirement: 'Complete 1 task' },
  THREE_DAY_STREAK: { icon: Flame, label: '3‑Day Streak', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30', description: 'Maintained a 3‑day streak', requirement: 'Complete tasks for 3 days in a row' },
  SEVEN_DAY_STREAK: { icon: Flame, label: '7‑Day Streak', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', description: 'Maintained a 7‑day streak', requirement: 'Complete tasks for 7 days in a row' },
  TASK_MASTER: { icon: Target, label: 'Task Master', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', description: 'Completed 10 tasks', requirement: 'Complete 10 tasks' },
  ROADMAP_FINISHER: { icon: Trophy, label: 'Roadmap Finisher', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30', description: 'Completed a full roadmap', requirement: 'Complete all tasks in any roadmap' },
};

function AchievementsPage() {
  const { theme } = useTheme();
  const { data: stats, isLoading, isError } = useGamificationStats();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="text-center py-12 text-red-500">
        Failed to load achievements. Please try again.
      </div>
    );
  }

  const earnedBadges = stats.badges || [];
  const bgClass = theme === 'dark' ? 'bg-gray-800/60' : 'bg-white/70';
  const textClass = theme === 'dark' ? 'text-gray-200' : 'text-gray-800';

  // Calculate next badge progress
  let nextBadge = null;
  if (!earnedBadges.includes('FIRST_STEP') && stats.totalTasksCompleted >= 1) nextBadge = 'FIRST_STEP';
  else if (!earnedBadges.includes('THREE_DAY_STREAK') && stats.currentStreak >= 3) nextBadge = 'THREE_DAY_STREAK';
  else if (!earnedBadges.includes('SEVEN_DAY_STREAK') && stats.currentStreak >= 7) nextBadge = 'SEVEN_DAY_STREAK';
  else if (!earnedBadges.includes('TASK_MASTER') && stats.totalTasksCompleted >= 10) nextBadge = 'TASK_MASTER';
  else if (!earnedBadges.includes('ROADMAP_FINISHER') && stats.totalTasksCompleted > 0) nextBadge = 'ROADMAP_FINISHER';

  const nextBadgeInfo = nextBadge ? allBadges[nextBadge] : null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-poppins font-bold bg-gradient-to-r from-purple-500 to-teal-500 bg-clip-text text-transparent">
          Your Achievements
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Track your progress and earn badges</p>
      </div>

      {/* Streak Summary */}
      <div className={`p-6 rounded-2xl ${bgClass} backdrop-blur-md shadow-inner`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Flame className="text-orange-500" size={24} />
              Current Streak
            </h2>
            <p className="text-3xl font-bold mt-2">{stats.currentStreak} days</p>
            <p className="text-sm text-gray-500 mt-1">Longest streak: {stats.longestStreak} days</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total tasks completed</p>
            <p className="text-2xl font-bold">{stats.totalTasksCompleted}</p>
          </div>
        </div>
        {nextBadgeInfo && (
          <div className="mt-4 p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <p className="text-sm font-medium">🎯 Next badge: {nextBadgeInfo.label}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{nextBadgeInfo.requirement}</p>
          </div>
        )}
      </div>

      {/* All Badges Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Badges</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(allBadges).map(([key, badge]) => {
            const earned = earnedBadges.includes(key);
            const Icon = badge.icon;
            return (
              <div
                key={key}
                className={`p-4 rounded-xl transition-all ${
                  earned ? badge.bg : 'bg-gray-100 dark:bg-gray-800/50 opacity-60'
                } border ${earned ? 'border-purple-300 dark:border-purple-700' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={32} className={`${badge.color} ${earned ? '' : 'opacity-40'}`} />
                  <div className="flex-1">
                    <h3 className="font-semibold">{badge.label}</h3>
                    <p className="text-xs text-gray-500">{badge.description}</p>
                  </div>
                  {earned && <CheckCircle size={18} className="text-green-500" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Motivation */}
      <div className="text-center text-sm text-gray-500 italic">
        Keep completing tasks to unlock more badges and extend your streak!
      </div>
    </div>
  );
}

export default AchievementsPage;