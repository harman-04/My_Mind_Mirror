// src/components/MoodCalendarHeatmap.jsx
import React, { useRef, useMemo } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import {
  format,
  parseISO,
  startOfYear,
  endOfYear,
  subDays,
  eachDayOfInterval,
  isSameDay,
  getDay,
  startOfWeek,
  endOfWeek,
  subWeeks,
  addWeeks,
} from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import DownloadChartButton from './DownloadChartButton';
import { Calendar, Activity } from 'lucide-react';

const MoodCalendarHeatmap = ({ journalEntries, displayYear = new Date() }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const chartContainerRef = useRef(null);

  // Improved mood colour palette – intuitive and accessible
  const moodColors = {
    light: {
      veryNegative: '#EF4444', // red-500
      negative: '#F97316',     // orange-500
      neutral: '#9CA3AF',      // gray-400
      positive: '#10B981',     // emerald-500
      veryPositive: '#3B82F6', // blue-500
      empty: '#E5E7EB',        // gray-200 (more visible than before)
      text: '#1F2937',
      secondaryText: '#6B7280',
      background: '#FFFFFF',
    },
    dark: {
      veryNegative: '#DC2626', // red-600
      negative: '#EA580C',     // orange-600
      neutral: '#6B7280',      // gray-500
      positive: '#059669',     // emerald-600
      veryPositive: '#2563EB', // blue-600
      empty: '#374151',        // gray-700 (clearly visible on dark background)
      text: '#F3F4F6',
      secondaryText: '#9CA3AF',
      background: '#111827',
    },
  };

  const currentColors = isDarkMode ? moodColors.dark : moodColors.light;

  // Aggregate mood scores per date (average if multiple entries per day)
  const dailyMoods = useMemo(() => {
    const map = {};
    if (journalEntries && Array.isArray(journalEntries)) {
      journalEntries.forEach((entry) => {
        if (entry.moodScore !== null && entry.moodScore !== undefined) {
          const dateKey = format(parseISO(entry.entryDate), 'yyyy-MM-dd');
          if (!map[dateKey]) map[dateKey] = { sum: 0, count: 0 };
          map[dateKey].sum += entry.moodScore;
          map[dateKey].count++;
        }
      });
    }
    return map;
  }, [journalEntries]);

  const values = useMemo(() => {
    return Object.keys(dailyMoods).map((dateKey) => {
      const { sum, count } = dailyMoods[dateKey];
      return {
        date: dateKey,
        count: count > 0 ? sum / count : null,
      };
    });
  }, [dailyMoods]);

  const getClassForValue = (value) => {
    if (!value || value.count === null) return 'color-empty';
    const mood = value.count;
    if (mood >= 0.7) return 'color-very-positive';
    if (mood >= 0.3) return 'color-positive';
    if (mood > -0.3) return 'color-neutral';
    if (mood > -0.7) return 'color-negative';
    return 'color-very-negative';
  };

  // Subtract 1 day because the library's startDate is exclusive
  const startDate = subDays(startOfYear(displayYear), 1);
  const endDate = endOfYear(displayYear);

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Empty state
  if (values.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-300">
        <div className="flex justify-between items-center p-4 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm">
          <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200">
            Annual Mood Heatmap
          </h3>
          <DownloadChartButton
            chartRef={chartContainerRef}
            filename="mood_heatmap"
            darkMode={isDarkMode}
            className="hover:scale-105 transition-transform opacity-50 pointer-events-none"
          />
        </div>
        <div
          ref={chartContainerRef}
          className="p-8 flex flex-col items-center justify-center text-center"
          style={{ backgroundColor: currentColors.background }}
        >
          <Calendar size={48} className="text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">
            No journal entries for {format(displayYear, 'yyyy')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Start journaling to see your mood patterns throughout the year.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-300">
      <div className="flex justify-between items-center p-4 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm">
        <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200">
          Annual Mood Heatmap ({format(displayYear, 'yyyy')})
        </h3>
        <DownloadChartButton
          chartRef={chartContainerRef}
          filename="mood_heatmap"
          darkMode={isDarkMode}
          className="hover:scale-105 transition-transform"
        />
      </div>

      <div
        ref={chartContainerRef}
        className="p-4 overflow-x-auto"
        style={{ backgroundColor: currentColors.background }}
      >
        <style>
          {`
            .react-calendar-heatmap text {
              font-family: 'Inter', sans-serif;
              font-size: 10px;
              fill: ${currentColors.secondaryText};
            }
            .react-calendar-heatmap .month-label {
              font-weight: 600;
              font-size: 11px;
              fill: ${currentColors.text};
              text-anchor: start;
              transform: translateX(2px);
            }
            .react-calendar-heatmap .weekday-label {
              font-size: 10px;
              fill: ${currentColors.secondaryText};
              text-anchor: end;
              dominant-baseline: middle;
              transform: translateX(-4px);
            }
            .react-calendar-heatmap .day {
              shape-rendering: crispEdges;
              stroke: ${isDarkMode ? '#4B5563' : '#D1D5DB'};
              stroke-width: 1.2px;
              rx: 3;
              ry: 3;
            }
            /* Empty cells get a thicker stroke so they appear as faint grid */
            .react-calendar-heatmap .color-empty {
              fill: ${currentColors.empty};
              stroke-width: 1.5px;
            }
            .react-calendar-heatmap .color-very-negative { fill: ${currentColors.veryNegative}; }
            .react-calendar-heatmap .color-negative { fill: ${currentColors.negative}; }
            .react-calendar-heatmap .color-neutral { fill: ${currentColors.neutral}; }
            .react-calendar-heatmap .color-positive { fill: ${currentColors.positive}; }
            .react-calendar-heatmap .color-very-positive { fill: ${currentColors.veryPositive}; }
            /* Hover effect for all cells */
            .react-calendar-heatmap .day:hover {
              stroke-width: 2px;
              stroke: ${currentColors.text};
              filter: brightness(0.9);
            }
          `}
        </style>

        <div className="flex justify-start overflow-x-auto pb-2">
          <CalendarHeatmap
            startDate={startDate}
            endDate={endDate}
            values={values}
            classForValue={getClassForValue}
            showWeekdayLabels={true}
            showMonthLabels={true}
            gutterSize={4}
            weekdayLabels={weekdayLabels}
            monthLabels={monthLabels}
          />
        </div>

        {/* Color Legend */}
        <div className="flex flex-wrap justify-center items-center mt-6 gap-4 text-sm font-inter text-gray-700 dark:text-gray-300">
          <span className="font-medium">Mood Scale:</span>
          {[
            { color: currentColors.veryNegative, label: 'Very Negative' },
            { color: currentColors.negative, label: 'Negative' },
            { color: currentColors.neutral, label: 'Neutral' },
            { color: currentColors.positive, label: 'Positive' },
            { color: currentColors.veryPositive, label: 'Very Positive' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-sm shadow-sm"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MoodCalendarHeatmap;