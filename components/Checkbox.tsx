import React from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
  indeterminate?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  error,
  helperText,
  className = '',
  disabled = false,
  indeterminate = false
}) => {
  const checkboxRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <div className={className}>
      <label className="flex items-center space-x-2">
        <div className="relative">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className={`
              h-5 w-5 rounded border
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${error ? 'border-red-500' : 'border-gray-700'}
              ${checked ? 'bg-primary border-primary' : 'bg-gray-800'}
            `}
          />
          {checked && !indeterminate && (
            <CheckIcon className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-white" />
          )}
          {indeterminate && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-0.5 w-3 bg-white" />
          )}
        </div>
        {label && (
          <span className={`
            text-sm
            ${disabled ? 'text-gray-500' : 'text-gray-300'}
          `}>
            {label}
          </span>
        )}
      </label>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

export default Checkbox; 