import React from 'react';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
  showValue?: boolean;
  valuePrefix?: string;
  valueSuffix?: string;
  marks?: { value: number; label: string }[];
}

const Slider: React.FC<SliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  error,
  helperText,
  className = '',
  disabled = false,
  showValue = false,
  valuePrefix = '',
  valueSuffix = '',
  marks = []
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        {label && (
          <label className="block text-sm font-medium text-gray-300">
            {label}
          </label>
        )}
        {showValue && (
          <span className="text-sm text-gray-300">
            {valuePrefix}{value}{valueSuffix}
          </span>
        )}
      </div>
      <div className="relative">
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={`
            w-full h-2 rounded-lg appearance-none cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-800
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${error ? 'border-red-500' : ''}
            bg-gray-700
          `}
          style={{
            background: `linear-gradient(to right, var(--color-primary) ${percentage}%, var(--color-gray-700) ${percentage}%)`
          }}
        />
        {marks.length > 0 && (
          <div className="relative mt-2">
            {marks.map((mark) => {
              const markPercentage = ((mark.value - min) / (max - min)) * 100;
              return (
                <div
                  key={mark.value}
                  className="absolute transform -translate-x-1/2"
                  style={{ left: `${markPercentage}%` }}
                >
                  <div className="h-1 w-1 rounded-full bg-gray-500" />
                  <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400">
                    {mark.label}
                  </span>
                </div>
              );
            })}
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

export default Slider; 