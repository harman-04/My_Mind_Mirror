// src/pages/AchievementsPage.jsx

import React, { useEffect, useState } from 'react';
import { useGamificationStats } from '../hooks/useGamification';
import { useTheme } from '../contexts/ThemeContext';
import {
  Flame, Award, Target, Star, Trophy, Sparkles, CheckCircle, Clock,
  TrendingUp, Zap, Gift, Medal, Gem, Crown
} from 'lucide-react';

const allBadges = {
  FIRST_STEP: { icon: Star, label: 'First Step', color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30', description: 'Completed your first task', requirement: 'Complete 1 task', rarity: 'Common' },
  THREE_DAY_STREAK: { icon: Flame, label: '3‑Day Streak', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30', description: 'Maintained a 3‑day streak', requirement: 'Complete tasks for 3 days in a row', rarity: 'Common' },
  SEVEN_DAY_STREAK: { icon: Flame, label: '7‑Day Streak', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', description: 'Maintained a 7‑day streak', requirement: 'Complete tasks for 7 days in a row', rarity: 'Rare' },
  TASK_MASTER: { icon: Target, label: 'Task Master', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', description: 'Completed 10 tasks', requirement: 'Complete 10 tasks', rarity: 'Rare' },
  ROADMAP_FINISHER: { icon: Trophy, label: 'Roadmap Finisher', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30', description: 'Completed a full roadmap', requirement: 'Complete all tasks in any roadmap', rarity: 'Epic' },
};

function AchievementsPage() {
  const { theme } = useTheme();
  const { data: stats, isLoading, isError, refetch } = useGamificationStats();
  const [animatedValues, setAnimatedValues] = useState({ streak: 0, longestStreak: 0, tasks: 0 });
  const [newBadgeEarned, setNewBadgeEarned] = useState(null);

  useEffect(() => {
    if (stats) {
      // Animate numbers
      const duration = 800;
      const steps = 30;
      const stepDuration = duration / steps;
      let step = 0;
      const interval = setInterval(() => {
        step++;
        setAnimatedValues({
          streak: Math.min(stats.currentStreak, Math.floor((stats.currentStreak * step) / steps)),
          longestStreak: Math.min(stats.longestStreak, Math.floor((stats.longestStreak * step) / steps)),
          tasks: Math.min(stats.totalTasksCompleted, Math.floor((stats.totalTasksCompleted * step) / steps)),
        });
        if (step >= steps) clearInterval(interval);
      }, stepDuration);
      return () => clearInterval(interval);
    }
  }, [stats]);

  // Check for newly earned badges
  useEffect(() => {
    if (stats?.badges?.length) {
      const previousBadges = JSON.parse(localStorage.getItem('previousBadges') || '[]');
      const newBadge = stats.badges.find(b => !previousBadges.includes(b));
      if (newBadge) {
        setNewBadgeEarned(newBadge);
        setTimeout(() => setNewBadgeEarned(null), 5000);
      }
      localStorage.setItem('previousBadges', JSON.stringify(stats.badges));
    }
  }, [stats]);

  const isDarkMode = theme === 'dark';
  const colors = {
    background: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    cardBg: isDarkMode ? 'bg-gray-800/60 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md',
    cardBorder: isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50',
    textPrimary: isDarkMode ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-gray-300' : 'text-gray-600',
  };

  // ========== ELEGANT LOADER (same as ProfilePage) ==========
  if (isLoading) {
    return (
      <div className={`min-h-screen w-full ${colors.background} flex flex-col items-center justify-center p-4 transition-all duration-500`}>
        <Sparkles size={80} className="text-purple-500 dark:text-teal-300 animate-pulse-slow mb-6" />
        <p className="text-2xl font-poppins font-semibold text-gray-700 dark:text-gray-200">Loading your achievements...</p>
        <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-gradient-to-r from-purple-500 to-teal-500 animate-pulse-fast"></div>
        </div>
        <style>{`
          @keyframes pulse-slow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes pulse-fast {
            0%, 100% { transform: translateX(-100%); }
            50% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          .animate-pulse-slow {
            animation: pulse-slow 2s ease-in-out infinite;
          }
          .animate-pulse-fast {
            animation: pulse-fast 1.5s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  // ========== ERROR STATE ==========
  if (isError || !stats) {
    return (
      <div className={`min-h-screen ${colors.background} flex items-center justify-center p-4`}>
        <div className="text-center text-red-500 space-y-4">
          <p>Failed to load achievements.</p>
          <button onClick={() => refetch()} className="px-4 py-2 rounded-full bg-purple-500 text-white hover:bg-purple-600 transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const earnedBadges = stats.badges || [];
  const earnedCount = earnedBadges.length;
  const totalBadges = Object.keys(allBadges).length;
  const completionPercent = (earnedCount / totalBadges) * 100;

  // Determine next badge
  let nextBadge = null;
  if (!earnedBadges.includes('FIRST_STEP') && stats.totalTasksCompleted >= 1) nextBadge = 'FIRST_STEP';
  else if (!earnedBadges.includes('THREE_DAY_STREAK') && stats.currentStreak >= 3) nextBadge = 'THREE_DAY_STREAK';
  else if (!earnedBadges.includes('SEVEN_DAY_STREAK') && stats.currentStreak >= 7) nextBadge = 'SEVEN_DAY_STREAK';
  else if (!earnedBadges.includes('TASK_MASTER') && stats.totalTasksCompleted >= 10) nextBadge = 'TASK_MASTER';
  else if (!earnedBadges.includes('ROADMAP_FINISHER') && stats.totalTasksCompleted > 0) nextBadge = 'ROADMAP_FINISHER';

  const nextBadgeInfo = nextBadge ? allBadges[nextBadge] : null;
  const NextBadgeIcon = nextBadgeInfo?.icon || Award;

  return (
    <div className={`min-h-screen w-full ${colors.background} ${colors.textPrimary} transition-colors duration-300 relative p-4 sm:p-6`}>
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-teal-500/5" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
      </div>

      {/* Floating Icons */}
      <div className="absolute top-32 left-5 opacity-30 animate-float hidden lg:block">
        <Trophy size={32} className="text-purple-400" />
      </div>
      <div className="absolute bottom-32 right-10 opacity-30 animate-float-delayed hidden lg:block">
        <Flame size={32} className="text-orange-400" />
      </div>

      {/* New Badge Toast */}
      {newBadgeEarned && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right-5 fade-in duration-500">
          <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
            <Sparkles className="w-5 h-5" />
            <div>
              <p className="font-semibold">New Badge Unlocked!</p>
              <p className="text-sm opacity-90">{allBadges[newBadgeEarned]?.label}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto relative z-10 space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 mb-4">
            <Award className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-poppins font-bold bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
            Your Achievements
          </h1>
          <p className={`text-sm ${colors.textSecondary} mt-2`}>Track your progress and earn badges</p>
        </div>

        {/* Streak & Stats Card */}
        <div className={`rounded-2xl ${colors.cardBg} border ${colors.cardBorder} shadow-xl backdrop-blur-sm overflow-hidden`}>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Current Streak */}
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Flame className="text-orange-500 w-5 h-5" />
                  <h2 className="text-lg font-semibold">Current Streak</h2>
                </div>
                <p className="text-4xl font-bold mt-2 bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  {animatedValues.streak}
                </p>
                <p className="text-xs text-gray-500 mt-1">days</p>
              </div>

              {/* Longest Streak */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="text-teal-400 w-5 h-5" />
                  <h2 className="text-lg font-semibold">Longest Streak</h2>
                </div>
                <p className="text-3xl font-bold mt-2">{animatedValues.longestStreak}</p>
                <p className="text-xs text-gray-500 mt-1">days</p>
              </div>

              {/* Total Tasks */}
              <div className="text-center md:text-right">
                <div className="flex items-center justify-center md:justify-end gap-2">
                  <Target className="text-blue-400 w-5 h-5" />
                  <h2 className="text-lg font-semibold">Tasks Completed</h2>
                </div>
                <p className="text-3xl font-bold mt-2">{animatedValues.tasks}</p>
                <p className="text-xs text-gray-500 mt-1">total</p>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Badge Collection</span>
                <span>{earnedCount} / {totalBadges}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-teal-500 h-2.5 rounded-full transition-all duration-700"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>

            {/* Next Badge Teaser */}
            {nextBadgeInfo && (
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-100/50 to-teal-100/50 dark:from-purple-900/30 dark:to-teal-900/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-200 dark:bg-purple-800/50">
                    <NextBadgeIcon size={24} className="text-purple-600 dark:text-purple-300" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Next Badge: {nextBadgeInfo.label}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{nextBadgeInfo.requirement}</p>
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-teal-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${(earnedCount / (Object.keys(allBadges).indexOf(nextBadge) + 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Badges Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Medal size={20} className="text-purple-400" />
            All Badges
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.entries(allBadges).map(([key, badge]) => {
              const earned = earnedBadges.includes(key);
              const Icon = badge.icon;
              return (
                <div
                  key={key}
                  className={`group p-4 rounded-2xl transition-all duration-300 ${
                    earned ? badge.bg : 'bg-gray-100/50 dark:bg-gray-800/30 opacity-70'
                  } border ${earned ? 'border-purple-300 dark:border-purple-700 shadow-md' : 'border-gray-200 dark:border-gray-700'} hover:scale-[1.02] hover:shadow-xl`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl ${earned ? badge.bg : 'bg-gray-200 dark:bg-gray-700'} transition-colors`}>
                      <Icon size={28} className={`${badge.color} ${earned ? '' : 'opacity-40'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{badge.label}</h3>
                        {earned && <CheckCircle size={16} className="text-green-500" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{badge.description}</p>
                      {!earned && (
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                          <Clock size={10} /> {badge.requirement}
                        </p>
                      )}
                      {earned && (
                        <div className="mt-2 inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <Sparkles size={10} /> Earned
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Motivational Quote */}
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 italic">
            <Gem size={14} />
            Keep completing tasks to unlock more badges and extend your streak!
            <Gem size={14} />
          </div>
        </div>
      </div>

      {/* Global animations */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.05); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes slide-in-from-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 6s ease-in-out infinite;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 4s ease-in-out infinite 2s;
        }
        .animate-in {
          animation-duration: 0.5s;
          animation-fill-mode: both;
        }
        .slide-in-from-right-5 {
          animation-name: slide-in-from-right;
        }
        .fade-in {
          animation-name: fadeIn;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}

export default AchievementsPage;