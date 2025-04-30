import React, { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import FoamRollExercise from './FoamRollExercise';
import SwimmingExercise from './SwimmingExercise';

interface WorkoutDetailViewProps {
  workoutName: string;
  dayName: string;
  onSave: () => void;
  onCancel: () => void;
}

const WorkoutDetailView: React.FC<WorkoutDetailViewProps> = ({
  workoutName = 'Full Body - Post Comp (Maintenance)',
  dayName = 'Unscheduled',
  onSave,
  onCancel
}) => {
  const [foamRollSets, setFoamRollSets] = useState([
    { time: '00:01:00', rest: '01:00' },
    { time: '00:01:00', rest: '01:00' },
    { time: '00:01:00', rest: '01:00' }
  ]);
  
  const [swimmingSets, setSwimmingSets] = useState([
    { time: '00:30:00', rest: '00:00' }
  ]);

  const handleAddFoamRollSet = () => {
    setFoamRollSets([...foamRollSets, { time: '00:01:00', rest: '01:00' }]);
  };

  const handleUpdateFoamRollSet = (index: number, field: 'time' | 'rest', value: string) => {
    const newSets = [...foamRollSets];
    newSets[index][field] = value;
    setFoamRollSets(newSets);
  };

  const handleAddSwimmingSet = () => {
    setSwimmingSets([...swimmingSets, { time: '00:30:00', rest: '00:00' }]);
  };

  const handleUpdateSwimmingSet = (index: number, field: 'time' | 'rest', value: string) => {
    const newSets = [...swimmingSets];
    newSets[index][field] = value;
    setSwimmingSets(newSets);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow dark:bg-gray-800">
      {/* Workout Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold dark:text-white">
            {workoutName}
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              {dayName}
            </span>
          </h2>
        </div>
        <div className="flex space-x-2">
          <button 
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={onSave}
            className="px-3 py-1.5 text-sm bg-indigo-600 rounded-md text-white hover:bg-indigo-700"
          >
            Save & Close
          </button>
        </div>
      </div>
      
      {/* Workout Content */}
      <div className="flex-grow p-4 space-y-6 overflow-y-auto">
        <FoamRollExercise 
          sets={foamRollSets}
          onAddSet={handleAddFoamRollSet}
          onUpdateSet={handleUpdateFoamRollSet}
        />
        
        <SwimmingExercise 
          sets={swimmingSets}
          onAddSet={handleAddSwimmingSet}
          onUpdateSet={handleUpdateSwimmingSet}
        />
      </div>
      
      {/* Add Exercise Button */}
      <div className="p-4 border-t dark:border-gray-700">
        <button 
          type="button"
          className="flex items-center justify-center w-full py-2 font-medium text-gray-700 bg-gray-100 rounded-md dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-gray-300"
        >
          <FiPlus className="mr-2" /> Add Exercise
        </button>
      </div>
    </div>
  );
};

export default WorkoutDetailView; 