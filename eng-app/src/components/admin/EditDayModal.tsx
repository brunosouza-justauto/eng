import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import Button from '../ui/Button';
import { DAY_TYPES } from '../../types/mealPlanning';

interface EditDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  nutritionPlanId: string;
  dayNumber: number;
  dayType: string | null;
}

const EditDayModal: React.FC<EditDayModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  nutritionPlanId,
  dayNumber,
  dayType
}) => {
  const [selectedDayType, setSelectedDayType] = useState<string>('Custom Day');
  const [customDayType, setCustomDayType] = useState<string>('');
  const [newDayNumber, setNewDayNumber] = useState<number>(dayNumber);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form values when the component mounts or dayType changes
  useEffect(() => {
    // Set the day number
    setNewDayNumber(dayNumber);
    
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
      // Default to "Day X" format if no dayType provided
      setSelectedDayType('Custom Day');
      setCustomDayType(`Day ${dayNumber}`);
    }
  }, [dayType, dayNumber]);

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

    // Validate that we have a valid day number
    if (newDayNumber <= 0) {
      setError('Day number must be greater than 0');
      setIsLoading(false);
      return;
    }

    try {
      // Check if we're changing the day number
      if (newDayNumber !== dayNumber) {
        // Check if the new day number already exists in the plan
        const { data: existingMeals, error: existingError } = await supabase
          .from('meals')
          .select('id')
          .eq('nutrition_plan_id', nutritionPlanId)
          .eq('day_number', newDayNumber)
          .limit(1);
          
        if (existingError) throw existingError;
        
        if (existingMeals && existingMeals.length > 0) {
          setError(`Day ${newDayNumber} already exists in this plan. Please choose a different day number.`);
          setIsLoading(false);
          return;
        }
      }

      // Update all meals for this day with the new day type and number
      const { error: updateError } = await supabase
        .from('meals')
        .update({ 
          day_type: finalDayType,
          day_number: newDayNumber
        })
        .eq('nutrition_plan_id', nutritionPlanId)
        .eq('day_number', dayNumber);

      if (updateError) throw updateError;

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
            Edit Day {dayNumber}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="dayNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Day Number <span className="text-red-500">*</span>
              </label>
              <input
                id="dayNumber"
                type="number"
                min="1"
                value={newDayNumber}
                onChange={(e) => setNewDayNumber(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Changing the day number will move all meals to the new day
              </p>
            </div>
            
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