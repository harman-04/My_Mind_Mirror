// src/components/MoodWordCountChart.jsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Scatter } from 'react-chartjs-2';
import { SkeletonChart } from './Skeleton';
import { useTheme } from '../contexts/ThemeContext';
import DownloadChartButton from './DownloadChartButton';
import { ScatterChart } from 'lucide-react';
import {
    Chart as ChartJS,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    zoomPlugin
);

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

  // Local ref for triggering the Download Button Spinner
  const chartContainerRef = useRef(null);

  // Track window size to conditionally enable/disable zoom plugin
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 1024);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Premium Glassmorphism Theme Sync
  const cardBg = isDarkMode ? 'bg-[#1A162F]/60 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl';
  const cardBorder = isDarkMode ? 'border-white/10' : 'border-white/50';

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

  const { chartData, chartOptions, calculatedWidth } = useMemo(() => {
    if (!dataPoints.length) return { chartData: null, chartOptions: null, calculatedWidth: '100%' };

    const textColor = isDarkMode ? '#E0E0E0' : '#1E1A3E';
    const axisColor = isDarkMode ? '#94A3B8' : '#475569';
    const gridColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    const scatterColor = isDarkMode ? '#8DE2DD' : '#B399D4';
    const lineColor = isDarkMode ? '#FFB0A4' : '#FF8A7A';

    const datasets = [
        {
            type: 'scatter',
            label: 'Journal Entries',
            data: dataPoints,
            backgroundColor: scatterColor + 'CC', // 80% opacity
            borderColor: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)',
            borderWidth: 1,
            pointRadius: isMobile ? 4 : 5,
            pointHoverRadius: isMobile ? 6 : 8,
            clip: false, // 💡 FIX: Prevents dots on the top/bottom/edges from being cut in half!
        }
    ];

    if (trendLine.length === 2) {
        datasets.push({
            type: 'line',
            label: 'Trend Line',
            data: trendLine,
            borderColor: lineColor,
            borderWidth: 3,
            borderDash: [8, 5],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            clip: false, // 💡 FIX: Prevents the trendline from being clipped at the boundaries
        });
    }

    const data = { datasets };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        // 💡 FIX: Adding padding around the chart so the un-clipped dots have physical space to render
        layout: {
            padding: {
                top: 15,
                bottom: 15,
                right: 20,
                left: 10
            }
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: { family: 'Inter', size: isMobile ? 10 : 12 },
                    color: textColor,
                    usePointStyle: true,
                    padding: isMobile ? 10 : 20
                },
            },
            title: { display: false },
            tooltip: {
                backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                titleColor: textColor,
                bodyColor: axisColor,
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                callbacks: {
                    label: (ctx) => {
                        if (ctx.dataset.label === 'Trend Line') return `Trend: ${ctx.parsed.y.toFixed(3)}`;
                        return `Words: ${ctx.parsed.x} | Mood: ${ctx.parsed.y.toFixed(3)}`;
                    }
                }
            },
            // Safely configuring Zoom Plugin for Desktop ONLY
            zoom: isMobile ? {} : {
                pan: {
                    enabled: true,
                    mode: 'x',
                    modifierKey: 'ctrl', // Requires Ctrl/Cmd to drag horizontally
                },
                zoom: {
                    wheel: { enabled: true, modifierKey: 'ctrl' }, // Requires Ctrl/Cmd to zoom
                    pinch: { enabled: false }, // Prevent trackpad confusion
                    mode: 'x',
                }
            }
        },
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
                title: {
                    display: true,
                    text: 'Total Word Count',
                    color: axisColor,
                    font: { family: 'Inter', size: isMobile ? 12 : 14, weight: 600 },
                    padding: { top: 10 }
                },
                ticks: { color: axisColor, font: { size: isMobile ? 10 : 12 } },
                grid: { color: gridColor, drawBorder: false },
            },
            y: {
                min: -1,
                max: 1,
                title: {
                    display: true,
                    text: 'Mood Intensity',
                    color: axisColor,
                    font: { family: 'Inter', size: isMobile ? 10 : 12 },
                    padding: { bottom: 10 }
                },
                ticks: { color: axisColor, stepSize: 0.5, font: { size: isMobile ? 10 : 12 } },
                grid: { color: gridColor, drawBorder: false },
                border: { dash: [4, 4] }
            },
        },
    };

    // Dynamic Anti-Squish Width
    const minWidthPerPoint = 15;
    const totalMinWidth = Math.max(isMobile ? 600 : 800, dataPoints.length * minWidthPerPoint);
    const finalWidth = `max(100%, ${totalMinWidth}px)`;

    return { chartData: data, chartOptions: options, calculatedWidth: finalWidth };
  }, [dataPoints, trendLine, isDarkMode, isMobile]);

  if (isLoading) return <SkeletonChart />;

  if (!chartData || !dataPoints.length) {
    return (
      <div className={`w-full rounded-2xl lg:rounded-3xl border ${cardBorder} shadow-lg ring-1 ring-black/5 dark:ring-white/5 overflow-hidden ${cardBg} flex flex-col h-full`}>
          <div className="flex flex-wrap justify-between items-center gap-4 p-4 lg:p-6 border-b border-gray-200/50 dark:border-gray-700/50">
              <h3 className="text-lg lg:text-xl font-poppins font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">
                  Mood vs. Word Count
              </h3>
              <DownloadChartButton
                  chartRef={chartContainerRef}
                  filename="mood_wordcount_chart"
                  darkMode={isDarkMode}
                  className="opacity-50 pointer-events-none mt-2 sm:mt-0 shrink-0"
              />
          </div>
          <div className="w-full flex-grow flex flex-col items-center justify-center p-6 lg:p-10 text-center" style={{ backgroundColor: isDarkMode ? '#131127' : '#ffffff', minHeight: '260px' }}>
              <p className="text-sm lg:text-base font-medium text-gray-600 dark:text-gray-400">
                  Not enough data to show correlation. Keep journaling!
              </p>
          </div>
      </div>
    );
  }

  return (
    <div className={`w-full rounded-2xl lg:rounded-3xl border ${cardBorder} shadow-lg ring-1 ring-black/5 dark:ring-white/5 overflow-hidden ${cardBg} h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5`}>

      {/* Header */}
      <div className={`flex flex-wrap justify-between items-center gap-4 p-4 lg:p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-black/10`}>
          <div className="flex-1 min-w-[200px]">
              <h3 className="text-lg lg:text-xl font-poppins font-extrabold text-gray-800 dark:text-gray-100 tracking-tight flex items-center gap-2">
                  <ScatterChart className="w-5 h-5 lg:w-6 lg:h-6 text-blue-500" />
                  Mood vs. Word Count
              </h3>
              <p className="text-[11px] lg:text-xs text-gray-500 dark:text-gray-400 mt-0.5 lg:mt-1 font-medium">
                  {isMobile
                      ? "Swipe horizontally to explore density."
                      : "Scroll horizontally to explore. Hold Ctrl/Cmd + Scroll to Zoom."}
              </p>
          </div>

          <DownloadChartButton
              chartRef={chartContainerRef}
              filename="mood_wordcount_chart"
              darkMode={isDarkMode}
              className="hover:scale-105 transition-transform shrink-0"
          />
      </div>

      <div
        ref={chartContainerRef}
        className="w-full flex-grow overflow-x-auto custom-scrollbar flex flex-col"
        style={{ backgroundColor: isDarkMode ? '#131127' : '#ffffff' }}
      >
        {/* Container height scales perfectly from phone to desktop */}
        <div className="h-[250px] sm:h-[300px] lg:h-[350px] p-4 pr-6 lg:pr-8 pb-4 lg:pb-6 flex-grow flex items-center justify-center" style={{ width: calculatedWidth }}>
           <Scatter data={chartData} options={chartOptions} />
        </div>

        {/* Correlation info footer inside the capture area */}
        <div className="p-3 lg:p-4 mx-4 lg:mx-6 mb-4 lg:mb-6 bg-gray-100/70 dark:bg-[#1A162F]/70 border border-gray-200/50 dark:border-white/5 rounded-xl lg:rounded-2xl text-center text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300">
          Correlation (r) = <span className="text-blue-500 dark:text-blue-400 font-bold">{correlation.toFixed(3)}</span>
          <span className="ml-2 opacity-70">
            {Math.abs(correlation) > 0.7 ? '— Strong relationship' : Math.abs(correlation) > 0.3 ? '— Moderate relationship' : '— Weak relationship'}
          </span>
        </div>
      </div>


    </div>
  );
};

export default React.memo(MoodWordCountChart);