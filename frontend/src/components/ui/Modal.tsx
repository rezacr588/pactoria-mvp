import React, { useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { classNames } from '../../utils/classNames';
import { textStyles, textColors } from '../../utils/typography';
import Button from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdropClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-7xl'
};

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnBackdropClick = true,
  showCloseButton = true,
  className
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className={classNames(
          'relative w-full bg-white dark:bg-secondary-900 rounded-lg shadow-xl transform transition-all',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-secondary-700">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 className={`text-lg font-semibold ${textColors.primary} truncate`}>
                  {title}
                </h2>
              )}
              {description && (
                <p className={`mt-1 ${textStyles.formHelpText}`}>
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className={`ml-3 ${textColors.subtle} hover:${textColors.muted.split(' ')[0]}`}
                icon={<XMarkIcon className="h-5 w-5" />}
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className={classNames(
          'px-6',
          title || showCloseButton ? 'py-4' : 'py-6'
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Confirmation Dialog Component
export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  loading = false
}: ConfirmDialogProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          confirmVariant: 'danger' as const,
          titleColor: textColors.danger
        };
      case 'warning':
        return {
          confirmVariant: 'warning' as const,
          titleColor: textColors.warning
        };
      default:
        return {
          confirmVariant: 'primary' as const,
          titleColor: textColors.primary
        };
    }
  };

  const { confirmVariant, titleColor } = getVariantStyles();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnBackdropClick={!loading}
      showCloseButton={false}
    >
      <div className="text-center">
        <h3 className={classNames('text-lg font-medium mb-4', titleColor)}>
          {title}
        </h3>
        <p className={`${textStyles.formHelpText} mb-6`}>
          {message}
        </p>
        <div className="flex space-x-3 justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}