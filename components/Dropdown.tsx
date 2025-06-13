import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface DropdownOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  error,
  helperText,
  className = '',
  disabled = false,
  size = 'md',
  fullWidth = false
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-base',
    lg: 'h-12 text-lg'
  };

  const selectedOption = options.find(option => option.value === value);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div ref={dropdownRef}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full flex items-center justify-between
            px-3 py-2
            ${sizeClasses[size]}
            border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${error ? 'border-red-500' : 'border-gray-700'}
            bg-gray-800 text-gray-300
          `}
        >
          <div className="flex items-center space-x-2">
            {selectedOption?.icon && (
              <span className="w-5 h-5">{selectedOption.icon}</span>
            )}
            <span className="block truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronDownIcon
            className={`
              w-5 h-5 text-gray-400
              transform transition-transform duration-200
              ${isOpen ? 'rotate-180' : ''}
            `}
          />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
            <div className="max-h-60 overflow-auto">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  disabled={option.disabled}
                  className={`
                    w-full flex items-center space-x-2
                    px-3 py-2
                    ${sizeClasses[size]}
                    text-left
                    ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-700'}
                    ${option.value === value ? 'bg-gray-700 text-white' : 'text-gray-300'}
                  `}
                >
                  {option.icon && (
                    <span className="w-5 h-5">{option.icon}</span>
                  )}
                  <span className="block truncate">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

export default Dropdown; 