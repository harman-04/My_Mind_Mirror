// src/components/JournalHistory.js
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
// import axios from "axios"; // No longer needed directly
import { format, parseISO } from "date-fns";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useTheme } from "../contexts/ThemeContext";
// Import the mutation hooks
import { useUpdateJournalEntry, useDeleteJournalEntry } from '../hooks/useJournalData';
import { SkeletonCard } from './Skeleton';
import { AlertTriangle } from 'lucide-react';

const TRUNCATION_LENGTH = 150; // You can adjust this value as needed

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Define a consistent color palette for emotions (expanded for more variety)
const EMOTION_CHART_COLORS = {
  joy: "#5CC8C2", // Serene Teal
  sadness: "#B399D4", // Gentle Lavender
  anger: "#FF8A7A", // Warm Coral
  fear: "#A93226", // Darker Red
  surprise: "#85C1E9", // Light Blue
  neutral: "#E0E0E0", // Soft Gray (Light Mode)
  love: "#E74C3C", // Red
  disgust: "#6C3483", // Purple
  anxiety: "#F7DC6F", // Yellow
  optimism: "#F1C40F", // Golden Yellow
  relief: "#58D68D", // Light Green
  caring: "#2ECC71", // Green
  curiosity: "#AF7AC5", // Light Purple
  embarrassment: "#D35400", // Dark Orange
  pride: "#F39C12", // Orange
  remorse: "#7F8C8D", // Gray
  annoyance: "#E67E22", // Orange-Brown
  disappointment: "#283747", // Dark Blue-Gray
  grief: "#17202A", // Very Dark Blue-Gray
  excitement: "#FFD700", // Gold
  contentment: "#90EE90", // Light Green
  frustration: "#FF4500", // Orange-Red
  gratitude: "#ADFF2F", // Green-Yellow
  hope: "#ADD8E6", // Light Blue
};

// Dark mode specific colors for Doughnut chart slices
const EMOTION_CHART_COLORS_DARK = {
  joy: "#8DE2DD",
  sadness: "#C7B3E6",
  anger: "#FFB0A4",
  fear: "#D45E4D",
  surprise: "#B0D9F7",
  neutral: "#A0A0A0",
  love: "#FF7F7F",
  disgust: "#9B6EB4",
  anxiety: "#FFF0B3",
  optimism: "#FFD750",
  relief: "#8CE0B0",
  caring: "#58D68D",
  curiosity: "#C79BE0",
  embarrassment: "#FF8C40",
  pride: "#FFC050",
  remorse: "#B0B8B8",
  annoyance: "#FFAB66",
  disappointment: "#506A80",
  grief: "#404040",
  excitement: "#FFE680",
  contentment: "#C0FFC0",
  frustration: "#FF7F50",
  gratitude: "#D0FF80",
  hope: "#C0E0FF",
};

// ------------------------------------------------------------------
// Portal-based Delete Confirmation Modal
// ------------------------------------------------------------------
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, theme }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className={`relative max-w-md w-full rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 ${
        theme === 'dark' ? 'bg-gray-800/95' : 'bg-white/95'
      } backdrop-blur-md border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-poppins font-semibold mb-2">Delete Journal Entry</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Are you sure you want to delete this entry? This action cannot be undone.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={onConfirm}
              className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium transition shadow-md"
            >
              Delete
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ------------------------------------------------------------------
// Main JournalHistory Component
// ------------------------------------------------------------------
function JournalHistory({
  entries,
  clusterThemes,
  filterClusterId,
    filterPhrase,
    isLoading
}) {

  const [expandedEntryId, setExpandedEntryId] = useState(null);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [editError, setEditError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState(null);
  const { theme } = useTheme();

  // Initialize mutation hooks
  const updateMutation = useUpdateJournalEntry();
  const deleteMutation = useDeleteJournalEntry();

  if (isLoading) return <SkeletonCard count={3} />;

  // --- Filter entries ---
    let filteredEntries = entries;

    // 1. Cluster filter
    if (filterClusterId !== null && filterClusterId !== undefined) {
      filteredEntries = filteredEntries.filter(
        (entry) => entry.clusterId === filterClusterId
      );
    }

    // 2. Phrase filter
    if (filterPhrase) {
      const lowerPhrase = filterPhrase.toLowerCase();
      filteredEntries = filteredEntries.filter((entry) =>
        Array.isArray(entry.keyPhrases) &&
        entry.keyPhrases.some((phrase) =>
          phrase.toLowerCase().includes(lowerPhrase)
        )
      );
    }

    // --- Group by date ---
    const groupedEntries = filteredEntries.reduce((acc, entry) => {
      const dateKey = format(parseISO(entry.entryDate), "EEEE, MMMM dd, yyyy");
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(entry);
      acc[dateKey].sort(
        (a, b) =>
          parseISO(b.creationTimestamp).getTime() -
          parseISO(a.creationTimestamp).getTime()
      );
      return acc;
    }, {});

    const sortedDates = Object.keys(groupedEntries).sort((a, b) => {
      const dateA = parseISO(a.split(", ")[1] + ", " + a.split(", ")[2]);
      const dateB = parseISO(b.split(", ")[1] + ", " + b.split(", ")[2]);
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
    setEditError("");
    setExpandedEntryId(entry.id);
  };

  const handleSaveEdit = async (entryId) => {
    setEditError("");

    if (!editedText.trim()) {
      setEditError("Journal entry cannot be empty. Please enter some text.");
      return;
    }

    try {
      console.log(
        `JournalHistory: Sending UPDATE request for ID: ${entryId} with text: "${editedText}"`
      );
      await updateMutation.mutateAsync({ entryId: entryId, updatedText: editedText });
      console.log("JournalHistory: Entry updated successfully.");
      setEditingEntryId(null);
      setEditedText("");
      setEditError("");
    } catch (err) {
      console.error(
        "JournalHistory: Error updating journal entry:",
        err.response ? err.response.data : err.message
      );
      setEditError("Failed to update entry. Please try again.");
    }
  };

  const handleCancelEdit = () => {
    console.log("JournalHistory: Cancelling edit.");
    setEditingEntryId(null);
    setEditedText("");
    setEditError("");
  };

  const handleDeleteClick = (id) => {
    setDeleteEntryId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteEntryId);
    } catch (err) {
      console.error(
        "Error deleting journal entry:",
        err.response ? err.response.data : err.message
      );
      setEditError("Failed to delete entry. Please try again.");
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
    if (moodScore === null || isNaN(moodScore))
      return "text-gray-500 dark:text-gray-400";
    if (moodScore >= 0.7) return "text-green-500 dark:text-green-400";
    if (moodScore >= 0.3) return "text-lime-500 dark:text-lime-400";
    if (moodScore > -0.3 && moodScore < 0.3)
      return "text-yellow-500 dark:text-yellow-400";
    if (moodScore <= -0.7) return "text-red-500 dark:text-red-400";
    return "text-orange-500 dark:text-orange-400";
  };

  const getMoodLabel = (moodScore) => {
    if (moodScore === null || isNaN(moodScore)) return "N/A";
    if (moodScore >= 0.7) return "Very Positive";
    if (moodScore >= 0.3) return "Positive";
    if (moodScore > -0.3 && moodScore < 0.3) return "Neutral";
    if (moodScore <= -0.7) return "Very Negative";
    return "Negative";
  };

  const getEmotionChartData = (emotionsData) => {
    let emotions;
    try {
      emotions =
        typeof emotionsData === "string"
          ? JSON.parse(emotionsData)
          : emotionsData;
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

    const selectedColorPalette =
      theme === "dark" ? EMOTION_CHART_COLORS_DARK : EMOTION_CHART_COLORS;
    const backgroundColors = filteredLabels.map(
      (label) => selectedColorPalette[label.toLowerCase()] || "#CCCCCC"
    );

    return {
      labels: filteredLabels,
      datasets: [
        {
          data: filteredData,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map((color) => color + "CC"),
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
        position: "right",
        labels: {
          font: { family: "Inter", size: 12 },
          color: theme === "dark" ? "#E0E0E0" : "rgb(75, 85, 99)",
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed !== null) {
              label += (context.parsed * 100).toFixed(1) + "%";
            }
            return label;
          },
        },
      },
    },
    cutout: "60%",
  };

  const emotionChipColors = {
    joy: "bg-green-500",
    sadness: "bg-blue-500",
    anger: "bg-red-500",
    fear: "bg-purple-500",
    surprise: "bg-yellow-500",
    disgust: "bg-indigo-500",
    love: "bg-pink-500",
    anxiety: "bg-orange-500",
    relief: "bg-teal-500",
    neutral: "bg-gray-500",
    excitement: "bg-lime-500",
    contentment: "bg-emerald-500",
    frustration: "bg-rose-500",
    gratitude: "bg-amber-500",
    hope: "bg-cyan-500",
  };

  const getChipStyle = (emotion) => {
    const baseColor = emotionChipColors[emotion.toLowerCase()] || "bg-gray-500";
    return `${baseColor} text-white text-xs px-2 py-1 rounded-full`;
  };

 // --- Empty state message ---
  if (filteredEntries.length === 0) {
    let message = "No journal entries yet. Start writing your first reflection!";
    if (filterClusterId !== null && filterClusterId !== undefined) {
      const themeName = clusterThemes?.[`Theme ${filterClusterId + 1}`] || `Theme ${filterClusterId + 1}`;
      message = `No entries found for the selected theme: "${themeName}".`;
    } else if (filterPhrase) {
      message = `No entries found containing the phrase "${filterPhrase}".`;
    }
    return (
      <div className="text-center py-8 text-gray-700 dark:text-gray-300 font-inter w-full">
        {message}
      </div>
    );
  }

  return (
    <div className="font-inter w-full">
      {sortedDates.map((dateKey) => (
        <div key={dateKey} className="mb-8 last:mb-0 w-full">
          <h3 className="text-xl font-poppins font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-300 dark:border-gray-600">
            {dateKey}
          </h3>
          {groupedEntries[dateKey].map((entry) => {
            const parsedEmotions =
              entry.emotions && typeof entry.emotions === "string"
                ? JSON.parse(entry.emotions)
                : entry.emotions || {};
            const parsedCoreConcerns =
              entry.coreConcerns && typeof entry.coreConcerns === "string"
                ? JSON.parse(entry.coreConcerns)
                : entry.coreConcerns || [];
            const parsedGrowthTips =
              entry.growthTips && typeof entry.growthTips === "string"
                ? JSON.parse(entry.growthTips)
                : entry.growthTips || [];
            const parsedKeyPhrases = Array.isArray(entry.keyPhrases)
              ? entry.keyPhrases
              : [];

            const chartDataForEntry = getEmotionChartData(parsedEmotions);

            // Get descriptive theme name
            const themeName =
              entry.clusterId !== null &&
              entry.clusterId !== undefined &&
              clusterThemes
                ? clusterThemes[`Theme ${entry.clusterId + 1}`] ||
                  `Theme ${entry.clusterId + 1}`
                : "Unassigned";

            return (
              <div
                key={entry.id}
                className={`p-4 rounded-lg shadow-md mb-4 w-full ${
                  theme === "dark"
                    ? "bg-gray-800 border border-gray-700"
                    : "bg-white border border-gray-200"
                }`}
              >
                {/* Entry Header: Time, Mood Score, Theme */}
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() => toggleExpand(entry.id)}
                >
                  <h4 className="text-lg font-poppins font-semibold text-gray-800 dark:text-gray-200">
                    {entry.creationTimestamp
                      ? format(parseISO(entry.creationTimestamp), "p")
                      : "N/A"}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`${getMoodColorClass(
                        entry.moodScore
                      )} font-semibold text-sm`}
                    >
                      {getMoodLabel(entry.moodScore)} (
                      {entry.moodScore !== null &&
                      entry.moodScore !== undefined &&
                      !isNaN(entry.moodScore)
                        ? entry.moodScore.toFixed(2)
                        : "N/A"}
                      )
                    </span>
                    {entry.clusterId !== null &&
                      entry.clusterId !== undefined && (
                        <span className="font-inter text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                          Theme: {themeName}
                        </span>
                      )}
                    <svg
                      className={`w-5 h-5 text-gray-600 dark:text-gray-400 transform transition-transform duration-300 ${
                        expandedEntryId === entry.id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      ></path>
                    </svg>
                  </div>
                </div>

                {/* Conditional Rendering for Raw Text and Expanded Details */}
                {expandedEntryId === entry.id ? (
                  // When entry is expanded
                  editingEntryId === entry.id ? (
                    // Edit mode for rawText
                    <div>
                      <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className={`w-full p-2 rounded border resize-y min-h-[100px]
                            ${
                              theme === "dark"
                                ? "bg-gray-700 text-gray-200 border-gray-600"
                                : "bg-gray-50 text-gray-800 border-gray-300"
                            }`}
                        aria-label="Edit Journal Entry"
                      ></textarea>
                      {editError && (
                        <p className="text-red-500 text-sm mt-2">
                          {editError}
                        </p>
                      )}
                      <div className="flex justify-end space-x-2 mt-3">
                        <button
                          onClick={() => handleSaveEdit(entry.id)}
                          className="px-4 py-2 bg-[#B399D4] text-white rounded-full hover:bg-[#9B7BBF] transition duration-300 disabled:opacity-50"
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className={`px-4 py-2 rounded-full transition duration-300 disabled:opacity-50
                                ${
                                  theme === "dark"
                                    ? "bg-gray-600 text-gray-200 hover:bg-gray-500"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                }`}
                          disabled={updateMutation.isPending}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display full rawText and analysis when expanded (not editing)
                    <div className="mt-4 border-t border-white/20 dark:border-white/10 pt-4">
                      <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap mb-3">
                        {entry.rawText}
                      </p>

                      {/* Summary */}
                      {entry.summary && entry.summary.trim() !== "" && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
                          <p>
                            <strong>Summary:</strong> {entry.summary}
                          </p>
                        </div>
                      )}

                      {/* Analysis Details */}
                      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        {/* Mood Score */}
                        <p>
                          <strong>Mood Score:</strong>
                          <span className="font-semibold text-[#B399D4] dark:text-[#5CC8C2]">
                            {entry.moodScore !== null &&
                            entry.moodScore !== undefined &&
                            !isNaN(entry.moodScore)
                              ? entry.moodScore.toFixed(2)
                              : "N/A"}
                          </span>
                        </p>

                        {/* Emotions */}
                        {parsedEmotions &&
                          Object.keys(parsedEmotions).length > 0 && (
                            <div className="mt-2">
                              <strong>Emotions:</strong>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {Object.entries(parsedEmotions)
                                  .filter(([, score]) => score > 0)
                                  .sort(
                                    ([, scoreA], [, scoreB]) => scoreB - scoreA
                                  )
                                  .map(([emotion, score]) => (
                                    <span
                                      key={emotion}
                                      className={getChipStyle(emotion)}
                                    >
                                      {emotion} ({score.toFixed(2)})
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}

                        {/* Concerns */}
                        {parsedCoreConcerns && parsedCoreConcerns.length > 0 && (
                          <div className="mt-2">
                            <strong>Concerns:</strong>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {parsedCoreConcerns.map((concern, index) => (
                                <span
                                  key={index}
                                  className={`bg-blue-600 text-white text-xs px-2 py-1 rounded-full`}
                                >
                                  {concern}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Growth Tips */}
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

                        {/* Key Phrases */}
                        {parsedKeyPhrases && parsedKeyPhrases.length > 0 && (
                          <div className="mt-2">
                            <strong>Key Phrases:</strong>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {parsedKeyPhrases.map((phrase, index) => (
                                <span
                                  key={index}
                                  className={`bg-purple-600 text-white text-xs px-2 py-1 rounded-full`}
                                >
                                  {phrase}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Emotion Breakdown Chart */}
                        {chartDataForEntry &&
                        chartDataForEntry.datasets[0].data.length > 0 ? (
                          <div className="mt-4 p-3 rounded-lg bg-white/50 dark:bg-black/30 border border-gray-200 dark:border-gray-700">
                            <h4 className="text-lg font-poppins font-semibold mb-2 text-[#1E1A3E] dark:text-[#E0E0E0]">
                              Emotion Breakdown
                            </h4>
                            <div className="h-48 w-full flex justify-center items-center">
                              <Doughnut
                                data={chartDataForEntry}
                                options={emotionChartOptions}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-600 dark:text-gray-400 text-sm italic mt-2">
                            No detailed emotion data for this entry.
                          </p>
                        )}
                      </div>

                      {/* Edit/Delete buttons */}
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
                    </div>
                  )
                ) : (
                  // When entry is NOT expanded, show truncated rawText (clickable)
                  <div
                    className="mt-2 text-gray-700 dark:text-gray-300 text-sm cursor-pointer"
                    onClick={() => toggleExpand(entry.id)}
                  >
                    {entry.rawText.length > TRUNCATION_LENGTH
                      ? `${entry.rawText.slice(0, TRUNCATION_LENGTH)}...`
                      : entry.rawText}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Portal-based Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        theme={theme}
      />

      {/* Show error messages from mutations (optional) */}
      {updateMutation.isError && (
        <div className="fixed bottom-4 right-4 bg-red-100 dark:bg-red-900/80 text-red-800 dark:text-red-200 px-4 py-2 rounded-lg shadow-lg z-50">
          Update failed: {updateMutation.error.message}
        </div>
      )}
      {deleteMutation.isError && (
        <div className="fixed bottom-4 right-4 bg-red-100 dark:bg-red-900/80 text-red-800 dark:text-red-200 px-4 py-2 rounded-lg shadow-lg z-50">
          Delete failed: {deleteMutation.error.message}
        </div>
      )}
    </div>
  );
}

export default JournalHistory;