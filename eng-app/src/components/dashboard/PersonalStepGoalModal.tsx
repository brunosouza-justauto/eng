import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { FiActivity, FiX } from 'react-icons/fi';

interface PersonalStepGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onGoalSet: (goalAmount: number) => void;
}

const PersonalStepGoalModal: React.FC<PersonalStepGoalModalProps> = ({
  isOpen,
  onClose,
  userId,
  onGoalSet
}) => {
  const [goal, setGoal] = useState<string>('10000');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const stepGoal = parseInt(goal, 10);
    if (isNaN(stepGoal) || stepGoal <= 0) {
      setError('Please enter a valid positive number');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // First, deactivate any existing goals
      const { error: deactivateError } = await supabase
        .from('step_goals')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (deactivateError) throw deactivateError;

      // Then create the new goal
      const { error: insertError } = await supabase
        .from('step_goals')
        .insert({
          user_id: userId,
          daily_steps: stepGoal,
          is_active: true,
        });

      if (insertError) throw insertError;

      // Success! Notify parent and close
      onGoalSet(stepGoal);
      onClose();
    } catch (err) {
      console.error('Error setting step goal:', err);
      setError('Failed to save your step goal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl dark:bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
            <FiActivity className="mr-2 text-indigo-600 dark:text-indigo-400" />
            Set Your Step Goal
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <FiX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="stepGoal" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Daily Step Goal
            </label>
            <input
              id="stepGoal"
              type="number"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter daily step goal"
              min="1"
              max="100000"
              required
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Recommended: 7,000-10,000 steps for general health, but choose what works for you.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </div>
              ) : (
                'Save Step Goal'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PersonalStepGoalModal; 