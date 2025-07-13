// src/components/TodayDashboard.js
import React from 'react';
import TodaysReflection from './TodaysReflection';
import DailyEmotionSnapshot from './DailyEmotionSnapshot';
import JournalHistory from './JournalHistory';

function TodayDashboard({ latestEntry, todayEntries, onEntryChange }) {
    return (
        <div className="space-y-6 sm:space-y-8 w-full"> {/* Added w-full here */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full"> {/* Added w-full here */}
                <TodaysReflection latestEntry={latestEntry} />
                <DailyEmotionSnapshot latestEntry={latestEntry} />
            </div>

            {todayEntries.length > 0 ? (
                <div className="bg-white/60 dark:bg-black/40 p-4 sm:p-6 rounded-lg shadow-inner transition-all duration-500 w-full"> {/* Added w-full here */}
                    <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">All Today's Entries</h3>
                    <JournalHistory entries={todayEntries} onEntryChange={onEntryChange} />
                </div>
            ) : (
                <div className="p-6 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner transition-all duration-500 w-full {/* Added w-full here */}
                                 flex items-center justify-center font-inter text-gray-700 dark:text-gray-300 min-h-[150px]">
                    No entries recorded for today yet. Start journaling!
                </div>
            )}
        </div>
    );
}

export default TodayDashboard;
