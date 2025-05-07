import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectProfile } from '../store/slices/authSlice';
import { supabase } from '../services/supabaseClient';
import { SetType, ExerciseSet } from '../types/adminTypes';
import { fetchExerciseById } from '../utils/exerciseAPI';

// Define types for the component
interface ExerciseInstanceData {
  id: string;
  exercise_db_id: string | null;
  exercise_name: string;
  sets: string | null;
  reps: string | null;
  rest_period_seconds: number | null;
  tempo: string | null;
  notes: string | null;
  order_in_workout: number | null;
  set_type?: SetType | null;
  sets_data?: ExerciseSet[]; // Add support for individual set data
}

// Interface for database exercise set
interface DatabaseExerciseSet {
  id: string;
  exercise_instance_id: string;
  set_order: number;
  type: SetType;
  reps: string;
  weight?: string | null;
  rest_seconds?: number | null;
  duration?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface WorkoutData {
  id: string;
  name: string;
  day_of_week: number | null;
  week_number: number | null;
  order_in_program: number | null;
  description: string | null;
  exercise_instances: ExerciseInstanceData[];
}

interface WorkoutSessionParams extends Record<string, string | undefined> {
  workoutId: string;
}

interface CompletedSetData {
  exerciseInstanceId: string;
  setOrder: number;
  weight: string;
  reps: number;
  isCompleted: boolean;
  notes: string;
  setType?: SetType | null;
}

// Interface for the database record
interface CompletedSetRecord {
  workout_session_id: string;
  exercise_instance_id: string;
  set_order: number;
  weight: string;
  reps: number;
  is_completed: boolean;
  notes: string;
  set_type?: SetType | null;
}

// Create a global cache for exercise images to prevent redundant API calls
const exerciseImageCache = new Map<string, { url: string; isAnimation: boolean }>();

// Exercise Demonstration Component wrapped in React.memo to prevent unnecessary rerenders
const ExerciseDemonstration = React.memo(({ exerciseName, exerciseDbId, expanded = true }: { 
  exerciseName: string; 
  exerciseDbId?: string | null;
  expanded?: boolean;
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isAnimation, setIsAnimation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Create a cache key that combines ID and name
  const cacheKey = useMemo(() => {
    return `${exerciseDbId || ''}:${exerciseName}`;
  }, [exerciseDbId, exerciseName]);
  
  useEffect(() => {
    // Check cache first
    if (exerciseImageCache.has(cacheKey)) {
      const cachedData = exerciseImageCache.get(cacheKey)!;
      setImageUrl(cachedData.url);
      setIsAnimation(cachedData.isAnimation);
      setIsLoading(false);
      return;
    }
    
    const loadExerciseImage = async () => {
      setIsLoading(true);
      setImageError(false);
      
      try {
        // Try to fetch from HeyGainz API if we have an exercise DB ID
        if (exerciseDbId) {
          console.log(`Fetching exercise image for ID: ${exerciseDbId}`);
          const exercise = await fetchExerciseById(exerciseDbId);
          
          if (exercise && exercise.image) {
            console.log(`Found image from API: ${exercise.image}`);
            
            // Store in cache
            exerciseImageCache.set(cacheKey, {
              url: exercise.image,
              isAnimation: exercise.image.toLowerCase().endsWith('.gif')
            });
            
            setImageUrl(exercise.image);
            setIsAnimation(exercise.image.toLowerCase().endsWith('.gif'));
            setIsLoading(false);
            return;
          }
        }
        
        // If we don't have an ID or couldn't find the exercise, try to search by name
        console.log(`Searching for exercise by name: ${exerciseName}`);
        
        // Try to find a close match in the exercises database
        const searchResponse = await fetch(`https://svc.heygainz.com/api/exercises?search=${encodeURIComponent(exerciseName)}&page=1&per_page=1`);
        const searchData = await searchResponse.json();
        
        if (searchData && searchData.data && searchData.data.length > 0) {
          const matchedExercise = searchData.data[0];
          console.log(`Found exercise match: ${matchedExercise.name} with image: ${matchedExercise.gif_url}`);
          
          // Store in cache
          exerciseImageCache.set(cacheKey, {
            url: matchedExercise.gif_url,
            isAnimation: matchedExercise.gif_url.toLowerCase().endsWith('.gif')
          });
          
          setImageUrl(matchedExercise.gif_url);
          setIsAnimation(matchedExercise.gif_url.toLowerCase().endsWith('.gif'));
        } else {
          console.log(`No exercise found for name: ${exerciseName}`);
          setImageUrl(null);
        }
      } catch (error) {
        console.error('Error loading exercise image:', error);
        setImageError(true);
        setImageUrl(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadExerciseImage();
  }, [cacheKey]); // Only cacheKey as dependency, which is memoized

  // If not expanded, don't render anything
  if (!expanded) return null;
  
  // When loading
  if (isLoading) {
    return (
      <div className="mb-3 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden h-32 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  // If we have an image and no error
  if (imageUrl && !imageError) {
    return (
      <div className="mb-3 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden h-32 relative">
        <img 
          src={imageUrl} 
          alt={`${exerciseName} demonstration`}
          className="w-full h-full object-contain"
          onError={() => setImageError(true)}
        />
        {isAnimation && (
          <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            GIF
          </div>
        )}
      </div>
    );
  }
  
  // Fallback to placeholder with exercise name and icon
  return (
    <div className="mb-3 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden h-32 flex items-center justify-center">
      <div className="text-center text-gray-500 dark:text-gray-400 text-sm p-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <div>{exerciseName}</div>
      </div>
    </div>
  );
});

const WorkoutSessionPage: React.FC = () => {
  const { workoutId } = useParams<WorkoutSessionParams>();
  const profile = useSelector(selectProfile);
  const navigate = useNavigate();

  // State for workout data
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for workout tracking
  const [isWorkoutStarted, setIsWorkoutStarted] = useState<boolean>(false);
  const [workoutSessionId, setWorkoutSessionId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [completedSets, setCompletedSets] = useState<Map<string, CompletedSetData[]>>(new Map());
  
  // Add new state for rest timer
  const [activeRestTimer, setActiveRestTimer] = useState<{
    exerciseId: string;
    setIndex: number;
    timeLeft: number;
    totalTime: number;
  } | null>(null);
  
  // Audio ref for timer alert
  const alertSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Timer reference for cleanup
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const pausedTimeRef = useRef<number>(0);

  // Add new ref for tracking the timer state
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // State to track if speech is enabled
  const [isSpeechEnabled, setIsSpeechEnabled] = useState<boolean>(false);

  // State to track which exercise demonstrations are shown
  const [shownDemonstrations, setShownDemonstrations] = useState<Record<string, boolean>>({});

  // Check for saved speech preference on component mount
  useEffect(() => {
    const savedSpeechPreference = localStorage.getItem('workout-speech-enabled');
    if (savedSpeechPreference === 'true') {
      setIsSpeechEnabled(true);
      console.log('Speech enabled from saved preference');
    }
  }, []);

  // Load workout data
  useEffect(() => {
    const fetchWorkout = async () => {
      if (!workoutId) {
        setError('No workout ID provided');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Enhanced query to explicitly fetch the exercise sets data
        const { data, error: fetchError } = await supabase
          .from('workouts')
          .select(`
            id,
            name,
            day_of_week,
            week_number,
            order_in_program,
            description,
            exercise_instances:exercise_instances (
              id,
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
          .eq('id', workoutId)
          .single();

        if (fetchError) throw fetchError;

        if (data && data.exercise_instances) {
          console.log('*** DETAILED WORKOUT DATA ***');
          console.log('Raw workout data:', JSON.stringify(data, null, 2));
          console.log('*** EXERCISE INSTANCES ***');
          
          // Now fetch the exercise sets data for each exercise instance
          const exerciseInstanceIds = data.exercise_instances.map((ex: ExerciseInstanceData) => ex.id);
          
          console.log('Fetching exercise sets for instances:', exerciseInstanceIds);
          
          // Query exercise_sets for all exercise instances in this workout
          const { data: setsData, error: setsError } = await supabase
            .from('exercise_sets')
            .select('*')
            .in('exercise_instance_id', exerciseInstanceIds)
            .order('set_order', { ascending: true });
            
          if (setsError) {
            console.error('Error fetching exercise sets:', setsError);
          } else {
            console.log('Fetched exercise sets:', setsData);
            
            // Group sets by exercise instance
            const setsByExerciseId = new Map<string, ExerciseSet[]>();
            
            if (setsData) {
              setsData.forEach((set: DatabaseExerciseSet) => {
                const exerciseId = set.exercise_instance_id;
                if (!setsByExerciseId.has(exerciseId)) {
                  setsByExerciseId.set(exerciseId, []);
                }
                
                setsByExerciseId.get(exerciseId)?.push({
                  id: set.id,
                  set_order: set.set_order,
                  type: set.type,
                  reps: set.reps,
                  weight: set.weight || undefined,
                  rest_seconds: set.rest_seconds || undefined,
                  duration: set.duration || undefined
                });
              });
              
              // Attach the sets to their respective exercise instances
              data.exercise_instances.forEach((ex: ExerciseInstanceData) => {
                if (setsByExerciseId.has(ex.id)) {
                  ex.sets_data = setsByExerciseId.get(ex.id);
                  console.log(`Attached ${ex.sets_data?.length} sets to ${ex.exercise_name}`);
                }
              });
            }
          }
          
          // Detailed logging for each exercise instance
          data.exercise_instances.forEach((ex: ExerciseInstanceData, i: number) => {
            console.log(`Exercise #${i+1}: ${ex.exercise_name} (ID: ${ex.id})`);
            console.log(`  Default reps: ${ex.reps}, Default sets: ${ex.sets}`);
            
            if (ex.sets_data && Array.isArray(ex.sets_data) && ex.sets_data.length > 0) {
              console.log(`  Has ${ex.sets_data.length} sets_data entries:`);
              ex.sets_data.forEach((set: ExerciseSet, j: number) => {
                console.log(`    Set #${j+1}: reps=${set.reps}, type=${set.type}, weight=${set.weight}`);
              });
            } else {
              console.log('  No sets_data available');
            }
          });
          
          setWorkout(data as WorkoutData);
          initializeCompletedSets(data as WorkoutData);
        } else {
          setError('Workout not found');
        }
      } catch (err) {
        console.error('Error fetching workout:', err);
        setError('Failed to load workout data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkout();
  }, [workoutId]);

  // Helper to get a friendly name for the set type
  const getSetTypeName = (setType: SetType | null | undefined): string => {
    if (!setType) return '';
    
    // Using index signature instead of Record<SetType, string> to allow for string keys
    const setTypeMap: { [key: string]: string } = {
      [SetType.REGULAR]: 'Regular',
      [SetType.WARM_UP]: 'Warm-up',
      [SetType.DROP_SET]: 'Drop Set',
      [SetType.FAILURE]: 'To Failure',
      [SetType.BACKDOWN]: 'Backdown',
      [SetType.TEMPO]: 'Tempo',
      [SetType.SUPERSET]: 'Superset',
      [SetType.CONTRAST]: 'Contrast',
      [SetType.COMPLEX]: 'Complex',
      [SetType.CLUSTER]: 'Cluster',
      [SetType.PYRAMID]: 'Pyramid',
      [SetType.PARTIAL]: 'Partial',
      [SetType.BURNS]: 'Burns',
      [SetType.PAUSE]: 'Pause',
      [SetType.PULSE]: 'Pulse',
      [SetType.NEGATIVE]: 'Negative',
      [SetType.FORCED_REP]: 'Forced Rep',
      [SetType.PRE_EXHAUST]: 'Pre-Exhaust',
      [SetType.POST_EXHAUST]: 'Post-Exhaust'
    };
    
    return setTypeMap[setType] || setType;
  };

  // Initialize completed sets tracking - completely revised to properly handle sets_data
  const initializeCompletedSets = (workoutData: WorkoutData) => {
    const setsMap = new Map<string, CompletedSetData[]>();
    
    console.log('=== INITIALIZING SETS ===');
    
    workoutData.exercise_instances.forEach((exercise, exIndex) => {
      console.log(`Processing exercise ${exIndex+1}: ${exercise.exercise_name}`);
      let hasSetsData = false;
      
      // Handle cases where sets_data might be stored as a JSON string instead of parsed object
      let setsData = exercise.sets_data;
      if (typeof setsData === 'string') {
        try {
          console.log(`Found sets_data as string, attempting to parse: ${setsData}`);
          setsData = JSON.parse(setsData);
          console.log('Successfully parsed sets_data from string');
        } catch (err) {
          console.error('Failed to parse sets_data string:', err);
          setsData = undefined;
        }
      }
      
      // PRIORITY 1: Use sets_data if available - this should contain the individual set details
      if (setsData && Array.isArray(setsData) && setsData.length > 0) {
        console.log(`Using sets_data with ${setsData.length} sets`);
        hasSetsData = true;
        
        const sets: CompletedSetData[] = [];
        
        // Process each set from sets_data
        setsData.forEach((setData, setIndex) => {
          // Extract reps as a number (handle both string and number)
          const repsString = typeof setData.reps === 'string' ? setData.reps : String(setData.reps);
          const repsValue = parseInt(repsString, 10) || 0;
          
          console.log(`  Set ${setIndex+1}: reps=${repsValue}, type=${setData.type || 'regular'}`);
          
          sets.push({
            exerciseInstanceId: exercise.id,
            setOrder: setIndex + 1,
            weight: setData.weight || '',
            reps: repsValue, // Use the extracted rep count from individual set data
            isCompleted: false,
            notes: '',
            setType: setData.type
          });
        });
        
        if (sets.length > 0) {
          setsMap.set(exercise.id, sets);
          console.log(`  Created ${sets.length} sets from sets_data`);
          
          // Debug - log each set's reps
          sets.forEach((set, i) => console.log(`    Set ${i+1}: ${set.reps} reps, type=${set.setType}`));
        }
      }
      
      // PRIORITY 2: Fall back to legacy model only if sets_data not available
      if (!hasSetsData) {
        const numSets = exercise.sets ? parseInt(exercise.sets, 10) : 0;
        const defaultReps = exercise.reps ? parseInt(exercise.reps, 10) : 0;
        
        console.log(`Using legacy model: ${numSets} sets of ${defaultReps} reps`);
        
        if (numSets > 0) {
          const sets: CompletedSetData[] = [];
          
          for (let i = 0; i < numSets; i++) {
            sets.push({
              exerciseInstanceId: exercise.id,
              setOrder: i + 1,
              weight: '',
              reps: defaultReps,
              isCompleted: false,
              notes: '',
              setType: exercise.set_type
            });
          }
          
          setsMap.set(exercise.id, sets);
          console.log(`  Created ${sets.length} sets with ${defaultReps} reps each`);
        }
      }
    });
    
    console.log('=== FINAL SETS MAP ===');
    
    // Debug overview of all sets
    setsMap.forEach((sets, exerciseId) => {
      const exercise = workoutData.exercise_instances.find(ex => ex.id === exerciseId);
      console.log(`Exercise: ${exercise?.exercise_name || exerciseId}`);
      sets.forEach((set, i) => console.log(`  Set ${i+1}: ${set.reps} reps, type=${set.setType}`));
    });
    
    setCompletedSets(setsMap);
  };

  // Start workout session and timer
  const startWorkout = async () => {
    if (!profile?.user_id || !workoutId) return;
    
    try {
      // Pre-initialize speech synthesis to get permission (requires user gesture)
      if (window.speechSynthesis) {
        console.log('Initializing speech synthesis...');
        
        // Speak a silent message to initialize/permit speech synthesis
        const initUtterance = new SpeechSynthesisUtterance('');
        initUtterance.volume = 0; // Silent
        initUtterance.onend = () => console.log('Speech synthesis initialized');
        window.speechSynthesis.speak(initUtterance);
      }
      
      // Create a new workout session in the database
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: profile.user_id,
          workout_id: workoutId,
          start_time: new Date().toISOString(),
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      console.log('Started workout session:', data);
      
      // Set session ID for later use
      setWorkoutSessionId(data.id);
      
      // Start the timer
      startTimeRef.current = new Date();
      setIsWorkoutStarted(true);
      setIsPaused(false);
      
      // Start tracking elapsed time
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const now = new Date();
          const elapsed = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000) + pausedTimeRef.current;
          setElapsedTime(elapsed);
        }
      }, 1000);
    } catch (err) {
      console.error('Error starting workout session:', err);
      alert('Failed to start workout session');
    }
  };

  // Pause workout timer
  const pauseWorkout = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      pausedTimeRef.current = elapsedTime;
      setIsPaused(true);
    }
  };

  // Resume workout timer
  const resumeWorkout = () => {
    startTimeRef.current = new Date();
    setIsPaused(false);
    
    timerRef.current = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTimeRef.current!.getTime()) / 1000) + pausedTimeRef.current;
      setElapsedTime(elapsed);
    }, 1000);
  };

  // Complete workout session
  const completeWorkout = async () => {
    if (!workoutSessionId) return;
    
    try {
      // Update the workout session with end time and duration
      const { error } = await supabase
        .from('workout_sessions')
        .update({
          end_time: new Date().toISOString(),
          duration_seconds: elapsedTime
        })
        .eq('id', workoutSessionId);
      
      if (error) throw error;
      
      // Save completed set data
      const completedSetsData: CompletedSetRecord[] = [];
      
      completedSets.forEach((sets) => {
        sets.forEach(set => {
          if (set.weight || set.isCompleted) {
            completedSetsData.push({
              workout_session_id: workoutSessionId,
              exercise_instance_id: set.exerciseInstanceId,
              set_order: set.setOrder,
              weight: set.weight,
              reps: set.reps,
              is_completed: set.isCompleted,
              notes: set.notes,
              set_type: set.setType
            });
          }
        });
      });
      
      if (completedSetsData.length > 0) {
        const { error: setsError } = await supabase
          .from('completed_exercise_sets')
          .insert(completedSetsData);
        
        if (setsError) throw setsError;
      }
      
      // Clean up and navigate to summary or dashboard
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      alert('Workout completed successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Error completing workout:', err);
      alert('Failed to save workout data');
    }
  };

  // Update weight for a set
  const updateSetWeight = (exerciseId: string, setIndex: number, weight: string) => {
    setCompletedSets(prevSets => {
      const newSets = new Map(prevSets);
      const exerciseSets = [...(newSets.get(exerciseId) || [])];
      
      if (exerciseSets[setIndex]) {
        exerciseSets[setIndex] = {
          ...exerciseSets[setIndex],
          weight
        };
        newSets.set(exerciseId, exerciseSets);
      }
      
      return newSets;
    });
  };

  // Update reps for a set
  const updateSetReps = (exerciseId: string, setIndex: number, repsStr: string) => {
    // Handle empty input gracefully
    const reps = repsStr ? parseInt(repsStr, 10) : 0;
    
    setCompletedSets(prevSets => {
      const newSets = new Map(prevSets);
      const exerciseSets = [...(newSets.get(exerciseId) || [])];
      
      if (exerciseSets[setIndex]) {
        exerciseSets[setIndex] = {
          ...exerciseSets[setIndex],
          reps
        };
        newSets.set(exerciseId, exerciseSets);
      }
      
      return newSets;
    });
  };

  // Function to play countdown beep
  const playCountdownBeep = () => {
    try {
      const AudioContext: typeof window.AudioContext = 
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 440; // A4 note, different from the final beep
      gainNode.gain.value = 0.3; // Lower volume for countdown
      
      oscillator.start();
      
      setTimeout(() => {
        oscillator.stop();
      }, 200); // Shorter beep for countdown
    } catch (err) {
      console.error('Failed to play countdown beep:', err);
    }
  };

  // Function to announce next exercise using speech synthesis
  const announceNextExercise = (exerciseId: string, setIndex: number) => {
    if (!workout) return;
    
    try {
      // Find the current exercise
      const currentExerciseIndex = workout.exercise_instances.findIndex(ex => ex.id === exerciseId);
      if (currentExerciseIndex === -1) return;
      
      const currentExercise = workout.exercise_instances[currentExerciseIndex];
      
      // Determine if we're announcing the next set of the same exercise or a new exercise
      const exerciseSets = completedSets.get(exerciseId) || [];
      const isLastSetOfExercise = setIndex >= exerciseSets.length - 1;
      
      let announcementText = '';
      
      if (!isLastSetOfExercise) {
        // Next set of the same exercise
        const nextSet = exerciseSets[setIndex + 1];
        const setType = nextSet.setType ? getSetTypeName(nextSet.setType) : 'Regular';
        
        announcementText = `Get ready to complete ${nextSet.reps} ${setType} reps of ${currentExercise.exercise_name}`;
      } else {
        // Moving to the next exercise
        const nextExerciseIndex = currentExerciseIndex + 1;
        
        // Check if there is a next exercise
        if (nextExerciseIndex < workout.exercise_instances.length) {
          const nextExercise = workout.exercise_instances[nextExerciseIndex];
          const nextExerciseSets = completedSets.get(nextExercise.id) || [];
          
          if (nextExerciseSets.length > 0) {
            const firstSet = nextExerciseSets[0];
            const setType = firstSet.setType ? getSetTypeName(firstSet.setType) : 'Regular';
            
            announcementText = `Get ready for next exercise: ${nextExercise.exercise_name}. ${firstSet.reps} ${setType} reps`;
          } else {
            // Fall back to general exercise data if sets aren't initialized
            announcementText = `Get ready for next exercise: ${nextExercise.exercise_name}`;
          }
        }
      }
      
      console.log('👄 Attempting to announce:', announcementText);
      
      // Show visual announcement as fallback (especially for browsers without speech synthesis)
      showAnnouncementToast(announcementText);
      
      // Use speech synthesis to announce only if enabled
      if (announcementText && window.speechSynthesis && isSpeechEnabled) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        // Create and configure the utterance
        const utterance = new SpeechSynthesisUtterance(announcementText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Add event handlers for debugging
        utterance.onstart = () => console.log('Speech started');
        utterance.onend = () => console.log('Speech ended');
        utterance.onerror = (e) => console.error('Speech error:', e);
        
        // Speak the announcement
        window.speechSynthesis.speak(utterance);
        
        console.log('Speech synthesis triggered');
        
        // Some browsers require user interaction before allowing speech synthesis
        // Show a visual warning if this might be the case
        setTimeout(() => {
          if (window.speechSynthesis.speaking === false && window.speechSynthesis.pending === false) {
            console.warn('Speech might be blocked by browser. User interaction may be required.');
          }
        }, 500);
      } else if (!isSpeechEnabled) {
        console.log('Speech synthesis disabled by user preference');
      } else {
        console.warn('Speech synthesis not available in this browser');
      }
    } catch (err) {
      console.error('Failed to announce next exercise:', err);
    }
  };

  // Visual toast notification for announcements (fallback for speech)
  const showAnnouncementToast = (message: string) => {
    // Create a temporary div for the toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-5 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn';
    toast.textContent = message;
    
    // Add animation style
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        0% { opacity: 0; transform: translate(-50%, -20px); }
        100% { opacity: 1; transform: translate(-50%, 0); }
      }
      @keyframes fadeOut {
        0% { opacity: 1; transform: translate(-50%, 0); }
        100% { opacity: 0; transform: translate(-50%, -20px); }
      }
      .animate-fadeIn {
        animation: fadeIn 0.3s ease-out forwards;
      }
      .animate-fadeOut {
        animation: fadeOut 0.3s ease-in forwards;
      }
    `;
    
    // Append to document
    document.head.appendChild(style);
    document.body.appendChild(toast);
    
    // Remove after 5 seconds with fade out
    setTimeout(() => {
      toast.classList.remove('animate-fadeIn');
      toast.classList.add('animate-fadeOut');
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      }, 300);
    }, 5000);
  };
  
  // Start the rest timer function
  const startRestTimer = (exerciseId: string, setIndex: number, duration: number) => {
    console.log('Starting rest timer for', duration, 'seconds');
    
    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // Set the initial state
    setActiveRestTimer({
      exerciseId,
      setIndex,
      timeLeft: duration,
      totalTime: duration
    });
    
    // Vibrate when timer starts (if supported)
    if (navigator.vibrate && window.matchMedia('(max-width: 768px)').matches) {
      navigator.vibrate(200); // Short vibration to indicate timer start
    }
    
    // Start the timer interval
    let timeRemaining = duration;
    timerIntervalRef.current = setInterval(() => {
      if (isPaused) return; // Don't update if workout is paused
      
      timeRemaining -= 1;
      console.log('Timer tick, remaining:', timeRemaining);
      
      if (timeRemaining <= 0) {
        // Timer complete - clear timer first
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        
        // Play alert sound
        if (alertSoundRef.current) {
          alertSoundRef.current.play().catch(err => 
            console.error('Failed to play timer sound:', err)
          );
        }
        
        // Vibrate when timer ends (if supported) - longer pattern for emphasis
        if (navigator.vibrate && window.matchMedia('(max-width: 768px)').matches) {
          navigator.vibrate([300, 100, 300]); // Vibrate, pause, vibrate pattern
        }
        
        // Slight delay before announcement to ensure sound finishes
        setTimeout(() => {
          // Announce the next exercise - ensure browser doesn't block this
          if (window.speechSynthesis) {
            // Cancel any queued speech
            window.speechSynthesis.cancel();
            
            // Make sure system is not paused (some browsers pause after inactivity)
            window.speechSynthesis.resume();
          }
          
          announceNextExercise(exerciseId, setIndex);
        }, 500);
        
        // Clear timer state
        setActiveRestTimer(null);
        return;
      }
      
      // Play countdown beeps for last 5 seconds
      if (timeRemaining <= 5 && timeRemaining > 0) {
        playCountdownBeep();
        
        // Short vibration for each second of countdown (if supported)
        if (navigator.vibrate && window.matchMedia('(max-width: 768px)').matches) {
          navigator.vibrate(100);
        }
      }
      
      // Update the visible timer
      setActiveRestTimer(prev => {
        if (!prev) return null;
        return {
          ...prev,
          timeLeft: timeRemaining
        };
      });
    }, 1000);
  };
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, []);
  
  // Update timer behavior when workout is paused/resumed
  useEffect(() => {
    // If workout is paused, we don't need to do anything special with the timer
    // The interval check will prevent updates while isPaused is true
    
    // If workout is resumed and we have an active timer, make sure it's running
    if (!isPaused && activeRestTimer && !timerIntervalRef.current) {
      // Restart the timer with the current state
      startRestTimer(
        activeRestTimer.exerciseId,
        activeRestTimer.setIndex,
        activeRestTimer.timeLeft
      );
    }
  }, [isPaused, activeRestTimer]);
  
  // Modify toggleSetCompletion to use our new timer function
  const toggleSetCompletion = (exerciseId: string, setIndex: number) => {
    setCompletedSets(prevSets => {
      const newSets = new Map(prevSets);
      const exerciseSets = [...(newSets.get(exerciseId) || [])];
      
      if (exerciseSets[setIndex]) {
        const newIsCompleted = !exerciseSets[setIndex].isCompleted;
        
        exerciseSets[setIndex] = {
          ...exerciseSets[setIndex],
          isCompleted: newIsCompleted
        };
        newSets.set(exerciseId, exerciseSets);
        
        // If the set was just marked as completed, and workout is active, start the rest timer
        if (newIsCompleted && isWorkoutStarted && !isPaused) {
          const exercise = workout?.exercise_instances.find(ex => ex.id === exerciseId);
          if (exercise) {
            // Get the rest time for this specific set
            let restSeconds = null;
            if (exercise.sets_data && exercise.sets_data[setIndex]) {
              restSeconds = exercise.sets_data[setIndex].rest_seconds;
            }
            // Fall back to exercise rest_period_seconds if no specific rest time
            if (restSeconds === undefined || restSeconds === null) {
              restSeconds = exercise.rest_period_seconds;
            }
            
            // If rest time is specified, start the timer
            if (restSeconds) {
              startRestTimer(exerciseId, setIndex, restSeconds);
            }
          }
        }
      }
      
      return newSets;
    });
  };

  // Format time for display (MM:SS or HH:MM:SS)
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate workout progress percentage
  const calculateProgress = (): number => {
    let totalSets = 0;
    let completedSetsCount = 0;
    
    completedSets.forEach(sets => {
      totalSets += sets.length;
      sets.forEach(set => {
        if (set.isCompleted) {
          completedSetsCount++;
        }
      });
    });
    
    return totalSets > 0 ? Math.round((completedSetsCount / totalSets) * 100) : 0;
  };

  // Initialize audio element on mount
  useEffect(() => {
    // Create an audio element for the timer alert
    const audio = new Audio('/sounds/timer-beep.mp3');
    audio.preload = 'auto';
    alertSoundRef.current = audio;
    
    // Create a fallback beep function in case the audio file doesn't load
    const fallbackBeep = () => {
      try {
        // Properly type AudioContext
        const AudioContext: typeof window.AudioContext = 
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.5;
        
        oscillator.start();
        
        setTimeout(() => {
          oscillator.stop();
        }, 500);
        
        // Return a Promise to match the Audio.play() signature
        return Promise.resolve();
      } catch (err) {
        console.error('Failed to create fallback beep:', err);
        return Promise.resolve(); // Return resolved promise on error
      }
    };
    
    // Test if the audio loads properly
    audio.addEventListener('error', () => {
      console.warn('Timer sound not loaded, using fallback beep');
      // Replace the play method with our fallback
      audio.play = fallbackBeep;
    });
    
    return () => {
      // Clean up audio element on unmount
      if (alertSoundRef.current) {
        alertSoundRef.current = null;
      }
    };
  }, []);

  // Formatting for rest timer display
  const formatRestTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to request speech permission through user interaction
  const enableSpeech = () => {
    // Immediately update UI state to hide prompt
    setIsSpeechEnabled(true);
    // Save preference
    localStorage.setItem('workout-speech-enabled', 'true');

    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not available in this browser');
      return;
    }

    try {
      // Create a short test utterance
      const testUtterance = new SpeechSynthesisUtterance('Voice feedback enabled');
      testUtterance.volume = 1.0;
      testUtterance.onend = () => {
        console.log('Speech test completed successfully');
      };
      testUtterance.onerror = (err) => {
        console.error('Speech error:', err);
        // Don't disable speech here, as we've already shown the user it's enabled
      };

      // Cancel any previous speech and speak the test utterance
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(testUtterance);
      
      // Show a toast notification for confirmation
      showAnnouncementToast('Voice feedback enabled');
    } catch (err) {
      console.error('Failed to enable speech:', err);
      // Still keep UI state as enabled to prevent showing the prompt again
    }
  };

  // Function to disable speech
  const disableSpeech = () => {
    setIsSpeechEnabled(false);
    localStorage.setItem('workout-speech-enabled', 'false');
    showAnnouncementToast('Voice feedback disabled');
  };

  // Component to prompt user for speech permission
  const SpeechPermissionPrompt = () => {
    // Only show when workout is started and speech isn't enabled yet
    if (!isWorkoutStarted || isSpeechEnabled || !window.speechSynthesis) return null;

    return (
      <div className="fixed top-5 right-5 z-50 bg-indigo-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
        <div className="flex flex-col items-center">
          <h3 className="font-medium text-lg mb-2">Enable Voice Feedback?</h3>
          <p className="text-sm mb-3 text-center">
            Click the button below to enable voice announcements for exercises and rest timers.
          </p>
          <button
            onClick={enableSpeech}
            className="px-4 py-2 bg-white text-indigo-600 rounded-md font-medium hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-white"
          >
            Enable Voice
          </button>
        </div>
      </div>
    );
  };

  // Helper function to get next exercise information
  const getNextExerciseInfo = (exerciseId: string, setIndex: number): {
    exerciseName: string;
    reps: number | string;
    setType: string;
    isSameExercise: boolean;
    exerciseDbId?: string | null;
  } | null => {
    if (!workout) return null;
    
    try {
      // Find the current exercise
      const currentExerciseIndex = workout.exercise_instances.findIndex(ex => ex.id === exerciseId);
      if (currentExerciseIndex === -1) return null;
      
      const currentExercise = workout.exercise_instances[currentExerciseIndex];
      const exerciseSets = completedSets.get(exerciseId) || [];
      const isLastSetOfExercise = setIndex >= exerciseSets.length - 1;
      
      // If there's another set in the same exercise
      if (!isLastSetOfExercise) {
        const nextSet = exerciseSets[setIndex + 1];
        const setType = nextSet.setType ? getSetTypeName(nextSet.setType) : 'Regular';
        
        return {
          exerciseName: currentExercise.exercise_name,
          reps: nextSet.reps,
          setType,
          isSameExercise: true,
          exerciseDbId: currentExercise.exercise_db_id
        };
      } else {
        // Moving to the next exercise
        const nextExerciseIndex = currentExerciseIndex + 1;
        
        // Check if there is a next exercise
        if (nextExerciseIndex < workout.exercise_instances.length) {
          const nextExercise = workout.exercise_instances[nextExerciseIndex];
          const nextExerciseSets = completedSets.get(nextExercise.id) || [];
          
          if (nextExerciseSets.length > 0) {
            const firstSet = nextExerciseSets[0];
            const setType = firstSet.setType ? getSetTypeName(firstSet.setType) : 'Regular';
            
            return {
              exerciseName: nextExercise.exercise_name,
              reps: firstSet.reps,
              setType,
              isSameExercise: false,
              exerciseDbId: nextExercise.exercise_db_id
            };
          } else {
            // Fall back to general exercise data
            return {
              exerciseName: nextExercise.exercise_name,
              reps: nextExercise.reps || 'Unknown',
              setType: nextExercise.set_type ? getSetTypeName(nextExercise.set_type) : 'Regular',
              isSameExercise: false,
              exerciseDbId: nextExercise.exercise_db_id
            };
          }
        }
      }
      
      // If we get here, this is the last set of the last exercise
      return null;
      
    } catch (err) {
      console.error('Error getting next exercise info:', err);
      return null;
    }
  };

  // Toggle function for exercise demonstrations
  const toggleDemonstration = (exerciseId: string) => {
    setShownDemonstrations(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  // Rest Timer Component
  const RestTimerDisplay = () => {
    if (!activeRestTimer) return null;
    
    const progress = (activeRestTimer.timeLeft / activeRestTimer.totalTime) * 100;
    const isCountingDown = activeRestTimer.timeLeft <= 5;
    
    // Get next exercise information
    const nextExerciseInfo = getNextExerciseInfo(
      activeRestTimer.exerciseId, 
      activeRestTimer.setIndex
    );
    
    return (
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {/* Timer Display */}
        <div className={`${isCountingDown ? 'bg-red-600 scale-105 transition-all' : 'bg-indigo-600'} text-white p-4 rounded-lg shadow-lg flex flex-col items-center`}>
          <div className="text-sm font-medium mb-1">
            {isCountingDown ? 'Get Ready!' : 'Rest Timer'}
          </div>
          <div className={`text-2xl font-bold mb-2 ${isCountingDown ? 'animate-pulse' : ''}`}>
            {isCountingDown 
              ? <span className="text-3xl">{activeRestTimer.timeLeft}</span> 
              : formatRestTime(activeRestTimer.timeLeft)
            }
          </div>
          <div className="w-full bg-indigo-800 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-200 ${isCountingDown ? 'bg-red-300' : 'bg-white'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="mt-2 flex justify-between w-full">
            <button 
              onClick={() => setActiveRestTimer(null)}
              className="text-xs text-indigo-200 hover:text-white"
            >
              Skip
            </button>
            
            {/* Display which exercise is next */}
            {activeRestTimer.timeLeft <= 3 && workout && (
              <div className="text-xs animate-pulse">
                Get Ready!
              </div>
            )}
          </div>
        </div>
        
        {/* Next Exercise Preview */}
        {nextExerciseInfo && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-64 animate-fadeIn">
            <h4 className="font-medium text-sm mb-2 text-indigo-600 dark:text-indigo-400">
              {nextExerciseInfo.isSameExercise ? 'Next Set' : 'Next Exercise'}
            </h4>
            
            {/* Exercise Demonstration - now with exerciseDbId */}
            <ExerciseDemonstration 
              exerciseName={nextExerciseInfo.exerciseName} 
              exerciseDbId={nextExerciseInfo.exerciseDbId} 
            />
            
            {/* Exercise Details */}
            <div className="flex flex-col">
              <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                {nextExerciseInfo.exerciseName}
              </h3>
              <div className="flex space-x-2 text-sm">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-full">
                  {nextExerciseInfo.setType}
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 rounded-full">
                  {nextExerciseInfo.reps} reps
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container p-4 mx-auto">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <p>Error: {error}</p>
        </div>
      ) : workout ? (
        <div>
          {/* Workout Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{workout.name}</h1>
                {workout.description && (
                  <p className="mt-2 text-gray-600 dark:text-gray-400">{workout.description}</p>
                )}
              </div>
              {isWorkoutStarted && window.speechSynthesis && (
                <button
                  onClick={isSpeechEnabled ? disableSpeech : enableSpeech}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm ${
                    isSpeechEnabled 
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' 
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {isSpeechEnabled ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                      </svg>
                      Voice On
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.415L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Voice Off
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Workout Timer and Controls */}
          <div className="mb-6 p-4 bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                  {formatTime(elapsedTime)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {isWorkoutStarted ? (isPaused ? 'Paused' : 'Active') : 'Not Started'}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {!isWorkoutStarted ? (
                  <button
                    onClick={startWorkout}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    Start Workout
                  </button>
                ) : isPaused ? (
                  <>
                    <button
                      onClick={resumeWorkout}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      Resume
                    </button>
                    <button
                      onClick={completeWorkout}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      Complete
                    </button>
                  </>
                ) : (
                  <button
                    onClick={pauseWorkout}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    Pause
                  </button>
                )}
              </div>
            </div>
            
            {/* Progress bar */}
            {isWorkoutStarted && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{calculateProgress()}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${calculateProgress()}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Exercises List with Accordion */}
          <div className="space-y-6">
            {workout.exercise_instances
              .sort((a, b) => (a.order_in_workout || 0) - (b.order_in_workout || 0))
              .map((exercise, exerciseIndex) => {
                const exerciseSets = completedSets.get(exercise.id) || [];
                const isExerciseComplete = exerciseSets.length > 0 && exerciseSets.every(set => set.isCompleted);
                // Use the component-level state instead of local useState
                const showDemonstration = shownDemonstrations[exercise.id] || false;
                
                return (
                  <div 
                    key={exercise.id} 
                    className={`p-4 rounded-lg shadow ${
                      isExerciseComplete 
                        ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500' 
                        : 'bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold flex items-center">
                        <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-sm font-medium text-indigo-800 dark:text-indigo-300 mr-3">
                          {exerciseIndex + 1}
                        </span>
                        <span className="text-gray-800 dark:text-white">
                          {exercise.exercise_name}
                        </span>
                      </h3>
                      
                      {/* Toggle button for demonstration */}
                      <button 
                        onClick={() => toggleDemonstration(exercise.id)}
                        className="flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm"
                      >
                        {showDemonstration ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                            Hide Demo
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            View Demo
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Exercise notes */}
                    {exercise.notes && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 ml-11">
                        {exercise.notes}
                      </p>
                    )}
                    
                    {/* Exercise Demonstration - Collapsible */}
                    {showDemonstration && (
                      <div className="mt-4 ml-11 animate-fadeIn">
                        <ExerciseDemonstration 
                          exerciseName={exercise.exercise_name} 
                          exerciseDbId={exercise.exercise_db_id} 
                        />
                      </div>
                    )}
                    
                    {/* Sets table */}
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                          <tr>
                            <th scope="col" className="px-4 py-3 w-16">Set</th>
                            <th scope="col" className="px-4 py-3">Type</th>
                            <th scope="col" className="px-4 py-3">Reps</th>
                            <th scope="col" className="px-4 py-3">Weight</th>
                            <th scope="col" className="px-4 py-3">Rest</th>
                            <th scope="col" className="px-4 py-3 w-24 text-center">Done</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exerciseSets.map((set, setIndex) => {
                            // Get the rest time for this specific set from sets_data if available
                            let restSeconds = null;
                            if (exercise.sets_data && exercise.sets_data[setIndex]) {
                              restSeconds = exercise.sets_data[setIndex].rest_seconds;
                            }
                            // Fall back to exercise rest_period_seconds if no specific rest time
                            if (restSeconds === undefined || restSeconds === null) {
                              restSeconds = exercise.rest_period_seconds;
                            }
                            
                            return (
                              <tr 
                                key={`${exercise.id}-set-${setIndex}`} 
                                className={`border-b dark:border-gray-700 ${
                                  set.isCompleted ? 'bg-green-50 dark:bg-green-900/10' : ''
                                }`}
                              >
                                <td className="px-4 py-3 font-medium">
                                  {setIndex + 1}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                    set.setType === SetType.WARM_UP 
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                                      : set.setType === SetType.FAILURE
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                                      : set.setType === SetType.DROP_SET
                                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {set.setType ? getSetTypeName(set.setType) : 'Regular'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="number"
                                    value={set.reps || ''}
                                    onChange={(e) => updateSetReps(exercise.id, setIndex, e.target.value)}
                                    disabled={!isWorkoutStarted || isPaused}
                                    className="w-16 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    min="0"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    value={set.weight}
                                    onChange={(e) => updateSetWeight(exercise.id, setIndex, e.target.value)}
                                    disabled={!isWorkoutStarted || isPaused}
                                    placeholder="kg"
                                    className="w-24 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  {restSeconds ? (
                                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span>{restSeconds}s</span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 dark:text-gray-500">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={set.isCompleted}
                                    onChange={() => toggleSetCompletion(exercise.id, setIndex)}
                                    disabled={!isWorkoutStarted || isPaused}
                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
          </div>
          
          {/* Complete button at bottom for convenience */}
          {isWorkoutStarted && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={isPaused ? resumeWorkout : pauseWorkout}
                className={`px-4 py-2 mr-4 rounded-md ${
                  isPaused 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                {isPaused ? 'Resume Workout' : 'Pause Workout'}
              </button>
              <button
                onClick={completeWorkout}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Complete Workout
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <p>No workout found</p>
        </div>
      )}
      <RestTimerDisplay />
      <SpeechPermissionPrompt />
    </div>
  );
};

export default WorkoutSessionPage; 