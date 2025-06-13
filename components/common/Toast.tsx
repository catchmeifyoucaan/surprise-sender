import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type,
  onClose,
  duration = 5000
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeClasses = {
    success: 'bg-green-500/20 text-green-400 border-green-500/50',
    error: 'bg-red-500/20 text-red-400 border-red-500/50',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/50'
  };

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50
        flex items-center p-4 rounded-lg border
        shadow-lg backdrop-blur-sm
        ${typeClasses[type]}
        animate-slide-up
      `}
    >
      <p className="mr-4">{message}</p>
      <button
        onClick={onClose}
        className="text-current hover:opacity-75 transition-opacity"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Toast; 