// src/components/TodayDashboard.jsx
import React from 'react';
import TodaysReflection from './TodaysReflection';
import DailyEmotionSnapshot from './DailyEmotionSnapshot';
import JournalHistory from './JournalHistory';
import { SkeletonCard } from './Skeleton';
import { useTheme } from '../contexts/ThemeContext';
import { Calendar, Sparkles } from 'lucide-react';

function TodayDashboard({ todayEntries, isLoading }) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // 💡 Premium Glassmorphism matching the new App Theme
  const cardBg = isDarkMode ? 'bg-[#1A162F]/60 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl';
  const cardBorder = isDarkMode ? 'border-white/10' : 'border-white/50';
  const baseCardClasses = `rounded-2xl lg:rounded-3xl ${cardBg} border ${cardBorder} shadow-lg ring-1 ring-black/5 dark:ring-white/5 transition-all duration-300 hover:shadow-xl`;

  // 🚀 Shared Header Component (Fully Responsive & Native Badge Support)
  const DashboardHeader = ({ icon: Icon, title, colorClass, badgeText }) => (
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 lg:mb-6 border-b border-gray-200/50 dark:border-gray-700/50 pb-4 lg:pb-5">
          <div className="flex items-center gap-3 lg:gap-4">
              <div className={`p-2 lg:p-3 rounded-xl lg:rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 dark:from-teal-900/40 dark:to-teal-800/20 text-purple-600 dark:text-teal-400 shrink-0 shadow-sm border border-purple-200/50 dark:border-teal-700/30 ${colorClass}`}>
                  <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <h3 className="text-lg lg:text-xl font-poppins font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">
                  {title}
              </h3>
          </div>
          {badgeText && (
              <div className="flex items-center gap-1.5 px-3 lg:px-4 py-1.5 lg:py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-full shadow-sm text-emerald-700 dark:text-emerald-300">
                  <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                      {badgeText}
                  </span>
              </div>
          )}
      </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 w-full">
          <div className={`p-4 sm:p-6 lg:p-8 ${baseCardClasses} animate-pulse`}>
            <div className="h-6 lg:h-8 bg-gray-300 dark:bg-gray-700/50 rounded-full w-1/2 mb-4 lg:mb-6" />
            <div className="h-24 lg:h-32 bg-gray-300 dark:bg-gray-700/50 rounded-xl lg:rounded-2xl w-full" />
          </div>
          <div className={`p-4 sm:p-6 lg:p-8 ${baseCardClasses} animate-pulse`}>
            <div className="h-6 lg:h-8 bg-gray-300 dark:bg-gray-700/50 rounded-full w-1/2 mb-4 lg:mb-6" />
            <div className="h-48 lg:h-56 bg-gray-300 dark:bg-gray-700/50 rounded-xl lg:rounded-2xl w-full" />
          </div>
        </div>
        <div className={`p-4 sm:p-6 lg:p-8 ${baseCardClasses}`}>
          <div className="h-6 lg:h-8 bg-gray-300 dark:bg-gray-700/50 rounded-full w-1/4 mb-6 lg:mb-8" />
          <SkeletonCard count={2} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full animate-fade-in">

      {/* Top Row: Reflection & Snapshot - Flex-grow enforces equal height stretching */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 w-full items-stretch">
        <div className="col-span-1 w-full flex flex-col [&>div]:h-full">
           <TodaysReflection todayEntries={todayEntries} />
        </div>
        <div className="col-span-1 w-full flex flex-col [&>div]:h-full">
           <DailyEmotionSnapshot todayEntries={todayEntries} />
        </div>
      </div>

      {/* Bottom Section: Today's History */}
      {todayEntries.length > 0 ? (
        <div className={`p-3 sm:p-6 lg:p-8 w-full flex flex-col ${baseCardClasses}`}>
          <DashboardHeader
            icon={Calendar}
            title="Today's Journal History"
            colorClass="text-emerald-500"
            badgeText={`${todayEntries.length} ${todayEntries.length === 1 ? 'Entry' : 'Entries'} Today`}
          />
          <div className="w-full">
             <JournalHistory entries={todayEntries} isLoading={isLoading} />
          </div>
        </div>
      ) : (
        <div className={`p-6 sm:p-8 lg:p-12 w-full flex flex-col items-center justify-center text-center min-h-[250px] sm:min-h-[280px] lg:min-h-[320px] ${baseCardClasses}`}>
          <div className="relative inline-flex p-4 lg:p-5 rounded-full bg-purple-500/10 mb-4 lg:mb-6">
              <div className="absolute inset-0 bg-purple-400/20 rounded-full blur-xl" />
              <Sparkles className="relative w-8 h-8 lg:w-12 lg:h-12 text-purple-500" />
          </div>
          <h3 className="text-lg sm:text-xl lg:text-2xl font-poppins font-extrabold text-gray-800 dark:text-gray-100 mb-2 tracking-tight">
            Your Canvas is Blank
          </h3>
          <p className="font-inter text-sm lg:text-base text-gray-600 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
            No entries recorded for today yet. Use the prompt above or just start typing to capture your thoughts!
          </p>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default React.memo(TodayDashboard);