import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  className?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  change,
  description,
  className = ''
}) => {
  return (
    <div
      className={`
        bg-gray-800 rounded-lg shadow-lg p-6
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
        </div>
        {icon && (
          <div className="p-3 bg-primary/10 rounded-lg">
            <div className="h-6 w-6 text-primary">{icon}</div>
          </div>
        )}
      </div>

      {(change || description) && (
        <div className="mt-4 flex items-center justify-between">
          {change && (
            <div className="flex items-center">
              {change.isPositive ? (
                <ArrowUpIcon className="h-4 w-4 text-green-400" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 text-red-400" />
              )}
              <span
                className={`ml-2 text-sm font-medium ${
                  change.isPositive ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {change.value}%
              </span>
            </div>
          )}
          {description && (
            <p className="text-sm text-gray-400">{description}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsCard; 