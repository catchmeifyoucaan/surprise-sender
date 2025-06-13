import React from 'react';

interface RadioProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  value: string;
}

const Radio: React.FC<RadioProps> = ({
  checked,
  onChange,
  label,
  error,
  helperText,
  className = '',
  disabled = false,
  name,
  value
}) => {
  return (
    <div className={className}>
      <label className="flex items-center space-x-2">
        <div className="relative">
          <input
            type="radio"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            name={name}
            value={value}
            className={`
              h-5 w-5 border-2
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${error ? 'border-red-500' : 'border-gray-700'}
              ${checked ? 'border-primary' : 'bg-gray-800'}
              rounded-full
            `}
          />
          {checked && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 bg-primary rounded-full" />
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

export default Radio; 