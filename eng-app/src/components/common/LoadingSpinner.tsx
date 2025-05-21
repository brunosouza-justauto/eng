import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  center?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium',
  center = true 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const spinner = (
    <div className={`${sizeClasses[size]} border-4 border-gray-300 dark:border-gray-700 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin`} />
  );

  if (center) {
    return (
      <div className="flex justify-center items-center py-4">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner; 