import React, { useState, ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 300,
}) => {
  const [show, setShow] = useState(false);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);

  const handleMouseEnter = () => {
    const id = window.setTimeout(() => {
      setShow(true);
    }, delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setShow(false);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 mb-1';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 translate-y-2 mt-1';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 -translate-x-2 mr-1';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 translate-x-2 ml-1';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 -translate-y-1 mb-1';
    }
  };

  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {show && (
        <div
          className={`absolute z-50 px-2 py-1 text-xs font-medium text-white bg-black/80 rounded-md whitespace-nowrap pointer-events-none opacity-90 backdrop-blur-sm ${getPositionClasses()}`}
          style={{ maxWidth: '200px' }}
        >
          {content}
          <div
            className={`absolute w-2 h-2 bg-black/80 transform rotate-45 ${
              position === 'top'
                ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2'
                : position === 'bottom'
                ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2'
                : position === 'left'
                ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2'
                : 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2'
            }`}
          />
        </div>
      )}
    </div>
  );
}; 