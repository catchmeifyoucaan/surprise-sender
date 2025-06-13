import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  className?: string;
  value?: File[];
  onChange?: (files: File[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept,
  maxFiles = 1,
  maxSize = 5242880, // 5MB
  className = '',
  value = [],
  onChange
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileSelect(acceptedFiles);
      if (onChange) {
        onChange(acceptedFiles);
      }
    },
    [onFileSelect, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize
  });

  const removeFile = (index: number) => {
    const newFiles = [...value];
    newFiles.splice(index, 1);
    if (onChange) {
      onChange(newFiles);
    }
  };

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6
          flex flex-col items-center justify-center
          cursor-pointer transition-colors
          ${
            isDragActive
              ? 'border-primary bg-primary/10'
              : 'border-gray-700 hover:border-primary'
          }
        `}
      >
        <input {...getInputProps()} />
        <CloudArrowUpIcon className="h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-400">
          {isDragActive
            ? 'Drop the files here...'
            : 'Drag and drop files here, or click to select files'}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Max file size: {maxSize / 1024 / 1024}MB
          {maxFiles > 1 ? ` • Max files: ${maxFiles}` : ''}
        </p>
      </div>

      {value.length > 0 && (
        <div className="mt-4 space-y-2">
          {value.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-800 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-300">{file.name}</span>
                <span className="text-xs text-gray-500">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-gray-400 hover:text-red-400"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload; 