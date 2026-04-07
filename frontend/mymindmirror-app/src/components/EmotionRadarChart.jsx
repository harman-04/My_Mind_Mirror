// src/components/EmotionRadarChart.jsx
import React, { useMemo, useRef } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { SkeletonChart } from './Skeleton';
import DownloadChartButton from './DownloadChartButton';
import { Activity, TrendingUp } from 'lucide-react';

// Emotion order (consistent for comparison)
const EMOTION_ORDER = [
  'joy', 'sadness', 'anger', 'fear', 'surprise',
  'love', 'anxiety', 'relief', 'neutral', 'excitement',
  'contentment', 'frustration', 'gratitude', 'hope'
];

// Display labels
const EMOTION_LABELS = {
  joy: 'Joy', sadness: 'Sadness', anger: 'Anger', fear: 'Fear',
  surprise: 'Surprise', love: 'Love', anxiety: 'Anxiety', relief: 'Relief',
  neutral: 'Neutral', excitement: 'Excitement', contentment: 'Contentment',
  frustration: 'Frustration', gratitude: 'Gratitude', hope: 'Hope'
};

// Emotion colours (for legend & tooltip)
const EMOTION_COLORS = {
  joy: '#FBBF24', sadness: '#60A5FA', anger: '#EF4444', fear: '#A855F7',
  surprise: '#F97316', love: '#EC4899', anxiety: '#8B5CF6', relief: '#10B981',
  neutral: '#9CA3AF', excitement: '#F59E0B', contentment: '#34D399',
  frustration: '#F87171', gratitude: '#6EE7B7', hope: '#38BDF8'
};

// Custom tooltip
const CustomTooltip = ({ active, payload, label, isDarkMode }) => {
  if (active && payload && payload.length) {
    const emotionKey = Object.keys(EMOTION_LABELS).find(
      key => EMOTION_LABELS[key] === label
    );
    const color = emotionKey ? EMOTION_COLORS[emotionKey] : (isDarkMode ? '#8DE2DD' : '#B399D4');
    return (
      <div className={`p-3 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800/95 text-gray-200' : 'bg-white/95 text-gray-800'} backdrop-blur-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-semibold">{label}</span>
        </div>
        <p className="text-sm mt-1">
          <span className="opacity-70">Intensity:</span>{' '}
          <span className="font-bold">{payload[0].value.toFixed(3)}</span>
        </p>
      </div>
    );
  }
  return null;
};

const EmotionRadarChart = ({ entries, isLoading }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const chartContainerRef = useRef(null);

  const chartData = useMemo(() => {
    if (!entries || entries.length === 0) return [];

    const emotionSums = {};
    const emotionCounts = {};

    entries.forEach(entry => {
      let emotions = {};
      try {
        emotions = typeof entry.emotions === 'string' ? JSON.parse(entry.emotions) : entry.emotions;
        if (typeof emotions !== 'object' || emotions === null) emotions = {};
      } catch (e) {
        emotions = {};
      }
      Object.entries(emotions).forEach(([emotion, score]) => {
        const numericScore = parseFloat(score);
        if (!isNaN(numericScore)) {
          emotionSums[emotion] = (emotionSums[emotion] || 0) + numericScore;
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        }
      });
    });

    return EMOTION_ORDER.map(emotion => {
      const avg = emotionSums[emotion] ? emotionSums[emotion] / emotionCounts[emotion] : 0;
      return {
        emotion: EMOTION_LABELS[emotion] || emotion,
        intensity: avg,
        fullName: emotion
      };
    });
  }, [entries]);

  if (isLoading) return <SkeletonChart />;

  // Empty state – beautiful illustration (now consistent with card layout)
  if (chartData.length === 0 || chartData.every(d => d.intensity === 0)) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-300">
        <div className="flex justify-between items-center p-4 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm">
          <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200">
            Emotion Radar
          </h3>
          {/* Download button is disabled in empty state – but we keep the header consistent */}
          <DownloadChartButton
            chartRef={chartContainerRef}
            filename="emotion_radar_chart"
            darkMode={isDarkMode}
            className="hover:scale-105 transition-transform opacity-50 pointer-events-none"
          />
        </div>
        <div
          ref={chartContainerRef}
          className="p-4 flex flex-col items-center justify-center"
          style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', minHeight: '440px' }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-teal-400/20 rounded-full blur-2xl" />
            <Activity size={64} className="relative text-purple-400 dark:text-teal-400 animate-pulse" />
          </div>
          <p className="text-lg font-medium mt-4 text-gray-700 dark:text-gray-300">Not enough emotional data yet</p>
          <p className="text-sm text-center max-w-md mt-2 text-gray-500 dark:text-gray-400">
            Your emotion radar will appear here once you have journal entries with detected emotions.
            <br />Keep writing – your feelings will shape a beautiful insight!
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-4">
            <TrendingUp size={14} />
            <span>The more you journal, the clearer your emotional patterns become</span>
          </div>
        </div>
      </div>
    );
  }

  // Styling for the chart (theme‑aware)
  const axisColor = isDarkMode ? '#CBD5E1' : '#475569';
  const gridColor = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';
  const radarColor = isDarkMode ? '#8DE2DD' : '#B399D4';
  const fillGradientId = 'radarGradient';

  // Custom legend renderer (with emotion colours)
  const renderLegend = (props) => {
    const { payload } = props;
    if (!payload || payload.length === 0) return null;
    return (
      <div className="flex justify-center gap-4 flex-wrap mt-4 text-xs">
        {payload.map((entry, index) => {
          const emotionKey = Object.keys(EMOTION_LABELS).find(
            key => EMOTION_LABELS[key] === entry.value
          );
          const color = emotionKey ? EMOTION_COLORS[emotionKey] : radarColor;
          return (
            <div key={`legend-${index}`} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-gray-700 dark:text-gray-300">{entry.value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-300">
      {/* Header with title and download button */}
      <div className="flex justify-between items-center p-4 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm">
        <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200">
          Emotion Radar
        </h3>
        <DownloadChartButton
          chartRef={chartContainerRef}
          filename="emotion_radar_chart"
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
        <div className="w-full h-[440px] relative">
          {/* Radial gradient definition */}
          <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <defs>
              <radialGradient id={fillGradientId} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={radarColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={radarColor} stopOpacity={0.05} />
              </radialGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>

          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
              <PolarGrid stroke={gridColor} strokeDasharray="4 4" />
              <PolarAngleAxis
                dataKey="emotion"
                tick={{ fill: axisColor, fontSize: 11, fontWeight: 500, dy: 4 }}
                axisLine={{ stroke: gridColor }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 1]}
                tick={{ fill: axisColor, fontSize: 10 }}
                axisLine={{ stroke: gridColor }}
                tickCount={5}
              />
              <Radar
                name="Emotion Intensity"
                dataKey="intensity"
                stroke={radarColor}
                strokeWidth={2}
                fill={`url(#${fillGradientId})`}
                fillOpacity={0.7}
                animationDuration={800}
                animationEasing="ease-out"
                dot={{
                  r: 4,
                  fill: radarColor,
                  stroke: isDarkMode ? '#1E293B' : '#FFFFFF',
                  strokeWidth: 1.5,
                  filter: 'url(#glow)'
                }}
                activeDot={{ r: 6, fill: radarColor, strokeWidth: 0 }}
              />
              <Tooltip
                content={<CustomTooltip isDarkMode={isDarkMode} />}
                cursor={{ stroke: radarColor, strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Legend
                content={renderLegend}
                verticalAlign="bottom"
                height={60}
                wrapperStyle={{ paddingTop: 10 }}
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* Subtle annotation */}
          <div className="absolute bottom-2 right-4 text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <span>Based on your journal entries</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionRadarChart;