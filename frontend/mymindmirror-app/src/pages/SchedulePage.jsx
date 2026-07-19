// src/pages/SchedulePage.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { format, parse, startOfWeek, getDay, addDays, subDays, isToday, startOfMonth, endOfMonth } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import {
  Loader, Plus, RefreshCw, Trash2, Edit2, CheckCircle, Circle,
  AlertCircle, Clock, Calendar as CalendarIcon, X, Filter, ListChecks,
  ArrowUp, ArrowDown, BarChart3, ChevronLeft, ChevronRight, CalendarOff, AlertTriangle,
  Coffee, Utensils, Activity, Briefcase, Zap
} from 'lucide-react';

import {
  useScheduledTasks, useCustomTasks, useGenerateSchedule,
  useMoveScheduledTask, useCompleteScheduledTask, useScheduleCustomTask,
  useCreateCustomTask, useUpdateCustomTask, useDeleteCustomTask,
  useReoptimizeSchedule
} from '../hooks/useScheduleData';

const DnDCalendar = withDragAndDrop(Calendar);
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const getPriorityConfig = (priority) => {
  switch (priority) {
    case 'HIGH': return { color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800/30', icon: ArrowUp, label: 'High' };
    case 'MEDIUM': return { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/30', icon: BarChart3, label: 'Medium' };
    default: return { color: 'bg-slate-100 text-slate-800 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200 dark:border-slate-700/50', icon: ArrowDown, label: 'Low' };
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
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !task || !mounted) return null;

  const priorityConfig = getPriorityConfig(task.priority || 'MEDIUM');
  const PriorityIcon = priorityConfig.icon;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
  const bgClass = theme === 'dark' ? 'bg-[#1A162F]/95 backdrop-blur-xl' : 'bg-white/95 backdrop-blur-xl';
  const borderClass = theme === 'dark' ? 'border-white/10' : 'border-gray-200';

  const getBlockTypeLabel = (type) => {
    switch(type) {
        case 'MEAL': return { icon: Utensils, label: 'Meal Time', color: 'text-orange-500' };
        case 'BREAK': return { icon: Coffee, label: 'Break', color: 'text-emerald-500' };
        case 'ROUTINE': return { icon: Activity, label: 'Routine/Habit', color: 'text-teal-500' };
        default: return { icon: Briefcase, label: 'Work Task', color: 'text-purple-500 dark:text-teal-400' };
    }
  };
  const blockInfo = getBlockTypeLabel(task.blockType);
  const BlockIcon = blockInfo.icon;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className={`relative max-w-md w-full rounded-2xl lg:rounded-3xl ${bgClass} border ${borderClass} shadow-2xl overflow-hidden transform transition-all duration-300 scale-100 animate-in fade-in zoom-in`}>
        <div className="flex justify-between items-center p-5 lg:p-6 border-b border-gray-200/50 dark:border-white/5 bg-white/30 dark:bg-black/10">
          <h3 className="text-lg lg:text-xl font-poppins font-extrabold bg-gradient-to-r from-purple-600 to-teal-600 dark:from-purple-400 dark:to-teal-400 bg-clip-text text-transparent">Schedule Details</h3>
          <button onClick={onClose} className="p-1.5 lg:p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition text-gray-500 dark:text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 lg:p-6 space-y-5">
          <div>
            <div className="flex justify-between items-start gap-3">
              <h4 className="text-lg lg:text-xl font-bold text-gray-800 dark:text-gray-100 flex items-start gap-2.5 leading-tight">
                 <BlockIcon className={`w-5 h-5 lg:w-6 lg:h-6 shrink-0 mt-0.5 ${blockInfo.color}`} />
                 {task.title}
              </h4>
              {task.completed && <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />}
            </div>
            {task.description && <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">{task.description}</p>}
          </div>

          <div className="flex flex-wrap gap-2 lg:gap-3 text-xs lg:text-sm font-medium">
            {task.dueDate && (
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-200/50 dark:border-white/5 ${isOverdue ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                <CalendarIcon className="w-4 h-4" /> Due: {format(new Date(task.dueDate), 'MMM dd')}
              </span>
            )}
            {task.estimatedHours && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-black/20 border border-gray-200/50 dark:border-white/5 text-gray-600 dark:text-gray-300">
                <Clock className="w-4 h-4" /> {task.estimatedHours}h est.
              </span>
            )}
            {task.blockType === 'WORK_TASK' && (
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${priorityConfig.color}`}>
                  <PriorityIcon className="w-3.5 h-3.5" /> {priorityConfig.label} Priority
                </span>
            )}
          </div>

          {task.scheduledDate && (
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-teal-900/10 border border-purple-100 dark:border-teal-500/20 text-sm lg:text-base text-gray-800 dark:text-gray-200">
              <span className="font-bold text-purple-700 dark:text-teal-400 flex items-center gap-2 mb-1">
                <CalendarIcon className="w-4 h-4" /> Scheduled For
              </span>
              <div className="pl-6 font-medium">
                  {format(new Date(task.scheduledDate), 'EEEE, MMMM dd')}
                  {task.startTime && <span className="opacity-80 ml-2">• {task.startTime} – {task.endTime}</span>}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-3 p-5 lg:p-6 border-t border-gray-200/50 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
          {!task.completed && (
            <button onClick={() => { onComplete(task.id); onClose(); }} className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition shadow-md">Mark Complete</button>
          )}
          {isCustomTask && (
             <>
               <button onClick={() => { onEdit(task); onClose(); }} className="px-5 py-2.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-bold transition shadow-md">Edit</button>
               <button onClick={() => { onDelete(task.customTaskId || task.id, task.title); onClose(); }} className="px-5 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold transition shadow-md">Delete</button>
             </>
          )}
          <button onClick={onClose} className="px-5 py-2.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-white/20 font-bold transition">Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ------------------------------------------------------------------
// Custom Confirm Modal
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

  const bgClass = theme === 'dark' ? 'bg-[#1A162F]/95 backdrop-blur-xl' : 'bg-white/95 backdrop-blur-xl';
  const borderClass = theme === 'dark' ? 'border-white/10' : 'border-gray-200';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="absolute inset-0" onClick={!isLoading ? onClose : undefined} aria-hidden="true" />
      <div className={`relative max-w-sm w-full rounded-2xl lg:rounded-3xl ${bgClass} border ${borderClass} shadow-2xl p-6 lg:p-8 transform transition-all duration-300 animate-in fade-in zoom-in`}>
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 lg:mb-6">
            <AlertTriangle className="text-red-600 dark:text-red-400 w-7 h-7 lg:w-8 lg:h-8" />
          </div>
          <h3 className="text-xl lg:text-2xl font-poppins font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2">{title}</h3>
          <p className="text-sm lg:text-base font-medium text-gray-500 dark:text-gray-400 mb-6 lg:mb-8">{message}</p>
          <div className="flex w-full gap-3">
            <button onClick={onClose} disabled={isLoading} className="flex-1 py-2.5 lg:py-3 rounded-full bg-gray-100 dark:bg-black/20 text-gray-700 dark:text-gray-300 font-bold border border-transparent dark:border-white/10 hover:bg-gray-200 dark:hover:bg-black/40 transition disabled:opacity-50">Cancel</button>
            <button onClick={onConfirm} disabled={isLoading} className="flex-1 py-2.5 lg:py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold transition flex items-center justify-center gap-2 disabled:opacity-70 shadow-md">
              {isLoading ? <Loader className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" /> : <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />}
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
  const blockType = event.resource?.blockType;

  const handleClick = (e) => {
    e.stopPropagation();
    onSelectEvent(event);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full h-full text-left text-xs lg:text-sm font-medium truncate text-white bg-transparent focus:outline-none flex items-center gap-1.5 px-1"
      title={event.title}
    >
      {isCompleted ? <span className="font-bold text-white/90">✓</span> : (
          blockType === 'MEAL' ? <Utensils className="w-3 h-3 lg:w-3.5 lg:h-3.5 shrink-0 opacity-80" /> :
          blockType === 'BREAK' ? <Coffee className="w-3 h-3 lg:w-3.5 lg:h-3.5 shrink-0 opacity-80" /> :
          blockType === 'ROUTINE' ? <Activity className="w-3 h-3 lg:w-3.5 lg:h-3.5 shrink-0 opacity-80" /> : null
      )}
      <span className="truncate">{event.title}</span>
    </button>
  );
};

// ------------------------------------------------------------------
// Main SchedulePage
// ------------------------------------------------------------------
function SchedulePage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [currentView, setCurrentView] = useState('month');
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return [startOfMonth(now), endOfMonth(now)];
  });

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingCustomTask, setEditingCustomTask] = useState(null);
  const [newCustomTask, setNewCustomTask] = useState({
    title: '', description: '', dueDate: '', estimatedHours: 1, priority: 'MEDIUM'
  });
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterCompleted, setFilterCompleted] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedTask, setDraggedTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [scheduleMode, setScheduleMode] = useState('all');

  const customFormRef = useRef(null);

  const { data: events = [], isFetching: isFetchingEvents } = useScheduledTasks(dateRange[0], dateRange[1]);
  const { data: customTasks = [] } = useCustomTasks();

  const generateMutation = useGenerateSchedule();
  const reoptimizeMutation = useReoptimizeSchedule();
  const moveMutation = useMoveScheduledTask(dateRange);
  const completeMutation = useCompleteScheduledTask(dateRange);
  const scheduleCustomTaskMutation = useScheduleCustomTask();
  const createCustomMutation = useCreateCustomTask();
  const updateCustomMutation = useUpdateCustomTask();
  const deleteCustomMutation = useDeleteCustomTask();

  const handleDragStart = useCallback((task) => setDraggedTask(task), []);

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
  }, [draggedTask, scheduleCustomTaskMutation]);

  const handleRangeChange = useCallback((range) => {
    if (!range) return;
    if (range instanceof Date && !isNaN(range)) setDateRange([range, range]);
    else if (range && typeof range === 'object' && range.start && range.end) setDateRange([range.start, range.end]);
    else if (Array.isArray(range) && range.length === 2) setDateRange([range[0], range[1]]);
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
        blockType: event.resource?.blockType
      });
    }, [customTasks]);

  const handleComplete = (taskId) => completeMutation.mutate(taskId);

  const handleEditCustom = (task) => {
      const actualCustomTaskId = task.customTaskId || task.id;
      setEditingCustomTask({ ...task, id: actualCustomTaskId });
      setNewCustomTask({
        title: task.title,
        description: task.description || '',
        dueDate: task.dueDate || '',
        estimatedHours: task.estimatedHours || 1,
        priority: task.priority || 'MEDIUM',
      });
      setShowCustomForm(true);

      setTimeout(() => {
          customFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    };

  const handleDeleteCustom = (id, title) => setTaskToDelete({ id, title });

  const confirmDelete = () => {
      if (taskToDelete) {
        deleteCustomMutation.mutate(taskToDelete.id, {
          onSettled: () => setTaskToDelete(null)
        });
      }
    };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!newCustomTask.title.trim()) return toast.error('Title required');
    createCustomMutation.mutate(newCustomTask, {
        onSuccess: () => {
            setShowCustomForm(false);
            setNewCustomTask({ title: '', description: '', dueDate: '', estimatedHours: 1, priority: 'MEDIUM' });
        }
    });
  };

  const handleUpdateCustom = (e) => {
    e.preventDefault();
    if (!newCustomTask.title.trim()) return;
    const safePayload = {
      ...newCustomTask,
      dueDate: newCustomTask.dueDate ? newCustomTask.dueDate : null,
      completed: editingCustomTask.completed
    };
    updateCustomMutation.mutate({ id: editingCustomTask.id, task: safePayload }, {
        onSuccess: () => {
            setEditingCustomTask(null);
            setShowCustomForm(false);
        }
    });
  };

  const handleToggleCompleteCustom = async (task) => {
    await updateCustomMutation.mutateAsync({ id: task.id, task: { ...task, completed: !task.completed } });
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

  const bgClass = isDarkMode ? 'bg-[#1A162F]/60 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl';
  const borderClass = isDarkMode ? 'border-white/10' : 'border-gray-200/50';
  const inputClass = `w-full p-3 lg:p-4 rounded-xl border focus:outline-none focus:ring-1 transition-all text-sm lg:text-base ${
    isDarkMode
        ? 'bg-[#131127]/80 border-white/10 focus:border-teal-400 focus:ring-teal-400 text-gray-100 placeholder-gray-500'
        : 'bg-white border-gray-300 focus:border-purple-500 focus:ring-purple-500 text-gray-800 placeholder-gray-400'
  }`;

  const pillActiveClass = 'bg-gradient-to-r from-purple-500 to-teal-500 text-white font-bold border border-transparent shadow-sm';
  const pillInactiveClass = isDarkMode ? 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-gray-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-800';

  return (
    <div className={`rounded-2xl lg:rounded-3xl ${bgClass} border ${borderClass} p-4 sm:p-6 lg:p-8 shadow-xl transition-all duration-300 relative w-full`}>
      {isFetchingEvents && (
        <div className="absolute top-6 right-6 lg:top-8 lg:right-8 z-20 bg-white/80 dark:bg-black/50 p-2 rounded-full backdrop-blur-md shadow-sm">
          <Loader className="w-5 h-5 lg:w-6 lg:h-6 animate-spin text-purple-500 dark:text-teal-400" />
        </div>
      )}

      {/* Header */}
     <div className="relative w-full mb-6 lg:mb-8">
       <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 rounded-2xl lg:rounded-3xl border border-gray-200/60 dark:border-white/5 bg-white/50 dark:bg-black/10 p-5 sm:p-6 lg:p-8 shadow-sm">
         <div className="min-w-0">
           <h2 className="text-2xl sm:text-3xl lg:text-4xl font-poppins font-extrabold bg-gradient-to-r from-purple-500 to-teal-500 dark:from-purple-400 dark:to-teal-400 bg-clip-text text-transparent leading-tight tracking-tight">
             Smart Timetable
           </h2>
           <p className="mt-1.5 text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">
             AI-powered scheduling · Drag to reschedule
           </p>
         </div>

         <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 lg:gap-4 w-full xl:w-auto">
           <button
             onClick={() => generateMutation.mutate(scheduleMode)}
             disabled={generateMutation.isPending}
             className="group relative flex items-center justify-center gap-2 h-12 lg:h-14 px-6 lg:px-8 rounded-xl lg:rounded-2xl bg-gradient-to-r from-purple-500 to-teal-500 text-white font-bold text-sm lg:text-base shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0 w-full sm:w-auto"
           >
             {generateMutation.isPending ? <Loader className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5 transition-transform duration-300 group-hover:rotate-180" />}
             <span className="whitespace-nowrap">Generate</span>
           </button>

           <button
                onClick={() => reoptimizeMutation.mutate()}
                disabled={reoptimizeMutation.isPending || generateMutation.isPending}
                className="group relative flex items-center justify-center gap-2 h-12 lg:h-14 px-6 lg:px-8 rounded-xl lg:rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm lg:text-base shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0 w-full sm:w-auto"
                title="Salvage the rest of today"
            >
                {reoptimizeMutation.isPending ? <Loader className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 text-white drop-shadow-sm" />}
                <span className="whitespace-nowrap">Re-optimise Today</span>
            </button>

           <div className="flex items-center p-1.5 lg:p-2 rounded-xl lg:rounded-2xl bg-white/80 dark:bg-black/20 border border-gray-200/80 dark:border-white/5 w-full sm:w-auto">
             <button
               onClick={() => setScheduleMode("all")}
               className={`flex-1 sm:flex-none px-4 lg:px-5 py-2 lg:py-2.5 rounded-lg lg:rounded-xl text-xs lg:text-sm font-bold transition-all duration-200 whitespace-nowrap ${scheduleMode === "all" ? pillActiveClass : pillInactiveClass.replace('bg-white', 'bg-transparent').replace('border', 'border-transparent')}`}
             >All Tasks</button>
             <button
               onClick={() => setScheduleMode("custom")}
               className={`flex-1 sm:flex-none px-4 lg:px-5 py-2 lg:py-2.5 rounded-lg lg:rounded-xl text-xs lg:text-sm font-bold transition-all duration-200 whitespace-nowrap ${scheduleMode === "custom" ? pillActiveClass : pillInactiveClass.replace('bg-white', 'bg-transparent').replace('border', 'border-transparent')}`}
             >Custom Tasks</button>
           </div>

           <button
             onClick={() => {
                setShowCustomForm(!showCustomForm);
                if (!showCustomForm) {
                    setEditingCustomTask(null);
                    setTimeout(() => customFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                }
             }}
             className="flex items-center justify-center gap-2 h-12 lg:h-14 px-6 lg:px-8 rounded-xl lg:rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 font-bold text-sm lg:text-base hover:shadow-md active:scale-95 transition-all duration-200 w-full sm:w-auto"
           >
             <Plus className="w-5 h-5" /> <span className="whitespace-nowrap">Add Task</span>
           </button>
         </div>
       </div>
     </div>

      {/* 💡 FIX: Filters & Navigation - Refactored for Mobile Swiping */}
      <div className="flex flex-col gap-4 mb-6 lg:mb-8">

        {/* Navigation Row */}
        <div className="flex items-center justify-between gap-2 lg:gap-3 w-full">
          <div className="flex items-center gap-1.5 lg:gap-2 overflow-x-auto scrollbar-hide pb-1">
            {['agenda', 'day', 'week', 'month'].map(view => (
              <button key={view} onClick={() => setCurrentView(view)} className={`px-4 py-2 rounded-full text-xs lg:text-sm transition-all whitespace-nowrap ${currentView === view ? pillActiveClass : pillInactiveClass}`}>
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setCurrentDate(d => subDays(d, 1))} className={`p-2 lg:p-2.5 rounded-full transition-all ${pillInactiveClass}`}><ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5" /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 sm:px-5 py-2 lg:py-2.5 text-xs lg:text-sm font-bold uppercase tracking-wider rounded-full bg-purple-100 dark:bg-teal-900/30 text-purple-700 dark:text-teal-400 border border-purple-200 dark:border-teal-500/20 hover:bg-purple-200 dark:hover:bg-teal-900/50 transition-colors">Today</button>
            <button onClick={() => setCurrentDate(d => addDays(d, 1))} className={`p-2 lg:p-2.5 rounded-full transition-all ${pillInactiveClass}`}><ChevronRight className="w-4 h-4 lg:w-5 lg:h-5" /></button>
          </div>
        </div>

        {/* Status Filters Row */}
        <div className="flex items-center gap-1.5 lg:gap-2 overflow-x-auto scrollbar-hide w-full pb-1">
            {['ALL', 'PENDING', 'COMPLETED'].map(status => (
              <button key={status} onClick={() => setFilterCompleted(status)} className={`px-4 py-2 rounded-full text-xs lg:text-sm transition-all whitespace-nowrap ${filterCompleted === status ? pillActiveClass : pillInactiveClass}`}>
                {status === 'ALL' ? 'All' : status === 'PENDING' ? 'Pending' : 'Completed'}
              </button>
            ))}
        </div>
      </div>

      {/* Custom Task Form */}
      {showCustomForm && (
        <div ref={customFormRef} className="mb-8 p-5 lg:p-8 rounded-2xl lg:rounded-3xl bg-white/50 dark:bg-[#131127]/50 border border-gray-200/50 dark:border-white/5 shadow-inner animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-5 lg:mb-6 border-b border-gray-200/50 dark:border-white/5 pb-4">
            <h3 className="font-poppins font-extrabold text-lg lg:text-xl text-gray-800 dark:text-gray-100 flex items-center gap-2">
                {editingCustomTask ? <Edit2 className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-teal-500" />}
                {editingCustomTask ? 'Edit Custom Task' : 'Add Custom Task'}
            </h3>
            <button onClick={() => { setShowCustomForm(false); setEditingCustomTask(null); }} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition text-gray-500"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={editingCustomTask ? handleUpdateCustom : handleAddCustom} className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
            <div className="space-y-1.5">
                <label className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Task Title <span className="text-red-500">*</span></label>
                <input type="text" placeholder="e.g., Workout, Team Meeting" value={newCustomTask.title} onChange={(e) => setNewCustomTask(prev => ({ ...prev, title: e.target.value }))} className={inputClass} required />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Description</label>
                <input type="text" placeholder="Details (optional)" value={newCustomTask.description} onChange={(e) => setNewCustomTask(prev => ({ ...prev, description: e.target.value }))} className={inputClass} />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Due Date</label>
                <input type="date" value={newCustomTask.dueDate} onChange={(e) => setNewCustomTask(prev => ({ ...prev, dueDate: e.target.value }))} className={inputClass} />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Est. Hours</label>
                <input type="number" step="0.5" min="0.5" max="24" value={newCustomTask.estimatedHours} onChange={(e) => setNewCustomTask(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) }))} className={inputClass} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Priority</label>
                <select value={newCustomTask.priority} onChange={(e) => setNewCustomTask(prev => ({ ...prev, priority: e.target.value }))} className={inputClass}>
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
                </select>
            </div>
            <div className="flex justify-end gap-3 mt-4 md:col-span-2 pt-4 border-t border-gray-200/50 dark:border-white/5">
               <button type="button" onClick={() => { setShowCustomForm(false); setEditingCustomTask(null); }} className="px-6 py-2.5 lg:py-3 rounded-full font-bold bg-gray-200 dark:bg-black/20 text-gray-700 dark:text-gray-300 border border-transparent dark:border-white/10 hover:bg-gray-300 dark:hover:bg-black/40 transition">Cancel</button>
               <button type="submit" disabled={createCustomMutation.isPending || updateCustomMutation.isPending} className="flex items-center justify-center gap-2 px-6 py-2.5 lg:py-3 rounded-full bg-gradient-to-r from-purple-500 to-teal-500 text-white font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 shadow-md">
                 {(createCustomMutation.isPending || updateCustomMutation.isPending) ? <Loader className="w-5 h-5 animate-spin" /> : editingCustomTask ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                 {createCustomMutation.isPending ? 'Adding...' : updateCustomMutation.isPending ? 'Updating...' : editingCustomTask ? 'Update Task' : 'Add Task'}
               </button>
            </div>
          </form>
        </div>
      )}

      {/* 💡 FIX: Calendar Wrapper with horizontal scroll to prevent squishing on Mobile */}
      <div className="h-[600px] md:h-[700px] mb-8 rounded-2xl lg:rounded-3xl overflow-x-auto custom-scrollbar shadow-inner border border-gray-200/50 dark:border-white/10 relative bg-white/50 dark:bg-[#131127]/60">

        {filteredEvents.length === 0 && !isFetchingEvents && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 dark:bg-[#131127]/80 backdrop-blur-sm z-10 pointer-events-none w-full">
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-white dark:bg-black/20 flex items-center justify-center mb-6 shadow-sm">
                <CalendarOff className="w-10 h-10 lg:w-12 lg:h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-800 dark:text-gray-200 text-xl lg:text-2xl font-poppins font-bold mb-2">No scheduled tasks</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm lg:text-base font-medium">Generate a schedule or add a custom task above.</p>
          </div>
        )}

        <div className="min-w-[650px] md:min-w-full h-full relative">
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
            step={30}
            timeslots={2}
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
                    const blockType = props.event.resource?.blockType;

                    let dotColor = isDarkMode ? '#2dd4bf' : '#14b8a6';

                    if (isCompleted) dotColor = '#10b981';
                    else if (blockType === 'MEAL') dotColor = '#f59e0b';
                    else if (blockType === 'BREAK') dotColor = '#10b981';
                    else if (blockType === 'ROUTINE') dotColor = '#2dd4bf';
                    else if (priority === 'HIGH') dotColor = '#f43f5e';
                    else if (priority === 'LOW') dotColor = isDarkMode ? '#64748b' : '#94a3b8';

                    return (
                    <div className="flex items-center gap-2">
                        <div style={{ backgroundColor: dotColor }} className="w-3 h-3 rounded-full shrink-0 shadow-sm"></div>
                        <span className="font-bold">{props.event.title}</span>
                    </div>
                    );
                }
                }
            }}
            eventPropGetter={(event) => {
                if (currentView === 'agenda') {
                    return { style: { backgroundColor: 'transparent', padding: 0, boxShadow: 'none' } };
                }

                let bgColor = isDarkMode ? '#0d9488' : '#14b8a6';
                const blockType = event.resource?.blockType;

                if (event.resource?.completed) {
                bgColor = '#10b981';
                } else if (blockType === 'MEAL') {
                bgColor = '#f59e0b';
                } else if (blockType === 'BREAK') {
                bgColor = '#10b981';
                } else if (blockType === 'ROUTINE') {
                bgColor = '#0d9488';
                } else {
                if (event.resource?.priority === 'HIGH') bgColor = '#f43f5e';
                else if (event.resource?.priority === 'LOW') bgColor = isDarkMode ? '#334155' : '#64748b';
                }

                return {
                style: {
                    backgroundColor: bgColor,
                    borderRadius: '8px',
                    color: '#ffffff',
                    opacity: event.resource?.completed ? 0.6 : 1,
                    fontSize: '0.8rem',
                    padding: '4px 8px',
                    fontWeight: 600,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    border: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                },
                };
            }}
            dayPropGetter={(date) => ({ className: isToday(date) ? 'rbc-today-highlight' : '' })}
            />
        </div>
      </div>

      {/* Custom Tasks List */}
      <div className="mt-8 bg-white/50 dark:bg-black/10 p-5 lg:p-8 rounded-2xl lg:rounded-3xl border border-gray-200/50 dark:border-white/5">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4 border-b border-gray-200/50 dark:border-white/5 pb-4">
          <h3 className="font-poppins font-extrabold text-xl lg:text-2xl text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <ListChecks className="w-5 h-5 lg:w-6 lg:h-6 text-teal-500" /> Unscheduled Custom Tasks
          </h3>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-black/20 p-1.5 rounded-xl border border-gray-200/50 dark:border-white/5">
            <Filter className="w-4 h-4 text-gray-500 ml-2" />
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="text-xs lg:text-sm font-bold bg-transparent border-none focus:ring-0 text-gray-700 dark:text-gray-300 py-1 pl-1 pr-6 cursor-pointer outline-none">
              <option value="ALL">All Priorities</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {filteredCustomTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 font-medium italic">No unscheduled custom tasks. You're all caught up!</div>
          ) : (
            filteredCustomTasks.map(task => {
              const priorityConfig = getPriorityConfig(task.priority);
              const PriorityIcon = priorityConfig.icon;
              const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
              return (
                <div key={task.id} draggable={!task.completed} onDragStart={() => handleDragStart(task)}
                 className={`cursor-grab active:cursor-grabbing flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 lg:p-5 rounded-2xl transition-all ${
                  task.completed ? 'bg-gray-100/50 dark:bg-white/5 opacity-60' : 'bg-white dark:bg-[#1A162F] hover:shadow-md hover:border-purple-300 dark:hover:border-teal-500/50'
                } border border-gray-200 dark:border-white/10`}
                >
                  <div className="flex-1 flex items-start md:items-center gap-3 lg:gap-4 min-w-0">
                    <button onClick={() => handleToggleCompleteCustom(task)} disabled={updateCustomMutation.isPending} className={`mt-0.5 md:mt-0 focus:outline-none transition-all hover:scale-110 active:scale-95 shrink-0 ${updateCustomMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {task.completed ? <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500" /> : <Circle className="w-5 h-5 lg:w-6 lg:h-6 text-gray-300 dark:text-gray-600 hover:text-purple-500 dark:hover:text-teal-400" />}
                    </button>
                    <div className="min-w-0">
                      <div className={`font-bold text-sm lg:text-base truncate ${task.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>{task.title}</div>
                      {task.description && <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{task.description}</div>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:gap-3 shrink-0 ml-8 md:ml-0">
                    {task.dueDate && <span className={`text-[10px] lg:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-black/20 ${isOverdue ? 'text-red-500 border border-red-200 dark:border-red-900/50' : 'text-gray-600 dark:text-gray-400'}`}><CalendarIcon className="w-3 h-3" /> {format(new Date(task.dueDate), 'MMM dd')} {isOverdue && <AlertCircle className="w-3 h-3 text-red-500" />}</span>}
                    {task.estimatedHours && <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-black/20 text-gray-600 dark:text-gray-400"><Clock className="w-3 h-3" /> {task.estimatedHours}h</span>}
                    <span className={`text-[10px] lg:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 border ${priorityConfig.color}`}><PriorityIcon className="w-3 h-3" /> {priorityConfig.label}</span>
                    <div className="flex items-center gap-1.5 ml-2 border-l border-gray-200 dark:border-white/10 pl-3">
                      <button onClick={() => handleEditCustom(task)} className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 transition" title="Edit"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteCustom(task.id, task.title)} className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <TaskDetailModal
        task={selectedTask} isOpen={!!selectedTask} onClose={() => setSelectedTask(null)}
        onComplete={handleComplete} onEdit={handleEditCustom} onDelete={handleDeleteCustom}
        isCustomTask={selectedTask?.isCustomTask}
      />

      <ConfirmModal
        isOpen={!!taskToDelete} onClose={() => setTaskToDelete(null)} onConfirm={confirmDelete}
        title="Delete Task" message={`Are you sure you want to delete "${taskToDelete?.title}"? This cannot be undone.`}
        isLoading={deleteCustomMutation.isPending}
      />

      <style>{`

        /* 💡 FIX: Make 'show more' links safe from overlapping */
        .rbc-show-more {
            color: ${isDarkMode ? '#2DD4BF' : '#7C3AED'} !important;
            font-weight: 700;
            font-size: 0.75rem;
            padding: 4px 8px;
            border-radius: 6px;
            background: ${isDarkMode ? 'rgba(45,212,191,0.1)' : 'rgba(124,58,237,0.1)'};
            display: inline-block;
            margin-top: 4px;
            cursor: pointer;
            transition: background 0.2s;
            white-space: nowrap !important;
            z-index: 5 !important;
            position: relative;
        }
        .rbc-show-more:hover { background: ${isDarkMode ? 'rgba(45,212,191,0.2)' : 'rgba(124,58,237,0.2)'}; }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

        /* Calendar Base Overrides */
        .rbc-month-view, .rbc-week-view, .rbc-day-view, .rbc-agenda-view {
            background: transparent;
            border: none;
        }

        /* Headers */
        .rbc-header {
            background: ${isDarkMode ? 'rgba(0,0,0,0.2)' : '#F9FAFB'};
            border-bottom: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#E5E7EB'} !important;
            border-left: none !important;
            color: ${isDarkMode ? '#9CA3AF' : '#6B7280'};
            padding: 12px 4px;
            font-weight: 700;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* Grid Lines */
        .rbc-day-bg { border-left: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#E5E7EB'} !important; }
        .rbc-month-row { border-top: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#E5E7EB'} !important; }
        .rbc-time-view { border: none !important; }
        .rbc-time-header.rbc-overflowing { border-right: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#E5E7EB'} !important; }
        .rbc-timeslot-group { border-bottom: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#E5E7EB'} !important; min-height: 50px !important;}
        .rbc-time-content { border-top: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#E5E7EB'} !important; }
        .rbc-time-header-content { border-left: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#E5E7EB'} !important; }
        .rbc-day-slot .rbc-time-slot { border-top: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'} !important; }

        /* Typography & Colors */
        .rbc-date-cell { padding: 8px 10px; font-weight: 600; color: ${isDarkMode ? '#E5E7EB' : '#374151'}; }
        .rbc-off-range-bg { background: ${isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(243, 244, 246, 0.4)'} !important; }
        .rbc-off-range .rbc-date-cell { color: ${isDarkMode ? '#4B5563' : '#9CA3AF'} !important; }
        .rbc-time-gutter .rbc-timeslot-group { color: ${isDarkMode ? '#9CA3AF' : '#6B7280'}; font-size: 0.75rem; font-weight: 600; border-right: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#E5E7EB'}; }
        .rbc-allday-cell { border-bottom: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#E5E7EB'} !important; }

        /* Hover & Highlights */
        .rbc-day-bg:hover { background: ${isDarkMode ? 'rgba(20,184,166,0.05)' : 'rgba(168,85,247,0.05)'} !important; }
        .rbc-today-highlight { background: ${isDarkMode ? 'rgba(20,184,166,0.1)' : 'rgba(168,85,247,0.05)'} !important; }

        /* Tooltip Overlay */
        .rbc-overlay {
            background: ${isDarkMode ? '#1A162F' : '#FFFFFF'} !important;
            border-radius: 1rem !important;
            border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'} !important;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5) !important;
            z-index: 100 !important;
            padding: 0.5rem !important;
            max-height: 250px !important;
            overflow-y: auto !important;
        }
        .rbc-overlay-header { font-weight: 700; padding: 0.5rem 0.5rem 1rem; border-bottom: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}; margin-bottom: 0.5rem; color: ${isDarkMode ? '#E5E7EB' : '#1F2937'}; }

        /* Agenda View */
        .rbc-agenda-table { background: transparent !important; border: none !important; }
        .rbc-agenda-table th { border-bottom: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#E5E7EB'} !important; padding: 12px 16px; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; color: ${isDarkMode ? '#9CA3AF' : '#6B7280'}; }
        .rbc-agenda-table td { padding: 12px 16px; border-bottom: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.02)' : '#F3F4F6'} !important; color: ${isDarkMode ? '#E5E7EB' : '#1F2937'} !important; }
        .rbc-agenda-table tbody > tr { background: transparent !important; }
        .rbc-agenda-table tbody > tr:hover { background-color: ${isDarkMode ? 'rgba(20,184,166,0.05)' : 'rgba(168,85,247,0.05)'} !important; }
        .rbc-agenda-time-cell, .rbc-agenda-date-cell { font-weight: 600; color: ${isDarkMode ? '#9CA3AF' : '#6B7280'} !important; }

        /* Animation & Interaction */
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .rbc-event { cursor: grab !important; margin: 2px 4px !important; z-index: 10; transition: transform 0.1s; overflow: hidden; text-overflow: ellipsis; }
        .rbc-event:active { cursor: grabbing !important; transform: scale(0.98); }
        .rbc-addons-dnd-over { background-color: ${isDarkMode ? 'rgba(45,212,191,0.1)' : 'rgba(168, 85, 247, 0.1)'} !important; }
        .rbc-addons-dnd-drag-preview .rbc-event { opacity: 0.8 !important; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3) !important; transform: scale(1.05); }

        /* Toolbar Overrides */
        .rbc-toolbar { display: none !important; }
      `}</style>
    </div>
  );
}

export default SchedulePage;