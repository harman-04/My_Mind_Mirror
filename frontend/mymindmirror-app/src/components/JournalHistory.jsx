// src/components/JournalHistory.js
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { format, parseISO } from "date-fns";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useTheme } from "../contexts/ThemeContext";
import { useUpdateJournalEntry, useDeleteJournalEntry,  useImportGrowthTip, useJournalEntryById  } from '../hooks/useJournalData';
import { SkeletonCard } from './Skeleton';
import { AlertTriangle, ChevronDown, ChevronUp, Edit, Trash2, BookOpen, Lightbulb, Heart, Brain, Target, Clock, Plus, Loader, Sparkles } from 'lucide-react';
import { downloadChartAsPng } from '../utils/downloadChart';
import DownloadChartButton from './DownloadChartButton';

// 💡 UPGRADED: Enterprise Markdown Parser
const formatText = (text) => {
  if (!text) return '';

  // Prevent AI from squishing numbered lists into a single paragraph
  let processedText = text.replace(/([:;?!.])\s+(?=\d+\.\s+[A-Z])/g, '$1\n');

  const escapeHtml = (str) => {
    return str.replace(/[&<>]/g, (m) => {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  };

  const applyMarkdown = (str) => {
    let formatted = escapeHtml(str);

    // 💡 NEW: Inline Code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="guide-code">$1</code>');

    // 💡 NEW: @Annotations (Uses our new index.css class!)
    formatted = formatted.replace(/(^|[\s([{])(@[A-Za-z0-9_]+)/g, '$1<span class="code-annotation">$2</span>');

    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italics
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Links with SVG icon
    formatted = formatted.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      `<a href="$2" target="_blank" rel="noopener noreferrer" class="resource-link">
        $1 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline; margin-left:2px; vertical-align:middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
      </a>`
    );

    return formatted;
  };

  const lines = processedText.split('\n');
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
      result.push('<hr class="guide-hr border-gray-200 dark:border-gray-700/50 my-4" />');
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      result.push(`<h${level} class="guide-heading">${applyMarkdown(headingMatch[2])}</h${level}>`);
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
          listItems.push(`<li>${applyMarkdown(content)}</li>`);
          i++;
        } else {
          break;
        }
      }
      result.push(`<${isOrdered ? 'ol' : 'ul'} class="guide-list">${listItems.join('')}</${isOrdered ? 'ol' : 'ul'}>`);
      continue;
    }

    if (line.trim()) {
      result.push(`<p class="guide-paragraph">${applyMarkdown(line)}</p>`);
    } else if (line === '') {
      result.push('<br/>');
    }
    i++;
  }
  return result.join('');
};

const TRUNCATION_LENGTH = 150;

ChartJS.register(ArcElement, Tooltip, Legend);

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

const emotionChipColors = {
  joy: "bg-green-500", sadness: "bg-blue-500", anger: "bg-red-500", fear: "bg-purple-500",
  surprise: "bg-yellow-500", disgust: "bg-indigo-500", love: "bg-pink-500", anxiety: "bg-orange-500",
  relief: "bg-teal-500", neutral: "bg-gray-500", excitement: "bg-lime-500", contentment: "bg-emerald-500",
  frustration: "bg-rose-500", gratitude: "bg-amber-500", hope: "bg-cyan-500",
};

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
      <div className={`relative max-w-md w-full rounded-2xl lg:rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 ${
        theme === 'dark' ? 'bg-[#1A162F]/95 backdrop-blur-xl border-white/10' : 'bg-white/95 backdrop-blur-xl border-gray-200'
      } border`}>
        <div className="p-6 lg:p-8 text-center">
          <div className="mx-auto w-14 h-14 lg:w-16 lg:h-16 mb-4 lg:mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 lg:w-8 lg:h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl lg:text-2xl font-poppins font-bold mb-2 tracking-tight text-gray-800 dark:text-gray-100">Delete Entry?</h3>
          <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 mb-6 lg:mb-8">Are you sure you want to delete this entry? This action cannot be undone.</p>
          <div className="flex justify-center gap-3">
            <button
                onClick={onConfirm}
                disabled={isDeleting}
                className="px-6 py-2.5 lg:py-3 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 font-medium disabled:opacity-50 transition-colors shadow-sm"
            >
                {isDeleting ? <Loader size={18} className="animate-spin" /> : null}
                {isDeleting ? "Deleting..." : "Delete"}
            </button>
            <button
                onClick={onClose}
                disabled={isDeleting}
                className="px-6 py-2.5 lg:py-3 rounded-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium disabled:opacity-50 transition-colors shadow-sm"
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

const ExpandedEntryContent = ({ entry, isDarkMode, sectionBg, cardBorder, getMoodColorClass, getMoodLabel, getChipStyle, emotionChartOptions, importGrowthTipMutation, isPending }) => {
  const parsedEmotions = entry.emotions && typeof entry.emotions === "string" ? JSON.parse(entry.emotions) : entry.emotions || {};
  const parsedCoreConcerns = entry.coreConcerns && typeof entry.coreConcerns === "string" ? JSON.parse(entry.coreConcerns) : entry.coreConcerns || [];
  const parsedGrowthTips = entry.growthTips && typeof entry.growthTips === "string" ? JSON.parse(entry.growthTips) : entry.growthTips || [];
  const parsedKeyPhrases = Array.isArray(entry.keyPhrases) ? entry.keyPhrases : [];

  const localChartRef = useRef(null);

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
          borderColor: isDarkMode ? '#131127' : '#ffffff',
          borderWidth: isDarkMode ? 1 : 2,
          hoverOffset: 6
        }],
      };
    } catch (e) {
      return null;
    }
  })();

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Raw Text */}
      <div className={`rounded-xl lg:rounded-2xl  p-3 lg:p-6 ${sectionBg} border ${cardBorder}`}>
        <div className="flex items-center gap-2 mb-2 lg:mb-3">
          <BookOpen className="w-4 h-4 lg:w-5 lg:h-5 text-purple-500 dark:text-purple-400" />
          <span className="text-xs lg:text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Journal Entry</span>
        </div>
        <p className="text-sm lg:text-base text-gray-800 dark:text-gray-200 leading-relaxed lg:leading-loose whitespace-pre-wrap">{entry.rawText}</p>
      </div>

      {/* Summary */}
      {entry.summary && (
        <div className={`rounded-xl lg:rounded-2xl p-3 lg:p-6 ${sectionBg} border ${cardBorder}`}>
          <div className="flex items-center gap-2 mb-2 lg:mb-3">
            <Brain className="w-4 h-4 lg:w-5 lg:h-5 text-teal-500 dark:text-teal-400" />
            <span className="text-xs lg:text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Summary</span>
          </div>
          <p className="text-sm lg:text-base text-gray-700 dark:text-gray-300 leading-relaxed">{entry.summary}</p>
        </div>
      )}

      {/* Mood Score */}
      <div className={`rounded-xl lg:rounded-2xl p-3 lg:p-6 ${sectionBg} border ${cardBorder}`}>
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <span className="text-xs lg:text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Mood Score</span>
          <span className={`font-bold text-lg lg:text-2xl ${getMoodColorClass(entry.moodScore)}`}>
            {entry.moodScore?.toFixed(2) ?? "N/A"} <span className="text-sm lg:text-lg opacity-80">({getMoodLabel(entry.moodScore)})</span>
          </span>
        </div>
      </div>

      {/* Emotions */}
      {Object.keys(parsedEmotions).length > 0 && (
        <div className={`rounded-xl lg:rounded-2xl p-3 lg:p-6 ${sectionBg} border ${cardBorder}`}>
          <div className="flex items-center gap-2 mb-3 lg:mb-4">
            <Heart className="w-4 h-4 lg:w-5 lg:h-5 text-pink-500 dark:text-pink-400" />
            <span className="text-xs lg:text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Emotions</span>
          </div>
          <div className="flex flex-wrap gap-2 lg:gap-3">
            {Object.entries(parsedEmotions).filter(([,score]) => score > 0).sort((a,b)=>b[1]-a[1]).map(([emotion, score]) => (
              <span key={emotion} className={`${getChipStyle(emotion)} inline-flex items-center gap-1.5 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-medium shadow-sm hover:-translate-y-0.5 transition-transform`}>
                {emotion} <span className="opacity-80 text-[10px] lg:text-xs">({score.toFixed(2)})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Core Concerns */}
      {parsedCoreConcerns.length > 0 && (
        <div className={`rounded-xl lg:rounded-2xl p-3 lg:p-6 ${sectionBg} border ${cardBorder}`}>
          <div className="flex items-center gap-2 mb-3 lg:mb-4">
            <Target className="w-4 h-4 lg:w-5 lg:h-5 text-blue-500 dark:text-blue-400" />
            <span className="text-xs lg:text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Core Concerns</span>
          </div>
          <div className="flex flex-wrap gap-2 lg:gap-3">
            {parsedCoreConcerns.map((c, idx) => (
              <span key={idx} className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-medium border border-blue-200 dark:border-blue-500/20 hover:-translate-y-0.5 transition-transform">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Growth Tips Section */}
      {parsedGrowthTips.length > 0 && (
        <div className={`rounded-xl lg:rounded-2xl p-3 lg:p-6 ${sectionBg} border ${cardBorder}`}>
          <div className="flex items-center gap-2 mb-4 lg:mb-5">
            <Lightbulb className="w-4 h-4 lg:w-5 lg:h-5 text-amber-500 dark:text-amber-400" />
            <span className="text-xs lg:text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Growth Tips & Resources</span>
          </div>
          <div className="space-y-4 lg:space-y-6">
            {parsedGrowthTips.map((tip, idx) => (
              <div key={idx} className="relative group bg-white/40 dark:bg-black/20 p-3 lg:p-5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                <div className="pr-10 lg:pr-14 prose prose-sm lg:prose-base dark:prose-invert max-w-none">
                  <div
                    className="growth-tip-content"
                    dangerouslySetInnerHTML={{ __html: formatText(tip) }}
                  />
                </div>
                <button
                  onClick={() => importGrowthTipMutation.mutate(tip)}
                  disabled={isPending}
                  className="absolute top-3 right-3 lg:top-4 lg:right-4 p-2 lg:p-2.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center shadow-sm"
                  title="Add to Milestones"
                >
                  <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Phrases */}
      {parsedKeyPhrases.length > 0 && (
        <div className={`rounded-xl lg:rounded-2xl p-3 lg:p-6 ${sectionBg} border ${cardBorder}`}>
          <div className="flex items-center gap-2 mb-3 lg:mb-4">
            <Target className="w-4 h-4 lg:w-5 lg:h-5 text-purple-500 dark:text-purple-400" />
            <span className="text-xs lg:text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Key Phrases</span>
          </div>
          <div className="flex flex-wrap gap-2 lg:gap-3">
            {parsedKeyPhrases.map((p, idx) => (
              <span key={idx} className="bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-xs lg:text-sm font-medium border border-purple-200 dark:border-purple-500/20 hover:-translate-y-0.5 transition-transform">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Emotion Breakdown Chart */}
      {chartData && chartData.datasets[0].data.length > 0 ? (
        <div className={`rounded-xl lg:rounded-2xl ${sectionBg} border ${cardBorder} overflow-hidden`}>
          <div className="flex flex-wrap gap-3 justify-between items-center p-4 lg:p-5 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-black/10">
            <span className="text-sm lg:text-base font-bold tracking-tight text-gray-800 dark:text-gray-200">Emotion Breakdown</span>

            <DownloadChartButton
              chartRef={localChartRef}
              filename={`entry_emotion_breakdown_${entry.id}`}
              darkMode={isDarkMode}
              className="hover:scale-105 transition-transform shrink-0"
            />
          </div>

          <div ref={localChartRef} className="p-4 sm:p-6 lg:p-8 flex flex-col items-center" style={{ backgroundColor: isDarkMode ? '#131127' : '#ffffff' }}>
            <div className="text-center mb-4 text-xs lg:text-sm font-medium text-gray-500 dark:text-gray-400">
              {format(parseISO(entry.entryDate), 'EEEE, MMMM d, yyyy')}
              {entry.creationTimestamp && <span className="ml-2 opacity-70">• {format(parseISO(entry.creationTimestamp), 'h:mm a')}</span>}
            </div>
            <div className="relative w-full h-[220px] sm:h-[260px] lg:h-[300px] flex items-center justify-center">
              <Doughnut data={chartData} options={emotionChartOptions} />
            </div>
          </div>
        </div>
      ) : (
        <div className={`text-center p-6 lg:p-8 rounded-xl lg:rounded-2xl ${sectionBg} border ${cardBorder} text-gray-500 dark:text-gray-400 italic text-sm lg:text-base`}>
          No detailed emotion data for this entry.
        </div>
      )}
    </div>
  );
};

const AnalysisLoadingState = ({ sectionBg, cardBorder }) => (
  <div className={`space-y-4 lg:space-y-6 p-4 lg:p-6 rounded-xl lg:rounded-2xl ${sectionBg} border ${cardBorder} animate-pulse`}>
    <div className="flex items-center gap-2 mb-2 lg:mb-4">
      <Brain className="w-5 h-5 lg:w-6 lg:h-6 text-purple-500 dark:text-purple-400 animate-bounce" />
      <div className="h-4 lg:h-5 w-32 bg-gray-300 dark:bg-gray-700/50 rounded-full"></div>
    </div>
    <div className="space-y-3 lg:space-y-4">
      <div className="h-4 lg:h-5 bg-gray-200 dark:bg-gray-700/50 rounded-full w-full"></div>
      <div className="h-4 lg:h-5 bg-gray-200 dark:bg-gray-700/50 rounded-full w-5/6"></div>
      <div className="h-4 lg:h-5 bg-gray-200 dark:bg-gray-700/50 rounded-full w-4/5"></div>
    </div>
    <div className="flex gap-3 pt-4 lg:pt-6">
      <div className="h-8 lg:h-10 w-24 lg:w-32 bg-gray-200 dark:bg-gray-700/50 rounded-full"></div>
      <div className="h-8 lg:h-10 w-24 lg:w-32 bg-gray-200 dark:bg-gray-700/50 rounded-full"></div>
    </div>
  </div>
);

function JournalHistory({ entries, clusterThemes, filterClusterId, filterPhrase, isLoading, searchType }) {
  const [expandedEntryId, setExpandedEntryId] = useState(null);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editedText, setEditedText] = useState("");
  const [editError, setEditError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState(null);
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

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

  const cardBg = isDarkMode ? 'bg-[#1A162F]/60 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl';
  const cardBorder = isDarkMode ? 'border-white/10' : 'border-gray-200/50';
  const sectionBg = isDarkMode ? 'bg-[#131127]/60 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md';

  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 640);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  const emotionChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: isMobile ? "bottom" : "right",
        labels: {
          color: isDarkMode ? '#E0E0E0' : '#2D3748',
          font: { family: "Inter", size: isMobile ? 10 : 12 },
          boxWidth: isMobile ? 8 : 12,
          padding: isMobile ? 12 : 16,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDarkMode ? '#E0E0E0' : '#1E1A3E',
        bodyColor: isDarkMode ? '#CBD5E1' : '#475569',
        borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: (ctx) => `${ctx.label}: ${(ctx.parsed * 100).toFixed(1)}%`,
        },
      },
    },
    cutout: isMobile ? "60%" : "65%",
  };

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

  let groupedEntries = {};
  let sortedDates = [];

  if (searchType === 'semantic') {
    const semanticKey = "Matches Ranked by AI Relevance";
    groupedEntries[semanticKey] = filteredEntries;
    sortedDates = [semanticKey];
  } else {
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

  if (filteredEntries.length === 0) {
    let msg = "No journal entries yet. Start writing your first reflection!";
    if (filterClusterId !== null && filterClusterId !== undefined) {
      const themeName = clusterThemes?.[`Theme ${filterClusterId + 1}`] || `Theme ${filterClusterId + 1}`;
      msg = `No entries found for the selected theme: "${themeName}".`;
    } else if (filterPhrase) {
      msg = `No entries found containing the phrase "${filterPhrase}".`;
    }
    return <div className="text-center py-12 lg:py-16 text-gray-500 dark:text-gray-400 font-inter text-base lg:text-lg">{msg}</div>;
  }

  return (
    <div className="font-inter w-full space-y-6 lg:space-y-8">
      {sortedDates.map(dateKey => (
        <div key={dateKey} className="space-y-4 lg:space-y-5">
          <h3 className="text-xl lg:text-2xl font-poppins font-bold text-purple-600 dark:text-teal-400 mb-3 lg:mb-4 pb-2 lg:pb-3 border-b border-purple-200 dark:border-teal-800/50 tracking-tight">
            {searchType === 'semantic' ? (
                <span className="flex items-center gap-2 lg:gap-3">
                    <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-teal-400" /> {dateKey}
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
                  <div key={entry.id} className={`rounded-2xl lg:rounded-3xl ${cardBg} border ${cardBorder} shadow-lg ring-1 ring-black/5 dark:ring-white/5 transition-all duration-500 overflow-hidden hover:shadow-xl`}>

                      {/* Card Header */}
                      <div className="p-3 lg:p-5 cursor-pointer flex flex-wrap justify-between items-center bg-white/30 dark:bg-black/20 hover:bg-white/50 dark:hover:bg-black/40 transition-colors gap-3" onClick={() => toggleExpand(entry.id)}>
                          <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                              {/* 💡 FIX: Clock icon now properly syncs with Dark Mode Teal */}
                              <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-purple-500 dark:text-teal-400" />
                              <span className="text-sm lg:text-base font-semibold text-gray-800 dark:text-gray-200">
                                  {searchType === 'semantic' && entry.creationTimestamp
                                      ? format(parseISO(entry.creationTimestamp), "MMM d, yyyy • h:mm a")
                                      : entry.creationTimestamp ? format(parseISO(entry.creationTimestamp), "h:mm a") : "N/A"}
                              </span>

                             <span className={`text-sm lg:text-base font-bold flex items-center gap-2 ${isProcessing ? 'text-purple-500' : getMoodColorClass(displayEntry.moodScore)}`}>
                               {isProcessing ? (
                                 <span className="inline-flex items-center gap-1.5 bg-purple-500/10 px-2.5 py-1 rounded-md animate-pulse">
                                   <Loader className="w-3.5 h-3.5 lg:w-4 lg:h-4 animate-spin" /> Analyzing...
                                 </span>
                               ) : (
                                 <>
                                   {getMoodLabel(displayEntry.moodScore)}
                                   <span className="text-xs lg:text-sm font-medium opacity-70 hidden sm:inline-block">({displayEntry.moodScore?.toFixed(2)})</span>
                                 </>
                               )}
                             </span>
                          </div>

                          <div className="text-gray-500 shrink-0 ml-auto sm:ml-2">
                              {expandedEntryId === entry.id ? <ChevronUp className="w-5 h-5 lg:w-6 lg:h-6" /> : <ChevronDown className="w-5 h-5 lg:w-6 lg:h-6" />}
                          </div>
                      </div>

                      {/* Collapsed Preview */}
                      {expandedEntryId !== entry.id && (
                          <div className="p-3 lg:p-5 pt-0 lg:pt-0 text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed lg:leading-loose">
                              {entry.rawText.length > TRUNCATION_LENGTH
                                  ? `${entry.rawText.slice(0, TRUNCATION_LENGTH)}...`
                                  : entry.rawText}
                          </div>
                      )}

                      {/* Expanded Content */}
                      {expandedEntryId === entry.id && (
                          <div className="p-3 lg:p-6 pt-3 space-y-3 lg:space-y-6">
                              {editingEntryId === entry.id ? (
                                  <div id={`edit-area-${entry.id}`} className="space-y-3 lg:space-y-4 pt-3">
                                    <textarea
                                      value={editedText}
                                      onChange={e => setEditedText(e.target.value)}
                                      className={`w-full p-4 lg:p-5 rounded-xl lg:rounded-2xl border resize-y min-h-[150px] focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all text-sm lg:text-base ${
                                        isDarkMode ? 'bg-[#131127]/80 text-gray-200 border-gray-600/50' : 'bg-white/80 text-gray-800 border-gray-300'
                                      }`}
                                    />
                                    {editError && <p className="text-red-500 text-sm font-medium">{editError}</p>}
                                    <div className="flex flex-wrap justify-end gap-3 mt-3">
                                      <button onClick={handleCancelEdit} className="px-5 py-2 lg:py-2.5 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm lg:text-base font-semibold">Cancel</button>
                                      <button onClick={() => handleSaveEdit(entry.id)} disabled={updateMutation.isPending} className="px-5 py-2 lg:py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold shadow-md hover:shadow-lg transition-all text-sm lg:text-base disabled:opacity-50">
                                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                                      </button>
                                    </div>
                                  </div>
                              ) : showSkeleton ? (
                                  <div className="pt-3">
                                      <AnalysisLoadingState sectionBg={sectionBg} cardBorder={cardBorder} />
                                  </div>
                              ) : (
                                  <>
                                      <ExpandedEntryContent
                                          entry={displayEntry}
                                          isDarkMode={isDarkMode}
                                          sectionBg={sectionBg}
                                          cardBorder={cardBorder}
                                          getMoodColorClass={getMoodColorClass}
                                          getMoodLabel={getMoodLabel}
                                          getChipStyle={getChipStyle}
                                          emotionChartOptions={emotionChartOptions}
                                          importGrowthTipMutation={importGrowthTipMutation}
                                          isPending={importGrowthTipMutation.isPending}
                                      />
                                     <div className="flex flex-wrap justify-end gap-2 lg:gap-3 pt-3 lg:pt-4 border-t border-gray-200 dark:border-gray-700/50 mt-3 lg:mt-4">
                                        <button
                                          onClick={() => handleEditClick(entry)}
                                          className="px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition flex items-center gap-1.5 text-xs lg:text-sm font-bold shadow-sm"
                                        >
                                          <Edit className="w-4 h-4" /> Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteClick(entry.id)}
                                          className="px-4 py-2 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition flex items-center gap-1.5 text-xs lg:text-sm font-bold shadow-sm"
                                        >
                                          <Trash2 className="w-4 h-4" /> Delete
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
        <div className="fixed bottom-4 right-4 bg-red-100 dark:bg-red-900/90 text-red-800 dark:text-red-200 px-5 py-3 rounded-xl shadow-2xl z-50 font-medium text-sm lg:text-base">
          {updateMutation.isError && `Update failed: ${updateMutation.error.message}`}
          {deleteMutation.isError && `Delete failed: ${deleteMutation.error.message}`}
        </div>
      )}
    </div>
  );
}

export default React.memo(JournalHistory);