// src/components/MoodCalendarHeatmap.jsx
import React, { useRef } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import {
  format,
  parseISO,
  startOfYear,
  endOfYear,
} from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import DownloadChartButton from './DownloadChartButton';
import { Calendar, Activity } from 'lucide-react';

const MoodCalendarHeatmap = ({ journalEntries, displayYear = new Date() }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const chartContainerRef = useRef(null);

  const moodColors = {
    light: {
      veryNegative: '#E74C3C',
      negative: '#F39C12',
      neutral: '#D0D0D0',
      positive: '#2ECC71',
      veryPositive: '#3498DB',
      empty: '#F8F8F8',
      text: '#2D3748',
      secondaryText: '#718096',
      background: 'rgba(255, 255, 255, 0.7)',
    },
    dark: {
      veryNegative: '#C0392B',
      negative: '#E67E22',
      neutral: '#505050',
      positive: '#27AE60',
      veryPositive: '#2980B9',
      empty: '#1A202C',
      text: '#E2E8F0',
      secondaryText: '#A0AEC0',
      background: 'rgba(0, 0, 0, 0.5)',
    },
  };

  const currentColors = isDarkMode ? moodColors.dark : moodColors.light;

  // Aggregate mood scores per date
  const dailyMoods = {};
  journalEntries.forEach(entry => {
    if (entry.moodScore !== null && entry.moodScore !== undefined) {
      const dateKey = format(parseISO(entry.entryDate), 'yyyy-MM-dd');
      if (!dailyMoods[dateKey]) {
        dailyMoods[dateKey] = { sum: 0, count: 0 };
      }
      dailyMoods[dateKey].sum += entry.moodScore;
      dailyMoods[dateKey].count++;
    }
  });

  const values = Object.keys(dailyMoods).map(dateKey => {
    const { sum, count } = dailyMoods[dateKey];
    return {
      date: dateKey,
      count: count > 0 ? sum / count : null,
    };
  });

  const getClassForValue = (value) => {
    if (!value || value.count === null) return 'color-empty';
    if (value.count >= 0.7) return 'color-very-positive';
    if (value.count >= 0.3) return 'color-positive';
    if (value.count > -0.3) return 'color-neutral';
    if (value.count > -0.7) return 'color-negative';
    return 'color-very-negative';
  };

  const startDate = startOfYear(displayYear);
  const endDate = endOfYear(displayYear);

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
          style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}
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
      {/* Header with title and download button */}
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

      {/* Heatmap container – solid background for PNG capture */}
      <div
        ref={chartContainerRef}
        className="p-4"
        style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}
      >
        <style>
          {`
            .react-calendar-heatmap text {
              font-family: 'Inter', sans-serif;
              font-size: 9px;
              fill: ${currentColors.secondaryText};
            }

            .react-calendar-heatmap .month-label {
              font-weight: 600;
              font-size: 11px;
              fill: ${currentColors.text};
            }

            .react-calendar-heatmap .weekday-label {
              font-size: 9px;
              fill: ${currentColors.secondaryText};
            }

            .react-calendar-heatmap .day {
              shape-rendering: crispEdges;
              stroke: rgba(255,255,255,0.1);
              stroke-width: 1;
              rx: 2;
              ry: 2;
            }

            .react-calendar-heatmap .color-empty { fill: ${currentColors.empty}; }
            .react-calendar-heatmap .color-very-negative { fill: ${currentColors.veryNegative}; }
            .react-calendar-heatmap .color-negative { fill: ${currentColors.negative}; }
            .react-calendar-heatmap .color-neutral { fill: ${currentColors.neutral}; }
            .react-calendar-heatmap .color-positive { fill: ${currentColors.positive}; }
            .react-calendar-heatmap .color-very-positive { fill: ${currentColors.veryPositive}; }
          `}
        </style>

        <div className="flex justify-center overflow-x-auto pb-4">
          <CalendarHeatmap
            startDate={startDate}
            endDate={endDate}
            values={values}
            classForValue={getClassForValue}
            showWeekdayLabels={true}
            showMonthLabels={true}
            gutterSize={4}
            weekdayLabels={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
            tooltipDataAttrs={(value) => {
              if (!value || value.date === null) return { 'data-tip': 'No entries' };
              return {
                'data-tip': `${format(parseISO(value.date), 'MMM d, yyyy')}: Mood ${value.count.toFixed(2)}`,
              };
            }}
            transformDayElement={(element, value, index) => (
              <g key={index}>
                {element}
                {value && value.date && (
                  <title>{`${format(parseISO(value.date), 'MMM d, yyyy')}: Mood ${value.count.toFixed(2)}`}</title>
                )}
              </g>
            )}
          />
        </div>

        {/* Color Legend */}
        <div className="flex flex-wrap justify-center items-center mt-4 gap-3 text-sm font-inter text-gray-700 dark:text-gray-300">
          <span>Mood Scale:</span>
          {[
            { color: currentColors.veryNegative, label: 'Very Negative' },
            { color: currentColors.negative, label: 'Negative' },
            { color: currentColors.neutral, label: 'Neutral' },
            { color: currentColors.positive, label: 'Positive' },
            { color: currentColors.veryPositive, label: 'Very Positive' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center space-x-1">
              <div
                className="w-4 h-4 rounded-sm"
                style={{ backgroundColor: item.color }}
              ></div>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MoodCalendarHeatmap;