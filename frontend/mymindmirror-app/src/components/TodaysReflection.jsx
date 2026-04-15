// src/components/TodaysReflection.jsx

import React from 'react';
import { format } from 'date-fns';
import { useTodaysReflection } from '../hooks/useJournalData';
import { RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

function TodaysReflection({ todayEntries }) {
  const {
    data: reflection,
    isLoading,
    isError,
    error,
    refresh,
    isRefetching,
  } = useTodaysReflection(todayEntries);

  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Theme-based glass styles
  const cardBg = isDarkMode ? 'bg-gray-800/60 backdrop-blur-md' : 'bg-white/70 backdrop-blur-md';
  const cardBorder = isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50';
  const textPrimary = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const accentColor = isDarkMode ? 'text-[#B399D4]' : 'text-[#5CC8C2]';
  const errorColor = isDarkMode ? 'text-red-300' : 'text-red-700';
  const buttonHover = isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-200/50';

  const handleRefresh = () => refresh();

  // Skeleton loader component
  const SkeletonLoader = () => (
    <div className="animate-pulse space-y-3">
      <div className="flex justify-between items-start">
        <div className="h-7 bg-gray-300 dark:bg-gray-700 rounded w-40" />
        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6" />
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-4/5" />
      </div>
    </div>
  );

  // No entries state
  if (!todayEntries || todayEntries.length === 0) {
    return (
      <div className={`p-6 rounded-2xl ${cardBg} border ${cardBorder} shadow-lg backdrop-blur-sm transition-all duration-300`}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={24} className={accentColor} />
          <h3 className={`text-2xl font-poppins font-semibold ${accentColor}`}>
            Today's Reflection
          </h3>
        </div>
        <p className={`font-playfair italic text-lg ${textSecondary}`}>
          "Journal an entry today to get your daily reflection!"
        </p>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-2xl ${cardBg} border ${cardBorder} shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={24} className={accentColor} />
          <h3 className={`text-2xl font-poppins font-semibold ${accentColor}`}>
            Today's Reflection
          </h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading || isRefetching}
          className={`p-2 rounded-full transition-all duration-300 ${buttonHover} focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50`}
          title="Regenerate reflection"
        >
          <RefreshCw
            size={18}
            className={`${isLoading || isRefetching ? 'animate-spin' : ''} ${textSecondary}`}
          />
        </button>
      </div>

      {(isLoading || isRefetching) ? (
        <SkeletonLoader />
      ) : isError ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle size={18} />
            <p className={`font-inter ${errorColor}`}>
              {error?.message || 'Failed to generate reflection.'}
            </p>
          </div>
          <p className={`text-sm ${textSecondary} mt-2 pl-6`}>
            Possible reasons: ML service offline, Gemini quota exceeded, or missing API key.
          </p>
          <button
            onClick={handleRefresh}
            className="mt-3 text-sm text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300 transition flex items-center gap-1"
          >
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute -top-2 -left-2 text-4xl text-purple-300/30 dark:text-purple-500/20">“</div>
          <p className={`font-playfair italic text-lg ${textPrimary} leading-relaxed pl-4`}>
            {reflection}
          </p>
          <div className="absolute -bottom-4 -right-2 text-4xl text-purple-300/30 dark:text-purple-500/20">”</div>
        </div>
      )}
    </div>
  );
}

export default TodaysReflection;