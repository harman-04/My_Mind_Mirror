import React, { useEffect, useRef } from 'react';

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
    <div ref={triggerRef} className="flex justify-center py-4">
      {isLoading && <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>}
    </div>
  );
};

export default InfiniteScrollTrigger;