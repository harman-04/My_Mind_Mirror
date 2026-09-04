// src/components/RoadmapTimeline.jsx
import React, { useMemo, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { CheckCircle, Circle, ChevronDown, ChevronUp, Target } from 'lucide-react';

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
      <div className="flex flex-col items-center justify-center py-12 lg:py-16 px-4 text-center bg-white/40 dark:bg-black/20 rounded-2xl lg:rounded-3xl border border-gray-200/50 dark:border-white/5 backdrop-blur-sm shadow-inner">
        <div className="w-16 h-16 lg:w-20 lg:h-20 mb-4 rounded-full bg-gradient-to-br from-purple-100 to-teal-100 dark:from-purple-900/20 dark:to-teal-900/20 flex items-center justify-center shadow-sm">
          <Target className="w-8 h-8 lg:w-10 lg:h-10 text-purple-400 dark:text-teal-400 opacity-80" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-bold font-poppins text-lg lg:text-xl">
          No roadmap timeline available yet.
        </p>
      </div>
    );
  }

  // 💡 Increased minimum column width for better readability on Desktop
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `100px repeat(${durationWeeks}, minmax(200px, 1fr))`,
  };

  return (
    <div className="overflow-x-auto rounded-2xl lg:rounded-3xl border border-white/40 dark:border-white/10 shadow-lg bg-white/60 dark:bg-[#131127]/60 backdrop-blur-xl custom-scrollbar transition-all duration-300 hover:shadow-xl">
      <div style={{ minWidth: `${100 + durationWeeks * 200}px` }}>

        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#1A162F]/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 shadow-sm">
          <div style={gridStyle} className="divide-x divide-gray-200/50 dark:divide-white/5">
            <div className="p-4 flex items-center justify-center font-bold text-xs lg:text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Timeline
            </div>
            {weeks.map(week => {
              const weekTasks = tasksByWeek[week];
              const completedCount = weekTasks.filter(t => t.completed).length;
              const totalCount = weekTasks.length;
              const allCompleted = totalCount > 0 && completedCount === totalCount;

              return (
                <div key={week} className="p-4 text-center flex flex-col items-center justify-center group hover:bg-gray-50/50 dark:hover:bg-black/20 transition-colors">
                  <span className="text-sm lg:text-base font-poppins font-extrabold text-gray-800 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-teal-400 transition-colors">
                    Week {week}
                  </span>
                  {totalCount > 0 ? (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className={`px-2.5 py-0.5 rounded-md text-[10px] lg:text-xs font-bold tracking-wider border shadow-sm ${allCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-white text-gray-600 border-gray-200 dark:bg-black/20 dark:text-gray-400 dark:border-white/5'}`}>
                        {completedCount}/{totalCount}
                      </div>
                      {allCompleted && <CheckCircle className="w-4 h-4 text-emerald-500 drop-shadow-sm" />}
                    </div>
                  ) : (
                    <span className="text-[10px] lg:text-xs font-bold text-gray-400 mt-1.5 uppercase tracking-wider">Empty</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tasks Row */}
        <div>
          <div style={gridStyle} className="divide-x divide-gray-200/50 dark:divide-white/5">
            <div className="p-4 lg:p-5 flex items-start justify-center text-xs lg:text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pt-6 bg-gray-50/30 dark:bg-black/10">
              Tasks
            </div>
            {weeks.map(week => {
              const weekTasks = tasksByWeek[week];
              const isExpanded = expandedWeek === week;
              const visibleTasks = isExpanded ? weekTasks : weekTasks.slice(0, 3);
              const hasMore = weekTasks.length > 3;

              return (
                <div key={week} className="p-4 lg:p-5 min-h-[120px] hover:bg-white/20 dark:hover:bg-white/5 transition-colors">
                  {weekTasks.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-300 dark:text-gray-600 font-light text-2xl">—</div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {visibleTasks.map(task => (
                        <div
                          key={task.id}
                          className={`group flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs lg:text-sm font-semibold border shadow-sm transition-all duration-200 hover:scale-[1.02] cursor-help ${
                            task.completed
                              ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                              : 'bg-white/80 text-gray-800 border-gray-200/80 dark:bg-[#1A162F] dark:text-gray-200 dark:border-white/10 hover:border-purple-300 dark:hover:border-teal-500/50'
                          }`}
                          title={task.description}
                        >
                          <div className="mt-0.5 shrink-0">
                            {task.completed ? (
                                <CheckCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-emerald-500 dark:text-emerald-400" />
                            ) : (
                                <Circle className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-purple-400 dark:text-teal-500" />
                            )}
                          </div>
                          <span className="truncate leading-snug group-hover:whitespace-normal group-hover:z-50 relative">
                              {task.description}
                          </span>
                        </div>
                      ))}

                      {hasMore && (
                        <button
                          onClick={() => toggleWeek(week)}
                          className="mt-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs lg:text-sm font-bold bg-purple-50/50 text-purple-700 border border-purple-100 hover:bg-purple-100 hover:border-purple-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20 dark:hover:bg-teal-500/20 transition-all active:scale-95 shadow-sm"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {isExpanded ? 'Show less' : `+${weekTasks.length - 3} more`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>


    </div>
  );
};

export default React.memo(RoadmapTimeline);