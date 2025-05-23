import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { format } from 'date-fns';
import { FiCalendar, FiClock, FiCheck, FiX } from 'react-icons/fi';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';

interface WorkoutSessionData {
  id: string;
  user_id: string;
  workout_id: string;
  start_time: string;
  end_time: string | null;
  completed: boolean;
  status: string;
  notes: string | null;
  rating: number | null;
  created_at: string;
}

interface WorkoutData {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

interface ExerciseInstanceData {
  id: string;
  workout_session_id: string;
  exercise_id: string;
  order: number;
  sets: number;
  reps: number | null;
  weight: number | null;
  duration: number | null;
  distance: number | null;
  notes: string | null;
  exercise: {
    id: string;
    name: string;
    description: string | null;
  };
  completed_sets: CompletedSetRecord[];
  prescribed_sets: PrescribedSetRecord[];
  each_side: boolean;
  tempo: number | null;
  feedback?: {
    id: string;
    pain_level: number | null;
    pump_level: number | null;
    workload_level: number | null;
    notes: string | null;
    created_at: string;
  } | null;
}

interface CompletedSetRecord {
  id: string;
  exercise_instance_id: string;
  set_order: number;
  weight: string | null;
  reps: number | null;
  is_completed: boolean;
  notes: string | null;
  set_type: string | null;
  created_at: string;
  updated_at: string;
  
  // Keep these for backward compatibility, but they're not used
  set_number?: number;
  actual_reps?: number | null;
  actual_weight?: string | null;
  actual_duration?: number | null;
  actual_distance?: number | null;
  completed?: boolean;
}

interface PrescribedSetRecord {
  id: string;
  exercise_instance_id: string;
  set_order: number;
  type: string;
  reps: string;
  weight: string | null;
  rest_seconds: number | null;
  duration: string | null;
  created_at: string;
  updated_at: string;
}

interface AthleteData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_id: string;
}

// Component to display feedback in the AthleteWorkoutsPage
const FeedbackDisplay = ({ feedback }: { feedback: ExerciseInstanceData['feedback'] }) => {
  if (!feedback) return null;
  
  return (
    <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
      <h4 className="text-sm font-semibold mb-2">Athlete Feedback</h4>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">Pain</span>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            feedback.pain_level && feedback.pain_level >= 4 ? 'bg-red-500 text-white' :
            feedback.pain_level && feedback.pain_level >= 2 ? 'bg-yellow-500 text-white' :
            feedback.pain_level ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
          }`}>
            {feedback.pain_level || '-'}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">Pump</span>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            feedback.pump_level && feedback.pump_level >= 4 ? 'bg-green-500 text-white' :
            feedback.pump_level && feedback.pump_level >= 2 ? 'bg-yellow-500 text-white' :
            feedback.pump_level ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-700'
          }`}>
            {feedback.pump_level || '-'}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">Workload</span>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            feedback.workload_level === 3 ? 'bg-green-500 text-white' :
            feedback.workload_level && feedback.workload_level < 3 ? 'bg-blue-500 text-white' :
            feedback.workload_level ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-700'
          }`}>
            {feedback.workload_level || '-'}
          </div>
        </div>
      </div>
      {feedback.notes && (
        <div className="mt-2">
          <p className="text-xs italic">{feedback.notes}</p>
        </div>
      )}
    </div>
  );
};

const AthleteWorkoutsPage: React.FC = () => {
  const { id, logId: routeLogId } = useParams<{ id: string; logId: string }>();
  const [searchParams] = useSearchParams();
  const queryLogId = searchParams.get('log');
  
  // Use route parameter first, fall back to query parameter for backward compatibility
  const logId = routeLogId || queryLogId;
  
  const [athlete, setAthlete] = useState<AthleteData | null>(null);
  const [workoutSession, setWorkoutSession] = useState<WorkoutSessionData | null>(null);
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [exercises, setExercises] = useState<ExerciseInstanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalSets, setTotalSets] = useState(0);
  const [completedSetsCount, setCompletedSetsCount] = useState(0);

  useEffect(() => {
    const fetchAthleteData = async () => {
      try {
        if (!id) return;
        
        // Fetch athlete data
        const { data: athleteData, error: athleteError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, user_id')
          .eq('id', id)
          .single();
          
        if (athleteError) throw athleteError;
        setAthlete(athleteData);
        
        // If a specific workout log is requested
        if (logId) {
          await fetchWorkoutSession(logId);
        }
        
      } catch (err) {
        console.error('Error fetching athlete data:', err);
        setError('Failed to load athlete data');
      } finally {
        if (!logId) setLoading(false);
      }
    };
    
    const fetchWorkoutSession = async (sessionId: string) => {
      try {
        // Fetch workout session
        const { data: sessionData, error: sessionError } = await supabase
          .from('workout_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
          
        if (sessionError) throw sessionError;
        
        setWorkoutSession(sessionData);

        console.log("Workout Session:", sessionData);
        
        // Fetch workout details
        if (sessionData.workout_id) {
          const { data: workoutData, error: workoutError } = await supabase
            .from('workouts')
            .select('*')
            .eq('id', sessionData.workout_id)
            .single();
            
          if (workoutError) throw workoutError;
          setWorkout(workoutData);

          console.log("Workout Data:", workoutData);
          
          // Fetch exercise instances directly related to this workout
          const { data: exerciseInstanceData, error: exerciseInstanceError } = await supabase
            .from('exercise_instances')
            .select(`
              *,
              exercise:exercises(id, name, description)
            `)
            .eq('workout_id', sessionData.workout_id)
            .order('order_in_workout', { ascending: true });
            
          if (exerciseInstanceError) {
            console.error('Error fetching exercise instances:', exerciseInstanceError);
            throw exerciseInstanceError;
          }
          
          console.log("Exercise Instances:", exerciseInstanceData);
          
          if (exerciseInstanceData && exerciseInstanceData.length > 0) {
            // For each exercise instance, fetch any completed sets (if they exist)
            const exerciseInstances = await Promise.all(
              exerciseInstanceData.map(async (instance) => {
                // Fetch any completed sets for this exercise instance
                const { data: completedSets, error: completedSetsError } = await supabase
                  .from('completed_exercise_sets')
                  .select('*')
                  .eq('exercise_instance_id', instance.id)
                  .eq('workout_session_id', sessionId)
                  .order('set_order', { ascending: true });
                  
                if (completedSetsError) {
                  console.error(`Error fetching completed sets for instance ${instance.id}:`, completedSetsError);
                }

                console.log("Completed Sets:", completedSets);
                
                // Process instance data with any completed sets
                const exerciseInstance = {
                  id: instance.id,
                  exercise_id: instance.exercise_db_id,
                  order: instance.order_in_workout || 0,
                  workout_session_id: sessionId,
                  exercise_name: instance.exercise_name || 'Unknown Exercise',
                  sets: parseInt(instance.sets) || 0,
                  reps: instance.reps ? parseInt(instance.reps) : null,
                  // Try to extract weight from multiple possible sources
                  weight: (() => {
                    // First check if sets_data looks like a weight
                    if (instance.sets_data && !isNaN(parseFloat(instance.sets_data))) {
                      return parseFloat(instance.sets_data);
                    }
                    // Then try other fields that might contain weight info
                    // For legacy data compatibility
                    if (instance.weight) {
                      return parseFloat(instance.weight);
                    }
                    return null;
                  })(),
                  duration: null,
                  distance: null,
                  notes: instance.notes,
                  exercise: instance.exercise || { name: instance.exercise_name, description: null },
                  each_side: instance.each_side || false,
                  tempo: instance.tempo || null,
                  completed_sets: completedSets || [],
                  prescribed_sets: [] as PrescribedSetRecord[],
                  feedback: null // Will be populated with feedback data
                };

                // Fetch prescribed sets for this exercise instance
                const { data: prescribedSets, error: prescribedSetsError } = await supabase
                  .from('exercise_sets')
                  .select('*')
                  .eq('exercise_instance_id', instance.id)
                  .order('set_order', { ascending: true });
                  
                if (prescribedSetsError) {
                  console.error(`Error fetching prescribed sets for instance ${instance.id}:`, prescribedSetsError);
                }

                console.log("Prescribed Sets:", prescribedSets);

                // Add the prescribed sets to our exercise instance
                exerciseInstance.prescribed_sets = prescribedSets || [];
                
                // Fetch feedback for this exercise instance
                const { data: feedbackData, error: feedbackError } = await supabase
                  .from('exercise_feedback')
                  .select('*')
                  .eq('exercise_instance_id', instance.id)
                  .eq('workout_session_id', sessionId)
                  .single();
                  
                if (feedbackError && feedbackError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
                  console.error(`Error fetching feedback for instance ${instance.id}:`, feedbackError);
                }
                
                // Add feedback data to exercise instance
                exerciseInstance.feedback = feedbackData || null;

                // Add log to debug weight related fields
                console.log(`Exercise ${instance.exercise_name} data:`, {
                  sets_data: instance.sets_data,
                  each_side: instance.each_side,
                  is_bodyweight: instance.is_bodyweight
                });

                console.log(`Exercise ${instance.exercise_name} after processing:`, {
                  weight: exerciseInstance.weight,
                  has_prescribed_sets: (prescribedSets || []).length > 0,
                  has_weights_in_prescribed_sets: (prescribedSets || []).some(set => set.weight),
                  prescribed_sets_sample: prescribedSets ? prescribedSets.slice(0, 2) : [],
                  has_feedback: !!feedbackData
                });

                return exerciseInstance;
              })
            );
            
            setExercises(exerciseInstances);
          } else {
            setExercises([]);
          }
        } else {
          // No workout found for this session
          setExercises([]);
        }
      } catch (err) {
        console.error('Error fetching workout data:', err);
        setError('Failed to load workout data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAthleteData();
  }, [id, logId]);

  // Keep only one useEffect for completion tracking
  useEffect(() => {
    if (!workoutSession || exercises.length === 0) return;
    
    let totalSetsCount = 0;
    let completedSetsCount = 0;
    
    exercises.forEach((exercise) => {
      // Count total sets
      const exerciseSets = parseInt(String(exercise.sets)) || 0;
      totalSetsCount += exerciseSets;
      
      // Count completed sets
      if (exercise.completed_sets && exercise.completed_sets.length > 0) {
        const uniqueCompletedSets = new Set();
        exercise.completed_sets.forEach((set) => {
          if (set.is_completed) {
            uniqueCompletedSets.add(set.set_order);
          }
        });
        completedSetsCount += uniqueCompletedSets.size;
      }
    });
    
    // Update state with counts
    setTotalSets(totalSetsCount);
    setCompletedSetsCount(completedSetsCount);
    
    // Update workout session completion status
    const isCompleted = completedSetsCount >= totalSetsCount && totalSetsCount > 0;
    if (isCompleted !== workoutSession.completed) {
      setWorkoutSession({
        ...workoutSession,
        completed: isCompleted,
        status: isCompleted ? 'completed' : 'in_progress'
      });
    }
  }, [exercises, workoutSession]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <PageHeader title="Error" />
        <Card>
          <div className="p-4 text-red-500">{error}</div>
        </Card>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="p-4">
        <PageHeader title="Athlete Not Found" />
        <Card>
          <div className="p-4">The requested athlete could not be found.</div>
        </Card>
      </div>
    );
  }

  // If no specific workout log is requested, show a list of recent workouts
  if (!logId || !workoutSession) {
    return (
      <div className="p-4">
        <PageHeader 
          title={`${athlete.first_name} ${athlete.last_name}'s Workouts`} 
          subtitle="View workout history and details"
        />
        <div className="mb-4">
          <WorkoutHistory athleteId={athlete.id} athleteUserId={athlete.user_id} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <PageHeader 
        title={`${athlete.first_name} ${athlete.last_name}'s Workout`} 
        subtitle={workout?.name || 'Workout Details'}
      />
      
      <div className="grid gap-4 mb-6">
        <Card>
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">{workout?.name || 'Workout'}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center">
                <FiCalendar className="mr-2 text-gray-400" />
                <span>
                  Date: {workoutSession.start_time 
                    ? format(new Date(workoutSession.start_time), 'PPP') 
                    : 'Not started'}
                </span>
              </div>
              
              <div className="flex items-center">
                <FiClock className="mr-2 text-gray-400" />
                <span>
                  Duration: {workoutSession.start_time && workoutSession.end_time 
                    ? formatDuration(new Date(workoutSession.start_time), new Date(workoutSession.end_time)) 
                    : 'In progress'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center mb-4">
              <div className={`flex items-center ${workoutSession.completed ? 'text-green-500' : 'text-yellow-500'}`}>
                {workoutSession.completed 
                  ? <><FiCheck className="mr-1" /> Completed</> 
                  : <><FiX className="mr-1" /> Not Completed{completedSetsCount > 0 ? ` (${completedSetsCount}/${totalSets} sets done)` : ''}</>}
              </div>
            </div>
            
            {workoutSession.notes && (
              <div className="mb-4">
                <h3 className="text-sm text-gray-400 mb-1">Notes</h3>
                <p className="text-sm">{workoutSession.notes}</p>
              </div>
            )}
          </div>
        </Card>
        
        {exercises.length > 0 ? (
          <div className="grid gap-4">
            <h2 className="text-xl font-semibold">Exercises</h2>
            
            {exercises.map((exercise) => (
              <Card key={exercise.id}>
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-2">{exercise.exercise.name}</h3>
                  
                  {exercise.exercise.description && (
                    <p className="text-sm text-gray-400 mb-4">{exercise.exercise.description}</p>
                  )}
                  
                  <div className="mb-2">
                    <span className="text-sm text-gray-400">
                      {formatExerciseTarget(exercise)}
                    </span>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Completed Sets</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-700">
                        <thead>
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Set</th>
                            {(
                              <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Reps</th>
                            )}
                            {(
                              <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Weight</th>
                            )}
                            {exercise.duration !== null && (
                              <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Duration</th>
                            )}
                            {exercise.distance !== null && (
                              <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Distance</th>
                            )}
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {Array.from({ length: exercise.sets }).map((_, index) => {
                            const setNumber = index + 1;
                            // Find the latest completed set for this set number (in case of duplicates)
                            const completedSet = exercise.completed_sets
                              .filter(set => set.set_order === setNumber)
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                            
                            return (
                              <tr key={`set-${setNumber}`}>
                                <td className="px-2 py-2 text-sm">{setNumber}</td>
                                
                                {exercise.reps !== null && (
                                  <td className="px-2 py-2 text-sm">
                                    {completedSet?.reps ?? '-'} / {(() => {
                                      // Get the prescribed rep value as a string
                                      const prescribedSet = exercise.prescribed_sets.find(set => set.set_order === setNumber);
                                      // Parse it if found, otherwise fall back to exercise.reps
                                      return prescribedSet ? prescribedSet.reps : exercise.reps;
                                    })()}
                                  </td>
                                )}
                                
                                {(
                                  <td className="px-2 py-2 text-sm">
                                    {(() => {
                                      // Show completed weight with proper formatting
                                      let actualDisplay = '-';
                                      if (completedSet?.weight) {
                                        // Handle bodyweight exercises
                                        const isBodyweight = completedSet.weight === 'BW';
                                        if (isBodyweight) {
                                          actualDisplay = 'Bodyweight';
                                        } else {
                                          // Add "per side" if exercise is flagged as each_side
                                          actualDisplay = `${completedSet.weight} kg${exercise.each_side ? ' per side' : ''}`;
                                        }
                                      }
                                      
                                      return actualDisplay;
                                    })()}
                                  </td>
                                )}
                                
                                {exercise.duration !== null && (
                                  <td className="px-2 py-2 text-sm">
                                    {completedSet?.actual_duration ? `${completedSet.actual_duration} sec` : '-'} / {(() => {
                                      // Get the prescribed duration
                                      const prescribedSet = exercise.prescribed_sets.find(set => set.set_order === setNumber);
                                      // Use it if found, otherwise fall back to exercise.duration
                                      return prescribedSet && prescribedSet.duration ? prescribedSet.duration : `${exercise.duration} sec`;
                                    })()}
                                  </td>
                                )}
                                
                                {exercise.distance !== null && (
                                  <td className="px-2 py-2 text-sm">
                                    {completedSet?.actual_distance ? `${completedSet.actual_distance} m` : '-'} / {`${exercise.distance} m`}
                                  </td>
                                )}
                                
                                <td className="px-2 py-2">
                                  {completedSet?.is_completed ? (
                                    <span className="inline-flex items-center text-green-500">
                                      <FiCheck className="mr-1" /> Completed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-gray-400">
                                      <FiX className="mr-1" /> Not Completed
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
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="p-4 text-center text-gray-400">
              No exercises found for this workout session.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// Component to display workout history for an athlete
const WorkoutHistory: React.FC<{ athleteId: string, athleteUserId: string }> = ({ athleteId, athleteUserId }) => {
  const [sessions, setSessions] = useState<WorkoutSessionData[]>([]);
  const [workouts, setWorkouts] = useState<Record<string, WorkoutData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkoutHistory = async () => {
      try {
        // Fetch recent workout sessions for the athlete
        const { data: sessionData, error: sessionError } = await supabase
          .from('workout_sessions')
          .select('*')
          .eq('user_id', athleteUserId)
          .order('created_at', { ascending: false })
          .limit(20);
          
        if (sessionError) throw sessionError;

        setSessions(sessionData || []);
        
        if (sessionData && sessionData.length > 0) {

          sessionData?.forEach((session: WorkoutSessionData) => {
            if (session.end_time) {
              session.completed = true;
            }
          });

          // Get unique workout IDs
          const workoutIds = [...new Set(sessionData.map(session => session.workout_id))];
          
          // Fetch workout details for all sessions
          const { data: workoutData, error: workoutError } = await supabase
            .from('workouts')
            .select('*')
            .in('id', workoutIds);
            
          if (workoutError) throw workoutError;
          
          // Create a map of workout IDs to workout data
          const workoutMap: Record<string, WorkoutData> = {};
          workoutData?.forEach((workout: WorkoutData) => {
            workoutMap[workout.id] = workout;
          });
          
          setWorkouts(workoutMap);
        }
      } catch (err) {
        console.error('Error fetching workout history:', err);
        setError('Failed to load workout history');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWorkoutHistory();
  }, [athleteId]);

  if (loading) {
    return <Spinner size="md" />;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <div className="p-4 text-center text-gray-400">
          No workout history found for this athlete.
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {sessions.map((session: WorkoutSessionData) => (
        console.log('session', session),
        <Card key={session.id}>
          <a 
            href={`/admin/athletes/${athleteId}/workouts/log/${session.id}`}
            className="block p-4 hover:bg-gray-800 transition-colors duration-150"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-medium">
                {workouts[session.workout_id]?.name || 'Unnamed Workout'}
              </h3>
              <div className={`px-2 py-1 rounded text-xs ${
                session.completed ? 'bg-green-900 text-green-300' : 
                session.status === 'in_progress' ? 'bg-yellow-900 text-yellow-300' : 
                'bg-gray-700 text-gray-300'
              }`}>
                {session.completed ? 'Completed' : 
                 session.status === 'in_progress' ? 'In Progress' : 
                 'Not Started'}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-400">
              <div className="flex items-center">
                <FiCalendar className="mr-1" />
                {session.start_time 
                  ? format(new Date(session.start_time), 'PPP') 
                  : format(new Date(session.created_at), 'PPP')}
              </div>
              
              {session.start_time && session.end_time && (
                <div className="flex items-center">
                  <FiClock className="mr-1" />
                  {formatDuration(new Date(session.start_time), new Date(session.end_time))}
                </div>
              )}
            </div>
            
            {session.notes && (
              <div className="mt-2 text-sm text-gray-400">
                {session.notes.length > 100 
                  ? `${session.notes.substring(0, 100)}...` 
                  : session.notes}
              </div>
            )}
          </a>
        </Card>
      ))}
    </div>
  );
};

// Helper function to format duration between two dates
const formatDuration = (start: Date, end: Date): string => {
  const durationMs = end.getTime() - start.getTime();
  const minutes = Math.floor(durationMs / (1000 * 60));
  
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
};

// Add a helper function to determine if an exercise is likely to use weights
const isWeightExercise = (exercise: ExerciseInstanceData): boolean => {
  // Check multiple conditions to determine if this is an exercise that uses weights
  
  // If we have weight data directly on the exercise
  if (exercise.weight !== null && exercise.weight > 0) {
    return true;
  }
  
  // If we have prescribed sets with weight info
  if (exercise.prescribed_sets.some(set => set.weight && set.weight !== 'BW')) {
    return true;
  }
  
  // If we have completed sets with weight info
  if (exercise.completed_sets.some(set => set.weight && set.weight !== 'BW')) {
    return true;
  }
  
  return true;
};

// Update the formatExerciseTarget function to better display weight info
const formatExerciseTarget = (exercise: ExerciseInstanceData): string => {
  const parts = [];
  
  if (exercise.sets) {
    parts.push(`${exercise.sets} sets`);
  }
  
  if (exercise.reps !== null) {
    parts.push(`${exercise.reps} reps`);
  }
  
  // Check if it's a weight exercise and display weight information
  if (isWeightExercise(exercise)) {
    // Try to get weight info from prescribed sets first
    const firstPrescribedSet = exercise.prescribed_sets[0];
    if (firstPrescribedSet?.weight) {
      if (firstPrescribedSet.weight === 'BW') {
        parts.push('Bodyweight');
      } else if (firstPrescribedSet.weight.toLowerCase().includes('kg')) {
        parts.push(`${firstPrescribedSet.weight}${exercise.each_side ? ' per side' : ''}`);
      } else {
        parts.push(`${firstPrescribedSet.weight} kg${exercise.each_side ? ' per side' : ''}`);
      }
    } else if (exercise.weight) {
      parts.push(`${exercise.weight} kg${exercise.each_side ? ' per side' : ''}`);
    } else {
      parts.push('With weights');
    }
  }
  
  if (exercise.duration !== null) {
    parts.push(`${exercise.duration} sec`);
  }
  
  if (exercise.distance !== null) {
    parts.push(`${exercise.distance} m`);
  }
  
  return parts.join(' • ');
};

export default AthleteWorkoutsPage; 