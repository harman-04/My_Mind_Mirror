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


function AverageEmotionChart({ entries }) {
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
                            // Emotions are already parsed to an object in JournalEntryResponse
                            parsedEmotions = entry.emotions;
                            if (typeof parsedEmotions !== 'object' || parsedEmotions === null) parsedEmotions = {};
                        } catch (e) {
                            console.error("Error parsing emotions for AverageEmotionChart:", e);
                            parsedEmotions = {};
                        }
                    }

                    Object.entries(parsedEmotions).forEach(([emotion, score]) => {
                        // Ensure score is a number before adding
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

                // Sort emotions by average intensity (descending) and take top N
                const sortedAverages = Object.entries(averageEmotions)
                    .sort(([, avgA], [, avgB]) => avgB - avgA)
                    .slice(0, 7); // Show top 7 average emotions

                const labels = sortedAverages.map(([emotion]) => 
                    emotion.charAt(0).toUpperCase() + emotion.slice(1) // Capitalize
                );
                const data = sortedAverages.map(([, avg]) => avg);
                
                // ⭐ FIX: Dynamically select colors based on theme ⭐
                const rootElement = document.documentElement;
                const isDarkMode = rootElement.classList.contains('dark');
                const selectedColorPalette = isDarkMode ? EMOTION_BAR_COLORS_DARK : EMOTION_BAR_COLORS;

                const backgroundColors = labels.map(label => selectedColorPalette[label.toLowerCase()] || '#CCCCCC');

                setChartData({
                    labels: labels,
                    datasets: [
                        {
                            label: 'Average Intensity',
                            data: data,
                            backgroundColor: backgroundColors,
                            borderColor: backgroundColors.map(color => color + 'CC'), // Slightly darker border
                            borderWidth: 1,
                            borderRadius: 5, // Rounded bars
                        },
                    ],
                });
                console.log("Processed average emotion data:", sortedAverages);
            } catch (err) {
                console.error('Error processing average emotion data:', err);
                setError('Failed to process average emotion data.');
            } finally {
                setLoading(false);
            }
        };

        processEmotionAverages();
    }, [entries]); // Re-process when journalEntries change

    if (loading) {
        return <div className="font-inter text-gray-700 dark:text-gray-300 text-center">Loading average emotions...</div>;
    }

    if (error) {
        return <div className="font-inter text-[#FF8A7A] text-center">{error}</div>;
    }

    if (chartData.labels.length === 0) {
        return (
            <div className="h-80 w-full flex items-center justify-center font-inter text-gray-700 dark:text-gray-300">
                No emotion data available yet. Journal more to see your average emotional landscape!
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
                color: '#1E1A3E', // Default dark text for light mode
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
                title: { display: true, text: 'Emotion', font: { family: 'Inter', size: 14 }, color: 'rgb(75, 85, 99)' },
                ticks: { color: 'rgb(75, 85, 99)', font: { family: 'Inter' } },
                grid: { display: false },
            },
            y: {
                beginAtZero: true,
                max: 1.0, // Emotion scores are 0-1
                title: { display: true, text: 'Average Intensity', font: { family: 'Inter', size: 14 }, color: 'rgb(75, 85, 99)' },
                ticks: {
                    color: 'rgb(75, 85, 99)',
                    font: { family: 'Inter' },
                    stepSize: 0.2,
                },
                grid: { color: 'rgba(200, 200, 200, 0.2)' },
            },
        },
    };

    // Adjust chart colors for dark mode dynamically
    const rootElement = document.documentElement;
    if (rootElement.classList.contains('dark')) {
        chartOptions.plugins.title.color = '#E0E0E0';
        chartOptions.scales.x.title.color = '#E0E0E0';
        chartOptions.scales.x.ticks.color = '#E0E0E0';
        chartOptions.scales.y.title.color = '#E0E0E0';
        chartOptions.scales.y.ticks.color = '#E0E0E0';
        chartOptions.scales.y.grid.color = 'rgba(100, 100, 100, 0.2)';
    }

    return (
        <div className="h-80 w-full">
            <Bar data={chartData} options={chartOptions} />
        </div>
    );
}

export default AverageEmotionChart;