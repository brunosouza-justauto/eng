import React, { useState } from 'react';
import { 
  ExerciseFeedback
} from '../../../types/workoutTypes';

interface ExerciseFeedbackFormProps {
  exerciseInstanceId: string;
  workoutSessionId: string;
  onSubmit: (feedback: ExerciseFeedback) => void;
  onCancel: () => void;
}

// Component for collecting feedback after an exercise is completed
const ExerciseFeedbackForm: React.FC<ExerciseFeedbackFormProps> = ({ 
  exerciseInstanceId, 
  workoutSessionId, 
  onSubmit, 
  onCancel
}) => {
  // Add ref for handling outside clicks
  const formRef = React.useRef<HTMLDivElement>(null);
  
  // Handle click outside to close the modal
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);
  
  // Prevent scrolling of the background when modal is open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [pumpLevel, setPumpLevel] = useState<number | null>(null);
  const [workloadLevel, setWorkloadLevel] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');
  
  // Create the rating selector component for different metrics
  const RatingSelector = ({ 
    label, 
    value, 
    onChange 
  }: { 
    label: string; 
    value: number | null; 
    onChange: (val: number) => void;
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="flex space-x-3 items-center">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
              value === rating
                ? 'bg-blue-500 border-blue-700 text-white'
                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            {rating}
          </button>
        ))}
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
          {value === 1 && 'Very Low'}
          {value === 2 && 'Low'}
          {value === 3 && 'Moderate'}
          {value === 4 && 'High'}
          {value === 5 && 'Very High'}
        </span>
      </div>
    </div>
  );
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      workout_session_id: workoutSessionId,
      exercise_instance_id: exerciseInstanceId,
      pain_level: painLevel,
      pump_level: pumpLevel,
      workload_level: workloadLevel,
      notes: notes.trim() || null
    });
  };
  
  return (
    // Fullscreen backdrop with semi-transparent background
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Modal container */}
      <div 
        ref={formRef}
        className="bg-white dark:bg-gray-800 shadow-xl rounded-lg w-full max-w-lg mx-auto overflow-hidden animate-fade-in"
      >
        {/* Modal header */}
        <div className="bg-gray-100 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Exercise Feedback</h3>
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">     
          <form onSubmit={handleSubmit} className="space-y-6">
            <RatingSelector 
              label="Pain Level (1 = No pain, 5 = Extreme pain)" 
              value={painLevel} 
              onChange={setPainLevel} 
            />
            
            <RatingSelector 
              label="Muscle Pump (1 = No pump, 5 = Extreme pump)" 
              value={pumpLevel} 
              onChange={setPumpLevel} 
            />
            
            <RatingSelector 
              label="Workload Level (1 = Too easy, 5 = Too heavy)" 
              value={workloadLevel} 
              onChange={setWorkloadLevel} 
            />
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional comments about this exercise..."
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!painLevel && !pumpLevel && !workloadLevel && !notes.trim()}
              >
                Submit Feedback
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ExerciseFeedbackForm;
