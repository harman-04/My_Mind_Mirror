// src/components/charts/EmotionDistributionChart.jsx
// This component refines the Average Emotion Intensity Bar Chart using Chart.js

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
} from 'chart.js';
import { EMOTION_COLORS_LIGHT, EMOTION_COLORS_DARK, CHART_THEME_COLORS } from '../utils/chartColors'; // Import centralized colors

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

function EmotionDistributionChart({ entries }) {
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Determine theme for dynamic colors
    const isDarkMode = document.documentElement.classList.contains('dark');
    const selectedEmotionColors = isDarkMode ? EMOTION_COLORS_DARK : EMOTION_COLORS_LIGHT;
    const chartThemeColors = isDarkMode ? CHART_THEME_COLORS.dark : CHART_THEME_COLORS.light;

    useEffect(() => {
        const processEmotionAverages = () => {
            setLoading(true);
            setError('');
            try {
                const emotionSums = {};
                const emotionCounts = {};

                entries.forEach(entry => {
                    let parsedEmotions = {};
                    if (entry.emotions) {
                        try {
                            parsedEmotions = entry.emotions;
                            if (typeof parsedEmotions !== 'object' || parsedEmotions === null) parsedEmotions = {};
                        } catch (e) {
                            console.error("Error parsing emotions for EmotionDistributionChart:", e);
                            parsedEmotions = {};
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
                    .slice(0, 7); // Show top 7 average emotions

                const labels = sortedAverages.map(([emotion]) =>
                    emotion.charAt(0).toUpperCase() + emotion.slice(1) // Capitalize
                );
                const data = sortedAverages.map(([, avg]) => avg);

                const backgroundColors = labels.map(label => selectedEmotionColors[label.toLowerCase()] || '#CCCCCC');
                const borderColors = backgroundColors.map(color => color + 'CC'); // Slightly darker border

                setChartData({
                    labels: labels,
                    datasets: [
                        {
                            label: 'Average Intensity',
                            data: data,
                            backgroundColor: backgroundColors,
                            borderColor: borderColors,
                            borderWidth: 1,
                            borderRadius: 5, // Rounded bars
                        },
                    ],
                });
                console.log("Processed average emotion data for EmotionDistributionChart:", sortedAverages);
            } catch (err) {
                console.error('Error processing emotion data for chart:', err);
                setError('Failed to process emotion data.');
            } finally {
                setLoading(false);
            }
        };

        processEmotionAverages();
    }, [entries, isDarkMode]); // Re-process when entries or theme changes

    if (loading) {
        return <div className="font-inter text-gray-700 dark:text-gray-300 text-center">Loading emotion distribution...</div>;
    }

    if (error) {
        return <div className="font-inter text-[#FF8A7A] text-center">{error}</div>;
    }

    if (chartData.labels.length === 0) {
        return (
            <div className="h-80 w-full flex items-center justify-center font-inter text-gray-700 dark:text-gray-300">
                No emotion data available yet. Journal more to see your emotional landscape!
            </div>
        );
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false, // No need for legend for single dataset bar chart
            },
            title: {
                display: true,
                text: 'Average Emotion Intensity Across Entries',
                font: { family: 'Poppins', size: 20, weight: '600' },
                color: chartThemeColors.textColor,
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y.toFixed(3);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                title: { display: true, text: 'Emotion', font: { family: 'Inter', size: 14 }, color: chartThemeColors.textColor },
                ticks: { color: chartThemeColors.secondaryTextColor, font: { family: 'Inter' } },
                grid: { display: false },
            },
            y: {
                beginAtZero: true,
                max: 1.0, // Emotion scores are 0-1
                title: { display: true, text: 'Average Intensity', font: { family: 'Inter', size: 14 }, color: chartThemeColors.textColor },
                ticks: {
                    color: chartThemeColors.secondaryTextColor,
                    font: { family: 'Inter' },
                    stepSize: 0.2,
                },
                grid: { color: chartThemeColors.gridColor },
            },
        },
    };

    return (
        <div className={`p-6 rounded-xl shadow-lg transition-all duration-300 ${isDarkMode ? 'bg-black/40' : 'bg-white/60'}`}>
            <div className="h-80 w-full">
                <Bar data={chartData} options={chartOptions} />
            </div>
        </div>
    );
}

export default EmotionDistributionChart;
