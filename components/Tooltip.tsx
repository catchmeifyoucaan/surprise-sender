import React from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  delay = 200,
  className = ''
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    const placements = {
      top: {
        top: triggerRect.top - tooltipRect.height - 8,
        left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
      },
      right: {
        top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
        left: triggerRect.right + 8
      },
      bottom: {
        top: triggerRect.bottom + 8,
        left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
      },
      left: {
        top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
        left: triggerRect.left - tooltipRect.width - 8
      }
    };

    setPosition(placements[placement]);
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition();
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const placementClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 -translate-y-2',
    right: 'left-full top-1/2 -translate-y-1/2 translate-x-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 translate-y-2',
    left: 'right-full top-1/2 -translate-y-1/2 -translate-x-2'
  };

  return (
    <div
      ref={triggerRef}
      className="inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`
            fixed z-50 px-2 py-1 text-sm
            bg-gray-900 text-white rounded
            shadow-lg
            transition-opacity duration-200
            ${placementClasses[placement]}
            ${className}
          `}
          style={{
            top: position.top,
            left: position.left
          }}
        >
          {content}
          <div
            className={`
              absolute w-2 h-2 bg-gray-900 transform rotate-45
              ${placement === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' : ''}
              ${placement === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2' : ''}
              ${placement === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' : ''}
              ${placement === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' : ''}
            `}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip; 