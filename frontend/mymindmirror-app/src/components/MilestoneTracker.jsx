// src/components/MilestoneTracker.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { format, parseISO, isValid } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import {
  Loader, Lightbulb, Target, ChevronDown, ChevronUp, MapPin,
  Plus, Edit2, Trash2, CheckCircle, Circle, Calendar, Clock, AlertCircle
} from 'lucide-react';

import {
  useMilestones, useMilestoneTasks, useCreateMilestone, useUpdateMilestone,
  useDeleteMilestone, useCreateMilestoneTask, useUpdateMilestoneTask,
  useDeleteMilestoneTask, useMilestoneInsights
} from '../hooks/useMilestoneData';

// --------------------------------------------------------------
// Helpers & Subcomponents
// --------------------------------------------------------------
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

  formatted = formatted.replace(/`([^`]+)`/g, '<code class="guide-code">$1</code>');
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-purple-600 dark:text-teal-400 hover:underline font-medium">$1</a>');
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/(^|[\s([{])(@[A-Za-z0-9_]+)/g, '$1<span class="code-annotation">$2</span>');

  return formatted;
};

const formatText = (text) => {
  if (!text) return '';

  let processedText = text.replace(/([:;?!.])\s+(?=\d+\.\s+[A-Z])/g, '$1\n');

  const lines = processedText.split('\n');
  const result = [];
  let i = 0;
  const total = lines.length;

  const getHeadingLevel = (line) => {
    const match = line.match(/^(#{1,6})\s+(.*)/);
    return match ? { level: match[1].length, content: match[2] } : null;
  };

  const getBlockquote = (line) => line.startsWith('> ') ? line.substring(2) : null;
  const isHorizontalRule = (line) => /^(\*{3,}|-{3,}|_{3,})$/.test(line.trim());

  let inCodeBlock = false;
  let codeBlockContent = [];
  let codeBlockLang = '';

  const flushCodeBlock = () => {
    if (codeBlockContent.length > 0) {
      result.push(`<pre><code class="language-${codeBlockLang}">${escapeHtml(codeBlockContent.join('\n'))}</code></pre>`);
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
      result.push(`<h${heading.level}>${formatInline(heading.content)}</h${heading.level}>`);
      i++;
      continue;
    }

    if (isHorizontalRule(line)) {
      result.push('<hr/>');
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
      result.push(`<blockquote>${formatText(quoteText)}</blockquote>`);
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
      result.push(`<${listTag}>${listItems.join('')}</${listTag}>`);
      continue;
    }

    if (line.trim() === '') {
      result.push('<br/>');
      i++;
      continue;
    }

    result.push(`<p>${formatInline(line)}</p>`);
    i++;
  }

  if (inCodeBlock) flushCodeBlock();
  return result.join('');
};

const Modal = ({
  isOpen, onClose, title, message,
  confirmText = 'Delete', cancelText = 'Cancel',
  onConfirm, theme, isDestructive = true,
  isLoading = false
}) => {
  const [mounted, setMounted] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    if (!isOpen) setIsClicked(false);
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleConfirm = (e) => {
    e.preventDefault();
    if (isClicked || isLoading) return;
    setIsClicked(true);
    onConfirm();
  };

  const handleClose = (e) => {
    e.preventDefault();
    if (isClicked || isLoading) return;
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="absolute inset-0" onClick={handleClose} aria-hidden="true" />
      <div className={`relative max-w-sm w-full rounded-2xl lg:rounded-3xl shadow-2xl overflow-hidden border ${theme === 'dark' ? 'bg-[#1A162F]/95 backdrop-blur-xl border-white/10' : 'bg-white/95 backdrop-blur-xl border-gray-200'}`}>
        <div className="p-6 lg:p-8 text-center">
          <div className={`mx-auto w-14 h-14 lg:w-16 lg:h-16 mb-4 lg:mb-6 rounded-full flex items-center justify-center ${isDestructive ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
            <AlertCircle className={`w-7 h-7 lg:w-8 lg:h-8 ${isDestructive ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
          </div>
          <h3 className="text-xl lg:text-2xl font-poppins font-bold mb-2 tracking-tight">{title}</h3>
          <p className={`text-sm lg:text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-6 lg:mb-8`}>{message}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleConfirm}
              disabled={isClicked || isLoading}
              className={`px-6 py-2.5 lg:py-3 rounded-full font-bold transition shadow-md flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${isDestructive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
            >
              {/* 💡 FIX: Fixed the size argument to be an integer */}
              {(isClicked || isLoading) && <Loader className="animate-spin" size="{16}"/>}
              {(isClicked || isLoading) ? 'Processing...' : confirmText}
            </button>
            <button
              onClick={handleClose}
              disabled={isClicked || isLoading}
              className={`px-6 py-2.5 lg:py-3 rounded-full font-bold transition disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark' ? 'bg-black/20 text-gray-200 hover:bg-black/40 border border-white/10' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const MilestoneSkeleton = ({ isDarkMode }) => {
  return (
    <div className={`p-5 lg:p-8 rounded-2xl lg:rounded-3xl ${isDarkMode ? 'bg-[#131127]/60 border-white/5' : 'bg-white/70 border-gray-200/50'} border shadow-lg animate-pulse`}>
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-6 lg:h-8 bg-gray-300 dark:bg-gray-700/50 rounded-full w-3/4" />
          <div className="h-4 lg:h-5 bg-gray-300 dark:bg-gray-700/50 rounded-full w-1/2" />
        </div>
        <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gray-300 dark:bg-gray-700/50 rounded-full shrink-0" />
      </div>
    </div>
  );
};

// --------------------------------------------------------------
// Main Component
// --------------------------------------------------------------
function MilestoneTracker({ userId }) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const isTempId = (id) => typeof id === 'string' && id.startsWith('temp-');

  // Premium Glassmorphism Sync
  const cardBg = isDarkMode ? 'bg-[#1A162F]/60 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl';
  const cardBorder = isDarkMode ? 'border-white/10' : 'border-gray-200/50';
  const sectionBg = isDarkMode ? 'bg-[#131127]/60 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md';
  const sectionBorder = isDarkMode ? 'border-white/5' : 'border-gray-200/50';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const inputBg = isDarkMode ? 'bg-[#1A162F]/80' : 'bg-white/90';
  const inputBorder = isDarkMode ? 'border-white/10' : 'border-gray-300';
  const inputFocusRing = 'focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:focus:ring-teal-400 dark:focus:border-teal-400';

  // Local UI state
  const [expandedMilestoneId, setExpandedMilestoneId] = useState(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDescription, setNewMilestoneDescription] = useState('');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');

  const [editingMilestoneId, setEditingMilestoneId] = useState(null);
  const [editedMilestoneTitle, setEditedMilestoneTitle] = useState('');
  const [editedMilestoneDescription, setEditedMilestoneDescription] = useState('');
  const [editedMilestoneDueDate, setEditedMilestoneDueDate] = useState('');
  const [editedMilestoneStatus, setEditedMilestoneStatus] = useState('');

  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskDetails, setNewTaskDetails] = useState('');
  const [newTaskSubtasks, setNewTaskSubtasks] = useState([]);

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editedTaskDescription, setEditedTaskDescription] = useState('');
  const [editedTaskDueDate, setEditedTaskDueDate] = useState('');
  const [editedTaskStatus, setEditedTaskStatus] = useState('');
  const [editedTaskDetails, setEditedTaskDetails] = useState('');
  const [editedTaskSubtasks, setEditedTaskSubtasks] = useState([]);

  const [expandedTaskDetails, setExpandedTaskDetails] = useState({});

  const [deleteMilestoneModal, setDeleteMilestoneModal] = useState({ isOpen: false, milestoneId: null });
  const [deleteTaskModal, setDeleteTaskModal] = useState({ isOpen: false, milestoneId: null, taskId: null });

  const [milestoneInsights, setMilestoneInsights] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { data: milestones = [], isLoading: loadingMilestones, error: milestonesError } = useMilestones(userId);
  const fetchTasksMutation = useMilestoneTasks(userId);
  const addMilestoneMutation = useCreateMilestone(userId);
  const updateMilestoneMutation = useUpdateMilestone(userId);
  const deleteMilestoneMutation = useDeleteMilestone(userId);
  const addTaskMutation = useCreateMilestoneTask(userId, expandedMilestoneId);
  const updateTaskMutation = useUpdateMilestoneTask(userId, expandedMilestoneId);
  const deleteTaskMutation = useDeleteMilestoneTask(userId, expandedMilestoneId);
  const insightMutation = useMilestoneInsights();

  const handleAddMilestone = (e) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) { setErrorMessage('Title cannot be empty'); return; }
    addMilestoneMutation.mutate(
      { title: newMilestoneTitle, description: newMilestoneDescription || null, dueDate: newMilestoneDueDate || null },
      {
        onSuccess: () => {
          setNewMilestoneTitle(''); setNewMilestoneDescription(''); setNewMilestoneDueDate('');
          setSuccessMessage('Milestone added!'); setTimeout(() => setSuccessMessage(''), 3000);
        }
      }
    );
  };

  const handleEditMilestoneClick = (milestone) => {
    setEditingMilestoneId(milestone.id);
    setEditedMilestoneTitle(milestone.title);
    setEditedMilestoneDescription(milestone.description || '');
    setEditedMilestoneDueDate(milestone.dueDate || '');
    setEditedMilestoneStatus(milestone.status);
  };

  const handleSaveMilestoneEdit = (id) => {
    if (!editedMilestoneTitle.trim()) { setErrorMessage('Title cannot be empty'); return; }
    updateMilestoneMutation.mutate(
      { id, data: { title: editedMilestoneTitle, description: editedMilestoneDescription || null, dueDate: editedMilestoneDueDate || null, status: editedMilestoneStatus } },
      {
        onSuccess: () => {
          setEditingMilestoneId(null); setSuccessMessage('Milestone updated!'); setTimeout(() => setSuccessMessage(''), 3000);
        }
      }
    );
  };

  const confirmDeleteMilestone = () => {
    deleteMilestoneMutation.mutate(deleteMilestoneModal.milestoneId, {
      onSuccess: () => {
        setDeleteMilestoneModal({ isOpen: false, milestoneId: null });
        setSuccessMessage('Milestone deleted!'); setTimeout(() => setSuccessMessage(''), 3000);
      }
    });
  };

  const handleAddTask = (e, milestoneId) => {
    e.preventDefault();
    if (!newTaskDescription.trim()) { setErrorMessage('Task description cannot be empty'); return; }
    addTaskMutation.mutate(
      { milestoneId, taskData: { description: newTaskDescription, dueDate: newTaskDueDate || null, details: newTaskDetails || null, subtasks: newTaskSubtasks.filter(s => s.trim() !== '') } },
      {
        onSuccess: () => {
          setNewTaskDescription(''); setNewTaskDueDate(''); setNewTaskDetails(''); setNewTaskSubtasks([]);
          setSuccessMessage('Task added!'); setTimeout(() => setSuccessMessage(''), 3000);
        }
      }
    );
  };

  const handleEditTaskClick = (task) => {
    setEditingTaskId(task.id);
    setEditedTaskDescription(task.description);
    setEditedTaskDueDate(task.dueDate || '');
    setEditedTaskStatus(task.status);
    setEditedTaskDetails(task.details || '');
    setEditedTaskSubtasks(task.subtasks || []);
  };

  const handleSaveTaskEdit = (milestoneId, taskId) => {
    if (!editedTaskDescription.trim()) { setErrorMessage('Task description cannot be empty'); return; }
    updateTaskMutation.mutate(
      { milestoneId, taskId, data: { description: editedTaskDescription, dueDate: editedTaskDueDate || null, status: editedTaskStatus, details: editedTaskDetails || null, subtasks: editedTaskSubtasks.filter(s => s.trim() !== '') } },
      {
        onSuccess: () => {
          setEditingTaskId(null); setSuccessMessage('Task updated!'); setTimeout(() => setSuccessMessage(''), 3000);
        }
      }
    );
  };

  const handleToggleTaskStatus = (milestoneId, task) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    updateTaskMutation.mutate(
      { milestoneId, taskId: task.id, data: { status: newStatus } },
      {
        onSuccess: () => {
          setSuccessMessage(`Task marked ${newStatus.toLowerCase()}`); setTimeout(() => setSuccessMessage(''), 3000);
        }
      }
    );
  };

  const confirmDeleteTask = () => {
    deleteTaskMutation.mutate(
      { milestoneId: deleteTaskModal.milestoneId, taskId: deleteTaskModal.taskId },
      {
        onSuccess: () => {
          setDeleteTaskModal({ isOpen: false, milestoneId: null, taskId: null });
          setSuccessMessage('Task deleted!'); setTimeout(() => setSuccessMessage(''), 3000);
        }
      }
    );
  };

  const toggleMilestoneExpand = (milestoneId) => {
    if (expandedMilestoneId === milestoneId) {
      setExpandedMilestoneId(null);
    } else {
      setExpandedMilestoneId(milestoneId);
      const milestone = milestones.find(m => m.id === milestoneId);
      if (milestone && (!milestone.tasks || milestone.tasks.length === 0)) {
        fetchTasksMutation.mutate(milestoneId);
      }
    }
  };

  const handleFetchInsights = (milestoneId) => {
    insightMutation.mutate(milestoneId, {
      onSuccess: (data) => {
        setMilestoneInsights(prev => ({ ...prev, [milestoneId]: data }));
        setSuccessMessage('AI insights generated!'); setTimeout(() => setSuccessMessage(''), 3000);
      },
      onError: (err) => {
        setErrorMessage(`Failed to get insights: ${err.response?.data?.message || err.message}`);
        setTimeout(() => setErrorMessage(''), 3000);
      }
    });
  };

  const getStatusColorClass = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-500 text-white border-transparent';
      case 'IN_PROGRESS': return 'bg-blue-500 text-white border-transparent';
      case 'PENDING': return 'bg-yellow-500 text-white border-transparent';
      case 'OVERDUE': return 'bg-red-500 text-white border-transparent';
      case 'CANCELLED': return 'bg-gray-500 text-white border-transparent';
      default: return 'bg-gray-300 text-gray-800 border-transparent';
    }
  };

  const getProgressBarColor = (percentage) => {
    if (percentage === 100) return '#10B981'; // Emerald
    if (percentage > 75) return '#3B82F6'; // Blue
    if (percentage > 50) return '#8B5CF6'; // Purple
    if (percentage > 25) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  if (loadingMilestones) {
    return (
      <div className={`space-y-6 rounded-2xl lg:rounded-3xl ${cardBg} border ${cardBorder} shadow-xl p-6 lg:p-8`}>
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 lg:h-10 bg-gray-300 dark:bg-gray-700/50 rounded-full w-48 lg:w-64 animate-pulse" />
          <div className="h-10 lg:h-12 bg-gray-300 dark:bg-gray-700/50 rounded-full w-28 lg:w-36 animate-pulse" />
        </div>
        {/* 💡 FIX: Passed variable correctly as JS boolean, not a string */}
        <MilestoneSkeleton isDarkMode={isDarkMode}/>
        <MilestoneSkeleton isDarkMode={isDarkMode}/>
        <MilestoneSkeleton isDarkMode={isDarkMode}/>
      </div>
    );
  }

  if (milestonesError) {
    return (
      <div className={`p-8 lg:p-12 rounded-2xl lg:rounded-3xl text-center ${cardBg} border ${cardBorder} shadow-xl flex flex-col items-center justify-center`}>
        <div className="w-16 h-16 lg:w-20 lg:h-20 mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 lg:w-10 lg:h-10 text-red-600 dark:text-red-400"/>
        </div>
        <h3 className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Error Loading Milestones</h3>
        <p className={`text-sm lg:text-base ${textSecondary}`}>{milestonesError.message}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl lg:rounded-3xl ${cardBg} border ${cardBorder} shadow-xl p-3 sm:p-6 lg:p-8 transition-all duration-300 w-full`}>

      {/* Header */}
      <div className="flex justify-between items-center mb-6 lg:mb-8 flex-wrap gap-3">
        <h2 className="text-2xl lg:text-3xl font-poppins font-extrabold tracking-tight bg-gradient-to-r from-purple-500 to-teal-500 bg-clip-text text-transparent">
          My Milestones & To-Dos
        </h2>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm lg:text-base font-medium flex items-center gap-3 animate-fade-in">
          <CheckCircle className="w-5 h-5 shrink-0"/> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-sm lg:text-base font-medium flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0"/> {errorMessage}
        </div>
      )}

      {/* Add Milestone Form */}
      <div className={`mb-8 lg:mb-10 p-5 lg:p-6 rounded-xl lg:rounded-2xl ${sectionBg} border ${sectionBorder}`}>
        <h3 className="text-lg lg:text-xl font-poppins font-bold mb-4 lg:mb-5 flex items-center gap-2 text-gray-800 dark:text-gray-100">
          <Plus className="w-5 h-5 text-purple-500 dark:text-teal-400"/> Add New Milestone
        </h3>
        <form onSubmit={handleAddMilestone} className="space-y-4">
          <input
            type="text" value={newMilestoneTitle} onChange={(e) => setNewMilestoneTitle(e.target.value)}
            placeholder="Title *" className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none transition-all text-sm lg:text-base ${inputFocusRing}`} required
          />
          <textarea
            value={newMilestoneDescription} onChange={(e) => setNewMilestoneDescription(e.target.value)}
            placeholder="Description (optional)" className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none transition-all text-sm lg:text-base resize-y min-h-[80px] lg:min-h-[100px] ${inputFocusRing}`}
          />
          <input
            type="date" value={newMilestoneDueDate} onChange={(e) => setNewMilestoneDueDate(e.target.value)}
            className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none transition-all text-sm lg:text-base text-gray-800 dark:text-gray-200 ${inputFocusRing}`}
          />
          <button
            type="submit" disabled={addMilestoneMutation.isPending}
            className="w-full py-3 lg:py-4 rounded-xl bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-bold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 text-sm lg:text-base"
          >
            {addMilestoneMutation.isPending ? <Loader className="w-5 h-5 animate-spin"/> : <Plus className="w-5 h-5"/>}
            {addMilestoneMutation.isPending ? 'Adding...' : 'Add Milestone'}
          </button>
        </form>
      </div>

      {/* Milestones List */}
      {milestones.length === 0 ? (
        <div className={`text-center py-12 lg:py-16 rounded-xl lg:rounded-2xl ${sectionBg} border ${sectionBorder}`}>
          {/* 💡 FIX: Corrected Target formatting */}
          <Target className={`w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-4 opacity-30 ${textSecondary}`} />
          <p className={`text-lg lg:text-xl font-bold text-gray-800 dark:text-gray-200 mb-2`}>No milestones yet.</p>
          <p className={`text-sm lg:text-base ${textSecondary}`}>Create your first milestone above to start tracking your goals!</p>
        </div>
      ) : (
        <div className="space-y-5 lg:space-y-6">
          {milestones.map(milestone => (
            <div key={milestone.id} className={`rounded-xl lg:rounded-2xl ${sectionBg} border ${sectionBorder} overflow-hidden transition-all duration-300 hover:shadow-lg`}>

              {/* Milestone Edit Mode */}
              {editingMilestoneId === milestone.id ? (
                <div className="p-5 lg:p-6">
                  <h3 className="text-xl font-poppins font-bold mb-4 text-gray-800 dark:text-gray-100">Edit Milestone</h3>
                  <div className="space-y-4">
                    <input
                      type="text" value={editedMilestoneTitle} onChange={(e) => setEditedMilestoneTitle(e.target.value)}
                      className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none transition-all text-sm lg:text-base ${inputFocusRing}`} required
                    />
                    <textarea
                      value={editedMilestoneDescription} onChange={(e) => setEditedMilestoneDescription(e.target.value)}
                      className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none transition-all text-sm lg:text-base resize-y min-h-[100px] ${inputFocusRing}`}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                        type="date" value={editedMilestoneDueDate} onChange={(e) => setEditedMilestoneDueDate(e.target.value)}
                        className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none transition-all text-sm lg:text-base text-gray-800 dark:text-gray-200 ${inputFocusRing}`}
                        />
                        <select
                        value={editedMilestoneStatus} onChange={(e) => setEditedMilestoneStatus(e.target.value)}
                        className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none transition-all text-sm lg:text-base text-gray-800 dark:text-gray-200 ${inputFocusRing}`}
                        >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="OVERDUE">Overdue</option>
                        <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 pt-4">
                      <button onClick={() => setEditingMilestoneId(null)} className="px-6 py-2.5 rounded-full font-bold bg-gray-200 dark:bg-black/20 text-gray-800 dark:text-gray-200 border border-transparent dark:border-white/10 hover:bg-gray-300 dark:hover:bg-black/40 transition">Cancel</button>
                      <button onClick={() => handleSaveMilestoneEdit(milestone.id)} className="px-6 py-2.5 rounded-full font-bold bg-gradient-to-r from-purple-500 to-teal-500 text-white shadow-md hover:shadow-lg transition">Save Changes</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 lg:p-6">

                  {/* Top Layer: Content & Chart Desktop Alignment */}
                  <div className="flex flex-col sm:flex-row justify-between gap-5 lg:gap-6">

                    {/* Left Side: Info */}
                    <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`px-2.5 py-1 text-[10px] lg:text-xs font-bold uppercase tracking-wider rounded-full border ${getStatusColorClass(milestone.status)}`}>
                                {milestone.status.replace('_', ' ')}
                            </span>
                            {milestone.dueDate && isValid(parseISO(milestone.dueDate)) && (
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/5 text-[10px] lg:text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                    <Calendar className="w-3 h-3"/> Due {format(parseISO(milestone.dueDate), 'MMM dd')}
                                </span>
                            )}
                        </div>

                        <h3 className="text-xl lg:text-2xl font-poppins font-extrabold text-gray-800 dark:text-gray-100 tracking-tight leading-tight">
                            {milestone.title}
                        </h3>

                        {milestone.description && (
                            <p className={`text-sm lg:text-base ${textSecondary} leading-relaxed`}>
                                {milestone.description}
                            </p>
                        )}

                        <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-400 dark:text-gray-500 pt-1">
                            <Clock className="w-3.5 h-3.5"/>
                            <span>Created {format(parseISO(milestone.creationDate), 'MMM dd, yyyy')}</span>
                        </div>
                    </div>

                    {/* Right Side / Bottom: Chart & Actions Layout */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-4 shrink-0 border-t sm:border-t-0 border-gray-200 dark:border-white/5 pt-5 sm:pt-0 mt-2 sm:mt-0">

                        {/* Circular Progress Chart */}
                        <div className="w-14 h-14 lg:w-20 lg:h-20 shrink-0">
                           <CircularProgressbar
                             value={milestone.completionPercentage || 0}
                             text={`${milestone.completionPercentage ? milestone.completionPercentage.toFixed(0) : 0}%`}
                             styles={buildStyles({
                               pathColor: getProgressBarColor(milestone.completionPercentage || 0),
                               textColor: isDarkMode ? '#E0E0E0' : '#4B5563',
                               trailColor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#E5E7EB',
                               textSize: '24px',
                             })}
                           />
                        </div>

                        {/* Action Buttons (Horizontal Row on Mobile, Horizontal/Wrap on Desktop) */}
                        <div className="flex flex-wrap sm:justify-end gap-2">
                            <button onClick={() => handleEditMilestoneClick(milestone)} className="p-2.5 lg:p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 hover:scale-105 transition-all shadow-sm" title="Edit Milestone">
                                <Edit2 className="w-4 h-4 lg:w-5 lg:h-5"/>
                            </button>
                            <button onClick={() => setDeleteMilestoneModal({ isOpen: true, milestoneId: milestone.id })} className="p-2.5 lg:p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 hover:scale-105 transition-all shadow-sm" title="Delete Milestone">
                                <Trash2 className="w-4 h-4 lg:w-5 lg:h-5"/>
                            </button>
                            <button onClick={() => handleFetchInsights(milestone.id)} disabled={insightMutation.isPending && insightMutation.variables === milestone.id} className="p-2.5 lg:p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-sm" title="Get AI Insights">
                                {insightMutation.isPending && insightMutation.variables === milestone.id ? <Loader className="w-4 h-4 lg:w-5 lg:h-5 animate-spin"/> : <Lightbulb className="w-4 h-4 lg:w-5 lg:h-5"/>}
                            </button>
                           <button
                             onClick={() => toggleMilestoneExpand(milestone.id)}
                             disabled={isTempId(milestone.id)}
                             className={`p-2.5 lg:p-3 rounded-xl transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-sm ${
                               expandedMilestoneId === milestone.id
                                 ? 'bg-gradient-to-br from-purple-100 to-teal-50 dark:from-teal-900/40 dark:to-purple-900/20 text-purple-600 dark:text-teal-400 border border-purple-200/50 dark:border-teal-700/30 hover:scale-105'
                                 : 'bg-gradient-to-br from-purple-100 to-teal-50 dark:from-teal-900/40 dark:to-purple-900/20 text-purple-600 dark:text-teal-400 border border-purple-200/50 dark:border-teal-700/30 hover:scale-105'
                             }`}
                             title={expandedMilestoneId === milestone.id ? 'Hide Tasks' : 'View Tasks'}
                           >
                             {expandedMilestoneId === milestone.id ? <ChevronUp className="w-4 h-4 lg:w-5 lg:h-5" /> : <ChevronDown className="w-4 h-4 lg:w-5 lg:h-5" />}
                           </button>
                        </div>
                    </div>

                  </div>
                </div>
              )}

              {/* AI Insights Display */}
              {milestoneInsights[milestone.id] && (
                <div className={`mx-5 lg:mx-6 mb-5 lg:mb-6 p-5 lg:p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#1A162F] dark:to-[#1A162F] border border-amber-200 dark:border-amber-500/20 shadow-inner`}>
                  <h4 className="font-poppins font-bold flex items-center gap-2 mb-4 text-amber-700 dark:text-amber-400 text-base lg:text-lg">
                    <Lightbulb className="w-5 h-5 lg:w-6 lg:h-6"/> AI Strategic Insights
                  </h4>
                  <div className="space-y-4 text-sm lg:text-base text-gray-800 dark:text-gray-200">
                    <div className="guide-content bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-white/40 dark:border-white/5">
                      <p className="font-bold text-amber-800 dark:text-amber-300 mb-1">Remaining Work:</p>
                      <div dangerouslySetInnerHTML={{ __html: formatText(milestoneInsights[milestone.id].remainingWork) }} />
                    </div>
                    <div className="guide-content bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-white/40 dark:border-white/5">
                      <p className="font-bold text-amber-800 dark:text-amber-300 mb-1">Performance:</p>
                      <div dangerouslySetInnerHTML={{ __html: formatText(milestoneInsights[milestone.id].performanceAssessment) }} />
                    </div>
                    <div className="guide-content bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-white/40 dark:border-white/5">
                      <p className="font-bold text-amber-800 dark:text-amber-300 mb-1">Actionable Tips:</p>
                      <div dangerouslySetInnerHTML={{ __html: formatText(milestoneInsights[milestone.id].tips.join('\n\n')) }} />
                    </div>
                    <div className="guide-content bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-white/40 dark:border-white/5">
                      <p className="font-bold text-amber-800 dark:text-amber-300 mb-1">Next Steps:</p>
                      <div dangerouslySetInnerHTML={{ __html: formatText(milestoneInsights[milestone.id].suggestedNewTasks.join('\n- ')) }} />
                    </div>
                    <div className="guide-content bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-white/40 dark:border-white/5 italic text-center">
                      <div dangerouslySetInnerHTML={{ __html: formatText(milestoneInsights[milestone.id].encouragement) }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks Section */}
              {expandedMilestoneId === milestone.id && (
                <div className="px-5 lg:px-6 pb-5 lg:pb-6 pt-2 border-t border-gray-200/50 dark:border-white/5">
                  <h4 className="font-poppins font-bold mb-4 flex items-center gap-2 text-teal-600 dark:text-teal-400 text-lg mt-4">
                      Tasks & Action Items
                  </h4>
                  {milestone.tasks && milestone.tasks.length > 0 ? (
                    <ul className="space-y-3 lg:space-y-4">
                      {milestone.tasks.map(task => (
                        <li key={task.id} className={`p-4 lg:p-5 rounded-xl lg:rounded-2xl ${isDarkMode ? 'bg-[#1A162F]/40 border border-white/5' : 'bg-gray-50 border border-gray-200/50'} transition-all`}>

                         {/* Edit Task Mode */}
                         {editingTaskId === task.id ? (
                           <div className="space-y-4">
                             <input
                               type="text" value={editedTaskDescription} onChange={e=>setEditedTaskDescription(e.target.value)}
                               className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none transition-all text-sm lg:text-base ${inputFocusRing}`}
                               placeholder="Task description *" required
                             />
                             <textarea
                               value={editedTaskDetails} onChange={e=>setEditedTaskDetails(e.target.value)}
                               className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none transition-all text-sm lg:text-base resize-y min-h-[80px] ${inputFocusRing}`}
                               placeholder="Details (optional) – long instructions, tips, etc."
                             />
                             <div className="p-4 rounded-xl bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5">
                               <label className="block text-xs lg:text-sm font-bold uppercase tracking-wider mb-3 text-gray-600 dark:text-gray-400">Subtasks</label>
                               <div className="space-y-3">
                                 {editedTaskSubtasks.map((sub, idx) => (
                                   <div key={idx} className="flex gap-2 items-center">
                                     <input
                                       type="text" value={sub}
                                       onChange={(e) => {
                                         const newSubtasks = [...editedTaskSubtasks];
                                         newSubtasks[idx] = e.target.value;
                                         setEditedTaskSubtasks(newSubtasks);
                                       }}
                                       className={`flex-1 p-2.5 lg:p-3 rounded-lg border ${inputBorder} ${inputBg} focus:outline-none transition-all text-sm ${inputFocusRing}`}
                                       placeholder={`Subtask ${idx+1}`}
                                     />
                                     <button
                                       type="button" onClick={() => setEditedTaskSubtasks(editedTaskSubtasks.filter((_, i) => i !== idx))}
                                       className="p-2 lg:p-3 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition" title="Remove subtask"
                                     >
                                       <Trash2 className="w-4 h-4 lg:w-5 lg:h-5"/>
                                     </button>
                                   </div>
                                 ))}
                                 <button
                                   type="button" onClick={() => setEditedTaskSubtasks([...editedTaskSubtasks, ''])}
                                   className="text-sm font-bold text-purple-600 hover:text-purple-700 dark:text-teal-400 dark:hover:text-teal-300 flex items-center gap-1 mt-2 px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition"
                                 >
                                   <Plus className="w-4 h-4"/> Add subtask
                                 </button>
                               </div>
                             </div>

                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input
                                type="date" value={editedTaskDueDate} onChange={e=>setEditedTaskDueDate(e.target.value)}
                                className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none transition-all text-sm lg:text-base text-gray-800 dark:text-gray-200 ${inputFocusRing}`}
                                />
                                <select
                                value={editedTaskStatus} onChange={e=>setEditedTaskStatus(e.target.value)}
                                className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none transition-all text-sm lg:text-base text-gray-800 dark:text-gray-200 ${inputFocusRing}`}
                                >
                                <option value="PENDING">Pending</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="OVERDUE">Overdue</option>
                                <option value="CANCELLED">Cancelled</option>
                                </select>
                             </div>

                             <div className="flex flex-wrap justify-end gap-3 pt-2">
                               <button onClick={()=>setEditingTaskId(null)} className="px-5 py-2.5 rounded-full font-bold bg-gray-200 dark:bg-black/20 text-gray-800 dark:text-gray-200 border border-transparent dark:border-white/10 hover:bg-gray-300 dark:hover:bg-black/40 transition">Cancel</button>
                               <button onClick={()=>handleSaveTaskEdit(milestone.id, task.id)} className="px-5 py-2.5 rounded-full font-bold bg-gradient-to-r from-purple-500 to-teal-500 text-white shadow-md hover:shadow-lg transition">Save Task</button>
                             </div>
                           </div>
                          ) : (
                            /* 💡 Task Display Mode - Polished */
                            <div className="space-y-3">
                              {/* Main row */}
                              <div className="flex flex-wrap items-start justify-between gap-3 lg:gap-4">

                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <button
                                    onClick={() => handleToggleTaskStatus(milestone.id, task)}
                                    className="mt-1 flex-shrink-0 hover:scale-110 transition-transform active:scale-90"
                                    title="Toggle Complete"
                                  >
                                    {task.status === 'COMPLETED' ? (
                                      <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500"/>
                                    ) : (
                                      <Circle className="w-5 h-5 lg:w-6 lg:h-6 text-gray-400 hover:text-purple-500 transition-colors"/>
                                    )}
                                  </button>

                                  <div className="flex-1 space-y-2">
                                    <p className={`text-sm lg:text-base font-semibold leading-snug ${task.status === 'COMPLETED' ? 'line-through text-gray-500 dark:text-gray-600' : 'text-gray-800 dark:text-gray-100'}`}>
                                      {task.description}
                                                                            {task.roadmapTaskId && (
                                                                              <span className="ml-2 mb-1 inline-flex items-center gap-1 text-[8px] lg:text-xs font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 px-1.5 lg:px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-500/30">
                                                                                <MapPin className="w-2.5 h-2.5 lg:w-3 lg:h-3"/> from Roadmap
                                                                              </span>
                                                                            )}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] lg:text-xs font-bold uppercase tracking-wider border ${getStatusColorClass(task.status)}`}>
                                        {task.status.replace('_', ' ')}
                                      </span>
                                      {task.dueDate && isValid(parseISO(task.dueDate)) && (
                                        <span className="flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                                          <Calendar className="w-3 h-3"/> Due {format(parseISO(task.dueDate), 'MMM dd')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                                                                                        <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0 bg-white/50 dark:bg-black/20 p-1.5 lg:p-2 rounded-xl border border-gray-200/50 dark:border-white/5">
                                                                                                          {task.details && (
                                                                                                            <button
                                                                                                              onClick={() => {
                                                                                                                const expanded = expandedTaskDetails[task.id];
                                                                                                                setExpandedTaskDetails(prev => ({ ...prev, [task.id]: !expanded }));
                                                                                                              }}
                                                                                                              className={`p-1.5 lg:p-3 rounded-lg transition-colors shadow-sm ${expandedTaskDetails[task.id] ? 'bg-gradient-to-br from-purple-100 to-teal-50 dark:from-teal-900/40 dark:to-purple-900/20 text-purple-600 dark:text-teal-400 border border-purple-200/50 dark:border-teal-700/30 ' : 'bg-gradient-to-br from-purple-100 to-teal-50 dark:from-teal-900/40 dark:to-purple-900/20 text-purple-600 dark:text-teal-400 border border-purple-200/50 dark:border-teal-700/30 hover:scale-105'}`}
                                                                                                              title={expandedTaskDetails[task.id] ? 'Hide details' : 'View details'}
                                                                                                            >
                                                                                                              {expandedTaskDetails[task.id] ? <ChevronUp className="w-4 h-4 lg:w-5 lg:h-5"/> : <ChevronDown className="w-4 h-4 lg:w-5 lg:h-5"/>}
                                                                                                            </button>
                                                                                                          )}
                                                                                                          <button
                                                                                                            onClick={() => handleEditTaskClick(task)}
                                                                                                            className="p-1.5 lg:p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition shadow-sm"
                                                                                                            title="Edit"
                                                                                                          >
                                                                                                            <Edit2 className="w-4 h-4 lg:w-5 lg:h-5"/>
                                                                                                          </button>
                                                                                                          <button
                                                                                                            onClick={() => setDeleteTaskModal({ isOpen: true, milestoneId: milestone.id, taskId: task.id })}
                                                                                                            className="p-1.5 lg:p-3 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition shadow-sm"
                                                                                                            title="Delete"
                                                                                                          >
                                                                                                            <Trash2 className="w-4 h-4 lg:w-5 lg:h-5"/>
                                                                                                          </button>
                                                                                                        </div>
                              </div>

                              {/* Details expanded content */}
                              {task.details && expandedTaskDetails[task.id] && (
                                <div className="mt-3 p-4 rounded-xl bg-white/60 dark:bg-black/30 text-sm text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-white/5 border-l-4 border-l-purple-500 shadow-inner">
                                  <div className="roadmap-details" dangerouslySetInnerHTML={{ __html: formatText(task.details) }} />
                                </div>
                              )}

                              {/* Subtasks rendering */}
                              {task.subtasks && task.subtasks.length > 0 && (
                                  <div className="mt-3 pl-8 lg:pl-10">
                                      {/* 💡 FIX: Reapplied the subtask mapping logic using formatInline */}
                                      <ul className="list-disc list-outside text-sm text-gray-600 dark:text-gray-400 space-y-1.5 marker:text-purple-500 dark:marker:text-teal-400">
                                          {task.subtasks.map((sub, idx) => <li key={idx} className="pl-1" dangerouslySetInnerHTML={{ __html: formatInline(sub) }} />)}
                                      </ul>
                                  </div>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-sm lg:text-base text-gray-500 dark:text-gray-400 py-6 font-medium italic">No tasks yet. Break your goal down into actionable steps below!</p>
                  )}

                  {/* Add Task Form */}
                  <div className={`mt-6 p-5 lg:p-6 rounded-xl lg:rounded-2xl ${isDarkMode ? 'bg-[#1A162F]/50 border-white/5' : 'bg-white/50 border-gray-200/50'} border shadow-sm`}>
                    <h5 className="font-poppins font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                        <Plus className="w-4 h-4 lg:w-5 lg:h-5 text-teal-500 dark:text-teal-400"/> Add New Task
                    </h5>
                    {isTempId(milestone.id) ? (
                      <div className="flex items-center justify-center py-6 text-gray-500 font-medium">
                        <Loader className="w-5 h-5 animate-spin mr-3 text-purple-500"/> Completing Milestone Creation...
                      </div>
                    ) : (
                      <form onSubmit={(e) => handleAddTask(e, milestone.id)} className="space-y-4">
                        <input
                          type="text" value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)}
                          placeholder="Task Description *" className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none transition-all text-sm lg:text-base ${inputFocusRing}`} required
                        />
                        <textarea
                          value={newTaskDetails} onChange={(e) => setNewTaskDetails(e.target.value)}
                          placeholder="Details (optional) – longer instructions, resources, or notes" className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none transition-all text-sm lg:text-base resize-y min-h-[80px] lg:min-h-[100px] ${inputFocusRing}`}
                        />

                        <div className="p-4 rounded-xl bg-black/5 dark:bg-black/20 border border-black/5 dark:border-white/5">
                          <label className="block text-xs lg:text-sm font-bold uppercase tracking-wider mb-3 text-gray-600 dark:text-gray-400">Subtasks <span className="normal-case font-normal opacity-70">(optional)</span></label>
                          <div className="space-y-3">
                            {newTaskSubtasks.map((sub, idx) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <input
                                  type="text" value={sub}
                                  onChange={(e) => {
                                    const updated = [...newTaskSubtasks];
                                    updated[idx] = e.target.value;
                                    setNewTaskSubtasks(updated);
                                  }}
                                  className={`flex-1 p-2.5 lg:p-3 rounded-lg border ${inputBorder} ${inputBg} focus:outline-none transition-all text-sm ${inputFocusRing}`}
                                  placeholder={`Subtask ${idx + 1}`}
                                />
                                <button
                                  type="button" onClick={() => setNewTaskSubtasks(newTaskSubtasks.filter((_, i) => i !== idx))}
                                  className="p-2 lg:p-3 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition shadow-sm" title="Remove subtask"
                                >
                                  <Trash2 className="w-4 h-4 lg:w-5 lg:h-5"/>
                                </button>
                              </div>
                            ))}
                            <button
                              type="button" onClick={() => setNewTaskSubtasks([...newTaskSubtasks, ''])}
                              className="text-sm font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 flex items-center gap-1 mt-2 px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition"
                            >
                              <Plus className="w-4 h-4"/> Add subtask
                            </button>
                          </div>
                        </div>

                        <input
                          type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)}
                          className={`w-full p-3 lg:p-4 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none transition-all text-sm lg:text-base text-gray-800 dark:text-gray-200 ${inputFocusRing}`}
                        />
                        <button
                          type="submit" disabled={addTaskMutation.isPending}
                          className="w-full py-3 lg:py-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 text-sm lg:text-base"
                        >
                          {addTaskMutation.isPending ? <Loader className="w-5 h-5 animate-spin"/> : <Plus className="w-5 h-5"/>}
                          {addTaskMutation.isPending ? 'Adding...' : 'Add Task'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Modals */}
      <Modal
        isOpen={deleteMilestoneModal.isOpen}
        onClose={() => setDeleteMilestoneModal({ isOpen: false, milestoneId: null })}
        title="Delete Milestone"
        message="Are you sure you want to delete this milestone and all its associated tasks? This action cannot be undone."
        onConfirm={confirmDeleteMilestone}
        theme={theme}
        isLoading={deleteMilestoneMutation.isPending}
      />

      <Modal
        isOpen={deleteTaskModal.isOpen}
        onClose={() => setDeleteTaskModal({ isOpen: false, milestoneId: null, taskId: null })}
        title="Delete Task"
        message="Are you sure you want to delete this task?"
        onConfirm={confirmDeleteTask}
        theme={theme}
        isLoading={deleteTaskMutation.isPending}
      />
    </div>
  );
}

export default MilestoneTracker;