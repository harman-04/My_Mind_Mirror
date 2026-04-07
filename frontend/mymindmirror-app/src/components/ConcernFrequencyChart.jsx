// src/components/ConcernFrequencyChart.jsx
import React, { useMemo, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import { SkeletonChart } from './Skeleton';
import { useTheme } from '../contexts/ThemeContext';
import DownloadChartButton from './DownloadChartButton';
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

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Beautiful color palettes for bars
const CONCERN_PALETTE_LIGHT = [
    '#B399D4', // Gentle Lavender
    '#5CC8C2', // Serene Teal
    '#FF8A7A', // Warm Coral
    '#85C1E9', // Light Blue
    '#F1C40F', // Golden Yellow
    '#2ECC71', // Green
    '#AF7AC5', // Light Purple
    '#FFD700', // Gold
    '#ADD8E6', // Light Sky Blue
    '#D35400', // Dark Orange
];

const CONCERN_PALETTE_DARK = [
    '#C7B3E6', // Lighter Lavender
    '#8DE2DD', // Lighter Teal
    '#FFB0A4', // Lighter Coral
    '#B0D9F7', // Lighter Blue
    '#FFD750', // Lighter Yellow
    '#58D68D', // Lighter Green
    '#C79BE0', // Lighter Purple
    '#FFE680', // Lighter Gold
    '#C0E0FF', // Lighter Sky Blue
    '#FF8C40', // Lighter Orange
];

function ConcernFrequencyChart({ entries, isLoading }) {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const chartContainerRef = useRef(null);

    // Compute chart data from entries
    const { chartData, error } = useMemo(() => {
        if (!entries || entries.length === 0) {
            return { chartData: null, error: null };
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
                .slice(0, 7);

            const labels = sorted.map(([c]) => c.charAt(0).toUpperCase() + c.slice(1));
            const data = sorted.map(([, v]) => v);

            const palette = isDarkMode ? CONCERN_PALETTE_DARK : CONCERN_PALETTE_LIGHT;
            const colors = data.map((_, i) => palette[i % palette.length]);

            return {
                chartData: {
                    labels,
                    datasets: [{
                        label: 'Frequency',
                        data,
                        backgroundColor: colors,
                        borderColor: colors.map(c => c + 'CC'),
                        borderWidth: 1,
                        borderRadius: 8,
                        barPercentage: 0.7,
                        categoryPercentage: 0.8,
                    }],
                },
                error: null,
            };
        } catch (err) {
            console.error('Error processing concern data:', err);
            return { chartData: null, error: 'Failed to process concern frequency data.' };
        }
    }, [entries, isDarkMode]);

    // Chart options (theme-aware)
    const chartOptions = useMemo(() => {
        const textColor = isDarkMode ? '#E0E0E0' : '#1E1A3E';
        const axisColor = isDarkMode ? '#E0E0E0' : 'rgb(75, 85, 99)';
        const gridColor = isDarkMode ? 'rgba(100, 100, 100, 0.2)' : 'rgba(200, 200, 200, 0.2)';
        const tooltipBg = isDarkMode ? 'rgba(45,55,72,0.95)' : 'rgba(255,255,255,0.95)';
        const tooltipText = isDarkMode ? '#E0E0E0' : '#1E1A3E';

        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Most Frequent Journal Concerns',
                    font: { family: 'Poppins', size: 16, weight: '600' },
                    color: textColor,
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${ctx.parsed.y} entries`,
                    },
                    backgroundColor: tooltipBg,
                    titleColor: tooltipText,
                    bodyColor: axisColor,
                    borderColor: isDarkMode ? '#4A5568' : '#E2E8F0',
                    borderWidth: 1,
                    borderRadius: 6,
                },
            },
            scales: {
                x: {
                    title: { display: true, text: 'Concern Category', font: { family: 'Inter', size: 12 }, color: axisColor },
                    ticks: { color: axisColor, maxRotation: 45, minRotation: 45, autoSkip: true },
                    grid: { display: false },
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Number of Entries', font: { family: 'Inter', size: 12 }, color: axisColor },
                    ticks: { color: axisColor, stepSize: 1, callback: (v) => (v % 1 === 0 ? v : '') },
                    grid: { color: gridColor },
                },
            },
            animation: { duration: 800, easing: 'easeInOutQuart' },
        };
    }, [isDarkMode]);

    if (isLoading) {
        return <SkeletonChart />;
    }

    if (error) {
        return (
            <div className="h-80 w-full flex items-center justify-center font-inter text-red-500 dark:text-red-400 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                {error}
            </div>
        );
    }

    if (!chartData || chartData.labels.length === 0) {
        return (
            <div className="h-80 w-full flex items-center justify-center font-inter text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                No concerns detected yet. Keep journaling to see your patterns!
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-300">
            {/* Header with title and download button */}
            <div className="flex justify-between items-center p-4 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200">
                    Frequent Concerns
                </h3>
                <DownloadChartButton
                    chartRef={chartContainerRef}
                    filename="concern_frequency_chart"
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
                <div className="h-80 w-full">
                    <Bar data={chartData} options={chartOptions} />
                </div>
            </div>
        </div>
    );
}

export default ConcernFrequencyChart;