import React, { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Define a consistent color palette for emotions (expanded for more variety)
const EMOTION_DOUGHNUT_COLORS = {
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

// Dark mode specific colors for Doughnut chart slices
const EMOTION_DOUGHNUT_COLORS_DARK = {
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


function EmotionBreakdown({ emotionsData }) {
    const chartRef = useRef(null);
    const [chartData, setChartData] = useState({
        labels: [],
        datasets: []
    });

    useEffect(() => {
        if (emotionsData) {
            try {
                // DEFENSIVE PARSING: Check if emotionsData is a string before parsing
                const emotions = typeof emotionsData === 'string' 
                                 ? JSON.parse(emotionsData) 
                                 : emotionsData;

                // Ensure 'emotions' is an object before proceeding
                if (typeof emotions !== 'object' || emotions === null) {
                    console.warn("Emotions data is not a valid object after parsing/checking:", emotions);
                    setChartData({ labels: [], datasets: [] });
                    return;
                }

                const labels = Object.keys(emotions);
                const data = Object.values(emotions);

                // Filter out emotions with zero or very low scores for cleaner chart
                const filteredLabels = [];
                const filteredData = [];
                labels.forEach((label, index) => {
                    if (data[index] > 0.01) { // Only include if score is greater than 1%
                        filteredLabels.push(label.charAt(0).toUpperCase() + label.slice(1)); // Capitalize label
                        filteredData.push(data[index]);
                    }
                });

                // ⭐ FIX: Dynamically select colors based on theme ⭐
                const rootElement = document.documentElement;
                const isDarkMode = rootElement.classList.contains('dark');
                const selectedColorPalette = isDarkMode ? EMOTION_DOUGHNUT_COLORS_DARK : EMOTION_DOUGHNUT_COLORS;

                const backgroundColors = filteredLabels.map(label => selectedColorPalette[label.toLowerCase()] || '#CCCCCC');

                setChartData({
                    labels: filteredLabels,
                    datasets: [
                        {
                            label: 'Emotion Intensity',
                            data: filteredData,
                            backgroundColor: backgroundColors,
                            borderColor: backgroundColors.map(color => color + 'CC'), // Slightly darker border
                            borderWidth: 1,
                        },
                    ],
                });
            } catch (e) {
                console.error("Error parsing emotions for EmotionBreakdown:", e);
                setChartData({ labels: [], datasets: [] }); // Reset on error
            }
        } else {
            setChartData({ labels: [], datasets: [] }); // Clear chart if no emotions data
        }
    }, [emotionsData]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: 'rgb(156 163 175)', // Tailwind gray-400 for dark mode
                    font: {
                        family: 'Inter, sans-serif',
                    },
                },
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed !== null) {
                            label += `${(context.parsed * 100).toFixed(1)}%`;
                        }
                        return label;
                    }
                }
            }
        },
        cutout: '60%', // Makes it a doughnut chart
    };

    // Adjust legend/title colors for dark mode dynamically
    const rootElement = document.documentElement;
    if (rootElement.classList.contains('dark')) {
        options.plugins.legend.labels.color = '#E0E0E0';
        // Note: EmotionBreakdown doesn't have a title plugin, so no need to adjust title color here.
    }

    const hasData = chartData.datasets.length > 0 && chartData.datasets[0].data.some(val => val > 0);

    return (
        <div className="flex flex-col items-center justify-center min-h-[200px]">
            <h3 className="text-lg font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4">Emotion Breakdown</h3>
            {hasData ? (
                <div className="relative w-full h-[150px]"> {/* Adjusted height for smaller chart */}
                    <Doughnut ref={chartRef} data={chartData} options={options} />
                </div>
            ) : (
                <p className="text-gray-600 dark:text-gray-400 text-sm italic">
                    No detailed emotion data for this entry.
                </p>
            )}
        </div>
    );
}

export default EmotionBreakdown;
