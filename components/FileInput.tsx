import React from 'react';
import { DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FileInputProps {
  value: File | null;
  onChange: (file: File | null) => void;
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
  disabled?: boolean;
  accept?: string;
  maxSize?: number; // in bytes
}

const FileInput: React.FC<FileInputProps> = ({
  value,
  onChange,
  label,
  error,
  helperText,
  className = '',
  disabled = false,
  accept,
  maxSize
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    
    if (file && maxSize && file.size > maxSize) {
      alert(`File size exceeds the maximum limit of ${maxSize / 1024 / 1024}MB`);
      return;
    }

    onChange(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (disabled) return;

    const file = event.dataTransfer.files?.[0] || null;
    
    if (file && maxSize && file.size > maxSize) {
      alert(`File size exceeds the maximum limit of ${maxSize / 1024 / 1024}MB`);
      return;
    }

    onChange(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleRemove = () => {
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-4
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${error ? 'border-red-500' : 'border-gray-700'}
          hover:border-primary transition-colors
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept={accept}
          disabled={disabled}
        />

        {value ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DocumentIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-300">{value.name}</span>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="text-gray-400 hover:text-red-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        ) : (
          <div className="text-center">
            <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-1 text-sm text-gray-300">
              Drag and drop a file here, or click to select
            </p>
            {maxSize && (
              <p className="mt-1 text-xs text-gray-400">
                Maximum file size: {maxSize / 1024 / 1024}MB
              </p>
            )}
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

export default FileInput; 