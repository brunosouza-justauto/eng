import React, { Fragment, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  hideCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  showCloseIcon?: boolean;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  hideCloseButton = false,
  closeOnOverlayClick = true,
  showCloseIcon = true,
  bodyClassName = '',
  headerClassName = '',
  footerClassName = '',
  footer,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Lock scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // Handle escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);
  
  // Handle click outside modal
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4',
  };
  
  // Don't render if not open
  if (!isOpen) return null;
  
  // Create portal to render modal at the end of the document body
  return createPortal(
    <Fragment>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-y-auto"
        onClick={handleOverlayClick}
        aria-modal="true"
        role="dialog"
      >
        {/* Modal Container */}
        <div 
          ref={modalRef}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${sizeClasses[size]} mx-auto my-8 overflow-hidden`}
        >
          {/* Modal Header */}
          {(title || !hideCloseButton) && (
            <div className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 ${headerClassName}`}>
              <div className="flex items-center justify-between">
                {title && <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>}
                {!hideCloseButton && showCloseIcon && (
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Modal Body */}
          <div className={`px-6 py-4 ${bodyClassName}`}>
            {children}
          </div>
          
          {/* Modal Footer (if provided) */}
          {footer && (
            <div className={`px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 ${footerClassName}`}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </Fragment>,
    document.body
  );
};

export default Modal; 