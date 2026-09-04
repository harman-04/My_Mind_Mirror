// src/components/InfiniteScrollTrigger.jsx
import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

const InfiniteScrollTrigger = ({ onIntersect, isLoading, hasNextPage }) => {
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!triggerRef.current || isLoading || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasNextPage) {
          onIntersect();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, [onIntersect, isLoading, hasNextPage]);

  if (!hasNextPage) return null;

  return (
    <div ref={triggerRef} className="flex justify-center py-6 w-full">
      {isLoading && (
        <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-black/20 backdrop-blur-sm rounded-full shadow-sm border border-gray-200 dark:border-gray-700/50">
           <Loader2 size={18} className="animate-spin text-purple-500 dark:text-purple-400" />
           <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Loading more...</span>
        </div>
      )}
    </div>
  );
};

export default React.memo(InfiniteScrollTrigger);