import React, { useState, useEffect } from 'react';

interface IsolatedRestTimeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (time: number) => void;
  onClear: () => void;
  initialValue: string;
  hasCustomValue: boolean;
}

const IsolatedRestTimeDialog: React.FC<IsolatedRestTimeDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onClear, 
  initialValue, 
  hasCustomValue 
}) => {
  const [inputValue, setInputValue] = useState(initialValue);
  
  // Reset input value when dialog opens with a new initialValue
  useEffect(() => {
    if (isOpen) {
      setInputValue(initialValue);
    }
  }, [isOpen, initialValue]);
  
  if (!isOpen) return null;
  
  const handleSave = () => {
    const time = parseInt(inputValue, 10);
    if (!isNaN(time) && time >= 0) {
      onSave(time);
    }
  };
  
  // Prevent clicks from propagating outside the dialog
  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999]"
      // Prevent interaction with anything behind the dialog
      style={{ touchAction: 'none' }}
    >
      <div 
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md mx-4"
        onClick={handleContainerClick}
      >
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          Set Custom Rest Time
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          This will override the default rest time for all exercises in this workout.
        </p>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rest Time (seconds)
          </label>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            min="0"
            // Auto focus the input when dialog opens for better UX
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
          {hasCustomValue && (
            <button
              onClick={onClear}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Clear Custom
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default IsolatedRestTimeDialog;
