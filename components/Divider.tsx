import React from 'react';

interface DividerProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed' | 'dotted';
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  text?: string;
  textAlign?: 'left' | 'center' | 'right';
}

const Divider: React.FC<DividerProps> = ({
  className = '',
  orientation = 'horizontal',
  variant = 'solid',
  color = 'default',
  text,
  textAlign = 'center'
}) => {
  const colorClasses = {
    default: 'border-gray-700',
    primary: 'border-primary',
    success: 'border-green-500',
    warning: 'border-yellow-500',
    error: 'border-red-500',
    info: 'border-blue-500'
  };

  const variantClasses = {
    solid: 'border-solid',
    dashed: 'border-dashed',
    dotted: 'border-dotted'
  };

  const textAlignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  };

  if (orientation === 'vertical') {
    return (
      <div
        className={`
          h-full border-r
          ${variantClasses[variant]}
          ${colorClasses[color]}
          ${className}
        `}
      />
    );
  }

  if (text) {
    return (
      <div className={`flex items-center ${className}`}>
        <div
          className={`
            flex-1 border-t
            ${variantClasses[variant]}
            ${colorClasses[color]}
          `}
        />
        <span className={`px-4 text-sm text-gray-400 ${textAlignClasses[textAlign]}`}>
          {text}
        </span>
        <div
          className={`
            flex-1 border-t
            ${variantClasses[variant]}
            ${colorClasses[color]}
          `}
        />
      </div>
    );
  }

  return (
    <div
      className={`
        w-full border-t
        ${variantClasses[variant]}
        ${colorClasses[color]}
        ${className}
      `}
    />
  );
};

export default Divider; 