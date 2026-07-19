// src/pages/AchievementsPage.jsx
import React, { useEffect, useState } from 'react';
import { useGamificationStats } from '../hooks/useGamification';
import { useTheme } from '../contexts/ThemeContext';
import {
  Flame, Award, Target, Star, Trophy, Sparkles, CheckCircle, Clock,
  TrendingUp, Zap, Medal, Gem, Crown, BookOpen, CalendarCheck, BrainCircuit, Shield, Eye, Map, Compass, Search
} from 'lucide-react';

const allBadges = {
  // Task Badges
  FIRST_STEP: { icon: Star, label: 'First Step', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50', description: 'Completed your first task', requirement: 'Complete 1 task', rarity: 'Common' },
  TASK_MASTER: { icon: Target, label: 'Task Master', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50', description: 'Completed 10 tasks', requirement: 'Complete 10 tasks', rarity: 'Rare' },
  PRODUCTIVITY_NINJA: { icon: Zap, label: 'Productivity Ninja', color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/50', description: 'Crushed 50 tasks', requirement: 'Complete 50 tasks', rarity: 'Epic' },

  // Journaling Badges
  FIRST_THOUGHT: { icon: BookOpen, label: 'First Thought', color: 'text-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800/50', description: 'Wrote your first journal entry', requirement: 'Write 1 journal entry', rarity: 'Common' },
  REFLECTIVE_SOUL: { icon: BrainCircuit, label: 'Reflective Soul', color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800/50', description: 'Logged 5 journal entries', requirement: 'Write 5 journal entries', rarity: 'Rare' },

  // AI & Schedule Badges
  TIME_LORD: { icon: CalendarCheck, label: 'Time Lord', color: 'text-fuchsia-500', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 border-fuchsia-200 dark:border-fuchsia-800/50', description: 'Used AI to generate a Smart Timetable', requirement: 'Generate 1 Smart Schedule', rarity: 'Common' },
  FIRST_CHAT: { icon: Sparkles, label: 'First Chat', color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800/50', description: 'Talked to the AI Coach', requirement: 'Send 1 chat message', rarity: 'Common' },
  AI_WHISPERER: { icon: Sparkles, label: 'AI Whisperer', color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800/50', description: 'Talked to the AI Coach 20 times', requirement: 'Send 20 chat messages', rarity: 'Epic' },

  // Advanced Feature Badges
  VISIONARY: { icon: Eye, label: 'Visionary', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50', description: 'Created your first Milestone', requirement: 'Create 1 Milestone', rarity: 'Common' },
  ARCHITECT: { icon: Map, label: 'Architect', color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/50', description: 'Generated your first AI Roadmap', requirement: 'Generate 1 Roadmap', rarity: 'Rare' },
  INTROSPECTIVE: { icon: Compass, label: 'Introspective', color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/50', description: 'Generated an AI Daily Reflection', requirement: 'Generate 1 Reflection', rarity: 'Common' },
  DEEP_DIVER: { icon: Search, label: 'Deep Diver', color: 'text-sky-500', bg: 'bg-sky-100 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800/50', description: 'Used AI to elaborate on a task', requirement: 'Elaborate 1 Task', rarity: 'Rare' },

  // Streak & Final Badges
  THREE_DAY_STREAK: { icon: Flame, label: '3‑Day Streak', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800/50', description: 'Maintained a 3‑day streak', requirement: 'Complete any activity 3 days in a row', rarity: 'Common' },
  SEVEN_DAY_STREAK: { icon: Flame, label: '7‑Day Streak', color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800/50', description: 'Maintained a 7‑day streak', requirement: 'Complete any activity 7 days in a row', rarity: 'Rare' },
  THIRTY_DAY_LEGEND: { icon: Crown, label: '30‑Day Legend', color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800/50', description: 'Maintained a 30‑day streak', requirement: 'Complete any activity 30 days in a row', rarity: 'Legendary' },

  ROADMAP_FINISHER: { icon: Trophy, label: 'Roadmap Finisher', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800/50', description: 'Completed a full roadmap', requirement: 'Complete all tasks in any roadmap', rarity: 'Epic' },
};

const XP_PER_LEVEL = 500;

function AchievementsPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const { data: stats, isLoading, isError, refetch } = useGamificationStats();

  const [animatedValues, setAnimatedValues] = useState({
    streak: 0, longestStreak: 0, tasks: 0, xp: 0, journals: 0, chats: 0
  });
  const [newBadgeEarned, setNewBadgeEarned] = useState(null);

  useEffect(() => {
    if (stats) {
      const duration = 1000;
      const steps = 40;
      const stepDuration = duration / steps;
      let step = 0;
      const interval = setInterval(() => {
        step++;
        setAnimatedValues({
          streak: Math.min(stats.currentStreak, Math.floor((stats.currentStreak * step) / steps)),
          longestStreak: Math.min(stats.longestStreak, Math.floor((stats.longestStreak * step) / steps)),
          tasks: Math.min(stats.totalTasksCompleted, Math.floor((stats.totalTasksCompleted * step) / steps)),
          xp: Math.min(stats.experiencePoints, Math.floor((stats.experiencePoints * step) / steps)),
          journals: Math.min(stats.totalJournalEntries, Math.floor((stats.totalJournalEntries * step) / steps)),
          chats: Math.min(stats.totalChats, Math.floor((stats.totalChats * step) / steps)),
        });
        if (step >= steps) clearInterval(interval);
      }, stepDuration);
      return () => clearInterval(interval);
    }
  }, [stats]);

  useEffect(() => {
    if (stats?.badges?.length) {
      const previousBadges = JSON.parse(localStorage.getItem('previousBadges') || '[]');
      const newBadge = stats.badges.find(b => !previousBadges.includes(b));
      if (newBadge) {
        setNewBadgeEarned(newBadge);
        setTimeout(() => setNewBadgeEarned(null), 6000);
      }
      localStorage.setItem('previousBadges', JSON.stringify(stats.badges));
    }
  }, [stats]);

  const { earnedBadges, earnedCount, totalBadges, completionPercent, nextBadgeInfo } = React.useMemo(() => {
    if (!stats) return { earnedBadges: [], earnedCount: 0, totalBadges: 1, completionPercent: 0, nextBadgeInfo: null };

    const earned = stats.badges || [];
    const total = Object.keys(allBadges).length;

    const unearned = Object.keys(allBadges).filter(b => !earned.includes(b));
    const nextKey = unearned.length > 0 ? unearned[0] : null;

    return {
      earnedBadges: earned,
      earnedCount: earned.length,
      totalBadges: total,
      completionPercent: (earned.length / total) * 100,
      nextBadgeInfo: nextKey ? allBadges[nextKey] : null
    };
  }, [stats]);

  if (isLoading) {
    return (
      <div className="w-full flex-grow flex items-center justify-center p-4">
        <div className="text-center">
            <Sparkles className="w-16 h-16 lg:w-20 lg:h-20 text-purple-500 dark:text-teal-400 mx-auto animate-pulse-slow mb-6" />
            <p className="text-xl lg:text-2xl font-poppins font-bold text-gray-800 dark:text-gray-100 tracking-tight">Loading your achievements...</p>
            <div className="w-64 h-2 bg-gray-200 dark:bg-[#131127] rounded-full overflow-hidden mt-6 mx-auto">
            <div className="h-full bg-gradient-to-r from-purple-500 to-teal-500 animate-pulse-fast"></div>
            </div>
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="w-full flex-grow flex items-center justify-center p-4">
        <div className="text-center text-red-500 space-y-4">
          <p className="font-bold text-lg">Failed to load achievements.</p>
          <button onClick={() => refetch()} className="px-6 py-2.5 rounded-full bg-purple-500 hover:bg-purple-600 text-white font-bold transition shadow-md">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const level = stats.level || 1;
  const currentLevelXP = animatedValues.xp % XP_PER_LEVEL;
  const levelProgressPercent = (currentLevelXP / XP_PER_LEVEL) * 100;
  const NextBadgeIcon = nextBadgeInfo?.icon || Award;

  // Premium Glassmorphism Sync
  const mainWrapperBg = isDarkMode ? 'bg-[#1A162F]/40 border-white/10' : 'bg-white/40 border-white/50';
  const cardBg = isDarkMode ? 'bg-[#131127]/60 border-white/5' : 'bg-white/60 border-gray-200/50';

  return (
    <div className="w-full flex-grow flex flex-col relative">

      {/* Subtle Local Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[5%] w-[40vw] h-[40vw] bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[10%] right-[5%] w-[40vw] h-[40vw] bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="absolute top-32 left-5 lg:left-10 opacity-20 animate-float hidden lg:block pointer-events-none z-0">
        <Shield className="w-10 h-10 lg:w-16 lg:h-16 text-purple-400" />
      </div>
      <div className="absolute bottom-32 right-5 lg:right-10 opacity-20 animate-float-delayed hidden lg:block pointer-events-none z-0">
        <Flame className="w-10 h-10 lg:w-16 lg:h-16 text-orange-400" />
      </div>

      {newBadgeEarned && (
        <div className="fixed top-20 lg:top-24 right-4 lg:right-8 z-50 animate-in slide-in-from-right-5 fade-in duration-500">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4 rounded-2xl lg:rounded-3xl shadow-2xl flex items-center gap-4 border border-white/20">
            <Sparkles className="w-8 h-8 lg:w-10 lg:h-10 animate-pulse" />
            <div>
              <p className="font-poppins font-extrabold text-lg lg:text-xl leading-tight tracking-tight">Badge Unlocked!</p>
              <p className="text-sm lg:text-base font-bold opacity-90">{allBadges[newBadgeEarned]?.label}</p>
            </div>
          </div>
        </div>
      )}

      {/* 💡 Main Wrapper aligned with JournalPage */}
      <main className={`relative w-full max-w-7xl mx-auto flex-grow p-4 sm:p-6 lg:p-8 xl:p-10 rounded-[2rem] lg:rounded-[2.5rem] ${mainWrapperBg} border shadow-2xl backdrop-blur-xl flex flex-col space-y-8 lg:space-y-12 z-10`}>

        <div className="text-center pt-4 lg:pt-6">
          <div className="inline-flex p-3 lg:p-4 rounded-2xl lg:rounded-3xl bg-gradient-to-br from-purple-500/20 to-teal-500/20 dark:from-purple-900/30 dark:to-teal-900/30 mb-4 lg:mb-6 shadow-inner border border-purple-200/50 dark:border-teal-700/30">
            <Award className="w-8 h-8 lg:w-10 lg:h-10 text-purple-600 dark:text-teal-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-poppins font-extrabold bg-gradient-to-r from-purple-600 to-teal-600 dark:from-purple-400 dark:to-teal-400 bg-clip-text text-transparent tracking-tight">
            Growth & Achievements
          </h1>
          <p className="text-sm lg:text-base text-gray-500 dark:text-gray-400 mt-3 font-medium">Level up by journaling, planning, and executing tasks.</p>
        </div>

        {/* 🌟 HERO: Level & XP Card */}
        <div className={`rounded-3xl lg:rounded-[2rem] ${cardBg} border shadow-xl backdrop-blur-md overflow-hidden relative transition-all hover:shadow-2xl`}>
          <div className="absolute top-0 right-0 w-64 h-64 lg:w-96 lg:h-96 bg-gradient-to-bl from-purple-500/20 dark:from-teal-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="p-8 sm:p-10 lg:p-12 flex flex-col md:flex-row items-center gap-8 lg:gap-12 relative z-10">

            <div className="relative flex-shrink-0 flex items-center justify-center w-32 h-32 lg:w-40 lg:h-40 rounded-full bg-gradient-to-br from-purple-50 to-teal-50 dark:from-[#131127] dark:to-[#1A162F] border-4 border-white dark:border-white/5 shadow-2xl">
              <div className="absolute inset-0 rounded-full border-4 border-transparent bg-gradient-to-br from-purple-500 to-teal-400 mask-border animate-spin-slow opacity-50" />
              <div className="text-center z-10">
                <p className="text-[10px] lg:text-xs font-bold tracking-widest text-purple-600 dark:text-teal-400 uppercase mb-1">Level</p>
                <p className="text-5xl lg:text-6xl font-poppins font-black bg-gradient-to-br from-purple-600 to-teal-600 dark:from-purple-400 dark:to-teal-400 bg-clip-text text-transparent leading-none drop-shadow-sm">
                  {level}
                </p>
              </div>
            </div>

            <div className="flex-1 w-full text-center md:text-left">
              <h2 className="text-2xl lg:text-3xl font-poppins font-extrabold mb-3 text-gray-800 dark:text-gray-100 tracking-tight">Keep Growing!</h2>
              <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 mb-6 lg:mb-8 max-w-xl leading-relaxed">
                You are currently a <strong className="text-purple-600 dark:text-teal-400">Level {level}</strong> Achiever. Earn XP by completing tasks, writing journal entries, and exploring your AI insights.
              </p>

              <div className="relative max-w-2xl">
                <div className="flex justify-between items-end mb-2.5 px-1">
                  <span className="text-sm lg:text-base font-bold text-purple-700 dark:text-teal-400">
                    {Math.floor(animatedValues.xp)} Total XP
                  </span>
                  <span className="text-[10px] lg:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    {Math.floor(currentLevelXP)} / {XP_PER_LEVEL} XP to Next Level
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-[#131127] rounded-full h-3 lg:h-4 shadow-inner overflow-hidden border border-transparent dark:border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-teal-400 rounded-full shadow-[0_0_12px_rgba(20,184,166,0.6)] transition-all duration-1000 ease-out"
                    style={{ width: `${levelProgressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 📊 6-GRID: Holistic Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <StatCard icon={<Flame className="w-6 h-6 lg:w-8 lg:h-8 text-orange-500" />} title="Current Streak" value={animatedValues.streak} suffix="Days" cardBg={cardBg} />
          <StatCard icon={<TrendingUp className="w-6 h-6 lg:w-8 lg:h-8 text-teal-500" />} title="Longest Streak" value={animatedValues.longestStreak} suffix="Days" cardBg={cardBg} />
          <StatCard icon={<BookOpen className="w-6 h-6 lg:w-8 lg:h-8 text-cyan-500" />} title="Journal Entries" value={animatedValues.journals} suffix="Logged" cardBg={cardBg} />
          <StatCard icon={<Target className="w-6 h-6 lg:w-8 lg:h-8 text-blue-500" />} title="Tasks Finished" value={animatedValues.tasks} suffix="Done" cardBg={cardBg} />
          <StatCard icon={<BrainCircuit className="w-6 h-6 lg:w-8 lg:h-8 text-pink-500" />} title="AI Coaching" value={animatedValues.chats} suffix="Chats" cardBg={cardBg} />
          <StatCard icon={<CalendarCheck className="w-6 h-6 lg:w-8 lg:h-8 text-fuchsia-500" />} title="Schedules Built" value={stats.schedulesGenerated || 0} suffix="Generated" cardBg={cardBg} />
        </div>

        {/* 🏅 BADGE COLLECTION */}
        <div className={`rounded-3xl lg:rounded-[2rem] ${cardBg} border shadow-xl p-6 sm:p-8 lg:p-10`}>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 lg:mb-10 gap-6 border-b border-gray-200/50 dark:border-white/10 pb-6 lg:pb-8">
            <div>
              <h2 className="text-2xl lg:text-3xl font-poppins font-extrabold flex items-center gap-3 mb-2 text-gray-800 dark:text-gray-100 tracking-tight">
                <Medal className="w-8 h-8 lg:w-10 lg:h-10 text-purple-500 dark:text-teal-400" />
                Badge Collection
              </h2>
              <p className="text-sm lg:text-base text-gray-500 dark:text-gray-400 font-medium">Unlock these by exploring every feature of MyMindMirror.</p>
            </div>

            <div className="w-full md:w-72 shrink-0 bg-white/50 dark:bg-black/20 p-4 lg:p-5 rounded-2xl border border-gray-200/50 dark:border-white/5">
               <div className="flex justify-between text-xs lg:text-sm mb-2.5 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <span>Completion</span>
                  <span className="text-purple-600 dark:text-teal-400">{earnedCount} / {totalBadges}</span>
               </div>
               <div className="w-full bg-gray-200 dark:bg-[#131127] rounded-full h-2.5 lg:h-3 overflow-hidden shadow-inner border border-transparent dark:border-white/5">
                  <div className="bg-gradient-to-r from-purple-500 to-teal-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(20,184,166,0.5)]" style={{ width: `${completionPercent}%` }} />
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-6">
            {Object.entries(allBadges).map(([key, badge]) => {
              const earned = earnedBadges.includes(key);
              const Icon = badge.icon;
              return (
                <div
                  key={key}
                  className={`group relative p-5 lg:p-6 rounded-2xl lg:rounded-3xl transition-all duration-300 ${
                    earned
                        ? `${badge.bg} border shadow-sm hover:-translate-y-1 hover:shadow-lg`
                        : 'bg-gray-50 dark:bg-white/5 opacity-70 grayscale border border-gray-200/50 dark:border-white/5'
                  }`}
                >
                  <div className="absolute top-4 right-4 lg:top-5 lg:right-5 flex flex-col items-end gap-1.5">
                     {earned && <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-500 drop-shadow-sm" />}
                     <span className={`text-[9px] lg:text-[10px] uppercase font-bold tracking-widest ${earned ? badge.color : 'text-gray-400 dark:text-gray-500'}`}>
                        {badge.rarity}
                     </span>
                  </div>

                  <div className={`inline-flex p-3 lg:p-4 rounded-xl lg:rounded-2xl mb-4 lg:mb-5 ${earned ? 'bg-white/60 dark:bg-black/20 shadow-sm border border-white/40 dark:border-white/5' : 'bg-gray-200 dark:bg-gray-800'}`}>
                    <Icon className={`w-6 h-6 lg:w-8 lg:h-8 ${earned ? badge.color : 'text-gray-400'}`} />
                  </div>

                  <h3 className={`font-poppins font-extrabold text-lg lg:text-xl mb-1.5 tracking-tight ${earned ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    {badge.label}
                  </h3>
                  <p className={`text-xs lg:text-sm font-medium ${earned ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'} line-clamp-2 mb-4`}>
                    {badge.description}
                  </p>

                  {!earned && (
                    <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700 border-dashed">
                       <p className="text-[10px] lg:text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-500 flex items-center gap-1.5">
                         <Clock className="w-3 h-3 lg:w-3.5 lg:h-3.5" /> {badge.requirement}
                       </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {nextBadgeInfo && (
            <div className="mt-10 lg:mt-12 p-6 lg:p-8 rounded-2xl lg:rounded-3xl bg-gradient-to-r from-purple-50/80 to-teal-50/80 dark:from-purple-900/10 dark:to-teal-900/10 border border-purple-200/50 dark:border-teal-500/20 shadow-inner flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 lg:gap-6 text-center md:text-left">
                <div className="p-4 lg:p-5 rounded-2xl bg-white/60 dark:bg-black/20 shadow-sm border border-purple-200/50 dark:border-white/5">
                  <NextBadgeIcon className="w-8 h-8 lg:w-10 lg:h-10 text-purple-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-teal-500 mb-1">Closest Target</p>
                  <p className="font-poppins font-extrabold text-xl lg:text-2xl text-gray-800 dark:text-gray-100">Next Badge: {nextBadgeInfo.label}</p>
                </div>
              </div>
              <div className="bg-white/80 dark:bg-black/30 border border-gray-200/50 dark:border-white/10 px-5 py-3 lg:px-6 lg:py-4 rounded-xl lg:rounded-2xl shadow-sm text-sm lg:text-base font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-500" /> {nextBadgeInfo.requirement}
              </div>
            </div>
          )}
        </div>

        <div className="text-center pt-4 lg:pt-8 pb-4">
          <div className="inline-flex items-center gap-2 text-xs lg:text-sm font-bold text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-black/20 border border-gray-200/50 dark:border-white/5 px-6 py-3 lg:px-8 lg:py-4 rounded-full shadow-sm">
            <Gem className="w-4 h-4 lg:w-5 lg:h-5 text-purple-500 dark:text-teal-400" />
            "Every thought logged and task completed is a step toward your highest self."
            <Gem className="w-4 h-4 lg:w-5 lg:h-5 text-teal-500 dark:text-purple-400" />
          </div>
        </div>
      </main>

      <style>{`
        @keyframes pulse-slow { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.05); } }
        @keyframes float { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-15px) rotate(5deg); } }
        @keyframes slide-in-from-right { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float 6s ease-in-out infinite 3s; }
        .animate-spin-slow { animation: spin-slow 12s linear infinite; }
        .animate-in { animation-duration: 0.5s; animation-fill-mode: both; }
        .slide-in-from-right-5 { animation-name: slide-in-from-right; }
        .fade-in { animation-name: fadeIn; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .delay-1000 { animation-delay: 1s; }
        .mask-border { -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; }
      `}</style>
    </div>
  );
}

function StatCard({ icon, title, value, suffix, cardBg }) {
  return (
    <div className={`p-4 sm:p-5 lg:p-6 rounded-2xl lg:rounded-3xl ${cardBg} border border-gray-200/50 dark:border-white/5 shadow-md flex flex-col sm:flex-row items-center sm:items-start lg:items-center text-center sm:text-left gap-3 sm:gap-4 lg:gap-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group`}>
      <div className="p-3 lg:p-4 rounded-xl lg:rounded-2xl bg-white/60 dark:bg-black/20 shadow-sm border border-white/40 dark:border-white/5 shrink-0 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <p className="text-[10px] lg:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl sm:text-3xl lg:text-4xl font-poppins font-black text-gray-800 dark:text-gray-100 flex items-baseline justify-center sm:justify-start gap-1.5 tracking-tight">
          {value} <span className="text-[10px] lg:text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{suffix}</span>
        </p>
      </div>
    </div>
  );
}

export default AchievementsPage;