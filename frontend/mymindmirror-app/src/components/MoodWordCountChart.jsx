import React, { useMemo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Scatter,
  Line,
  ComposedChart,
  ResponsiveContainer // Added for better scaling
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { SkeletonChart } from './Skeleton';

// ... (linearRegression helper remains the same)
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

const MoodWordCountChart = ({ entries, isLoading  }) => {
  const { theme } = useTheme();
 if (isLoading) return <SkeletonChart />;
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

    // Add 10% padding to the trend line endpoints for visual spacing
    const trendPoints = [
      { x: xMin, y: slope * xMin + intercept },
      { x: xMax, y: slope * xMax + intercept },
    ];

    return { dataPoints: points, trendLine: trendPoints, correlation: r };
  }, [entries]);

  if (!dataPoints.length) {
    return (
      <div className="h-96 flex items-center justify-center text-gray-500">
        Not enough data to show correlation.
      </div>
    );
  }

  const isDark = theme === 'dark';
  const axisColor = isDark ? '#94A3B8' : '#475569';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
const scatterColor = isDark ? '#8DE2DD' : '#B399D4';   // teal/purple
const lineColor = isDark ? '#FFB0A4' : '#FF8A7A';      // coral

  return (
    <div className="w-full bg-white/40 dark:bg-slate-900/40 p-6 rounded-3xl border border-white/20 dark:border-slate-800 backdrop-blur-xl shadow-xl">
      <div className="w-full h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={dataPoints}
            // ⭐ FIX 1: Increased bottom margin to 60 to prevent overlap
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              stroke={axisColor}
              tick={{ fill: axisColor, fontSize: 12 }}
              // ⭐ FIX 2: Adjusted offset to -40 so label sits below the numbers
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
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
              }}
            />
            {/* ⭐ FIX 3: Moved Legend slightly up via verticalAlign to ensure spacing */}
<Legend
  verticalAlign="top"
  height={36}
  wrapperStyle={{ paddingBottom: '20px', color: axisColor }}
/>
            <Scatter
              name="Journal Entries"
              data={dataPoints}
              fill={scatterColor}
              fillOpacity={0.7}    // Makes overlapping points look deeper
              stroke={isDark ? '#FFFFFF20' : '#00000020'} // Adds a tiny "ring" around dots
              shape="circle"
            />

            {trendLine.length === 2 && (
              <Line
                name="Entries Trend"
                data={trendLine}
                dataKey="y"
                stroke={lineColor}
                strokeWidth={3}
                dot={false}
                activeDot={false}
                strokeDasharray="8 5" // Longer dashes look more professional
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl text-center text-sm font-medium text-slate-600 dark:text-slate-300">
        Correlation (r) = <span className="text-blue-500">{correlation.toFixed(3)}</span>
        <span className="ml-2 opacity-70">
          {Math.abs(correlation) > 0.7 ? '— Strong relationship' : Math.abs(correlation) > 0.3 ? '— Moderate relationship' : '— Weak relationship'}
        </span>
      </div>
    </div>
  );
};

export default MoodWordCountChart;