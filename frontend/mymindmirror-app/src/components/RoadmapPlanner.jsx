// src/components/RoadmapPlanner.jsx
import React, { useState, useEffect, useCallback, useMemo  } from 'react';
import ReactDOM from 'react-dom';
import { useRoadmaps, useGenerateRoadmap, useDeleteRoadmap, useImportTaskToMilestone,
    useToggleTaskCompletion, useContinueRoadmap, useElaborateTask,
    useRescheduleRoadmap, useContinueRoadmapBatch } from '../hooks/useRoadmap';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import {
  Loader, Sparkles, CheckCircle, Circle, ExternalLink, Target, Trash2,
  ChevronDown, ChevronUp, BookOpen, ListChecks, Award, Calendar, Clock,
  TrendingUp, AlertTriangle, BarChart2, List, Video, FileText, GraduationCap
} from 'lucide-react';
import RoadmapTimeline from './RoadmapTimeline'; // new import
import { useUserProfile } from '../hooks/useUserProfile';
import { useQueryClient } from '@tanstack/react-query';

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
// Portal-based Delete Confirmation Modal (unchanged)
// ------------------------------------------------------------------
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, roadmapTitle, theme, isLoading }) => {
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
               disabled={isLoading}
               className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium transition shadow-md disabled:opacity-50"
             >
               {isLoading ? <Loader size={16} className="animate-spin mr-1" /> : 'Delete'}
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
// Portal-based Task Detail Modal (unchanged)
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
// Loading Skeleton Component (unchanged)
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
// Main RoadmapPlanner Component (with Timeline toggle)
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
  const { roadmapPreferences } = useUserProfile();
  const continueBatchMutation = useContinueRoadmapBatch();
  const queryClient = useQueryClient();
  const [timeframeValue, setTimeframeValue] = useState(4);
  const [timeframeUnit, setTimeframeUnit] = useState('WEEKS');
  const [overridePreferences, setOverridePreferences] = useState(false);
  const [difficulty, setDifficulty] = useState('BEGINNER');
  const [language, setLanguage] = useState('en');
  const [learningStyle, setLearningStyle] = useState('READING');
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [avoidWeekends, setAvoidWeekends] = useState(false);

  const [goal, setGoal] = useState('');
//   const [timeframeWeeks, setTimeframeWeeks] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [completedRoadmapIds, setCompletedRoadmapIds] = useState(new Set());
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, roadmapId: null, roadmapTitle: '' });
const [continuingRoadmapId, setContinuingRoadmapId] = useState(null);
  // NEW: per-roadmap view mode (list or timeline)
  const [viewModeMap, setViewModeMap] = useState({});
const [visibleWeeksMap, setVisibleWeeksMap] = useState({});

const [isDeleting, setIsDeleting] = useState(false);


  const toggleViewMode = (roadmapId) => {
    setViewModeMap(prev => ({
      ...prev,
      [roadmapId]: prev[roadmapId] === 'timeline' ? 'list' : 'timeline'
    }));
  };


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

  // Check for newly completed roadmaps
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

useEffect(() => {
  if (roadmapPreferences.data && !overridePreferences) {
    setDifficulty(roadmapPreferences.data.difficulty || 'BEGINNER');
    setLanguage(roadmapPreferences.data.languagePreference || 'en');
    setLearningStyle(roadmapPreferences.data.learningStyle || 'READING');
    setHoursPerWeek(roadmapPreferences.data.hoursPerWeek || 10);
    setAvoidWeekends(roadmapPreferences.data.avoidWeekends || false);
  }
}, [roadmapPreferences.data, overridePreferences]);


 // Initialise visible weeks when roadmaps load
  useEffect(() => {
    if (roadmaps) {
      const newVisibleMap = { ...visibleWeeksMap };
      roadmaps.forEach(roadmap => {
        if (!newVisibleMap[roadmap.id]) {
          // Initially show up to generatedWeeks (or 12 if not set)
          const initialVisible = roadmap.generatedWeeks
              ? Math.min(roadmap.generatedWeeks, roadmap.durationWeeks)
              : roadmap.durationWeeks;
          newVisibleMap[roadmap.id] = initialVisible;   // <-- this line was missing                                 // fallback – show all weeks
        }
      });
      setVisibleWeeksMap(newVisibleMap);
    }
  }, [roadmaps]);

 const handleGenerate = useCallback((e) => {
     e.preventDefault();
     if (!goal.trim()) return;
     const payload = {
       goal: goal.trim(),
       timeframeValue: timeframeValue,
       timeframeUnit: timeframeUnit,
       difficulty: difficulty,
       language: language,
       learningStyle: learningStyle,
       hoursPerWeek: hoursPerWeek,
       avoidWeekends: avoidWeekends,
     };
     if (timeframeUnit === 'WEEKS') {
       payload.timeframeWeeks = timeframeValue;
     }
     generateMutation.mutate(payload, {
       onSuccess: () => {
         setGoal('');
         setTimeframeValue(4);
         setTimeframeUnit('WEEKS');
         setShowForm(false);
         refetch();
         toast.success('Roadmap generated successfully!');
       },
     });
   }, [goal, timeframeValue, timeframeUnit, difficulty, language, learningStyle, hoursPerWeek, avoidWeekends, generateMutation]);
  const handleDeleteClick = useCallback((id, title) => {
      setDeleteModal({ isOpen: true, roadmapId: id, roadmapTitle: title });
  }, []);

  const confirmDelete = () => {
    setIsDeleting(true);
    deleteMutation.mutate(deleteModal.roadmapId, {
      onSuccess: () => {
        toast.success('Roadmap deleted');
        setDeleteModal({ isOpen: false, roadmapId: null, roadmapTitle: '' });
        setIsDeleting(false);
      },
      onError: () => {
        toast.error('Failed to delete roadmap');
        setDeleteModal({ isOpen: false, roadmapId: null, roadmapTitle: '' });
        setIsDeleting(false);
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

  const toggleWeekExpand = (roadmapId, week) => {
    const key = `${roadmapId}-${week}`;
    setExpandedWeeks(prev => ({ ...prev, [key]: !prev[key] }));
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

      {/* Generation Form */}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Duration</label>
                <input
                  type="number"
                  value={timeframeValue}
                  onChange={(e) => setTimeframeValue(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-3 rounded-xl border dark:bg-gray-800/80 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Unit</label>
                <select
                  value={timeframeUnit}
                  onChange={(e) => setTimeframeUnit(e.target.value)}
                  className="w-full p-3 rounded-xl border dark:bg-gray-800/80 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                >
                  <option value="DAYS">Days</option>
                  <option value="WEEKS">Weeks</option>
                  <option value="MONTHS">Months</option>
                  <option value="YEARS">Years</option>
                </select>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 my-4 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="overridePrefs"
                  checked={overridePreferences}
                  onChange={(e) => setOverridePreferences(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                />
                <label htmlFor="overridePrefs" className="text-sm font-medium">
                  Use custom preferences for this roadmap (override saved defaults)
                </label>
              </div>

              {overridePreferences && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full p-2 rounded-lg border dark:bg-gray-800/80 dark:border-gray-700"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full p-2 rounded-lg border dark:bg-gray-800/80 dark:border-gray-700"
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Learning Style</label>
                    <select
                      value={learningStyle}
                      onChange={(e) => setLearningStyle(e.target.value)}
                      className="w-full p-2 rounded-lg border dark:bg-gray-800/80 dark:border-gray-700"
                    >
                      <option value="READING">Reading</option>
                      <option value="VISUAL">Visual</option>
                      <option value="HANDS_ON">Hands‑on</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Hours per Week</label>
                    <input
                      type="number"
                      min="1"
                      max="70"
                      value={hoursPerWeek}
                      onChange={(e) => setHoursPerWeek(parseInt(e.target.value) || 10)}
                      className="w-full p-2 rounded-lg border dark:bg-gray-800/80 dark:border-gray-700"
                    />
                  </div>
                  <div className="flex items-center gap-2 col-span-full">
                    <input
                      type="checkbox"
                      id="avoidWeekendsLocal"
                      checked={avoidWeekends}
                      onChange={(e) => setAvoidWeekends(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="avoidWeekendsLocal" className="text-sm">Avoid weekends</label>
                  </div>
                </div>
              )}
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
          const currentViewMode = viewModeMap[roadmap.id] || 'list';

          // --- NEW: chunked continuation variables ---
//           const totalWeeks = roadmap.durationWeeks || 1;
//           const generatedWeeks = roadmap.generatedWeeks || 0;
//           const maxVisibleWeek = visibleWeeksMap[roadmap.id] || generatedWeeks || Math.min(12, totalWeeks);
//                     const canLoadMore = maxVisibleWeek < totalWeeks;
//           const isContinuable = generatedWeeks > 0 && generatedWeeks < totalWeeks;
// --- SMARTER RENDERING VARIABLES ---
const totalWeeks = roadmap.durationWeeks || 1;
const generatedWeeks = roadmap.generatedWeeks || 0;

// Find the absolute highest week that actually contains tasks right now
const highestTaskWeek = roadmap.tasks?.reduce((max, task) => Math.max(max, task.weekNumber || 1), 0) || 0;

// Render up to the highest task week, OR the generated weeks, OR max 12 for new giant roadmaps
const displayLimit = Math.max(highestTaskWeek, generatedWeeks, Math.min(12, totalWeeks));

// This safely draws exactly the right amount of weeks without breaking giant roadmaps
const sortedWeeks = Array.from({ length: displayLimit }, (_, i) => i + 1);

// ONLY show the "Load Next Weeks" button if there are explicitly un-generated weeks left
const canLoadMore = generatedWeeks > 0 && generatedWeeks < totalWeeks && highestTaskWeek < totalWeeks;
          // Prepare tasks grouped by week for list view
const tasksByWeek = {};
roadmap.tasks?.forEach(task => {
  const week = task.weekNumber || 1;
  if (!tasksByWeek[week]) tasksByWeek[week] = [];
  tasksByWeek[week].push(task);
});
// Sort tasks within each week (same as before)
Object.keys(tasksByWeek).forEach(week => {
  tasksByWeek[week].sort((a, b) => {
    if (a.dayNumber === null && b.dayNumber !== null) return 1;
    if (a.dayNumber !== null && b.dayNumber === null) return -1;
    if (a.dayNumber === null && b.dayNumber === null) return 0;
    return (a.dayNumber || 999) - (b.dayNumber || 999);
  });
});
// Ensure every week from 1 to totalWeeks has an entry
for (let i = 1; i <= totalWeeks; i++) {
  if (!tasksByWeek[i]) tasksByWeek[i] = [];
}
// const sortedWeeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);
          const handleExpandAll = () => {
            const newExpanded = {};
            sortedWeeks.forEach(week => {
              newExpanded[`${roadmap.id}-${week}`] = true;
            });
            setExpandedWeeks(prev => ({ ...prev, ...newExpanded }));
          };

          const handleCollapseAll = () => {
            const newExpanded = { ...expandedWeeks };
            sortedWeeks.forEach(week => {
              delete newExpanded[`${roadmap.id}-${week}`];
            });
            setExpandedWeeks(newExpanded);
          };

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
                {/* Header with view toggle */}
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
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      isCompleted
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                        : roadmap.status === 'ACTIVE'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {isCompleted ? '🏆 Completed' : roadmap.status}
                    </span>
                    {/* View mode toggle button */}
                    <button
                      onClick={() => toggleViewMode(roadmap.id)}
                      className="p-1.5 rounded-lg bg-gray-200/70 dark:bg-gray-700/70 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                      title={currentViewMode === 'list' ? 'Switch to timeline view' : 'Switch to list view'}
                    >
                      {currentViewMode === 'list' ? <BarChart2 size={16} /> : <List size={16} />}
                    </button>
                  </div>
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
                  {generatedWeeks > 0 && generatedWeeks < totalWeeks && (
                    <div className="mt-2 text-xs text-purple-600 dark:text-purple-300 flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-2">
                      <span>📋 Weeks generated: {generatedWeeks}/{totalWeeks}</span>
                      <span className="text-gray-400">Click below to generate next weeks</span>
                    </div>
                  )}
                </div>

                {/* Conditional Rendering: List View or Timeline View */}
                {currentViewMode === 'list' ? (
                  sortedWeeks.length > 0 && (
                    <div className="mb-5">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold flex items-center gap-2 text-purple-700 dark:text-purple-300">
                          <Target size={18} /> Actionable Tasks
                        </h4>
                        <div className="flex gap-2">
                          <button
                            onClick={handleExpandAll}
                            className="text-xs px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                          >
                            Expand All
                          </button>
                          <button
                            onClick={handleCollapseAll}
                            className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          >
                            Collapse All
                          </button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {sortedWeeks.map((week) => {
                          const tasks = tasksByWeek[week];
                          const isExpanded = expandedWeeks[`${roadmap.id}-${week}`];
                          const weekCompleted = tasks.length > 0 && tasks.every(t => t.completed);
                          return (
                            <div key={week} className="border-l-2 border-purple-300 dark:border-purple-700 pl-4">
                              <button
                                onClick={() => toggleWeekExpand(roadmap.id, week)}
                                className="flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 hover:opacity-80 transition"
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                Week {week}
                                {weekCompleted && <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">✓ Done</span>}
                              </button>
                              {isExpanded && (
                                <div className="space-y-3">
                                  {tasks.length === 0 && (
                                    <div className="text-gray-500 italic text-sm py-2 text-center">
                                      No tasks yet. Click the "Load Next Weeks" button below to generate your tasks.
                                    </div>
                                  )}
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
                      {canLoadMore && (
                                              <div className="mt-4 text-center">
                                                <button
                                                  onClick={() => {
                                                    setContinuingRoadmapId(roadmap.id);
                                                    continueBatchMutation.mutate(
                                                      { roadmapId: roadmap.id, weeksToGenerate: 6 },
                                                      {
                                                        onSuccess: (updatedRoadmap) => {
                                                          // Update roadmap data in cache
                                                          queryClient.setQueryData(['roadmaps'], old =>
                                                            old.map(r => r.id === updatedRoadmap.id ? updatedRoadmap : r)
                                                          );
                                                          // Increase visible weeks to the new generated weeks (or up to total weeks)
                                                         const newVisible = Math.min(updatedRoadmap.generatedWeeks, totalWeeks);
                                                         setVisibleWeeksMap(prev => ({ ...prev, [roadmap.id]: newVisible }));
                                                          toast.success(`Loaded weeks up to ${newVisible}`);
                                                        },

                                                   onError: (error) => {
                                                               toast.error(`Continuation failed: ${error.response?.data?.message || error.message}`);
                                                               // Do NOT update visibleWeeksMap -> button remains active for retry
                                                           },
                                                        onSettled: () => setContinuingRoadmapId(null)
                                                      }
                                                    );
                                                  }}
                                                  disabled={continueBatchMutation.isPending && continuingRoadmapId === roadmap.id}
                                                  className="px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-md hover:shadow-lg transition disabled:opacity-50"
                                                >
                                                  {continueBatchMutation.isPending && continuingRoadmapId === roadmap.id ? (
                                                    <Loader className="animate-spin w-4 h-4 inline mr-2" />
                                                  ) : (
                                                    <Calendar size={16} className="inline mr-2" />
                                                  )}
                                                  Load Next 6 Weeks ({displayLimit}/{totalWeeks})
                                                </button>
                                              </div>
                                            )}
                    </div>
                  )
                ) : (
                  <div className="mb-5">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-teal-700 dark:text-teal-300">
                      <BarChart2 size={18} /> Timeline View
                    </h4>
                    <RoadmapTimeline
                      tasks={roadmap.tasks || []}
                      durationWeeks={roadmap.durationWeeks || 1}
                    />
                  </div>
                )}

                {/* Resources */}
                {/* Recommended Resources */}
                {roadmap.resources && roadmap.resources.length > 0 && (
                  <div className="mb-5">
                    <h4 className="font-semibold mb-2 text-teal-700 dark:text-teal-300 flex items-center gap-2">
                      <ExternalLink size={16} /> Recommended Resources
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {roadmap.resources.map((res) => {
                        // Choose icon based on type
                        let IconComponent;
                        switch (res.type?.toLowerCase()) {
                          case 'video':
                            IconComponent = Video;
                            break;
                          case 'article':
                            IconComponent = FileText;
                            break;
                          case 'course':
                            IconComponent = GraduationCap;
                            break;
                          default:
                            IconComponent = ExternalLink; // fallback
                        }
                        return (
                          <a
                            key={res.id}
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 text-xs hover:bg-purple-200 dark:hover:bg-purple-800/60 transition group"
                            title={res.type || 'resource'}
                          >
                            <IconComponent size={12} className="text-purple-500 dark:text-purple-300" />
                            <span>{res.name}</span>
                          </a>
                        );
                      })}
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

                  {/* Action Buttons (keep old continue and reschedule) */}
                                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                                  {/* Old continue button (based on completed tasks) */}
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
                                    {continueMutation.isPending ? 'Generating...' : 'Next Steps (based on progress)'}
                                  </button>

                                  {/* Smart Reschedule button */}
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
        isLoading={isDeleting}   // new prop
      />
    </div>
  );
}

export default RoadmapPlanner;