// src/components/TodayDashboard.js
import React from 'react';
import TodaysReflection from './TodaysReflection';
import DailyEmotionSnapshot from './DailyEmotionSnapshot';
import JournalHistory from './JournalHistory'; // Assuming JournalHistory handles its own mutations now

// ⭐ MODIFIED: Removed onEntryChange prop ⭐
function TodayDashboard({ latestEntry, todayEntries }) {
    return (
        <div className="space-y-6 sm:space-y-8 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full">
                <TodaysReflection latestEntry={latestEntry} />
                <DailyEmotionSnapshot latestEntry={latestEntry} />
            </div>

            {todayEntries.length > 0 ? (
                <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full">
                    <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">All Today's Entries</h3>
                    {/* ⭐ MODIFIED: Removed onEntryChange prop from JournalHistory ⭐ */}
                    <JournalHistory entries={todayEntries} />
                </div>
            ) : (
                <div className="p-6 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner transition-all duration-500 w-full
                                 flex items-center justify-center font-inter text-gray-700 dark:text-gray-300 min-h-[150px]">
                    No entries recorded for today yet. Start journaling!
                </div>
            )}
        </div>
    );
}

export default TodayDashboard;
