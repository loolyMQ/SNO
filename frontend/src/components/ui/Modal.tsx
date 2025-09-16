'use client';

import { forwardRef, useEffect } from 'react';
import type { HTMLAttributes } from 'react';

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ className = '', isOpen, onClose, title, size = 'md', children, ...props }, ref) => {
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
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

    if (!isOpen) return null;

    const sizes = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          ref={ref}
          className={`
            relative bg-white rounded-lg shadow-xl w-full mx-4 ${sizes[size]} max-h-[90vh] overflow-hidden
            ${className}
          `}
          {...props}
        >
          {title && (
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">{children}</div>
        </div>
      </div>
    );
  },
);

Modal.displayName = 'Modal';

interface ModalContentProps extends HTMLAttributes<HTMLDivElement> {}

export const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`p-6 ${className}`} {...props} />
  ),
);

ModalContent.displayName = 'ModalContent';

interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`flex justify-end space-x-2 p-6 border-t border-gray-200 ${className}`}
      {...props}
    />
  ),
);

ModalFooter.displayName = 'ModalFooter';
