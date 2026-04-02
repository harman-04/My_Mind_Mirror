import React from 'react';

export const SkeletonText = ({ lines = 1, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array(lines).fill(0).map((_, i) => (
      <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    ))}
  </div>
);

export const SkeletonCard = ({ count = 1 }) => (
  <div className="space-y-4">
    {Array(count).fill(0).map((_, i) => (
      <div
        key={i}
        className="p-4 rounded-lg bg-white/60 dark:bg-black/40 border border-white/20 dark:border-slate-800 animate-pulse"
      >
        <div className="flex justify-between mb-3">
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    ))}
  </div>
);

export const SkeletonChart = () => (
  <div className="h-80 w-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
    <div className="text-gray-400">Loading chart...</div>
  </div>
);