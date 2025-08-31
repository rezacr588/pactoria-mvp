import React, { useRef, useState, useCallback } from 'react';
import {
  CloudArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { classNames } from '../../utils/classNames';
import Button from './Button';

export interface FileUploadProps {
  onFileSelect?: (files: File[]) => void;
  onFileRemove?: (index: number) => void;
  accept?: string;
  multiple?: boolean;
  maxFileSize?: number; // in MB
  maxFiles?: number;
  disabled?: boolean;
  error?: string;
  label?: string;
  description?: string;
  required?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'grid';
  showPreview?: boolean;
  uploadProgress?: { [key: string]: number };
}

interface FileWithPreview extends File {
  preview?: string;
  progress?: number;
  error?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (file: File): React.ReactNode => {
  const type = file.type;
  
  if (type.startsWith('image/')) {
    return '🖼️';
  } else if (type === 'application/pdf') {
    return '📄';
  } else if (type.startsWith('text/')) {
    return '📝';
  } else if (type.includes('spreadsheet') || type.includes('excel')) {
    return '📊';
  } else if (type.includes('presentation') || type.includes('powerpoint')) {
    return '📈';
  } else if (type.includes('word')) {
    return '📃';
  } else {
    return '📎';
  }
};

export default function FileUpload({
  onFileSelect,
  onFileRemove,
  accept,
  multiple = false,
  maxFileSize = 10, // 10MB default
  maxFiles = 5,
  disabled = false,
  error,
  label,
  description,
  required = false,
  className,
  variant = 'default',
  showPreview = true,
  uploadProgress
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (maxFileSize && file.size > maxFileSize * 1024 * 1024) {
      return `File size must be less than ${maxFileSize}MB`;
    }
    return null;
  };

  const handleFileSelect = useCallback((selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    const validFiles: FileWithPreview[] = [];

    fileArray.forEach((file) => {
      const error = validateFile(file);
      const fileWithPreview: FileWithPreview = file;
      
      if (error) {
        fileWithPreview.error = error;
      } else if (showPreview && file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }
      
      validFiles.push(fileWithPreview);
    });

    let newFiles: FileWithPreview[];
    if (multiple) {
      const totalFiles = files.length + validFiles.length;
      if (totalFiles > maxFiles) {
        validFiles.splice(maxFiles - files.length);
      }
      newFiles = [...files, ...validFiles];
    } else {
      newFiles = validFiles.slice(0, 1);
    }

    setFiles(newFiles);
    onFileSelect?.(newFiles.filter(f => !f.error));
  }, [files, multiple, maxFiles, maxFileSize, showPreview, onFileSelect]);

  const handleFileRemove = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFileRemove?.(index);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFileSelect(selectedFiles);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    if (!disabled) {
      const droppedFiles = event.dataTransfer.files;
      if (droppedFiles.length > 0) {
        handleFileSelect(droppedFiles);
      }
    }
  };

  const openFileDialog = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const renderDefaultUpload = () => (
    <div
      className={classNames(
        'border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer',
        isDragOver && !disabled
          ? 'border-primary-400 bg-primary-50/50'
          : disabled
          ? 'border-neutral-200 bg-neutral-50 cursor-not-allowed'
          : error
          ? 'border-danger-300 bg-danger-50/50 hover:bg-danger-50'
          : 'border-neutral-300 hover:border-primary-400 hover:bg-primary-50/30'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={openFileDialog}
    >
      <div className="mx-auto w-16 h-16 mb-4 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center">
        <CloudArrowUpIcon className="h-8 w-8 text-primary-600" />
      </div>
      
      <h3 className="text-lg font-semibold text-neutral-800 mb-2">
        {isDragOver ? 'Drop files here' : 'Upload files'}
      </h3>
      
      <p className="text-sm text-neutral-600 mb-4">
        Drag and drop files here, or{' '}
        <span className="text-primary-600 font-medium">browse</span> to select
      </p>
      
      {description && (
        <p className="text-xs text-neutral-500">{description}</p>
      )}
      
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-neutral-500">
        {accept && <span>Accepted: {accept}</span>}
        {maxFileSize && <span>Max size: {maxFileSize}MB</span>}
        {multiple && maxFiles && <span>Max files: {maxFiles}</span>}
      </div>
    </div>
  );

  const renderCompactUpload = () => (
    <div className="flex items-center space-x-3">
      <Button
        variant="secondary"
        onClick={openFileDialog}
        disabled={disabled}
        icon={<CloudArrowUpIcon className="h-4 w-4" />}
      >
        Choose Files
      </Button>
      <span className="text-sm text-neutral-600">
        {files.length > 0 ? `${files.length} file(s) selected` : 'No files selected'}
      </span>
    </div>
  );

  const renderFileList = () => {
    if (files.length === 0) return null;

    return (
      <div className="mt-6 space-y-3">
        <h4 className="text-sm font-medium text-neutral-700">
          Uploaded Files ({files.length})
        </h4>
        
        <div className="space-y-2">
          {files.map((file, index) => {
            const progress = uploadProgress?.[file.name] || file.progress || 0;
            
            return (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center p-3 bg-neutral-50 rounded-xl border border-neutral-200"
              >
                {/* File Icon/Preview */}
                <div className="flex-shrink-0 mr-3">
                  {showPreview && file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-10 h-10 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-white rounded-lg border border-neutral-200 flex items-center justify-center text-lg">
                      {getFileIcon(file)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-neutral-800 truncate">
                      {file.name}
                    </p>
                    {file.error ? (
                      <ExclamationTriangleIcon className="h-4 w-4 text-danger-500 flex-shrink-0" />
                    ) : progress === 100 ? (
                      <CheckCircleIcon className="h-4 w-4 text-success-500 flex-shrink-0" />
                    ) : null}
                  </div>
                  
                  <div className="flex items-center space-x-3 mt-1">
                    <span className="text-xs text-neutral-500">
                      {formatFileSize(file.size)}
                    </span>
                    
                    {file.error ? (
                      <span className="text-xs text-danger-600">{file.error}</span>
                    ) : progress > 0 && progress < 100 ? (
                      <>
                        <div className="flex-1 bg-neutral-200 rounded-full h-1.5 max-w-32">
                          <div
                            className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-neutral-600">{progress}%</span>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-3">
                  {showPreview && file.type.startsWith('image/') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Open preview modal
                      }}
                      icon={<EyeIcon className="h-4 w-4" />}
                    />
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileRemove(index);
                    }}
                    className="text-neutral-400 hover:text-danger-500"
                    icon={<XMarkIcon className="h-4 w-4" />}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderGridUpload = () => (
    <div className="grid grid-cols-2 gap-4">
      <div
        className={classNames(
          'aspect-square border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer',
          isDragOver && !disabled
            ? 'border-primary-400 bg-primary-50/50'
            : disabled
            ? 'border-neutral-200 bg-neutral-50 cursor-not-allowed'
            : 'border-neutral-300 hover:border-primary-400 hover:bg-primary-50/30'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <CloudArrowUpIcon className="h-8 w-8 text-primary-600 mb-2" />
        <span className="text-sm font-medium text-neutral-800">Upload</span>
        <span className="text-xs text-neutral-500 mt-1">Drop files here</span>
      </div>
      
      {files.slice(0, 3).map((file, index) => (
        <div key={index} className="aspect-square border rounded-2xl p-2 bg-neutral-50 relative">
          {showPreview && file.preview ? (
            <img
              src={file.preview}
              alt={file.name}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <div className="w-full h-full bg-white rounded-xl border border-neutral-200 flex items-center justify-center text-2xl">
              {getFileIcon(file)}
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleFileRemove(index);
            }}
            className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm hover:bg-white text-neutral-400 hover:text-danger-500"
            icon={<XMarkIcon className="h-3 w-3" />}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-3">
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {variant === 'compact' ? renderCompactUpload() : 
       variant === 'grid' ? renderGridUpload() : 
       renderDefaultUpload()}

      {error && (
        <p className="mt-2 text-sm text-danger-600">{error}</p>
      )}

      {variant !== 'grid' && renderFileList()}
    </div>
  );
}