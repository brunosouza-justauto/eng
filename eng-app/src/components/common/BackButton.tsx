import React from 'react';
import { Link } from 'react-router-dom';

interface BackButtonProps {
  to?: string;
  label?: string;
  onClick?: () => void;
}

const BackButton: React.FC<BackButtonProps> = ({ 
  to = '/dashboard', 
  label = 'Back to Dashboard',
  onClick
}) => {
  if (onClick) {
    return (
      <div className="flex justify-end mb-6">
        <button 
          onClick={onClick}
          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 back-button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          {label}
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-end mb-6">
      <Link 
        to={to} 
        className="inline-flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 back-button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        {label}
      </Link>
    </div>
  );
};

export default BackButton; 