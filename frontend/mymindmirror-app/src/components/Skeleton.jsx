// src/components/Skeleton.jsx
import React from 'react';

// Common wrapper for smooth pulsating
const PulseWrapper = ({ children, className = "" }) => (
  <div className={`animate-pulse ${className}`}>
    {children}
  </div>
);

export const SkeletonText = ({ lines = 1, className = '' }) => (
  <PulseWrapper className={`space-y-3 ${className}`}>
    {Array(lines).fill(0).map((_, i) => (
      <div
        key={i}
        className="h-4 bg-gray-200/80 dark:bg-white/5 rounded-full"
        style={{ width: `${Math.max(60, 100 - (i * 15))}%` }}
      />
    ))}
  </PulseWrapper>
);

export const SkeletonCard = ({ count = 1 }) => (
  <PulseWrapper className="space-y-4 lg:space-y-6">
    {Array(count).fill(0).map((_, i) => (
      <div
        key={i}
        className="p-5 lg:p-6 rounded-2xl lg:rounded-3xl bg-white/40 dark:bg-[#131127]/60 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm"
      >
        <div className="flex justify-between items-center mb-4 lg:mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-full bg-gray-200/80 dark:bg-white/5" />
            <div className="h-5 lg:h-6 w-32 lg:w-48 bg-gray-200/80 dark:bg-white/5 rounded-full" />
          </div>
          <div className="h-6 w-20 lg:w-24 bg-gray-200/80 dark:bg-white/5 rounded-full" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-200/80 dark:bg-white/5 rounded-full" />
          <div className="h-4 w-5/6 bg-gray-200/80 dark:bg-white/5 rounded-full" />
        </div>
      </div>
    ))}
  </PulseWrapper>
);

export const SkeletonChart = () => (
  <PulseWrapper className="h-[250px] sm:h-[300px] lg:h-[350px] w-full rounded-2xl lg:rounded-3xl bg-gradient-to-br from-gray-100/50 to-gray-200/50 dark:from-[#1A162F]/40 dark:to-[#131127]/40 border border-gray-200/50 dark:border-white/5 flex flex-col items-center justify-center gap-4">
    <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full border-4 border-gray-200 dark:border-white/10 border-t-purple-400 dark:border-t-teal-400 animate-spin" />
    <div className="text-sm lg:text-base font-medium text-gray-500 dark:text-gray-400 tracking-wide font-poppins">Loading data...</div>
  </PulseWrapper>
);