import React, { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { parseISO, format } from 'date-fns';

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

function DailyEmotionSnapshot({ latestEntry }) {
    const chartRef = useRef(null);
    const [chartData, setChartData] = useState({
        labels: [],
        datasets: []
    });

    useEffect(() => {
        if (latestEntry && latestEntry.emotions) {
            try {
                // Defensive parsing: emotions should already be an object from Spring Boot's JournalEntryResponse
                const emotions = typeof latestEntry.emotions === 'string' 
                                 ? JSON.parse(latestEntry.emotions) 
                                 : latestEntry.emotions;

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

                const backgroundColors = filteredLabels.map(label => EMOTION_DOUGHNUT_COLORS[label.toLowerCase()] || '#CCCCCC');

                setChartData({
                    labels: filteredLabels,
                    datasets: [
                        {
                            label: 'Emotion Intensity',
                            data: filteredData,
                            backgroundColor: backgroundColors,
                            borderColor: backgroundColors.map(color => color + 'CC'),
                            borderWidth: 1,
                        },
                    ],
                });
            } catch (e) {
                console.error("Error parsing emotions for DailyEmotionSnapshot:", e);
                setChartData({ labels: [], datasets: [] }); // Reset on error
            }
        } else {
            setChartData({ labels: [], datasets: [] }); // Clear chart if no latest entry or emotions
        }
    }, [latestEntry]);

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
            },
            title: {
                display: true,
                text: "Today's Emotion Breakdown",
                font: { family: 'Poppins', size: 18, weight: '600' },
                color: '#1E1A3E', // Default dark text for light mode
            },
        },
        cutout: '60%', // Makes it a doughnut chart
    };

    // Adjust emotion chart colors for dark mode dynamically
    const rootElement = document.documentElement;
    if (rootElement.classList.contains('dark')) {
        options.plugins.legend.labels.color = '#E0E0E0';
        options.plugins.title.color = '#E0E0E0';
    }

    const hasData = chartData.datasets.length > 0 && chartData.datasets[0].data.some(val => val > 0);

    return (
        <div className="p-6 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner flex flex-col items-center justify-center transition-all duration-500 min-h-[250px] md:min-h-[300px]">
            <h2 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">
                Today's Emotion Breakdown
            </h2>
            {/* ⭐ FIX: Show chart if there's any data, regardless of it being today's entry ⭐ */}
            {hasData ? ( 
                <div className="relative w-full h-[200px] md:h-[250px]"> {/* Fixed height for chart container */}
                    <Doughnut ref={chartRef} data={chartData} options={options} />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 dark:text-gray-400">
                    <p className="font-inter text-lg">No emotion data available for display.</p>
                    {latestEntry && latestEntry.entryDate !== format(new Date(), 'yyyy-MM-dd') && (
                        <p className="font-inter text-sm mt-2">Last entry was on {format(parseISO(latestEntry.entryDate), 'MMMM d,yyyy')}.</p>
                    )}
                    {!latestEntry && (
                         <p className="font-inter text-sm mt-2">Journal an entry to see your emotion breakdown!</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default DailyEmotionSnapshot;
