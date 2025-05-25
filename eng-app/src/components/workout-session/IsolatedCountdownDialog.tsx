import React, { useState, useEffect } from 'react';

interface IsolatedCountdownDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (seconds: number) => void;
}

const IsolatedCountdownDialog: React.FC<IsolatedCountdownDialogProps> = ({ 
  isOpen, 
  onClose, 
  onStart
}) => {
  const [inputValue, setInputValue] = useState('60');
  
  // Reset input value when dialog opens
  useEffect(() => {
    if (isOpen) {
      setInputValue('60');
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const handleStart = () => {
    const seconds = parseInt(inputValue, 10);
    if (!isNaN(seconds) && seconds > 0) {
      onStart(seconds);
    }
  };
  
  // Prevent clicks from propagating outside the dialog
  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999]"
      style={{ touchAction: 'none' }}
    >
      <div 
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md mx-4"
        onClick={handleContainerClick}
      >
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          Set Countdown Timer
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Set a custom countdown timer in seconds.
        </p>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Countdown Time (seconds)
          </label>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            min="1"
            autoFocus
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Start Countdown
          </button>
        </div>
      </div>
    </div>
  );
};

export default IsolatedCountdownDialog;
