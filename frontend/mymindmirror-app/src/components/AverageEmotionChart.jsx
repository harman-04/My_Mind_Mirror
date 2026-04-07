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
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

// Emotion colors – light mode
const EMOTION_BAR_COLORS_LIGHT = {
    'joy': '#5CC8C2',
    'sadness': '#B399D4',
    'anger': '#FF8A7A',
    'fear': '#A93226',
    'surprise': '#85C1E9',
    'neutral': '#E0E0E0',
    'love': '#E74C3C',
    'disgust': '#6C3483',
    'anxiety': '#F7DC6F',
    'optimism': '#F1C40F',
    'relief': '#58D68D',
    'caring': '#2ECC71',
    'curiosity': '#AF7AC5',
    'embarrassment': '#D35400',
    'pride': '#F39C12',
    'remorse': '#7F8C8D',
    'annoyance': '#E67E22',
    'disappointment': '#283747',
    'grief': '#17202A',
    'excitement': '#FFD700',
    'contentment': '#90EE90',
    'frustration': '#FF4500',
    'gratitude': '#ADFF2F',
    'hope': '#ADD8E6',
};

// Emotion colors – dark mode
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

const AverageEmotionChart = ({ entries, isLoading }) => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const emotionColors = isDarkMode ? EMOTION_BAR_COLORS_DARK : EMOTION_BAR_COLORS_LIGHT;
    const chartContainerRef = useRef(null);

    // Compute chart data from entries
    const { chartData, error } = useMemo(() => {
        if (!entries || entries.length === 0) {
            return { chartData: null, error: null };
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
            const backgroundColors = labels.map(label =>
                emotionColors[label.toLowerCase()] || '#CCCCCC'
            );

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
    }, [entries, emotionColors]);

    // Chart options (theme-aware)
    const chartOptions = useMemo(() => {
        const textColor = isDarkMode ? '#E0E0E0' : '#1E1A3E';
        const axisColor = isDarkMode ? '#E0E0E0' : 'rgb(75, 85, 99)';
        const gridColor = isDarkMode ? 'rgba(100, 100, 100, 0.2)' : 'rgba(200, 200, 200, 0.2)';

        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Average Emotion Intensity',
                    font: { family: 'Poppins', size: 16, weight: '600' },
                    color: textColor,
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.label}: ${context.parsed.y.toFixed(3)}`,
                    },
                },
            },
            scales: {
                x: {
                    title: { display: true, text: 'Emotion', font: { family: 'Inter', size: 12 }, color: axisColor },
                    ticks: { color: axisColor, maxRotation: 45, autoSkip: true },
                    grid: { display: false },
                },
                y: {
                    beginAtZero: true,
                    max: 1.0,
                    title: { display: true, text: 'Average Intensity', font: { family: 'Inter', size: 12 }, color: axisColor },
                    ticks: { color: axisColor, stepSize: 0.2 },
                    grid: { color: gridColor },
                },
            },
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
                No emotion data available yet. Keep journaling to see your average emotional landscape!
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-300">
            {/* Header with title and download button */}
            <div className="flex justify-between items-center p-4 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200">
                    Average Emotion Intensity
                </h3>
                <DownloadChartButton
                    chartRef={chartContainerRef}
                    filename="average_emotion_chart"
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
};

export default AverageEmotionChart;