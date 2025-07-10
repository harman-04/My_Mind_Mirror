import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler, // Import Filler for area under the line
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler // Register Filler plugin
);

// Define a consistent color palette for emotions
const EMOTION_COLORS_LIGHT = {
    'overall mood score': '#B399D4', // Gentle Lavender for overall mood
    'joy': '#5CC8C2',         // Serene Teal
    'sadness': '#FF8A7A',     // Warm Coral (Distinct from mood score)
    'anger': '#A93226',       // Darker Red
    'anxiety': '#F7DC6F',     // Yellowish for caution
    'fear': '#6C3483',        // Purple-ish
    'surprise': '#85C1E9',    // Light Blue for surprise
    'neutral': '#E0E0E0',     // Soft Gray
    'disgust': '#D35400',     // Dark Orange
    'disappointment': '#283747', // Dark blue-gray
    'remorse': '#7F8C8D',     // Gray
    'grief': '#17202A',       // Very dark blue-gray
    'optimism': '#F1C40F',    // Golden yellow
    'caring': '#2ECC71',      // Green
    'curiosity': '#AF7AC5',   // Light purple
    'relief': '#58D68D',      // Light green
    'love': '#E74C3C',        // Red
    'pride': '#F39C12',       // Orange
    'annoyance': '#E67E22',   // Orange
    'excitement': '#FFD700',  // Gold
    'contentment': '#90EE90', // Light Green
    'frustration': '#FF4500', // Orange-Red
    'gratitude': '#ADFF2F',   // Green-Yellow
    'hope': '#ADD8E6',        // Light Blue
};

const EMOTION_COLORS_DARK = {
    'overall mood score': '#C7B3E6', // Lighter Gentle Lavender for dark mode mood
    'joy': '#8DE2DD',
    'sadness': '#FFB0A4',     // Lighter Warm Coral
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


function MoodChart({ entries }) {
    const [moodData, setMoodData] = useState([]);
    const [emotionTrendData, setEmotionTrendData] = useState({}); // Stores emotion scores per date
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const processMoodAndEmotionData = () => {
            setLoading(true);
            setError('');
            try {
                const fetchedEntries = entries;

                // Process data for Mood Score chart
                const processedMoodData = fetchedEntries
                    .filter(entry => entry.moodScore !== null)
                    .map(entry => ({ date: entry.entryDate, moodScore: entry.moodScore }))
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
                setMoodData(processedMoodData);

                // Process data for Emotion Trends chart
                const newEmotionTrendData = {}; // {date: {emotion: score, ...}}
                fetchedEntries.forEach(entry => {
                    if (entry.emotions) {
                        let parsedEmotions = {};
                        try {
                            // Emotions are already parsed to an object in JournalEntryResponse
                            parsedEmotions = entry.emotions;
                            if (typeof parsedEmotions !== 'object' || parsedEmotions === null) parsedEmotions = {};
                        } catch (e) {
                            console.error("Error parsing entry.emotions for MoodChart:", e);
                            parsedEmotions = {};
                        }
                        newEmotionTrendData[entry.entryDate] = parsedEmotions;
                    }
                });
                setEmotionTrendData(newEmotionTrendData);

                console.log("Fetched mood chart data:", processedMoodData);
                console.log("Processed emotion trend data:", newEmotionTrendData);

            } catch (err) {
                console.error('Error processing mood/emotion data for chart:', err);
                setError('Failed to load mood/emotion chart data.');
            } finally {
                setLoading(false);
            }
        };

        processMoodAndEmotionData();
    }, [entries]); // Re-run effect when journalEntries change (new entry added)

    if (loading) {
        return <div className="font-inter text-gray-700 dark:text-gray-300 text-center">Loading charts...</div>;
    }

    if (error) {
        return <div className="font-inter text-[#FF8A7A] text-center">{error}</div>;
    }

    // Get all unique dates from moodData for x-axis labels
    const allDates = [...new Set(moodData.map(d => d.date))].sort();

    // ⭐ FIX: Dynamically select color palette based on theme ⭐
    const rootElement = document.documentElement;
    const isDarkMode = rootElement.classList.contains('dark');
    const selectedEmotionColors = isDarkMode ? EMOTION_COLORS_DARK : EMOTION_COLORS_LIGHT;


    // Dynamically create datasets for top emotions
    const emotionDatasets = [];
    const allEmotionLabels = new Set();
    Object.values(emotionTrendData).forEach(dayEmotions => {
        Object.keys(dayEmotions).forEach(label => allEmotionLabels.add(label));
    });

    // Filter for common/important emotions to display (e.g., top 3-5)
    // ⭐ FIX: Ensure 'sadness' is included and has a distinct color ⭐
    const emotionsToShow = ['joy', 'sadness', 'anger', 'anxiety', 'fear', 'neutral'];

    emotionsToShow.forEach(emotionLabel => {
        if (allEmotionLabels.has(emotionLabel)) {
            emotionDatasets.push({
                label: emotionLabel.charAt(0).toUpperCase() + emotionLabel.slice(1), // Capitalize
                data: allDates.map(date => {
                    const dayEmotions = emotionTrendData[date];
                    return dayEmotions ? dayEmotions[emotionLabel] || 0 : 0;
                }),
                borderColor: selectedEmotionColors[emotionLabel] || '#CCCCCC', // Fallback color
                backgroundColor: (selectedEmotionColors[emotionLabel] || '#CCCCCC') + '33', // Add transparency
                tension: 0.3, // Smooth curves
                pointBackgroundColor: selectedEmotionColors[emotionLabel] || '#CCCCCC',
                pointBorderColor: selectedEmotionColors[emotionLabel] || '#CCCCCC',
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: false, // Don't fill for emotion lines
            });
        }
    });

    // Main chart data for Mood Score and Emotion Trends
    const chartData = {
        labels: allDates,
        datasets: [
            {
                label: 'Overall Mood Score',
                data: allDates.map(date => {
                    const moodEntry = moodData.find(d => d.date === date);
                    return moodEntry ? moodEntry.moodScore : null; // Use null for gaps
                }),
                borderColor: selectedEmotionColors['overall mood score'], // ⭐ FIX: Use distinct color ⭐
                backgroundColor: selectedEmotionColors['overall mood score'] + '33', // With transparency
                tension: 0.3,
                pointBackgroundColor: selectedEmotionColors['overall mood score'],
                pointBorderColor: selectedEmotionColors['overall mood score'],
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: 'origin', // ⭐ FIX: Fill area under the line ⭐
                spanGaps: true, // Connect gaps where data is null
            },
            ...emotionDatasets, // Add emotion trend datasets
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: { family: 'Inter', size: 14 },
                    color: 'rgb(75, 85, 99)', // Default text color for legend
                },
            },
            title: {
                display: true,
                text: 'Your Mood & Emotion Trends Over Time',
                font: { family: 'Poppins', size: 20, weight: '600' },
                color: '#1E1A3E', // Dark text for light mode
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y.toFixed(3); // More precision for emotion scores
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                title: { display: true, text: 'Date', font: { family: 'Inter', size: 14 }, color: 'rgb(75, 85, 99)' },
                ticks: { color: 'rgb(75, 85, 99)', font: { family: 'Inter' } },
                grid: { color: 'rgba(200, 200, 200, 0.2)' },
            },
            y: {
                min: -1, // For mood score
                max: 1,  // For mood score and emotion intensity (0 to 1)
                title: { display: true, text: 'Score / Intensity', font: { family: 'Inter', size: 14 }, color: 'rgb(75, 85, 99)' },
                ticks: { color: 'rgb(75, 85, 99)', font: { family: 'Inter' } },
                grid: { color: 'rgba(200, 200, 200, 0.2)' },
            },
        },
    };

    // Adjust chart colors for dark mode dynamically
    if (isDarkMode) { // Use the already determined isDarkMode
        chartOptions.plugins.legend.labels.color = '#E0E0E0';
        chartOptions.plugins.title.color = '#E0E0E0';
        chartOptions.scales.x.title.color = '#E0E0E0';
        chartOptions.scales.x.ticks.color = '#E0E0E0';
        chartOptions.scales.x.grid.color = 'rgba(100, 100, 100, 0.2)';
        chartOptions.scales.y.title.color = '#E0E0E0';
        chartOptions.scales.y.ticks.color = '#E0E0E0';
        chartOptions.scales.y.grid.color = 'rgba(100, 100, 100, 0.2)';
    }

    return (
        <div className="h-96 w-full"> {/* Increased height for more lines */}
            <Line data={chartData} options={chartOptions} />
        </div>
    );
}

export default MoodChart;
