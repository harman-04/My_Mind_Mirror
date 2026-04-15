// src/components/MilestoneTracker.jsx
import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format, parseISO, isValid } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import {
  Loader, Lightbulb, ThumbsUp, Target, ChevronDown, ChevronUp, MapPin,
  Plus, Edit2, Trash2, CheckCircle, Circle, Calendar, Clock, AlertCircle
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8080/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('jwtToken');
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
};

// --------------------------------------------------------------
// Reusable Modal Component (Portal-based, glass styled)
// --------------------------------------------------------------
const Modal = ({ isOpen, onClose, title, message, confirmText = 'Delete', cancelText = 'Cancel', onConfirm, theme, isDestructive = true }) => {
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
      <div
        className={`relative max-w-sm w-full rounded-2xl shadow-2xl overflow-hidden ${
          theme === 'dark' ? 'bg-gray-800/95 backdrop-blur-md border-gray-700' : 'bg-white/95 backdrop-blur-md border-gray-200'
        } border`}
      >
        <div className="p-6 text-center">
          <div className={`mx-auto w-12 h-12 mb-4 rounded-full flex items-center justify-center ${
            isDestructive ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
          }`}>
            {isDestructive ? <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" /> : <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
          </div>
          <h3 className="text-xl font-poppins font-semibold mb-2">{title}</h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-6`}>{message}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={onConfirm}
              className={`px-5 py-2 rounded-full font-medium transition shadow-md ${
                isDestructive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {confirmText}
            </button>
            <button
              onClick={onClose}
              className={`px-5 py-2 rounded-full font-medium transition ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
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

// --------------------------------------------------------------
// Skeleton Component for Milestones
// --------------------------------------------------------------
const MilestoneSkeleton = ({ theme }) => {
  const isDark = theme === 'dark';
  return (
    <div className={`p-5 rounded-2xl ${isDark ? 'bg-gray-800/60' : 'bg-white/70'} border ${isDark ? 'border-gray-700/50' : 'border-gray-200/50'} shadow-lg animate-pulse`}>
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2" />
        </div>
        <div className="w-16 h-16 bg-gray-300 dark:bg-gray-700 rounded-full" />
      </div>
    </div>
  );
};

// --------------------------------------------------------------
// Main MilestoneTracker Component
// --------------------------------------------------------------
function MilestoneTracker({ userId }) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const queryClient = useQueryClient();

  // Helper to detect temporary IDs
  const isTempId = (id) => typeof id === 'string' && id.startsWith('temp-');

  // Glass‑morphic styles
  const cardBg = isDarkMode ? 'bg-gray-800/60 backdrop-blur-md' : 'bg-white/70 backdrop-blur-md';
  const cardBorder = isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50';
  const sectionBg = isDarkMode ? 'bg-gray-800/40 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm';
  const sectionBorder = isDarkMode ? 'border-gray-700/40' : 'border-gray-200/40';
  const textPrimary = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const inputBg = isDarkMode ? 'bg-gray-800/80' : 'bg-white/90';
  const inputBorder = isDarkMode ? 'border-gray-600' : 'border-gray-300';
  const inputFocusRing = 'focus:ring-purple-500';

  // --- Local UI state ---
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
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editedTaskDescription, setEditedTaskDescription] = useState('');
  const [editedTaskDueDate, setEditedTaskDueDate] = useState('');
  const [editedTaskStatus, setEditedTaskStatus] = useState('');

  // Modal states
  const [deleteMilestoneModal, setDeleteMilestoneModal] = useState({ isOpen: false, milestoneId: null });
  const [deleteTaskModal, setDeleteTaskModal] = useState({ isOpen: false, milestoneId: null, taskId: null });

  const [milestoneInsights, setMilestoneInsights] = useState({});
  const [loadingInsightsId, setLoadingInsightsId] = useState(null);
  const [insightErrorId, setInsightErrorId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // --- React Query: fetch milestones ---
  const {
    data: milestones = [],
    isLoading: loadingMilestones,
    error: milestonesError,
  } = useQuery({
    queryKey: ['milestones', userId],
    queryFn: async () => {
      const headers = getAuthHeader();
      if (!headers) throw new Error('Not authenticated');
      const { data } = await axios.get(`${API_BASE_URL}/milestones`, { headers });
      return data.sort((a, b) => parseISO(b.creationDate) - parseISO(a.creationDate));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch tasks for a specific milestone (on expand)
  const fetchTasksForMilestone = useCallback(async (milestoneId) => {
    const headers = getAuthHeader();
    if (!headers) return;
    try {
      const { data: tasks } = await axios.get(`${API_BASE_URL}/milestones/${milestoneId}/tasks`, { headers });
      queryClient.setQueryData(['milestones', userId], (old) =>
        old.map(m => m.id === milestoneId ? { ...m, tasks } : m)
      );
    } catch (err) {
      setErrorMessage(`Failed to load tasks: ${err.response?.data?.message || err.message}`);
      setTimeout(() => setErrorMessage(''), 3000);
    }
  }, [queryClient, userId]);

  // --- Optimistic Mutations (unchanged logic) ---
  const addMilestoneMutation = useMutation({
    mutationFn: (newMilestone) => {
      const headers = getAuthHeader();
      if (!headers) throw new Error('Not authenticated');
      return axios.post(`${API_BASE_URL}/milestones`, newMilestone, { headers });
    },
    onMutate: async (newMilestone) => {
      await queryClient.cancelQueries(['milestones', userId]);
      const previous = queryClient.getQueryData(['milestones', userId]) || [];
      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        id: tempId,
        title: newMilestone.title,
        description: newMilestone.description || '',
        dueDate: newMilestone.dueDate || null,
        creationDate: new Date().toISOString(),
        status: 'PENDING',
        completionPercentage: 0,
        tasks: [],
      };
      queryClient.setQueryData(['milestones', userId], [optimistic, ...previous]);
      return { previous };
    },
    onError: (err, newMilestone, context) => {
      queryClient.setQueryData(['milestones', userId], context.previous);
      setErrorMessage('Failed to add milestone');
      setTimeout(() => setErrorMessage(''), 3000);
    },
    onSettled: () => queryClient.invalidateQueries(['milestones', userId]),
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const headers = getAuthHeader();
      if (!headers) throw new Error('Not authenticated');
      return axios.put(`${API_BASE_URL}/milestones/${id}`, data, { headers });
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries(['milestones', userId]);
      const previous = queryClient.getQueryData(['milestones', userId]);
      queryClient.setQueryData(['milestones', userId], (old) =>
        old.map(m => m.id === id ? { ...m, ...data } : m)
      );
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['milestones', userId], context.previous);
      setErrorMessage('Failed to update milestone');
      setTimeout(() => setErrorMessage(''), 3000);
    },
    onSettled: () => queryClient.invalidateQueries(['milestones', userId]),
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: (id) => {
      const headers = getAuthHeader();
      if (!headers) throw new Error('Not authenticated');
      return axios.delete(`${API_BASE_URL}/milestones/${id}`, { headers });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries(['milestones', userId]);
      const previous = queryClient.getQueryData(['milestones', userId]);
      queryClient.setQueryData(['milestones', userId], (old) => old.filter(m => m.id !== id));
      return { previous };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(['milestones', userId], context.previous);
      setErrorMessage('Failed to delete milestone');
      setTimeout(() => setErrorMessage(''), 3000);
    },
    onSettled: () => queryClient.invalidateQueries(['milestones', userId]),
  });

  const addTaskMutation = useMutation({
    mutationFn: ({ milestoneId, taskData }) => {
      const headers = getAuthHeader();
      if (!headers) throw new Error('Not authenticated');
      return axios.post(`${API_BASE_URL}/milestones/${milestoneId}/tasks`, taskData, { headers });
    },
    onMutate: async ({ milestoneId, taskData }) => {
      await queryClient.cancelQueries(['milestones', userId]);
      const previous = queryClient.getQueryData(['milestones', userId]);
      const tempId = `temp-task-${Date.now()}`;
      const optimisticTask = {
        id: tempId,
        description: taskData.description,
        dueDate: taskData.dueDate || null,
        status: 'PENDING',
        creationTimestamp: new Date().toISOString(),
      };
      queryClient.setQueryData(['milestones', userId], (old) =>
        old.map(m =>
          m.id === milestoneId
            ? { ...m, tasks: [...(m.tasks || []), optimisticTask] }
            : m
        )
      );
      return { previous, tempId };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['milestones', userId], context.previous);
      setErrorMessage('Failed to add task');
      setTimeout(() => setErrorMessage(''), 3000);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['milestones', userId]);
      if (expandedMilestoneId) fetchTasksForMilestone(expandedMilestoneId);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ milestoneId, taskId, data }) => {
      const headers = getAuthHeader();
      if (!headers) throw new Error('Not authenticated');
      return axios.put(`${API_BASE_URL}/milestones/${milestoneId}/tasks/${taskId}`, data, { headers });
    },
    onMutate: async ({ milestoneId, taskId, data }) => {
      await queryClient.cancelQueries(['milestones', userId]);
      const previous = queryClient.getQueryData(['milestones', userId]);
      queryClient.setQueryData(['milestones', userId], (old) =>
        old.map(m =>
          m.id === milestoneId
            ? { ...m, tasks: m.tasks.map(t => (t.id === taskId ? { ...t, ...data } : t)) }
            : m
        )
      );
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['milestones', userId], context.previous);
      setErrorMessage('Failed to update task');
      setTimeout(() => setErrorMessage(''), 3000);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['milestones', userId]);
      if (expandedMilestoneId) fetchTasksForMilestone(expandedMilestoneId);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: ({ milestoneId, taskId }) => {
      const headers = getAuthHeader();
      if (!headers) throw new Error('Not authenticated');
      return axios.delete(`${API_BASE_URL}/milestones/${milestoneId}/tasks/${taskId}`, { headers });
    },
    onMutate: async ({ milestoneId, taskId }) => {
      await queryClient.cancelQueries(['milestones', userId]);
      const previous = queryClient.getQueryData(['milestones', userId]);
      queryClient.setQueryData(['milestones', userId], (old) =>
        old.map(m =>
          m.id === milestoneId
            ? { ...m, tasks: m.tasks.filter(t => t.id !== taskId) }
            : m
        )
      );
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['milestones', userId], context.previous);
      setErrorMessage('Failed to delete task');
      setTimeout(() => setErrorMessage(''), 3000);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['milestones', userId]);
      if (expandedMilestoneId) fetchTasksForMilestone(expandedMilestoneId);
    },
  });

  // --- AI Insights ---
  const fetchMilestoneInsights = useCallback(async (milestoneId) => {
    setLoadingInsightsId(milestoneId);
    setInsightErrorId(null);
    const headers = getAuthHeader();
    if (!headers) {
      setErrorMessage('Authentication missing');
      setLoadingInsightsId(null);
      return;
    }
    try {
      const { data } = await axios.get(`${API_BASE_URL}/milestones/${milestoneId}/insights`, { headers });
      setMilestoneInsights(prev => ({ ...prev, [milestoneId]: data }));
      setSuccessMessage('AI insights generated!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setInsightErrorId(milestoneId);
      setErrorMessage(`Failed to get insights: ${err.response?.data?.message || err.message}`);
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setLoadingInsightsId(null);
    }
  }, []);

  // --- Handlers ---
  const handleAddMilestone = (e) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) {
      setErrorMessage('Title cannot be empty');
      return;
    }
    addMilestoneMutation.mutate({
      title: newMilestoneTitle,
      description: newMilestoneDescription || null,
      dueDate: newMilestoneDueDate || null,
    });
    setNewMilestoneTitle('');
    setNewMilestoneDescription('');
    setNewMilestoneDueDate('');
    setSuccessMessage('Milestone added!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleEditMilestoneClick = (milestone) => {
    setEditingMilestoneId(milestone.id);
    setEditedMilestoneTitle(milestone.title);
    setEditedMilestoneDescription(milestone.description || '');
    setEditedMilestoneDueDate(milestone.dueDate || '');
    setEditedMilestoneStatus(milestone.status);
  };

  const handleSaveMilestoneEdit = (id) => {
    if (!editedMilestoneTitle.trim()) {
      setErrorMessage('Title cannot be empty');
      return;
    }
    updateMilestoneMutation.mutate({
      id,
      data: {
        title: editedMilestoneTitle,
        description: editedMilestoneDescription || null,
        dueDate: editedMilestoneDueDate || null,
        status: editedMilestoneStatus,
      },
    });
    setEditingMilestoneId(null);
    setSuccessMessage('Milestone updated!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteMilestoneClick = (id) => {
    setDeleteMilestoneModal({ isOpen: true, milestoneId: id });
  };

  const confirmDeleteMilestone = () => {
    deleteMilestoneMutation.mutate(deleteMilestoneModal.milestoneId);
    setDeleteMilestoneModal({ isOpen: false, milestoneId: null });
    setSuccessMessage('Milestone deleted!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleAddTask = (e, milestoneId) => {
    e.preventDefault();
    if (!newTaskDescription.trim()) {
      setErrorMessage('Task description cannot be empty');
      return;
    }
    addTaskMutation.mutate({
      milestoneId,
      taskData: {
        description: newTaskDescription,
        dueDate: newTaskDueDate || null,
      },
    });
    setNewTaskDescription('');
    setNewTaskDueDate('');
    setSuccessMessage('Task added!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleEditTaskClick = (task) => {
    setEditingTaskId(task.id);
    setEditedTaskDescription(task.description);
    setEditedTaskDueDate(task.dueDate || '');
    setEditedTaskStatus(task.status);
  };

  const handleSaveTaskEdit = (milestoneId, taskId) => {
    if (!editedTaskDescription.trim()) {
      setErrorMessage('Task description cannot be empty');
      return;
    }
    updateTaskMutation.mutate({
      milestoneId,
      taskId,
      data: {
        description: editedTaskDescription,
        dueDate: editedTaskDueDate || null,
        status: editedTaskStatus,
      },
    });
    setEditingTaskId(null);
    setSuccessMessage('Task updated!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleToggleTaskStatus = (milestoneId, task) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    updateTaskMutation.mutate({
      milestoneId,
      taskId: task.id,
      data: { status: newStatus },
    });
    setSuccessMessage(`Task marked ${newStatus.toLowerCase()}`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteTaskClick = (milestoneId, taskId) => {
    setDeleteTaskModal({ isOpen: true, milestoneId, taskId });
  };

  const confirmDeleteTask = () => {
    deleteTaskMutation.mutate({
      milestoneId: deleteTaskModal.milestoneId,
      taskId: deleteTaskModal.taskId,
    });
    setDeleteTaskModal({ isOpen: false, milestoneId: null, taskId: null });
    setSuccessMessage('Task deleted!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // --- Helpers ---
  const getStatusColorClass = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500 text-white';
      case 'IN_PROGRESS': return 'bg-blue-500 text-white';
      case 'PENDING': return 'bg-yellow-500 text-gray-800';
      case 'OVERDUE': return 'bg-red-500 text-white';
      case 'CANCELLED': return 'bg-gray-500 text-white';
      default: return 'bg-gray-300 text-gray-800';
    }
  };

  const getProgressBarColor = (percentage) => {
    if (percentage === 100) return '#5CC8C2';
    if (percentage > 75) return '#4CAF50';
    if (percentage > 50) return '#8BC34A';
    if (percentage > 25) return '#FFEB3B';
    return '#FF5722';
  };

  const toggleMilestoneExpand = (milestoneId) => {
    if (expandedMilestoneId === milestoneId) {
      setExpandedMilestoneId(null);
    } else {
      setExpandedMilestoneId(milestoneId);
      const milestone = milestones.find(m => m.id === milestoneId);
      if (milestone && (!milestone.tasks || milestone.tasks.length === 0)) {
        fetchTasksForMilestone(milestoneId);
      }
    }
  };

  // --- Loading skeleton ---
  if (loadingMilestones) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-48 animate-pulse" />
          <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-full w-28 animate-pulse" />
        </div>
        <MilestoneSkeleton theme={theme} />
        <MilestoneSkeleton theme={theme} />
        <MilestoneSkeleton theme={theme} />
      </div>
    );
  }

  if (milestonesError) {
    return (
      <div className={`p-6 rounded-2xl text-center ${cardBg} border ${cardBorder} shadow-lg`}>
        <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
        <p className="text-red-500 font-medium">Error Loading Milestones</p>
        <p className={`text-sm ${textSecondary} mt-1`}>{milestonesError.message}</p>
      </div>
    );
  }

  // --- Main render ---
  return (
    <div className={`rounded-2xl ${cardBg} border ${cardBorder} shadow-xl backdrop-blur-sm p-6 transition-all duration-300`}>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-poppins font-bold bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
          My Milestones & To-Dos
        </h2>
      </div>

      {successMessage && (
        <div className="mb-4 p-3 rounded-xl bg-green-100/20 dark:bg-green-900/30 border border-green-500/30 text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
          <CheckCircle size={16} /> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-red-100/20 dark:bg-red-900/30 border border-red-500/30 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {errorMessage}
        </div>
      )}

      {/* Add Milestone Form */}
      <div className={`mb-8 p-5 rounded-xl ${sectionBg} border ${sectionBorder}`}>
        <h3 className="text-xl font-poppins font-semibold mb-4 flex items-center gap-2">
          <Plus size={20} className="text-purple-400" /> Add New Milestone
        </h3>
        <form onSubmit={handleAddMilestone} className="space-y-4">
          <input
            type="text"
            value={newMilestoneTitle}
            onChange={(e) => setNewMilestoneTitle(e.target.value)}
            placeholder="Title *"
            className={`w-full p-3 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none focus:ring-2 ${inputFocusRing} transition`}
            required
          />
          <textarea
            value={newMilestoneDescription}
            onChange={(e) => setNewMilestoneDescription(e.target.value)}
            placeholder="Description (optional)"
            className={`w-full p-3 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none focus:ring-2 ${inputFocusRing} transition resize-y min-h-[80px]`}
          />
          <input
            type="date"
            value={newMilestoneDueDate}
            onChange={(e) => setNewMilestoneDueDate(e.target.value)}
            className={`w-full p-3 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none focus:ring-2 ${inputFocusRing} transition`}
          />
          <button
            type="submit"
            disabled={addMilestoneMutation.isPending}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-teal-500 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {addMilestoneMutation.isPending ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
            {addMilestoneMutation.isPending ? 'Adding...' : 'Add Milestone'}
          </button>
        </form>
      </div>

      {/* Milestones List */}
      {milestones.length === 0 ? (
        <div className={`text-center py-12 rounded-xl ${sectionBg} border ${sectionBorder}`}>
          <Target size={48} className={`mx-auto mb-3 opacity-30 ${textSecondary}`} />
          <p className={`text-lg ${textSecondary}`}>No milestones yet.</p>
          <p className={`text-sm ${textSecondary}`}>Create your first milestone above!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {milestones.map(milestone => (
            <div key={milestone.id} className={`rounded-xl ${sectionBg} border ${sectionBorder} overflow-hidden transition-all duration-300 hover:shadow-md`}>
              {/* Milestone Header (edit/display) */}
              {editingMilestoneId === milestone.id ? (
                <div className="p-5">
                  <h3 className="text-xl font-poppins font-semibold mb-4">Edit Milestone</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editedMilestoneTitle}
                      onChange={(e) => setEditedMilestoneTitle(e.target.value)}
                      className={`w-full p-3 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none focus:ring-2 ${inputFocusRing} transition`}
                      required
                    />
                    <textarea
                      value={editedMilestoneDescription}
                      onChange={(e) => setEditedMilestoneDescription(e.target.value)}
                      className={`w-full p-3 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none focus:ring-2 ${inputFocusRing} transition resize-y min-h-[80px]`}
                    />
                    <input
                      type="date"
                      value={editedMilestoneDueDate}
                      onChange={(e) => setEditedMilestoneDueDate(e.target.value)}
                      className={`w-full p-3 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none focus:ring-2 ${inputFocusRing} transition`}
                    />
                    <select
                      value={editedMilestoneStatus}
                      onChange={(e) => setEditedMilestoneStatus(e.target.value)}
                      className={`w-full p-3 rounded-xl border ${inputBorder} ${inputBg} focus:outline-none focus:ring-2 ${inputFocusRing} transition`}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="OVERDUE">Overdue</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                    <div className="flex justify-end gap-3 pt-2">
                      <button onClick={() => setEditingMilestoneId(null)} className="px-5 py-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition">Cancel</button>
                      <button onClick={() => handleSaveMilestoneEdit(milestone.id)} className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 text-white font-medium hover:shadow-md transition">Save</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-poppins font-semibold">{milestone.title}</h3>
                      {milestone.description && <p className={`text-sm ${textSecondary} mt-1`}>{milestone.description}</p>}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                        <span className={`px-2 py-1 rounded-full ${getStatusColorClass(milestone.status)}`}>
                          {milestone.status.replace('_', ' ')}
                        </span>
                        {milestone.dueDate && isValid(parseISO(milestone.dueDate)) && (
                          <span className="flex items-center gap-1 text-gray-500"><Calendar size={12} /> Due: {format(parseISO(milestone.dueDate), 'MMM dd, yyyy')}</span>
                        )}
                        <span className="flex items-center gap-1 text-gray-500"><Clock size={12} /> Created: {format(parseISO(milestone.creationDate), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16">
                        <CircularProgressbar
                          value={milestone.completionPercentage || 0}
                          text={`${milestone.completionPercentage ? milestone.completionPercentage.toFixed(0) : 0}%`}
                          styles={buildStyles({
                            pathColor: getProgressBarColor(milestone.completionPercentage || 0),
                            textColor: isDarkMode ? '#E0E0E0' : '#4B5563',
                            trailColor: isDarkMode ? '#4B5563' : '#D1D5DB',
                          })}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button onClick={() => handleEditMilestoneClick(milestone)} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition" title="Edit"><Edit2 size={14} /></button>
                        <button onClick={() => handleDeleteMilestoneClick(milestone.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition" title="Delete"><Trash2 size={14} /></button>
                        <button onClick={() => toggleMilestoneExpand(milestone.id)} disabled={isTempId(milestone.id)} className="p-1.5 rounded-lg bg-gray-500/10 text-gray-600 dark:text-gray-400 hover:bg-gray-500/20 transition disabled:opacity-50" title={expandedMilestoneId === milestone.id ? 'Hide Tasks' : 'View Tasks'}>
                          {expandedMilestoneId === milestone.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <button onClick={() => fetchMilestoneInsights(milestone.id)} disabled={loadingInsightsId === milestone.id} className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition disabled:opacity-50" title="AI Insights">
                          {loadingInsightsId === milestone.id ? <Loader size={14} className="animate-spin" /> : <Lightbulb size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Insights Display */}
              {milestoneInsights[milestone.id] && (
                <div className={`mx-5 mb-4 p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-blue-50/80'} border ${isDarkMode ? 'border-gray-600' : 'border-blue-200'}`}>
                  <h4 className="font-semibold flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-300">
                    <Lightbulb size={16} /> AI Insights
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Remaining Work:</strong> {milestoneInsights[milestone.id].remainingWork}</p>
                    <p><strong>Performance:</strong> {milestoneInsights[milestone.id].performanceAssessment}</p>
                    <div><strong>Tips:</strong> <ul className="list-disc list-inside ml-2">{milestoneInsights[milestone.id].tips.map((t,i)=><li key={i}>{t}</li>)}</ul></div>
                    <p><strong>Encouragement:</strong> {milestoneInsights[milestone.id].encouragement}</p>
                    <div><strong>Next Steps:</strong> <ul className="list-disc list-inside ml-2">{milestoneInsights[milestone.id].suggestedNewTasks.map((t,i)=><li key={i}>{t}</li>)}</ul></div>
                  </div>
                </div>
              )}

              {/* Tasks Section */}
              {expandedMilestoneId === milestone.id && (
                <div className="px-5 pb-5 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-teal-600 dark:text-teal-300">Tasks</h4>
                  {milestone.tasks && milestone.tasks.length > 0 ? (
                    <ul className="space-y-2">
                      {milestone.tasks.map(task => (
                        <li key={task.id} className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100/80'} flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
                          {editingTaskId === task.id ? (
                            <div className="w-full space-y-2">
                              <input type="text" value={editedTaskDescription} onChange={e=>setEditedTaskDescription(e.target.value)} className={`w-full p-2 rounded-lg border ${inputBorder} ${inputBg} focus:ring-2 ${inputFocusRing}`} required />
                              <input type="date" value={editedTaskDueDate} onChange={e=>setEditedTaskDueDate(e.target.value)} className={`w-full p-2 rounded-lg border ${inputBorder} ${inputBg} focus:ring-2 ${inputFocusRing}`} />
                              <select value={editedTaskStatus} onChange={e=>setEditedTaskStatus(e.target.value)} className={`w-full p-2 rounded-lg border ${inputBorder} ${inputBg} focus:ring-2 ${inputFocusRing}`}>
                                <option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="OVERDUE">Overdue</option><option value="CANCELLED">Cancelled</option>
                              </select>
                              <div className="flex justify-end gap-2">
                                <button onClick={()=>setEditingTaskId(null)} className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-600 text-sm">Cancel</button>
                                <button onClick={()=>handleSaveTaskEdit(milestone.id, task.id)} className="px-3 py-1 rounded-lg bg-purple-500 text-white text-sm">Save</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1">
                                <p className={`text-sm ${task.status === 'COMPLETED' ? 'line-through text-gray-500' : ''}`}>
                                  {task.description}
                                  {task.roadmapTaskId && <span className="ml-2 inline-flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full"><MapPin size={10} /> from Roadmap</span>}
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-xs">
                                  <span className={`px-2 py-0.5 rounded-full ${getStatusColorClass(task.status)}`}>{task.status.replace('_',' ')}</span>
                                  {task.dueDate && isValid(parseISO(task.dueDate)) && <span className="flex items-center gap-1"><Calendar size={10} /> {format(parseISO(task.dueDate), 'MMM dd')}</span>}
                                </div>
                              </div>
                              {isTempId(task.id) ? (
                                <div className="flex items-center gap-1"><Loader size={14} className="animate-spin" /><span className="text-xs">Adding...</span></div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button onClick={()=>handleToggleTaskStatus(milestone.id, task)} className="p-1.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20" title="Toggle Complete"><CheckCircle size={14} /></button>
                                  <button onClick={()=>handleEditTaskClick(task)} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20" title="Edit"><Edit2 size={14} /></button>
                                  <button onClick={()=>handleDeleteTaskClick(milestone.id, task.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20" title="Delete"><Trash2 size={14} /></button>
                                </div>
                              )}
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-sm text-gray-500">No tasks yet. Add one below.</p>
                  )}

                  {/* Add Task Form */}
                  <div className={`mt-4 p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-100/50'}`}>
                    <h5 className="font-medium mb-2">Add New Task</h5>
                    {isTempId(milestone.id) ? (
                      <div className="flex items-center justify-center py-2 text-gray-500"><Loader size={16} className="animate-spin mr-2" /> Milestone being created...</div>
                    ) : (
                      <form onSubmit={(e)=>handleAddTask(e, milestone.id)} className="space-y-3">
                        <input type="text" value={newTaskDescription} onChange={e=>setNewTaskDescription(e.target.value)} placeholder="Description *" className={`w-full p-2 rounded-lg border ${inputBorder} ${inputBg} focus:ring-2 ${inputFocusRing}`} required />
                        <input type="date" value={newTaskDueDate} onChange={e=>setNewTaskDueDate(e.target.value)} className={`w-full p-2 rounded-lg border ${inputBorder} ${inputBg} focus:ring-2 ${inputFocusRing}`} />
                        <button type="submit" disabled={addTaskMutation.isPending} className="w-full py-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-medium hover:shadow-md transition disabled:opacity-50">
                          {addTaskMutation.isPending ? <Loader size={16} className="animate-spin inline mr-1" /> : <Plus size={16} className="inline mr-1" />}
                          Add Task
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
      <Modal isOpen={deleteMilestoneModal.isOpen} onClose={()=>setDeleteMilestoneModal({isOpen:false,milestoneId:null})} title="Delete Milestone" message="Delete this milestone and all its tasks? This cannot be undone." onConfirm={confirmDeleteMilestone} theme={theme} />
      <Modal isOpen={deleteTaskModal.isOpen} onClose={()=>setDeleteTaskModal({isOpen:false,milestoneId:null,taskId:null})} title="Delete Task" message="Delete this task?" onConfirm={confirmDeleteTask} theme={theme} />
    </div>
  );
}

export default MilestoneTracker;