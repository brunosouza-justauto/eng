import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string | React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  subtitle?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
  border?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  icon,
  className = '',
  contentClassName = '',
  headerClassName = '',
  subtitle,
  action,
  noPadding = false,
  border = true,
  shadow = 'md',
}) => {
  // Shadow classes
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  // Border classes
  const borderClasses = border ? 'border border-gray-200 dark:border-gray-700' : '';

  // Card classes
  const cardClasses = `
    bg-white dark:bg-gray-800 
    rounded-lg overflow-hidden
    ${shadowClasses[shadow]}
    ${borderClasses}
    ${className}
  `;

  const headerClasses = `${headerClassName}`;
  const contentClasses = `${!noPadding ? 'p-4' : ''} ${contentClassName}`;

  return (
    <div className={cardClasses}>
      {/* Header Section */}
      {(title || action) && (
        <div className={`px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${headerClasses}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {icon && <div className="text-indigo-600 dark:text-indigo-400">{icon}</div>}
              <div>
                {typeof title === 'string' ? (
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white">{title}</h3>
                ) : (
                  title
                )}
                {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
              </div>
            </div>
            {action && <div>{action}</div>}
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className={contentClasses}>{children}</div>
    </div>
  );
};

export default Card; 