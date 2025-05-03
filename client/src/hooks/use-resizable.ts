import { useState, useRef, useEffect } from 'react';

interface ResizableOptions {
  initialSize: number;
  minSize: number;
  maxSize: number;
  direction: 'vertical' | 'horizontal';
}

export function useResizable({ initialSize, minSize, maxSize, direction }: ResizableOptions) {
  const [size, setSize] = useState(initialSize);
  const elementRef = useRef<HTMLDivElement>(null);
  
  // For keeping track of resize state
  const resizeRef = useRef({
    isResizing: false,
    startPosition: 0,
    startSize: 0
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current.isResizing) return;
      
      const cursorPosition = direction === 'vertical' ? e.clientY : e.clientX;
      const delta = cursorPosition - resizeRef.current.startPosition;
      
      // For vertical resizing, a positive delta means making the element smaller (moving the divider up)
      // For horizontal resizing, a positive delta means making the element larger (moving the divider right)
      const newSize = direction === 'vertical'
        ? resizeRef.current.startSize - delta
        : resizeRef.current.startSize + delta;
      
      // Clamp size between min and max
      const clampedSize = Math.max(minSize, Math.min(maxSize, newSize));
      setSize(clampedSize);
    };

    const handleMouseUp = () => {
      if (resizeRef.current.isResizing) {
        resizeRef.current.isResizing = false;
        document.body.classList.remove('select-none');
      }
    };

    if (resizeRef.current.isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [direction, minSize, maxSize]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current.isResizing = true;
    resizeRef.current.startPosition = direction === 'vertical' ? e.clientY : e.clientX;
    resizeRef.current.startSize = size;
    document.body.classList.add('select-none');
  };

  return {
    size,
    elementRef,
    handleResizeStart,
  };
}
