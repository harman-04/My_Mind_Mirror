// src/components/JournalHistory.js

import React, { useState } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { useTheme } from '../contexts/ThemeContext';

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
    'excitement': '#FFD700',    // Gold
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

function JournalHistory({ entries, onEntryChange, clusterThemes, filterClusterId }) { // ⭐ NEW PROPS ⭐
    const [expandedEntryId, setExpandedEntryId] = useState(null);
    const [editingEntryId, setEditingEntryId] = useState(null);
    const [editedText, setEditedText] = useState('');
    const [editError, setEditError] = useState('');
    const [editLoading, setEditLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteEntryId, setDeleteEntryId] = useState(null);
    const { theme } = useTheme();

    // Filter entries based on selected cluster ID
    const filteredEntries = filterClusterId !== null && filterClusterId !== undefined
        ? entries.filter(entry => entry.clusterId === filterClusterId)
        : entries;

    // Group filtered entries by date
    const groupedEntries = filteredEntries.reduce((acc, entry) => {
        const dateKey = format(parseISO(entry.entryDate), 'EEEE, MMMM dd, yyyy');
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        // Sort entries within each day by creation timestamp (most recent first)
        acc[dateKey].push(entry);
        acc[dateKey].sort((a, b) => parseISO(b.creationTimestamp).getTime() - parseISO(a.creationTimestamp).getTime());
        return acc;
    }, {});

    // Sort dates in reverse chronological order
    const sortedDates = Object.keys(groupedEntries).sort((a, b) => {
        const dateA = parseISO(a.split(', ')[1] + ', ' + a.split(', ')[2]);
        const dateB = parseISO(b.split(', ')[1] + ', ' + b.split(', ')[2]);
        return dateB.getTime() - dateA.getTime();
    });

    const toggleExpand = (id) => {
        setExpandedEntryId(expandedEntryId === id ? null : id);
        if (expandedEntryId === id && editingEntryId === id) {
            handleCancelEdit();
        }
    };

    const handleEditClick = (entry) => {
        console.log("JournalHistory: Initiating edit for entry:", entry);
        setEditingEntryId(entry.id);
        setEditedText(entry.rawText);
        setEditError('');
        setExpandedEntryId(entry.id);
    };

    const handleSaveEdit = async (entryId) => {
        setEditLoading(true);
        setEditError('');
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            setEditError('Authentication token missing. Please log in again.');
            setEditLoading(false);
            return;
        }

        if (!editedText.trim()) {
            setEditError('Journal entry cannot be empty. Please enter some text.');
            setEditLoading(false);
            return;
        }

        try {
            console.log(`JournalHistory: Sending UPDATE request for ID: ${entryId} with text: "${editedText}"`);
            await axios.put(`http://localhost:8080/api/journal/${entryId}`, 
                { text: editedText },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('JournalHistory: Entry updated successfully.');
            setEditingEntryId(null);
            setEditedText('');
            setEditError('');
            onEntryChange();
        } catch (err) {
            console.error('JournalHistory: Error updating journal entry:', err.response ? err.response.data : err.message);
            setEditError('Failed to update entry. Please try again.');
        } finally {
            setEditLoading(false);
        }
    };

    const handleCancelEdit = () => {
        console.log("JournalHistory: Cancelling edit.");
        setEditingEntryId(null);
        setEditedText('');
        setEditError('');
        setEditLoading(false);
    };

    const handleDeleteClick = (id) => {
        setDeleteEntryId(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            console.error('Authentication token missing. Please log in again.');
            setShowDeleteConfirm(false);
            return;
        }

        try {
            await axios.delete(`http://localhost:8080/api/journal/${deleteEntryId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onEntryChange();
        } catch (err) {
            console.error('Error deleting journal entry:', err.response ? err.response.data : err.message);
            console.error('Failed to delete entry. Please try again.');
        } finally {
            setShowDeleteConfirm(false);
            setDeleteEntryId(null);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setDeleteEntryId(null);
    };

    const getMoodColorClass = (moodScore) => {
        if (moodScore === null || isNaN(moodScore)) return 'text-gray-500 dark:text-gray-400';
        if (moodScore >= 0.7) return 'text-green-500 dark:text-green-400';
        if (moodScore >= 0.3) return 'text-lime-500 dark:text-lime-400';
        if (moodScore > -0.3 && moodScore < 0.3) return 'text-yellow-500 dark:text-yellow-400';
        if (moodScore <= -0.7) return 'text-red-500 dark:text-red-400';
        return 'text-orange-500 dark:text-orange-400';
    };

    const getMoodLabel = (moodScore) => {
        if (moodScore === null || isNaN(moodScore)) return 'N/A';
        if (moodScore >= 0.7) return 'Very Positive';
        if (moodScore >= 0.3) return 'Positive';
        if (moodScore > -0.3 && moodScore < 0.3) return 'Neutral';
        if (moodScore <= -0.7) return 'Very Negative';
        return 'Negative';
    };

    const getEmotionChartData = (emotionsData) => {
        let emotions;
        try {
            emotions = typeof emotionsData === 'string' ? JSON.parse(emotionsData) : emotionsData;
        } catch (e) {
            console.error("Error parsing emotions data in JournalHistory:", e);
            return null;
        }

        if (!emotions || Object.keys(emotions).length === 0) {
            return null;
        }

        const labels = Object.keys(emotions);
        const data = Object.values(emotions);

        const filteredLabels = [];
        const filteredData = [];
        labels.forEach((label, index) => {
            if (data[index] > 0.01) {
                filteredLabels.push(label.charAt(0).toUpperCase() + label.slice(1));
                filteredData.push(data[index]);
            }
        });

        if (filteredLabels.length === 0) return null;

        const selectedColorPalette = theme === 'dark' ? EMOTION_CHART_COLORS_DARK : EMOTION_CHART_COLORS;
        const backgroundColors = filteredLabels.map(label => selectedColorPalette[label.toLowerCase()] || '#CCCCCC');

        return {
            labels: filteredLabels,
            datasets: [
                {
                    data: filteredData,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(color => color + 'CC'),
                    borderWidth: 1,
                },
            ],
        };
    };

    const emotionChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    font: { family: 'Inter', size: 12 },
                    color: theme === 'dark' ? '#E0E0E0' : 'rgb(75, 85, 99)',
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
                            label += (context.parsed * 100).toFixed(1) + '%';
                        }
                        return label;
                    }
                }
            }
        },
        cutout: '60%',
    };

    if (filteredEntries.length === 0) { // Check filteredEntries
        return (
            <div className="text-center py-8 text-gray-700 dark:text-gray-300 font-inter w-full">
                {filterClusterId !== null && filterClusterId !== undefined
                    ? `No entries found for the selected theme: "${clusterThemes?.[`Theme ${filterClusterId + 1}`] || `Theme ${filterClusterId + 1}`}".`
                    : "No journal entries yet. Start writing your first reflection!"}
            </div>
        );
    }

    const emotionChipColors = {
        joy: 'bg-green-500', sadness: 'bg-blue-500', anger: 'bg-red-500',
        fear: 'bg-purple-500', surprise: 'bg-yellow-500', disgust: 'bg-indigo-500',
        love: 'bg-pink-500', anxiety: 'bg-orange-500', relief: 'bg-teal-500',
        neutral: 'bg-gray-500', excitement: 'bg-lime-500', contentment: 'bg-emerald-500',
        frustration: 'bg-rose-500', gratitude: 'bg-amber-500', hope: 'bg-cyan-500'
    };

    const getChipStyle = (emotion) => {
        const baseColor = emotionChipColors[emotion.toLowerCase()] || 'bg-gray-500';
        return `${baseColor} text-white text-xs px-2 py-1 rounded-full`;
    };

    return (
        <div className="font-inter w-full">
            {sortedDates.map(dateKey => (
                <div key={dateKey} className="mb-8 last:mb-0 w-full">
                    <h3 className="text-xl font-poppins font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
                        {dateKey}
                    </h3>
                    {groupedEntries[dateKey].map(entry => {
                        const parsedEmotions = entry.emotions && typeof entry.emotions === 'string' ? JSON.parse(entry.emotions) : (entry.emotions || {});
                        const parsedCoreConcerns = entry.coreConcerns && typeof entry.coreConcerns === 'string' ? JSON.parse(entry.coreConcerns) : (entry.coreConcerns || []);
                        const parsedGrowthTips = entry.growthTips && typeof entry.growthTips === 'string' ? JSON.parse(entry.growthTips) : (entry.growthTips || []);
                        const parsedKeyPhrases = Array.isArray(entry.keyPhrases) ? entry.keyPhrases : [];

                        const chartDataForEntry = getEmotionChartData(parsedEmotions);

                        // ⭐ Get descriptive theme name ⭐
                        const themeName = entry.clusterId !== null && entry.clusterId !== undefined && clusterThemes
                            ? clusterThemes[`Theme ${entry.clusterId + 1}`] || `Theme ${entry.clusterId + 1}`
                            : 'Unassigned';

                        return (
                            <div key={entry.id} className={`p-4 rounded-lg shadow-md mb-4 w-full
                                ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleExpand(entry.id)}>
                                    <h4 className="text-lg font-poppins font-semibold text-gray-800 dark:text-gray-200">
                                        {entry.creationTimestamp ? format(parseISO(entry.creationTimestamp), 'p') : 'N/A'}
                                    </h4>
                                    <div className="flex items-center space-x-2">
                                        <span className={`${getMoodColorClass(entry.moodScore)} font-semibold text-sm`}>
                                            {getMoodLabel(entry.moodScore)} ({entry.moodScore !== null ? entry.moodScore.toFixed(2) : 'N/A'})
                                        </span>
                                        {entry.clusterId !== null && entry.clusterId !== undefined && (
                                            <span className="font-inter text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                                Theme: {themeName} {/* Display descriptive theme name */}
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
                                        {editingEntryId === entry.id ? (
                                            <div>
                                                <textarea
                                                    value={editedText}
                                                    onChange={(e) => setEditedText(e.target.value)}
                                                    className={`w-full p-2 rounded border resize-y min-h-[100px] 
                                                                ${theme === 'dark' ? 'bg-gray-700 text-gray-200 border-gray-600' : 'bg-gray-50 text-gray-800 border-gray-300'}`}
                                                    aria-label="Edit Journal Entry"
                                                ></textarea>
                                                {editError && <p className="text-red-500 text-sm mt-2">{editError}</p>}
                                                <div className="flex justify-end space-x-2 mt-3">
                                                    <button
                                                        onClick={() => handleSaveEdit(entry.id)}
                                                        className="px-4 py-2 bg-[#B399D4] text-white rounded-full hover:bg-[#9B7BBF] transition duration-300 disabled:opacity-50"
                                                        disabled={editLoading}
                                                    >
                                                        {editLoading ? 'Saving...' : 'Save Changes'}
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className={`px-4 py-2 rounded-full transition duration-300 disabled:opacity-50
                                                                    ${theme === 'dark' ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                                        disabled={editLoading}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap mb-3">
                                                    {entry.rawText}
                                                </p>

                                                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                                    <p><strong>Mood Score:</strong> <span className="font-semibold text-[#B399D4] dark:text-[#5CC8C2]">{entry.moodScore ? entry.moodScore.toFixed(2) : 'N/A'}</span></p>
                                                    
                                                    {parsedEmotions && Object.keys(parsedEmotions).length > 0 && (
                                                        <div className="mt-2">
                                                            <strong>Emotions:</strong>
                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                {Object.entries(parsedEmotions)
                                                                    .filter(([, score]) => score > 0)
                                                                    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
                                                                    .map(([emotion, score]) => (
                                                                    <span key={emotion} className={getChipStyle(emotion)}>
                                                                        {emotion} ({score.toFixed(2)})
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {parsedCoreConcerns && parsedCoreConcerns.length > 0 && (
                                                        <div className="mt-2">
                                                            <strong>Concerns:</strong>
                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                {parsedCoreConcerns.map((concern, index) => (
                                                                    <span key={index} className={`bg-blue-600 text-white text-xs px-2 py-1 rounded-full`}>
                                                                        {concern}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {parsedGrowthTips && parsedGrowthTips.length > 0 && (
                                                        <div className="mt-2">
                                                            <strong>Growth Tips:</strong>
                                                            <ul className="list-disc list-inside ml-2 mt-1">
                                                                {parsedGrowthTips.map((tip, index) => (
                                                                    <li key={index}>{tip}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {parsedKeyPhrases && parsedKeyPhrases.length > 0 && (
                                                        <div className="mt-2">
                                                            <strong>Key Phrases:</strong>
                                                            <div className="flex flex-wrap gap-2 mt-1">
                                                                {parsedKeyPhrases.map((phrase, index) => (
                                                                    <span key={index} className={`bg-purple-600 text-white text-xs px-2 py-1 rounded-full`}>
                                                                        {phrase}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {chartDataForEntry && chartDataForEntry.datasets[0].data.length > 0 ? (
                                                        <div className="mt-4 p-3 rounded-lg bg-white/50 dark:bg-black/30 border border-gray-200 dark:border-gray-700">
                                                            <h4 className="text-lg font-poppins font-semibold mb-2 text-[#1E1A3E] dark:text-[#E0E0E0]">Emotion Breakdown</h4>
                                                            <div className="h-48 w-full flex justify-center items-center">
                                                                <Doughnut data={chartDataForEntry} options={emotionChartOptions} />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-gray-600 dark:text-gray-400 text-sm italic mt-2">
                                                            No detailed emotion data for this entry.
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex justify-end space-x-2 mt-4">
                                                    <button
                                                        onClick={() => handleEditClick(entry)}
                                                        className="px-3 py-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition duration-300 text-sm"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(entry.id)}
                                                        className="px-3 py-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition duration-300 text-sm"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}

            {showDeleteConfirm && (
                <div className="fixed inset-0 flex items-center justify-center z-50 overflow-hidden">
                    <div className="absolute inset-0 bg-gray-900 bg-opacity-70 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-center max-w-sm w-full mx-auto my-auto">
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