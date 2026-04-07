import React, { useMemo, useRef } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Scatter,
  Line,
  ComposedChart,
  ResponsiveContainer
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { SkeletonChart } from './Skeleton';
import DownloadChartButton from './DownloadChartButton';

// Linear regression helper (unchanged)
const linearRegression = (points) => {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r: 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const p of points) {
    const x = p.x; const y = p.y;
    sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; sumY2 += y * y;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const r = (n * sumXY - sumX * sumY) /
    Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return { slope, intercept, r };
};

const MoodWordCountChart = ({ entries, isLoading }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const chartContainerRef = useRef(null);

  const { dataPoints, trendLine, correlation } = useMemo(() => {
    if (!entries || entries.length === 0) return { dataPoints: [], trendLine: [], correlation: 0 };

    const points = entries
      .filter(entry => entry.moodScore !== null && entry.rawText)
      .map(entry => ({
        x: entry.rawText.trim().split(/\s+/).length,
        y: entry.moodScore,
        date: entry.entryDate,
        summary: entry.summary,
      }))
      .sort((a, b) => a.x - b.x);

    if (points.length < 2) return { dataPoints: points, trendLine: [], correlation: 0 };

    const { slope, intercept, r } = linearRegression(points);
    const xMin = Math.min(...points.map(p => p.x));
    const xMax = Math.max(...points.map(p => p.x));

    const trendPoints = [
      { x: xMin, y: slope * xMin + intercept },
      { x: xMax, y: slope * xMax + intercept },
    ];

    return { dataPoints: points, trendLine: trendPoints, correlation: r };
  }, [entries]);

  // Theme-aware colours
  const axisColor = isDarkMode ? '#94A3B8' : '#475569';
  const gridColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const scatterColor = isDarkMode ? '#8DE2DD' : '#B399D4';
  const lineColor = isDarkMode ? '#FFB0A4' : '#FF8A7A';

  if (isLoading) return <SkeletonChart />;

  if (!dataPoints.length) {
    return (
      <div className="h-80 w-full flex items-center justify-center font-inter text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
        Not enough data to show correlation. Keep journaling!
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-300">
      {/* Header with title and download button */}
      <div className="flex justify-between items-center p-4 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm">
        <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200">
          Mood vs. Word Count
        </h3>
        <DownloadChartButton
          chartRef={chartContainerRef}
          filename="mood_wordcount_chart"
          darkMode={isDarkMode}
          className="hover:scale-105 transition-transform"
        />
      </div>
      {/* Chart container – solid background for reliable PNG capture */}
      <div
        ref={chartContainerRef}
        className="p-4"
        style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}
      >
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={dataPoints}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="x"
                type="number"
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 12 }}
                label={{
                  value: 'Total Word Count',
                  position: 'insideBottom',
                  offset: -40,
                  fill: axisColor,
                  fontSize: 14,
                  fontWeight: 600
                }}
              />
              <YAxis
                dataKey="y"
                type="number"
                domain={[-1, 1]}
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 12 }}
                label={{
                  value: 'Mood Intensity',
                  angle: -90,
                  position: 'insideLeft',
                  fill: axisColor,
                  offset: 10
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                wrapperStyle={{ paddingBottom: '20px', color: axisColor }}
              />
              <Scatter
                name="Journal Entries"
                data={dataPoints}
                fill={scatterColor}
                fillOpacity={0.7}
                stroke={isDarkMode ? '#FFFFFF20' : '#00000020'}
                shape="circle"
              />
              {trendLine.length === 2 && (
                <Line
                  name="Trend Line"
                  data={trendLine}
                  dataKey="y"
                  stroke={lineColor}
                  strokeWidth={3}
                  dot={false}
                  activeDot={false}
                  strokeDasharray="8 5"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {/* Correlation info */}
        <div className="mt-4 p-3 bg-gray-100/70 dark:bg-gray-800/70 rounded-xl text-center text-sm font-medium text-gray-700 dark:text-gray-300">
          Correlation (r) = <span className="text-blue-500 font-semibold">{correlation.toFixed(3)}</span>
          <span className="ml-2 opacity-70">
            {Math.abs(correlation) > 0.7 ? '— Strong relationship' : Math.abs(correlation) > 0.3 ? '— Moderate relationship' : '— Weak relationship'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MoodWordCountChart;