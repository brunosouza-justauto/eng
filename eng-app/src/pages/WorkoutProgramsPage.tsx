import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectProfile } from '../store/slices/authSlice';
import { getAvailableWorkoutPrograms, assignWorkoutProgram } from '../services/programService';

interface WorkoutProgram {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

const WorkoutProgramsPage: React.FC = () => {
  const [workoutPrograms, setWorkoutPrograms] = useState<WorkoutProgram[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningProgram, setAssigningProgram] = useState<string | null>(null);
  const profile = useSelector(selectProfile);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWorkoutPrograms = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getAvailableWorkoutPrograms();
        
        if (result.error) {
          setError(result.error);
        } else {
          setWorkoutPrograms(result.programs);
        }
      } catch (err) {
        console.error('Error fetching workout programs:', err);
        setError('Failed to load workout programs. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkoutPrograms();
  }, []);

  const handleSelectProgram = async (programId: string) => {
    if (!profile?.id) return;
    
    setAssigningProgram(programId);
    setError(null);
    
    try {
      const result = await assignWorkoutProgram(profile.id, programId);
      
      if (result.error) {
        setError(result.error);
      } else {
        // Navigate back to dashboard after successfully selecting a program
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error assigning workout program:', err);
      setError('Failed to assign workout program. Please try again.');
    } finally {
      setAssigningProgram(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Choose a Workout Program
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Select a workout program that best fits your goals and fitness level.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-md">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : workoutPrograms.length === 0 ? (
        <div className="text-center py-10 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-700 dark:text-gray-300 text-lg">
            No workout programs are available at this time.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Please contact your coach to create a workout program for you.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workoutPrograms.map((program) => (
            <div 
              key={program.id} 
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              <div className="p-5">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                  {program.name}
                </h3>
                
                {program.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    {program.description}
                  </p>
                )}
                
                <button
                  onClick={() => handleSelectProgram(program.id)}
                  disabled={assigningProgram === program.id}
                  className="w-full mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                >
                  {assigningProgram === program.id ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Selecting...
                    </span>
                  ) : (
                    'Select This Program'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkoutProgramsPage; 