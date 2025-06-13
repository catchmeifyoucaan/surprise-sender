import React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date...',
  className = '',
  disabled = false,
  minDate,
  maxDate
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (date: Date | undefined) => {
    onChange(date);
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
          {value ? format(value, 'PPP') : placeholder}
        </span>
        <CalendarIcon className="h-5 w-5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full">
          <div className="bg-gray-800 rounded-lg shadow-lg p-4">
            <DayPicker
              mode="single"
              selected={value}
              onSelect={handleSelect}
              disabled={disabled}
              fromDate={minDate}
              toDate={maxDate}
              className="!bg-gray-800"
              classNames={{
                months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
                month: 'space-y-4',
                caption: 'flex justify-center pt-1 relative items-center',
                caption_label: 'text-sm font-medium text-white',
                nav: 'space-x-1 flex items-center',
                nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white',
                nav_button_previous: 'absolute left-1',
                nav_button_next: 'absolute right-1',
                table: 'w-full border-collapse space-y-1',
                head_row: 'flex',
                head_cell: 'text-gray-400 rounded-md w-9 font-normal text-[0.8rem]',
                row: 'flex w-full mt-2',
                cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-gray-700 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                day: 'h-9 w-9 font-normal aria-selected:opacity-100 text-white',
                day_selected: 'bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white',
                day_today: 'bg-gray-700 text-white',
                day_outside: 'text-gray-400 opacity-50',
                day_disabled: 'text-gray-400 opacity-50',
                day_range_middle: 'aria-selected:bg-gray-700 aria-selected:text-white',
                day_hidden: 'invisible'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker; 