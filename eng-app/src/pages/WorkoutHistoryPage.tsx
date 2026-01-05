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
  order_in_workout?: number | null;
}

const WorkoutHistoryPage: React.FC = () => {
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [exportingSession, setExportingSession] = useState<string | null>(null);
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
            tempo,
            order_in_workout
          )
        `)
        .eq('workout_session_id', sessionId)
        .order('set_order', { ascending: true });

      if (setError) {
        return;
      }

      if (!setData || setData.length === 0) {
        return;
      }

      // Process the data into a more usable format
      const processedSets = setData.map(set => {
        // Handle exercise_instances property properly with type assertion
        const exerciseInstances = set.exercise_instances as {
          exercise_name?: string;
          each_side?: boolean;
          tempo?: string | null;
          order_in_workout?: number | null;
        } | null;

        // Ensure we have proper values for all properties
        return {
          exercise_name: exerciseInstances?.exercise_name || 'Unknown Exercise',
          set_order: Number(set.set_order) || 0,
          weight: String(set.weight || ''),
          reps: Number(set.reps) || 0,
          is_completed: Boolean(set.is_completed),
          each_side: Boolean(exerciseInstances?.each_side),
          tempo: exerciseInstances?.tempo ? String(exerciseInstances.tempo) : null,
          order_in_workout: exerciseInstances?.order_in_workout || null
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
          setWorkoutSessions([]);
          setIsLoading(false);
          return;
        }
        
        // Step 2: Get the workout IDs to fetch their details
        const workoutIds = sessions.map(session => session.workout_id).filter(id => id);
        
        if (workoutIds.length === 0) {
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
        
        // Create a map for fast workout lookup
        const workoutMap = new Map();
        if (workouts && workouts.length > 0) {
          workouts.forEach(workout => {
            workoutMap.set(workout.id, {
              name: workout.name || 'Unnamed Workout',
              description: workout.description
            });
          });
        } else {
          console.warn('No workouts found for the given IDs');
        }
        
        // Step 4: Process sessions with workout data and completed sets count
        const processedSessions = await Promise.all(
          sessions.map(async (session) => {
            // Get workout details from map or default to Unknown
            const workoutDetails = workoutMap.get(session.workout_id) || {
              name: 'Unknown Workout',
              description: null
            };
            
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
            
            return processedSession;
          })
        );
        
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

  const deleteWorkoutSession = async (sessionId: string) => {
    if (!sessionId) return;
    
    setIsDeleting(true);
    
    try {
      // First delete all completed exercise sets for this session
      const { error: setsError } = await supabase
        .from('completed_exercise_sets')
        .delete()
        .eq('workout_session_id', sessionId);
      
      if (setsError) {
        console.error('Error deleting completed sets:', setsError);
        throw setsError;
      }
      
      // Then delete the workout session
      const { error: sessionError } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (sessionError) {
        console.error('Error deleting workout session:', sessionError);
        throw sessionError;
      }
      
      // Remove the deleted session from state
      setWorkoutSessions(prevSessions => 
        prevSessions.filter(session => session.id !== sessionId)
      );
      
      // Reset delete state
      setSessionToDelete(null);
      setShowDeleteConfirm(false);
      
      // Show success message
      setError('Workout session deleted successfully');
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error('Error in deleteWorkoutSession:', err);
      setError('Failed to delete workout session');
    } finally {
      setIsDeleting(false);
    }
  };

  // Add handlers for delete operations

  const handleDeleteClick = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent expanding the session when clicking delete
    setSessionToDelete(sessionId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (sessionToDelete) {
      await deleteWorkoutSession(sessionToDelete);
    }
  };

  const handleCancelDelete = () => {
    setSessionToDelete(null);
    setShowDeleteConfirm(false);
  };

  // Export workout session to clipboard
  const exportSessionToClipboard = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setExportingSession(sessionId);

    try {
      const session = workoutSessions.find(s => s.id === sessionId);
      if (!session) return;

      // Ensure session details are loaded
      if (!session.completed_sets) {
        await fetchSessionDetails(sessionId);
      }

      // Get the updated session with details
      const updatedSession = workoutSessions.find(s => s.id === sessionId);
      if (!updatedSession?.completed_sets) {
        setError('Could not load session details for export');
        return;
      }

      // Generate export text
      const exportText = generateExportText(updatedSession);

      // Copy to clipboard
      await navigator.clipboard.writeText(exportText);

      // Show success feedback
      setError('Workout session copied to clipboard!');
      setTimeout(() => setError(null), 3000);

    } catch (err) {
      console.error('Error exporting session:', err);
      setError('Failed to export workout session');
      setTimeout(() => setError(null), 3000);
    } finally {
      setExportingSession(null);
    }
  };

  // Generate formatted text for export
  const generateExportText = (session: WorkoutSession): string => {
    const lines: string[] = [];

    // Header
    lines.push('='.repeat(50));
    lines.push(`WORKOUT SESSION: ${session.workout_name}`);
    lines.push('='.repeat(50));
    lines.push('');

    // Session details
    lines.push(`Date: ${format(new Date(session.start_time), 'MMMM d, yyyy')}`);
    lines.push(`Start Time: ${format(new Date(session.start_time), 'h:mm a')}`);
    if (session.end_time) {
      lines.push(`End Time: ${format(new Date(session.end_time), 'h:mm a')}`);
    }
    lines.push(`Duration: ${formatDuration(session.duration_seconds)}`);
    lines.push(`Status: ${session.end_time ? 'Completed' : 'In Progress'}`);
    lines.push(`Total Sets: ${session.completed_sets_count}`);
    lines.push('');

    if (session.workout_description) {
      lines.push(`Description: ${session.workout_description}`);
      lines.push('');
    }

    if (session.notes) {
      lines.push(`Notes: ${session.notes}`);
      lines.push('');
    }

    // Exercise details
    if (session.completed_sets && session.completed_sets.length > 0) {
      lines.push('EXERCISES:');
      lines.push('-'.repeat(30));
      lines.push('');

      // Group and sort exercises
      const groupedSets = session.completed_sets.reduce((acc, set) => {
        if (!acc[set.exercise_name]) {
          acc[set.exercise_name] = new Map();
        }
        const existingSet = acc[set.exercise_name].get(set.set_order);
        if (!existingSet || (set.is_completed && !existingSet.is_completed)) {
          acc[set.exercise_name].set(set.set_order, set);
        }
        return acc;
      }, {} as Record<string, Map<number, CompletedSet>>);

      const processedGroupedSets: Record<string, CompletedSet[]> = {};
      Object.entries(groupedSets).forEach(([exerciseName, setsMap]) => {
        processedGroupedSets[exerciseName] = Array.from(setsMap.values());
      });

      const sortedExercises = Object.entries(processedGroupedSets)
        .sort(([, setsA], [, setsB]) => {
          const orderA = setsA[0]?.order_in_workout ?? 999;
          const orderB = setsB[0]?.order_in_workout ?? 999;
          return orderA - orderB;
        });

      sortedExercises.forEach(([exerciseName, sets], exerciseIndex) => {
        lines.push(`${exerciseIndex + 1}. ${exerciseName}`);

        // Add exercise metadata
        if (sets[0]?.each_side) {
          lines.push('   (Each Side)');
        }
        if (sets[0]?.tempo) {
          lines.push(`   Tempo: ${sets[0].tempo}`);
        }

        // Add sets
        const sortedSets = sets.sort((a, b) => a.set_order - b.set_order);
        sortedSets.forEach((set) => {
          const status = set.is_completed ? '✓' : '✗';
          const weight = formatWeight(set.weight);
          lines.push(`   Set ${set.set_order}: ${weight} × ${set.reps} reps ${status}`);
        });

        lines.push('');
      });
    }

    lines.push('='.repeat(50));
    lines.push(`Exported from ENG App on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}`);

    return lines.join('\n');
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
              <div 
                className="flex items-start cursor-pointer flex-1" 
                onClick={() => toggleSessionExpansion(session.id)}
              >
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {session.workout_name || 'Unnamed Workout'}
                </h3>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                  {format(new Date(session.start_time), 'MMM d, yyyy')}
                </span>
                <button
                  onClick={(e) => exportSessionToClipboard(session.id, e)}
                  disabled={exportingSession === session.id}
                  className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors mr-2 disabled:opacity-50"
                  title="Export workout session to clipboard"
                >
                  {exportingSession === session.id ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={(e) => handleDeleteClick(session.id, e)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors mr-2"
                  title="Delete workout session"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 transition-transform duration-200 ${expandedSession === session.id ? 'transform rotate-180' : ''}`} 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                  onClick={() => toggleSessionExpansion(session.id)}
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
                  // First group sets by exercise name and deduplicate
                  (() => {
                    // Create a map to group sets by exercise and deduplicate by set_order
                    const groupedSets = session.completed_sets.reduce((acc, set) => {
                      if (!acc[set.exercise_name]) {
                        acc[set.exercise_name] = new Map(); // Use a map to ensure unique set_order values
                      }
                      // Only store the set if we don't already have this set_order or if this one is completed and the existing one isn't
                      const existingSet = acc[set.exercise_name].get(set.set_order);
                      if (!existingSet || (set.is_completed && !existingSet.is_completed)) {
                        acc[set.exercise_name].set(set.set_order, set);
                      }
                      return acc;
                    }, {} as Record<string, Map<number, CompletedSet>>);

                    // Convert the maps back to arrays for rendering
                    const processedGroupedSets: Record<string, CompletedSet[]> = {};
                    Object.entries(groupedSets).forEach(([exerciseName, setsMap]) => {
                      processedGroupedSets[exerciseName] = Array.from(setsMap.values());
                    });

                    return (
                      <div className="space-y-4">
                        {Object.entries(processedGroupedSets)
                          .sort(([, setsA], [, setsB]) => {
                            // Sort by order_in_workout if available, otherwise keep original order
                            const orderA = setsA[0]?.order_in_workout ?? 999;
                            const orderB = setsB[0]?.order_in_workout ?? 999;
                            return orderA - orderB;
                          })
                          .map(([exerciseName, sets], exerciseIndex) => (
                          <div key={`${session.id}-exercise-${exerciseIndex}`} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                            <h5 className="font-medium text-sm mb-2 text-gray-900 dark:text-white flex items-center">
                              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-xs font-medium text-indigo-800 dark:text-indigo-300 mr-2">
                                {exerciseIndex + 1}
                              </span>
                              <span>{exerciseName}</span>
                              {sets[0]?.each_side && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 rounded-full">
                                  Each Side
                                </span>
                              )}
                              {sets[0]?.tempo && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-full flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Tempo: {sets[0].tempo}
                                </span>
                              )}
                            </h5>

                            <div className="overflow-x-auto">
                              <table className="min-w-full bg-white dark:bg-gray-800 rounded-md overflow-hidden shadow-sm">
                                <thead className="bg-gray-100 dark:bg-gray-700">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                      Set
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                      Weight
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                      Reps
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                  {sets.sort((a, b) => a.set_order - b.set_order).map((set) => {
                                    // Verify that all needed properties exist (to avoid [object Object] display)
                                    if (!set || typeof set !== 'object') return null;
                                    
                                    // Ensure all set properties are properly stringified or formatted
                                    const setOrder = typeof set.set_order === 'number' ? set.set_order : '';
                                    const weight = typeof set.weight === 'string' ? set.weight : '';
                                    const reps = typeof set.reps === 'number' ? set.reps : 0;
                                    const isCompleted = Boolean(set.is_completed);
                                    
                                    return (
                                      <tr key={`${session.id}-${exerciseName}-set-${setOrder}`}
                                        className={`transition-colors ${!isCompleted ? 'text-gray-400 dark:text-gray-500' : ''}`}
                                      >
                                        <td className="px-3 py-2">
                                          {setOrder}
                                        </td>
                                        <td className="px-3 py-2 font-medium">
                                          {formatWeight(weight)}
                                        </td>
                                        <td className="px-3 py-2 font-medium">
                                          {reps}
                                        </td>
                                        <td className="px-3 py-2">
                                          {isCompleted ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                              <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                              </svg>
                                              Completed
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                              <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                              </svg>
                                              Skipped
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Add the delete confirmation dialog
  const DeleteConfirmationDialog = () => {
    if (!showDeleteConfirm) return null;
    
    const session = workoutSessions.find(s => s.id === sessionToDelete);
    const sessionName = session?.workout_name || 'this workout session';
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Delete Workout Session
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to delete {sessionName}? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancelDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8">
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
      
      <DeleteConfirmationDialog />
    </div>
  );
};

export default WorkoutHistoryPage; 