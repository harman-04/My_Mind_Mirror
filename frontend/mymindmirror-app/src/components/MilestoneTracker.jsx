// src/components/MilestoneTracker.jsx
import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format, parseISO, isValid } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Loader, Lightbulb, ThumbsUp, Target, ChevronDown, ChevronUp, MapPin } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8080/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('jwtToken');
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
};

// --------------------------------------------------------------
// Reusable Modal Component (Portal-based)
// --------------------------------------------------------------
const Modal = ({ isOpen, onClose, title, message, confirmText = 'Delete', cancelText = 'Cancel', onConfirm, theme }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      // Prevent scrolling on body when modal is open
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative max-w-sm w-full p-6 rounded-lg shadow-xl text-center ${
          theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
        }`}
        style={{ transform: 'translateY(0)' }}
      >
        <h3 className="text-xl font-poppins font-semibold mb-4">{title}</h3>
        <p className="mb-6">{message}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onConfirm}
            className="py-2 px-4 rounded-full font-semibold text-white bg-red-600 hover:bg-red-700 transition"
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className={`py-2 px-4 rounded-full font-semibold transition ${
              theme === 'dark'
                ? 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --------------------------------------------------------------
// Main MilestoneTracker Component
// --------------------------------------------------------------
function MilestoneTracker({ userId }) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  // Helper to detect temporary IDs
  const isTempId = (id) => typeof id === 'string' && id.startsWith('temp-');

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

  // Modal visibility states
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

  // --- Optimistic Mutations (same as before, unchanged) ---
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

  // --- Helpers (styling, expand) ---
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

  // --- Loading & error states ---
  if (loadingMilestones) {
    return (
      <div className="p-8 rounded-[2rem] shadow-xl w-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-slate-200 dark:bg-slate-700/50 rounded-full w-1/4 mb-8" />
          <div className="space-y-4">
            <div className="h-24 bg-slate-200/50 dark:bg-slate-800/40 rounded-2xl" />
            <div className="h-24 bg-slate-200/50 dark:bg-slate-800/40 rounded-2xl" />
            <div className="h-24 bg-slate-200/50 dark:bg-slate-800/40 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (milestonesError) {
    return (
      <div className={`p-6 rounded-lg shadow-md text-center ${theme === 'dark' ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700'}`}>
        <p className="text-xl font-poppins font-semibold">Error Loading Milestones</p>
        <p className="font-inter mt-2">{milestonesError.message}</p>
      </div>
    );
  }

  // --- Main render (same as before, but modals replaced with Portal version) ---
  return (
    <div className={`p-6 rounded-lg shadow-md transition-all duration-500 w-full font-inter
                    ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
      <h2 className="text-3xl font-poppins font-semibold text-[#B399D4] dark:text-[#5CC8C2] mb-6 text-center">
        My Milestones & To-Dos
      </h2>

      {successMessage && (
        <div className="bg-green-100 dark:bg-green-900/40 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded relative mb-4">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded relative mb-4">
          {errorMessage}
        </div>
      )}

      {insightErrorId && errorMessage && (
        <div className="bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Insight Error!</strong>
          <span className="block sm:inline"> {errorMessage}</span>
          <p className="text-sm mt-1">
            Make sure your Gemini API key is set in your profile and the ML service is running.
          </p>
        </div>
      )}

      {/* Add Milestone Form */}
      <div className={`mb-8 p-4 rounded-lg shadow-inner ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4">Add New Milestone</h3>
        <form onSubmit={handleAddMilestone} className="space-y-4">
          <input
            type="text"
            value={newMilestoneTitle}
            onChange={(e) => setNewMilestoneTitle(e.target.value)}
            placeholder="Title *"
            className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
            required
          />
          <textarea
            value={newMilestoneDescription}
            onChange={(e) => setNewMilestoneDescription(e.target.value)}
            placeholder="Description (optional)"
            className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 resize-y min-h-[60px] ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
          />
          <input
            type="date"
            value={newMilestoneDueDate}
            onChange={(e) => setNewMilestoneDueDate(e.target.value)}
            className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
          />
          <button
            type="submit"
            disabled={addMilestoneMutation.isPending}
            className="w-full py-2 px-4 rounded-md font-poppins font-semibold text-white bg-[#B399D4] hover:bg-[#9B7BBF] active:bg-[#7F66A0] shadow-md transition-all duration-300 disabled:opacity-50"
          >
            {addMilestoneMutation.isPending ? 'Adding...' : 'Add Milestone'}
          </button>
        </form>
      </div>

      {/* Milestones List */}
      {milestones.length === 0 ? (
        <p className="text-center text-gray-700 dark:text-gray-300 text-lg">No milestones yet. Start by adding one above!</p>
      ) : (
        <div className="space-y-6">
          {milestones.map(milestone => (
            <div key={milestone.id} className={`p-5 rounded-lg shadow-md ${theme === 'dark' ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'}`}>
              {editingMilestoneId === milestone.id ? (
                <div>
                  <h3 className="text-xl font-poppins font-semibold mb-3">Edit Milestone</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editedMilestoneTitle}
                      onChange={(e) => setEditedMilestoneTitle(e.target.value)}
                      className={`w-full p-2 border rounded-md focus:ring-2 ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                      required
                    />
                    <textarea
                      value={editedMilestoneDescription}
                      onChange={(e) => setEditedMilestoneDescription(e.target.value)}
                      className={`w-full p-2 border rounded-md resize-y min-h-[60px] ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                    />
                    <input
                      type="date"
                      value={editedMilestoneDueDate}
                      onChange={(e) => setEditedMilestoneDueDate(e.target.value)}
                      className={`w-full p-2 border rounded-md focus:ring-2 ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                    />
                    <select
                      value={editedMilestoneStatus}
                      onChange={(e) => setEditedMilestoneStatus(e.target.value)}
                      className={`w-full p-2 border rounded-md focus:ring-2 ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="OVERDUE">Overdue</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                    <div className="flex justify-end space-x-2 mt-4">
                      <button onClick={() => handleSaveMilestoneEdit(milestone.id)} className="py-2 px-4 rounded-md font-semibold text-white bg-[#B399D4] hover:bg-[#9B7BBF]">Save</button>
                      <button onClick={() => setEditingMilestoneId(null)} className={`py-2 px-4 rounded-md font-semibold ${theme === 'dark' ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Cancel</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                  <div className="flex-1 mb-4 sm:mb-0">
                    <h3 className="text-2xl font-poppins font-semibold">{milestone.title}</h3>
                    {milestone.description && <p className="text-sm mt-1">{milestone.description}</p>}
                    <div className="flex items-center mt-2 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColorClass(milestone.status)}`}>
                        {milestone.status.replace('_', ' ')}
                      </span>
                      {milestone.dueDate && isValid(parseISO(milestone.dueDate)) && (
                        <span className="ml-3">Due: {format(parseISO(milestone.dueDate), 'MMM dd, yyyy')}</span>
                      )}
                      <span className="ml-3">Created: {format(parseISO(milestone.creationDate), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16">
                      <CircularProgressbar
                        value={milestone.completionPercentage || 0}
                        text={`${milestone.completionPercentage ? milestone.completionPercentage.toFixed(0) : 0}%`}
                        styles={buildStyles({
                          pathColor: getProgressBarColor(milestone.completionPercentage || 0),
                          textColor: theme === 'dark' ? '#E0E0E0' : '#4B5563',
                          trailColor: theme === 'dark' ? '#4B5563' : '#D1D5DB',
                        })}
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <button onClick={() => handleEditMilestoneClick(milestone)} className="py-1 px-3 rounded-md font-semibold text-sm bg-blue-500 text-white hover:bg-blue-600">Edit</button>
                      <button onClick={() => handleDeleteMilestoneClick(milestone.id)} className="py-1 px-3 rounded-md font-semibold text-sm bg-red-500 text-white hover:bg-red-600">Delete</button>
                      <button
                        onClick={() => toggleMilestoneExpand(milestone.id)}
                        disabled={isTempId(milestone.id)}
                        className={`py-1 px-3 rounded-md font-semibold text-sm ${isTempId(milestone.id) ? 'opacity-50 cursor-not-allowed' : theme === 'dark' ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      >
                        {expandedMilestoneId === milestone.id ? <>Hide Tasks <ChevronUp size={16} className="inline ml-1" /></> : <>View Tasks <ChevronDown size={16} className="inline ml-1" /></>}
                      </button>
                      <button
                        onClick={() => fetchMilestoneInsights(milestone.id)}
                        disabled={loadingInsightsId === milestone.id}
                        className={`py-1 px-3 rounded-md font-semibold text-sm ${theme === 'dark' ? 'bg-[#5CC8C2] text-gray-900 hover:bg-[#47A8A3]' : 'bg-[#B399D4] text-white hover:bg-[#9B7BBF]'} transition-all duration-300 disabled:opacity-50`}
                      >
                        {loadingInsightsId === milestone.id ? 'Getting Insights...' : 'Get AI Insights'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Insights Display */}
              {milestoneInsights[milestone.id] && (
                <div className={`mt-6 p-4 rounded-lg shadow-inner ${theme === 'dark' ? 'bg-gray-600 border border-gray-500' : 'bg-blue-50 border border-blue-200'}`}>
                  <h4 className="text-xl font-poppins font-semibold mb-3 flex items-center">
                    <Lightbulb size={20} className="mr-2 text-[#B399D4] dark:text-[#5CC8C2]" /> AI Insights
                  </h4>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p><strong>Remaining Work:</strong> {milestoneInsights[milestone.id].remainingWork}</p>
                    <p><strong>Performance:</strong> {milestoneInsights[milestone.id].performanceAssessment}</p>
                    <div>
                      <strong className="flex items-center"><Lightbulb size={16} className="mr-1" /> Tips:</strong>
                      <ul className="list-disc list-inside ml-4">
                        {milestoneInsights[milestone.id].tips.map((tip, idx) => <li key={idx}>{tip}</li>)}
                      </ul>
                    </div>
                    <p><strong className="flex items-center"><ThumbsUp size={16} className="mr-1" /> Encouragement:</strong> {milestoneInsights[milestone.id].encouragement}</p>
                    <div>
                      <strong className="flex items-center"><Target size={16} className="mr-1" /> Suggested Next Steps:</strong>
                      <ul className="list-disc list-inside ml-4">
                        {milestoneInsights[milestone.id].suggestedNewTasks.map((task, idx) => <li key={idx}>{task}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks Section (expanded) */}
              {expandedMilestoneId === milestone.id && (
                <div className="mt-6 border-t border-gray-300 dark:border-gray-600 pt-6">
                  <h4 className="text-xl font-poppins font-semibold mb-4">Tasks</h4>
                  {milestone.tasks && milestone.tasks.length > 0 ? (
                    <ul className="space-y-3">
                      {milestone.tasks.map(task => (
                        <li key={task.id} className={`p-3 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between ${theme === 'dark' ? 'bg-gray-600 border border-gray-500' : 'bg-gray-100 border border-gray-300'}`}>
                          {editingTaskId === task.id ? (
                            <div className="w-full space-y-2">
                              <input
                                type="text"
                                value={editedTaskDescription}
                                onChange={(e) => setEditedTaskDescription(e.target.value)}
                                className={`w-full p-2 border rounded-md focus:ring-2 ${theme === 'dark' ? 'bg-gray-500 text-gray-200 border-gray-400 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                                required
                              />
                              <input
                                type="date"
                                value={editedTaskDueDate}
                                onChange={(e) => setEditedTaskDueDate(e.target.value)}
                                className={`w-full p-2 border rounded-md focus:ring-2 ${theme === 'dark' ? 'bg-gray-500 text-gray-200 border-gray-400 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                              />
                              <select
                                value={editedTaskStatus}
                                onChange={(e) => setEditedTaskStatus(e.target.value)}
                                className={`w-full p-2 border rounded-md focus:ring-2 ${theme === 'dark' ? 'bg-gray-500 text-gray-200 border-gray-400 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                              >
                                <option value="PENDING">Pending</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="OVERDUE">Overdue</option>
                                <option value="CANCELLED">Cancelled</option>
                              </select>
                              <div className="flex justify-end space-x-2">
                                <button onClick={() => handleSaveTaskEdit(milestone.id, task.id)} className="py-1 px-3 rounded-md font-semibold text-sm bg-[#B399D4] text-white hover:bg-[#9B7BBF]">Save</button>
                                <button onClick={() => setEditingTaskId(null)} className={`py-1 px-3 rounded-md font-semibold text-sm ${theme === 'dark' ? 'bg-gray-500 text-gray-200 hover:bg-gray-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 mb-2 sm:mb-0">
                                <p className={`text-lg font-medium ${task.status === 'COMPLETED' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                  {task.description}
                                  {task.roadmapTaskId && (
                                    <span className="ml-2 inline-flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full">
                                      <MapPin size={12} /> from Roadmap
                                    </span>
                                  )}
                                </p>
                                <div className="flex items-center mt-1 text-xs">
                                  <span className={`px-2 py-0.5 rounded-full ${getStatusColorClass(task.status)}`}>
                                    {task.status.replace('_', ' ')}
                                  </span>
                                  {task.dueDate && isValid(parseISO(task.dueDate)) && (
                                    <span className="ml-2">Due: {format(parseISO(task.dueDate), 'MMM dd, yyyy')}</span>
                                  )}
                                </div>
                              </div>
                              {isTempId(task.id) ? (
                                <div className="flex items-center justify-center mt-2 sm:mt-0">
                                  <Loader className="w-4 h-4 animate-spin text-gray-500" />
                                  <span className="ml-1 text-xs text-gray-500">Adding...</span>
                                </div>
                              ) : (
                                <div className="flex space-x-2 mt-2 sm:mt-0">
                                  <button
                                    onClick={() => handleToggleTaskStatus(milestone.id, task)}
                                    className={`py-1 px-3 rounded-md font-semibold text-xs ${task.status === 'COMPLETED' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
                                  >
                                    {task.status === 'COMPLETED' ? 'Mark Pending' : 'Mark Complete'}
                                  </button>
                                  <button
                                    onClick={() => handleEditTaskClick(task)}
                                    className="py-1 px-3 rounded-md font-semibold text-xs bg-blue-500 text-white hover:bg-blue-600"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTaskClick(milestone.id, task.id)}
                                    className="py-1 px-3 rounded-md font-semibold text-xs bg-red-500 text-white hover:bg-red-600"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-gray-600 dark:text-gray-400">No tasks for this milestone yet.</p>
                  )}

                  {/* Add Task Form */}
                  <div className={`mt-6 p-4 rounded-lg shadow-inner ${theme === 'dark' ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                    <h5 className="text-lg font-poppins font-semibold mb-3">Add New Task</h5>
                    {isTempId(milestone.id) ? (
                      <div className="flex items-center justify-center py-4 text-gray-500">
                        <Loader className="w-5 h-5 animate-spin mr-2" />
                        <span>Milestone is being created... Please wait.</span>
                      </div>
                    ) : (
                      <form onSubmit={(e) => handleAddTask(e, milestone.id)} className="space-y-3">
                        <input
                          type="text"
                          value={newTaskDescription}
                          onChange={(e) => setNewTaskDescription(e.target.value)}
                          placeholder="Description *"
                          className={`w-full p-2 border rounded-md focus:ring-2 ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                          required
                        />
                        <input
                          type="date"
                          value={newTaskDueDate}
                          onChange={(e) => setNewTaskDueDate(e.target.value)}
                          className={`w-full p-2 border rounded-md focus:ring-2 ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                        />
                        <button
                          type="submit"
                          disabled={addTaskMutation.isPending}
                          className="w-full py-2 px-4 rounded-md font-poppins font-semibold text-white bg-[#5CC8C2] hover:bg-[#47A8A3] transition-all duration-300 disabled:opacity-50"
                        >
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

      {/* Portal-based Delete Modals */}
      <Modal
        isOpen={deleteMilestoneModal.isOpen}
        onClose={() => setDeleteMilestoneModal({ isOpen: false, milestoneId: null })}
        title="Delete Milestone"
        message="Delete this milestone and all its tasks? This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteMilestone}
        theme={theme}
      />

      <Modal
        isOpen={deleteTaskModal.isOpen}
        onClose={() => setDeleteTaskModal({ isOpen: false, milestoneId: null, taskId: null })}
        title="Delete Task"
        message="Delete this task?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteTask}
        theme={theme}
      />
    </div>
  );
}

export default MilestoneTracker;