import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  description?: string;
  className?: string;
  id?: string;
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  description,
  className = '',
  id
}) => {
  const sizeClasses = {
    sm: {
      switch: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translate: 'translate-x-4'
    },
    md: {
      switch: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5'
    },
    lg: {
      switch: 'w-14 h-7',
      thumb: 'w-6 h-6',
      translate: 'translate-x-7'
    }
  };

  const currentSize = sizeClasses[size];

  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        className={`
          relative inline-flex items-center ${currentSize.switch} rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          ${checked 
            ? 'bg-blue-600 hover:bg-blue-700' 
            : 'bg-gray-200 hover:bg-gray-300'
          }
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer'
          }
        `}
      >
        <span
          className={`
            inline-block ${currentSize.thumb} bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out
            ${checked ? currentSize.translate : 'translate-x-0'}
          `}
        />
      </button>
      
      {(label || description) && (
        <div className="ml-3">
          {label && (
            <label 
              htmlFor={id}
              className={`
                text-sm font-medium
                ${disabled ? 'text-gray-400' : 'text-gray-900'}
              `}
            >
              {label}
            </label>
          )}
          {description && (
            <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-500'}`}>
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Switch; 