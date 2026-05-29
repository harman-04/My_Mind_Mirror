// src/pages/SchedulePage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { format, parse, startOfWeek, getDay, addDays, subDays, isToday } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import {
  Loader, Plus, RefreshCw, Trash2, Edit2, CheckCircle, Circle,
  AlertCircle, Clock, Calendar as CalendarIcon, X, Filter,
  ArrowUp, ArrowDown, BarChart3, ChevronLeft, ChevronRight, CalendarOff, AlertTriangle
} from 'lucide-react';

const DnDCalendar = withDragAndDrop(Calendar);
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const API_BASE_URL = 'http://localhost:8080/api';
const getToken = () => localStorage.getItem('jwtToken');

// ------------------------------------------------------------------
// API calls
// ------------------------------------------------------------------
const fetchScheduledTasks = async ({ queryKey }) => {
  const [_, start, end] = queryKey;
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.get(`${API_BASE_URL}/schedule/tasks`, {
    params: { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

// const generateSchedule = async () => {
//   const token = getToken();
//   if (!token) throw new Error('Not authenticated');
//   await axios.post(`${API_BASE_URL}/schedule/generate`, {}, { headers: { Authorization: `Bearer ${token}` } });
// };

// Modify generateSchedule function to accept mode
const generateSchedule = async (mode) => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  await axios.post(`${API_BASE_URL}/schedule/generate?mode=${mode}`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

const moveTask = async ({ taskId, date, startTime, endTime }) => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  await axios.put(`${API_BASE_URL}/schedule/task/${taskId}/move`, { date, startTime, endTime }, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

const completeTask = async (taskId) => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  await axios.patch(`${API_BASE_URL}/schedule/task/${taskId}/complete`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

const fetchCustomTasks = async () => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.get(`${API_BASE_URL}/custom-tasks`, { headers: { Authorization: `Bearer ${token}` } });
  return response.data;
};

const createCustomTask = async (task) => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.post(`${API_BASE_URL}/custom-tasks`, task, { headers: { Authorization: `Bearer ${token}` } });
  return response.data;
};

const updateCustomTask = async ({ id, task }) => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.put(`${API_BASE_URL}/custom-tasks/${id}`, task, { headers: { Authorization: `Bearer ${token}` } });
  return response.data;
};

const deleteCustomTask = async (id) => {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  await axios.delete(`${API_BASE_URL}/custom-tasks/${id}`, { headers: { Authorization: `Bearer ${token}` } });
};

// UX FIX: Distinct Slate/Gray color for Low Priority
const getPriorityConfig = (priority) => {
  switch (priority) {
    case 'HIGH': return { color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', icon: ArrowUp, label: 'High' };
    case 'MEDIUM': return { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', icon: BarChart3, label: 'Medium' };
    default: return { color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300', icon: ArrowDown, label: 'Low' };
  }
};

// ------------------------------------------------------------------
// Task Detail Modal
// ------------------------------------------------------------------
const TaskDetailModal = ({ task, isOpen, onClose, onComplete, onEdit, onDelete, isCustomTask }) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !task || !mounted) return null;

  const priorityConfig = getPriorityConfig(task.priority || 'MEDIUM');
  const PriorityIcon = priorityConfig.icon;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
  const bgClass = theme === 'dark' ? 'bg-gray-900/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md';
  const borderClass = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className={`relative max-w-md w-full rounded-2xl ${bgClass} border ${borderClass} shadow-2xl overflow-hidden transform transition-all duration-300 scale-100 animate-in fade-in zoom-in`}>
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/30 dark:to-teal-900/30">
          <h3 className="text-xl font-poppins font-semibold bg-gradient-to-r from-purple-600 to-teal-600 dark:from-purple-400 dark:to-teal-400 bg-clip-text text-transparent">Task Details</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 dark:hover:bg-gray-700 transition"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <div className="flex justify-between items-start gap-2">
              <h4 className="text-lg font-semibold">{task.title}</h4>
              {task.completed && <CheckCircle size={20} className="text-green-500" />}
            </div>
            {task.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{task.description}</p>}
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
                <CalendarIcon size={14} /> Due: {task.dueDate}
              </span>
            )}
            {task.estimatedHours && (
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400"><Clock size={14} /> {task.estimatedHours} hours</span>
            )}
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${priorityConfig.color}`}>
              <PriorityIcon size={12} /> {priorityConfig.label}
            </span>
          </div>
          {task.scheduledDate && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Scheduled:</span> {task.scheduledDate} {task.startTime && ` • ${task.startTime} – ${task.endTime}`}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
          {!task.completed && (
            <button onClick={() => { onComplete(task.id); onClose(); }} className="px-4 py-2 rounded-full bg-green-600 text-white hover:bg-green-700 transition">Mark Complete</button>
          )}
          {isCustomTask && (
                      <>
                        <button onClick={() => { onEdit(task); onClose(); }} className="px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition">Edit</button>

                        {/* 👇 UPDATE THE ONDELETE FUNCTION HERE 👇 */}
                        <button onClick={() => { onDelete(task.customTaskId || task.id, task.title); onClose(); }} className="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition">Delete</button>
                      </>
                    )}
          <button onClick={onClose} className="px-4 py-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition">Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ------------------------------------------------------------------
// Custom Confirm Modal (Replaces window.confirm)
// ------------------------------------------------------------------
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const bgClass = theme === 'dark' ? 'bg-gray-900/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md';
  const borderClass = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="absolute inset-0" onClick={!isLoading ? onClose : undefined} aria-hidden="true" />
      <div className={`relative max-w-sm w-full rounded-2xl ${bgClass} border ${borderClass} shadow-2xl p-6 transform transition-all duration-300 animate-in fade-in zoom-in`}>
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
          <div className="flex w-full gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ------------------------------------------------------------------
// Custom Month Event
// ------------------------------------------------------------------
const MonthEvent = ({ event, onSelectEvent }) => {
  const isCompleted = event.resource?.completed;

  const handleClick = (e) => {
    e.stopPropagation();
    onSelectEvent(event);
  };

  return (
    <button
      onClick={handleClick}
      // UX FIX: Removed the Tailwind bg colors. It now perfectly inherits
      // the dynamic color and border from eventPropGetter without the "box in a box" look!
      className="w-full h-full text-left text-xs truncate text-white bg-transparent focus:outline-none"
      title={event.title}
    >
      {isCompleted && <span className="mr-1">✓</span>}
      {event.title}
    </button>
  );
};

// ------------------------------------------------------------------
// Main SchedulePage
// ------------------------------------------------------------------
function SchedulePage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const queryClient = useQueryClient();

  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return [now, now];
  });
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingCustomTask, setEditingCustomTask] = useState(null);
  const [newCustomTask, setNewCustomTask] = useState({
    title: '', description: '', dueDate: '', estimatedHours: 1, priority: 'MEDIUM'
  });
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterCompleted, setFilterCompleted] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentView, setCurrentView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedTask, setDraggedTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [scheduleMode, setScheduleMode] = useState('all'); // 'all' or 'custom'

  // Drag and Drop Handlers
  const handleDragStart = useCallback((task) => {
    setDraggedTask(task);
  }, []);

  const onDropFromOutside = useCallback(({ start, end }) => {
    if (!draggedTask) return;

    const startTime = format(start, 'HH:mm:ss');
    const endTime = format(end, 'HH:mm:ss');
    const date = format(start, 'yyyy-MM-dd');

    scheduleCustomTaskMutation.mutate({
      customTaskId: draggedTask.id,
      title: draggedTask.title,
      priority: draggedTask.priority,
      date,
      startTime,
      endTime
    });

    setDraggedTask(null);
  }, [draggedTask]);

  // Queries
  const { data: events = [], isFetching: isFetchingEvents } = useQuery({
    queryKey: ['scheduledTasks', dateRange[0], dateRange[1]],
    queryFn: fetchScheduledTasks,
    enabled: !!dateRange[0] && !!dateRange[1],
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

//   const generateMutation = useMutation({
//     mutationFn: generateSchedule,
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['scheduledTasks'] });
//       toast.success('Schedule generated!');
//     },
//     onError: () => toast.error('Generation failed'),
//   });

const generateMutation = useMutation({
  mutationFn: () => generateSchedule(scheduleMode),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['scheduledTasks'] });
    toast.success(`Schedule generated (${scheduleMode === 'custom' ? 'custom only' : 'all tasks'})!`);
  },
  onError: () => toast.error('Generation failed'),
});


  const moveMutation = useMutation({
    mutationFn: moveTask,
    onMutate: async ({ taskId, date, startTime, endTime }) => {
      await queryClient.cancelQueries({ queryKey: ['scheduledTasks'] });
      const previousEvents = queryClient.getQueryData(['scheduledTasks', dateRange[0], dateRange[1]]);
      queryClient.setQueryData(['scheduledTasks', dateRange[0], dateRange[1]], (old) =>
        old.map(task => task.id === taskId ? { ...task, scheduledDate: date, startTime, endTime } : task)
      );
      return { previousEvents };
    },
    onError: (err, vars, context) => {
      queryClient.setQueryData(['scheduledTasks', dateRange[0], dateRange[1]], context.previousEvents);
      toast.error('Move failed');
    },
    onSuccess: () => toast.success('Task moved'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['scheduledTasks'] }),
  });

  const scheduleCustomTaskMutation = useMutation({
    mutationFn: async ({ customTaskId, title, priority, date, startTime, endTime }) => {
      const token = getToken();
      await axios.post(`${API_BASE_URL}/schedule/task/custom`, {
        customTaskId, title, priority, date, startTime, endTime
      }, { headers: { Authorization: `Bearer ${token}` } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledTasks'] });
      toast.success('Task scheduled successfully!');
    },
    onError: () => toast.error('Failed to schedule task'),
  });

  const completeMutation = useMutation({
    mutationFn: completeTask,
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['scheduledTasks'] });
      const previousEvents = queryClient.getQueryData(['scheduledTasks', dateRange[0], dateRange[1]]);
      queryClient.setQueryData(['scheduledTasks', dateRange[0], dateRange[1]], (old) =>
        old.map(task => task.id === taskId ? { ...task, completed: true } : task)
      );
      return { previousEvents };
    },
    onError: (err, taskId, context) => {
      queryClient.setQueryData(['scheduledTasks', dateRange[0], dateRange[1]], context.previousEvents);
      toast.error('Failed to complete');
    },
    onSuccess: () => toast.success('Completed! 🎉'),
    onSettled: () => {
          // Refresh the calendar
          queryClient.invalidateQueries({ queryKey: ['scheduledTasks'] });
          queryClient.invalidateQueries({ queryKey: ['customTasks'] });
        },
  });

  const { data: customTasks = [] } = useQuery({
    queryKey: ['customTasks'],
    queryFn: fetchCustomTasks,
    staleTime: 5 * 60 * 1000,
  });

  const createCustomMutation = useMutation({
    mutationFn: createCustomTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customTasks'] });
      queryClient.invalidateQueries({ queryKey: ['scheduledTasks'] });
      toast.success('Task added');
      setShowCustomForm(false);
      setNewCustomTask({ title: '', description: '', dueDate: '', estimatedHours: 1, priority: 'MEDIUM' });
    },
  });

  const updateCustomMutation = useMutation({
    mutationFn: updateCustomTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customTasks'] });
      queryClient.invalidateQueries({ queryKey: ['scheduledTasks'] });
      toast.success('Task updated');
      setEditingCustomTask(null);
      setShowCustomForm(false);
    },
  });

  const deleteCustomMutation = useMutation({
    mutationFn: deleteCustomTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customTasks'] });
      queryClient.invalidateQueries({ queryKey: ['scheduledTasks'] });
      toast.success('Task deleted');
    },
  });

  const handleRangeChange = useCallback((range) => {
    if (!range) return;
    if (range instanceof Date && !isNaN(range)) {
      setDateRange([range, range]);
    } else if (range && typeof range === 'object' && range.start && range.end) {
      setDateRange([range.start, range.end]);
    } else if (Array.isArray(range) && range.length === 2) {
      setDateRange([range[0], range[1]]);
    }
  }, []);

  const handleEventDrop = ({ event, start, end }) => {
    const startTime = format(start, 'HH:mm:ss');
    const endTime = format(end, 'HH:mm:ss');
    const date = format(start, 'yyyy-MM-dd');
    moveMutation.mutate({ taskId: event.id, date, startTime, endTime });
  };

  const handleEventSelect = useCallback((event) => {
      const customTask = customTasks.find(t => t.id === event.resource?.customTaskId);
      setSelectedTask({
        id: event.id,
        customTaskId: event.resource?.customTaskId,
        title: event.title,
        description: event.resource?.description || customTask?.description,
        dueDate: event.resource?.dueDate || customTask?.dueDate,
        estimatedHours: event.resource?.estimatedHours || customTask?.estimatedHours,
        priority: event.resource?.priority || customTask?.priority || 'MEDIUM',
        completed: event.resource?.completed,
        scheduledDate: format(event.start, 'yyyy-MM-dd'),
        startTime: format(event.start, 'HH:mm'),
        endTime: format(event.end, 'HH:mm'),
        isCustomTask: !!event.resource?.customTaskId,
      });
    }, [customTasks]);

  const handleComplete = (taskId) => completeMutation.mutate(taskId);

  const handleEditCustom = (task) => {
      // 👇 ADD THIS LINE: Use the customTaskId if from modal, otherwise use normal id 👇
      const actualCustomTaskId = task.customTaskId || task.id;

      // Update the setEditingCustomTask to use the correct ID
      setEditingCustomTask({ ...task, id: actualCustomTaskId });

      setNewCustomTask({
        title: task.title,
        description: task.description || '',
        dueDate: task.dueDate || '',
        estimatedHours: task.estimatedHours || 1,
        priority: task.priority || 'MEDIUM',
      });
      setShowCustomForm(true);
    };

  // 1. Opens the modal instead of window.confirm
    const handleDeleteCustom = (id, title) => {
      setTaskToDelete({ id, title });
    };

    // 2. Actually fires the mutation when the user clicks "Delete" in the modal
    const confirmDelete = () => {
      if (taskToDelete) {
        deleteCustomMutation.mutate(taskToDelete.id, {
          onSettled: () => setTaskToDelete(null) // Close modal when done
        });
      }
    };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!newCustomTask.title.trim()) return toast.error('Title required');
    createCustomMutation.mutate(newCustomTask);
  };

  const handleUpdateCustom = (e) => {
    e.preventDefault();
    if (!newCustomTask.title.trim()) return;

    const safePayload = {
      ...newCustomTask,
      dueDate: newCustomTask.dueDate ? newCustomTask.dueDate : null,
      completed: editingCustomTask.completed
    };

    updateCustomMutation.mutate({ id: editingCustomTask.id, task: safePayload });
  };

  const handleToggleCompleteCustom = async (task) => {
    // UX FIX: The button UI handles the loading state, but we ensure the mutation fires
    await updateCustomMutation.mutateAsync({ id: task.id, task: { ...task, completed: !task.completed } });
    queryClient.invalidateQueries({ queryKey: ['scheduledTasks'] });
  };

  const filteredEvents = useMemo(() => {
    return events
      .filter(task =>
        filterCompleted === 'ALL' ||
        (filterCompleted === 'PENDING' && !task.completed) ||
        (filterCompleted === 'COMPLETED' && task.completed)
      )
      .map(task => ({
        id: task.id,
        title: task.title,
        start: new Date(`${task.scheduledDate}T${task.startTime}`),
        end: new Date(`${task.scheduledDate}T${task.endTime}`),
        resource: { ...task, priority: task.priority || 'MEDIUM' },
      }));
  }, [events, filterCompleted]);

  const filteredCustomTasks = useMemo(() => {
    return filterPriority === 'ALL'
      ? customTasks
      : customTasks.filter(task => task.priority === filterPriority);
  }, [customTasks, filterPriority]);

  const bgClass = isDarkMode ? 'bg-gray-800/60' : 'bg-white/70';
  const borderClass = isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50';
  const inputClass = `w-full p-2 rounded-lg border focus:ring-2 focus:ring-purple-500 transition ${
    isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-800'
  }`;

  return (
    <div className={`rounded-2xl ${bgClass} border ${borderClass} backdrop-blur-sm p-4 sm:p-6 shadow-xl transition-all duration-300 relative`}>
      {isFetchingEvents && (
        <div className="absolute top-2 right-2 z-20">
          <Loader size={18} className="animate-spin text-purple-500" />
        </div>
      )}

      {/* Header */}
     <div className="relative w-full mb-8">
       {/* Main Container */}
       <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 rounded-3xl border border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl p-5 sm:p-6 shadow-sm">

         {/* Left Section */}
         <div className="min-w-0">
           <h2 className="text-2xl sm:text-3xl font-poppins font-bold bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent leading-tight">
             Smart Timetable
           </h2>

           <p className="mt-1 text-sm sm:text-[15px] text-gray-500 dark:text-gray-400">
             AI-powered scheduling · Drag to reschedule
           </p>
         </div>

         {/* Right Controls */}
         <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full xl:w-auto">

           {/* Generate Button */}
           <button
             onClick={() => generateMutation.mutate()}
             disabled={generateMutation.isPending}
             className="group relative flex items-center justify-center gap-2 h-12 px-5 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-teal-500 text-white font-medium shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 w-full sm:w-auto"
           >
             {generateMutation.isPending ? (
               <Loader size={18} className="animate-spin" />
             ) : (
               <RefreshCw
                 size={18}
                 className="transition-transform duration-300 group-hover:rotate-180"
               />
             )}

             <span className="whitespace-nowrap">Generate</span>
           </button>

           {/* Segmented Toggle */}
           <div className="flex items-center p-1 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-full sm:w-auto">

             <button
               onClick={() => setScheduleMode("all")}
               className={`flex-1 sm:flex-none px-4 sm:px-5 h-10 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                 scheduleMode === "all"
                   ? "bg-gradient-to-r from-purple-500 to-teal-500 text-white shadow-sm"
                   : "text-gray-700 dark:text-gray-200 hover:bg-white/70 dark:hover:bg-gray-700"
               }`}
             >
               All Tasks
             </button>

             <button
               onClick={() => setScheduleMode("custom")}
               className={`flex-1 sm:flex-none px-4 sm:px-5 h-10 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                 scheduleMode === "custom"
                   ? "bg-gradient-to-r from-purple-500 to-teal-500 text-white shadow-sm"
                   : "text-gray-700 dark:text-gray-200 hover:bg-white/70 dark:hover:bg-gray-700"
               }`}
             >
               Custom Tasks
             </button>
           </div>

           {/* Add Task Button */}
           <button
             onClick={() => {
               setShowCustomForm(!showCustomForm);
               if (showCustomForm) setEditingCustomTask(null);
             }}
             className="flex items-center justify-center gap-2 h-12 px-5 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 hover:shadow-md active:scale-[0.98] transition-all duration-200 w-full sm:w-auto"
             title="Add Task"
           >
             <Plus size={18} />
             <span className="whitespace-nowrap">Add Task</span>
           </button>
         </div>
       </div>
     </div>
      {/* Filters & Navigation */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
            {['ALL', 'PENDING', 'COMPLETED'].map(status => (
              <button
                key={status}
                onClick={() => setFilterCompleted(status)}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  filterCompleted === status ? 'bg-purple-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {status === 'ALL' ? 'All' : status === 'PENDING' ? 'Pending' : 'Completed'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
            {['agenda', 'day', 'week', 'month'].map(view => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  currentView === view ? 'bg-purple-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(d => subDays(d, 1))} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronLeft size={18} /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm rounded-full bg-purple-100 dark:bg-purple-900/40">Today</button>
          <button onClick={() => setCurrentDate(d => addDays(d, 1))} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronRight size={18} /></button>
        </div>
      </div>

      {/* Custom Task Form */}
      {showCustomForm && (
        <div className="mb-6 p-5 rounded-xl bg-gray-100/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-inner animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">{editingCustomTask ? 'Edit Task' : 'Add Custom Task'}</h3>
            <button onClick={() => { setShowCustomForm(false); setEditingCustomTask(null); }} className="p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"><X size={16} /></button>
          </div>
          <form onSubmit={editingCustomTask ? handleUpdateCustom : handleAddCustom} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" placeholder="Task title *" value={newCustomTask.title} onChange={(e) => setNewCustomTask(prev => ({ ...prev, title: e.target.value }))} className={inputClass} required />
            <input type="text" placeholder="Description (optional)" value={newCustomTask.description} onChange={(e) => setNewCustomTask(prev => ({ ...prev, description: e.target.value }))} className={inputClass} />
            <input type="date" value={newCustomTask.dueDate} onChange={(e) => setNewCustomTask(prev => ({ ...prev, dueDate: e.target.value }))} className={inputClass} />
            <input type="number" step="0.5" min="0.5" max="24" value={newCustomTask.estimatedHours} onChange={(e) => setNewCustomTask(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) }))} className={inputClass} />
            <select value={newCustomTask.priority} onChange={(e) => setNewCustomTask(prev => ({ ...prev, priority: e.target.value }))} className={inputClass}>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <div className="flex justify-end gap-2 md:col-span-2">
                          <button
                            type="button"
                            onClick={() => { setShowCustomForm(false); setEditingCustomTask(null); }}
                            className="px-4 py-2 rounded-full bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 transition"
                          >
                            Cancel
                          </button>

                          {/* 👇 UPGRADED SMART BUTTON 👇 */}
                          <button
                            type="submit"
                            disabled={createCustomMutation.isPending || updateCustomMutation.isPending}
                            className="flex items-center gap-2 px-5 py-2 rounded-full bg-purple-500 text-white hover:bg-purple-600 transition disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
                          >
                            {(createCustomMutation.isPending || updateCustomMutation.isPending) ? (
                              <Loader size={16} className="animate-spin" />
                            ) : (
                              editingCustomTask ? <Edit2 size={16} /> : <Plus size={16} />
                            )}

                            {createCustomMutation.isPending ? 'Adding...' :
                             updateCustomMutation.isPending ? 'Updating...' :
                             editingCustomTask ? 'Update Task' : 'Add Task'}
                          </button>
                        </div>
          </form>
        </div>
      )}

      {/* Calendar */}
      <div className="h-[550px] md:h-[600px] mb-6 rounded-xl overflow-hidden shadow-inner custom-calendar relative">
        {filteredEvents.length === 0 && !isFetchingEvents && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 z-10 pointer-events-none">
            <CalendarOff size={48} className="text-gray-400 mb-2" />
            <p className="text-gray-500 text-lg font-medium">No scheduled tasks</p>
            <p className="text-gray-400 text-sm">Generate a schedule or add a custom task</p>
          </div>
        )}
        <DnDCalendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onRangeChange={handleRangeChange}
          onSelectEvent={handleEventSelect}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventDrop}
          onDropFromOutside={onDropFromOutside}
          dragFromOutsideItem={draggedTask ? () => ({ title: draggedTask.title, resource: draggedTask }) : null}
          resizable
          draggableAccessor={() => true}
          popup
          views={['month', 'week', 'day', 'agenda']}
          view={currentView}
          onView={setCurrentView}
          date={currentDate}
          onNavigate={setCurrentDate}
          culture="en-US"
          step={60}
          timeslots={1}
          maxEvents={3}
          dayLayoutAlgorithm={'no-overlap'}
          components={{
            month: {
              event: (props) => <MonthEvent {...props} onSelectEvent={handleEventSelect} />
            },
            agenda: {
              event: (props) => {
                const priority = props.event.resource?.priority;
                const isCompleted = props.event.resource?.completed;

                // UX FIX: Distinct Slate/Gray dot for Low Priority
                let dotColor = isDarkMode ? '#6366f1' : '#a855f7'; // Default Medium
                if (isCompleted) dotColor = '#22c55e'; // Green
                else if (priority === 'HIGH') dotColor = '#ef4444'; // Red
                else if (priority === 'LOW') dotColor = '#64748b'; // Slate/Gray

                return (
                  <div className="flex items-center gap-2">
                    <div style={{ backgroundColor: dotColor }} className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"></div>
                    <span className="font-medium">{props.event.title}</span>
                  </div>
                );
              }
            }
          }}
          eventPropGetter={(event) => {
            // UX FIX: Distinct Slate/Gray color for Low Priority blocks
            let bgColor = isDarkMode ? '#6366f1' : '#a855f7'; // Default Medium

            if (event.resource?.completed) {
              bgColor = '#22c55e'; // Green for completed
            } else if (event.resource?.priority === 'HIGH') {
              bgColor = isDarkMode ? '#ef4444' : '#ef4444'; // Red for High
            } else if (event.resource?.priority === 'LOW') {
              bgColor = isDarkMode ? '#475569' : '#64748b'; // Slate/Gray for Low
            }

            return {
                          style: {
                            backgroundColor: bgColor,
                            borderRadius: '6px',
                            color: '#ffffff',
                            opacity: event.resource?.completed ? 0.6 : 0.95,
                            fontSize: '0.75rem',
                            padding: '4px 6px', // Clean, uniform padding
                            fontWeight: 500,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            // 👇 UX FIX: Remove the blurry shadow and weird border 👇
                            border: 'none',
                            boxShadow: 'none'
              },
            };
          }}
          dayPropGetter={(date) => ({
                      className: isToday(date) ? 'rbc-today-highlight' : '',
                    })}
        />
      </div>

      {/* Custom Tasks List */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <h3 className="font-poppins font-semibold text-lg">📋 Your Custom Tasks</h3>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="text-sm p-1 rounded border dark:bg-gray-700 dark:border-gray-600">
              <option value="ALL">All</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
          {filteredCustomTasks.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400 italic">No custom tasks yet.</div>
          ) : (
            filteredCustomTasks.map(task => {
              const priorityConfig = getPriorityConfig(task.priority);
              const PriorityIcon = priorityConfig.icon;
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
              return (
                <div key={task.id}
                 draggable={!task.completed}
                 onDragStart={() => handleDragStart(task)}
                 className={`cursor-grab active:cursor-grabbing flex flex-wrap justify-between items-center p-3 rounded-xl transition-all ${
                  task.completed ? 'bg-gray-100/50 dark:bg-gray-800/30' : 'bg-gray-100 dark:bg-gray-800/50 hover:shadow-md'
                } border border-gray-200 dark:border-gray-700`}
                >
                  <div className="flex-1 flex items-center gap-3 flex-wrap">
                    {/* UX FIX: Button disables to prevent double-clicks while syncing */}
                    <button
                      onClick={() => handleToggleCompleteCustom(task)}
                      disabled={updateCustomMutation.isPending}
                      className={`focus:outline-none transition-opacity ${updateCustomMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {task.completed ? <CheckCircle size={20} className="text-green-500" /> : <Circle size={20} className="text-gray-400 hover:text-gray-500" />}
                    </button>
                    <div>
                      <div className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.title}</div>
                      {task.description && <div className="text-xs text-gray-500 mt-0.5">{task.description}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 sm:mt-0">
                    {task.dueDate && <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}><CalendarIcon size={12} /> {task.dueDate} {isOverdue && <AlertCircle size={12} className="text-red-500" />}</span>}
                    {task.estimatedHours && <span className="text-xs flex items-center gap-1 text-gray-500"><Clock size={12} /> {task.estimatedHours}h</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${priorityConfig.color}`}><PriorityIcon size={10} /> {priorityConfig.label}</span>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditCustom(task)} className="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600" title="Edit"><Edit2 size={14} className="text-blue-500" /></button>
                      <button onClick={() => handleDeleteCustom(task.id, task.title)} className="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600" title="Delete"><Trash2 size={14} className="text-red-500" /></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onComplete={handleComplete}
        onEdit={handleEditCustom}
        onDelete={handleDeleteCustom}
        isCustomTask={selectedTask?.isCustomTask}
      />

      <ConfirmModal
              isOpen={!!taskToDelete}
              onClose={() => setTaskToDelete(null)}
              onConfirm={confirmDelete}
              title="Delete Task"
              message={`Are you sure you want to delete "${taskToDelete?.title}"? This cannot be undone.`}
              isLoading={deleteCustomMutation.isPending}
            />

      {/* Global Calendar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: ${isDarkMode ? '#374151' : '#E5E7EB'}; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#8B5CF6' : '#C084FC'}; border-radius: 10px; }

        .custom-calendar {
          background: ${isDarkMode ? 'rgba(31, 41, 55, 0.4)' : 'rgba(255, 255, 255, 0.4)'};
          border-radius: 1rem;
        }

        .rbc-toolbar {
          padding: 8px 12px;
          background: ${isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 0.6)'};
          border-radius: 1rem 1rem 0 0;
          backdrop-filter: blur(8px);
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 4px;
        }
        .rbc-toolbar button {
          background: ${isDarkMode ? '#374151' : '#E5E7EB'} !important;
          color: ${isDarkMode ? '#E5E7EB' : '#1F2937'} !important;
          border: none !important;
          border-radius: 9999px !important;
          padding: 4px 12px !important;
          font-size: 0.8rem;
          font-weight: 500;
          transition: all 0.2s;
        }
        .rbc-toolbar button:hover { background: ${isDarkMode ? '#4B5563' : '#D1D5DB'} !important; }
        .rbc-toolbar button.rbc-active {
          background: linear-gradient(135deg, #B399D4, #5CC8C2) !important;
          color: white !important;
        }

        .rbc-month-view, .rbc-week-view, .rbc-day-view {
          background: ${isDarkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.6)'};
          backdrop-filter: blur(4px);
          border-radius: 0.75rem;
          overflow: hidden;
          border: none;
        }

        .rbc-header {
          padding: 8px 4px;
          font-weight: 600;
          background: ${isDarkMode ? '#1F2937' : '#F9FAFB'};
          border-bottom: 1px solid ${isDarkMode ? '#374151' : '#E5E7EB'};
          color: ${isDarkMode ? '#E5E7EB' : '#4B5563'};
        }

        .rbc-time-gutter .rbc-timeslot-group {
          color: ${isDarkMode ? '#9CA3AF' : '#6B7280'};
          font-size: 0.75rem;
        }

        .rbc-off-range-bg {
          background: ${isDarkMode ? 'rgba(55, 65, 81, 0.2)' : 'rgba(243, 244, 246, 0.4)'} !important;
        }
        .rbc-off-range {
          color: ${isDarkMode ? '#6B7280' : '#9CA3AF'} !important;
        }

        .rbc-day-bg:hover {
          background: ${isDarkMode ? 'rgba(99,102,241,0.05)' : 'rgba(168,85,247,0.05)'} !important;
        }

        .rbc-today-highlight {
          background: ${isDarkMode ? 'rgba(99,102,241,0.15)' : 'rgba(168,85,247,0.1)'} !important;
//           box-shadow: inset 0 0 0 2px ${isDarkMode ? '#818CF8' : '#A855F7'};
        }

        /* "+X more" link */
        .rbc-show-more {
          color: ${isDarkMode ? '#A78BFA' : '#7C3AED'} !important;
          font-weight: 600;
          font-size: 0.75rem;
          padding: 2px 6px;
          border-radius: 4px;
          background: ${isDarkMode ? 'rgba(167,139,250,0.1)' : 'rgba(124,58,237,0.1)'};
          display: inline-block;
          margin-top: 2px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .rbc-show-more:hover {
          background: ${isDarkMode ? 'rgba(167,139,250,0.2)' : 'rgba(124,58,237,0.2)'};
        }

        /* +More popup */
        .rbc-overlay {
          background: ${isDarkMode ? '#1F2937' : '#FFFFFF'} !important;
          border-radius: 0.75rem !important;
          border: 1px solid ${isDarkMode ? '#374151' : '#E5E7EB'} !important;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
          z-index: 50 !important;
          max-height: 300px;
          padding: 0.5rem 0;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }

        /* Sleek vertical scrollbar */
        .rbc-overlay::-webkit-scrollbar { width: 6px; }
        .rbc-overlay::-webkit-scrollbar-track { background: transparent; }
        .rbc-overlay::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#4B5563' : '#D1D5DB'};
          border-radius: 10px;
        }
        .rbc-overlay::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? '#6B7280' : '#9CA3AF'};
        }

        .rbc-overlay-header {
          font-weight: 600;
          padding: 0.5rem 1rem;
          border-bottom: 1px solid ${isDarkMode ? '#374151' : '#E5E7EB'};
          margin-bottom: 0.25rem;
          color: ${isDarkMode ? '#E5E7EB' : '#1F2937'};
        }

        .rbc-overlay .rbc-event {
          margin: 4px 12px;
          padding: 6px 10px;
          font-size: 0.75rem;
          border-radius: 6px;
          color: white;
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rbc-agenda-table {
          background: ${isDarkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.6)'};
          border-radius: 0.75rem;
        }
        .rbc-agenda-table th, .rbc-agenda-table td {
          border-color: ${isDarkMode ? '#374151' : '#E5E7EB'};
          color: ${isDarkMode ? '#E5E7EB' : '#1F2937'};
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in { animation: fadeIn 0.2s ease-out; }

        .rbc-event {
          border-radius: 6px !important;
          transition: all 0.2s ease;
          cursor: pointer;
          margin: 1px 0;
          z-index: 10;
        }

        /* UX FIX: Only apply the expanding hover effect to the Day/Week time grids, NOT Month */
        .rbc-time-view .rbc-event:hover {
          transform: scale(1.02);
          filter: brightness(1.1);
          z-index: 50 !important;
          min-width: fit-content;
          padding-right: 12px !important;
        }

        /* Modernize the Agenda View Table */
        .rbc-agenda-view {
          background: ${isDarkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.6)'} !important;
          border-radius: 0.75rem;
          border: none !important;
        }
        .rbc-agenda-table {
          border-collapse: separate;
          border-spacing: 0;
        }
        .rbc-agenda-table th {
          background: ${isDarkMode ? '#374151' : '#F3F4F6'};
          color: ${isDarkMode ? '#E5E7EB' : '#4B5563'};
          padding: 10px;
          text-align: left;
          font-weight: 600;
        }
        .rbc-agenda-table td {
          padding: 8px 10px;
          border-bottom: 1px solid ${isDarkMode ? '#374151' : '#E5E7EB'} !important;
          color: ${isDarkMode ? '#D1D5DB' : '#1F2937'};
        }
        .rbc-agenda-time-cell {
          white-space: nowrap;
          font-size: 0.85rem;
          color: ${isDarkMode ? '#9CA3AF' : '#6B7280'};
        }

        /* Fix for +X more popup going off-screen on mobile */
        @media (max-width: 768px) {
          .rbc-overlay {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 90vw !important;
            max-width: 350px !important;
            max-height: 60vh !important;
            z-index: 9999 !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5) !important;
          }
        }

        /* Remove the solid inline background colors from the table rows */
        .rbc-agenda-view .rbc-agenda-table tbody > tr {
          background-color: transparent !important;
        }

        /* Ensure the text has perfect contrast against the clean background */
        .rbc-agenda-view .rbc-agenda-table td {
          color: ${isDarkMode ? '#E5E7EB' : '#1F2937'} !important;
        }

        /* Add a subtle hover effect to the rows instead */
        .rbc-agenda-view .rbc-agenda-table tbody > tr:hover {
          background-color: ${isDarkMode ? 'rgba(99,102,241,0.05)' : 'rgba(168,85,247,0.05)'} !important;
        }

        /* --------------------------------------------------- */
        /* PREMIUM SCROLLBARS FOR ENTIRE APP & CALENDAR        */
        /* --------------------------------------------------- */
        .custom-scrollbar::-webkit-scrollbar,
        .custom-calendar *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track,
        .custom-calendar *::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb,
        .custom-calendar *::-webkit-scrollbar-thumb {
          background-color: ${isDarkMode ? 'rgba(107, 114, 128, 0.5)' : 'rgba(156, 163, 175, 0.5)'};
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: padding-box;
          transition: background-color 0.2s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover,
        .custom-calendar *::-webkit-scrollbar-thumb:hover {
          background-color: ${isDarkMode ? 'rgba(139, 92, 246, 0.8)' : 'rgba(168, 85, 247, 0.8)'};
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        /* --------------------------------------------------- */
        /* DRAG AND DROP VISUAL EFFECTS                        */
        /* --------------------------------------------------- */
        .rbc-event { cursor: grab !important; }
        .rbc-event:active { cursor: grabbing !important; }
        .rbc-addons-dnd-over {
          background-color: ${isDarkMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)'} !important;
        }
        .rbc-addons-dnd-drag-preview .rbc-event {
          opacity: 0.6 !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3) !important;
          transform: scale(1.02);
        }
        .rbc-addons-dnd-resize-ns-anchor .rbc-addons-dnd-resize-ns-icon {
          border-top-color: rgba(255, 255, 255, 0.8) !important;
          border-bottom-color: rgba(255, 255, 255, 0.8) !important;
        }
    /* =================================================== */
            /* FINAL RESPONSIVE & UI ALIGNMENT FIXES               */
            /* =================================================== */

            /* 1. Fix Agenda table without squishing the text */
            .rbc-agenda-table {
              width: 100% !important;
              table-layout: auto !important; /* FIX: Let the table columns size naturally! */
            }

            /* Ensure Date and Time columns don't overlap the Event column */
            .rbc-agenda-date-cell,
            .rbc-agenda-time-cell {
              white-space: nowrap !important;
              padding-right: 24px !important; /* Add breathing room between columns */
              width: 1% !important; /* Forces column to be only as wide as its text */
            }

            /* 2. Fix the Week/Day grid misalignment (Scrollbar Math Fix) */
            .rbc-time-header.rbc-overflowing {
              /* This MUST match our custom scrollbar width (8px) */
              margin-right: 8px !important;
              border-right: none !important;
            }

            /* 3. Fix the squished Week View on Mobile Phones */
            @media (max-width: 768px) {
              .rbc-time-view {
                overflow-x: auto !important; /* Allow horizontal swiping */
                /* Hide vertical scrollbar on the wrapper to keep it clean */
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
              .rbc-time-view::-webkit-scrollbar {
                display: none;
              }

              /* Force columns to stay wide enough to read perfectly */
              .rbc-time-header, .rbc-time-content {
                min-width: 500px !important;
              }

              /* Make header text slightly smaller for mobile */
              .rbc-header {
                font-size: 0.7rem !important;
                padding: 4px 2px !important;
              }
            }
      `}</style>
    </div>
  );
}

export default SchedulePage;