/**
 * File Upload Service
 * Handles file uploads with proper error handling, progress tracking, and validation
 */

import { env } from '../config/env';
import { api } from './api';

export interface FileUploadOptions {
  onProgress?: (progress: number) => void;
  onComplete?: (result: FileUploadResult) => void;
  onError?: (error: FileUploadError) => void;
  maxSize?: number; // in MB
  allowedTypes?: string[];
  multiple?: boolean;
}

export interface FileUploadResult {
  file_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  upload_url?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface FileUploadErrorDetails {
  code: string;
  message: string;
  details?: any;
}

export class FileUploadError extends Error {
  constructor(public details: FileUploadErrorDetails) {
    super(details.message);
    this.name = 'FileUploadError';
  }
}

export interface FileValidation {
  isValid: boolean;
  errors: string[];
}

class FileUploadService {
  private readonly MAX_FILE_SIZE_MB = 10; // 10MB default
  private readonly ALLOWED_TYPES = ['.pdf', '.docx', '.txt', '.doc'];
  // private readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks for large files (reserved for chunked uploads)

  /**
   * Validate file before upload
   */
  validateFile(file: File, options?: Partial<FileUploadOptions>): FileValidation {
    const errors: string[] = [];
    const maxSize = (options?.maxSize || this.MAX_FILE_SIZE_MB) * 1024 * 1024;
    const allowedTypes = options?.allowedTypes || this.ALLOWED_TYPES;

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(maxSize)})`);
    }

    // Check file type
    const fileExtension = this.getFileExtension(file.name);
    if (!allowedTypes.includes(fileExtension.toLowerCase())) {
      errors.push(`File type '${fileExtension}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file name
    if (!file.name || file.name.trim() === '') {
      errors.push('File must have a valid name');
    }

    // Check for potentially malicious files
    if (this.isSuspiciousFile(file.name)) {
      errors.push('File appears to contain suspicious content or naming');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Upload a single file
   */
  async uploadFile(file: File, options?: FileUploadOptions): Promise<FileUploadResult> {
    // Validate file
    const validation = this.validateFile(file, options);
    if (!validation.isValid) {
      const error = new FileUploadError({
        code: 'VALIDATION_ERROR',
        message: validation.errors.join(', '),
        details: { validation }
      });
      options?.onError?.(error);
      throw error;
    }

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      
      // Add metadata
      formData.append('file_name', file.name);
      formData.append('file_size', file.size.toString());
      formData.append('file_type', file.type || 'application/octet-stream');

      // Upload with progress tracking
      const result = await this.uploadWithProgress(formData, options?.onProgress);

      options?.onComplete?.(result);
      return result;

    } catch (error: any) {
      const uploadError = new FileUploadError({
        code: error.status === 413 ? 'FILE_TOO_LARGE' : 
              error.status === 415 ? 'UNSUPPORTED_MEDIA_TYPE' :
              error.status === 401 ? 'UNAUTHORIZED' :
              error.status === 400 ? 'BAD_REQUEST' : 'UPLOAD_FAILED',
        message: error.data?.detail || error.message || 'File upload failed',
        details: error.data
      });

      options?.onError?.(uploadError);
      throw uploadError;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(files: FileList | File[], options?: FileUploadOptions): Promise<FileUploadResult[]> {
    const fileArray = Array.from(files);
    const results: FileUploadResult[] = [];
    const errors: FileUploadError[] = [];

    if (!options?.multiple && fileArray.length > 1) {
      throw new Error('Multiple file upload is not enabled');
    }

    // Process files sequentially to avoid overwhelming the server
    for (let i = 0; i < fileArray.length; i++) {
      try {
        const file = fileArray[i];
        const result = await this.uploadFile(file, {
          ...options,
          onProgress: (progress) => {
            // Calculate overall progress
            const overallProgress = ((i / fileArray.length) + (progress / 100 / fileArray.length)) * 100;
            options?.onProgress?.(overallProgress);
          }
        });
        results.push(result);
      } catch (error: any) {
        errors.push(error);
        // Continue with other files unless explicitly told to stop
      }
    }

    if (errors.length > 0 && results.length === 0) {
      // All uploads failed
      throw new Error(`All file uploads failed: ${errors.map(e => e.message).join(', ')}`);
    }

    return results;
  }

  /**
   * Get upload progress for a file
   */
  async getUploadStatus(fileId: string): Promise<FileUploadResult> {
    try {
      return await api.get<FileUploadResult>(`/files/${fileId}/status`);
    } catch (error: any) {
      throw new FileUploadError({
        code: 'STATUS_CHECK_FAILED',
        message: 'Failed to check upload status',
        details: error.data
      });
    }
  }

  /**
   * Cancel an ongoing upload
   */
  async cancelUpload(fileId: string): Promise<void> {
    try {
      await api.delete(`/files/${fileId}`);
    } catch (error: any) {
      throw new FileUploadError({
        code: 'CANCEL_FAILED',
        message: 'Failed to cancel upload',
        details: error.data
      });
    }
  }

  /**
   * Upload with XMLHttpRequest for progress tracking
   */
  private uploadWithProgress(formData: FormData, onProgress?: (progress: number) => void): Promise<FileUploadResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Set up progress handler
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });
      }

      // Set up completion handlers
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject({
              status: xhr.status,
              data: errorData,
              message: errorData.detail || errorData.message || `HTTP ${xhr.status}`
            });
          } catch {
            reject({
              status: xhr.status,
              message: `HTTP ${xhr.status}: ${xhr.statusText}`
            });
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout'));
      });

      // Get auth token for authorization
      const tokenKey = env.get('TOKEN_STORAGE_KEY');
      let token = localStorage.getItem(tokenKey);
      
      if (!token) {
        try {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            token = parsed.state?.token;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      // Configure request
      xhr.open('POST', `${env.get('API_URL')}/files/upload`);
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      // Set timeout (30 seconds for large files)
      xhr.timeout = 30000;

      // Send the request
      xhr.send(formData);
    });
  }

  /**
   * Helper methods
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? '' : fileName.substring(lastDot);
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private isSuspiciousFile(fileName: string): boolean {
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.vbs', '.js'];
    const fileExt = this.getFileExtension(fileName).toLowerCase();
    
    // Check for suspicious extensions
    if (suspiciousExtensions.includes(fileExt)) {
      return true;
    }

    // Check for suspicious naming patterns
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|scr|pif|vbs|js)$/i,
      /^\./, // Hidden files
      /\.\w+\./, // Double extensions
    ];

    return suspiciousPatterns.some(pattern => pattern.test(fileName));
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();
export default fileUploadService;