// src/components/TodayDashboard.jsx

import React from 'react';
import TodaysReflection from './TodaysReflection';
import DailyEmotionSnapshot from './DailyEmotionSnapshot';
import JournalHistory from './JournalHistory';
import { SkeletonCard } from './Skeleton';
import { useTheme } from '../contexts/ThemeContext';
import { Calendar, PenLine } from 'lucide-react';

function TodayDashboard({ todayEntries, isLoading }) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Glass-morphic card styles
  const cardBg = isDarkMode ? 'bg-gray-800/60 backdrop-blur-md' : 'bg-white/70 backdrop-blur-md';
  const cardBorder = isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50';
  const textPrimary = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-300' : 'text-gray-600';

  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full">
          <div className={`p-6 rounded-2xl ${cardBg} border ${cardBorder} shadow-lg animate-pulse`}>
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-4" />
            <div className="h-20 bg-gray-300 dark:bg-gray-700 rounded w-full" />
          </div>
          <div className={`p-6 rounded-2xl ${cardBg} border ${cardBorder} shadow-lg animate-pulse`}>
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-4" />
            <div className="h-32 bg-gray-300 dark:bg-gray-700 rounded w-full" />
          </div>
        </div>
        <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6 transition-all duration-500 w-full`}>
          <div className="flex items-center justify-center gap-2 mb-4">
            <PenLine size={20} className={textSecondary} />
            <h3 className="text-xl font-poppins font-semibold text-center">All Today's Entries</h3>
          </div>
          <SkeletonCard count={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full">
        <TodaysReflection todayEntries={todayEntries} />
        <DailyEmotionSnapshot todayEntries={todayEntries} />
      </div>

      {todayEntries.length > 0 ? (
        <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg p-4 sm:p-6 transition-all duration-500 hover:shadow-xl w-full`}>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Calendar size={20} className={textSecondary} />
            <h3 className="text-xl font-poppins font-semibold text-center">All Today's Entries</h3>
          </div>
          <JournalHistory entries={todayEntries} isLoading={isLoading} />
        </div>
      ) : (
        <div className={`p-8 rounded-2xl ${cardBg} border ${cardBorder} shadow-lg transition-all duration-500 w-full
                        flex flex-col items-center justify-center text-center min-h-[200px]`}>
          <PenLine size={40} className={`${textSecondary} mb-3 opacity-50`} />
          <p className={`font-inter text-lg ${textSecondary}`}>
            No entries recorded for today yet.
          </p>
          <p className={`text-sm ${textSecondary} mt-1`}>Start journaling to see your reflections!</p>
        </div>
      )}
    </div>
  );
}

export default TodayDashboard;