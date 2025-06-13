import React from 'react';
import { HexColorPicker } from 'react-colorful';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  label,
  error,
  helperText,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full h-10 rounded-lg border
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${error ? 'border-red-500' : 'border-gray-700'}
          `}
          style={{ backgroundColor: value }}
        />

        {isOpen && (
          <div className="absolute z-10 mt-2">
            <div className="bg-gray-800 rounded-lg shadow-lg p-4">
              <HexColorPicker color={value} onChange={onChange} />
              <div className="mt-2 flex items-center space-x-2">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
                  placeholder="#000000"
                />
              </div>
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

export default ColorPicker; 