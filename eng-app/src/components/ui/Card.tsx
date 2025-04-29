import React, { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  header?: ReactNode;
  footer?: ReactNode;
  hoverable?: boolean;
  bordered?: boolean;
}

const paddingMap = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
};

const variantMap = {
  default: 'bg-white dark:bg-gray-800 shadow-md',
  outline: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
  flat: 'bg-white dark:bg-gray-800',
};

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  header,
  footer,
  hoverable = false,
  bordered = false,
  ...props
}) => {
  const cardClasses = [
    'rounded-lg overflow-hidden',
    variantMap[variant],
    hoverable ? 'transition-all duration-200 hover:shadow-lg' : '',
    bordered && variant !== 'outline' ? 'border border-gray-200 dark:border-gray-700' : '',
    className,
  ].join(' ').trim();

  const headerClasses = [
    'px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700',
  ].join(' ').trim();

  const bodyClasses = [
    paddingMap[padding],
  ].join(' ').trim();

  const footerClasses = [
    'px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700',
  ].join(' ').trim();

  return (
    <div className={cardClasses} {...props}>
      {header && (
        <div className={headerClasses}>
          {header}
        </div>
      )}
      <div className={bodyClasses}>
        {children}
      </div>
      {footer && (
        <div className={footerClasses}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card; 