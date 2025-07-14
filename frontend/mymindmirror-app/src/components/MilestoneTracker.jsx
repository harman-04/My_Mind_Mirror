// src/components/MilestoneTracker.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, parseISO, isValid } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext'; // Assuming you have a ThemeContext
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'; // For progress visualization
import 'react-circular-progressbar/dist/styles.css'; // Styles for the progress bar
import { Lightbulb, Rocket, ThumbsUp, Target, ChevronDown, ChevronUp } from 'lucide-react'; // Icons for insights

// Base URL for your Spring Boot backend
const API_BASE_URL = 'http://localhost:8080/api';

function MilestoneTracker({ userId }) {
    const { theme } = useTheme();

    // --- State for Milestones ---
    const [milestones, setMilestones] = useState([]);
    const [loadingMilestones, setLoadingMilestones] = useState(true);
    const [milestoneError, setMilestoneError] = useState('');

    // --- State for New Milestone Form ---
    const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
    const [newMilestoneDescription, setNewMilestoneDescription] = useState('');
    const [newMilestoneDueDate, setNewMilestoneDueDate] = useState(''); // YYYY-MM-DD string

    // --- State for Editing Milestone ---
    const [editingMilestoneId, setEditingMilestoneId] = useState(null);
    const [editedMilestoneTitle, setEditedMilestoneTitle] = useState('');
    const [editedMilestoneDescription, setEditedMilestoneDescription] = useState('');
    const [editedMilestoneDueDate, setEditedMilestoneDueDate] = useState('');
    const [editedMilestoneStatus, setEditedMilestoneStatus] = useState('');

    // --- State for Tasks ---
    const [expandedMilestoneId, setExpandedMilestoneId] = useState(null); // To show/hide tasks for a milestone
    const [tasksLoading, setTasksLoading] = useState(false);
    const [tasksError, setTasksError] = useState('');

    // --- State for New Task Form ---
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState(''); // YYYY-MM-DD string

    // --- State for Editing Task ---
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editedTaskDescription, setEditedTaskDescription] = useState('');
    const [editedTaskDueDate, setEditedTaskDueDate] = useState('');
    const [editedTaskStatus, setEditedTaskStatus] = useState('');

    // --- State for Delete Confirmation Modals ---
    const [showDeleteMilestoneConfirm, setShowDeleteMilestoneConfirm] = useState(false);
    const [milestoneToDeleteId, setMilestoneToDeleteId] = useState(null);
    const [showDeleteTaskConfirm, setShowDeleteTaskConfirm] = useState(false);
    const [taskToDeleteId, setTaskToDeleteId] = useState(null);
    const [taskToDeleteMilestoneId, setTaskToDeleteMilestoneId] = useState(null);

    // ⭐ NEW STATE FOR AI INSIGHTS ⭐
    const [milestoneInsights, setMilestoneInsights] = useState({}); // { milestoneId: insightsData }
    const [loadingInsightsId, setLoadingInsightsId] = useState(null); // ID of milestone currently fetching insights
    const [insightErrorId, setInsightErrorId] = useState(null); // ID of milestone with insight error

    // --- General Feedback Messages ---
    const [successMessage, setSuccessMessage] = useState('');

    // Helper to get auth token
    const getAuthHeader = useCallback(() => {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            setMilestoneError('Authentication token missing. Please log in.');
            return null;
        }
        return { Authorization: `Bearer ${token}` };
    }, []);

    // --- Fetch Milestones ---
    const fetchMilestones = useCallback(async () => {
        if (!userId) {
            setMilestoneError('User not logged in.');
            setLoadingMilestones(false);
            return;
        }
        setLoadingMilestones(true);
        setMilestoneError('');
        const headers = getAuthHeader();
        if (!headers) {
            setLoadingMilestones(false);
            return;
        }

        try {
            const response = await axios.get(`${API_BASE_URL}/milestones`, { headers });
            // Sort milestones by creationDate descending
            const sortedMilestones = response.data.sort((a, b) => 
                parseISO(b.creationDate).getTime() - parseISO(a.creationDate).getTime()
            );
            setMilestones(sortedMilestones);
        } catch (err) {
            console.error('Error fetching milestones:', err.response?.data || err.message);
            setMilestoneError(`Failed to load milestones: ${err.response?.data?.message || err.message}`);
        } finally {
            setLoadingMilestones(false);
        }
    }, [userId, getAuthHeader]);

    // --- Fetch Tasks for a specific milestone (called when a milestone is expanded) ---
    const fetchTasksForMilestone = useCallback(async (milestoneId) => {
        setTasksLoading(true);
        setTasksError('');
        const headers = getAuthHeader();
        if (!headers) {
            setTasksLoading(false);
            return;
        }

        try {
            const response = await axios.get(`${API_BASE_URL}/milestones/${milestoneId}/tasks`, { headers });
            // Update the specific milestone in the state with its fetched tasks
            setMilestones(prevMilestones => prevMilestones.map(m => 
                m.id === milestoneId ? { ...m, tasks: response.data } : m
            ));
        } catch (err) {
            console.error(`Error fetching tasks for milestone ${milestoneId}:`, err.response?.data || err.message);
            setTasksError(`Failed to load tasks: ${err.response?.data?.message || err.message}`);
        } finally {
            setTasksLoading(false);
        }
    }, [getAuthHeader]);

    // --- Initial Load of Milestones ---
    useEffect(() => {
        fetchMilestones();
    }, [fetchMilestones]);

    // --- Handle Milestone Expansion/Collapse ---
    const toggleMilestoneExpand = (milestoneId) => {
        if (expandedMilestoneId === milestoneId) {
            setExpandedMilestoneId(null); // Collapse
        } else {
            setExpandedMilestoneId(milestoneId); // Expand
            // Fetch tasks only if they haven't been fetched or if we want to re-fetch on every expand
            const currentMilestone = milestones.find(m => m.id === milestoneId);
            if (currentMilestone && (!currentMilestone.tasks || currentMilestone.tasks.length === 0)) {
                fetchTasksForMilestone(milestoneId);
            }
        }
    };

    // --- Add New Milestone ---
    const handleAddMilestone = async (e) => {
        e.preventDefault();
        setMilestoneError('');
        setSuccessMessage('');
        if (!newMilestoneTitle.trim()) {
            setMilestoneError('Milestone title cannot be empty.');
            return;
        }

        const headers = getAuthHeader();
        if (!headers) return;

        try {
            const payload = {
                title: newMilestoneTitle,
                description: newMilestoneDescription || null,
                dueDate: newMilestoneDueDate || null,
            };
            await axios.post(`${API_BASE_URL}/milestones`, payload, { headers });
            setSuccessMessage('Milestone added successfully!');
            setNewMilestoneTitle('');
            setNewMilestoneDescription('');
            setNewMilestoneDueDate('');
            fetchMilestones(); // Re-fetch all milestones to update the list
        } catch (err) {
            console.error('Error adding milestone:', err.response?.data || err.message);
            setMilestoneError(`Failed to add milestone: ${err.response?.data?.message || err.message}`);
        } finally {
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };

    // --- Edit Milestone ---
    const handleEditMilestoneClick = (milestone) => {
        setEditingMilestoneId(milestone.id);
        setEditedMilestoneTitle(milestone.title);
        setEditedMilestoneDescription(milestone.description || '');
        setEditedMilestoneDueDate(milestone.dueDate || '');
        setEditedMilestoneStatus(milestone.status);
    };

    const handleSaveMilestoneEdit = async (milestoneId) => {
        setMilestoneError('');
        setSuccessMessage('');
        if (!editedMilestoneTitle.trim()) {
            setMilestoneError('Milestone title cannot be empty.');
            return;
        }

        const headers = getAuthHeader();
        if (!headers) return;

        try {
            const payload = {
                title: editedMilestoneTitle,
                description: editedMilestoneDescription || null,
                dueDate: editedMilestoneDueDate || null,
                status: editedMilestoneStatus,
            };
            await axios.put(`${API_BASE_URL}/milestones/${milestoneId}`, payload, { headers });
            setSuccessMessage('Milestone updated successfully!');
            setEditingMilestoneId(null);
            fetchMilestones(); // Re-fetch to update UI
        } catch (err) {
            console.error('Error updating milestone:', err.response?.data || err.message);
            setMilestoneError(`Failed to update milestone: ${err.response?.data?.message || err.message}`);
        } finally {
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };

    const handleCancelMilestoneEdit = () => {
        setEditingMilestoneId(null);
        setEditedMilestoneTitle('');
        setEditedMilestoneDescription('');
        setEditedMilestoneDueDate('');
        setEditedMilestoneStatus('');
    };

    // --- Delete Milestone ---
    const handleDeleteMilestoneClick = (milestoneId) => {
        setMilestoneToDeleteId(milestoneId);
        setShowDeleteMilestoneConfirm(true);
    };

    const confirmDeleteMilestone = async () => {
        setMilestoneError('');
        setSuccessMessage('');
        const headers = getAuthHeader();
        if (!headers) {
            setShowDeleteMilestoneConfirm(false);
            return;
        }

        try {
            await axios.delete(`${API_BASE_URL}/milestones/${milestoneToDeleteId}`, { headers });
            setSuccessMessage('Milestone deleted successfully!');
            fetchMilestones(); // Re-fetch to update UI
        } catch (err) {
            console.error('Error deleting milestone:', err.response?.data || err.message);
            setMilestoneError(`Failed to delete milestone: ${err.response?.data?.message || err.message}`);
        } finally {
            setShowDeleteMilestoneConfirm(false);
            setMilestoneToDeleteId(null);
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };

    const cancelDeleteMilestone = () => {
        setShowDeleteMilestoneConfirm(false);
        setMilestoneToDeleteId(null);
    };

    // --- Add New Task ---
    const handleAddTask = async (e, milestoneId) => {
        e.preventDefault();
        setTasksError('');
        setSuccessMessage('');
        if (!newTaskDescription.trim()) {
            setTasksError('Task description cannot be empty.');
            return;
        }

        const headers = getAuthHeader();
        if (!headers) return;

        try {
            const payload = {
                description: newTaskDescription,
                dueDate: newTaskDueDate || null,
            };
            await axios.post(`${API_BASE_URL}/milestones/${milestoneId}/tasks`, payload, { headers });
            setSuccessMessage('Task added successfully!');
            setNewTaskDescription('');
            setNewTaskDueDate('');
            fetchMilestones(); // Re-fetch all milestones (will update tasks for expanded one)
            // Or more efficiently, just update the specific milestone's tasks
            fetchTasksForMilestone(milestoneId); // Re-fetch tasks for the current milestone
        } catch (err) {
            console.error('Error adding task:', err.response?.data || err.message);
            setTasksError(`Failed to add task: ${err.response?.data?.message || err.message}`);
        } finally {
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };

    // --- Edit Task ---
    const handleEditTaskClick = (task) => {
        setEditingTaskId(task.id);
        setEditedTaskDescription(task.description);
        setEditedTaskDueDate(task.dueDate || '');
        setEditedTaskStatus(task.status);
    };

    const handleSaveTaskEdit = async (milestoneId, taskId) => {
        setTasksError('');
        setSuccessMessage('');
        if (!editedTaskDescription.trim()) {
            setTasksError('Task description cannot be empty.');
            return;
        }

        const headers = getAuthHeader();
        if (!headers) return;

        try {
            const payload = {
                description: editedTaskDescription,
                dueDate: editedTaskDueDate || null,
                status: editedTaskStatus,
            };
            await axios.put(`${API_BASE_URL}/milestones/${milestoneId}/tasks/${taskId}`, payload, { headers });
            setSuccessMessage('Task updated successfully!');
            setEditingTaskId(null);
            fetchMilestones(); // Re-fetch all milestones (will update tasks for expanded one)
            fetchTasksForMilestone(milestoneId); // Re-fetch tasks for the current milestone
        } catch (err) {
            console.error('Error updating task:', err.response?.data || err.message);
            setTasksError(`Failed to update task: ${err.response?.data?.message || err.message}`);
        } finally {
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };

    const handleCancelTaskEdit = () => {
        setEditingTaskId(null);
        setEditedTaskDescription('');
        setEditedTaskDueDate('');
        setEditedTaskStatus('');
    };

    // --- Toggle Task Status (Complete/Pending) ---
    const handleToggleTaskStatus = async (milestoneId, task) => {
        setTasksError('');
        setSuccessMessage('');
        const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
        const headers = getAuthHeader();
        if (!headers) return;

        try {
            const payload = { status: newStatus };
            await axios.put(`${API_BASE_URL}/milestones/${milestoneId}/tasks/${task.id}`, payload, { headers });
            setSuccessMessage(`Task marked as ${newStatus.toLowerCase()}!`);
            fetchMilestones(); // Re-fetch all milestones (will update tasks and milestone percentage)
            fetchTasksForMilestone(milestoneId); // Re-fetch tasks for the current milestone
        } catch (err) {
            console.error('Error toggling task status:', err.response?.data || err.message);
            setTasksError(`Failed to update task status: ${err.response?.data?.message || err.message}`);
        } finally {
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };

    // --- Delete Task ---
    const handleDeleteTaskClick = (milestoneId, taskId) => {
        setTaskToDeleteId(taskId);
        setTaskToDeleteMilestoneId(milestoneId);
        setShowDeleteTaskConfirm(true);
    };

    const confirmDeleteTask = async () => {
        setTasksError('');
        setSuccessMessage('');
        const headers = getAuthHeader();
        if (!headers) {
            setShowDeleteTaskConfirm(false);
            return;
        }

        try {
            await axios.delete(`${API_BASE_URL}/milestones/${taskToDeleteMilestoneId}/tasks/${taskToDeleteId}`, { headers });
            setSuccessMessage('Task deleted successfully!');
            fetchMilestones(); // Re-fetch all milestones (will update tasks and milestone percentage)
            fetchTasksForMilestone(taskToDeleteMilestoneId); // Re-fetch tasks for the current milestone
        } catch (err) {
            console.error('Error deleting task:', err.response?.data || err.message);
            setTasksError(`Failed to delete task: ${err.response?.data?.message || err.message}`);
        } finally {
            setShowDeleteTaskConfirm(false);
            setTaskToDeleteId(null);
            setTaskToDeleteMilestoneId(null);
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };

    const cancelDeleteTask = () => {
        setShowDeleteTaskConfirm(false);
        setTaskToDeleteId(null);
        setTaskToDeleteMilestoneId(null);
    };

  // ⭐ REVISED: Fetch AI Insights for a Milestone ⭐
const fetchMilestoneInsights = useCallback(async (milestoneId) => {
    // Set loading state specifically for this milestone
    setLoadingInsightsId(milestoneId);
    // Clear any previous errors for this milestone
    setInsightErrorId(null);
    setMilestoneError(null); // Clear global error too

    const headers = getAuthHeader();
    // --- ADD THESE CONSOLE LOGS ---
    console.log("DEBUG: getAuthHeader() result:", headers);
    if (!headers || !headers.Authorization) {
        console.error("DEBUG: Authorization header missing or malformed. Not proceeding with request.");
        setLoadingInsightsId(null);
        // Optionally, set a specific error message here for the user
        setMilestoneError("Authentication information is missing. Please log in again.");
        return; // STOP EXECUTION IF HEADERS ARE BAD
    }
    // --- END ADDED LOGS ---

    try {
        const response = await axios.get(`${API_BASE_URL}/milestones/${milestoneId}/insights`, { headers });

        setMilestoneInsights(prevInsights => ({
            ...prevInsights,
            [milestoneId]: response.data
        }));

        setSuccessMessage('AI insights generated!');
        setTimeout(() => setSuccessMessage(''), 3000);

    } catch (err) {
        const errorMessage = err.response?.data?.message || err.message;
        console.error(`Error fetching insights for milestone ${milestoneId}:`, err.response?.data || err.message);
        setInsightErrorId(milestoneId); // Mark this milestone as having an error
        setMilestoneError(`Failed to get insights: ${errorMessage}`);
    } finally {
        setLoadingInsightsId(null);
    }
}, [getAuthHeader, setMilestoneError, setLoadingInsightsId, setInsightErrorId, setMilestoneInsights, setSuccessMessage]);
    // --- Styling Helpers ---
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
        if (percentage === 100) return '#5CC8C2'; // Completed (Teal)
        if (percentage > 75) return '#4CAF50'; // High progress (Green)
        if (percentage > 50) return '#8BC34A'; // Medium-high (Light Green)
        if (percentage > 25) return '#FFEB3B'; // Medium-low (Yellow)
        return '#FF5722'; // Low progress (Orange)
    };

    // --- Render Logic ---
    if (loadingMilestones) {
        return (
            <div className={`p-6 rounded-lg shadow-md text-center ${theme === 'dark' ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'}`}>
                <p className="text-xl font-poppins">Loading Milestones...</p>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B399D4] dark:border-[#5CC8C2] mx-auto mt-4"></div>
            </div>
        );
    }

    if (milestoneError && !loadingInsightsId) { // Show general milestone error if not currently loading insights
        return (
            <div className={`p-6 rounded-lg shadow-md text-center ${theme === 'dark' ? 'bg-red-900/40 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-400'}`}>
                <p className="text-xl font-poppins font-semibold">Error Loading Milestones</p>
                <p className="font-inter mt-2">{milestoneError}</p>
                <p className="font-inter mt-2">Please ensure you are logged in and the backend services are running.</p>
            </div>
        );
    }

    return (
        <div className={`p-6 rounded-lg shadow-md transition-all duration-500 w-full font-inter
                         ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h2 className="text-3xl font-poppins font-semibold text-[#B399D4] dark:text-[#5CC8C2] mb-6 text-center">
                My Milestones & To-Dos
            </h2>

            {successMessage && (
                <div className="bg-green-100 dark:bg-green-900/40 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded relative mb-4 font-inter" role="alert">
                    <strong className="font-bold">Success!</strong>
                    <span className="block sm:inline"> {successMessage}</span>
                </div>
            )}
            {tasksError && (
                <div className="bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded relative mb-4 font-inter" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline"> {tasksError}</span>
                </div>
            )}
            {/* Display insight specific error if any */}
            {insightErrorId && milestoneError && (
                <div className="bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded relative mb-4 font-inter" role="alert">
                    <strong className="font-bold">Insight Error!</strong>
                    <span className="block sm:inline"> {milestoneError}</span>
                </div>
            )}


            {/* --- Add New Milestone Form --- */}
            <div className={`mb-8 p-4 rounded-lg shadow-inner
                             ${theme === 'dark' ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4">Add New Milestone</h3>
                <form onSubmit={handleAddMilestone} className="space-y-4">
                    <div>
                        <label htmlFor="milestone-title" className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Title</label>
                        <input
                            type="text"
                            id="milestone-title"
                            value={newMilestoneTitle}
                            onChange={(e) => setNewMilestoneTitle(e.target.value)}
                            className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2
                                        ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                            placeholder="e.g., Learn a new skill"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="milestone-description" className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Description (Optional)</label>
                        <textarea
                            id="milestone-description"
                            value={newMilestoneDescription}
                            onChange={(e) => setNewMilestoneDescription(e.target.value)}
                            className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 resize-y min-h-[60px]
                                        ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                            placeholder="Detailed plan for this milestone..."
                        ></textarea>
                    </div>
                    <div>
                        <label htmlFor="milestone-dueDate" className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Due Date (Optional)</label>
                        <input
                            type="date"
                            id="milestone-dueDate"
                            value={newMilestoneDueDate}
                            onChange={(e) => setNewMilestoneDueDate(e.target.value)}
                            className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2
                                        ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2 px-4 rounded-md font-poppins font-semibold text-white
                                   bg-[#B399D4] hover:bg-[#9B7BBF] active:bg-[#7F66A0]
                                   shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#B399D4] focus:ring-opacity-75
                                   transition-all duration-300"
                    >
                        Add Milestone
                    </button>
                </form>
            </div>

            {/* --- Milestones List --- */}
            {milestones.length === 0 ? (
                <p className="text-center text-gray-700 dark:text-gray-300 text-lg">No milestones yet. Start by adding one above!</p>
            ) : (
                <div className="space-y-6">
                    {milestones.map(milestone => (
                        <div key={milestone.id} className={`p-5 rounded-lg shadow-md
                                ${theme === 'dark' ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'}`}>
                            {editingMilestoneId === milestone.id ? (
                                /* --- Edit Milestone Form --- */
                                <div>
                                    <h3 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-3">Edit Milestone</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label htmlFor={`edit-title-${milestone.id}`} className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Title</label>
                                            <input
                                                type="text"
                                                id={`edit-title-${milestone.id}`}
                                                value={editedMilestoneTitle}
                                                onChange={(e) => setEditedMilestoneTitle(e.target.value)}
                                                className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2
                                                            ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`edit-description-${milestone.id}`} className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Description</label>
                                            <textarea
                                                id={`edit-description-${milestone.id}`}
                                                value={editedMilestoneDescription}
                                                onChange={(e) => setEditedMilestoneDescription(e.target.value)}
                                                className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 resize-y min-h-[60px]
                                                            ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                                            ></textarea>
                                        </div>
                                        <div>
                                            <label htmlFor={`edit-dueDate-${milestone.id}`} className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Due Date</label>
                                            <input
                                                type="date"
                                                id={`edit-dueDate-${milestone.id}`}
                                                value={editedMilestoneDueDate}
                                                onChange={(e) => setEditedMilestoneDueDate(e.target.value)}
                                                className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2
                                                            ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor={`edit-status-${milestone.id}`} className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Status</label>
                                            <select
                                                id={`edit-status-${milestone.id}`}
                                                value={editedMilestoneStatus}
                                                onChange={(e) => setEditedMilestoneStatus(e.target.value)}
                                                className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2
                                                            ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                                            >
                                                <option value="PENDING">Pending</option>
                                                <option value="IN_PROGRESS">In Progress</option>
                                                <option value="COMPLETED">Completed</option>
                                                <option value="OVERDUE">Overdue</option>
                                                <option value="CANCELLED">Cancelled</option>
                                            </select>
                                        </div>
                                        <div className="flex justify-end space-x-2 mt-4">
                                            <button
                                                onClick={() => handleSaveMilestoneEdit(milestone.id)}
                                                className="py-2 px-4 rounded-md font-poppins font-semibold text-white
                                                           bg-[#B399D4] hover:bg-[#9B7BBF] active:bg-[#7F66A0]
                                                           shadow-md transition-all duration-300"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={handleCancelMilestoneEdit}
                                                className={`py-2 px-4 rounded-md font-poppins font-semibold
                                                            ${theme === 'dark' ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                                                            shadow-md transition-all duration-300`}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* --- Display Milestone --- */
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                                    <div className="flex-1 mb-4 sm:mb-0">
                                        <h3 className="text-2xl font-poppins font-semibold text-gray-800 dark:text-gray-200">
                                            {milestone.title}
                                        </h3>
                                        {milestone.description && (
                                            <p className="text-gray-700 dark:text-gray-300 mt-1 text-sm">{milestone.description}</p>
                                        )}
                                        <div className="flex items-center mt-2 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColorClass(milestone.status)}`}>
                                                {milestone.status.replace('_', ' ')}
                                            </span>
                                            {milestone.dueDate && isValid(parseISO(milestone.dueDate)) && (
                                                <span className="ml-3 text-gray-600 dark:text-gray-400">
                                                    Due: {format(parseISO(milestone.dueDate), 'MMM dd, yyyy')}
                                                </span>
                                            )}
                                            <span className="ml-3 text-gray-600 dark:text-gray-400">
                                                Created: {format(parseISO(milestone.creationDate), 'MMM dd, yyyy')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        {/* Progress Bar */}
                                        <div className="w-16 h-16">
                                            <CircularProgressbar
                                                value={milestone.completionPercentage || 0}
                                                text={`${milestone.completionPercentage ? milestone.completionPercentage.toFixed(0) : 0}%`}
                                                styles={buildStyles({
                                                    rotation: 0.25,
                                                    strokeLinecap: 'butt',
                                                    textSize: '20px',
                                                    pathTransitionDuration: 0.5,
                                                    pathColor: getProgressBarColor(milestone.completionPercentage || 0),
                                                    textColor: theme === 'dark' ? '#E0E0E0' : '#4B5563',
                                                    trailColor: theme === 'dark' ? '#4B5563' : '#D1D5DB',
                                                    backgroundColor: '#3e98c7',
                                                })}
                                            />
                                        </div>
                                        <div className="flex flex-col space-y-2">
                                            <button
                                                onClick={() => handleEditMilestoneClick(milestone)}
                                                className="py-1 px-3 rounded-md font-semibold text-sm
                                                           bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeleteMilestoneClick(milestone.id)}
                                                className="py-1 px-3 rounded-md font-semibold text-sm
                                                           bg-red-500 text-white hover:bg-red-600 transition-all duration-300"
                                            >
                                                Delete
                                            </button>
                                            <button
                                                onClick={() => toggleMilestoneExpand(milestone.id)}
                                                className={`py-1 px-3 rounded-md font-semibold text-sm
                                                            ${theme === 'dark' ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                                                            transition-all duration-300`}
                                            >
                                                {expandedMilestoneId === milestone.id ? (
                                                    <>Hide Tasks <ChevronUp size={16} className="inline ml-1" /></>
                                                ) : (
                                                    <>View Tasks <ChevronDown size={16} className="inline ml-1" /></>
                                                )}
                                            </button>
                                            {/* ⭐ NEW: Get AI Insights Button ⭐ */}
                                            <button
                                                onClick={() => fetchMilestoneInsights(milestone.id)}
                                                className={`py-1 px-3 rounded-md font-semibold text-sm
                                                            ${theme === 'dark' ? 'bg-[#5CC8C2] text-gray-900 hover:bg-[#47A8A3]' : 'bg-[#B399D4] text-white hover:bg-[#9B7BBF]'}
                                                            transition-all duration-300 ${loadingInsightsId === milestone.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                disabled={loadingInsightsId === milestone.id}
                                            >
                                                {loadingInsightsId === milestone.id ? 'Getting Insights...' : 'Get AI Insights'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ⭐ NEW: AI Insights Display Section ⭐ */}
                            {milestoneInsights[milestone.id] && (
                                <div className={`mt-6 p-4 rounded-lg shadow-inner
                                                 ${theme === 'dark' ? 'bg-gray-600 border border-gray-500' : 'bg-blue-50 border border-blue-200'}`}>
                                    <h4 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                                        <Lightbulb size={20} className="mr-2 text-[#B399D4] dark:text-[#5CC8C2]" /> AI Insights
                                    </h4>
                                    <div className="space-y-3 text-gray-700 dark:text-gray-300">
                                        <p><strong className="font-semibold">Remaining Work:</strong> {milestoneInsights[milestone.id].remainingWork}</p>
                                        <p><strong className="font-semibold">Performance:</strong> {milestoneInsights[milestone.id].performanceAssessment}</p>
                                        <div>
                                            <strong className="font-semibold flex items-center"><Lightbulb size={16} className="mr-1" /> Tips:</strong>
                                            <ul className="list-disc list-inside ml-4">
                                                {milestoneInsights[milestone.id].tips.map((tip, idx) => (
                                                    <li key={idx}>{tip}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <p><strong className="font-semibold flex items-center"><ThumbsUp size={16} className="mr-1" /> Encouragement:</strong> {milestoneInsights[milestone.id].encouragement}</p>
                                        <div>
                                            <strong className="font-semibold flex items-center"><Target size={16} className="mr-1" /> Suggested Next Steps:</strong>
                                            <ul className="list-disc list-inside ml-4">
                                                {milestoneInsights[milestone.id].suggestedNewTasks.map((task, idx) => (
                                                    <li key={idx}>{task}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* End AI Insights Display */}

                            {/* --- Tasks Section (Expanded) --- */}
                            {expandedMilestoneId === milestone.id && (
                                <div className="mt-6 border-t border-gray-300 dark:border-gray-600 pt-6">
                                    <h4 className="text-xl font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4">Tasks</h4>

                                    {tasksLoading && (
                                        <p className="text-center text-gray-600 dark:text-gray-400">Loading tasks...</p>
                                    )}
                                    {tasksError && (
                                        <div className="bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded relative mb-4 font-inter" role="alert">
                                            <strong className="font-bold">Error!</strong>
                                            <span className="block sm:inline"> {tasksError}</span>
                                        </div>
                                    )}

                                    {milestone.tasks && milestone.tasks.length > 0 ? (
                                        <ul className="space-y-3">
                                            {milestone.tasks.map(task => (
                                                <li key={task.id} className={`p-3 rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between
                                                                               ${theme === 'dark' ? 'bg-gray-600 border border-gray-500' : 'bg-gray-100 border border-gray-300'}`}>
                                                    {editingTaskId === task.id ? (
                                                        /* --- Edit Task Form --- */
                                                        <div className="w-full space-y-2">
                                                            <div>
                                                                <label htmlFor={`edit-task-description-${task.id}`} className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Description</label>
                                                                <input
                                                                    type="text"
                                                                    id={`edit-task-description-${task.id}`}
                                                                    value={editedTaskDescription}
                                                                    onChange={(e) => setEditedTaskDescription(e.target.value)}
                                                                    className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2
                                                                                ${theme === 'dark' ? 'bg-gray-500 text-gray-200 border-gray-400 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                                                                    required
                                                                />
                                                            </div>
                                                            <div>
                                                                <label htmlFor={`edit-task-dueDate-${task.id}`} className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Due Date</label>
                                                                <input
                                                                    type="date"
                                                                    id={`edit-task-dueDate-${task.id}`}
                                                                    value={editedTaskDueDate}
                                                                    onChange={(e) => setEditedTaskDueDate(e.target.value)}
                                                                    className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2
                                                                                ${theme === 'dark' ? 'bg-gray-500 text-gray-200 border-gray-400 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label htmlFor={`edit-task-status-${task.id}`} className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Status</label>
                                                                <select
                                                                    id={`edit-task-status-${task.id}`}
                                                                    value={editedTaskStatus}
                                                                    onChange={(e) => setEditedTaskStatus(e.target.value)}
                                                                    className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2
                                                                                ${theme === 'dark' ? 'bg-gray-500 text-gray-200 border-gray-400 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                                                                >
                                                                    <option value="PENDING">Pending</option>
                                                                    <option value="COMPLETED">Completed</option>
                                                                    <option value="OVERDUE">Overdue</option>
                                                                    <option value="CANCELLED">Cancelled</option>
                                                                </select>
                                                            </div>
                                                            <div className="flex justify-end space-x-2 mt-3">
                                                                <button
                                                                    onClick={() => handleSaveTaskEdit(milestone.id, task.id)}
                                                                    className="py-1 px-3 rounded-md font-semibold text-sm
                                                                               bg-[#B399D4] text-white hover:bg-[#9B7BBF] transition-all duration-300"
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    onClick={handleCancelTaskEdit}
                                                                    className={`py-1 px-3 rounded-md font-semibold text-sm
                                                                                ${theme === 'dark' ? 'bg-gray-500 text-gray-200 hover:bg-gray-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                                                                                transition-all duration-300`}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* --- Display Task --- */
                                                        <>
                                                            <div className="flex-1 mb-2 sm:mb-0">
                                                                <p className={`text-lg font-medium ${task.status === 'COMPLETED' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                                                    {task.description}
                                                                </p>
                                                                <div className="flex items-center mt-1 text-xs">
                                                                    <span className={`px-2 py-0.5 rounded-full ${getStatusColorClass(task.status)}`}>
                                                                        {task.status.replace('_', ' ')}
                                                                    </span>
                                                                    {task.dueDate && isValid(parseISO(task.dueDate)) && (
                                                                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                                                                            Due: {format(parseISO(task.dueDate), 'MMM dd, yyyy')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex space-x-2 mt-2 sm:mt-0">
                                                                <button
                                                                    onClick={() => handleToggleTaskStatus(milestone.id, task)}
                                                                    className={`py-1 px-3 rounded-md font-semibold text-xs
                                                                                ${task.status === 'COMPLETED' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}
                                                                                text-white transition-all duration-300`}
                                                                >
                                                                    {task.status === 'COMPLETED' ? 'Mark Pending' : 'Mark Complete'}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEditTaskClick(task)}
                                                                    className="py-1 px-3 rounded-md font-semibold text-xs
                                                                               bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteTaskClick(milestone.id, task.id)}
                                                                    className="py-1 px-3 rounded-md font-semibold text-xs
                                                                               bg-red-500 text-white hover:bg-red-600 transition-all duration-300"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-center text-gray-600 dark:text-gray-400">No tasks for this milestone yet. Add one below!</p>
                                    )}

                                    {/* --- Add New Task Form --- */}
                                    <div className={`mt-6 p-4 rounded-lg shadow-inner
                                                     ${theme === 'dark' ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'}`}>
                                        <h5 className="text-lg font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-3">Add New Task</h5>
                                        <form onSubmit={(e) => handleAddTask(e, milestone.id)} className="space-y-3">
                                            <div>
                                                <label htmlFor={`new-task-description-${milestone.id}`} className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Description</label>
                                                <input
                                                    type="text"
                                                    id={`new-task-description-${milestone.id}`}
                                                    value={newTaskDescription}
                                                    onChange={(e) => setNewTaskDescription(e.target.value)}
                                                    className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2
                                                                ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                                                    placeholder="e.g., Complete Chapter 1"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor={`new-task-dueDate-${milestone.id}`} className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Due Date (Optional)</label>
                                                <input
                                                    type="date"
                                                    id={`new-task-dueDate-${milestone.id}`}
                                                    value={newTaskDueDate}
                                                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                                                    className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2
                                                                ${theme === 'dark' ? 'bg-gray-600 text-gray-200 border-gray-500 focus:ring-[#5CC8C2]' : 'bg-white text-gray-800 border-gray-300 focus:ring-[#B399D4]'}`}
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                className="w-full py-2 px-4 rounded-md font-poppins font-semibold text-white
                                                           bg-[#5CC8C2] hover:bg-[#47A8A3] active:bg-[#3A8D89]
                                                           shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#5CC8C2] focus:ring-opacity-75
                                                           transition-all duration-300"
                                            >
                                                Add Task
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* --- Delete Milestone Confirmation Modal --- */}
            {showDeleteMilestoneConfirm && (
                <div className="fixed inset-0 flex items-center justify-center z-50 overflow-hidden">
                    <div className="absolute inset-0 bg-gray-900 bg-opacity-70 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-center max-w-sm w-full mx-auto my-auto">
                        <p className="text-lg font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4">
                            Are you sure you want to delete this milestone and all its tasks? This cannot be undone.
                        </p>
                        <div className="flex justify-center space-x-4">
                            <button
                                onClick={confirmDeleteMilestone}
                                className="py-2 px-4 rounded-full font-poppins font-semibold text-white bg-red-600 hover:bg-red-700 transition-all duration-300"
                            >
                                Delete
                            </button>
                            <button
                                onClick={cancelDeleteMilestone}
                                className="py-2 px-4 rounded-full font-poppins font-semibold text-gray-800 bg-gray-300 hover:bg-gray-400 dark:text-gray-200 dark:bg-gray-600 dark:hover:bg-gray-700 transition-all duration-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Delete Task Confirmation Modal --- */}
            {showDeleteTaskConfirm && (
                <div className="fixed inset-0 flex items-center justify-center z-50 overflow-hidden">
                    <div className="absolute inset-0 bg-gray-900 bg-opacity-70 backdrop-blur-sm"></div>
                    <div className="relative bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-center max-w-sm w-full mx-auto my-auto">
                        <p className="text-lg font-poppins font-semibold text-gray-800 dark:text-gray-200 mb-4">
                            Are you sure you want to delete this task?
                        </p>
                        <div className="flex justify-center space-x-4">
                            <button
                                onClick={confirmDeleteTask}
                                className="py-2 px-4 rounded-full font-poppins font-semibold text-white bg-red-600 hover:bg-red-700 transition-all duration-300"
                            >
                                Delete
                            </button>
                            <button
                                onClick={cancelDeleteTask}
                                className="py-2 px-4 rounded-full font-poppins font-semibold text-gray-800 bg-gray-300 hover:bg-gray-400 dark:text-gray-200 dark:bg-gray-600 dark:hover:bg-gray-700 transition-all duration-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MilestoneTracker;
