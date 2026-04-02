import React from 'react';
import { format } from 'date-fns';
import { useTodaysReflection } from '../hooks/useJournalData';
import { RefreshCw } from 'lucide-react';

function TodaysReflection({ todayEntries }) {
  const {
    data: reflection,
    isLoading,
    isError,
    error,
    refresh,          // ← manual refresh function
    isRefetching,
  } = useTodaysReflection(todayEntries);

  const handleRefresh = () => {
    refresh();
  };

  if (!todayEntries || todayEntries.length === 0) {
    return (
      <div className="p-6 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner">
        <h3 className="text-2xl font-poppins font-semibold mb-3 text-[#5CC8C2] dark:text-[#B399D4]">
          Today's Reflection
        </h3>
        <p className="font-playfair italic text-lg text-gray-800 dark:text-gray-200">
          "Journal an entry today to get your daily reflection!"
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-2xl font-poppins font-semibold text-[#5CC8C2] dark:text-[#B399D4]">
          Today's Reflection
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading || isRefetching}
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          title="Regenerate reflection"
        >
          <RefreshCw size={18} className={isLoading || isRefetching ? 'animate-spin' : ''} />
        </button>
      </div>
      {isLoading || isRefetching ? (
        <p className="font-inter text-gray-700 dark:text-gray-300">Generating your reflection...</p>
      ) : isError ? (
        <div>
          <p className="font-inter text-[#FF8A7A]">
            {error?.message || 'Failed to generate reflection.'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Possible reasons: ML service offline, Gemini quota exceeded, or missing API key.
          </p>
        </div>
      ) : (
        <p className="font-playfair italic text-lg text-gray-800 dark:text-gray-200">
          "{reflection}"
        </p>
      )}
    </div>
  );
}

export default TodaysReflection;