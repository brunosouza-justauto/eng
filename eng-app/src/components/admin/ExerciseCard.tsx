import React from 'react';
import { FiVideo } from 'react-icons/fi';
import { Exercise } from '../../utils/exerciseDatabase';

interface ExerciseCardProps {
  exercise: Exercise;
  onClick: (exercise: Exercise) => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onClick }) => {
  // Map exercise categories to background colors
  const getCategoryColor = (category: string): string => {
    switch (category.toLowerCase()) {
      case 'compound':
        return 'bg-blue-100 dark:bg-blue-900/30';
      case 'isolation':
        return 'bg-green-100 dark:bg-green-900/30';
      case 'core':
        return 'bg-purple-100 dark:bg-purple-900/30';
      default:
        return 'bg-gray-100 dark:bg-gray-700';
    }
  };

  return (
    <div 
      className="flex flex-col overflow-hidden transition-shadow duration-200 border rounded-lg shadow-sm cursor-pointer dark:bg-gray-750 dark:border-gray-700 hover:shadow-md"
      onClick={() => onClick(exercise)}
    >
      {/* Exercise Image/Video */}
      <div className="relative flex items-center justify-center h-24 bg-gray-200 dark:bg-gray-700">
        <FiVideo className="text-xl text-gray-400 dark:text-gray-500" />
        <div className="absolute bottom-1 right-1">
          <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(exercise.category)} text-gray-800 dark:text-gray-200`}>
            {exercise.category}
          </span>
        </div>
      </div>
      
      {/* Exercise Details */}
      <div className="p-2">
        <h3 className="text-sm font-medium truncate dark:text-white">{exercise.name}</h3>
        <p className="text-xs text-gray-500 truncate dark:text-gray-400">
          {exercise.primaryMuscle} 
          {exercise.secondaryMuscles.length > 0 && `, ${exercise.secondaryMuscles[0]}`}
          {exercise.secondaryMuscles.length > 1 && '...'}
        </p>
      </div>
    </div>
  );
};

export default ExerciseCard; 