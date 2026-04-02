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
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);


// Define a consistent color palette for emotions (use distinct colors)
const EMOTION_BAR_COLORS = {
    'joy': '#5CC8C2',         // Serene Teal
    'sadness': '#B399D4',     // Gentle Lavender
    'anger': '#FF8A7A',       // Warm Coral
    'fear': '#A93226',        // Darker Red
    'surprise': '#85C1E9',    // Light Blue
    'neutral': '#E0E0E0',     // Soft Gray (Light Mode)
    'love': '#E74C3C',        // Red
    'disgust': '#6C3483',     // Purple
    'anxiety': '#F7DC6F',     // Yellow
    'optimism': '#F1C40F',    // Golden Yellow
    'relief': '#58D68D',      // Light Green
    'caring': '#2ECC71',      // Green
    'curiosity': '#AF7AC5',   // Light Purple
    'embarrassment': '#D35400', // Dark Orange
    'pride': '#F39C12',       // Orange
    'remorse': '#7F8C8D',     // Gray
    'annoyance': '#E67E22',   // Orange-Brown
    'disappointment': '#283747', // Dark Blue-Gray
    'grief': '#17202A',       // Very Dark Blue-Gray
    'excitement': '#FFD700',  // Gold
    'contentment': '#90EE90', // Light Green
    'frustration': '#FF4500', // Orange-Red
    'gratitude': '#ADFF2F',   // Green-Yellow
    'hope': '#ADD8E6',        // Light Blue
};

// Dark mode specific colors for bars if needed, otherwise just use EMOTION_BAR_COLORS
const EMOTION_BAR_COLORS_DARK = {
    'joy': '#8DE2DD',
    'sadness': '#C7B3E6',
    'anger': '#FFB0A4',
    'fear': '#D45E4D',
    'surprise': '#B0D9F7',
    'neutral': '#A0A0A0',
    'love': '#FF7F7F',
    'disgust': '#9B6EB4',
    'anxiety': '#FFF0B3',
    'optimism': '#FFD750',
    'relief': '#8CE0B0',
    'caring': '#58D68D',
    'curiosity': '#C79BE0',
    'embarrassment': '#FF8C40',
    'pride': '#FFC050',
    'remorse': '#B0B8B8',
    'annoyance': '#FFAB66',
    'disappointment': '#506A80',
    'grief': '#404040',
    'excitement': '#FFE680',
    'contentment': '#C0FFC0',
    'frustration': '#FF7F50',
    'gratitude': '#D0FF80',
    'hope': '#C0E0FF',
};


function AverageEmotionChart({ entries, isLoading }) {
    // If parent says loading, show skeleton
    if (isLoading) return <SkeletonChart />;

    // Compute chart data directly from entries using useMemo
    const { chartData, error } = useMemo(() => {
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
                        console.error("Error parsing emotions:", e);
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
                .slice(0, 7);

            const labels = sortedAverages.map(([emotion]) =>
                emotion.charAt(0).toUpperCase() + emotion.slice(1)
            );
            const data = sortedAverages.map(([, avg]) => avg);

            const isDarkMode = document.documentElement.classList.contains('dark');
            const selectedColorPalette = isDarkMode ? EMOTION_BAR_COLORS_DARK : EMOTION_BAR_COLORS;
            const backgroundColors = labels.map(label => selectedColorPalette[label.toLowerCase()] || '#CCCCCC');

            return {
                chartData: {
                    labels,
                    datasets: [{
                        label: 'Average Intensity',
                        data,
                        backgroundColor: backgroundColors,
                        borderColor: backgroundColors.map(color => color + 'CC'),
                        borderWidth: 1,
                        borderRadius: 5,
                    }],
                },
                error: null,
            };
        } catch (err) {
            console.error('Error processing average emotion data:', err);
            return { chartData: null, error: 'Failed to process average emotion data.' };
        }
    }, [entries]);

    if (error) {
        return <div className="font-inter text-[#FF8A7A] text-center">{error}</div>;
    }

    if (!chartData || chartData.labels.length === 0) {
        return (
            <div className="h-80 w-full flex items-center justify-center font-inter text-gray-700 dark:text-gray-300">
                No emotion data available yet. Journal more to see your average emotional landscape!
            </div>
        );
    }

    // Chart options (same as before, but can be moved to useMemo if needed)
    const chartOptions = useMemo(() => {
        const isDarkMode = document.documentElement.classList.contains('dark');
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Average Emotion Intensity Across Entries',
                    font: { family: 'Poppins', size: 20, weight: '600' },
                    color: isDarkMode ? '#E0E0E0' : '#1E1A3E',
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.label}: ${context.parsed.y.toFixed(3)}`,
                    },
                },
            },
            scales: {
                x: {
                    title: { display: true, text: 'Emotion', font: { family: 'Inter', size: 14 }, color: isDarkMode ? '#E0E0E0' : 'rgb(75, 85, 99)' },
                    ticks: { color: isDarkMode ? '#E0E0E0' : 'rgb(75, 85, 99)' },
                    grid: { display: false },
                },
                y: {
                    beginAtZero: true,
                    max: 1.0,
                    title: { display: true, text: 'Average Intensity', font: { family: 'Inter', size: 14 }, color: isDarkMode ? '#E0E0E0' : 'rgb(75, 85, 99)' },
                    ticks: { color: isDarkMode ? '#E0E0E0' : 'rgb(75, 85, 99)', stepSize: 0.2 },
                    grid: { color: isDarkMode ? 'rgba(100, 100, 100, 0.2)' : 'rgba(200, 200, 200, 0.2)' },
                },
            },
        };
    }, []);

    return (
        <div className="h-80 w-full">
            <Bar data={chartData} options={chartOptions} />
        </div>
    );
}

export default AverageEmotionChart;
