import React from 'react';
import Radio from './Radio';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
  name: string;
  orientation?: 'horizontal' | 'vertical';
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onChange,
  options,
  label,
  error,
  helperText,
  className = '',
  disabled = false,
  name,
  orientation = 'vertical'
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className={`
        ${orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-2'}
      `}>
        {options.map((option) => (
          <Radio
            key={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            label={option.label}
            disabled={disabled || option.disabled}
            name={name}
            value={option.value}
          />
        ))}
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

export default RadioGroup; 