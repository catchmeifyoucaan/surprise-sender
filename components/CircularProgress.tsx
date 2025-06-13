import React from 'react';

interface CircularProgressProps {
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
  thickness?: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  label,
  showValue = false,
  valuePrefix = '',
  valueSuffix = '',
  className = '',
  size = 'md',
  color = 'primary',
  isIndeterminate = false,
  thickness = 4
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = {
    sm: 20,
    md: 30,
    lg: 40
  }[size];

  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    primary: 'text-primary',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
    info: 'text-blue-500'
  };

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="relative">
        <svg
          className={`transform -rotate-90 ${colorClasses[color]}`}
          width={radius * 2}
          height={radius * 2}
        >
          <circle
            className="text-gray-700"
            strokeWidth={thickness}
            stroke="currentColor"
            fill="transparent"
            r={radius - thickness / 2}
            cx={radius}
            cy={radius}
          />
          <circle
            className={`transition-all duration-300 ease-in-out ${
              isIndeterminate ? 'animate-circular-progress' : ''
            }`}
            strokeWidth={thickness}
            strokeDasharray={circumference}
            strokeDashoffset={isIndeterminate ? 0 : strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius - thickness / 2}
            cx={radius}
            cy={radius}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-300">
              {valuePrefix}{value}{valueSuffix}
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="mt-2 text-sm font-medium text-gray-300">
          {label}
        </span>
      )}
    </div>
  );
};

export default CircularProgress; 