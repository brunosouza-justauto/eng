import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectProfile } from '../store/slices/authSlice';
import { supabase } from '../services/supabaseClient';
import BackButton from '../components/common/BackButton';
import { format } from 'date-fns';

interface WorkoutSession {
  id: string;
  workout_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  notes: string | null;
  workout_name: string;
  workout_description: string | null;
  completed_sets_count: number;
}

const WorkoutHistoryPage: React.FC = () => {
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const profile = useSelector(selectProfile);

  useEffect(() => {
    const fetchWorkoutHistory = async () => {
      if (!profile?.user_id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Fetching workout history for user:', profile.user_id);
        
        // Step 1: Get workout sessions
        const { data: sessions, error: sessionsError } = await supabase
          .from('workout_sessions')
          .select('id, workout_id, start_time, end_time, duration_seconds, notes')
          .eq('user_id', profile.user_id)
          .order('start_time', { ascending: false });
        
        if (sessionsError) {
          console.error('Error fetching workout sessions:', sessionsError);
          throw sessionsError;
        }
        
        if (!sessions || sessions.length === 0) {
          console.log('No workout sessions found for user');
          setWorkoutSessions([]);
          setIsLoading(false);
          return;
        }
        
        console.log(`Found ${sessions.length} workout sessions:`, sessions);
        
        // Step 2: Get the workout IDs to fetch their details
        const workoutIds = sessions.map(session => session.workout_id).filter(id => id);
        console.log('Workout IDs to fetch:', workoutIds);
        
        if (workoutIds.length === 0) {
          console.warn('No valid workout IDs found in sessions');
          // Process sessions without workout details
          const processedSessionsWithoutWorkouts = sessions.map(session => ({
            ...session,
            workout_name: 'Unknown Workout',
            workout_description: null,
            completed_sets_count: 0
          }));
          setWorkoutSessions(processedSessionsWithoutWorkouts);
          setIsLoading(false);
          return;
        }
        
        // Step 3: Fetch workout details directly
        const { data: workouts, error: workoutsError } = await supabase
          .from('workouts')
          .select('id, name, description')
          .in('id', workoutIds);
        
        if (workoutsError) {
          console.error('Error fetching workouts:', workoutsError);
          // Continue processing even if workouts fetch fails
        }
        
        console.log('Fetched workouts:', workouts || 'No workouts found');
        
        // Create a map for fast workout lookup
        const workoutMap = new Map();
        if (workouts && workouts.length > 0) {
          workouts.forEach(workout => {
            console.log(`Adding workout to map - ID: ${workout.id}, Name: ${workout.name || 'Unnamed'}`);
            workoutMap.set(workout.id, {
              name: workout.name || 'Unnamed Workout',
              description: workout.description
            });
          });
        } else {
          console.warn('No workouts found for the given IDs');
        }
        
        console.log('Workout map created with entries:', workoutMap.size);
        
        // Step 4: Process sessions with workout data and completed sets count
        const processedSessions = await Promise.all(
          sessions.map(async (session) => {
            // Get workout details from map or default to Unknown
            const workoutDetails = workoutMap.get(session.workout_id) || {
              name: 'Unknown Workout',
              description: null
            };
            
            console.log(`Processing session ${session.id} with workout_id: ${session.workout_id}`);
            console.log(`Workout details for ID ${session.workout_id}:`, workoutDetails || 'NOT FOUND');
            
            // Fetch completed sets count for this session
            const { count, error: countError } = await supabase
              .from('completed_exercise_sets')
              .select('*', { count: 'exact', head: true })
              .eq('workout_session_id', session.id);
            
            if (countError) {
              console.error(`Error fetching completed sets count for session ${session.id}:`, countError);
              return {
                ...session,
                workout_name: workoutDetails.name,
                workout_description: workoutDetails.description,
                completed_sets_count: 0
              };
            }
            
            // Create the processed session
            const processedSession = {
              ...session,
              workout_name: workoutDetails.name,
              workout_description: workoutDetails.description,
              completed_sets_count: count || 0
            };
            
            console.log(`Processed session ${session.id} with name "${processedSession.workout_name}"`);
            return processedSession;
          })
        );
        
        console.log('All processed sessions:', processedSessions);
        setWorkoutSessions(processedSessions);
      } catch (err) {
        console.error('Error fetching workout history:', err);
        setError('Failed to load workout history');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWorkoutHistory();
  }, [profile?.user_id]);

  // Helper function to format duration
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    
    return `${minutes}m`;
  };

  const renderWorkoutSessions = () => {
    if (workoutSessions.length === 0) {
      return (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No workout history available yet</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {workoutSessions.map(session => (
          <div 
            key={session.id} 
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {session.workout_name || 'Unnamed Workout'}
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {format(new Date(session.start_time), 'MMM d, yyyy')}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3 text-sm">
              <div>
                <span className="block text-gray-500 dark:text-gray-400">Start Time</span>
                <span className="font-medium text-gray-800 dark:text-gray-300">
                  {format(new Date(session.start_time), 'h:mm a')}
                </span>
              </div>
              
              <div>
                <span className="block text-gray-500 dark:text-gray-400">End Time</span>
                <span className="font-medium text-gray-800 dark:text-gray-300">
                  {session.end_time ? format(new Date(session.end_time), 'h:mm a') : 'Not completed'}
                </span>
              </div>
              
              <div>
                <span className="block text-gray-500 dark:text-gray-400">Duration</span>
                <span className="font-medium text-gray-800 dark:text-gray-300">
                  {formatDuration(session.duration_seconds)}
                </span>
              </div>
              
              <div>
                <span className="block text-gray-500 dark:text-gray-400">Sets Completed</span>
                <span className="font-medium text-gray-800 dark:text-gray-300">
                  {session.completed_sets_count}
                </span>
              </div>
              
              <div className="col-span-2">
                <span className="block text-gray-500 dark:text-gray-400">Status</span>
                <span className={`font-medium ${
                  session.end_time 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {session.end_time ? 'Completed' : 'In Progress'}
                </span>
              </div>
            </div>
            
            {session.notes && (
              <div className="mt-3 text-sm">
                <span className="block text-gray-500 dark:text-gray-400">Notes</span>
                <p className="text-gray-700 dark:text-gray-300">{session.notes}</p>
              </div>
            )}
            
            {session.workout_description && (
              <div className="mt-3 text-sm">
                <span className="block text-gray-500 dark:text-gray-400">Workout Description</span>
                <p className="text-gray-700 dark:text-gray-300">{session.workout_description}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton to="/dashboard" />

      <h1 className="text-3xl font-bold mb-6">Workout History</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        View your complete workout history below. Track your progress over time.
      </p>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <p>{error}</p>
        </div>
      ) : (
        renderWorkoutSessions()
      )}
    </div>
  );
};

export default WorkoutHistoryPage; 