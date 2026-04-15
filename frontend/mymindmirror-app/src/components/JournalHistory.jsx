// src/components/JournalHistory.js
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { format, parseISO } from "date-fns";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useTheme } from "../contexts/ThemeContext";
import { useUpdateJournalEntry, useDeleteJournalEntry } from '../hooks/useJournalData';
import { SkeletonCard } from './Skeleton';
import { AlertTriangle, Download, ChevronDown, ChevronUp, Edit, Trash2, Save, X, BookOpen, Lightbulb, Heart, Brain, Target, Clock } from 'lucide-react';
import { downloadChartAsPng } from '../utils/downloadChart';

const TRUNCATION_LENGTH = 150;

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Emotion color palettes (unchanged)
const EMOTION_CHART_COLORS = {
  joy: "#5CC8C2", sadness: "#B399D4", anger: "#FF8A7A", fear: "#A93226",
  surprise: "#85C1E9", neutral: "#E0E0E0", love: "#E74C3C", disgust: "#6C3483",
  anxiety: "#F7DC6F", optimism: "#F1C40F", relief: "#58D68D", caring: "#2ECC71",
  curiosity: "#AF7AC5", embarrassment: "#D35400", pride: "#F39C12", remorse: "#7F8C8D",
  annoyance: "#E67E22", disappointment: "#283747", grief: "#17202A", excitement: "#FFD700",
  contentment: "#90EE90", frustration: "#FF4500", gratitude: "#ADFF2F", hope: "#ADD8E6",
};

const EMOTION_CHART_COLORS_DARK = {
  joy: "#8DE2DD", sadness: "#C7B3E6", anger: "#FFB0A4", fear: "#D45E4D",
  surprise: "#B0D9F7", neutral: "#A0A0A0", love: "#FF7F7F", disgust: "#9B6EB4",
  anxiety: "#FFF0B3", optimism: "#FFD750", relief: "#8CE0B0", caring: "#58D68D",
  curiosity: "#C79BE0", embarrassment: "#FF8C40", pride: "#FFC050", remorse: "#B0B8B8",
  annoyance: "#FFAB66", disappointment: "#506A80", grief: "#404040", excitement: "#FFE680",
  contentment: "#C0FFC0", frustration: "#FF7F50", gratitude: "#D0FF80", hope: "#C0E0FF",
};

// Emotion chip styles (unchanged)
const emotionChipColors = {
  joy: "bg-green-500", sadness: "bg-blue-500", anger: "bg-red-500", fear: "bg-purple-500",
  surprise: "bg-yellow-500", disgust: "bg-indigo-500", love: "bg-pink-500", anxiety: "bg-orange-500",
  relief: "bg-teal-500", neutral: "bg-gray-500", excitement: "bg-lime-500", contentment: "bg-emerald-500",
  frustration: "bg-rose-500", gratitude: "bg-amber-500", hope: "bg-cyan-500",
};

// ------------------------------------------------------------------
// Portal-based Delete Confirmation Modal (glass version)
// ------------------------------------------------------------------
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, theme }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);
  if (!isOpen || !mounted) return null;
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className={`relative max-w-md w-full rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 ${
        theme === 'dark' ? 'bg-gray-800/95 backdrop-blur-md border-gray-700' : 'bg-white/95 backdrop-blur-md border-gray-200'
      } border`}>
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-poppins font-semibold mb-2">Delete Journal Entry</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to delete this entry? This action cannot be undone.</p>
          <div className="flex justify-center gap-3">
            <button onClick={onConfirm} className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium transition shadow-md">Delete</button>
            <button onClick={onClose} className="px-5 py-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition">Cancel</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ------------------------------------------------------------------
// Main JournalHistory Component (enhanced UI/UX, all logic preserved)
// ------------------------------------------------------------------
function JournalHistory({ entries, clusterThemes, filterClusterId, filterPhrase, isLoading }) {
  const [expandedEntryId, setExpandedEntryId] = useState(null);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [editError, setEditError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState(null);
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const chartRefs = useRef({});

  const updateMutation = useUpdateJournalEntry();
  const deleteMutation = useDeleteJournalEntry();

  // Glass‑morphic styles
  const cardBg = isDarkMode ? 'bg-gray-800/60 backdrop-blur-md' : 'bg-white/70 backdrop-blur-md';
  const cardBorder = isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50';
  const sectionBg = isDarkMode ? 'bg-gray-800/40 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm';
  const textPrimary = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-300' : 'text-gray-600';

  if (isLoading) return <SkeletonCard count={3} />;

  // --- Filter entries (unchanged) ---
  let filteredEntries = entries;
  if (filterClusterId !== null && filterClusterId !== undefined) {
    filteredEntries = filteredEntries.filter(entry => entry.clusterId === filterClusterId);
  }
  if (filterPhrase) {
    const lowerPhrase = filterPhrase.toLowerCase();
    filteredEntries = filteredEntries.filter(entry =>
      Array.isArray(entry.keyPhrases) && entry.keyPhrases.some(phrase => phrase.toLowerCase().includes(lowerPhrase))
    );
  }

  // Group by date
  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    const dateKey = format(parseISO(entry.entryDate), "EEEE, MMMM dd, yyyy");
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    acc[dateKey].sort((a, b) => parseISO(b.creationTimestamp) - parseISO(a.creationTimestamp));
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedEntries).sort((a, b) => {
    const dateA = parseISO(a.split(", ")[1] + ", " + a.split(", ")[2]);
    const dateB = parseISO(b.split(", ")[1] + ", " + b.split(", ")[2]);
    return dateB - dateA;
  });

  const toggleExpand = (id) => {
    setExpandedEntryId(expandedEntryId === id ? null : id);
    if (expandedEntryId === id && editingEntryId === id) handleCancelEdit();
  };

  const scrollToEditArea = (entryId) => {
    setTimeout(() => {
      const el = document.getElementById(`edit-area-${entryId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleEditClick = (entry) => {
    setEditingEntryId(entry.id);
    setEditedText(entry.rawText);
    setEditError("");
    setExpandedEntryId(entry.id);
    scrollToEditArea(entry.id);
  };

  const handleSaveEdit = async (entryId) => {
    if (!editedText.trim()) {
      setEditError("Journal entry cannot be empty.");
      return;
    }
    try {
      await updateMutation.mutateAsync({ entryId, updatedText: editedText });
      setEditingEntryId(null);
      setEditedText("");
      setEditError("");
    } catch (err) {
      setEditError("Failed to update entry. Please try again.");
    }
  };

  const handleCancelEdit = () => {
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
    if (moodScore === null || isNaN(moodScore)) return "text-gray-500 dark:text-gray-400";
    if (moodScore >= 0.7) return "text-green-500 dark:text-green-400";
    if (moodScore >= 0.3) return "text-lime-500 dark:text-lime-400";
    if (moodScore > -0.3 && moodScore < 0.3) return "text-yellow-500 dark:text-yellow-400";
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
      emotions = typeof emotionsData === "string" ? JSON.parse(emotionsData) : emotionsData;
    } catch (e) { return null; }
    if (!emotions || Object.keys(emotions).length === 0) return null;
    const labels = Object.keys(emotions);
    const data = Object.values(emotions);
    const filteredLabels = [];
    const filteredData = [];
    labels.forEach((label, idx) => {
      if (data[idx] > 0.01) {
        filteredLabels.push(label.charAt(0).toUpperCase() + label.slice(1));
        filteredData.push(data[idx]);
      }
    });
    if (filteredLabels.length === 0) return null;
    const palette = isDarkMode ? EMOTION_CHART_COLORS_DARK : EMOTION_CHART_COLORS;
    const backgroundColors = filteredLabels.map(l => palette[l.toLowerCase()] || "#CCCCCC");
    return {
      labels: filteredLabels,
      datasets: [{
        data: filteredData,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(c => c + "CC"),
        borderWidth: 1,
      }],
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
          color: isDarkMode ? "#E0E0E0" : "rgb(75, 85, 99)",
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${(ctx.parsed * 100).toFixed(1)}%`,
        },
      },
    },
    cutout: "60%",
  };

  const getChipStyle = (emotion) => {
    const base = emotionChipColors[emotion.toLowerCase()] || "bg-gray-500";
    return `${base} text-white text-xs px-2 py-1 rounded-full`;
  };

  // Empty state
  if (filteredEntries.length === 0) {
    let msg = "No journal entries yet. Start writing your first reflection!";
    if (filterClusterId !== null && filterClusterId !== undefined) {
      const themeName = clusterThemes?.[`Theme ${filterClusterId + 1}`] || `Theme ${filterClusterId + 1}`;
      msg = `No entries found for the selected theme: "${themeName}".`;
    } else if (filterPhrase) {
      msg = `No entries found containing the phrase "${filterPhrase}".`;
    }
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400 font-inter">
        {msg}
      </div>
    );
  }

  return (
    <div className="font-inter w-full space-y-6">
      {sortedDates.map(dateKey => (
        <div key={dateKey} className="space-y-4">
          <h3 className="text-xl font-poppins font-semibold text-purple-600 dark:text-teal-400 mb-2 pb-2 border-b border-purple-200 dark:border-teal-800">
            {dateKey}
          </h3>
          {groupedEntries[dateKey].map(entry => {
            const parsedEmotions = entry.emotions && typeof entry.emotions === "string" ? JSON.parse(entry.emotions) : entry.emotions || {};
            const parsedCoreConcerns = entry.coreConcerns && typeof entry.coreConcerns === "string" ? JSON.parse(entry.coreConcerns) : entry.coreConcerns || [];
            const parsedGrowthTips = entry.growthTips && typeof entry.growthTips === "string" ? JSON.parse(entry.growthTips) : entry.growthTips || [];
            const parsedKeyPhrases = Array.isArray(entry.keyPhrases) ? entry.keyPhrases : [];
            const chartData = getEmotionChartData(parsedEmotions);
            const themeName = (entry.clusterId !== null && entry.clusterId !== undefined && clusterThemes)
              ? clusterThemes[`Theme ${entry.clusterId + 1}`] || `Theme ${entry.clusterId + 1}`
              : "Unassigned";

            return (
              <div
                key={entry.id}
                className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg transition-all duration-300 hover:shadow-xl overflow-hidden`}
              >
                {/* Card Header (collapsible) */}
                <div
                  className="p-4 cursor-pointer flex justify-between items-center bg-white/10 dark:bg-black/10"
                  onClick={() => toggleExpand(entry.id)}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Clock size={14} className="text-purple-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {entry.creationTimestamp ? format(parseISO(entry.creationTimestamp), "h:mm a") : "N/A"}
                    </span>
                    <span className={`text-sm font-semibold ${getMoodColorClass(entry.moodScore)}`}>
                      {getMoodLabel(entry.moodScore)} ({entry.moodScore?.toFixed(2) ?? "N/A"})
                    </span>
                    {entry.clusterId !== null && entry.clusterId !== undefined && (
                      <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                        Theme: {themeName}
                      </span>
                    )}
                  </div>
                  <div className="text-gray-500">
                    {expandedEntryId === entry.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {/* Collapsed preview (truncated text) */}
                {expandedEntryId !== entry.id && (
                  <div className="p-4 pt-0 text-sm text-gray-600 dark:text-gray-400">
                    {entry.rawText.length > TRUNCATION_LENGTH
                      ? `${entry.rawText.slice(0, TRUNCATION_LENGTH)}...`
                      : entry.rawText}
                  </div>
                )}

                {/* Expanded content */}
                {expandedEntryId === entry.id && (
                  <div className="p-4 pt-0 space-y-4">
                    {editingEntryId === entry.id ? (
                      // Edit mode
                      <div id={`edit-area-${entry.id}`} className="space-y-3">
                        <textarea
                          value={editedText}
                          onChange={e => setEditedText(e.target.value)}
                          className={`w-full p-3 rounded-xl border resize-y min-h-[120px] focus:ring-2 focus:ring-purple-500 focus:outline-none transition ${
                            isDarkMode ? 'bg-gray-800 text-gray-200 border-gray-600' : 'bg-gray-50 text-gray-800 border-gray-300'
                          }`}
                        />
                        {editError && <p className="text-red-500 text-sm">{editError}</p>}
                        <div className="flex justify-end gap-3">
                          <button onClick={handleCancelEdit} className="px-4 py-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 transition">Cancel</button>
                          <button onClick={() => handleSaveEdit(entry.id)} disabled={updateMutation.isPending} className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 text-white font-medium hover:shadow-md transition">
                            {updateMutation.isPending ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Full expanded view (non‑editing)
                      <div className="space-y-4">
                        {/* Raw Text */}
                        <div className={`rounded-xl p-3 ${sectionBg} border ${cardBorder}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen size={14} className="text-purple-400" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Journal Entry</span>
                          </div>
                          <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{entry.rawText}</p>
                        </div>

                        {/* Summary */}
                        {entry.summary && (
                          <div className={`rounded-xl p-3 ${sectionBg} border ${cardBorder}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Brain size={14} className="text-teal-400" />
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Summary</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{entry.summary}</p>
                          </div>
                        )}

                        {/* Mood Score (inline) */}
                        <div className={`rounded-xl p-3 ${sectionBg} border ${cardBorder}`}>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Mood Score</span>
                            <span className={`font-bold text-lg ${getMoodColorClass(entry.moodScore)}`}>
                              {entry.moodScore?.toFixed(2) ?? "N/A"} ({getMoodLabel(entry.moodScore)})
                            </span>
                          </div>
                        </div>

                        {/* Emotions */}
                        {Object.keys(parsedEmotions).length > 0 && (
                          <div className={`rounded-xl p-3 ${sectionBg} border ${cardBorder}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Heart size={14} className="text-pink-400" />
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Emotions</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(parsedEmotions).filter(([,score]) => score > 0).sort((a,b)=>b[1]-a[1]).map(([emotion, score]) => (
                                <span key={emotion} className={`${getChipStyle(emotion)} inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs shadow-sm`}>
                                  {emotion} <span className="opacity-80 text-[10px]">({score.toFixed(2)})</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Core Concerns */}
                        {parsedCoreConcerns.length > 0 && (
                          <div className={`rounded-xl p-3 ${sectionBg} border ${cardBorder}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Target size={14} className="text-blue-400" />
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Core Concerns</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {parsedCoreConcerns.map((c, idx) => (
                                <span key={idx} className="bg-blue-500/20 dark:bg-blue-500/30 text-blue-700 dark:text-blue-200 px-2 py-1 rounded-full text-xs border border-blue-200 dark:border-blue-500/30">{c}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Growth Tips */}
                        {parsedGrowthTips.length > 0 && (
                          <div className={`rounded-xl p-3 ${sectionBg} border ${cardBorder}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Lightbulb size={14} className="text-amber-400" />
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Growth Tips</span>
                            </div>
                            <ul className="space-y-1.5">
                              {parsedGrowthTips.map((tip, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <span className="text-amber-500 text-sm">✦</span>
                                  <span className="text-gray-700 dark:text-gray-300">{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Key Phrases */}
                        {parsedKeyPhrases.length > 0 && (
                          <div className={`rounded-xl p-3 ${sectionBg} border ${cardBorder}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Target size={14} className="text-purple-400" />
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Key Phrases</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {parsedKeyPhrases.map((p, idx) => (
                                <span key={idx} className="bg-purple-500/20 dark:bg-purple-500/30 text-purple-700 dark:text-purple-200 px-2 py-1 rounded-full text-xs border border-purple-200 dark:border-purple-500/30">{p}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Emotion Breakdown Chart (with download) */}
                        {chartData && chartData.datasets[0].data.length > 0 ? (
                          <div className={`rounded-2xl ${sectionBg} border ${cardBorder} overflow-hidden`}>
                            <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Emotion Breakdown</span>
                              <button
                                onClick={() => {
                                  const el = chartRefs.current[entry.id];
                                  if (el) downloadChartAsPng(el, `entry_emotion_breakdown_${entry.id}`, isDarkMode);
                                }}
                                className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                                title="Download chart as PNG"
                              >
                                <Download size={16} className="text-gray-600 dark:text-gray-300" />
                              </button>
                            </div>
                            <div ref={el => { chartRefs.current[entry.id] = el; }} className="p-4 flex flex-col items-center" style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}>
                              <div className="text-center mb-2 text-xs text-gray-500 dark:text-gray-400">
                                {format(parseISO(entry.entryDate), 'EEEE, MMMM d, yyyy')}
                                {entry.creationTimestamp && <span className="ml-2">• {format(parseISO(entry.creationTimestamp), 'h:mm a')}</span>}
                              </div>
                              <div className="h-48 w-full max-w-xs mx-auto">
                                <Doughnut data={chartData} options={{
                                  ...emotionChartOptions,
                                  plugins: {
                                    ...emotionChartOptions.plugins,
                                    legend: { ...emotionChartOptions.plugins.legend, labels: { color: isDarkMode ? '#E0E0E0' : '#2D3748', font: { size: 10 } } }
                                  }
                                }} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center p-4 rounded-xl bg-gray-100 dark:bg-gray-800/50 text-gray-500 italic text-sm">No detailed emotion data for this entry.</div>
                        )}

                        {/* Edit/Delete buttons */}
                        <div className="flex justify-end gap-2 pt-2">
                          <button onClick={() => handleEditClick(entry)} className="px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300 hover:bg-blue-500/30 transition flex items-center gap-1 text-sm"><Edit size={14} /> Edit</button>
                          <button onClick={() => handleDeleteClick(entry.id)} className="px-3 py-1.5 rounded-full bg-red-500/20 text-red-600 dark:text-red-300 hover:bg-red-500/30 transition flex items-center gap-1 text-sm"><Trash2 size={14} /> Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <DeleteConfirmationModal isOpen={showDeleteConfirm} onClose={cancelDelete} onConfirm={confirmDelete} theme={theme} />

      {(updateMutation.isError || deleteMutation.isError) && (
        <div className="fixed bottom-4 right-4 bg-red-100 dark:bg-red-900/80 text-red-800 dark:text-red-200 px-4 py-2 rounded-lg shadow-lg z-50">
          {updateMutation.isError && `Update failed: ${updateMutation.error.message}`}
          {deleteMutation.isError && `Delete failed: ${deleteMutation.error.message}`}
        </div>
      )}
    </div>
  );
}

export default JournalHistory;