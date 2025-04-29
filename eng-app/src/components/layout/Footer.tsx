import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center">
              <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">ENG</span>
              <span className="text-gray-600 dark:text-gray-400 ml-2 text-sm">Earned Not Given</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Progress you can measure, effort you can track
            </p>
          </div>
          
          <div className="flex space-x-6">
            <Link to="/dashboard" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
              Dashboard
            </Link>
            <Link to="/check-in/new" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
              Check-in
            </Link>
            <Link to="/history" className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400">
              History
            </Link>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            &copy; {currentYear} Earned Not Given Coaching. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 