import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  animated?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = 'md',
  animated = true
}) => {
  const getRoundedClass = () => {
    switch (rounded) {
      case 'none':
        return '';
      case 'sm':
        return 'rounded-sm';
      case 'md':
        return 'rounded-md';
      case 'lg':
        return 'rounded-lg';
      case 'full':
        return 'rounded-full';
      default:
        return 'rounded-md';
    }
  };

  const getAnimationClass = () => {
    return animated ? 'animate-pulse' : '';
  };

  const style: React.CSSProperties = {};
  if (width) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height) {
    style.height = typeof height === 'number' ? `${height}px` : height;
  }

  return (
    <div
      className={`bg-gray-200 ${getRoundedClass()} ${getAnimationClass()} ${className}`}
      style={style}
    />
  );
};

// Predefined skeleton components
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
  lineHeight?: string;
}> = ({ lines = 1, className = '', lineHeight = 'h-4' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        className={`${lineHeight} ${index === lines - 1 ? 'w-3/4' : 'w-full'}`}
        animated={true}
      />
    ))}
  </div>
);

export const SkeletonAvatar: React.FC<{
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <Skeleton
      className={`${sizeClasses[size]} rounded-full ${className}`}
      animated={true}
    />
  );
};

export const SkeletonCard: React.FC<{
  className?: string;
  showAvatar?: boolean;
  showImage?: boolean;
}> = ({ className = '', showAvatar = false, showImage = false }) => (
  <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
    {showAvatar && (
      <div className="flex items-center space-x-3 mb-4">
        <SkeletonAvatar size="md" />
        <div className="flex-1">
          <SkeletonText lines={2} />
        </div>
      </div>
    )}
    
    {showImage && (
      <Skeleton className="w-full h-48 mb-4" />
    )}
    
    <SkeletonText lines={3} />
    
    <div className="flex justify-between items-center mt-4">
      <Skeleton className="w-20 h-4" />
      <Skeleton className="w-16 h-4" />
    </div>
  </div>
);

export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className = '' }) => (
  <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
    {/* Header */}
    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-4 flex-1" />
        ))}
      </div>
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="px-4 py-3 border-b border-gray-100 last:border-b-0">
        <div className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonList: React.FC<{
  items?: number;
  className?: string;
  showAvatar?: boolean;
}> = ({ items = 5, className = '', showAvatar = false }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg">
        {showAvatar && <SkeletonAvatar size="sm" />}
        <div className="flex-1">
          <SkeletonText lines={2} />
        </div>
        <Skeleton className="w-16 h-4" />
      </div>
    ))}
  </div>
);

export default Skeleton; 