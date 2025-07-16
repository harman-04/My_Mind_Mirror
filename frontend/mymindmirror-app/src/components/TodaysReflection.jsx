// src/components/TodaysReflection.jsx
import React from 'react';
// import { useState, useEffect } from 'react'; // No longer needed
// import axios from 'axios'; // No longer needed directly for this component
import { format } from 'date-fns';
import { useTodaysReflection } from '../hooks/useJournalData'; // Import the new hook

function TodaysReflection({ latestEntry }) {
  // Use the Tanstack Query hook
  const {
    data: reflection,
    isLoading,
    isError,
    error,
  } = useTodaysReflection(latestEntry);

  // The logic for "Journal an entry today..." is now handled inside useTodaysReflection's queryFn
  // and by the `enabled` option. If `latestEntry` is null, or not today's, the query won't run,
  // and `reflection` will be `undefined` initially. We handle the display fallback here.

  if (!latestEntry || format(new Date(), 'yyyy-MM-dd') !== latestEntry.entryDate) {
    return (
      <div className="p-6 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner transition-all duration-500">
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
    <div className="p-6 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner transition-all duration-500">
      <h3 className="text-2xl font-poppins font-semibold mb-3 text-[#5CC8C2] dark:text-[#B399D4]">
        Today's Reflection
      </h3>
      {isLoading ? (
        <p className="font-inter text-gray-700 dark:text-gray-300">Generating your reflection...</p>
      ) : isError ? (
        <p className="font-inter text-[#FF8A7A]">{error?.message || 'Failed to generate reflection.'}</p>
      ) : (
        <p className="font-playfair italic text-lg text-gray-800 dark:text-gray-200">
          "{reflection}"
        </p>
      )}
    </div>
  );
}

export default TodaysReflection;
