// src/components/DailyEmotionSnapshot.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useTheme } from '../contexts/ThemeContext';
import DownloadChartButton from './DownloadChartButton';
import { Smile } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

const EMOTION_DOUGHNUT_COLORS = {
    joy: '#5CC8C2',
    sadness: '#B399D4',
    anger: '#FF8A7A',
    fear: '#A93226',
    surprise: '#85C1E9',
    neutral: '#E0E0E0',
    love: '#E74C3C',
    disgust: '#6C3483',
    anxiety: '#F7DC6F',
    optimism: '#F1C40F',
    relief: '#58D68D',
    caring: '#2ECC71',
    curiosity: '#AF7AC5',
    embarrassment: '#D35400',
    pride: '#F39C12',
    remorse: '#7F8C8D',
    annoyance: '#E67E22',
    disappointment: '#283747',
    grief: '#17202A',
    excitement: '#FFD700',
    contentment: '#90EE90',
    frustration: '#FF4500',
    gratitude: '#ADFF2F',
    hope: '#ADD8E6',
};

function DailyEmotionSnapshot({ todayEntries }) {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const chartContainerRef = useRef(null);
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });

    useEffect(() => {
        if (!todayEntries || todayEntries.length === 0) {
            setChartData({ labels: [], datasets: [] });
            return;
        }

        // Aggregate emotions across all today's entries
        const aggregated = {};
        let totalEntries = todayEntries.length;

        todayEntries.forEach(entry => {
            let emotions = {};
            try {
                emotions = typeof entry.emotions === 'string' ? JSON.parse(entry.emotions) : entry.emotions;
                if (typeof emotions !== 'object' || emotions === null) emotions = {};
            } catch (e) {
                emotions = {};
            }
            Object.entries(emotions).forEach(([emotion, score]) => {
                aggregated[emotion] = (aggregated[emotion] || 0) + score;
            });
        });

        // Average the scores
        Object.keys(aggregated).forEach(emotion => {
            aggregated[emotion] = aggregated[emotion] / totalEntries;
        });

        // Filter out low scores (> 0.01) and prepare chart data
        const labels = [];
        const data = [];
        Object.entries(aggregated).forEach(([emotion, score]) => {
            if (score > 0.01) {
                labels.push(emotion.charAt(0).toUpperCase() + emotion.slice(1));
                data.push(score);
            }
        });

        if (labels.length === 0) {
            setChartData({ labels: [], datasets: [] });
            return;
        }

        const backgroundColors = labels.map(label =>
            EMOTION_DOUGHNUT_COLORS[label.toLowerCase()] || '#CCCCCC'
        );

        setChartData({
            labels,
            datasets: [{
                label: 'Emotion Intensity',
                data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(c => c + 'CC'),
                borderWidth: 1,
            }],
        });
    }, [todayEntries]);

    // Chart options – theme aware, title moved to header
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: isDarkMode ? '#E0E0E0' : '#2D3748',
                    font: { family: 'Inter, sans-serif', size: 11 },
                    boxWidth: 12,
                    usePointStyle: true,
                },
            },
            tooltip: {
                callbacks: {
                    label: ctx => `${ctx.label}: ${(ctx.parsed * 100).toFixed(1)}%`,
                },
                backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                titleColor: isDarkMode ? '#E0E0E0' : '#1E1A3E',
                bodyColor: isDarkMode ? '#A0AEC0' : '#4B5563',
                borderColor: isDarkMode ? '#4A5568' : '#E2E8F0',
                borderWidth: 1,
            },
            title: { display: false }, // title now in card header
        },
        cutout: '60%',
    };

    const hasData = chartData.datasets.length > 0 && chartData.datasets[0].data.some(v => v > 0);

    // Empty state
    if (!hasData) {
        return (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-300">
                <div className="flex justify-between items-center p-4 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm">
                    <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200">
                        Today's Emotion Breakdown
                    </h3>
                    <DownloadChartButton
                        chartRef={chartContainerRef}
                        filename="daily_emotion_snapshot"
                        darkMode={isDarkMode}
                        className="hover:scale-105 transition-transform opacity-50 pointer-events-none"
                    />
                </div>
                <div
                    ref={chartContainerRef}
                    className="p-8 flex flex-col items-center justify-center text-center"
                    style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}
                >
                    <Smile size={48} className="text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 font-medium">No emotion data available for today</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Journal an entry to see your emotion breakdown!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-300">
            {/* Header with title and download button */}
            <div className="flex justify-between items-center p-4 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm">
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200">
                    Today's Emotion Breakdown
                </h3>
                <DownloadChartButton
                    chartRef={chartContainerRef}
                    filename="daily_emotion_snapshot"
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
                <div className="relative w-full h-[220px] md:h-[260px]">
                    <Doughnut data={chartData} options={options} />
                </div>
            </div>
        </div>
    );
}

export default DailyEmotionSnapshot;