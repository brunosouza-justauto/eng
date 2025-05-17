import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { 
  FiActivity,
  FiCalendar
} from 'react-icons/fi';
import Card from '../components/ui/Card';
import { ButtonLink } from '../components/ui/Button';
import { SetType, ExerciseSet } from '../types/adminTypes';
import BackButton from '../components/common/BackButton';

// Types for the fetched data
interface ExerciseInstanceData {
  exercise_db_id: string | null;
  exercise_name: string;
  sets: string | null;
  reps: string | null;
  rest_period_seconds: number | null;
  order_in_workout: number | null;
  set_type?: SetType | null;
  sets_data?: ExerciseSet[]; // Individual set data
  tempo?: string | null;
  notes?: string | null;
}

interface WorkoutData {
  id: string;
  name: string;
  day_of_week: number | null;
  order_in_program: number | null;
  description: string | null;
  exercise_instances: ExerciseInstanceData[];
}

interface ProgramData {
  id: string;
  name: string;
  description: string | null;
  phase: string | null;
  weeks: number;
  workouts: WorkoutData[];
}

const WorkoutPlanView: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  
  const [programData, setProgramData] = useState<ProgramData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Helper function to get day name
  const getDayName = (dayOfWeek: number | null): string => {
    if (dayOfWeek === null) return "Unscheduled";
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    // Convert from 1-based to 0-based index
    return days[(dayOfWeek - 1) % 7];
  };
  
  // Helper function to clean exercise names from gender and version indicators
  const cleanExerciseName = (name: string): string => {
    if (!name) return name;
    // Remove text within parentheses and extra whitespace
    return name.replace(/\s*\([^)]*\)\s*/g, ' ') // Remove anything between parentheses
               .replace(/\s+/g, ' ')             // Replace multiple spaces with a single space
               .trim();                          // Remove leading/trailing whitespace
  };
  
  // Fetch program data including all workouts
  useEffect(() => {
    const fetchProgramData = async () => {
      if (!programId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // First fetch basic program info
        const { data: programInfo, error: programError } = await supabase
          .from('program_templates')
          .select('id, name, description, phase, weeks, coach_id')
          .eq('id', programId)
          .single();
          
        if (programError) throw programError;
        if (!programInfo) throw new Error('Program not found');
        
        // Then fetch all workouts for this program
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('workouts')
          .select(`
            id, 
            name, 
            day_of_week, 
            order_in_program, 
            description,
            exercise_instances (
              exercise_db_id,
              exercise_name,
              sets,
              reps,
              rest_period_seconds,
              tempo,
              notes,
              order_in_workout,
              set_type,
              sets_data
            )
          `)
          .eq('program_template_id', programId)
          .order('day_of_week', { ascending: true })
          .order('order_in_program', { ascending: true });
          
        if (workoutsError) throw workoutsError;
        
        // Combine into a single program object
        setProgramData({
          ...programInfo,
          workouts: workoutsData || []
        });
        
      } catch (err) {
        console.error('Error loading workout plan:', err);
        setError('Failed to load workout plan details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProgramData();
  }, [programId]);
  
  // Helper to group exercises by superset
  const groupExercisesBySuperset = (exercises: ExerciseInstanceData[]) => {
    const sortedExercises = [...exercises].sort((a, b) => 
      (a.order_in_workout ?? 0) - (b.order_in_workout ?? 0)
    );
    
    const result: {
      group: ExerciseInstanceData[];
      isSuperset: boolean;
      supersetGroupId: string | null;
    }[] = [];
    
    // Temporary workaround until superset_group_id is added to the database
    // Group consecutive exercises with set_type === SUPERSET as part of the same group
    let currentGroup: ExerciseInstanceData[] = [];
    let groupId = 0;
    
    for (let i = 0; i < sortedExercises.length; i++) {
      const exercise = sortedExercises[i];
      
      if (exercise.set_type === SetType.SUPERSET) {
        // Add to current superset group
        currentGroup.push(exercise);
        
        // If this is the last exercise or the next one isn't a superset, close this group
        if (i === sortedExercises.length - 1 || 
            sortedExercises[i + 1].set_type !== SetType.SUPERSET) {
          
          // Only create a superset group if there are at least 2 exercises
          if (currentGroup.length >= 2) {
            result.push({
              group: [...currentGroup],
              isSuperset: true,
              supersetGroupId: `temp-group-${groupId++}`
            });
          } else {
            // If only one exercise has SUPERSET type, treat it as a regular exercise
            result.push({
              group: [currentGroup[0]],
              isSuperset: false,
              supersetGroupId: null
            });
          }
          
          // Reset for next group
          currentGroup = [];
        }
      } else {
        // Regular exercise, add as its own group
        result.push({
          group: [exercise],
          isSuperset: false,
          supersetGroupId: null
        });
      }
    }
    
    return result;
  };
  
  // Group workouts by day of week
  const getWorkoutsByDay = () => {
    if (!programData?.workouts) return new Map<number, WorkoutData[]>();
    
    const workoutsByDay = new Map<number, WorkoutData[]>();
    
    // Initialize with empty arrays for all 7 days of the week
    for (let i = 1; i <= 7; i++) {
      workoutsByDay.set(i, []);
    }
    
    // Group workouts by day_of_week
    programData.workouts.forEach(workout => {
      if (workout.day_of_week !== null) {
        const day = workout.day_of_week;
        const currentWorkouts = workoutsByDay.get(day) || [];
        workoutsByDay.set(day, [...currentWorkouts, workout]);
      }
    });
    
    return workoutsByDay;
  };
  
  // Render a single workout card
  const renderWorkoutCard = (workout: WorkoutData) => {
    return (
      <Card 
        key={workout.id}
        variant="default"
        className="mb-4"
        header={
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <FiActivity className="mr-2 text-indigo-500" />
              <h3 className="text-base font-medium">{workout.name}</h3>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {workout.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {workout.description}
            </p>
          )}
          
          <div className="space-y-2">
            {groupExercisesBySuperset(workout.exercise_instances).map((group, groupIndex) => (
              <div 
                key={group.supersetGroupId || `group-${groupIndex}`} 
                className={`p-2 rounded-md ${
                  group.isSuperset 
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800' 
                    : ''
                }`}
              >
                {/* If this is a superset, add a superset label */}
                {group.isSuperset && (
                  <div className="mb-1 px-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                      Superset
                    </span>
                  </div>
                )}
                
                {/* Exercise items - Simplified to only show exercise names */}
                <div className={`space-y-1 ${group.isSuperset ? 'pl-2' : ''}`}>
                  {group.group.map((exercise, exIndex) => (
                    <div 
                      key={`${group.supersetGroupId || groupIndex}-exercise-${exIndex}`}
                      className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 dark:text-gray-100">
                          {cleanExerciseName(exercise.exercise_name)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <ButtonLink 
            to={`/workout-session/${workout.id}`}
            variant="outline"
            color="indigo"
            fullWidth
          >
            Start Workout
          </ButtonLink>
        </div>
      </Card>
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  if (error || !programData) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-red-600 dark:text-red-400">
        <h2 className="text-lg font-medium mb-2">Error Loading Workout Plan</h2>
        <p>{error || 'Unable to load workout plan data'}</p>
        <button 
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    );
  }
  
  const workoutsByDay = getWorkoutsByDay();
  const hasWorkouts = programData.workouts && programData.workouts.length > 0;
  
  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header with program details */}
      <div className="mb-8">
        <BackButton />
        
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {programData.name}
        </h1>
        
        {programData.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {programData.description}
          </p>
        )}
        
        <div className="flex flex-wrap gap-2">
          {programData.phase && (
            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
              {programData.phase}
            </span>
          )}
          <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full">
            {programData.weeks} {programData.weeks === 1 ? 'week' : 'weeks'}
          </span>
        </div>
      </div>
      
      {/* Weekly Schedule */}
      {hasWorkouts ? (
        <div className="space-y-6">
          {/* For each day of the week */}
          {Array.from({ length: 7 }, (_, i) => i + 1).map(day => {
            const workoutsForDay = workoutsByDay.get(day) || [];
            
            if (workoutsForDay.length === 0) {
              // Show a rest day card
              return (
                <div key={`day-${day}`} className="border-t pt-4 dark:border-gray-700">
                  <div className="flex items-center mb-3">
                    <FiCalendar className="mr-2 text-gray-500" />
                    <h2 className="text-lg font-medium text-gray-800 dark:text-white">
                      {getDayName(day)}
                    </h2>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      Rest Day
                    </p>
                  </div>
                </div>
              );
            }
            
            return (
              <div key={`day-${day}`} className="border-t pt-4 dark:border-gray-700">
                <div className="flex items-center mb-3">
                  <FiCalendar className="mr-2 text-indigo-500" />
                  <h2 className="text-lg font-medium text-gray-800 dark:text-white">
                    {getDayName(day)}
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workoutsForDay.map(workout => (
                    <div key={workout.id}>
                      {renderWorkoutCard(workout)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            No Workouts Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            There are no workouts defined for this program.
          </p>
        </div>
      )}
    </div>
  );
};

export default WorkoutPlanView; 