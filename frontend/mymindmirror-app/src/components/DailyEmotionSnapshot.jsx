import React, { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { format, parseISO } from 'date-fns';

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
    const chartRef = useRef(null);
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

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: 'rgb(156 163 175)',
                    font: { family: 'Inter, sans-serif' },
                },
            },
            tooltip: {
                callbacks: {
                    label: ctx => `${ctx.label}: ${(ctx.parsed * 100).toFixed(1)}%`,
                },
            },
            title: {
                display: true,
                text: "Today's Emotion Breakdown",
                font: { family: 'Poppins', size: 18, weight: '600' },
                color: '#1E1A3E',
            },
        },
        cutout: '60%',
    };

    const root = document.documentElement;
    if (root.classList.contains('dark')) {
        options.plugins.legend.labels.color = '#E0E0E0';
        options.plugins.title.color = '#E0E0E0';
    }

    const hasData = chartData.datasets.length > 0 && chartData.datasets[0].data.some(v => v > 0);

    return (
        <div className="p-6 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner flex flex-col items-center justify-center transition-all duration-500 min-h-[250px] md:min-h-[300px]">
            {hasData ? (
                <div className="relative w-full h-[200px] md:h-[250px]">
                    <Doughnut ref={chartRef} data={chartData} options={options} />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 dark:text-gray-400">
                    <p className="font-inter text-lg">No emotion data available for today.</p>
                    <p className="font-inter text-sm mt-2">Journal an entry to see your emotion breakdown!</p>
                </div>
            )}
        </div>
    );
}

export default DailyEmotionSnapshot;