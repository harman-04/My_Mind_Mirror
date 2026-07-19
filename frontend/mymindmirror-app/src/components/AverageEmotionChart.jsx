// src/components/AverageEmotionChart.jsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { SkeletonChart } from './Skeleton';
import { useTheme } from '../contexts/ThemeContext';
import DownloadChartButton from './DownloadChartButton';
import { BarChart3 } from 'lucide-react'; // 💡 NEW: Imported Icon
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    zoomPlugin
);

const EMOTION_BAR_COLORS_LIGHT = {
    'joy': '#5CC8C2', 'sadness': '#FF8A7A', 'anger': '#A93226', 'fear': '#6C3483',
    'surprise': '#85C1E9', 'neutral': '#E0E0E0', 'love': '#E74C3C', 'disgust': '#D35400',
    'anxiety': '#F7DC6F', 'optimism': '#F1C40F', 'relief': '#58D68D', 'caring': '#2ECC71',
    'curiosity': '#AF7AC5', 'embarrassment': '#D35400', 'pride': '#F39C12', 'remorse': '#7F8C8D',
    'annoyance': '#E67E22', 'disappointment': '#283747', 'grief': '#17202A', 'excitement': '#FFD700',
    'contentment': '#90EE90', 'frustration': '#FF4500', 'gratitude': '#ADFF2F', 'hope': '#ADD8E6',
};

const EMOTION_BAR_COLORS_DARK = {
    'joy': '#8DE2DD', 'sadness': '#C7B3E6', 'anger': '#FFB0A4', 'fear': '#D45E4D',
    'surprise': '#B0D9F7', 'neutral': '#A0A0A0', 'love': '#FF7F7F', 'disgust': '#9B6EB4',
    'anxiety': '#FFF0B3', 'optimism': '#FFD750', 'relief': '#8CE0B0', 'caring': '#58D68D',
    'curiosity': '#C79BE0', 'embarrassment': '#FF8C40', 'pride': '#FFC050', 'remorse': '#B0B8B8',
    'annoyance': '#FFAB66', 'disappointment': '#506A80', 'grief': '#404040', 'excitement': '#FFE680',
    'contentment': '#C0FFC0', 'frustration': '#FF7F50', 'gratitude': '#D0FF80', 'hope': '#C0E0FF',
};

const AverageEmotionChart = ({ entries, isLoading }) => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const emotionColors = isDarkMode ? EMOTION_BAR_COLORS_DARK : EMOTION_BAR_COLORS_LIGHT;

    const chartContainerRef = useRef(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const cardBg = isDarkMode ? 'bg-[#1A162F]/60 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl';
    const cardBorder = isDarkMode ? 'border-white/10' : 'border-white/50';

    const { chartData, chartOptions, calculatedWidth, error } = useMemo(() => {
        if (!entries || entries.length === 0) {
            return { chartData: null, chartOptions: null, calculatedWidth: '100%', error: null };
        }

        try {
            const emotionSums = {};
            const emotionCounts = {};

            entries.forEach(entry => {
                let parsedEmotions = {};
                if (entry.emotions) {
                    if (typeof entry.emotions === 'string') {
                        try {
                            parsedEmotions = JSON.parse(entry.emotions);
                        } catch (e) {
                            parsedEmotions = {};
                        }
                    } else if (typeof entry.emotions === 'object' && entry.emotions !== null) {
                        parsedEmotions = entry.emotions;
                    }
                }

                Object.entries(parsedEmotions).forEach(([emotion, score]) => {
                    const numericScore = parseFloat(score);
                    if (!isNaN(numericScore)) {
                        emotionSums[emotion] = (emotionSums[emotion] || 0) + numericScore;
                        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                    }
                });
            });

            const averageEmotions = {};
            for (const emotion in emotionSums) {
                averageEmotions[emotion] = emotionSums[emotion] / emotionCounts[emotion];
            }

            const sortedAverages = Object.entries(averageEmotions)
                .sort(([, avgA], [, avgB]) => avgB - avgA)
                .slice(0, 7);

            const labels = sortedAverages.map(([emotion]) =>
                emotion.charAt(0).toUpperCase() + emotion.slice(1)
            );
            const data = sortedAverages.map(([, avg]) => avg);
            const baseColors = labels.map(label =>
                emotionColors[label.toLowerCase()] || '#CCCCCC'
            );

            const dataObj = {
                labels,
                datasets: [{
                    label: 'Average Intensity',
                    data,
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea || context.dataIndex === undefined) return 'transparent';

                        const baseColor = baseColors[context.dataIndex];
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, baseColor);
                        gradient.addColorStop(1, baseColor + '20');
                        return gradient;
                    },
                    borderColor: baseColors,
                    borderWidth: isDarkMode ? 1 : 2,
                    borderRadius: 6,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8,
                }],
            };

            const textColor = isDarkMode ? '#E0E0E0' : '#1E1A3E';
            const axisColor = isDarkMode ? '#94A3B8' : '#475569';
            const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

            const minWidthPerPoint = isMobile ? 45 : 70;
            const totalMinWidth = labels.length * minWidthPerPoint;
            const finalWidth = `max(100%, ${totalMinWidth}px)`;

            const options = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
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
                            label: (context) => `${context.label}: ${context.parsed.y.toFixed(3)}`,
                        },
                    },
                    zoom: isMobile ? {} : {
                        pan: {
                            enabled: true,
                            mode: 'x',
                            modifierKey: 'ctrl',
                        },
                        zoom: {
                            wheel: { enabled: true, modifierKey: 'ctrl' },
                            pinch: { enabled: false },
                            mode: 'x',
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: false },
                        ticks: { color: axisColor, maxRotation: 45, minRotation: 45, font: { size: isMobile ? 10 : 12 } },
                        grid: { display: false },
                    },
                    y: {
                        beginAtZero: true,
                        max: 1.0,
                        title: { display: false },
                        ticks: { color: axisColor, stepSize: 0.2, font: { size: isMobile ? 10 : 12 } },
                        grid: { color: gridColor, drawBorder: false },
                        border: { dash: [4, 4] }
                    },
                },
                animation: { duration: 800, easing: 'easeInOutQuart' },
            };

            return { chartData: dataObj, chartOptions: options, calculatedWidth: finalWidth, error: null };
        } catch (err) {
            console.error('Error processing average emotion data:', err);
            return { chartData: null, chartOptions: null, calculatedWidth: '100%', error: 'Failed to process average emotion data.' };
        }
    }, [entries, emotionColors, isDarkMode, isMobile]);

    if (isLoading) {
        return <SkeletonChart />;
    }

    if (error) {
        return (
            <div className="h-64 sm:h-80 w-full flex items-center justify-center font-inter text-red-500 dark:text-red-400 bg-white/50 dark:bg-gray-800/50 rounded-2xl lg:rounded-3xl border border-gray-200 dark:border-gray-700">
                {error}
            </div>
        );
    }

    if (!chartData || chartData.labels.length === 0) {
        return (
            <div className={`rounded-2xl lg:rounded-3xl border ${cardBorder} shadow-lg overflow-hidden ${cardBg} flex flex-col h-full`}>
                <div className="flex flex-wrap justify-between items-center gap-4 p-4 lg:p-6 border-b border-gray-200/50 dark:border-gray-700/50">
                    {/* 💡 Icon added to Empty State Header */}
                    <div className="flex-1 min-w-[200px]">
                        <h3 className="text-lg lg:text-xl font-poppins font-extrabold text-gray-800 dark:text-gray-100 tracking-tight flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-blue-500" />
                            Top Primary Emotions
                        </h3>
                    </div>
                    <DownloadChartButton
                        chartRef={chartContainerRef}
                        filename="top_emotion_chart"
                        darkMode={isDarkMode}
                        className="opacity-50 pointer-events-none mt-2 sm:mt-0 shrink-0"
                    />
                </div>
                <div className="p-6 lg:p-10 flex-grow flex flex-col items-center justify-center text-center" style={{ backgroundColor: isDarkMode ? '#131127' : '#ffffff', minHeight: '260px' }}>
                    <p className="text-sm lg:text-base font-medium text-gray-600 dark:text-gray-400">
                        No emotion data available yet. Keep journaling to see your primary emotional drivers!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl lg:rounded-3xl border ${cardBorder} shadow-lg ring-1 ring-black/5 dark:ring-white/5 overflow-hidden ${cardBg} h-full flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5`}>

            {/* Header */}
            <div className={`flex flex-wrap justify-between items-center gap-4 p-4 lg:p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-black/10`}>
                <div className="flex-1 min-w-[200px]">
                    {/* 💡 Icon added to Populated State Header */}
                    <h3 className="text-lg lg:text-xl font-poppins font-extrabold text-gray-800 dark:text-gray-100 tracking-tight flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-blue-500" />
                        Top Primary Emotions
                    </h3>
                    <p className="text-[11px] lg:text-xs text-gray-500 dark:text-gray-400 mt-0.5 lg:mt-1 font-medium">
                        {isMobile
                            ? "Swipe horizontally to explore your top drivers."
                            : "Your strongest drivers. Hold Ctrl/Cmd + Scroll to Zoom."}
                    </p>
                </div>
                <DownloadChartButton
                    chartRef={chartContainerRef}
                    filename="top_primary_emotions"
                    darkMode={isDarkMode}
                    className="hover:scale-105 transition-transform shrink-0"
                />
            </div>

            {/* Chart container */}
            <div
                ref={chartContainerRef}
                className="w-full flex-grow overflow-x-auto custom-scrollbar flex flex-col"
                style={{ backgroundColor: isDarkMode ? '#131127' : '#ffffff' }}
            >
                <div className="h-[250px] sm:h-[300px] lg:h-[350px] p-4 pr-6 lg:pr-8 pb-4 lg:pb-6 flex-grow flex items-center justify-center" style={{ width: calculatedWidth }}>
                    <Bar data={chartData} options={chartOptions} />
                </div>
            </div>
        </div>
    );
};

export default React.memo(AverageEmotionChart);