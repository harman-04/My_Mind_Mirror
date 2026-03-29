// src/components/ConcernFrequencyChart.js

import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
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

// Register Chart.js components
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

function ConcernFrequencyChart({ entries }) {
    const [concernData, setConcernData] = useState({ labels: [], datasets: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const processConcerns = () => {
            setLoading(true);
            setError('');
            try {
                const concernCounts = {};
                entries.forEach(entry => {
                    let parsedConcerns = [];
                    if (entry.coreConcerns) {
                        try {
                            parsedConcerns = entry.coreConcerns;
                            if (!Array.isArray(parsedConcerns)) {
                                console.warn("Parsed coreConcerns is not an array:", parsedConcerns);
                                parsedConcerns = [];
                            }
                        } catch (e) {
                            console.error("Error parsing coreConcerns for ConcernFrequencyChart:", e);
                            parsedConcerns = [];
                        }
                    }

                    parsedConcerns.forEach(concern => {
                        if (typeof concern === 'string' && concern.trim() !== '') {
                            concernCounts[concern] = (concernCounts[concern] || 0) + 1;
                        }
                    });
                });

                const sortedConcerns = Object.entries(concernCounts)
                    .sort(([, countA], [, countB]) => countB - countA)
                    .slice(0, 7); // Show top 7 concerns

                const labels = sortedConcerns.map(([concern]) =>
                    concern.charAt(0).toUpperCase() + concern.slice(1)
                );
                const data = sortedConcerns.map(([, count]) => count);

                // ⭐ NEW: Dynamically select color palette based on theme ⭐
                const rootElement = document.documentElement;
                const isDarkMode = rootElement.classList.contains('dark');
                const selectedPalette = isDarkMode ? CONCERN_PALETTE_DARK : CONCERN_PALETTE_LIGHT;

                // Assign colors dynamically from the palette
                const backgroundColors = data.map((_, index) => selectedPalette[index % selectedPalette.length]);
                // Slightly darker border for definition
                const borderColors = backgroundColors.map(color => color + 'CC');

                setConcernData({
                    labels: labels,
                    datasets: [
                        {
                            label: 'Frequency',
                            data: data,
                            backgroundColor: backgroundColors,
                            borderColor: borderColors,
                            borderWidth: 1,
                            borderRadius: 8, // More rounded bars for a modern look
                            barPercentage: 0.8,
                            categoryPercentage: 0.8,
                        },
                    ],
                });
                console.log("Processed concern frequency data:", sortedConcerns);
            } catch (err) {
                console.error('Error processing concern data:', err);
                setError('Failed to process concern frequency data.');
            } finally {
                setLoading(false);
            }
        };

        processConcerns();
    }, [entries]);

    if (loading) {
        return <div className="font-inter text-gray-700 dark:text-gray-300 text-center">Loading concerns chart...</div>;
    }

    if (error) {
        return <div className="font-inter text-[#FF8A7A] text-center">{error}</div>;
    }

    if (concernData.labels.length === 0) {
        return (
            <div className="h-80 w-full flex items-center justify-center font-inter text-gray-700 dark:text-gray-300">
                No concerns detected yet. Journal more to see your patterns!
            </div>
        );
    }

    // Determine chart text/grid colors based on theme
    const rootElement = document.documentElement;
    const isDarkMode = rootElement.classList.contains('dark');
    const chartTextColor = isDarkMode ? '#E0E0E0' : '#1E1A3E'; // Title and axis labels
    const chartTickColor = isDarkMode ? '#A0AEC0' : 'rgb(75, 85, 99)'; // Axis ticks
    const chartGridColor = isDarkMode ? 'rgba(100, 100, 100, 0.2)' : 'rgba(200, 200, 200, 0.2)'; // Grid lines

    // Define chartOptions here, and then dynamically adjust based on theme
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: 'Most Frequent Journal Concerns',
                font: { family: 'Poppins', size: 20, weight: '600' },
                color: chartTextColor,
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y + ' entries';
                        }
                        return label;
                    }
                },
                // ⭐ ADDED: Tooltip background and text color based on theme ⭐
                backgroundColor: isDarkMode ? 'rgba(45, 55, 72, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                titleColor: chartTextColor,
                bodyColor: chartTickColor,
                borderColor: isDarkMode ? '#4A5568' : '#E2E8F0',
                borderWidth: 1,
                borderRadius: 6,
            }
        },
        scales: {
            x: {
                title: { display: true, text: 'Concern Category', font: { family: 'Inter', size: 14 }, color: chartTextColor },
                ticks: {
                    color: chartTickColor,
                    font: { family: 'Inter' },
                    maxRotation: 45,
                    minRotation: 45,
                    autoSkip: false,
                },
                grid: { display: false },
            },
            y: {
                beginAtZero: true,
                title: { display: true, text: 'Number of Entries', font: { family: 'Inter', size: 14 }, color: chartTextColor },
                ticks: {
                    color: chartTickColor,
                    font: { family: 'Inter' },
                    stepSize: 1,
                    callback: function(value) { if (value % 1 === 0) return value; }
                },
                grid: { color: chartGridColor },
            },
        },
        // ⭐ ADDED: Animation for a smoother look ⭐
        animation: {
            duration: 1000, // milliseconds
            easing: 'easeInOutQuart', // Smooth easing function
        },
    };

    return (
        <div className="h-80 w-full">
            <Bar data={concernData} options={chartOptions} />
        </div>
    );
}

export default ConcernFrequencyChart;
