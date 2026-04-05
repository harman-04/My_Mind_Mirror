// src/components/RoadmapPlanner.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useRoadmaps, useGenerateRoadmap, useDeleteRoadmap, useImportTaskToMilestone,
    useToggleTaskCompletion, useContinueRoadmap, useElaborateTask,
    useRescheduleRoadmap } from '../hooks/useRoadmap';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import { Loader, Sparkles, CheckCircle, Circle, ExternalLink, Target, Trash2, ChevronDown, ChevronUp, BookOpen, ListChecks, Award, Calendar, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

// ------------------------------------------------------------------
// Helper to format markdown-like text (unchanged)
// ------------------------------------------------------------------
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

  const formatInline = (line) => {
    if (!line) return '';
    let formatted = escapeHtml(line);
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    return formatted;
  };

  const lines = text.split('\n');
  const result = [];
  let i = 0;
  const total = lines.length;

  const getHeadingLevel = (line) => {
    const match = line.match(/^(#{1,6})\s+(.*)/);
    if (match) {
      const level = match[1].length;
      const content = match[2];
      return { level, content };
    }
    return null;
  };

  const getBlockquote = (line) => {
    if (line.startsWith('> ')) return line.substring(2);
    return null;
  };

  const isHorizontalRule = (line) => /^(\*{3,}|-{3,}|_{3,})$/.test(line.trim());

  let inCodeBlock = false;
  let codeBlockContent = [];
  let codeBlockLang = '';

  const flushCodeBlock = () => {
    if (codeBlockContent.length > 0) {
      const codeHtml = `<pre><code class="language-${codeBlockLang}">${escapeHtml(codeBlockContent.join('\n'))}</code></pre>`;
      result.push(codeHtml);
      codeBlockContent = [];
      codeBlockLang = '';
    }
    inCodeBlock = false;
  };

  while (i < total) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.trim().substring(3).trim();
        i++;
        continue;
      } else {
        flushCodeBlock();
        i++;
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      i++;
      continue;
    }

    const heading = getHeadingLevel(line);
    if (heading) {
      result.push(`<h${heading.level} class="roadmap-heading">${formatInline(heading.content)}</h${heading.level}>`);
      i++;
      continue;
    }

    if (isHorizontalRule(line)) {
      result.push('<hr class="roadmap-hr"/>');
      i++;
      continue;
    }

    const blockquoteContent = getBlockquote(line);
    if (blockquoteContent !== null) {
      let quoteText = blockquoteContent;
      let j = i + 1;
      while (j < total && lines[j].startsWith('> ')) {
        quoteText += '\n' + lines[j].substring(2);
        j++;
      }
      const quotedHtml = formatText(quoteText);
      result.push(`<blockquote class="roadmap-blockquote">${quotedHtml}</blockquote>`);
      i = j;
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
          listItems.push(`<li>${formatInline(content)}</li>`);
          i++;
        } else {
          break;
        }
      }
      const listTag = isOrdered ? 'ol' : 'ul';
      result.push(`<${listTag} class="roadmap-list">${listItems.join('')}</${listTag}>`);
      continue;
    }

    if (line.trim() === '') {
      result.push('<br/>');
      i++;
      continue;
    }

    result.push(`<p class="roadmap-paragraph">${formatInline(line)}</p>`);
    i++;
  }

  if (inCodeBlock) flushCodeBlock();
  return result.join('');
};

// ------------------------------------------------------------------
// Portal-based Delete Confirmation Modal (for roadmaps)
// ------------------------------------------------------------------
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, roadmapTitle, theme }) => {
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
          <h3 className="text-xl font-poppins font-semibold mb-2">Delete Roadmap</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            Are you sure you want to delete <strong className="font-semibold">"{roadmapTitle}"</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">This action cannot be undone.</p>
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
// Portal-based Task Detail Modal (beautiful redesign)
// ------------------------------------------------------------------
const TaskDetailModal = ({ task, isOpen, onClose, onElaborate, isElaborating }) => {
  const { theme } = useTheme();
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

  if (!isOpen || !task || !mounted) return null;

  const hasDetails = task.details && task.details.trim().length > 0;
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const bgClass = theme === 'dark' ? 'bg-gray-900/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md';
  const borderClass = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className={`relative max-w-2xl w-full rounded-2xl ${bgClass} border ${borderClass} shadow-2xl overflow-hidden transform transition-all duration-300 scale-100 animate-in fade-in zoom-in`}>
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/30 dark:to-teal-900/30">
          <h3 className="text-xl font-poppins font-semibold bg-gradient-to-r from-purple-600 to-teal-600 dark:from-purple-400 dark:to-teal-400 bg-clip-text text-transparent">
            {task.description}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 dark:hover:bg-gray-700 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <style>{`
            .roadmap-details p.roadmap-paragraph {
              margin-bottom: 0.75rem;
              line-height: 1.6;
            }
            .roadmap-details ul.roadmap-list,
            .roadmap-details ol.roadmap-list {
              margin: 0.5rem 0 0.75rem 1.5rem;
              padding-left: 0;
            }
            .roadmap-details li {
              margin-bottom: 0.25rem;
              line-height: 1.5;
            }
            .roadmap-details strong {
              font-weight: 700;
              color: ${theme === 'dark' ? '#C7B3E6' : '#B399D4'};
            }
            .roadmap-details em {
              font-style: italic;
              color: ${theme === 'dark' ? '#8DE2DD' : '#5CC8C2'};
            }
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: ${theme === 'dark' ? '#374151' : '#E5E7EB'};
              border-radius: 10px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: ${theme === 'dark' ? '#8B5CF6' : '#C084FC'};
              border-radius: 10px;
            }
          `}</style>

          {!hasDetails && !hasSubtasks ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <BookOpen size={32} className="text-purple-500" />
              </div>
              <p className="text-gray-500 mb-4">This task doesn't have detailed instructions yet.</p>
              <button
                onClick={() => onElaborate(task.id, false)}
                disabled={isElaborating}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 text-white font-medium hover:shadow-lg transition disabled:opacity-50"
              >
                {isElaborating ? 'Generating...' : 'Generate Detailed Guide'}
              </button>
            </div>
          ) : (
            <>
              {hasDetails && (
                <div className="bg-purple-50/30 dark:bg-purple-900/20 rounded-xl p-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3 text-purple-700 dark:text-purple-300">
                    <BookOpen size={18} /> Details
                  </h4>
                  <div className="roadmap-details text-sm text-gray-700 dark:text-gray-300">
                    <div dangerouslySetInnerHTML={{ __html: formatText(task.details) }} />
                  </div>
                </div>
              )}
              {hasSubtasks && (
                <div className="bg-teal-50/30 dark:bg-teal-900/20 rounded-xl p-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-3 text-teal-700 dark:text-teal-300">
                    <ListChecks size={18} /> Subtasks
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {task.subtasks.map((sub, idx) => (
                      <li key={idx}>{sub}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => onElaborate(task.id, false)}
                  disabled={isElaborating}
                  className="px-4 py-1.5 text-sm rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50"
                >
                  Regenerate
                </button>
                <button
                  onClick={() => onElaborate(task.id, true)}
                  disabled={isElaborating}
                  className="px-4 py-1.5 text-sm rounded-full bg-gradient-to-r from-purple-500 to-teal-500 text-white hover:shadow-md transition disabled:opacity-50"
                >
                  {isElaborating ? 'Enhancing...' : 'Enhance (More detail)'}
                </button>
              </div>
            </>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-800/50">
          <button onClick={onClose} className="px-5 py-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ------------------------------------------------------------------
// Loading Skeleton Component (enhanced)
// ------------------------------------------------------------------
const RoadmapSkeleton = ({ theme }) => {
  const bgClass = theme === 'dark' ? 'bg-gray-800/60' : 'bg-white/70';
  const borderClass = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  return (
    <div className={`p-6 rounded-2xl ${bgClass} border ${borderClass} shadow-md backdrop-blur-sm animate-pulse`}>
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2 flex-1">
          <div className="h-6 bg-gradient-to-r from-purple-200 to-teal-200 dark:from-purple-800 dark:to-teal-800 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </div>
      <div className="mb-4">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-full"></div>
        <div className="flex justify-between mt-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
      </div>
      <div className="mt-5 flex gap-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-full"></div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------
// Main RoadmapPlanner Component (beautiful, robust, with delete modal)
// ------------------------------------------------------------------
function RoadmapPlanner() {
  const { theme } = useTheme();
  const { data: roadmaps, isLoading, isError, refetch } = useRoadmaps();
  const generateMutation = useGenerateRoadmap();
  const deleteMutation = useDeleteRoadmap();
  const importTaskMutation = useImportTaskToMilestone();
  const toggleTaskMutation = useToggleTaskCompletion();
  const continueMutation = useContinueRoadmap();
  const elaborateMutation = useElaborateTask();
  const rescheduleMutation = useRescheduleRoadmap();

  const [goal, setGoal] = useState('');
  const [timeframeWeeks, setTimeframeWeeks] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [completedRoadmapIds, setCompletedRoadmapIds] = useState(new Set());
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, roadmapId: null, roadmapTitle: '' });

  // After mutation, update selectedTask if it matches the elaborated task
  useEffect(() => {
    if (selectedTask && roadmaps) {
      for (const roadmap of roadmaps) {
        const updatedTask = roadmap.tasks?.find(t => t.id === selectedTask.id);
        if (updatedTask) {
          setSelectedTask(updatedTask);
          break;
        }
      }
    }
  }, [roadmaps, selectedTask?.id]);

  // Check for newly completed roadmaps (all tasks done)
  useEffect(() => {
    if (roadmaps) {
      roadmaps.forEach(roadmap => {
        const totalTasks = roadmap.tasks?.length || 0;
        const completedTasks = roadmap.tasks?.filter(t => t.completed).length || 0;
        if (totalTasks > 0 && completedTasks === totalTasks && !completedRoadmapIds.has(roadmap.id)) {
          setCompletedRoadmapIds(prev => new Set(prev).add(roadmap.id));
          toast.success(`🎉 Congratulations! You've completed "${roadmap.title}"!`, {
            duration: 5000,
            icon: '🏆',
          });
        }
      });
    }
  }, [roadmaps, completedRoadmapIds]);

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!goal.trim()) return;
    generateMutation.mutate(
      { goal: goal.trim(), timeframeWeeks: timeframeWeeks ? parseInt(timeframeWeeks) : null },
      {
        onSuccess: () => {
          setGoal('');
          setTimeframeWeeks('');
          setShowForm(false);
          refetch();
          toast.success('Roadmap generated successfully!');
        },
      }
    );
  };

  const handleDeleteClick = (id, title) => {
    setDeleteModal({ isOpen: true, roadmapId: id, roadmapTitle: title });
  };

  const confirmDelete = () => {
    deleteMutation.mutate(deleteModal.roadmapId, {
      onSuccess: () => {
        toast.success('Roadmap deleted');
        setDeleteModal({ isOpen: false, roadmapId: null, roadmapTitle: '' });
      },
      onError: () => {
        toast.error('Failed to delete roadmap');
        setDeleteModal({ isOpen: false, roadmapId: null, roadmapTitle: '' });
      },
    });
  };

  const handleElaborate = async (taskId, enhance = false) => {
    try {
      await elaborateMutation.mutateAsync({ taskId, enhance });
      await refetch();
      toast.success(enhance ? 'Task enhanced with more details!' : 'Task details regenerated!');
    } catch {
      toast.error('Failed to generate details');
    }
  };

  const importTaskToMilestone = (roadmapId, taskId, taskDescription) => {
    importTaskMutation.mutate({ roadmapId, taskId }, {
      onSuccess: () => toast.success(`✨ "${taskDescription}" added to Milestones`),
      onError: (error) => toast.error(`Failed to add task: ${error.message}`)
    });
  };

  const toggleTaskExpand = (taskId) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const toggleWeekExpand = (week) => {
    setExpandedWeeks(prev => ({ ...prev, [week]: !prev[week] }));
  };

  const bgClass = theme === 'dark' ? 'bg-gray-800/40 backdrop-blur-sm' : 'bg-white/60 backdrop-blur-sm';
  const borderClass = theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200/50';
  const cardBgClass = theme === 'dark' ? 'bg-gray-800/70 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md';

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gradient-to-r from-purple-200 to-teal-200 dark:from-purple-800 dark:to-teal-800 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-full w-28 animate-pulse"></div>
        </div>
        <RoadmapSkeleton theme={theme} />
        <RoadmapSkeleton theme={theme} />
        <RoadmapSkeleton theme={theme} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-red-500 font-medium">Failed to load roadmaps. Please try again later.</p>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 rounded-full bg-purple-500 text-white hover:bg-purple-600 transition">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header + New Roadmap Button */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-poppins font-bold bg-gradient-to-r from-[#B399D4] to-[#5CC8C2] bg-clip-text text-transparent">
            Personal Growth Roadmaps
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your AI-powered journey to success</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="group px-5 py-2.5 rounded-full bg-gradient-to-r from-[#B399D4] to-[#5CC8C2] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
        >
          <Sparkles size={18} className="group-hover:rotate-12 transition" />
          {showForm ? 'Cancel' : '+ New Roadmap'}
        </button>
      </div>

      {/* Generation Form (glass card) */}
      {showForm && (
        <div className={`p-6 rounded-2xl ${bgClass} border ${borderClass} shadow-xl backdrop-blur-md transition-all duration-300`}>
          <h3 className="text-xl font-semibold mb-5 flex items-center gap-2">
            <Sparkles size={22} className="text-purple-500" />
            Create Your Personalized Roadmap
          </h3>
          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">What do you want to achieve?</label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g., Learn React Native, Run a marathon, Start a blog"
                className="w-full p-3 rounded-xl border dark:bg-gray-800/80 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Timeframe (weeks) – optional</label>
              <input
                type="number"
                value={timeframeWeeks}
                onChange={(e) => setTimeframeWeeks(e.target.value)}
                placeholder="e.g., 12"
                className="w-full p-3 rounded-xl border dark:bg-gray-800/80 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                min="1"
              />
            </div>
            <button
              type="submit"
              disabled={generateMutation.isPending}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-teal-500 text-white font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generateMutation.isPending ? <Loader className="animate-spin w-5 h-5" /> : <Sparkles size={18} />}
              {generateMutation.isPending ? 'Generating...' : 'Generate Roadmap'}
            </button>
          </form>
          {generateMutation.isError && (
            <p className="text-red-500 text-sm mt-3">Error: {generateMutation.error.message}</p>
          )}
        </div>
      )}

      {/* Roadmaps List */}
      {roadmaps?.length === 0 && !showForm && (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Target size={40} className="text-purple-400" />
          </div>
          <p className="text-gray-500 text-lg">No roadmaps yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-5 py-2 rounded-full bg-purple-500 text-white hover:bg-purple-600 transition"
          >
            Create your first roadmap
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {roadmaps?.map((roadmap) => {
          const totalTasks = roadmap.tasks?.length || 0;
          const completedTasks = roadmap.tasks?.filter(t => t.completed).length || 0;
          const completionPercent = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
          const remainingWeeks = Math.max(0, (roadmap.durationWeeks || 1) - new Set(roadmap.tasks?.filter(t => t.completed).map(t => t.weekNumber)).size);
          const remainingTasksCount = totalTasks - completedTasks;
          const isCompleted = completionPercent === 100 && totalTasks > 0;

          const tasksByWeek = {};
          roadmap.tasks?.forEach(task => {
            const week = task.weekNumber || 1;
            if (!tasksByWeek[week]) tasksByWeek[week] = [];
            tasksByWeek[week].push(task);
          });
          Object.keys(tasksByWeek).forEach(week => {
            tasksByWeek[week].sort((a, b) => (a.dayNumber || 999) - (b.dayNumber || 999));
          });
          const sortedWeeks = Object.keys(tasksByWeek).sort((a, b) => a - b);

          return (
            <div
              key={roadmap.id}
              className={`relative rounded-2xl ${cardBgClass} border ${borderClass} shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden`}
            >
              {/* Gradient top bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-teal-500"></div>

              {/* Delete button */}
              <button
                onClick={() => handleDeleteClick(roadmap.id, roadmap.title)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition z-10"
                disabled={deleteMutation.isPending}
                title="Delete roadmap"
              >
                <Trash2 size={18} className="text-red-400 hover:text-red-500" />
              </button>

              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-4 pr-8">
                  <div>
                    <h3 className="text-2xl font-poppins font-bold bg-gradient-to-r from-purple-600 to-teal-600 dark:from-purple-400 dark:to-teal-400 bg-clip-text text-transparent">
                      {roadmap.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(roadmap.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Clock size={14} /> {roadmap.durationWeeks} weeks</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isCompleted
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                      : roadmap.status === 'ACTIVE'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {isCompleted ? '🏆 Completed' : roadmap.status}
                  </span>
                </div>

                {/* Progress Dashboard */}
                <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-purple-50/50 to-teal-50/50 dark:from-purple-900/20 dark:to-teal-900/20">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium flex items-center gap-1"><TrendingUp size={14} /> Overall Progress</span>
                    <span className="font-bold">{Math.round(completionPercent)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-teal-500 h-2.5 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${completionPercent}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-3">
                    <span className="flex items-center gap-1"><CheckCircle size={12} /> Completed: {completedTasks}/{totalTasks} tasks</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> Est. remaining: ~{remainingWeeks} weeks</span>
                  </div>
                </div>

                {/* Tasks grouped by week */}
                {sortedWeeks.length > 0 && (
                  <div className="mb-5">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-purple-700 dark:text-purple-300">
                      <Target size={18} /> Actionable Tasks
                    </h4>
                    <div className="space-y-4">
                      {sortedWeeks.map((week) => {
                        const tasks = tasksByWeek[week];
                        const isExpanded = expandedWeeks[week];
                        const weekCompleted = tasks.every(t => t.completed);
                        return (
                          <div key={week} className="border-l-2 border-purple-300 dark:border-purple-700 pl-4">
                            <button
                              onClick={() => toggleWeekExpand(week)}
                              className="flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 hover:opacity-80 transition"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              Week {week}
                              {weekCompleted && <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">✓ Done</span>}
                            </button>
                            {isExpanded && (
                              <div className="space-y-3">
                                {tasks.map((task) => (
                                  <div key={task.id} className="group bg-gray-50/50 dark:bg-gray-800/30 rounded-xl p-3 hover:bg-gray-100/70 dark:hover:bg-gray-800/50 transition">
                                    <div className="flex items-start gap-3">
                                      <button
                                        onClick={() => toggleTaskMutation.mutate(task.id)}
                                        className="focus:outline-none mt-0.5"
                                        disabled={toggleTaskMutation.isPending}
                                      >
                                        {task.completed ? (
                                          <CheckCircle size={18} className="text-green-500" />
                                        ) : (
                                          <Circle size={18} className="text-gray-400 group-hover:text-gray-500" />
                                        )}
                                      </button>
                                      <div className="flex-1">
                                        <div className="flex flex-wrap justify-between items-start gap-2">
                                          <button
                                            onClick={() => setSelectedTask(task)}
                                            className="text-left font-medium hover:text-purple-600 dark:hover:text-purple-400 transition"
                                          >
                                            <span className={task.completed ? 'line-through text-gray-400' : ''}>
                                              {task.description}
                                              {task.dayNumber && <span className="text-xs text-gray-400 ml-2">(Day {task.dayNumber})</span>}
                                            </span>
                                          </button>
                                          <div className="flex items-center gap-1">
                                            {task.importedToMilestone && (
                                              <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                                                ✓ in Milestones
                                              </span>
                                            )}
                                            {(task.details || (task.subtasks && task.subtasks.length > 0)) && (
                                              <button
                                                onClick={() => toggleTaskExpand(task.id)}
                                                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                                              >
                                                {expandedTaskId === task.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                              </button>
                                            )}
                                            <button
                                              onClick={() => importTaskToMilestone(roadmap.id, task.id, task.description)}
                                              className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-lg transition"
                                              title="Add to Milestones"
                                            >
                                              Add
                                            </button>
                                          </div>
                                        </div>
                                        {expandedTaskId === task.id && (
                                          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                            <div className="roadmap-details mt-2" dangerouslySetInnerHTML={{ __html: formatText(task.details) }} />
                                            {task.subtasks && task.subtasks.length > 0 && (
                                              <ul className="list-disc list-inside ml-2 mt-1">
                                                {task.subtasks.map((sub, idx) => <li key={idx}>{sub}</li>)}
                                              </ul>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Resources */}
                {roadmap.resources && roadmap.resources.length > 0 && (
                  <div className="mb-5">
                    <h4 className="font-semibold mb-2 text-teal-700 dark:text-teal-300">Recommended Resources</h4>
                    <div className="flex flex-wrap gap-2">
                      {roadmap.resources.map((res) => (
                        <a
                          key={res.id}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 text-xs hover:bg-purple-200 dark:hover:bg-purple-800/60 transition"
                        >
                          {res.name} <ExternalLink size={12} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Milestones */}
                {roadmap.milestones && roadmap.milestones.length > 0 && (
                  <div className="mb-5">
                    <h4 className="font-semibold mb-2 text-amber-700 dark:text-amber-300">Key Milestones</h4>
                    <div className="flex flex-wrap gap-2">
                      {roadmap.milestones.map((milestone) => (
                        <span key={milestone.id} className="px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-1">
                          <Award size={12} /> {milestone.name} {milestone.weekNumber && `(Week ${milestone.weekNumber})`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button
                    onClick={() => continueMutation.mutate(roadmap.id)}
                    disabled={continueMutation.isPending || completedTasks === 0}
                    className={`flex-1 py-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                      completedTasks === 0
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 to-teal-500 text-white hover:shadow-lg'
                    }`}
                  >
                    {continueMutation.isPending ? <Loader className="animate-spin w-4 h-4" /> : <Sparkles size={16} />}
                    {continueMutation.isPending ? 'Generating...' : 'Continue Roadmap'}
                  </button>
                  <button
                    onClick={() => rescheduleMutation.mutate(roadmap.id)}
                    disabled={rescheduleMutation.isPending || remainingTasksCount === 0}
                    className={`flex-1 py-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                      remainingTasksCount === 0
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg'
                    }`}
                  >
                    {rescheduleMutation.isPending ? <Loader className="animate-spin w-4 h-4" /> : <Calendar size={16} />}
                    {rescheduleMutation.isPending ? 'Rescheduling...' : 'Smart Reschedule'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onElaborate={handleElaborate}
        isElaborating={elaborateMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, roadmapId: null, roadmapTitle: '' })}
        onConfirm={confirmDelete}
        roadmapTitle={deleteModal.roadmapTitle}
        theme={theme}
      />
    </div>
  );
}

export default RoadmapPlanner;