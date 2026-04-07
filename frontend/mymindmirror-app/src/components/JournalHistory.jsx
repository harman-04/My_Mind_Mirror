// src/components/JournalHistory.js
import React, { useState, useEffect, useRef  } from "react";
import ReactDOM from "react-dom";
import { format, parseISO } from "date-fns";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useTheme } from "../contexts/ThemeContext";
// Import the mutation hooks
import { useUpdateJournalEntry, useDeleteJournalEntry } from '../hooks/useJournalData';
import { SkeletonCard } from './Skeleton';
import { AlertTriangle, Download } from 'lucide-react';
import { downloadChartAsPng } from '../utils/downloadChart';

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
const isDarkMode = theme === 'dark';
const chartRefs = useRef({});
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

    const scrollToEditArea = (entryId) => {
      // Wait for DOM to update (the edit mode renders)
      setTimeout(() => {
        const editContainer = document.getElementById(`edit-area-${entryId}`);
        if (editContainer) {
          editContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    };

  const handleEditClick = (entry) => {
    console.log("JournalHistory: Initiating edit for entry:", entry);
    setEditingEntryId(entry.id);
    setEditedText(entry.rawText);
    setEditError("");
    setExpandedEntryId(entry.id);
      scrollToEditArea(entry.id);

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
                  editingEntryId === entry.id ? (
                    // ---------- EDIT MODE ----------
                    <div id={`edit-area-${entry.id}`} className="mt-4 border-t border-white/20 dark:border-white/10 pt-4">
                      <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className={`w-full p-3 rounded-xl border resize-y min-h-[120px] focus:ring-2 focus:ring-purple-500 focus:outline-none transition
                          ${theme === "dark"
                            ? "bg-gray-800 text-gray-200 border-gray-600"
                            : "bg-gray-50 text-gray-800 border-gray-300"
                          }`}
                        aria-label="Edit Journal Entry"
                      />
                      {editError && (
                        <p className="text-red-500 text-sm mt-2">{editError}</p>
                      )}
                      <div className="flex justify-end gap-3 mt-4">
                        <button
                          onClick={() => handleSaveEdit(entry.id)}
                          disabled={updateMutation.isPending}
                          className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 text-white font-medium hover:shadow-md transition disabled:opacity-50"
                        >
                          {updateMutation.isPending ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={updateMutation.isPending}
                          className={`px-5 py-2 rounded-full font-medium transition
                            ${theme === "dark"
                              ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // ---------- EXPANDED VIEW (NON‑EDITING) ----------
                    <div className="mt-4 border-t border-white/20 dark:border-white/10 pt-4 space-y-5">
                      {/* Raw Text */}
                      {/* Raw Text Card – now matches other cards */}
                      <div className={`rounded-xl p-3 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100/80'} backdrop-blur-sm`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Journal Entry
                          </span>
                        </div>
                        <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                          {entry.rawText}
                        </p>
                      </div>

                     {/* Summary  */}
                     {entry.summary && entry.summary.trim() !== "" && (
                       <div className={`mt-3 p-3 rounded-xl border ${
                         theme === 'dark'
                           ? 'bg-gray-700/50 border-gray-600'
                           : 'bg-purple-50/50 border-purple-100'
                       } backdrop-blur-sm transition-all duration-300`}>
                         <div className="flex items-start gap-2">
                           <div className="mt-0.5">
                             <svg className="w-4 h-4 text-purple-500 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                             </svg>
                           </div>
                           <div className="flex-1">
                             <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-teal-400">
                               Summary
                             </span>
                             <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mt-1">
                               {entry.summary}
                             </p>
                           </div>
                         </div>
                       </div>
                     )}

                      {/* Analysis Details */}
                      <div className="mt-4 space-y-4">
                        {/* Mood Score Card */}
                        <div className={`rounded-xl p-3 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100/80'} backdrop-blur-sm`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#B399D4] to-[#5CC8C2]" />
                              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Mood Score
                              </span>
                            </div>
                            <span className={`font-bold text-lg ${getMoodColorClass(entry.moodScore)}`}>
                              {entry.moodScore !== null && entry.moodScore !== undefined && !isNaN(entry.moodScore)
                                ? entry.moodScore.toFixed(2)
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="mt-1 text-right">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {getMoodLabel(entry.moodScore)}
                            </span>
                          </div>
                        </div>

                        {/* Emotions Card */}
                        {parsedEmotions && Object.keys(parsedEmotions).length > 0 && (
                          <div className={`rounded-xl p-3 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100/80'} backdrop-blur-sm`}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-400 to-teal-400" />
                              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Emotions
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(parsedEmotions)
                                .filter(([, score]) => score > 0)
                                .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
                                .map(([emotion, score]) => (
                                  <span
                                    key={emotion}
                                    className={`inline-flex items-center gap-1 ${getChipStyle(emotion)} px-2 py-1 rounded-full text-xs font-medium shadow-sm`}
                                  >
                                    {emotion}
                                    <span className="opacity-80 text-[10px]">({score.toFixed(2)})</span>
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Concerns Card */}
                        {parsedCoreConcerns && parsedCoreConcerns.length > 0 && (
                          <div className={`rounded-xl p-3 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100/80'} backdrop-blur-sm`}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400" />
                              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Core Concerns
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {parsedCoreConcerns.map((concern, index) => (
                                <span
                                  key={index}
                                  className="bg-blue-500/20 dark:bg-blue-500/30 text-blue-700 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-500/30"
                                >
                                  {concern}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Growth Tips Card */}
                        {parsedGrowthTips && parsedGrowthTips.length > 0 && (
                          <div className={`rounded-xl p-3 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100/80'} backdrop-blur-sm`}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400" />
                              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Growth Tips
                              </span>
                            </div>
                            <ul className="space-y-1.5">
                              {parsedGrowthTips.map((tip, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm">
                                  <span className="text-amber-500 dark:text-amber-400 text-sm">✦</span>
                                  <span className="text-gray-700 dark:text-gray-300">{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Key Phrases Card */}
                        {parsedKeyPhrases && parsedKeyPhrases.length > 0 && (
                          <div className={`rounded-xl p-3 ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100/80'} backdrop-blur-sm`}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-pink-400" />
                              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Key Phrases
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {parsedKeyPhrases.map((phrase, index) => (
                                <span
                                  key={index}
                                  className="bg-purple-500/20 dark:bg-purple-500/30 text-purple-700 dark:text-purple-200 px-2 py-1 rounded-full text-xs font-medium border border-purple-200 dark:border-purple-500/30"
                                >
                                  {phrase}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Emotion Breakdown Chart */}
                        {/* Emotion Breakdown Chart */}
                        {chartDataForEntry && chartDataForEntry.datasets[0].data.length > 0 ? (
                          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-300 mt-4">
                            {/* Header with title and download button */}
                            <div className="flex justify-between items-center p-3 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm">
                              <h4 className="text-lg font-poppins font-semibold text-gray-800 dark:text-gray-200">
                                Emotion Breakdown
                              </h4>
                              <button
                                onClick={() => {
                                  const element = chartRefs.current[entry.id];
                                  if (element) {
                                    downloadChartAsPng(element, `entry_emotion_breakdown_${entry.id}`, isDarkMode);
                                  } else {
                                    console.error('Chart element not found for entry', entry.id);
                                  }
                                }}
                                className="p-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700 transition shadow-sm"
                                title="Download as PNG"
                              >
                                <Download size={16} className="text-gray-600 dark:text-gray-300" />
                              </button>
                            </div>
                            {/* Chart container – solid background for PNG capture */}
                            {/* Chart container – solid background for PNG capture */}
                            <div
                              ref={el => { chartRefs.current[entry.id] = el; }}
                              className="p-3 flex flex-col items-center"
                              style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}
                            >
                              {/* Date label – will appear in the downloaded PNG */}
                              <div className="text-center mb-2">
                                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                  {format(parseISO(entry.entryDate), 'EEEE, MMMM d, yyyy')}
                                  {entry.creationTimestamp && (
                                    <span className="ml-2 text-gray-400 dark:text-gray-500">
                                      • {format(parseISO(entry.creationTimestamp), 'h:mm a')}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="h-48 w-full max-w-xs mx-auto">
                                <Doughnut
                                  data={chartDataForEntry}
                                  options={{
                                    ...emotionChartOptions,
                                    plugins: {
                                      ...emotionChartOptions.plugins,
                                      legend: {
                                        ...emotionChartOptions.plugins?.legend,
                                        labels: {
                                          color: isDarkMode ? '#E0E0E0' : '#2D3748',
                                          font: { family: 'Inter, sans-serif', size: 10 },
                                        },
                                      },
                                      tooltip: {
                                        ...emotionChartOptions.plugins?.tooltip,
                                        backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                                        titleColor: isDarkMode ? '#E0E0E0' : '#1E1A3E',
                                        bodyColor: isDarkMode ? '#A0AEC0' : '#4B5563',
                                      },
                                    },
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm text-center">
                            <p className="text-gray-600 dark:text-gray-400 text-sm italic">
                              No detailed emotion data for this entry.
                            </p>
                          </div>
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