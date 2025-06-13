import React from 'react';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface MultiSelectOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  maxDisplayed?: number;
  searchable?: boolean;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select options',
  label,
  error,
  helperText,
  className = '',
  disabled = false,
  size = 'md',
  fullWidth = false,
  maxDisplayed = 3,
  searchable = false
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-base',
    lg: 'h-12 text-lg'
  };

  const selectedOptions = options.filter(option => value.includes(option.value));
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  React.useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleOptionClick = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const handleRemoveOption = (optionValue: string) => {
    onChange(value.filter(v => v !== optionValue));
  };

  const handleRemoveAll = () => {
    onChange([]);
  };

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
          <div className="flex flex-wrap items-center gap-1 flex-1">
            {selectedOptions.length > 0 ? (
              <>
                {selectedOptions.slice(0, maxDisplayed).map(option => (
                  <span
                    key={option.value}
                    className="inline-flex items-center px-2 py-0.5 rounded bg-gray-700 text-sm"
                  >
                    {option.icon && (
                      <span className="w-4 h-4 mr-1">{option.icon}</span>
                    )}
                    {option.label}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveOption(option.value);
                      }}
                      className="ml-1 text-gray-400 hover:text-gray-300"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </span>
                ))}
                {selectedOptions.length > maxDisplayed && (
                  <span className="text-sm text-gray-400">
                    +{selectedOptions.length - maxDisplayed} more
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {selectedOptions.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveAll();
                }}
                className="text-gray-400 hover:text-gray-300"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
            <ChevronDownIcon
              className={`
                w-5 h-5 text-gray-400
                transform transition-transform duration-200
                ${isOpen ? 'rotate-180' : ''}
              `}
            />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
            {searchable && (
              <div className="p-2 border-b border-gray-700">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            )}
            <div className="max-h-60 overflow-auto">
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleOptionClick(option.value)}
                  disabled={option.disabled}
                  className={`
                    w-full flex items-center space-x-2
                    px-3 py-2
                    ${sizeClasses[size]}
                    text-left
                    ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-700'}
                    ${value.includes(option.value) ? 'bg-gray-700 text-white' : 'text-gray-300'}
                  `}
                >
                  {option.icon && (
                    <span className="w-5 h-5">{option.icon}</span>
                  )}
                  <span className="block truncate">{option.label}</span>
                </button>
              ))}
              {filteredOptions.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-400">
                  No options found
                </div>
              )}
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

export default MultiSelect; 