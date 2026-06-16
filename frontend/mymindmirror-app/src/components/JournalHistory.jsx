// src/components/JournalHistory.js
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { format, parseISO } from "date-fns";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useTheme } from "../contexts/ThemeContext";
import { useUpdateJournalEntry, useDeleteJournalEntry,  useImportGrowthTip, useJournalEntryById  } from '../hooks/useJournalData';
import { SkeletonCard } from './Skeleton';
import { AlertTriangle, Download, ChevronDown, ChevronUp, Edit, Trash2, Save, X, BookOpen, Lightbulb, Heart, Brain, Target, Clock, Plus, Loader, Sparkles } from 'lucide-react';
import { downloadChartAsPng } from '../utils/downloadChart';

// Helper to format markdown-like text (headings, blockquotes, lists, bold, italic, line breaks)
const formatText = (text) => {
  if (!text) return '';
  const escapeHtml = (str) => {
    return str.replace(/[&<>]/g, (m) => {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  };

  // 💡 HELPER: Applies Bold, Italic, and Link formatting to any string
  const applyMarkdown = (str) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')

      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        `<a href="$2" target="_blank" rel="noopener noreferrer" class="resource-link">
          $1 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline; margin-left:2px; vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>`
      );
  };

  const lines = text.split('\n');
  const result = [];
  let i = 0;
  const total = lines.length;

  const processBlockquote = (startIdx) => {
    const quoteLines = [];
    let j = startIdx;
    while (j < total && lines[j].startsWith('> ')) {
      quoteLines.push(lines[j].substring(2));
      j++;
    }
    const innerHtml = formatText(quoteLines.join('\n'));
    result.push(`<blockquote class="guide-blockquote">${innerHtml}</blockquote>`);
    return j;
  };

  while (i < total) {
    const line = lines[i];

    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      result.push('<hr class="guide-hr" />');
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      result.push(`<h${level} class="guide-heading">${applyMarkdown(escapeHtml(headingMatch[2]))}</h${level}>`);
      i++;
      continue;
    }

    if (line.startsWith('> ')) {
      i = processBlockquote(i);
      continue;
    }

    const bulletMatch = line.match(/^\s*(\*|\-)\s+(.*)/);
    const numberMatch = line.match(/^\s*(\d+)\.\s+(.*)/);
    if (bulletMatch || numberMatch) {
      const isOrdered = !!numberMatch;
      const listItems = [];
      while (i < total) {
        const currentLine = lines[i];
        const bullet = currentLine.match(/^\s*(\*|\-)\s+(.*)/);
        const number = currentLine.match(/^\s*(\d+)\.\s+(.*)/);
        if (bullet || number) {
          const content = bullet ? bullet[2] : number[2];
          listItems.push(`<li>${applyMarkdown(escapeHtml(content))}</li>`);
          i++;
        } else {
          break;
        }
      }
      result.push(`<${isOrdered ? 'ol' : 'ul'} class="guide-list">${listItems.join('')}</${isOrdered ? 'ol' : 'ul'}>`);
      continue;
    }

    if (line.trim()) {
      result.push(`<p class="guide-paragraph">${applyMarkdown(escapeHtml(line))}</p>`);
    } else if (line === '') {
      result.push('<br/>');
    }
    i++;
  }
  return result.join('');
};
const TRUNCATION_LENGTH = 150;

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

// Emotion color palettes
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

// Emotion chip styles
const emotionChipColors = {
  joy: "bg-green-500", sadness: "bg-blue-500", anger: "bg-red-500", fear: "bg-purple-500",
  surprise: "bg-yellow-500", disgust: "bg-indigo-500", love: "bg-pink-500", anxiety: "bg-orange-500",
  relief: "bg-teal-500", neutral: "bg-gray-500", excitement: "bg-lime-500", contentment: "bg-emerald-500",
  frustration: "bg-rose-500", gratitude: "bg-amber-500", hope: "bg-cyan-500",
};

// ------------------------------------------------------------------
// Portal-based Delete Confirmation Modal
// ------------------------------------------------------------------
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, theme, isDeleting }) => {
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
            <button
                                onClick={onConfirm}
                                disabled={isDeleting}
                                className="px-5 py-2 rounded-full bg-red-600 text-white flex items-center gap-2 disabled:opacity-50"
                            >
                                {isDeleting ? <Loader size={16} className="animate-spin" /> : null}
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                            <button
                                onClick={onClose}
                                disabled={isDeleting}
                                className="px-5 py-2 rounded-full bg-gray-200 text-gray-800 disabled:opacity-50"
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

const ExpandedEntryContent = ({ entry, isDarkMode, chartRefs, sectionBg, cardBorder, getMoodColorClass, getMoodLabel, getChipStyle, emotionChartOptions, importGrowthTipMutation, isPending }) => {
  const parsedEmotions = entry.emotions && typeof entry.emotions === "string" ? JSON.parse(entry.emotions) : entry.emotions || {};
  const parsedCoreConcerns = entry.coreConcerns && typeof entry.coreConcerns === "string" ? JSON.parse(entry.coreConcerns) : entry.coreConcerns || [];
  const parsedGrowthTips = entry.growthTips && typeof entry.growthTips === "string" ? JSON.parse(entry.growthTips) : entry.growthTips || [];
  const parsedKeyPhrases = Array.isArray(entry.keyPhrases) ? entry.keyPhrases : [];
  const chartData = (() => {
    if (!entry.emotions) return null;
    try {
      const emotions = typeof entry.emotions === "string" ? JSON.parse(entry.emotions) : entry.emotions;
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
    } catch (e) {
      return null;
    }
  })();

  return (
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

      {/* Mood Score */}
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

      {/* Growth Tips Section */}
      {parsedGrowthTips.length > 0 && (
        <div className={`rounded-xl p-3 ${sectionBg} border ${cardBorder}`}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={14} className="text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Growth Tips & Resources</span>
          </div>
          <div className="space-y-4">
            {parsedGrowthTips.map((tip, idx) => (
              <div key={idx} className="relative group">
                <div className="pr-12 prose prose-sm dark:prose-invert max-w-none">
                  <div
                    className="growth-tip-content"
                    dangerouslySetInnerHTML={{ __html: formatText(tip) }}
                  />
                </div>
                <button
                  onClick={() => importGrowthTipMutation.mutate(tip)}
                  disabled={isPending}
                  className="absolute top-0 right-0 p-1.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300 hover:bg-blue-500/30 transition disabled:opacity-50"
                  title="Add to Milestones"
                >
                  <Plus size={14} />
                </button>
              </div>
            ))}
          </div>
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

      {/* Emotion Breakdown Chart */}
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
          <div ref={el => { if (el) chartRefs.current[entry.id] = el; }} className="p-4 flex flex-col items-center" style={{ backgroundColor: isDarkMode ? '#1f2937' : '#ffffff' }}>
            <div className="text-center mb-2 text-xs text-gray-500 dark:text-gray-400">
              {format(parseISO(entry.entryDate), 'EEEE, MMMM d, yyyy')}
              {entry.creationTimestamp && <span className="ml-2">• {format(parseISO(entry.creationTimestamp), 'h:mm a')}</span>}
            </div>
            <div className="h-48 w-full max-w-xs mx-auto">
              <Doughnut data={chartData} options={emotionChartOptions} />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-4 rounded-xl bg-gray-100 dark:bg-gray-800/50 text-gray-500 italic text-sm">No detailed emotion data for this entry.</div>
      )}
    </div>
  );
};

const AnalysisLoadingState = ({ sectionBg, cardBorder }) => (
  <div className={`space-y-4 p-4 rounded-xl ${sectionBg} border ${cardBorder} animate-pulse`}>
    <div className="flex items-center gap-2 mb-2">
      <Brain size={14} className="text-purple-400 animate-bounce" />
      <div className="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
    </div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
    </div>
    <div className="flex gap-2 pt-4">
      <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
    </div>
    <div className="h-48 w-48 mx-auto rounded-full border-4 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center">
       <span className="text-[10px] text-gray-400">Processing Insights...</span>
    </div>
  </div>
);

// ------------------------------------------------------------------
// Main JournalHistory Component
// ------------------------------------------------------------------
// 💡 UPDATED: Now receives searchType as a prop
function JournalHistory({ entries, clusterThemes, filterClusterId, filterPhrase, isLoading, searchType }) {
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
  const importGrowthTipMutation = useImportGrowthTip();

  const isProcessing = (entry) => entry && entry.moodScore === null;

  const { data: fetchedEntry, isLoading: isFetchingEntry } = useJournalEntryById(
    expandedEntryId,
    expandedEntryId !== null &&
      editingEntryId !== expandedEntryId &&
      isProcessing(entries?.find(e => e.id === expandedEntryId))
  );

  const cardBg = isDarkMode ? 'bg-gray-800/60 backdrop-blur-md' : 'bg-white/70 backdrop-blur-md';
  const cardBorder = isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50';
  const sectionBg = isDarkMode ? 'bg-gray-800/40 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm';

  if (isLoading) return <SkeletonCard count={3} />;

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

  // 💡 NEW: Relevance Bypass Logic
  let groupedEntries = {};
  let sortedDates = [];

  if (searchType === 'semantic') {
    // If it's a semantic search, DO NOT sort by date. Preserve the AI relevance array!
    const semanticKey = "Matches Ranked by AI Relevance";
    groupedEntries[semanticKey] = filteredEntries;
    sortedDates = [semanticKey];
  } else {
    // Standard Date grouping for normal history viewing
    groupedEntries = filteredEntries.reduce((acc, entry) => {
      const dateKey = format(parseISO(entry.entryDate), "EEEE, MMMM dd, yyyy");
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(entry);
      acc[dateKey].sort((a, b) => parseISO(b.creationTimestamp) - parseISO(a.creationTimestamp));
      return acc;
    }, {});
    sortedDates = Object.keys(groupedEntries).sort((a, b) => {
      const dateA = parseISO(a.split(", ")[1] + ", " + a.split(", ")[2]);
      const dateB = parseISO(b.split(", ")[1] + ", " + b.split(", ")[2]);
      return dateB - dateA;
    });
  }

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
      const idToDelete = deleteEntryId;
      await deleteMutation.mutateAsync(idToDelete);
      if (expandedEntryId === idToDelete) {
        setExpandedEntryId(null);
      }
      setShowDeleteConfirm(false);
      setDeleteEntryId(null);
      toast.success("Entry deleted successfully");
    } catch (err) {
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

  const getChipStyle = (emotion) => {
    const base = emotionChipColors[emotion.toLowerCase()] || "bg-gray-500";
    return `${base} text-white text-xs px-2 py-1 rounded-full`;
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

  if (filteredEntries.length === 0) {
    let msg = "No journal entries yet. Start writing your first reflection!";
    if (filterClusterId !== null && filterClusterId !== undefined) {
      const themeName = clusterThemes?.[`Theme ${filterClusterId + 1}`] || `Theme ${filterClusterId + 1}`;
      msg = `No entries found for the selected theme: "${themeName}".`;
    } else if (filterPhrase) {
      msg = `No entries found containing the phrase "${filterPhrase}".`;
    }
    return <div className="text-center py-12 text-gray-500 dark:text-gray-400 font-inter">{msg}</div>;
  }

  return (
    <div className="font-inter w-full space-y-6">
      {sortedDates.map(dateKey => (
        <div key={dateKey} className="space-y-4">
          <h3 className="text-xl font-poppins font-semibold text-purple-600 dark:text-teal-400 mb-2 pb-2 border-b border-purple-200 dark:border-teal-800">
            {searchType === 'semantic' ? (
                <span className="flex items-center gap-2">
                    <Sparkles size={20} /> {dateKey}
                </span>
            ) : dateKey}
          </h3>
          {groupedEntries[dateKey].map((entry, index) => {
              const isThisEntryExpanded = expandedEntryId === entry.id;
              const displayEntry = (isThisEntryExpanded && fetchedEntry && fetchedEntry.id === entry.id)
                  ? fetchedEntry
                  : entry;

              const isProcessing = displayEntry.moodScore === null;
              const showSkeleton = isThisEntryExpanded && isProcessing;
                return (
                        <div key={entry.id} className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-lg transition-all duration-500 overflow-hidden`}>
                            {/* Card Header */}
                            <div
                                className="p-4 cursor-pointer flex justify-between items-center bg-white/10 dark:bg-black/10"
                                onClick={() => toggleExpand(entry.id)}
                            >
                                <div className="flex flex-wrap items-center gap-3">
                                    <Clock size={14} className="text-purple-400" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        {/* If semantic, show full date next to time since they aren't grouped by date anymore */}
                                        {searchType === 'semantic' && entry.creationTimestamp
                                            ? format(parseISO(entry.creationTimestamp), "MMM d, yyyy • h:mm a")
                                            : entry.creationTimestamp ? format(parseISO(entry.creationTimestamp), "h:mm a") : "N/A"}
                                    </span>

                                   <span className={`text-sm font-semibold flex items-center gap-2 ${isProcessing ? 'text-purple-500' : getMoodColorClass(displayEntry.moodScore)}`}>
                                     {isProcessing ? (
                                       <span className="inline-flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded-md animate-pulse">
                                         <Loader size={12} className="animate-spin" /> Analyzing...
                                       </span>
                                     ) : (
                                       <>
                                         {getMoodLabel(displayEntry.moodScore)}
                                         <span className="text-xs opacity-60">({displayEntry.moodScore?.toFixed(2)})</span>
                                       </>
                                     )}
                                   </span>
                                </div>
                                <div className="text-gray-500">
                                    {expandedEntryId === entry.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </div>

                           {/* Collapsed Preview */}
                           {expandedEntryId !== entry.id && (
                               <div className="p-4 pt-0 text-sm text-gray-600 dark:text-gray-400">
                                   {entry.rawText.length > TRUNCATION_LENGTH
                                       ? `${entry.rawText.slice(0, TRUNCATION_LENGTH)}...`
                                       : entry.rawText}
                               </div>
                           )}

                           {/* Expanded Content */}
                           {expandedEntryId === entry.id && (
                               <div className="p-4 pt-0 space-y-4">
                                   {editingEntryId === entry.id ? (
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
                    ) : showSkeleton ? (
                                                <AnalysisLoadingState sectionBg={sectionBg} cardBorder={cardBorder} />
                                            ) : (
                                                <>
                                                    <ExpandedEntryContent
                                                        entry={displayEntry}
                                                        isDarkMode={isDarkMode}
                                                        chartRefs={chartRefs}
                                                        sectionBg={sectionBg}
                                                        cardBorder={cardBorder}
                                                        getMoodColorClass={getMoodColorClass}
                                                        getMoodLabel={getMoodLabel}
                                                        getChipStyle={getChipStyle}
                                                        emotionChartOptions={emotionChartOptions}
                                                        importGrowthTipMutation={importGrowthTipMutation}
                                                        isPending={importGrowthTipMutation.isPending}
                                                    />
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            onClick={() => handleEditClick(entry)}
                            className="px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-300 hover:bg-blue-500/30 transition flex items-center gap-1 text-sm"
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(entry.id)}
                            className="px-3 py-1.5 rounded-full bg-red-500/20 text-red-600 dark:text-red-300 hover:bg-red-500/30 transition flex items-center gap-1 text-sm"
                          >
                            <Trash2 size={14} /> Delete
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

      <DeleteConfirmationModal isOpen={showDeleteConfirm} onClose={cancelDelete} onConfirm={confirmDelete} theme={theme}  isDeleting={deleteMutation.isPending}/>

      {(updateMutation.isError || deleteMutation.isError) && (
        <div className="fixed bottom-4 right-4 bg-red-100 dark:bg-red-900/80 text-red-800 dark:text-red-200 px-4 py-2 rounded-lg shadow-lg z-50">
          {updateMutation.isError && `Update failed: ${updateMutation.error.message}`}
          {deleteMutation.isError && `Delete failed: ${deleteMutation.error.message}`}
        </div>
      )}
    </div>
  );
}

export default React.memo(JournalHistory);