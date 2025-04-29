import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        &copy; {currentYear} Earned Not Given Coaching. All Rights Reserved.
        {/* Optionally add other links here */}
      </div>
    </footer>
  );
};

export default Footer; 