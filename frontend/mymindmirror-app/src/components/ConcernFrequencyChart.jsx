// src/components/ConcernFrequencyChart.js

import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { SkeletonChart } from './Skeleton';
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

// ⭐ NEW: Define unique and beautiful color palettes for bars in light and dark mode ⭐
const CONCERN_PALETTE_LIGHT = [
    '#B399D4', // Gentle Lavender (your primary active tab color)
    '#5CC8C2', // Serene Teal (your secondary active tab color)
    '#FF8A7A', // Warm Coral (your error/accent color)
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
    '#FFB0A4', // Lighter Warm Coral
    '#B0D9F7', // Lighter Blue
    '#FFD750', // Lighter Golden Yellow
    '#58D68D', // Lighter Green
    '#C79BE0', // Lighter Light Purple
    '#FFE680', // Lighter Gold
    '#C0E0FF', // Lighter Light Sky Blue
    '#FF8C40', // Lighter Dark Orange
];

function ConcernFrequencyChart({ entries, isLoading }) {
    if (isLoading) return <SkeletonChart />;

    // Compute chart data in useMemo – no internal loading state
    const { chartData, error } = useMemo(() => {
        try {
            const concernCounts = {};
            entries.forEach(entry => {
                let parsedConcerns = [];
                if (entry.coreConcerns) {
                    try {
                        parsedConcerns = entry.coreConcerns;
                        if (!Array.isArray(parsedConcerns)) parsedConcerns = [];
                    } catch (e) {
                        console.error("Error parsing coreConcerns:", e);
                        parsedConcerns = [];
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

            const isDark = document.documentElement.classList.contains('dark');
            const palette = isDark ? CONCERN_PALETTE_DARK : CONCERN_PALETTE_LIGHT;
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
                        barPercentage: 0.8,
                        categoryPercentage: 0.8,
                    }],
                },
                error: null,
            };
        } catch (err) {
            console.error('Error processing concern data:', err);
            return { chartData: null, error: 'Failed to process concern frequency data.' };
        }
    }, [entries]);

    if (error) return <div className="font-inter text-[#FF8A7A] text-center">{error}</div>;
    if (!chartData || chartData.labels.length === 0) {
        return (
            <div className="h-80 w-full flex items-center justify-center font-inter text-gray-700 dark:text-gray-300">
                No concerns detected yet. Journal more to see your patterns!
            </div>
        );
    }

    // chartOptions – same as before (can also be memoized)
    const isDark = document.documentElement.classList.contains('dark');
    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: {
                display: true,
                text: 'Most Frequent Journal Concerns',
                font: { family: 'Poppins', size: 20, weight: '600' },
                color: isDark ? '#E0E0E0' : '#1E1A3E',
            },
            tooltip: {
                callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed.y} entries` },
                backgroundColor: isDark ? 'rgba(45,55,72,0.9)' : 'rgba(255,255,255,0.9)',
                titleColor: isDark ? '#E0E0E0' : '#1E1A3E',
                bodyColor: isDark ? '#A0AEC0' : 'rgb(75,85,99)',
                borderColor: isDark ? '#4A5568' : '#E2E8F0',
                borderWidth: 1,
                borderRadius: 6,
            },
        },
        scales: {
            x: {
                title: { display: true, text: 'Concern Category', color: isDark ? '#E0E0E0' : 'rgb(75,85,99)' },
                ticks: { color: isDark ? '#A0AEC0' : 'rgb(75,85,99)', maxRotation: 45, minRotation: 45 },
                grid: { display: false },
            },
            y: {
                beginAtZero: true,
                title: { display: true, text: 'Number of Entries', color: isDark ? '#E0E0E0' : 'rgb(75,85,99)' },
                ticks: { color: isDark ? '#A0AEC0' : 'rgb(75,85,99)', stepSize: 1, callback: v => v % 1 === 0 ? v : '' },
                grid: { color: isDark ? 'rgba(100,100,100,0.2)' : 'rgba(200,200,200,0.2)' },
            },
        },
        animation: { duration: 1000, easing: 'easeInOutQuart' },
    }), [isDark]);

    return (
        <div className="h-80 w-full">
            <Bar data={chartData} options={chartOptions} />
        </div>
    );
}

export default ConcernFrequencyChart;
