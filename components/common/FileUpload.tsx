import React, { useRef, ChangeEvent } from 'react';
import Button from './Button';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';

interface FileUploadProps {
  accept?: string;
  onChange: (file: File) => void;
  onError: (error: string) => void;
  maxSize?: number; // in bytes
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept,
  onChange,
  onError,
  maxSize = 10 * 1024 * 1024 // 10MB default
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSize) {
      onError(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
      return;
    }

    if (accept && !accept.split(',').some(type => file.name.toLowerCase().endsWith(type.replace('.', '')))) {
      onError('Invalid file type');
      return;
    }

    onChange(file);
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
      <Button
        variant="secondary"
        onClick={() => fileInputRef.current?.click()}
        icon={<ArrowUpTrayIcon className="w-5 h-5" />}
      >
        Choose File
      </Button>
    </div>
  );
}; 