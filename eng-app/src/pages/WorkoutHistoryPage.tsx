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
  completed_sets?: CompletedSet[];
}

interface CompletedSet {
  exercise_name: string;
  set_order: number;
  weight: string;
  reps: number;
  is_completed: boolean;
  each_side?: boolean;
  tempo?: string | null;
}

const WorkoutHistoryPage: React.FC = () => {
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const profile = useSelector(selectProfile);

  // Toggle session expansion
  const toggleSessionExpansion = (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
      fetchSessionDetails(sessionId);
    }
  };

  // Fetch detailed set information for a session
  const fetchSessionDetails = async (sessionId: string) => {
    try {
      // Check if the session already has details loaded
      const existingSession = workoutSessions.find(s => s.id === sessionId);
      if (existingSession?.completed_sets) {
        console.log('Session details already loaded');
        return;
      }

      const { data: setData, error: setError } = await supabase
        .from('completed_exercise_sets')
        .select(`
          exercise_instance_id,
          set_order,
          weight,
          reps,
          is_completed,
          exercise_instances:exercise_instances(
            exercise_name,
            each_side,
            tempo
          )
        `)
        .eq('workout_session_id', sessionId)
        .order('set_order', { ascending: true });

      if (setError) {
        console.error('Error fetching session details:', setError);
        return;
      }

      if (!setData || setData.length === 0) {
        console.log('No sets found for session', sessionId);
        return;
      }

      console.log('Fetched session details:', setData);

      // Process the data into a more usable format
      const processedSets = setData.map(set => {
        // Handle exercise_instances property properly with type assertion
        const exerciseInstances = set.exercise_instances as { 
          exercise_name?: string;
          each_side?: boolean;
          tempo?: string | null;
        } | null;
        
        return {
          exercise_name: exerciseInstances?.exercise_name || 'Unknown Exercise',
          set_order: set.set_order,
          weight: set.weight || '',
          reps: set.reps,
          is_completed: set.is_completed,
          each_side: exerciseInstances?.each_side || false,
          tempo: exerciseInstances?.tempo || null
        };
      });

      // Update the session with the completed sets data
      setWorkoutSessions(prev => 
        prev.map(session => 
          session.id === sessionId 
            ? { ...session, completed_sets: processedSets } 
            : session
        )
      );

    } catch (err) {
      console.error('Error in fetchSessionDetails:', err);
    }
  };

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

  // Helper function to format weight (to handle bodyweight exercises)
  const formatWeight = (weight: string): string => {
    if (weight === 'BW') return 'Bodyweight';
    if (!weight || weight === '') return '-';
    return `${weight} kg`;
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
            <div className="flex justify-between items-start mb-2 cursor-pointer" onClick={() => toggleSessionExpansion(session.id)}>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {session.workout_name || 'Unnamed Workout'}
              </h3>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                  {format(new Date(session.start_time), 'MMM d, yyyy')}
                </span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 transition-transform duration-200 ${expandedSession === session.id ? 'transform rotate-180' : ''}`} 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
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

            {/* Completed Sets Detail */}
            {expandedSession === session.id && (
              <div className="mt-4 animate-fadeIn">
                <h4 className="text-md font-medium mb-2 text-gray-800 dark:text-white">
                  Completed Sets
                </h4>
                
                {!session.completed_sets ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
                  </div>
                ) : session.completed_sets.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No detailed set information available
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Exercise
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Set
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Weight
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Reps
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {session.completed_sets.map((set, index) => (
                          <tr key={`${session.id}-set-${index}`} className={set.is_completed ? '' : 'opacity-50'}>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {set.exercise_name}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {set.set_order}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {formatWeight(set.weight)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {set.reps}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col space-y-1">
                                {set.each_side && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 text-xs rounded-full inline-flex items-center w-fit">
                                    Each Side
                                  </span>
                                )}
                                {set.tempo && (
                                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300 text-xs rounded-full inline-flex items-center w-fit">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Tempo: {set.tempo}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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