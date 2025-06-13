import React from 'react';
import Button from './Button';
import { UploadIcon } from '../../constants';

export interface FileInputProps {
  label: string;
  name: string;
  onFileSelect: (fileOrString: File | string | null) => void;
  currentValue: File | string | null;
  accept?: string;
  buttonText?: string;
  wrapperClassName?: string;
}

const FileInput: React.FC<FileInputProps> = ({
  label,
  name,
  onFileSelect,
  currentValue,
  accept,
  buttonText = 'Upload File',
  wrapperClassName = ''
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onFileSelect(file);
  };

  const handleRemove = () => {
    onFileSelect(null);
  };

  return (
    <div className={`space-y-2 ${wrapperClassName}`}>
      <label className="block text-sm font-medium text-text-primary">
        {label}
      </label>
      <div className="flex items-center space-x-2">
        <input
          type="file"
          name={name}
          onChange={handleFileChange}
          accept={accept}
          className="hidden"
          id={`file-input-${name}`}
        />
        <label
          htmlFor={`file-input-${name}`}
          className="flex-1"
        >
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            leftIcon={<UploadIcon className="w-4 h-4" />}
          >
            {buttonText}
          </Button>
        </label>
        {currentValue && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-text-secondary truncate max-w-[200px]">
              {typeof currentValue === 'string' ? currentValue : currentValue.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileInput;
