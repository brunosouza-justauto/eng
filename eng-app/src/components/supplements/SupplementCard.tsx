import React, { useState } from 'react';
import { AthleteSupplementWithDetails } from '../../types/supplements';
import { format } from 'date-fns';

interface SupplementCardProps {
  supplement: AthleteSupplementWithDetails;
  compact?: boolean;
}

const SupplementCard: React.FC<SupplementCardProps> = ({ 
  supplement,
  compact = false 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Format dates
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const handleCardClick = () => {
    // Only open modal if there are notes to show
    if (supplement.notes) {
      setIsModalOpen(true);
    }
  };

  const closeModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(false);
  };

  return (
    <>
      <div 
        className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 shadow-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={handleCardClick}
      >
        <div className="flex flex-col">
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {supplement.supplement_name}
            </h4>
            <div className="flex space-x-2">
              <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full">
                {supplement.schedule}
              </span>
            </div>
          </div>
          
          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-medium">Dosage:</span> {supplement.dosage}
            </p>
            
            {supplement.timing && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">When:</span> {supplement.timing}
              </p>
            )}
            
            {!compact && supplement.notes && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">Notes:</span> {supplement.notes}
              </p>
            )}
            
            {!compact && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <p>From {formatDate(supplement.start_date)} {supplement.end_date ? `to ${formatDate(supplement.end_date)}` : ''}</p>
              </div>
            )}

            {compact && supplement.notes && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                Tap to view notes
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal for supplement notes */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {supplement.supplement_name}
              </h3>
              <button 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={closeModal}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Dosage</h4>
                <p className="text-gray-900 dark:text-white">{supplement.dosage}</p>
              </div>
              
              {supplement.timing && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Timing</h4>
                  <p className="text-gray-900 dark:text-white">{supplement.timing}</p>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Schedule</h4>
                <p className="text-gray-900 dark:text-white">{supplement.schedule}</p>
              </div>
              
              {supplement.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</h4>
                  <p className="text-gray-900 dark:text-white whitespace-pre-line">{supplement.notes}</p>
                </div>
              )}
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Date Range</h4>
                <p className="text-gray-900 dark:text-white">
                  From {formatDate(supplement.start_date)}
                  {supplement.end_date ? ` to ${formatDate(supplement.end_date)}` : ''}
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SupplementCard; 