import React from 'react';
import StatsCard from './StatsCard';

interface Stat {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
}

interface StatsGridProps {
  stats: Stat[];
  className?: string;
}

const StatsGrid: React.FC<StatsGridProps> = ({ stats, className = '' }) => {
  return (
    <div
      className={`
        grid grid-cols-1 gap-6
        sm:grid-cols-2
        lg:grid-cols-3
        xl:grid-cols-4
        ${className}
      `}
    >
      {stats.map((stat, index) => (
        <StatsCard
          key={index}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          change={stat.change}
          description={stat.description}
        />
      ))}
    </div>
  );
};

export default StatsGrid; 