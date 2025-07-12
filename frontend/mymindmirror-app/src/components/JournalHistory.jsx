import React, { useState } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns'; // For date formatting
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Define a consistent color palette for emotions (expanded for more variety)
const EMOTION_CHART_COLORS = {
    'joy': '#5CC8C2',       // Serene Teal
    'sadness': '#B399D4',   // Gentle Lavender
    'anger': '#FF8A7A',     // Warm Coral
    'fear': '#A93226',      // Darker Red
    'surprise': '#85C1E9',  // Light Blue
    'neutral': '#E0E0E0',   // Soft Gray (Light Mode)
    'love': '#E74C3C',      // Red
    'disgust': '#6C3483',   // Purple
    'anxiety': '#F7DC6F',   // Yellow
    'optimism': '#F1C40F',  // Golden Yellow
    'relief': '#58D68D',    // Light Green
    'caring': '#2ECC71',    // Green
    'curiosity': '#AF7AC5', // Light Purple
    'embarrassment': '#D35400', // Dark Orange
    'pride': '#F39C12',     // Orange
    'remorse': '#7F8C8D',   // Gray
    'annoyance': '#E67E22', // Orange-Brown
    'disappointment': '#283747', // Dark Blue-Gray
    'grief': '#17202A',     // Very Dark Blue-Gray
    'excitement': '#FFD700',   // Gold
    'contentment': '#90EE90', // Light Green
    'frustration': '#FF4500', // Orange-Red
    'gratitude': '#ADFF2F',   // Green-Yellow
    'hope': '#ADD8E6',        // Light Blue
};

// Dark mode specific colors for Doughnut chart slices
const EMOTION_CHART_COLORS_DARK = {
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

// Import JournalInput for editing functionality
import JournalInput from './JournalInput'; 

function JournalHistory({ entries, onEntryChange }) {
    const [expandedEntryId, setExpandedEntryId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [currentEditText, setCurrentEditText] = useState('');
    const [editEntryId, setEditEntryId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteEntryId, setDeleteEntryId] = useState(null);
    const [feedbackMessage, setFeedbackMessage] = useState(''); // For success/error messages
    const [feedbackType, setFeedbackType] = useState(''); // 'success' or 'error'

    // Sort entries by creationTimestamp in descending order (most recent first)
    const sortedEntries = [...entries].sort((a, b) => {
        // Parse ISO strings to Date objects for comparison
        const dateA = a.creationTimestamp ? parseISO(a.creationTimestamp) : new Date(0); // Fallback for null/undefined
        const dateB = b.creationTimestamp ? parseISO(b.creationTimestamp) : new Date(0);
        return dateB.getTime() - dateA.getTime();
    });

    const toggleExpand = (id) => {
        setExpandedEntryId(expandedEntryId === id ? null : id);
        // When collapsing, ensure editing mode is off for that entry if it's the one being edited
        if (expandedEntryId === id && isEditing && editEntryId === id) {
            handleCancelEdit();
        }
        setFeedbackMessage(''); // Clear feedback when expanding/collapsing
    };

    const handleEditClick = (entry) => {
        setIsEditing(true);
        setEditEntryId(entry.id);
        setCurrentEditText(entry.rawText);
        setExpandedEntryId(entry.id); // Keep expanded while editing
        setFeedbackMessage(''); // Clear any previous feedback
    };

    const handleSaveEdit = async () => {
        if (!editEntryId || !currentEditText.trim()) {
            setFeedbackMessage('Journal entry cannot be empty.');
            setFeedbackType('error');
            return;
        }

        const token = localStorage.getItem('jwtToken');
        if (!token) {
            setFeedbackMessage('Authentication token not found. Please log in.');
            setFeedbackType('error');
            return;
        }

        try {
            await axios.put(`http://localhost:8080/api/journal/${editEntryId}`, { rawText: currentEditText }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFeedbackMessage('Entry updated successfully!');
            setFeedbackType('success');
            setIsEditing(false);
            setEditEntryId(null);
            setCurrentEditText('');
            onEntryChange(); // Refresh journal entries
        } catch (error) {
            console.error('Error updating entry:', error.response ? error.response.data : error.message);
            setFeedbackMessage('Failed to update entry. Please try again.');
            setFeedbackType('error');
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditEntryId(null);
        setCurrentEditText('');
        setFeedbackMessage(''); // Clear feedback on cancel
    };

    const handleDeleteClick = (id) => {
        setDeleteEntryId(id);
        setShowDeleteConfirm(true);
        setFeedbackMessage(''); // Clear any previous feedback
    };

    const confirmDelete = async () => {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            setFeedbackMessage('Authentication token not found. Please log in.');
            setFeedbackType('error');
            setShowDeleteConfirm(false); // Close modal
            return;
        }

        try {
            await axios.delete(`http://localhost:8080/api/journal/${deleteEntryId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFeedbackMessage('Entry deleted successfully!');
            setFeedbackType('success');
            onEntryChange(); // Refresh journal entries
        } catch (error) {
            console.error('Error deleting entry:', error.response ? error.response.data : error.message);
            setFeedbackMessage('Failed to delete entry. Please try again.');
            setFeedbackType('error');
        } finally {
            setShowDeleteConfirm(false);
            setDeleteEntryId(null);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setDeleteEntryId(null);
        setFeedbackMessage(''); // Clear feedback on cancel
    };

    const getMoodColorClass = (moodScore) => {
        if (moodScore === null || isNaN(moodScore)) return 'text-gray-500 dark:text-gray-400';
        if (moodScore >= 0.7) return 'text-green-500 dark:text-green-400'; // Very Positive
        if (moodScore >= 0.3) return 'text-lime-500 dark:text-lime-400';    // Positive
        if (moodScore > -0.3 && moodScore < 0.3) return 'text-yellow-500 dark:text-yellow-400'; // Neutral
        if (moodScore <= -0.7) return 'text-red-500 dark:text-red-400';   // Very Negative
        return 'text-orange-500 dark:text-orange-400'; // Negative (between -0.3 and -0.7)
    };

    const getMoodLabel = (moodScore) => {
        if (moodScore === null || isNaN(moodScore)) return 'N/A';
        if (moodScore >= 0.7) return 'Very Positive';
        if (moodScore >= 0.3) return 'Positive';
        if (moodScore > -0.3 && moodScore < 0.3) return 'Neutral';
        if (moodScore <= -0.7) return 'Very Negative';
        return 'Negative';
    };

    // Function to prepare data for the emotion Doughnut chart
    const getEmotionChartData = (emotionsData) => {
        if (!emotionsData || Object.keys(emotionsData).length === 0) {
            return null;
        }

        // Emotions are expected to be an object directly from the backend (already parsed)
        const emotions = emotionsData; 
        
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

        if (filteredLabels.length === 0) return null; // If no emotions with significant scores

        // Dynamically select colors based on theme
        const rootElement = document.documentElement;
        const isDarkMode = rootElement.classList.contains('dark');
        const selectedColorPalette = isDarkMode ? EMOTION_CHART_COLORS_DARK : EMOTION_CHART_COLORS;

        const backgroundColors = filteredLabels.map(label => selectedColorPalette[label.toLowerCase()] || '#CCCCCC'); // Default gray

        return {
            labels: filteredLabels,
            datasets: [
                {
                    data: filteredData,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(color => color + 'CC'), // Slightly darker border
                    borderWidth: 1,
                },
            ],
        };
    };

    // Options for the emotion Doughnut chart
    const emotionChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right', // Place legend on the right
                labels: {
                    font: { family: 'Inter', size: 12 },
                    color: 'rgb(75, 85, 99)', // Default text color for legend
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
                            label += (context.parsed * 100).toFixed(1) + '%'; // Display as percentage
                        }
                        return label;
                    }
                }
            }
        },
        cutout: '60%', // Makes it a doughnut chart
    };

    // Adjust emotion chart colors for dark mode dynamically
    const rootElement = document.documentElement;
    if (rootElement.classList.contains('dark')) {
        emotionChartOptions.plugins.legend.labels.color = '#E0E0E0';
    }

    return (
        <div className="bg-white/60 dark:bg-black/40 p-6 rounded-lg shadow-inner transition-all duration-500">
            <h2 className="text-2xl font-poppins font-semibold text-[#FF8A7A] dark:text-[#FF6C5A] mb-4 text-center">
                Your Journal History
            </h2>

            {/* Feedback Message */}
            {feedbackMessage && (
                <div className={`mb-4 p-3 rounded-md text-center font-inter ${
                    feedbackType === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                }`}>
                    {feedbackMessage}
                </div>
            )}

            {entries.length === 0 ? (
                <p className="text-center text-gray-600 dark:text-gray-400 font-inter">No journal entries yet. Start by writing one above!</p>
            ) : (
                <div className="space-y-6">
                    {sortedEntries.map((entry) => {
                        // Ensure data is in correct format (should be handled by backend, but defensive check)
                        const parsedEmotions = entry.emotions && typeof entry.emotions === 'object' ? entry.emotions : {};
                        const parsedCoreConcerns = Array.isArray(entry.coreConcerns) ? entry.coreConcerns : [];
                        const parsedGrowthTips = Array.isArray(entry.growthTips) ? entry.growthTips : [];
                        const parsedKeyPhrases = Array.isArray(entry.keyPhrases) ? entry.keyPhrases : [];

                        const chartDataForEntry = getEmotionChartData(parsedEmotions);

                        return (
                            <div key={entry.id} className="bg-white/70 dark:bg-black/50 p-4 rounded-lg shadow-md border border-white/30 dark:border-white/10 transition-all duration-300">
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleExpand(entry.id)}>
                                    <h3 className="text-lg font-poppins font-semibold text-gray-800 dark:text-gray-200">
                                        {format(parseISO(entry.entryDate), 'yyyy-MM-dd')}
                                    </h3>
                                    <div className="flex items-center space-x-2">
                                        <span className={`${getMoodColorClass(entry.moodScore)} font-semibold text-sm`}>
                                            {getMoodLabel(entry.moodScore)} ({entry.moodScore !== null ? entry.moodScore.toFixed(2) : 'N/A'})
                                        </span>
                                        {/* ⭐ NEW: Display Cluster ID ⭐ */}
                                        {entry.clusterId !== null && entry.clusterId !== undefined && (
                                            <span className="font-inter text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                                Theme: {entry.clusterId + 1}
                                            </span>
                                        )}
                                        <svg
                                            className={`w-5 h-5 text-gray-600 dark:text-gray-400 transform transition-transform duration-300 ${
                                                expandedEntryId === entry.id ? 'rotate-180' : ''
                                            }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </div>
                                </div>

                                {expandedEntryId === entry.id && (
                                    <div className="mt-4 border-t border-white/20 dark:border-white/10 pt-4">
                                        {isEditing && editEntryId === entry.id ? (
                                            <div className="flex flex-col space-y-3">
                                                <textarea
                                                    className="w-full p-3 rounded-md bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FF8A7A] transition-all duration-200"
                                                    rows="6"
                                                    value={currentEditText}
                                                    onChange={(e) => setCurrentEditText(e.target.value)}
                                                ></textarea>
                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        onClick={handleSaveEdit}
                                                        className="py-2 px-4 rounded-full font-poppins font-semibold text-white bg-[#4CAF50] hover:bg-[#45a049] transition-all duration-300 shadow-md"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="py-2 px-4 rounded-full font-poppins font-semibold text-white bg-gray-500 hover:bg-gray-600 transition-all duration-300 shadow-md"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="font-inter text-gray-700 dark:text-gray-300 mb-2">
                                                    <span className="font-semibold">Summary:</span> {entry.summary || 'No summary available.'}
                                                </p>
                                                <p className="font-inter text-gray-700 dark:text-gray-300 mb-2">
                                                    <span className="font-semibold">Emotions:</span>{' '}
                                                    {Object.entries(parsedEmotions)
                                                        .filter(([, score]) => score > 0.01) // Filter out very low scores
                                                        .map(([label, score]) => `${label.charAt(0).toUpperCase() + label.slice(1)} (${(score * 100).toFixed(1)}%)`)
                                                        .join(', ') || 'N/A'}
                                                </p>
                                                <p className="font-inter text-gray-700 dark:text-gray-300 mb-2">
                                                    <span className="font-semibold">Core Concerns:</span>{' '}
                                                    {parsedCoreConcerns.length > 0
                                                        ? parsedCoreConcerns.join(', ')
                                                        : 'unspecified'}
                                                </p>
                                                <p className="font-inter text-gray-700 dark:text-gray-300 mb-4">
                                                    <span className="font-semibold">Growth Tips:</span>{' '}
                                                    {parsedGrowthTips.length > 0
                                                        ? parsedGrowthTips.map((tip, idx) => `• ${tip}`).join(' ')
                                                        : 'No specific growth tips generated.'}
                                                </p>
                                                {/* ⭐ NEW: Display Key Phrases ⭐ */}
                                                {parsedKeyPhrases.length > 0 && (
                                                    <p className="font-inter text-gray-700 dark:text-gray-300 mb-4">
                                                        <span className="font-semibold">Key Phrases:</span>{' '}
                                                        {parsedKeyPhrases.join(', ')}
                                                    </p>
                                                )}

                                                {/* Emotion Distribution Chart for this entry */}
                                                {chartDataForEntry && chartDataForEntry.datasets[0].data.length > 0 ? (
                                                    <div className="mt-4 p-3 rounded-lg bg-white/50 dark:bg-black/30 border border-gray-200 dark:border-gray-700">
                                                        <h4 className="text-lg font-poppins font-semibold mb-2 text-[#1E1A3E] dark:text-[#E0E0E0]">Emotion Breakdown</h4>
                                                        <div className="h-48 w-full flex justify-center items-center"> {/* Fixed height for chart */}
                                                            <Doughnut data={chartDataForEntry} options={emotionChartOptions} />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-600 dark:text-gray-400 text-sm italic mt-2">
                                                        No detailed emotion data for this entry.
                                                    </p>
                                                )}

                                                <div className="flex justify-end space-x-2 mt-4">
                                                    <button
                                                        onClick={() => handleEditClick(entry)}
                                                        className="py-2 px-4 rounded-full font-poppins font-semibold text-white bg-[#5CC8C2] hover:bg-[#4AB8B2] active:bg-[#3A9B95] shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#5CC8C2] focus:ring-opacity-75 transition-all duration-300"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(entry.id)}
                                                        className="py-2 px-4 rounded-full font-poppins font-semibold text-white bg-[#FF8A7A] hover:bg-[#FF6C5A] active:bg-[#D45E4D] shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#FF8A7A] focus:ring-opacity-75 transition-all duration-300"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                                <div className="mt-4">
                                                    <details>
                                                        <summary className="cursor-pointer font-poppins font-semibold text-gray-700 dark:text-gray-300 hover:text-[#FF8A7A] dark:hover:text-[#FF6C5A] transition-colors duration-200">
                                                            Read Full Entry
                                                        </summary>
                                                        <div className="bg-white/50 dark:bg-black/30 p-3 rounded-md mt-2 text-gray-800 dark:text-gray-200">
                                                            {entry.rawText}
                                                        </div>
                                                    </details>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-center">
                        <p className="text-lg font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4">
                            Are you sure you want to delete this entry? This action cannot be undone.
                        </p>
                        <div className="flex justify-center space-x-4">
                            <button
                                onClick={confirmDelete}
                                className="py-2 px-4 rounded-full font-poppins font-semibold text-white bg-red-600 hover:bg-red-700 transition-all duration-300"
                            >
                                Delete
                            </button>
                            <button
                                onClick={cancelDelete}
                                className="py-2 px-4 rounded-full font-poppins font-semibold text-gray-800 bg-gray-300 hover:bg-gray-400 dark:text-gray-200 dark:bg-gray-600 dark:hover:bg-gray-700 transition-all duration-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default JournalHistory;
