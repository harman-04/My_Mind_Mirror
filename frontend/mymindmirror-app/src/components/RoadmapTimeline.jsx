// src/components/RoadmapTimeline.jsx
import React, { useMemo, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { CheckCircle, Circle, ChevronDown, ChevronUp } from 'lucide-react';

const RoadmapTimeline = ({ tasks, durationWeeks }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [expandedWeek, setExpandedWeek] = useState(null);

  const tasksByWeek = useMemo(() => {
    const grouped = {};
    for (let i = 1; i <= durationWeeks; i++) grouped[i] = [];
    tasks.forEach(task => {
      const week = task.weekNumber || 1;
      if (grouped[week]) grouped[week].push(task);
      else grouped[week] = [task];
    });
    Object.keys(grouped).forEach(week => {
      grouped[week].sort((a, b) => (a.dayNumber || 999) - (b.dayNumber || 999));
    });
    return grouped;
  }, [tasks, durationWeeks]);

  const weeks = Array.from({ length: durationWeeks }, (_, i) => i + 1);
  const hasTasks = tasks.length > 0;

  const toggleWeek = (week) => {
    setExpandedWeek(expandedWeek === week ? null : week);
  };

  if (!hasTasks) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400 italic">
        No tasks to display in timeline.
      </div>
    );
  }

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `120px repeat(${durationWeeks}, minmax(160px, 1fr))`,
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm custom-scrollbar">
      <div style={{ minWidth: `${120 + durationWeeks * 160}px` }}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 border-b border-gray-200 dark:border-gray-700">
          <div style={gridStyle}>
            <div className="p-3 font-semibold text-gray-700 dark:text-gray-200 border-r border-gray-200 dark:border-gray-700">
              Week
            </div>
            {weeks.map(week => {
              const weekTasks = tasksByWeek[week];
              const completedCount = weekTasks.filter(t => t.completed).length;
              const totalCount = weekTasks.length;
              const allCompleted = totalCount > 0 && completedCount === totalCount;
              return (
                <div key={week} className="p-3 text-center border-l border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-semibold">Week {week}</span>
                    {totalCount > 0 && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className={allCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                          {completedCount}/{totalCount}
                        </span>
                        {allCompleted && <CheckCircle size={12} className="text-green-500" />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tasks row */}
        <div className="bg-white/50 dark:bg-gray-800/30">
          <div style={gridStyle}>
            <div className="p-3 text-sm font-medium text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
              Tasks
            </div>
            {weeks.map(week => {
              const weekTasks = tasksByWeek[week];
              const isExpanded = expandedWeek === week;
              const visibleTasks = isExpanded ? weekTasks : weekTasks.slice(0, 3);
              const hasMore = weekTasks.length > 3;
              return (
                <div key={week} className="p-3 border-l border-gray-200 dark:border-gray-700">
                  {weekTasks.length === 0 ? (
                    <div className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-2">—</div>
                  ) : (
                    <div>
                      <div className="flex flex-wrap gap-1.5">
                        {visibleTasks.map(task => (
                          <div
                            key={task.id}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 cursor-help ${
                              task.completed
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200'
                                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200' // changed from purple to indigo
                            }`}
                            title={task.description}
                          >
                            {task.completed ? <CheckCircle size={10} /> : <Circle size={10} />}
                            <span className="max-w-[100px] truncate">{task.description}</span>
                          </div>
                        ))}
                        {hasMore && (
                          <button
                            onClick={() => toggleWeek(week)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                            title={isExpanded ? "Show fewer tasks" : `Show all ${weekTasks.length} tasks`}
                          >
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {isExpanded ? 'show less' : `${weekTasks.length - 3} more`}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isDarkMode ? '#1f2937' : '#f3f4f6'};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#6b7280' : '#d1d5db'};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? '#9ca3af' : '#9ca3af'};
        }
      `}</style>
    </div>
  );
};

export default RoadmapTimeline;