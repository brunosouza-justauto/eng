import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import Button from '../ui/Button';
import { DAY_TYPES } from '../../types/mealPlanning';

interface EditDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dayType: string | null;
  mealIds: string[]; // Pass the IDs of all meals with this day type
}

const EditDayModal: React.FC<EditDayModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  dayType,
  mealIds
}) => {
  const [selectedDayType, setSelectedDayType] = useState<string>('Custom Day');
  const [customDayType, setCustomDayType] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form values when the component mounts or dayType changes
  useEffect(() => {
    // Set the day type
    if (dayType) {
      // Check if the dayType is in our predefined list
      if (DAY_TYPES.includes(dayType as (typeof DAY_TYPES)[number])) {
        setSelectedDayType(dayType);
        setCustomDayType('');
      } else {
        // If not in the list, set to custom and populate the custom field
        setSelectedDayType('Custom Day');
        setCustomDayType(dayType);
      }
    } else {
      // Default to first day type if no dayType provided
      setSelectedDayType(DAY_TYPES[0]);
      setCustomDayType('');
    }
  }, [dayType]);

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
      // Update all meals with this day type
      if (mealIds && mealIds.length > 0) {
        const { error: updateError } = await supabase
          .from('meals')
          .update({ 
            day_type: finalDayType
          })
          .in('id', mealIds);

        if (updateError) throw updateError;
      } else {
        // No meals to update
        console.warn('No meal IDs provided for day type update');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Error updating day:', err);
      let errorMessage = 'Failed to update day';
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
            Edit Day Type
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="dayType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Day Type <span className="text-red-500">*</span>
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
                    placeholder="e.g., Upper Body Day, Leg Day"
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
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditDayModal; 