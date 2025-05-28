import React, { useState } from 'react';
import { AIProgram } from '../../services/programBuilderService';
import { FiPlusCircle, FiChevronDown, FiChevronUp, FiInfo, FiCalendar, FiClock } from 'react-icons/fi';

interface ProgramResultProps {
  program: AIProgram;
  onSaveProgram: () => void;
  isSaving: boolean;
}

/**
 * Component to display the AI-generated workout program result
 */
const ProgramResult: React.FC<ProgramResultProps> = ({ 
  program, 
  onSaveProgram,
  isSaving 
}) => {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(
    program.weeks.length > 0 ? program.weeks[0].week_number : null
  );
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);

  // Toggle week expansion
  const toggleWeek = (weekNumber: number) => {
    setExpandedWeek(expandedWeek === weekNumber ? null : weekNumber);
  };

  // Toggle workout expansion
  const toggleWorkout = (weekNumber: number, dayNumber: number) => {
    const workoutId = `week-${weekNumber}-day-${dayNumber}`;
    setExpandedWorkout(expandedWorkout === workoutId ? null : workoutId);
  };

  // Check if a workout is expanded
  const isWorkoutExpanded = (weekNumber: number, dayNumber: number) => {
    const workoutId = `week-${weekNumber}-day-${dayNumber}`;
    return expandedWorkout === workoutId;
  };

  // Get appropriate color for muscle group
  const getMuscleGroupColor = (muscleGroup: string): string => {
    const muscleColors: Record<string, string> = {
      'Chest': 'text-red-600 dark:text-red-400',
      'Back': 'text-blue-600 dark:text-blue-400',
      'Shoulders': 'text-purple-600 dark:text-purple-400',
      'Arms': 'text-green-600 dark:text-green-400',
      'Legs': 'text-orange-600 dark:text-orange-400',
      'Glutes': 'text-pink-600 dark:text-pink-400',
      'Core': 'text-yellow-600 dark:text-yellow-400',
      'Neck': 'text-indigo-600 dark:text-indigo-400',
      'Full Body': 'text-teal-600 dark:text-teal-400',
    };

    // Try to match by containing the muscle group name
    for (const [key, value] of Object.entries(muscleColors)) {
      if (muscleGroup.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    // Default color if no match
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            {program.program_name}
          </h3>
          <div className="flex items-center mt-1 text-sm text-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center mr-4">
              <FiCalendar className="mr-1" /> {program.total_weeks} weeks
            </span>
            <span className="inline-flex items-center">
              <FiClock className="mr-1" /> {program.days_per_week} days/week
            </span>
          </div>
        </div>
        <button
          onClick={onSaveProgram}
          disabled={isSaving}
          className={`flex items-center px-4 py-2 text-white rounded-md ${
            isSaving 
              ? 'bg-green-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isSaving ? (
            <>
              <svg className="w-4 h-4 mr-2 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <FiPlusCircle className="mr-2" />
              Create Program
            </>
          )}
        </button>
      </div>

      <div className="mb-4 p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-md">
        <div className="flex items-start">
          <FiInfo className="text-indigo-600 dark:text-indigo-400 mr-2 mt-1 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-gray-800 dark:text-white mb-1">Program Overview</h4>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
              {program.description}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <div>
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Phase</h5>
                <p className="text-gray-800 dark:text-gray-200">{program.phase}</p>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Fitness Level</h5>
                <p className="text-gray-800 dark:text-gray-200">{program.fitness_level}</p>
              </div>
              <div>
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Progression</h5>
                <p className="text-gray-800 dark:text-gray-200 text-sm">{program.progression_strategy}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {program.weeks.map((week) => (
          <div key={week.week_number} className="py-3">
            <div 
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleWeek(week.week_number)}
            >
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm mr-2">
                  {week.week_number}
                </div>
                <h4 className="font-medium text-gray-800 dark:text-white">Week {week.week_number}</h4>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                  {week.workouts.length} workouts
                </span>
                {expandedWeek === week.week_number ? (
                  <FiChevronUp className="text-gray-500 dark:text-gray-400" />
                ) : (
                  <FiChevronDown className="text-gray-500 dark:text-gray-400" />
                )}
              </div>
            </div>
            
            {expandedWeek === week.week_number && (
              <div className="mt-3 pl-5">
                {week.notes && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    {week.notes}
                  </p>
                )}
                
                <div className="space-y-3">
                  {week.workouts.map((workout) => (
                    <div key={workout.day_number} className="bg-gray-50 dark:bg-gray-700 rounded-md p-3">
                      <div 
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() => toggleWorkout(week.week_number, workout.day_number)}
                      >
                        <div className="flex items-center">
                          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300 mr-2">
                            {workout.day_number}
                          </div>
                          <h5 className="font-medium text-gray-800 dark:text-white">{workout.name}</h5>
                          <span className={`ml-2 text-sm ${getMuscleGroupColor(workout.focus)}`}>
                            {workout.focus}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                            {workout.exercises.length} exercises
                          </span>
                          {isWorkoutExpanded(week.week_number, workout.day_number) ? (
                            <FiChevronUp className="text-gray-500 dark:text-gray-400" />
                          ) : (
                            <FiChevronDown className="text-gray-500 dark:text-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      {isWorkoutExpanded(week.week_number, workout.day_number) && (
                        <div className="mt-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                          {workout.notes && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                              {workout.notes}
                            </p>
                          )}
                          
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead>
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  Exercise
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  Sets x Reps
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  Rest
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  Tempo
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                  Notes
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {workout.exercises.map((exercise, index) => (
                                <tr key={index}>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                      {exercise.name}
                                    </div>
                                    <div className={`text-xs ${getMuscleGroupColor(exercise.target_muscle)}`}>
                                      {exercise.target_muscle}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {exercise.equipment}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-800 dark:text-gray-200">
                                    {exercise.sets} x {exercise.reps}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-800 dark:text-gray-200">
                                    {exercise.rest_seconds}s
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-800 dark:text-gray-200">
                                    {exercise.tempo}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200">
                                    {exercise.notes}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {program.notes && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
          <h4 className="font-medium text-gray-800 dark:text-white mb-1">Program Notes</h4>
          <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">
            {program.notes}
          </p>
        </div>
      )}
      
      {program.deload_strategy && (
        <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-md">
          <h4 className="font-medium text-gray-800 dark:text-white mb-1">Deload Strategy</h4>
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            {program.deload_strategy}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProgramResult;
