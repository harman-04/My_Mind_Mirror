// src/components/ConcernFrequencyChart.jsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { SkeletonChart } from './Skeleton';
import { useTheme } from '../contexts/ThemeContext';
import DownloadChartButton from './DownloadChartButton';
import { PieChart } from 'lucide-react'; // 💡 NEW: Imported Icon
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';

import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    zoomPlugin
);

const CONCERN_PALETTE_LIGHT = [
    '#B399D4', '#5CC8C2', '#FF8A7A', '#85C1E9', '#F1C40F',
    '#2ECC71', '#AF7AC5', '#FFD700', '#ADD8E6', '#D35400'
];

const CONCERN_PALETTE_DARK = [
    '#C7B3E6', '#8DE2DD', '#FFB0A4', '#B0D9F7', '#FFD750',
    '#58D68D', '#C79BE0', '#FFE680', '#C0E0FF', '#FF8C40'
];

function ConcernFrequencyChart({ entries, isLoading }) {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

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
            return { chartData: null, chartOptions: {}, calculatedWidth: '100%', error: null };
        }

        try {
            const concernCounts = {};
            entries.forEach(entry => {
                let parsedConcerns = [];
                if (entry.coreConcerns) {
                    if (Array.isArray(entry.coreConcerns)) {
                        parsedConcerns = entry.coreConcerns;
                    } else if (typeof entry.coreConcerns === 'string') {
                        try {
                            parsedConcerns = JSON.parse(entry.coreConcerns);
                        } catch (e) {
                            parsedConcerns = [];
                        }
                    }
                }
                parsedConcerns.forEach(concern => {
                    if (typeof concern === 'string' && concern.trim()) {
                        concernCounts[concern] = (concernCounts[concern] || 0) + 1;
                    }
                });
            });

            const sorted = Object.entries(concernCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 25);

            const labels = sorted.map(([c]) => c.charAt(0).toUpperCase() + c.slice(1));
            const data = sorted.map(([, v]) => v);

            const palette = isDarkMode ? CONCERN_PALETTE_DARK : CONCERN_PALETTE_LIGHT;
            const colors = data.map((_, i) => palette[i % palette.length]);

            const chartData = {
                labels,
                datasets: [{
                    label: 'Frequency',
                    data,
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea || context.dataIndex === undefined) return 'transparent';

                        const baseColor = colors[context.dataIndex];
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, baseColor);
                        gradient.addColorStop(1, baseColor + '20');
                        return gradient;
                    },
                    borderColor: colors,
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
                            label: (ctx) => `${ctx.label}: ${ctx.parsed.y} entries`,
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
                        ticks: { color: axisColor, maxRotation: 45, minRotation: 45, autoSkip: false, font: { size: isMobile ? 10 : 12 } },
                        grid: { display: false },
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: false },
                        ticks: { color: axisColor, stepSize: 1, callback: (v) => (v % 1 === 0 ? v : ''), font: { size: isMobile ? 10 : 12 } },
                        grid: { color: gridColor, drawBorder: false },
                        border: { dash: [4, 4] }
                    },
                },
                animation: { duration: 800, easing: 'easeInOutQuart' },
            };

            return { chartData, chartOptions: options, calculatedWidth: finalWidth, error: null };
        } catch (err) {
            console.error('Error processing concern data:', err);
            return { chartData: null, chartOptions: {}, calculatedWidth: '100%', error: 'Failed to process concern frequency data.' };
        }
    }, [entries, isDarkMode, isMobile]);

    if (isLoading) {
        return <SkeletonChart />;
    }

    if (error) {
        return (
            <div className={`h-64 sm:h-80 w-full flex items-center justify-center font-inter text-red-500 dark:text-red-400 bg-white/50 dark:bg-[#131127]/80 rounded-2xl lg:rounded-3xl border ${cardBorder}`}>
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
                            <PieChart className="w-5 h-5 lg:w-6 lg:h-6 text-rose-500" />
                            Frequent Concerns
                        </h3>
                    </div>
                    <DownloadChartButton
                        chartRef={chartContainerRef}
                        filename="concern_frequency_chart"
                        darkMode={isDarkMode}
                        className="opacity-50 pointer-events-none mt-2 sm:mt-0 shrink-0"
                    />
                </div>
                <div className="p-6 lg:p-10 flex-grow flex flex-col items-center justify-center text-center" style={{ backgroundColor: isDarkMode ? '#131127' : '#ffffff', minHeight: '260px' }}>
                    <p className="text-sm lg:text-base font-medium text-gray-600 dark:text-gray-400">
                        No concerns detected yet. Keep journaling to see your patterns!
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
                        <PieChart className="w-5 h-5 lg:w-6 lg:h-6 text-rose-500" />
                        Frequent Concerns
                    </h3>
                    <p className="text-[11px] lg:text-xs text-gray-500 dark:text-gray-400 mt-0.5 lg:mt-1 font-medium">
                        {isMobile
                            ? "Swipe horizontally to explore your top themes."
                            : "Top themes in your journal. Hold Ctrl/Cmd + Scroll to Zoom."}
                    </p>
                </div>
                <DownloadChartButton
                    chartRef={chartContainerRef}
                    filename="concern_frequency_chart"
                    darkMode={isDarkMode}
                    className="hover:scale-105 transition-transform shrink-0"
                />
            </div>

            {/* Chart Container */}
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
}

export default React.memo(ConcernFrequencyChart);