import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface PopoverProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  showCloseButton?: boolean;
  trigger?: React.ReactElement;
}

const Popover: React.FC<PopoverProps> = ({
  isOpen,
  onClose,
  children,
  title,
  placement = 'bottom',
  className = '',
  showCloseButton = true,
  trigger
}) => {
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !popoverRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();

    const placements = {
      top: {
        top: triggerRect.top - popoverRect.height - 8,
        left: triggerRect.left + (triggerRect.width - popoverRect.width) / 2
      },
      right: {
        top: triggerRect.top + (triggerRect.height - popoverRect.height) / 2,
        left: triggerRect.right + 8
      },
      bottom: {
        top: triggerRect.bottom + 8,
        left: triggerRect.left + (triggerRect.width - popoverRect.width) / 2
      },
      left: {
        top: triggerRect.top + (triggerRect.height - popoverRect.height) / 2,
        left: triggerRect.left - popoverRect.width - 8
      }
    };

    setPosition(placements[placement]);
  };

  React.useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, placement]);

  const placementClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 -translate-y-2',
    right: 'left-full top-1/2 -translate-y-1/2 translate-x-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 translate-y-2',
    left: 'right-full top-1/2 -translate-y-1/2 -translate-x-2'
  };

  return (
    <div className="relative inline-block">
      {trigger && (
        <div ref={triggerRef}>
          {trigger}
        </div>
      )}
      {isOpen && (
        <div
          ref={popoverRef}
          className={`
            fixed z-50
            bg-gray-800 border border-gray-700 rounded-lg shadow-lg
            min-w-[200px] max-w-sm
            ${placementClasses[placement]}
            ${className}
          `}
          style={{
            top: position.top,
            left: position.left
          }}
        >
          {title && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <h3 className="text-sm font-medium text-gray-300">{title}</h3>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
          <div className="p-4">
            {children}
          </div>
          <div
            className={`
              absolute w-2 h-2 bg-gray-800 border border-gray-700 transform rotate-45
              ${placement === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-t-0 border-l-0' : ''}
              ${placement === 'right' ? 'left-[-5px] top-1/2 -translate-y-1/2 border-t-0 border-r-0' : ''}
              ${placement === 'bottom' ? 'top-[-5px] left-1/2 -translate-x-1/2 border-b-0 border-l-0' : ''}
              ${placement === 'left' ? 'right-[-5px] top-1/2 -translate-y-1/2 border-b-0 border-r-0' : ''}
            `}
          />
        </div>
      )}
    </div>
  );
};

export default Popover; 