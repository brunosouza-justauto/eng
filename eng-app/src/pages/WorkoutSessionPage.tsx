import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectProfile } from '../store/slices/authSlice';
import { supabase } from '../services/supabaseClient';
import { SetType, ExerciseSet } from '../types/adminTypes';
import { fetchExerciseById } from '../utils/exerciseAPI';
import BackButton from '../components/common/BackButton';
import { v4 as uuidv4 } from 'uuid';

// Helper function to sanitize text with encoding issues
const sanitizeText = (text: string | null | undefined): string | null => {
  if (!text) return null;
  
  // Fix common encoding issues
  return text
    .replace(/DonÃ†t/g, "Don't")
    .replace(/DonÃ¢â‚¬â„¢t/g, "Don't")
    .replace(/canÃ†t/g, "can't")
    .replace(/canÃ¢â‚¬â„¢t/g, "can't")
    .replace(/wonÃ†t/g, "won't")
    .replace(/wonÃ¢â‚¬â„¢t/g, "won't")
    .replace(/Ã†/g, "'")
    .replace(/Ã¢â‚¬â„¢/g, "'")
    .replace(/Ã¢â‚¬â€/g, "\"")
    .replace(/Ã¢â‚¬Â/g, "\"");
};

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
  superset_group_id?: string | null; // Added field for superset group ID
  is_bodyweight?: boolean; // Added field for bodyweight exercises
  each_side?: boolean; // Added field for each side exercises
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
const exerciseImageCache = new Map<string, { 
  url: string; 
  isAnimation: boolean; 
  instructions?: string | null;
  tips?: string | null;
  youtubeLink?: string | null 
}>();
// Add a static DOM cache to prevent GIF reloading issues
const staticImageElements = new Map<string, HTMLImageElement>();

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
  const [instructions, setInstructions] = useState<string | null>(null);
  const [tips, setTips] = useState<string | null>(null);
  const [youtubeLink, setYoutubeLink] = useState<string | null>(null);
  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  // Reference to the container div
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Create a cache key that combines ID and name
  const cacheKey = useMemo(() => {
    return `${exerciseDbId || ''}:${exerciseName}`;
  }, [exerciseDbId, exerciseName]);
  
  useEffect(() => {
    // Set up the mounted flag
    isMounted.current = true;
    
    // Check if we already have a DOM element for this exercise
    if (staticImageElements.has(cacheKey) && containerRef.current) {
      console.log('Using cached DOM element for', cacheKey);
      setIsLoading(false);
      
      // Clear container and add the cached element
      const container = containerRef.current;
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      
      const cachedImg = staticImageElements.get(cacheKey);
      if (cachedImg) {
        // Add a wrapper div for better centering
        const centeringWrapper = document.createElement('div');
        centeringWrapper.className = 'flex justify-center items-center w-full h-full';
        centeringWrapper.appendChild(cachedImg.cloneNode(true));
        container.appendChild(centeringWrapper);
        
        // Add the GIF label if needed
        if (cachedImg.src.toLowerCase().endsWith('.gif')) {
          const gifLabel = document.createElement('div');
          gifLabel.className = 'absolute top-1 right-1 bg-black/50 text-white text-xs px-2 py-1 rounded-full';
          gifLabel.textContent = 'GIF';
          container.appendChild(gifLabel);
        }
        
        return;
      }
    }
    
    // Check URL cache first (different from DOM element cache)
    if (exerciseImageCache.has(cacheKey)) {
      const cachedData = exerciseImageCache.get(cacheKey)!;
      setImageUrl(cachedData.url);
      setIsAnimation(cachedData.isAnimation);
      setInstructions(cachedData.instructions || null);
      setTips(cachedData.tips || null);
      setYoutubeLink(cachedData.youtubeLink || null);
      setIsLoading(false);
      return;
    }
    
    const loadExerciseImage = async () => {
      if (!isMounted.current) return;
      
      setIsLoading(true);
      setImageError(false);
      
      try {
        // Try to fetch from HeyGainz API if we have an exercise DB ID
        if (exerciseDbId) {
          console.log(`Fetching exercise image for ID: ${exerciseDbId}`);
          const exercise = await fetchExerciseById(exerciseDbId);
          
          if (exercise && exercise.image && isMounted.current) {
            console.log(`Found image from API: ${exercise.image}`);
            console.log(`Instructions: ${exercise.instructions || 'None available'}`);
            console.log(`Tips: ${exercise.tips || 'None available'}`);
            console.log(`YouTube Link: ${exercise.youtube_link || 'None available'}`);
            
            // Store in cache
            exerciseImageCache.set(cacheKey, {
              url: exercise.image,
              isAnimation: exercise.image.toLowerCase().endsWith('.gif'),
              instructions: Array.isArray(exercise.instructions) 
                ? sanitizeText(exercise.instructions.join('\n')) 
                : sanitizeText(typeof exercise.instructions === 'string' ? exercise.instructions : null),
              tips: Array.isArray(exercise.tips) 
                ? sanitizeText(exercise.tips.join('\n')) 
                : sanitizeText(typeof exercise.tips === 'string' ? exercise.tips : null),
              youtubeLink: exercise.youtube_link || null
            });
            
            setImageUrl(exercise.image);
            setIsAnimation(exercise.image.toLowerCase().endsWith('.gif'));
            setInstructions(Array.isArray(exercise.instructions) 
              ? sanitizeText(exercise.instructions.join('\n')) 
              : sanitizeText(typeof exercise.instructions === 'string' ? exercise.instructions : null));
            setTips(Array.isArray(exercise.tips) 
              ? sanitizeText(exercise.tips.join('\n')) 
              : sanitizeText(typeof exercise.tips === 'string' ? exercise.tips : null));
            setYoutubeLink(exercise.youtube_link || null);
            setIsLoading(false);
            return;
          }
        }
        
        if (!isMounted.current) return;
        
        // If we don't have an ID or couldn't find the exercise, try to search by name
        console.log(`Searching for exercise by name: ${exerciseName}`);
        
        // Try to find a close match in the exercises database
        const searchResponse = await fetch(`https://svc.heygainz.com/api/exercises?search=${encodeURIComponent(exerciseName)}&page=1&per_page=1`);
        const searchData = await searchResponse.json();
        
        if (searchData && searchData.data && searchData.data.length > 0 && isMounted.current) {
          const matchedExercise = searchData.data[0];
          console.log(`Found exercise match: ${matchedExercise.name} with image: ${matchedExercise.gif_url}`);
          console.log(`Instructions: ${matchedExercise.instructions || 'None available'}`);
          console.log(`Tips: ${matchedExercise.tips || 'None available'}`);
          console.log(`YouTube Link: ${matchedExercise.youtube_link || 'None available'}`);
          
          // Store in cache
          exerciseImageCache.set(cacheKey, {
            url: matchedExercise.gif_url,
            isAnimation: matchedExercise.gif_url.toLowerCase().endsWith('.gif'),
            instructions: Array.isArray(matchedExercise.instructions) 
              ? sanitizeText(matchedExercise.instructions.join('\n')) 
              : sanitizeText(typeof matchedExercise.instructions === 'string' ? matchedExercise.instructions : null),
            tips: Array.isArray(matchedExercise.tips) 
              ? sanitizeText(matchedExercise.tips.join('\n')) 
              : sanitizeText(typeof matchedExercise.tips === 'string' ? matchedExercise.tips : null),
            youtubeLink: matchedExercise.youtube_link || null
          });
          
          setImageUrl(matchedExercise.gif_url);
          setIsAnimation(matchedExercise.gif_url.toLowerCase().endsWith('.gif'));
          setInstructions(Array.isArray(matchedExercise.instructions) 
            ? sanitizeText(matchedExercise.instructions.join('\n')) 
            : sanitizeText(typeof matchedExercise.instructions === 'string' ? matchedExercise.instructions : null));
          setTips(Array.isArray(matchedExercise.tips) 
            ? sanitizeText(matchedExercise.tips.join('\n')) 
            : sanitizeText(typeof matchedExercise.tips === 'string' ? matchedExercise.tips : null));
          setYoutubeLink(matchedExercise.youtube_link || null);
        } else if (isMounted.current) {
          console.log(`No exercise found for name: ${exerciseName}`);
          setImageUrl(null);
        }
      } catch (error) {
        if (isMounted.current) {
          console.error('Error loading exercise image:', error);
          setImageError(true);
          setImageUrl(null);
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };
    
    loadExerciseImage();
    
    // Cleanup
    return () => {
      isMounted.current = false;
    };
  }, [cacheKey]); // Only cacheKey as dependency, which is memoized

  // Effect to cache the DOM element once loaded
  useEffect(() => {
    if (imageUrl && !isLoading && !imageError && containerRef.current) {
      // Create a new image element to cache
      const img = new Image();
      img.src = imageUrl;
      img.alt = `${exerciseName} demonstration`;
      img.className = 'max-w-full max-h-full object-contain';
      
      // Store in static DOM element cache when loaded
      img.onload = () => {
        staticImageElements.set(cacheKey, img);
      };
    }
  }, [imageUrl, isLoading, imageError, cacheKey, exerciseName]);

  // If not expanded, don't render anything
  if (!expanded) return null;
  
  // When loading
  if (isLoading) {
    return (
      <div className="mb-3 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden h-48 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  // If we have an image and no error
  if (imageUrl && !imageError) {
    return (
      <div className="mb-3">
        <div 
          ref={containerRef}
          className="bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden h-48 relative flex justify-center items-center"
        >
          <img 
            src={imageUrl} 
            alt={`${exerciseName} demonstration`}
            className="max-w-full max-h-full object-contain"
            onError={() => setImageError(true)}
          />
          {isAnimation && (
            <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
              GIF
            </div>
          )}
        </div>
        
        {/* YouTube button if a link is available */}
        {youtubeLink && (
          <div className="mt-2 text-center">
            <a 
              href={youtubeLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
            >
              <svg 
                className="w-4 h-4 mr-1.5" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
              Watch on YouTube
            </a>
          </div>
        )}
        
        {/* Exercise help section combining instructions and tips */}
        <div className="mt-2 space-y-3">
          {/* Add exercise instructions if available */}
          {instructions && (
            <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md">
              <h4 className="font-medium text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Instructions</h4>
              <p className="text-xs">{instructions}</p>
            </div>
          )}
          
          {/* Add exercise tips if available */}
          {tips && (
            <div className="text-sm text-gray-700 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-md">
              <h4 className="font-medium text-xs uppercase text-yellow-600 dark:text-yellow-500 mb-1">Tips</h4>
              <p className="text-xs">{tips}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Fallback to placeholder with exercise name and icon
  return (
    <div className="mb-3 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden h-48 flex items-center justify-center">
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
  
  // Add state for session resumption dialog
  const [showSessionDialog, setShowSessionDialog] = useState<boolean>(false);
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
  const [sessionDialogLoading, setSessionDialogLoading] = useState<boolean>(false);
  
  // Add new state for rest timer
  const [activeRestTimer, setActiveRestTimer] = useState<{
    exerciseId: string;
    setIndex: number;
    timeLeft: number;
    totalTime: number;
  } | null>(null);
  
  // Add toast state for announcements
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Add state for completion dialog
  const [showCompletionDialog, setShowCompletionDialog] = useState<boolean>(false);
  const [completionMessage, setCompletionMessage] = useState<string>('');
  
  // Add state for initial workout countdown
  const [initialCountdown, setInitialCountdown] = useState<number | null>(null);
  
  // Add a flag to track if we've already announced the first exercise
  const hasAnnouncedFirstExercise = useRef<boolean>(false);
  
  // Audio ref for timer alert
  const alertSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Timer reference for cleanup
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const pausedTimeRef = useRef<number>(0);

  // Add new ref for tracking the timer state
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add toast timeout ref
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State to track if speech is enabled
  const [isSpeechEnabled, setIsSpeechEnabled] = useState<boolean>(false);

  // State to track which exercise demonstrations are shown
  const [shownDemonstrations, setShownDemonstrations] = useState<Record<string, boolean>>({});

  // Add a debounce map at top level component to prevent duplicate saves
  const saveDebounceMap = useRef<Map<string, number>>(new Map());

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
              sets_data,
              is_bodyweight,
              each_side
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
      
      // Check if this is a bodyweight exercise (from the flag added to the database)
      const isBodyweightExercise = exercise.is_bodyweight === true;
      if (isBodyweightExercise) {
        console.log(`Exercise ${exercise.exercise_name} is marked as bodyweight`);
      }
      
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
            // If the exercise is marked as bodyweight, set weight to "BW"
            weight: isBodyweightExercise ? 'BW' : (setData.weight || ''),
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
          sets.forEach((set, i) => console.log(`    Set ${i+1}: ${set.reps} reps, type=${set.setType}, weight=${set.weight}`));
        }
      }
      
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
              // If the exercise is marked as bodyweight, set weight to "BW"
              weight: isBodyweightExercise ? 'BW' : '',
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
    
    // After initializing, attempt to load previous workout data
    if (profile?.user_id) {
      console.log('Will attempt to load previous workout data after initialization');
      // We'll load the previous data in the startWorkout function
    }
  };

  // Later in the file, add a new function to check for existing sessions
  const checkForExistingSession = async () => {
    if (!profile?.user_id || !workoutId) return false;

    try {
      console.log('Checking for existing session, current sessionStorage value:', sessionStorage.getItem('workout_session_start_time'));
      
      // Look for incomplete sessions (no end_time) for this workout and user
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('id, start_time')
        .eq('user_id', profile.user_id)
        .eq('workout_id', workoutId)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking for existing session:', error);
        return false;
      }

      // If we found an incomplete session
      if (data && data.length > 0) {
        console.log('Found incomplete session:', data[0]);
        setExistingSessionId(data[0].id);
        // Store the start_time in sessionStorage since we don't have a state for it
        sessionStorage.setItem('workout_session_start_time', data[0].start_time);
        console.log('Stored start_time in sessionStorage:', data[0].start_time);
        setShowSessionDialog(true);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error in checkForExistingSession:', err);
      return false;
    }
  };

  // Modify the startWorkout function to check for existing sessions first
  const startWorkout = async () => {
    if (!profile?.user_id || !workoutId) return;
    
    try {
      // Reset the announcement flag at the beginning of each workout
      hasAnnouncedFirstExercise.current = false;
      
      // Ensure any existing speech is cancelled before starting a new workout
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      // Check for existing incomplete sessions first
      const hasExistingSession = await checkForExistingSession();
      if (hasExistingSession) {
        // We'll handle this through the session dialog
        return;
      }
      
      // Pre-initialize speech synthesis to get permission (requires user gesture)
      if (window.speechSynthesis) {
        console.log('Initializing speech synthesis...');
        
        // Speak a silent message to initialize/permit speech synthesis
        const initUtterance = new SpeechSynthesisUtterance('');
        initUtterance.volume = 0; // Silent
        initUtterance.onend = () => console.log('Speech synthesis initialized');
        window.speechSynthesis.speak(initUtterance);
      }
      
      // Try to fetch previous workout data for this workout
      await fetchPreviousWorkoutData();
      
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
      
      // Start 5-second countdown before beginning the workout
      setInitialCountdown(5);
      
      // Rest of the function stays the same...

      // Countdown timer for workout start
      const countdownInterval = setInterval(() => {
        setInitialCountdown(prevCount => {
          if (prevCount === null) return null;
          
          if (prevCount <= 5 && prevCount > 0) {
            // Play beep for each second
            playCountdownBeep();
            
            // Vibrate if on mobile
            if (navigator.vibrate && window.matchMedia('(max-width: 768px)').matches) {
              navigator.vibrate(100);
            }
          }
          
          if (prevCount === 1) {
            // Last second - clear the interval
            clearInterval(countdownInterval);
            
            // Play alert sound
            if (alertSoundRef.current) {
              alertSoundRef.current.play().catch(err => 
                console.error('Failed to play timer sound:', err)
              );
            }
            
            // Reset the announcement flag whenever a new workout starts
            hasAnnouncedFirstExercise.current = false;
            
            // Announce the first exercise if speech is enabled
            if (workout && workout.exercise_instances.length > 0 && isSpeechEnabled && !hasAnnouncedFirstExercise.current) {
              const firstExercise = workout.exercise_instances[0];
              const exerciseName = firstExercise.exercise_name;
              
              // Announce first exercise using speech synthesis
              if (window.speechSynthesis) {
                // Cancel any ongoing speech
                window.speechSynthesis.cancel();
                
                const firstExerciseUtterance = new SpeechSynthesisUtterance(`Starting ${exerciseName}`);
                window.speechSynthesis.speak(firstExerciseUtterance);
                
                // Mark as announced
                hasAnnouncedFirstExercise.current = true;
              }
              
              // Show visual announcement
              showAnnouncementToast(`Starting ${exerciseName}`);
            }
            
            // Start the workout timer after countdown finishes
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
            
            // Clear the countdown
            return null;
          }
          
          return prevCount - 1;
        });
      }, 1000);
      
    } catch (err) {
      console.error('Error starting workout session:', err);
      setCompletionMessage('Failed to start workout session');
      setShowCompletionDialog(true);
    }
  };
  
  // Function to fetch previous workout data
  const fetchPreviousWorkoutData = async () => {
    if (!profile?.user_id || !workoutId) return;
    
    try {
      console.log('Fetching previous workout data...');
      
      // First get the most recent workout session for this workout
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('workout_id', workoutId)
        .order('start_time', { ascending: false })
        .limit(1);
      
      if (sessionError) {
        console.error('Error fetching previous sessions:', sessionError);
        return;
      }
      
      if (!sessionData || sessionData.length === 0) {
        console.log('No previous workout sessions found');
        return;
      }
      
      const prevSessionId = sessionData[0].id;
      console.log('Found previous session:', prevSessionId);
      
      // Now fetch the completed sets for that session
      const { data: setsData, error: setsError } = await supabase
        .from('completed_exercise_sets')
        .select('*')
        .eq('workout_session_id', prevSessionId);
      
      if (setsError) {
        console.error('Error fetching completed sets:', setsError);
        return;
      }
      
      if (!setsData || setsData.length === 0) {
        console.log('No completed sets found for previous session');
        return;
      }
      
      console.log('Found completed sets:', setsData);
      
      // Update the completedSets state with previous data
      // Note: We'll only use the weight values as a starting point
      setCompletedSets(prevSets => {
        const newSets = new Map(prevSets);
        
        setsData.forEach(prevSet => {
          const exerciseId = prevSet.exercise_instance_id;
          const setIndex = prevSet.set_order - 1; // Zero-based index
          
          if (newSets.has(exerciseId)) {
            const exerciseSets = [...(newSets.get(exerciseId) || [])];
            
            if (exerciseSets[setIndex]) {
              // Only update the weight from previous session
              exerciseSets[setIndex] = {
                ...exerciseSets[setIndex],
                weight: prevSet.weight || ''
              };
              newSets.set(exerciseId, exerciseSets);
            }
          }
        });
        
        return newSets;
      });
      
      console.log('Updated sets with previous workout data');
      
    } catch (err) {
      console.error('Error fetching previous workout data:', err);
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
      
      // Clean up and show success message
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Show completion dialog instead of alert
      setCompletionMessage('Workout completed successfully!');
      setShowCompletionDialog(true);
      
    } catch (err) {
      console.error('Error completing workout:', err);
      setCompletionMessage('Failed to save workout data');
      setShowCompletionDialog(true);
    }
  };

  // Add a new function for canceling the workout after pauseWorkout function
  const cancelWorkout = () => {
    // First show the completion dialog with a confirmation message
    setCompletionMessage('Are you sure you want to cancel this workout? This action cannot be undone.');
    
    // We'll use the same dialog but with a different behavior
    setShowCompletionDialog(true);
  };

  // Modify the handleCompletionDialogClose function
  const handleCompletionDialogClose = async () => {
    // If the message is the completion prompt, complete the workout instead of just closing
    if (completionMessage.includes('Congratulations! You\'ve completed all sets')) {
      // Close dialog first
      setShowCompletionDialog(false);
      
      // Save the workout automatically
      console.log('Automatically completing workout after user confirmed');
      await completeWorkout();
      return;
    }

    // If the message contains "cancel", we treat it as a cancellation confirmation
    if (completionMessage.includes('Are you sure you want to cancel')) {
      // Show a deleting message to prevent user from navigating away during deletion
      setCompletionMessage('Canceling workout and cleaning up...');
      
      // Clean up timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      // Delete the workout session from the database if we have a session ID
      if (workoutSessionId) {
        try {
          console.log('Attempting to delete workout session during cancellation:', workoutSessionId);
          const success = await deleteWorkoutSession(workoutSessionId);
          
          if (success) {
            console.log('Workout session deleted successfully during cancellation');
            // Reset workout state
            setIsWorkoutStarted(false);
            setWorkoutSessionId(null);
            setElapsedTime(0);
            pausedTimeRef.current = 0;
            setActiveRestTimer(null);
            setInitialCountdown(null); // Also reset the initial countdown if active
            
            // Hide dialog and navigate back to dashboard
            setShowCompletionDialog(false);
            navigate('/dashboard');
          } else {
            // Show error message if deletion failed but allow user to continue anyway
            console.error('Failed to delete workout session cleanly during cancellation');
            setCompletionMessage('Warning: Failed to delete workout completely. You may still navigate away, but there might be orphaned data.');
            
            // Keep dialog open but add a "Continue Anyway" option that the user can click
            // The dialog will close normally when the user clicks the button
          }
        } catch (error) {
          console.error('Error occurred during session cancellation:', error);
          setCompletionMessage('An error occurred while canceling the workout. You may continue, but there might be orphaned data.');
        }
      } else {
        // No session ID to delete, just navigate back
        setShowCompletionDialog(false);
        navigate('/dashboard');
      }
    } else if (completionMessage.includes('Failed to delete workout') || 
               completionMessage.includes('Warning:') || 
               completionMessage.includes('An error occurred')) {
      // For error cases, just close the dialog and navigate away
      // User has chosen to continue despite the error
      setShowCompletionDialog(false);
      
      // Reset workout state 
      setIsWorkoutStarted(false);
      setWorkoutSessionId(null);
      setElapsedTime(0);
      pausedTimeRef.current = 0;
      setActiveRestTimer(null);
      setInitialCountdown(null);
      
      navigate('/dashboard');
    } else {
      // Normal completion behavior - hide dialog and navigate to dashboard
      setShowCompletionDialog(false);
      navigate('/dashboard');
    }
  };

  // Add a function to save a completed set to the database
  const saveCompletedSet = async (sessionId: string, setData: CompletedSetData) => {
    if (!sessionId) return;
    
    // Create a unique key for this set
    const debounceKey = `${sessionId}-${setData.exerciseInstanceId}-${setData.setOrder}`;
    
    // Check if we're already processing a save for this key
    const now = Date.now();
    const lastSave = saveDebounceMap.current.get(debounceKey) || 0;
    
    // If less than 1000ms has passed since last save, skip this one
    if (now - lastSave < 1000) {
      console.log(`Skipping duplicate save for ${debounceKey}, too soon after last save`);
      return;
    }
    
    // Mark that we're processing this save
    saveDebounceMap.current.set(debounceKey, now);
    
    try {
      // Create a record for the completed set
      const record: CompletedSetRecord = {
        workout_session_id: sessionId,
        exercise_instance_id: setData.exerciseInstanceId,
        set_order: setData.setOrder,
        weight: setData.weight,
        reps: setData.reps,
        is_completed: setData.isCompleted,
        notes: setData.notes,
        set_type: setData.setType
      };
      
      console.log('Saving completed set:', record);
      
      // First check if any records exist for this session/exercise/set combination
      const { count, error: countError } = await supabase
        .from('completed_exercise_sets')
        .select('*', { count: 'exact', head: true })
        .eq('workout_session_id', sessionId)
        .eq('exercise_instance_id', setData.exerciseInstanceId)
        .eq('set_order', setData.setOrder);
      
      if (countError) {
        console.error('Error checking for existing completed sets count:', countError);
        return;
      }
      
      console.log(`Found ${count} existing records for this set`);
      
      if (count && count > 0) {
        // If multiple records exist (which shouldn't happen), delete all and insert a new one
        if (count > 1) {
          console.warn(`Found ${count} duplicate records for the same set! Cleaning up...`);
          
          // Delete all duplicates
          const { error: deleteError } = await supabase
            .from('completed_exercise_sets')
            .delete()
            .eq('workout_session_id', sessionId)
            .eq('exercise_instance_id', setData.exerciseInstanceId)
            .eq('set_order', setData.setOrder);
          
          if (deleteError) {
            console.error('Error deleting duplicate sets:', deleteError);
            return;
          }
          
          // Insert a single fresh record
          const { error: insertError } = await supabase
            .from('completed_exercise_sets')
            .insert(record);
          
          if (insertError) {
            console.error('Error inserting new record after cleanup:', insertError);
          } else {
            console.log('Successfully cleaned up duplicates and inserted new record');
          }
          
          return;
        }
        
        // Get the ID of the existing record
        const { data: existingData, error: fetchError } = await supabase
          .from('completed_exercise_sets')
          .select('id')
          .eq('workout_session_id', sessionId)
          .eq('exercise_instance_id', setData.exerciseInstanceId)
          .eq('set_order', setData.setOrder)
          .single();
        
        if (fetchError) {
          console.error('Error fetching existing completed set ID:', fetchError);
          return;
        }
        
        if (!existingData || !existingData.id) {
          console.error('Could not find ID for existing record even though count says it exists');
          return;
        }
        
        // Update the existing record with the new data
        const { error: updateError } = await supabase
          .from('completed_exercise_sets')
          .update(record)
          .eq('id', existingData.id);
        
        if (updateError) {
          console.error('Error updating completed set:', updateError);
        } else {
          console.log('Updated completed set successfully');
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('completed_exercise_sets')
          .insert(record);
        
        if (insertError) {
          console.error('Error inserting completed set:', insertError);
        } else {
          console.log('Inserted completed set successfully');
        }
      }
    } catch (err) {
      console.error('Error saving completed set:', err);
    }
  };

  // Modify the toggleSetCompletion function to save completed sets immediately
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
        
        // Save this set to the database immediately
        if (workoutSessionId && isWorkoutStarted) {
          const setData = exerciseSets[setIndex];
          saveCompletedSet(workoutSessionId, setData);
        }
        
        // Only if the set was marked as completed (not uncompleted)
        if (newIsCompleted && isWorkoutStarted && !isPaused) {
          // Check if this was the last set to complete in the workout
          // Use a local calculation similar to calculateProgress() function
          let totalSets = 0;
          let completedCount = 0;
          
          newSets.forEach((sets) => {
            totalSets += sets.length;
            completedCount += sets.filter(s => s.isCompleted).length;
          });
          
          const progressPercentage = totalSets > 0 ? Math.round((completedCount / totalSets) * 100) : 0;
          
          if (progressPercentage === 100) {
            // All sets are now completed - show the completion prompt
            console.log('Workout 100% complete! Showing completion prompt');
            setCompletionMessage('Congratulations! You\'ve completed all sets in this workout. Do you want to mark the workout as complete?');
            setShowCompletionDialog(true);
          } else {
            // Not complete yet, handle rest timer as usual
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
      }
      
      return newSets;
    });
  };

  // Modify updateSetWeight to handle bodyweight exercises
  const updateSetWeight = (exerciseId: string, setIndex: number, weight: string) => {
    setCompletedSets(prevSets => {
      const newSets = new Map(prevSets);
      const exerciseSets = [...(newSets.get(exerciseId) || [])];
      
      if (exerciseSets[setIndex]) {
        // For empty input or invalid numbers, store as empty string
        // 'BW' is a special value for bodyweight exercises
        const weightValue = weight === '' ? '' : weight;
        
        exerciseSets[setIndex] = {
          ...exerciseSets[setIndex],
          weight: weightValue
        };
        newSets.set(exerciseId, exerciseSets);
        
        // Save this change to the database immediately
        if (workoutSessionId && isWorkoutStarted) {
          saveCompletedSet(workoutSessionId, exerciseSets[setIndex]);
        }
      }
      
      return newSets;
    });
  };

  // New function to toggle bodyweight for all sets of an exercise
  const toggleBodyweightForExercise = (exerciseId: string) => {
    setCompletedSets(prevSets => {
      const newSets = new Map(prevSets);
      const exerciseSets = [...(newSets.get(exerciseId) || [])];
      
      // Determine if any sets are already bodyweight
      const hasBodyweightSets = exerciseSets.some(set => set.weight === 'BW');
      
      // Toggle all sets between bodyweight and regular
      const updatedSets = exerciseSets.map(set => ({
        ...set,
        weight: hasBodyweightSets ? '' : 'BW'
      }));
      
      newSets.set(exerciseId, updatedSets);
      
      // Save changes to the database if workout is in progress
      if (workoutSessionId && isWorkoutStarted) {
        updatedSets.forEach(set => {
          saveCompletedSet(workoutSessionId, set);
        });
      }
      
      return newSets;
    });
  };

  // Modify updateSetReps to save changes immediately
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
        
        // Save this change to the database immediately
        if (workoutSessionId && isWorkoutStarted) {
          saveCompletedSet(workoutSessionId, exerciseSets[setIndex]);
        }
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

  // Visual toast notification for announcements (fallback for speech)
  const showAnnouncementToast = (message: string) => {
    // Clear any existing toast timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    // Update toast message
    setToastMessage(message);
    
    // Auto-hide after 5 seconds
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };
  
  // Clean up toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);
  
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
      
      // Skip announcement if this is the first exercise and we've already announced it
      const isFirstExercise = currentExerciseIndex === 0 && setIndex === 0;
      if (isFirstExercise && hasAnnouncedFirstExercise.current) {
        return;
      }
      
      console.log('👄 Attempting to announce:', announcementText);
      
      // Show visual announcement
      if (announcementText) {
        showAnnouncementToast(announcementText);
      }
      
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

  // Start the rest timer function - modified to focus only on the timer
  const startRestTimer = (exerciseId: string, setIndex: number, duration: number) => {
    console.log('Starting rest timer for', duration, 'seconds');
    
    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // Set the initial timer state
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

  // Rest Timer Component with integrated next exercise info
  const RestTimerDisplay = React.memo(() => {
    if (!activeRestTimer) return null;
    
    const progress = (activeRestTimer.timeLeft / activeRestTimer.totalTime) * 100;
    const isCountingDown = activeRestTimer.timeLeft <= 5;
    
    // Get next exercise information directly
    const nextExerciseInfo = activeRestTimer ? 
      getNextExerciseInfo(activeRestTimer.exerciseId, activeRestTimer.setIndex) : null;
    
    // Function to handle timer skip
    const handleSkipTimer = () => {
      // Clear the timer interval
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      // Clear the timer state
      setActiveRestTimer(null);
    };
    
    return (
      <div className="fixed bottom-4 right-4 z-50">
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
              onClick={handleSkipTimer}
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
        
        {/* Next Exercise Preview - Simplified with no GIF */}
        {nextExerciseInfo && (
          <div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg w-64 animate-fadeIn">
            <h4 className="font-medium text-sm mb-2 text-indigo-600 dark:text-indigo-400">
              {nextExerciseInfo.isSameExercise ? 'Next Set' : 'Next Exercise'}
            </h4>
            
            {/* Exercise Details - no image to prevent refresh issues */}
            <div className="flex flex-col">
              <h3 className="font-bold text-gray-800 dark:text-white mb-1">
                {nextExerciseInfo.exerciseName}
              </h3>
              <div className="flex space-x-2 text-sm">
                <span className={`px-2 py-1 text-xs rounded-full truncate max-w-full ${
                  nextExerciseInfo.setType === 'Warm-up' 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                    : nextExerciseInfo.setType === 'To Failure'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    : nextExerciseInfo.setType === 'Drop Set'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
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
  });

  // Completion Dialog Component
  const CompletionDialog = () => {
    if (!showCompletionDialog) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] pointer-events-auto">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            {completionMessage.includes('Failed') ? 'Error' : 'Workout Complete'}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {completionMessage}
          </p>
          <div className="flex justify-end">
            <button
              onClick={handleCompletionDialogClose}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Helper function to group exercises by superset
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

  // Add initial countdown component
  const InitialCountdownDisplay = () => {
    if (initialCountdown === null) return null;
    
    // Find the first exercise name with proper null checking
    const firstExerciseName = workout && 
      workout.exercise_instances && 
      workout.exercise_instances.length > 0 ? 
      workout.exercise_instances[0].exercise_name : 
      'your workout';
    
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
        <div className="text-center">
          <div className="text-6xl font-bold text-white mb-3 animate-pulse">
            {initialCountdown}
          </div>
          <div className="text-xl text-white">
            Get Ready!
          </div>
          <div className="mt-3 text-indigo-300">
            First Exercise: {firstExerciseName}
          </div>
        </div>
      </div>
    );
  };

  // Add a function to handle session dialog actions
  const handleSessionAction = async (action: 'resume' | 'new') => {
    setSessionDialogLoading(true);
    
    try {
      if (action === 'resume' && existingSessionId) {
        // Resume the existing session
        console.log('Resuming session:', existingSessionId);
        
        // Get the original start time from sessionStorage - do this BEFORE any async operations
        const originalStartTimeStr = sessionStorage.getItem('workout_session_start_time');
        console.log('Retrieved start_time from sessionStorage:', originalStartTimeStr);
        
        // Set session ID for later use
        setWorkoutSessionId(existingSessionId);
        
        // Try to load previous completed sets from this session
        await loadCompletedSetsFromSession(existingSessionId);
        
        // Hide the session dialog - important!
        setShowSessionDialog(false);
        
        // Check if originalStartTimeStr is still available after async operations
        console.log('Checking start_time is still available after async operations:', sessionStorage.getItem('workout_session_start_time'));
        
        if (originalStartTimeStr) {
          // Calculate elapsed time between original start time and now
          const originalStartTime = new Date(originalStartTimeStr);
          const now = new Date();
          const elapsedSeconds = Math.floor((now.getTime() - originalStartTime.getTime()) / 1000);
          
          console.log('Resume workout with elapsed time from original start:', elapsedSeconds, 'seconds');
          
          // Set the elapsed time to the time since the original start
          pausedTimeRef.current = elapsedSeconds;
          setElapsedTime(elapsedSeconds);
        } else {
          console.warn('No original start time found, starting timer from zero');
          pausedTimeRef.current = 0;
        }
        
        // Skip the countdown and start immediately
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
        
      } else if (action === 'new') {
        console.log('Starting new session and removing old one if exists');
        
        // Hide the session dialog before any other operations
        setShowSessionDialog(false);
        
        // Delete the existing session if it exists
        if (existingSessionId) {
          console.log('Deleting existing session before starting new one:', existingSessionId);
          
          try {
            // Direct approach to delete completed sets first
            const { error: setsDeleteError } = await supabase
              .from('completed_exercise_sets')
              .delete()
              .eq('workout_session_id', existingSessionId);
              
            if (setsDeleteError) {
              console.error('Error deleting existing sets:', setsDeleteError);
            } else {
              console.log('Successfully deleted completed sets');
            }
            
            // Then delete the session
            const { error: sessionDeleteError } = await supabase
              .from('workout_sessions')
              .delete()
              .eq('id', existingSessionId);
              
            if (sessionDeleteError) {
              console.error('Error deleting existing session:', sessionDeleteError);
            } else {
              console.log('Successfully deleted existing session');
            }
          } catch (error) {
            console.error('Error in deletion process:', error);
          }
          
          // Clear the existing session ID regardless of success or failure
          setExistingSessionId(null);
        }
        
        // Check that user profile exists before continuing
        if (!profile?.user_id || !workoutId) {
          console.error('Missing profile or workout ID');
          throw new Error('Missing profile or workout ID');
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
        
        console.log('Started new workout session:', data);
        
        // Set session ID for later use
        setWorkoutSessionId(data.id);
        
        // Start 5-second countdown before beginning the workout
        setInitialCountdown(5);
        
        // Countdown timer for workout start
        const countdownInterval = setInterval(() => {
          setInitialCountdown(prevCount => {
            // Rest of countdown code remains the same...
            if (prevCount === null) return null;
            
            if (prevCount <= 5 && prevCount > 0) {
              // Play beep for each second
              playCountdownBeep();
              
              // Vibrate if on mobile
              if (navigator.vibrate && window.matchMedia('(max-width: 768px)').matches) {
                navigator.vibrate(100);
              }
            }
            
            if (prevCount === 1) {
              // Last second - clear the interval
              clearInterval(countdownInterval);
              
              // Play alert sound
              if (alertSoundRef.current) {
                alertSoundRef.current.play().catch(err => 
                  console.error('Failed to play timer sound:', err)
                );
              }
              
              // Reset the announcement flag whenever a new workout starts
              hasAnnouncedFirstExercise.current = false;
              
              // Announce the first exercise if speech is enabled
              if (workout && workout.exercise_instances.length > 0 && isSpeechEnabled && !hasAnnouncedFirstExercise.current) {
                const firstExercise = workout.exercise_instances[0];
                const exerciseName = firstExercise.exercise_name;
                
                // Announce first exercise using speech synthesis
                if (window.speechSynthesis) {
                  // Cancel any ongoing speech
                  window.speechSynthesis.cancel();
                  
                  const firstExerciseUtterance = new SpeechSynthesisUtterance(`Starting ${exerciseName}`);
                  window.speechSynthesis.speak(firstExerciseUtterance);
                  
                  // Mark as announced
                  hasAnnouncedFirstExercise.current = true;
                }
                
                // Show visual announcement
                showAnnouncementToast(`Starting ${exerciseName}`);
              }
              
              // Start the workout timer after countdown finishes
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
              
              // Clear the countdown
              return null;
            }
            
            return prevCount - 1;
          });
        }, 1000);
      }
    } catch (err) {
      console.error('Error handling session action:', err);
      setCompletionMessage('Failed to process workout session');
      setShowCompletionDialog(true);
      setShowSessionDialog(false); // Always hide the session dialog if there's an error
    } finally {
      setSessionDialogLoading(false);
    }
  };

  // Add a function to load completed sets from an existing session
  const loadCompletedSetsFromSession = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('completed_exercise_sets')
        .select('*')
        .eq('workout_session_id', sessionId);
      
      if (error) {
        console.error('Error loading completed sets:', error);
        return;
      }
      
      if (!data || data.length === 0) {
        console.log('No completed sets found for session');
        return;
      }
      
      console.log('Loaded completed sets from session:', data);
      
      // Group the completed sets by exercise instance
      const setsMap = new Map<string, CompletedSetData[]>();
      
      data.forEach(set => {
        const exerciseId = set.exercise_instance_id;
        if (!setsMap.has(exerciseId)) {
          setsMap.set(exerciseId, []);
        }
        
        const exerciseSets = setsMap.get(exerciseId) || [];
        exerciseSets.push({
          exerciseInstanceId: exerciseId,
          setOrder: set.set_order,
          weight: set.weight || '',
          reps: set.reps,
          isCompleted: set.is_completed,
          notes: set.notes || '',
          setType: set.set_type
        });
        
        // Sort by set order
        exerciseSets.sort((a, b) => a.setOrder - b.setOrder);
        setsMap.set(exerciseId, exerciseSets);
      });
      
      // Merge with existing sets data
      setCompletedSets(prevSets => {
        const newSets = new Map(prevSets);
        
        setsMap.forEach((sets, exerciseId) => {
          if (newSets.has(exerciseId)) {
            const existingSets = newSets.get(exerciseId) || [];
            
            // Update existing sets with data from the database
            sets.forEach(set => {
              const index = existingSets.findIndex(s => s.setOrder === set.setOrder);
              if (index >= 0) {
                existingSets[index] = set;
              } else {
                existingSets.push(set);
              }
            });
            
            // Sort by set order
            existingSets.sort((a, b) => a.setOrder - b.setOrder);
            newSets.set(exerciseId, existingSets);
          } else {
            newSets.set(exerciseId, sets);
          }
        });
        
        return newSets;
      });
      
    } catch (err) {
      console.error('Error in loadCompletedSetsFromSession:', err);
    }
  };

  // Add function to delete a workout session and its completed sets
  const deleteWorkoutSession = async (sessionId: string) => {
    console.log('Deleting workout session:', sessionId);
    
    try {
      // Simple, direct approach with better error handling
      console.log('Attempting direct deletion...');
      
      // First delete all completed exercise sets for this session
      const { error: setsError } = await supabase
        .from('completed_exercise_sets')
        .delete()
        .eq('workout_session_id', sessionId);
      
      if (setsError) {
        console.error('Error deleting completed sets:', setsError);
        // Continue with session deletion even if sets deletion fails
        console.log('Continuing with session deletion despite sets deletion failure');
      } else {
        console.log('Successfully deleted completed sets');
      }
      
      // Add a small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Now delete the workout session
      const { error: sessionError } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (sessionError) {
        console.error('Error deleting workout session:', sessionError);
        
        // Try one more time after a longer delay
        console.log('Attempting session deletion one more time after delay...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { error: retryError } = await supabase
          .from('workout_sessions')
          .delete()
          .eq('id', sessionId);
        
        if (retryError) {
          console.error('Session deletion retry also failed:', retryError);
          return false;
        } else {
          console.log('Session deletion succeeded on retry');
        }
      } else {
        console.log('Successfully deleted workout session on first attempt');
      }
      
      // Final verification - but don't block completion on this
      try {
        const { count, error: countError } = await supabase
          .from('workout_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('id', sessionId);
        
        if (countError) {
          console.error('Error verifying session deletion:', countError);
        } else if (count && count > 0) {
          console.warn('Session still exists after deletion attempts, but proceeding anyway');
        } else {
          console.log('Deletion verified: session no longer exists in database');
        }
      } catch (verifyError) {
        console.error('Error during verification:', verifyError);
      }
      
      // Return true even if verification showed the session still exists
      // This avoids blocking the user's workflow while database catches up
      return true;
    } catch (err) {
      console.error('Error in deleteWorkoutSession:', err);
      return false;
    }
  };

  // Add a Session Resume Dialog component
  const SessionResumeDialog = () => {
    if (!showSessionDialog) return null;
    
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
            Incomplete Workout Found
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You have an incomplete workout session for this workout. Would you like to resume it or start a new one?
          </p>
          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={() => handleSessionAction('resume')}
              disabled={sessionDialogLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sessionDialogLoading ? 'Loading...' : 'Resume Previous'}
            </button>
            <button
              onClick={() => handleSessionAction('new')}
              disabled={sessionDialogLoading}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sessionDialogLoading ? 'Loading...' : 'Start New'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Individual set bodyweight toggle - keeping for reference but not used anymore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleBodyweight = (exerciseId: string, setIndex: number) => {
    setCompletedSets(prevSets => {
      const newSets = new Map(prevSets);
      const exerciseSets = [...(newSets.get(exerciseId) || [])];
      
      if (exerciseSets[setIndex]) {
        // Toggle between "BW" and empty string
        const newWeight = exerciseSets[setIndex].weight === 'BW' ? '' : 'BW';
        
        exerciseSets[setIndex] = {
          ...exerciseSets[setIndex],
          weight: newWeight
        };
        newSets.set(exerciseId, exerciseSets);
        
        // Save this change to the database immediately
        if (workoutSessionId && isWorkoutStarted) {
          saveCompletedSet(workoutSessionId, exerciseSets[setIndex]);
        }
      }
      
      return newSets;
    });
  };

  // Function to initialize exercise sets for a workout session
  const initializeExerciseSets = useCallback((exerciseInstances: ExerciseInstance[], existingSets: Map<string, CompletedSet[]> = new Map()) => {
    const initializedSets = new Map<string, CompletedSet[]>();
    
    exerciseInstances.forEach(exercise => {
      // Check if we already have sets for this exercise in existingSets
      if (existingSets.has(exercise.id)) {
        initializedSets.set(exercise.id, existingSets.get(exercise.id) || []);
        return; // Skip initialization if we already have sets for this exercise
      }
      
      // Create number of sets specified in the exercise
      const numSets = parseInt(exercise.sets || '1', 10) || 1;
      const sets: CompletedSet[] = [];
      
      for (let i = 0; i < numSets; i++) {
        sets.push({
          id: uuidv4(),
          exercise_instance_id: exercise.id,
          set_order: i + 1,
          // If the exercise is marked as bodyweight, set weight to "BW" automatically
          weight: exercise.is_bodyweight ? 'BW' : '',
          reps: exercise.reps || '',
          isCompleted: false
        });
      }
      
      initializedSets.set(exercise.id, sets);
    });
    
    return initializedSets;
  }, []);
  
  // Function to load existing completed sets for a workout session
  const loadCompletedSets = useCallback(async (sessionId: string) => {
    try {
      setIsLoadingSets(true);
      
      const { data: completedSetsData, error } = await supabase
        .from('completed_exercise_sets')
        .select('*')
        .eq('workout_session_id', sessionId)
        .order('set_order', { ascending: true });
        
      if (error) {
        console.error('Error loading completed sets:', error);
        return new Map<string, CompletedSet[]>();
      }
      
      const loadedSets = new Map<string, CompletedSet[]>();
      
      // Group by exercise_instance_id
      completedSetsData?.forEach(set => {
        const exerciseId = set.exercise_instance_id;
        
        if (!loadedSets.has(exerciseId)) {
          loadedSets.set(exerciseId, []);
        }
        
        const sets = loadedSets.get(exerciseId);
        if (sets) {
          sets.push({
            id: set.id,
            exercise_instance_id: set.exercise_instance_id,
            set_order: set.set_order,
            weight: set.weight || '',
            reps: set.reps?.toString() || '',
            isCompleted: set.is_completed || false
          });
        }
      });
      
      return loadedSets;
    } catch (err) {
      console.error('Error in loadCompletedSets:', err);
      return new Map<string, CompletedSet[]>();
    } finally {
      setIsLoadingSets(false);
    }
  }, []);

  return (
    <>
      {/* Absolute positioned toast container that doesn't interfere with layout */}
      {toastMessage && (
        <div className="fixed inset-0 flex items-start justify-center pt-5 pointer-events-none z-[9999]">
          <div className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg max-w-[90%]">
            {toastMessage}
          </div>
        </div>
      )}
      
      {/* Initial Countdown Overlay */}
      <InitialCountdownDisplay />
      
      {/* Workout Completion Dialog */}
      <CompletionDialog />
      
      {/* Session Resume Dialog */}
      <SessionResumeDialog />
      
      <div className="container px-2 mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <p>Error: {error}</p>
          </div>
        ) : workout ? (
          <div>
            {/* Back Button */}
            <div className="mb-3 flex justify-end">
              <BackButton onClick={() => navigate(-1)} />
            </div>

            {/* Workout Header */}
            <div className="mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{workout.name}</h1>
                  {workout.description && (
                    <p className="mt-1 text-gray-600 dark:text-gray-400">{workout.description}</p>
                  )}
                </div>
                {isWorkoutStarted && window.speechSynthesis && (
                  <button
                    onClick={isSpeechEnabled ? disableSpeech : enableSpeech}
                    className={`flex items-center px-2 py-1 rounded-md text-sm ${
                      isSpeechEnabled 
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' 
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {isSpeechEnabled ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
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
            <div className="mb-4 p-3 bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
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
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      Start Workout
                    </button>
                  ) : isPaused ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={resumeWorkout}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      >
                        Resume
                      </button>
                      <button
                        onClick={cancelWorkout}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={completeWorkout}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      >
                        Complete
                      </button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={pauseWorkout}
                        className="px-3 py-1.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                      >
                        Pause
                      </button>
                      <button
                        onClick={cancelWorkout}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Progress bar */}
              {isWorkoutStarted && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{calculateProgress()}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${calculateProgress()}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Exercises List with Accordion */}
            <div className="space-y-4">
              {workout && workout.exercise_instances.length > 0 ? (
                groupExercisesBySuperset(workout.exercise_instances).map((exerciseGroup, groupIndex) => {
                  if (exerciseGroup.isSuperset) {
                    // Render a superset group
                    return (
                      <div 
                        key={exerciseGroup.supersetGroupId || `superset-${groupIndex}`} 
                        className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow border-2 border-indigo-300 dark:border-indigo-700"
                      >
                        <div className="mb-2 flex items-center">
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full text-xs font-semibold">
                            Superset Group
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          {exerciseGroup.group.map((exercise, idx) => {
                            const exerciseSets = completedSets.get(exercise.id) || [];
                            const isExerciseComplete = exerciseSets.length > 0 && exerciseSets.every(set => set.isCompleted);
                            // Use the component-level state instead of local useState
                            const showDemonstration = shownDemonstrations[exercise.id] || false;
                            
                            return (
                              <div 
                                key={exercise.id} 
                                className={`p-3 rounded-lg shadow ${
                                  isExerciseComplete 
                                    ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500' 
                                    : 'bg-white dark:bg-gray-800'
                                } relative`}
                              >
                                {/* Connecting line for all but the last exercise */}
                                {idx < exerciseGroup.group.length - 1 && (
                                  <div className="absolute w-0.5 bg-indigo-300 dark:bg-indigo-600" style={{
                                    left: '50%',
                                    top: '100%',
                                    height: '8px',
                                    transform: 'translateX(-50%)'
                                  }}></div>
                                )}
                                
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="text-lg font-semibold flex items-center">
                                      <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-sm font-medium text-indigo-800 dark:text-indigo-300 mr-2">
                                        {groupExercisesBySuperset(workout.exercise_instances)
                                          .slice(0, groupIndex)
                                          .flatMap(g => g.group)
                                          .length + idx + 1}
                                      </span>
                                      <span className="text-gray-800 dark:text-white">
                                        {exercise.exercise_name}
                                        {/* Add "Each Side" indicator */}
                                        {exercise.each_side && (
                                          <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 text-xs rounded-full">
                                            Each Side
                                          </span>
                                        )}
                                      </span>
                                    </h3>
                                    
                                    {/* Exercise notes */}
                                    {exercise.notes && (
                                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 ml-9">
                                        {exercise.notes}
                                      </p>
                                    )}
                                    
                                    {/* Tempo display */}
                                    {exercise.tempo && (
                                      <div className="mt-1 ml-9 flex items-center">
                                        <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300 px-2 py-0.5 rounded-full flex items-center">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          Tempo: {exercise.tempo}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center space-x-3">
                                    {/* Bodyweight toggle button - moved to header area */}
                                    <button
                                      onClick={() => toggleBodyweightForExercise(exercise.id)}
                                      disabled={!isWorkoutStarted || isPaused}
                                      className={`flex items-center px-2 py-1 text-xs rounded-md ${
                                        (completedSets.get(exercise.id) || []).some(set => set.weight === 'BW')
                                          ? 'bg-indigo-600 text-white'
                                          : 'bg-gray-600 text-white'
                                      }`}
                                      title="Toggle bodyweight exercise"
                                    >
                                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      Bodyweight
                                    </button>
                                    
                                    {/* Toggle button for demonstration */}
                                    <button 
                                      onClick={() => toggleDemonstration(exercise.id)}
                                      className="flex text-center items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs"
                                    >
                                      {showDemonstration ? (
                                        <>
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                                          </svg>
                                          Hide Demo
                                        </>
                                      ) : (
                                        <>
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                          </svg>
                                          View Demo
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Exercise notes - moved into the title div */}
                                
                                {/* Exercise Demonstration - Collapsible */}
                                {showDemonstration && (
                                  <div className="mt-3 animate-fadeIn">
                                    <ExerciseDemonstration 
                                      exerciseName={exercise.exercise_name} 
                                      exerciseDbId={exercise.exercise_db_id} 
                                    />
                                  </div>
                                )}
                                
                                {/* Sets table */}
                                <div className="mt-3 max-w-full">
                                  <table className="w-full text-xs text-left table-auto">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                      <tr>
                                        <th scope="col" className="px-1 py-2 w-[8%] hidden sm:table-cell">Set</th>
                                        <th scope="col" className="px-1 py-2 w-[20%]">Type</th>
                                        <th scope="col" className="px-1 py-2 w-[15%]">Reps</th>
                                        <th scope="col" className="px-1 py-2 w-[22%]">Weight</th>
                                        <th scope="col" className="px-1 py-2 w-[15%]">Rest</th>
                                        <th scope="col" className="px-1 py-2 w-[20%] text-center">Done</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(completedSets.get(exercise.id) || []).map((set, setIndex) => {
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
                                            <td className="px-1 py-2 font-medium hidden sm:table-cell">
                                              {setIndex + 1}
                                            </td>
                                            <td className="px-1 py-2">
                                              <span className={`inline-block px-2 py-1 text-xs rounded-full truncate max-w-full ${
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
                                            <td className="px-1 py-2">
                                              <input
                                                type="number"
                                                value={set.reps || ''}
                                                onChange={(e) => updateSetReps(exercise.id, setIndex, e.target.value)}
                                                disabled={!isWorkoutStarted || isPaused}
                                                className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                min="0"
                                              />
                                            </td>
                                            <td className="px-1 py-2">
                                              <div className="flex items-center">
                                                <input
                                                  type="text"
                                                  value={set.weight === 'BW' ? 'BW' : set.weight}
                                                  onChange={(e) => updateSetWeight(exercise.id, setIndex, e.target.value)}
                                                  disabled={!isWorkoutStarted || isPaused || set.weight === 'BW'}
                                                  placeholder="kg"
                                                  className={`w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                                    set.weight === 'BW' ? 'bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-medium' : ''
                                                  }`}
                                                  readOnly={set.weight === 'BW'}
                                                />
                                              </div>
                                            </td>
                                            <td className="px-1 py-2">
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
                                            <td className="px-1 py-2 text-center">
                                              <input
                                                type="checkbox"
                                                checked={set.isCompleted}
                                                onChange={() => toggleSetCompletion(exercise.id, setIndex)}
                                                disabled={!isWorkoutStarted || isPaused}
                                                className="w-6 h-6 text-indigo-600 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
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
                      </div>
                    );
                  } else {
                    // Regular exercise (non-superset)
                    const exercise = exerciseGroup.group[0];
                  const exerciseSets = completedSets.get(exercise.id) || [];
                  const isExerciseComplete = exerciseSets.length > 0 && exerciseSets.every(set => set.isCompleted);
                  // Use the component-level state instead of local useState
                  const showDemonstration = shownDemonstrations[exercise.id] || false;
                  
                  return (
                    <div 
                      key={exercise.id} 
                      className={`p-3 rounded-lg shadow ${
                        isExerciseComplete 
                          ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500' 
                          : 'bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold flex items-center">
                            <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-sm font-medium text-indigo-800 dark:text-indigo-300 mr-2">
                                {groupExercisesBySuperset(workout.exercise_instances)
                                  .slice(0, groupIndex)
                                  .flatMap(g => g.group)
                                  .length + 1}
                            </span>
                            <span className="text-gray-800 dark:text-white">
                              {exercise.exercise_name}
                              {/* Add "Each Side" indicator */}
                              {exercise.each_side && (
                                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 text-xs rounded-full">
                                  Each Side
                                </span>
                              )}
                            </span>
                          </h3>
                          
                          {/* Exercise notes */}
                          {exercise.notes && (
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 ml-9">
                              {exercise.notes}
                            </p>
                          )}
                          
                          {/* Tempo display */}
                          {exercise.tempo && (
                            <div className="mt-1 ml-9 flex items-center">
                              <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300 px-2 py-0.5 rounded-full flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Tempo: {exercise.tempo}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {/* Bodyweight toggle button - moved to header area */}
                          <button
                            onClick={() => toggleBodyweightForExercise(exercise.id)}
                            disabled={!isWorkoutStarted || isPaused}
                            className={`flex items-center px-2 py-1 text-xs rounded-md ${
                              (completedSets.get(exercise.id) || []).some(set => set.weight === 'BW')
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-600 text-white'
                            }`}
                            title="Toggle bodyweight exercise"
                          >
                            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Bodyweight
                          </button>
                          
                          {/* Toggle button for demonstration */}
                          <button 
                            onClick={() => toggleDemonstration(exercise.id)}
                            className="flex text-center items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs"
                          >
                            {showDemonstration ? (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                                Hide Demo
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                View Demo
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Exercise notes - moved into the title div */}
                      
                      {/* Exercise Demonstration - Collapsible */}
                      {showDemonstration && (
                        <div className="mt-3 animate-fadeIn">
                          <ExerciseDemonstration 
                            exerciseName={exercise.exercise_name} 
                            exerciseDbId={exercise.exercise_db_id} 
                          />
                        </div>
                      )}
                      
                      {/* Sets table */}
                      <div className="mt-3 max-w-full">
                        <table className="w-full text-xs text-left table-auto">
                          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                              <th scope="col" className="px-1 py-2 w-[8%] hidden sm:table-cell">Set</th>
                              <th scope="col" className="px-1 py-2 w-[20%]">Type</th>
                              <th scope="col" className="px-1 py-2 w-[15%]">Reps</th>
                              <th scope="col" className="px-1 py-2 w-[22%]">Weight</th>
                              <th scope="col" className="px-1 py-2 w-[15%]">Rest</th>
                              <th scope="col" className="px-1 py-2 w-[20%] text-center">Done</th>
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
                                  <td className="px-1 py-2 font-medium hidden sm:table-cell">
                                    {setIndex + 1}
                                  </td>
                                  <td className="px-1 py-2">
                                    <span className={`inline-block px-2 py-1 text-xs rounded-full truncate max-w-full ${
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
                                  <td className="px-1 py-2">
                                    <input
                                      type="number"
                                      value={set.reps || ''}
                                      onChange={(e) => updateSetReps(exercise.id, setIndex, e.target.value)}
                                      disabled={!isWorkoutStarted || isPaused}
                                      className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                      min="0"
                                    />
                                  </td>
                                  <td className="px-1 py-2">
                                    <div className="flex items-center">
                                      <input
                                        type="text"
                                        value={set.weight === 'BW' ? 'BW' : set.weight}
                                        onChange={(e) => updateSetWeight(exercise.id, setIndex, e.target.value)}
                                        disabled={!isWorkoutStarted || isPaused || set.weight === 'BW'}
                                        placeholder="kg"
                                        className={`w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                                          set.weight === 'BW' ? 'bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-medium' : ''
                                        }`}
                                        readOnly={set.weight === 'BW'}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-1 py-2">
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
                                  <td className="px-1 py-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={set.isCompleted}
                                      onChange={() => toggleSetCompletion(exercise.id, setIndex)}
                                      disabled={!isWorkoutStarted || isPaused}
                                      className="w-6 h-6 text-indigo-600 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
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
                  }
                })
              ) : (
                <div className="text-center py-12">
                  <p>No exercises in this workout</p>
                </div>
              )}
            </div>
            
            {/* Complete button at bottom for convenience */}
            {isWorkoutStarted && (
              <div className="mt-8 flex justify-center space-x-4">
                <button
                  onClick={isPaused ? resumeWorkout : pauseWorkout}
                  className={`px-4 py-2 rounded-md ${
                    isPaused 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                      : 'bg-yellow-600 text-white hover:bg-yellow-700'
                  }`}
                >
                  {isPaused ? 'Resume Workout' : 'Pause Workout'}
                </button>
                <button
                  onClick={cancelWorkout}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Cancel Workout
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
        
        {/* Render only the timer component, which now includes the next exercise info */}
        <RestTimerDisplay />
        <SpeechPermissionPrompt />
      </div>
    </>
  );
};

export default WorkoutSessionPage; 