import React from 'react';
import { Supplement } from '../../../types/supplements';

interface SupplementListProps {
  supplements: Supplement[];
  onEdit: (supplement: Supplement) => void;
  onDelete: (supplementId: string) => void;
}

const SupplementList: React.FC<SupplementListProps> = ({ supplements, onEdit, onDelete }) => {
  if (supplements.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">No supplements added yet.</p>;
  }

  return (
    <div className="overflow-y-auto max-h-[600px] pr-2">
      <ul className="space-y-3">
        {supplements.map(supplement => (
          <li 
            key={supplement.id} 
            className="border border-gray-200 dark:border-gray-700 rounded-md p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {supplement.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {supplement.category}
                </p>
                {supplement.default_dosage && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Dosage: {supplement.default_dosage}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onEdit(supplement)}
                  className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
                  title="Edit supplement"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(supplement.id)}
                  className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition"
                  title="Delete supplement"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SupplementList; 