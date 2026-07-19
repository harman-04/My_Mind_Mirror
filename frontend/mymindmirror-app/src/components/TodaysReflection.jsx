// src/components/TodaysReflection.jsx
import React from 'react';
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
  const cardBg = isDarkMode ? 'bg-[#1A162F]/60 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl';
  const cardBorder = isDarkMode ? 'border-white/10' : 'border-white/50';
  const textPrimary = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-500';

  // 💡 FIX: Purple in Light Mode, Teal in Dark Mode
  const accentColor = isDarkMode ? 'text-teal-400' : 'text-purple-600';

  const errorColor = isDarkMode ? 'text-red-300' : 'text-red-700';
  const buttonHover = isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-200/50';

  const handleRefresh = () => refresh();

  // Premium Skeleton loader component
  const SkeletonLoader = () => (
    <div className="animate-pulse space-y-3 lg:space-y-4 w-full px-2">
      <div className="h-4 lg:h-5 bg-gray-300 dark:bg-gray-700/50 rounded-full w-full" />
      <div className="h-4 lg:h-5 bg-gray-300 dark:bg-gray-700/50 rounded-full w-[90%]" />
      <div className="h-4 lg:h-5 bg-gray-300 dark:bg-gray-700/50 rounded-full w-[75%]" />
      <div className="h-4 lg:h-5 bg-gray-300 dark:bg-gray-700/50 rounded-full w-[40%]" />
    </div>
  );

  // No entries state
  if (!todayEntries || todayEntries.length === 0) {
    return (
      <div className={`p-5 sm:p-6 lg:p-8 rounded-2xl lg:rounded-3xl ${cardBg} border ${cardBorder} shadow-lg ring-1 ring-black/5 dark:ring-white/5 transition-all duration-300 flex flex-col h-full`}>
        <div className="flex items-center gap-2.5 mb-4 lg:mb-6">
          <Sparkles className={`w-5 h-5 lg:w-6 lg:h-6 ${accentColor}`} />
          <h3 className={`text-xl lg:text-2xl font-poppins font-bold ${accentColor} tracking-tight`}>
            Today's Reflection
          </h3>
        </div>
        <div className="flex-grow flex flex-col justify-center items-center text-center">
          <p className={`font-playfair italic text-base lg:text-lg ${textSecondary} max-w-[80%]`}>
            "Log an entry today to generate your personalized AI reflection."
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-5 sm:p-6 lg:p-8 rounded-2xl lg:rounded-3xl ${cardBg} border ${cardBorder} shadow-lg ring-1 ring-black/5 dark:ring-white/5 transition-all duration-300 group flex flex-col h-full`}>

      {/* Header */}
      <div className="flex justify-between items-start mb-4 lg:mb-6">
        <div className="flex items-center gap-2.5">
          <Sparkles className={`w-5 h-5 lg:w-6 lg:h-6 ${accentColor}`} />
          <h3 className={`text-xl lg:text-2xl font-poppins font-bold ${accentColor} tracking-tight`}>
            Today's Reflection
          </h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading || isRefetching}
          className={`p-2 lg:p-2.5 rounded-full transition-all duration-300 ${buttonHover} focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 hover:shadow-md`}
          title="Regenerate reflection"
        >
          <RefreshCw
            className={`w-4 h-4 lg:w-5 lg:h-5 ${isLoading || isRefetching ? `animate-spin ${accentColor}` : textSecondary}`}
          />
        </button>
      </div>

      {/* Body Content - flex-grow ensures perfect vertical centering */}
      <div className="flex-grow flex flex-col justify-center w-full">
        {(isLoading || isRefetching) ? (
          <SkeletonLoader />
        ) : isError ? (
          <div className="space-y-3 bg-red-50 dark:bg-red-500/10 p-4 rounded-xl border border-red-200 dark:border-red-500/20">
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle size={18} className="shrink-0" />
              <p className={`font-inter text-sm lg:text-base font-medium ${errorColor}`}>
                {error?.message || 'Failed to generate reflection.'}
              </p>
            </div>
            <p className={`text-xs lg:text-sm ${textSecondary} pl-6`}>
              Possible reasons: ML service offline, Gemini quota exceeded, or missing API key.
            </p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-sm font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors flex items-center gap-1.5 pl-6"
            >
              <RefreshCw size={14} /> Try generating again
            </button>
          </div>
        ) : (
          /* Decorative Quote Text */
          <div className="relative px-4 lg:px-6 py-2">
            <div className={`absolute -top-4 -left-1 lg:-left-2 text-5xl lg:text-6xl ${isDarkMode ? 'text-teal-400/15' : 'text-purple-500/10'} font-serif leading-none select-none`}>“</div>
            <p className={`font-playfair italic text-base sm:text-lg lg:text-xl ${textPrimary} leading-relaxed lg:leading-loose text-center sm:text-left relative z-10`}>
              {reflection}
            </p>
            <div className={`absolute -bottom-6 -right-1 lg:-right-2 text-5xl lg:text-6xl ${isDarkMode ? 'text-teal-400/15' : 'text-purple-500/10'} font-serif leading-none select-none`}>”</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(TodaysReflection);