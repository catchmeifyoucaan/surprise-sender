import React from 'react';

interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  isIndeterminate?: boolean;
}

const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  label,
  showValue = false,
  valuePrefix = '',
  valueSuffix = '',
  className = '',
  size = 'md',
  color = 'primary',
  isIndeterminate = false
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const colorClasses = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        {label && (
          <span className="text-sm font-medium text-gray-300">
            {label}
          </span>
        )}
        {showValue && (
          <span className="text-sm text-gray-300">
            {valuePrefix}{value}{valueSuffix}
          </span>
        )}
      </div>
      <div className={`
        w-full rounded-full bg-gray-700
        ${sizeClasses[size]}
      `}>
        <div
          className={`
            rounded-full transition-all duration-300 ease-in-out
            ${colorClasses[color]}
            ${isIndeterminate ? 'animate-progress-indeterminate' : ''}
          `}
          style={{
            width: isIndeterminate ? '100%' : `${percentage}%`
          }}
        />
      </div>
    </div>
  );
};

export default Progress; 