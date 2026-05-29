import React, { useMemo, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { SkeletonChart } from './Skeleton';
import { useTheme } from '../contexts/ThemeContext';
import DownloadChartButton from './DownloadChartButton';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Emotion colors – light mode
const EMOTION_COLORS_LIGHT = {
    'overall mood score': '#B399D4',
    'joy': '#5CC8C2',
    'sadness': '#FF8A7A',
    'anger': '#A93226',
    'anxiety': '#F7DC6F',
    'fear': '#6C3483',
    'surprise': '#85C1E9',
    'neutral': '#E0E0E0',
    'disgust': '#D35400',
    'disappointment': '#283747',
    'remorse': '#7F8C8D',
    'grief': '#17202A',
    'optimism': '#F1C40F',
    'caring': '#2ECC71',
    'curiosity': '#AF7AC5',
    'relief': '#58D68D',
    'love': '#E74C3C',
    'pride': '#F39C12',
    'annoyance': '#E67E22',
    'excitement': '#FFD700',
    'contentment': '#90EE90',
    'frustration': '#FF4500',
    'gratitude': '#ADFF2F',
    'hope': '#ADD8E6',
};

// Emotion colors – dark mode
const EMOTION_COLORS_DARK = {
    'overall mood score': '#C7B3E6',
    'joy': '#8DE2DD',
    'sadness': '#FFB0A4',
    'anger': '#D45E4D',
    'anxiety': '#FFF0B3',
    'fear': '#9B6EB4',
    'surprise': '#B0D9F7',
    'neutral': '#A0A0A0',
    'disgust': '#FF8C40',
    'disappointment': '#506A80',
    'remorse': '#B0B8B8',
    'grief': '#404040',
    'optimism': '#FFD750',
    'caring': '#58D68D',
    'curiosity': '#C79BE0',
    'relief': '#8CE0B0',
    'love': '#FF7F7F',
    'pride': '#FFC050',
    'annoyance': '#FFAB66',
    'excitement': '#FFE680',
    'contentment': '#C0FFC0',
    'frustration': '#FF7F50',
    'gratitude': '#D0FF80',
    'hope': '#C0E0FF',
};

const MoodChart = ({ entries, isLoading }) => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const emotionColors = isDarkMode ? EMOTION_COLORS_DARK : EMOTION_COLORS_LIGHT;
    const chartContainerRef = useRef(null);

    // Process data only when entries change
    const { moodData, emotionTrendData } = useMemo(() => {
        if (!entries || entries.length === 0) return { moodData: [], emotionTrendData: {} };

        const moodPoints = entries
            .filter(entry => entry.moodScore !== null && entry.moodScore !== undefined)
            .map(entry => ({ date: entry.entryDate, moodScore: entry.moodScore }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const emotionMap = {};
        entries.forEach(entry => {
            if (entry.emotions) {
                let parsedEmotions = entry.emotions;
                if (typeof parsedEmotions === 'string') {
                    try { parsedEmotions = JSON.parse(parsedEmotions); } catch (e) { parsedEmotions = {}; }
                }
                if (typeof parsedEmotions === 'object' && parsedEmotions !== null) {
                    emotionMap[entry.entryDate] = parsedEmotions;
                }
            }
        });

        return { moodData: moodPoints, emotionTrendData: emotionMap };
    }, [entries]);

    // Prepare chart data
    const { chartData, chartOptions } = useMemo(() => {
        if (!moodData.length && Object.keys(emotionTrendData).length === 0) {
            return { chartData: { labels: [], datasets: [] }, chartOptions: {} };
        }

        const allDates = [...new Set([
            ...moodData.map(d => d.date),
            ...Object.keys(emotionTrendData)
        ])].sort((a, b) => new Date(a) - new Date(b));

        // Emotion datasets
        const emotionDatasets = [];
        const allEmotionLabels = new Set();
        Object.values(emotionTrendData).forEach(dayEmotions => {
            Object.keys(dayEmotions).forEach(label => allEmotionLabels.add(label));
        });

        const emotionsToShow = ['joy', 'sadness', 'anger', 'anxiety', 'fear', 'neutral'];

        emotionsToShow.forEach(emotionLabel => {
            if (allEmotionLabels.has(emotionLabel)) {
                emotionDatasets.push({
                    label: emotionLabel.charAt(0).toUpperCase() + emotionLabel.slice(1),
                    data: allDates.map(date => emotionTrendData[date]?.[emotionLabel] || 0),
                    borderColor: emotionColors[emotionLabel] || '#CCCCCC',
                    backgroundColor: (emotionColors[emotionLabel] || '#CCCCCC') + '33',
                    tension: 0.3,
                    pointBackgroundColor: emotionColors[emotionLabel] || '#CCCCCC',
                    pointBorderColor: emotionColors[emotionLabel] || '#CCCCCC',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: false,
                });
            }
        });

        // Main mood dataset
        const moodDataset = {
            label: 'Overall Mood Score',
            data: allDates.map(date => {
                const entry = moodData.find(d => d.date === date);
                return entry ? entry.moodScore : null;
            }),
            borderColor: emotionColors['overall mood score'],
            backgroundColor: emotionColors['overall mood score'] + '33',
            tension: 0.3,
            pointBackgroundColor: emotionColors['overall mood score'],
            pointBorderColor: emotionColors['overall mood score'],
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: 'origin',
            spanGaps: true,
        };

        const datasets = [moodDataset, ...emotionDatasets];

        // Theme-aware chart options
        const textColor = isDarkMode ? '#E0E0E0' : '#1E1A3E';
        const axisColor = isDarkMode ? '#E0E0E0' : 'rgb(75, 85, 99)';
        const gridColor = isDarkMode ? 'rgba(100, 100, 100, 0.2)' : 'rgba(200, 200, 200, 0.2)';

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { family: 'Inter', size: 12 }, color: axisColor, usePointStyle: true },
                },
                title: {
                    display: true,
                    text: 'Your Mood & Emotion Trends Over Time',
                    font: { family: 'Poppins', size: 16, weight: '600' },
                    color: textColor,
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(3) ?? 'N/A'}`,
                    },
                },
            },
            scales: {
                x: {
                    title: { display: true, text: 'Date', color: axisColor },
                    ticks: { color: axisColor, maxRotation: 45, autoSkip: true },
                    grid: { color: gridColor },
                },
                y: {
                    min: -1,
                    max: 1,
                    title: { display: true, text: 'Score / Intensity', color: axisColor },
                    ticks: { color: axisColor, stepSize: 0.5 },
                    grid: { color: gridColor },
                },
            },
        };

        return { chartData: { labels: allDates, datasets }, chartOptions: options };
    }, [moodData, emotionTrendData, emotionColors, isDarkMode]);

    if (isLoading) {
        return <SkeletonChart />;
    }

    if (!chartData.labels.length) {
        return (
            <div className="h-80 w-full flex items-center justify-center font-inter text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                Not enough data to display chart. Keep journaling!
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-300">
            {/* Header with title and download button */}
            <div className="flex justify-between items-center p-4 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200">
                    Mood & Emotion Trends
                </h3>
                <DownloadChartButton
                    chartRef={chartContainerRef}
                    filename="mood_trend_chart"
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
                <div className="h-96 w-full">
                    <Line data={chartData} options={chartOptions} />
                </div>
            </div>
        </div>
    );
};

export default React.memo(MoodChart);