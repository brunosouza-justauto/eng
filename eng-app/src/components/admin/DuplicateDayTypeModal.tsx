import React, { useState, useEffect } from 'react';
import { duplicateDayType } from '../../services/mealPlanningService';
import Button from '../ui/Button';
import { DAY_TYPES } from '../../types/mealPlanning';

interface DuplicateDayTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sourceDayType: string;
  nutritionPlanId: string;
}

const DuplicateDayTypeModal: React.FC<DuplicateDayTypeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sourceDayType,
  nutritionPlanId
}) => {
  const [selectedDayType, setSelectedDayType] = useState<string>('Custom Day');
  const [customDayType, setCustomDayType] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form values when the modal opens
  useEffect(() => {
    if (isOpen) {
      // Default to custom day type with a suggested name based on source
      setSelectedDayType('Custom Day');
      setCustomDayType(`${sourceDayType} (Copy)`);
    }
  }, [isOpen, sourceDayType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Determine which day type to use
    const finalDayType = selectedDayType === 'Custom Day' 
      ? customDayType 
      : selectedDayType;

    // Validate that we have a day type
    if (!finalDayType.trim()) {
      setError('Please provide a day type');
      setIsLoading(false);
      return;
    }

    try {
      // Use the service function to duplicate the day type
      await duplicateDayType(
        nutritionPlanId,
        sourceDayType,
        finalDayType
      );

      // Success! Close modal and refresh data
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Error duplicating day type:', err);
      let errorMessage = 'Failed to duplicate day type';
      if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = (err as Error).message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Duplicate "{sourceDayType}" Meals
          </h2>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            This will create a copy of all meals in the "{sourceDayType}" group with a new day type.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="dayType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Day Type <span className="text-red-500">*</span>
              </label>
              <select
                id="dayType"
                value={selectedDayType}
                onChange={(e) => setSelectedDayType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                {DAY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              
              {selectedDayType === 'Custom Day' && (
                <div className="mt-3">
                  <label htmlFor="customDayType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom Day Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="customDayType"
                    type="text"
                    value={customDayType}
                    onChange={(e) => setCustomDayType(e.target.value)}
                    placeholder="e.g., Refeed Day, Travel Day"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}
              
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Select a predefined day type or choose "Custom Day" to enter your own
              </p>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                onClick={onClose}
                variant="secondary"
                color="gray"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                color="indigo"
                loading={isLoading}
              >
                Duplicate Day
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DuplicateDayTypeModal; 