import React from 'react';
import { format } from 'date-fns';
import { ClockIcon } from '@heroicons/react/24/outline';

interface TimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  format?: string;
  interval?: number;
}

const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select time...',
  className = '',
  disabled = false,
  format: timeFormat = 'HH:mm',
  interval = 15
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const generateTimeOptions = () => {
    const options = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    while (start <= end) {
      options.push(new Date(start));
      start.setMinutes(start.getMinutes() + interval);
    }

    return options;
  };

  const timeOptions = generateTimeOptions();

  const handleSelect = (time: Date) => {
    if (value) {
      const newDate = new Date(value);
      newDate.setHours(time.getHours(), time.getMinutes());
      onChange(newDate);
    } else {
      onChange(time);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between
          px-3 py-2 text-left
          border border-gray-700 rounded-lg
          bg-gray-800 text-white
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className="block truncate">
          {value ? format(value, timeFormat) : placeholder}
        </span>
        <ClockIcon className="h-5 w-5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full">
          <div className="bg-gray-800 rounded-lg shadow-lg p-2 max-h-60 overflow-y-auto">
            {timeOptions.map((time) => (
              <button
                key={time.toISOString()}
                type="button"
                onClick={() => handleSelect(time)}
                className={`
                  w-full px-3 py-2 text-left text-sm
                  hover:bg-gray-700 rounded-md
                  ${
                    value && format(value, timeFormat) === format(time, timeFormat)
                      ? 'bg-primary text-white'
                      : 'text-gray-300'
                  }
                `}
              >
                {format(time, timeFormat)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker; 