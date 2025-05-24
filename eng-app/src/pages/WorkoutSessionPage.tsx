import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectProfile } from '../store/slices/authSlice';
import { supabase } from '../services/supabaseClient';
import { SetType, ExerciseSet } from '../types/adminTypes';
import { fetchExerciseById, searchExercises } from '../utils/exerciseAPI';
import BackButton from '../components/common/BackButton';
import { ExerciseFeedbackSystem } from '../components/workout-session/feedback';
import { WorkoutTimerComponent, RestTimerManager, RestTimerManagerHandle } from '../components/workout-session';
import { playCountdownBeep, playAlertSound, formatTime } from '../utils/timerUtils';
import { 
  ExerciseFeedback,
  FeedbackRecommendation,
  WorkoutData,
  CompletedSetData,
  CompletedSetRecord,
  WorkoutSessionParams,
  ExerciseInstanceData,
  DatabaseExerciseSet
} from '../types/workoutTypes';

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

// Add this helper function after the sanitizeText function (near the top of the file)
// Helper function to clean exercise names from gender and version indicators
const cleanExerciseName = (name: string): string => {
  // Remove gender indicators, version numbers, and other common parenthetical notes
  return name.replace(/\s*\((male|female|version \d+|v\d+)\)\s*/gi, ' ')
            .replace(/\s+/g, ' ')  // Remove multiple spaces
            .trim();
};

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
        // Try to fetch from exercise database if we have an exercise DB ID
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
        const results = await searchExercises(exerciseName);
        
        if (results.results && results.results.length > 0 && isMounted.current) {
          const matchedExercise = results.results[0];
          console.log(`Found exercise match: ${matchedExercise.name} with image: ${matchedExercise.image}`);
          console.log(`Instructions: ${matchedExercise.instructions || 'None available'}`);
          console.log(`Tips: ${matchedExercise.tips || 'None available'}`);
          console.log(`YouTube Link: ${matchedExercise.youtube_link || 'None available'}`);
          
          if (matchedExercise.image) {
            // Store in cache
            exerciseImageCache.set(cacheKey, {
              url: matchedExercise.image,
              isAnimation: matchedExercise.image.toLowerCase().endsWith('.gif'),
              instructions: Array.isArray(matchedExercise.instructions) 
                ? sanitizeText(matchedExercise.instructions.join('\n')) 
                : sanitizeText(typeof matchedExercise.instructions === 'string' ? matchedExercise.instructions : null),
              tips: Array.isArray(matchedExercise.tips) 
                ? sanitizeText(matchedExercise.tips.join('\n')) 
                : sanitizeText(typeof matchedExercise.tips === 'string' ? matchedExercise.tips : null),
              youtubeLink: matchedExercise.youtube_link || null
            });
            
            setImageUrl(matchedExercise.image);
            setIsAnimation(matchedExercise.image.toLowerCase().endsWith('.gif'));
            setInstructions(Array.isArray(matchedExercise.instructions) 
              ? sanitizeText(matchedExercise.instructions.join('\n')) 
              : sanitizeText(typeof matchedExercise.instructions === 'string' ? matchedExercise.instructions : null));
            setTips(Array.isArray(matchedExercise.tips) 
              ? sanitizeText(matchedExercise.tips.join('\n')) 
              : sanitizeText(typeof matchedExercise.tips === 'string' ? matchedExercise.tips : null));
            setYoutubeLink(matchedExercise.youtube_link || null);
          } else {
            console.log(`No image found for exercise: ${matchedExercise.name}`);
            setImageUrl(null);
          }
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

// Add a completely isolated component for the rest time dialog
// The component is defined outside the main component to prevent re-renders
const IsolatedRestTimeDialog = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onClear, 
  initialValue, 
  hasCustomValue 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (time: number) => void;
  onClear: () => void;
  initialValue: string;
  hasCustomValue: boolean;
}) => {
  const [inputValue, setInputValue] = React.useState(initialValue);
  
  // Reset input value when dialog opens with a new initialValue
  React.useEffect(() => {
    if (isOpen) {
      setInputValue(initialValue);
    }
  }, [isOpen, initialValue]);
  
  if (!isOpen) return null;
  
  const handleSave = () => {
    const time = parseInt(inputValue, 10);
    if (!isNaN(time) && time >= 0) {
      onSave(time);
    }
  };
  
  // Prevent clicks from propagating outside the dialog
  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999]"
      // Prevent interaction with anything behind the dialog
      style={{ touchAction: 'none' }}
    >
      <div 
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md mx-4"
        onClick={handleContainerClick}
      >
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          Set Custom Rest Time
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          This will override the default rest time for all exercises in this workout.
        </p>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rest Time (seconds)
          </label>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            min="0"
            // Auto focus the input when dialog opens for better UX
            autoFocus
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Cancel
          </button>
          {hasCustomValue && (
            <button
              onClick={onClear}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Clear Custom
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Add a completely isolated component for the countdown timer dialog
// Placed outside the main component to prevent re-renders
const IsolatedCountdownDialog = ({ 
  isOpen, 
  onClose, 
  onStart
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onStart: (seconds: number) => void;
}) => {
  const [inputValue, setInputValue] = React.useState('60');
  
  // Reset input value when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setInputValue('60');
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const handleStart = () => {
    const seconds = parseInt(inputValue, 10);
    if (!isNaN(seconds) && seconds > 0) {
      onStart(seconds);
    }
  };
  
  // Prevent clicks from propagating outside the dialog
  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999]"
      style={{ touchAction: 'none' }}
    >
      <div 
        className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md mx-4"
        onClick={handleContainerClick}
      >
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          Set Countdown Timer
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Set a custom countdown timer in seconds.
        </p>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Countdown Time (seconds)
          </label>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            min="1"
            autoFocus
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Start Countdown
          </button>
        </div>
      </div>
    </div>
  );
};

const WorkoutSessionPage: React.FC = () => {
  const { workoutId } = useParams<WorkoutSessionParams>();
  const profile = useSelector(selectProfile);
  const navigate = useNavigate();
  const location = useLocation();

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
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  
  // State for exercise feedback
  const [exerciseFeedback, setExerciseFeedback] = useState<Record<string, ExerciseFeedback>>({});
  const [feedbackRecommendations, setFeedbackRecommendations] = useState<Record<string, FeedbackRecommendation[]>>({});
  const [showingFeedbackForm, setShowingFeedbackForm] = useState<string | null>(null);
  
  // Add state for session resumption dialog
  const [showSessionDialog, setShowSessionDialog] = useState<boolean>(false);
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
  const [sessionDialogLoading, setSessionDialogLoading] = useState<boolean>(false);
  
  // Reference to the rest timer manager
  const restTimerRef = useRef<RestTimerManagerHandle>(null);
  
  // Add toast state for announcements
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Add state for completion dialog
  const [showCompletionDialog, setShowCompletionDialog] = useState<boolean>(false);
  const [completionMessage, setCompletionMessage] = useState<string>('');
  
  // Add state for initial workout countdown
  const [initialCountdown, setInitialCountdown] = useState<number | null>(null);
  
  // Add a flag to track if we've already announced the first exercise
  const hasAnnouncedFirstExercise = useRef<boolean>(false);
  
  // We now use Web Audio API directly through timerUtils instead of audio elements
  
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

  // State for custom rest time override
  const [customRestTime, setCustomRestTime] = useState<number | null>(null);

  // State to track which exercise demonstrations are shown
  const [shownDemonstrations, setShownDemonstrations] = useState<Record<string, boolean>>({});

  // Add a debounce map at top level component to prevent duplicate saves
  const saveDebounceMap = useRef<Map<string, number>>(new Map());

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Check for saved speech preference on component mount
  useEffect(() => {
    const savedSpeechPreference = localStorage.getItem('workout-speech-enabled');
    if (savedSpeechPreference === 'true') {
      setIsSpeechEnabled(true);
      console.log('Speech enabled from saved preference');
    }
  }, []);
  
  // Note: We're now using the completedExercises state to track completed exercises
  // instead of checking on demand, which is more efficient and avoids potential issues

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

          console.log('Workout data:', data);
          
          // Load previous workout data immediately when the page loads
          if (profile?.user_id) {
            console.log('Loading previous workout data immediately on page load');
            fetchPreviousWorkoutData();
            
            // Exercise feedback will be loaded via the ExerciseFeedbackSystem component
            
            // Check for auto-resume after loading everything else
            checkAndAutoResumeSession();
          }
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
  }, [workoutId, profile?.user_id]);

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
      
      // Remove this duplicate line that's causing the syntax error
      // sets.forEach((set, i) => console.log(`    Set ${i+1}: ${set.reps} reps, type=${set.setType}`));
      
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
      
      // First, clean up stale sessions (incomplete sessions older than 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const { error: cleanupError } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('user_id', profile.user_id)
        .is('end_time', null)
        .lt('start_time', oneDayAgo.toISOString());
        
      if (cleanupError) {
        console.error('Error cleaning up stale sessions:', cleanupError);
        // Continue anyway, not critical
      } else {
        console.log('Successfully cleaned up any stale sessions');
      }
      
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
        showAnnouncementToast('Your workout session is already in progress');
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
            playAlertSound();
            
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
        // Only update elapsed time if the workout is not paused
        if (startTimeRef.current && !isPaused) {
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

  // Add a new function to check for existing session and auto-resume if found
  const checkAndAutoResumeSession = async () => {
    if (!profile?.user_id || !workoutId) return;

    try {
      console.log('Checking for existing session for auto-resume');
      
      // First, clean up stale sessions (incomplete sessions older than 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const { error: cleanupError } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('user_id', profile.user_id)
        .is('end_time', null)
        .lt('start_time', oneDayAgo.toISOString());
        
      if (cleanupError) {
        console.error('Error cleaning up stale sessions:', cleanupError);
      } else {
        console.log('Successfully cleaned up any stale sessions');
      }
      
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
        return;
      }

      // If we found an incomplete session
      if (data && data.length > 0) {
        console.log('Found incomplete session to auto-resume:', data[0]);
        
        // Auto-resume the session
        const sessionId = data[0].id;
        const startTimeStr = data[0].start_time;
        
        // Store the start time in sessionStorage
        sessionStorage.setItem('workout_session_start_time', startTimeStr);
        console.log('Stored start_time in sessionStorage:', startTimeStr);
        
        // Set session ID for later use
        setWorkoutSessionId(sessionId);
        
        // Try to load previous completed sets from this session
        await loadCompletedSetsFromSession(sessionId);
        
        // Also load any previously saved feedback for this session
        // await loadExerciseFeedback(sessionId);
        
        // Calculate elapsed time between original start time and now
        const originalStartTime = new Date(startTimeStr);
        const now = new Date();
        const elapsedSeconds = Math.floor((now.getTime() - originalStartTime.getTime()) / 1000);
        
        console.log('Auto-resuming workout with elapsed time from original start:', elapsedSeconds, 'seconds');
        
        // Set the elapsed time to the time since the original start
        pausedTimeRef.current = elapsedSeconds;
        setElapsedTime(elapsedSeconds);
        
        // Skip the countdown and start immediately
        startTimeRef.current = new Date();
        setIsWorkoutStarted(true);
        setIsPaused(false);
        
        // Show notification that we resumed the session
        showAnnouncementToast('Resumed your previous workout session');
        
        // Start tracking elapsed time
        timerRef.current = setInterval(() => {
          if (startTimeRef.current) {
            const now = new Date();
            const elapsed = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000) + pausedTimeRef.current;
            setElapsedTime(elapsed);
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Error in checkAndAutoResumeSession:', err);
    }
  };
  
  // Function to fetch previous workout data
  const fetchPreviousWorkoutData = async () => {
    if (!profile?.user_id || !workoutId) return;
    
    try {
      console.log('Fetching previous workout data...');
      
      // Get the most recent COMPLETED workout session for this workout (with end_time not null)
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', profile.user_id)
        .eq('workout_id', workoutId)
        .not('end_time', 'is', null) // Only get completed sessions
        .order('start_time', { ascending: false })
        .limit(1);
      
      if (sessionError) {
        console.error('Error fetching previous sessions:', sessionError);
        return;
      }
      
      if (!sessionData || sessionData.length === 0) {
        console.log('No previous completed workout sessions found');
        return;
      }
      
      const prevSessionId = sessionData[0].id;
      console.log('Found previous completed session:', prevSessionId);
      
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
      setCompletedSets(prevSets => {
        const newSets = new Map(prevSets);
        
        setsData.forEach(prevSet => {
          const exerciseId = prevSet.exercise_instance_id;
          const setIndex = prevSet.set_order - 1; // Zero-based index
          
          if (newSets.has(exerciseId)) {
            const exerciseSets = [...(newSets.get(exerciseId) || [])];
            
            if (exerciseSets[setIndex]) {
              // Only update the weight from previous session, NOT completion status
              // We don't want previously completed sets to appear completed in a new session
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
    // Pause the main workout timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      pausedTimeRef.current = elapsedTime;
    }
    
    // Also pause the rest timer if it's active
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
      // We don't need to clear the timer - RestTimerManager handles pausing
    }
    
    setIsPaused(true);
    showAnnouncementToast('Workout paused');
  };

  // Resume workout timer
  const resumeWorkout = () => {
    // Resume the main workout timer
    startTimeRef.current = new Date();
    setIsPaused(false);
    
    timerRef.current = setInterval(() => {
      // Only update elapsed time if the workout is not paused
      if (!isPaused) {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTimeRef.current!.getTime()) / 1000) + pausedTimeRef.current;
        setElapsedTime(elapsed);
      }
    }, 1000);
    
    // No need to resume the rest timer - RestTimerManager handles this internally
    // based on the isPaused prop being set to false
    
    showAnnouncementToast('Workout resumed');
  };

  // Complete workout session
  const completeWorkout = async () => {
    if (!workoutSessionId) return;
    
    try {
      // Check for network connection first
      if (!navigator.onLine) {
        console.error('No internet connection detected');
        setCompletionMessage('Unable to save workout - you appear to be offline. Your data will be preserved until you reconnect. Please try again when you have an internet connection.');
        setShowCompletionDialog(true);
        return;
      }
      
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
      
      // Determine if this is a network error
      let errorMessage = 'Failed to save workout data';
      
      if (!navigator.onLine || (err instanceof Error && err.message && 
          (err.message.includes('network') || 
           err.message.includes('fetch') || 
           err.message.includes('connection')))) {
        errorMessage = 'Network error: You appear to be offline. Your workout data will be preserved until you reconnect. Please try again when you have an internet connection.';
      }
      
      setCompletionMessage(errorMessage);
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
      //await completeWorkout();
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
            // Clear any active rest timer using the ref
            if (restTimerRef.current) {
              restTimerRef.current.clearTimer();
            }
            setInitialCountdown(null); // Also reset the initial countdown if active
            
            // Hide dialog and navigate back to dashboard
            setShowCompletionDialog(false);
            
            // Ensure scroll to top before navigation
            window.scrollTo(0, 0);
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
        
        // Ensure scroll to top before navigation
        window.scrollTo(0, 0);
        navigate('/dashboard');
      }
    } else if (completionMessage.includes('offline')) {
      // For offline cases, just close the dialog
      setShowCompletionDialog(false);
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
      // Clear any active rest timer using the ref
      if (restTimerRef.current) {
        restTimerRef.current.clearTimer();
      }
      setInitialCountdown(null);
      
      // Ensure scroll to top before navigation
      window.scrollTo(0, 0);
      navigate('/dashboard');
    }
    else {
      // Normal completion behavior - hide dialog and navigate to dashboard
      setShowCompletionDialog(false);
      
      // Ensure scroll to top before navigation
      window.scrollTo(0, 0);
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

  // Modify the toggleSetCompletion function to use custom rest time when available
  const toggleSetCompletion = (exerciseId: string, setIndex: number) => {
    setCompletedSets(prevSets => {
      const newSets = new Map(prevSets);
      const exerciseSets = [...(newSets.get(exerciseId) || [])];
      
      if (exerciseSets[setIndex]) {
        // Only allow toggling to completed if weight is provided or set to BW
        const currentWeight = exerciseSets[setIndex].weight;
        const currentlyCompleted = exerciseSets[setIndex].isCompleted;
        const newIsCompleted = !currentlyCompleted;
        
        // Only validate weight when trying to mark a set as completed, not when unchecking
        if (newIsCompleted && currentWeight === '') {
          // Check if there's a previous set with weight that we can copy
          let previousWeight = '';
          
          // Look for the most recent completed set of this exercise
          for (let i = setIndex - 1; i >= 0; i--) {
            if (exerciseSets[i] && exerciseSets[i].weight) {
              previousWeight = exerciseSets[i].weight;
              break;
            }
          }
          
          if (previousWeight) {
            // Copy the previous weight to this set
            exerciseSets[setIndex] = {
              ...exerciseSets[setIndex],
              weight: previousWeight,
              isCompleted: newIsCompleted
            };
            
            // Show notification that weight was copied
            showAnnouncementToast(`Using previous weight: ${previousWeight}`);
          } else {
            // No previous weight found, show the original error
            showAnnouncementToast("Please enter a weight value or set to Bodyweight (BW) before marking as complete.");
            return prevSets; // Return previous state without changes
          }
        } else {
          // If user is unchecking a set and there's an active rest timer,
          // stop the timer (user doesn't want to rest after an incomplete set)
          if (!newIsCompleted && restTimerRef.current?.isTimerActive()) {
            // Clear the timer through the manager component
            restTimerRef.current.clearTimer();
            
            // Also clean up any lingering intervals
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
          }
          
          exerciseSets[setIndex] = {
            ...exerciseSets[setIndex],
            isCompleted: newIsCompleted
          };
        }
        
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

          let dontShowRestTimer = false;
          
          const progressPercentage = totalSets > 0 ? Math.round((completedCount / totalSets) * 100) : 0;
          if (progressPercentage === 100) {
            // Dont display rest timer.
            dontShowRestTimer = true;
          }

          const exercise = workout?.exercise_instances.find(ex => ex.id === exerciseId);
          if (exercise) {
            // Check if all sets for this exercise are now completed
            const exerciseSets = [...(newSets.get(exerciseId) || [])];
            const allSetsComplete = exerciseSets.length > 0 && exerciseSets.every(set => set.isCompleted);
              
            // Update the completedExercises state if all sets are completed
            if (allSetsComplete && !completedExercises[exerciseId]) {
              setCompletedExercises(prev => ({
                ...prev,
                [exerciseId]: true
            }));
                
            // Show toast notification suggesting feedback if all sets are completed
            if (!exerciseFeedback[exerciseId]) {
              setTimeout(() => {
                showAnnouncementToast("Exercise completed! Please provide feedback.");
              }, 500); // Slight delay to ensure it appears after any rest timer
            }
            } else if (!allSetsComplete && completedExercises[exerciseId]) {
              // If a set was unchecked and the exercise was previously marked as complete,
              // update the state to reflect that it's no longer complete
              setCompletedExercises(prev => {
                const newState = { ...prev };
                delete newState[exerciseId];
                return newState;
              });
            }

            if (!dontShowRestTimer) {
              // Use custom rest time if available, otherwise get from exercise
              if (customRestTime !== null) {
                // Only show rest timer if rest time is greater than 0
                if (customRestTime > 0) {
                  showRestTimer(exerciseId, setIndex, customRestTime);
                }
              } else {
                // Get the rest time for this specific set
                let restSeconds = null;
                if (exercise.sets_data && exercise.sets_data[setIndex]) {
                  restSeconds = exercise.sets_data[setIndex].rest_seconds;
                }
                // Fall back to exercise rest_period_seconds if no specific rest time
                restSeconds = restSeconds ?? exercise.rest_period_seconds;
                
                // Only start the timer if rest time is greater than 0
                if (restSeconds !== null && restSeconds !== undefined && restSeconds > 0) {
                  showRestTimer(exerciseId, setIndex, restSeconds);
                }
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

  // playCountdownBeep function moved to RestTimerComponent

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

  // Show the rest timer using the RestTimerManager
  const showRestTimer = (exerciseId: string, setIndex: number, duration: number) => {
    console.log('Showing rest timer for', duration, 'seconds');
    
    // Use the restTimerRef to start a timer
    if (restTimerRef.current) {
      restTimerRef.current.startRestTimer(exerciseId, setIndex, duration);
    }
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
  
  // No need for special timer handling anymore - RestTimerManager handles all this internally
  // based on the isPaused prop that we pass to it
  
  // formatTime function moved to WorkoutTimerComponent

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

  // Note: We've removed the audio initialization useEffect
  // We now use the Web Audio API directly through playAlertSound() and playCountdownBeep()
  // from timerUtils.ts for all sound effects

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

  // Add a new state variable for tracking if the voice prompt has been dismissed
  const [speechPromptDismissed, setSpeechPromptDismissed] = useState<boolean>(false);

  // Component to prompt user for speech permission
  const SpeechPermissionPrompt = () => {
    // Only show when workout is started, speech isn't enabled yet, and the prompt hasn't been dismissed
    if (!isWorkoutStarted || isSpeechEnabled || !window.speechSynthesis || speechPromptDismissed) return null;

    // Function to dismiss the prompt
    const dismissPrompt = () => {
      setSpeechPromptDismissed(true);
    };

    return (
      <div className="fixed inset-y-0 right-5 z-50 flex items-center">
        <div className="bg-indigo-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <div className="relative">
            {/* Add close button in the top-right corner */}
            <button 
              onClick={dismissPrompt}
              className="absolute -top-2 -right-2 bg-white text-indigo-600 rounded-full p-1 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Dismiss notification"
            >
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
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
          exerciseName: cleanExerciseName(currentExercise.exercise_name),
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
              exerciseName: cleanExerciseName(nextExercise.exercise_name),
              reps: firstSet.reps,
              setType,
              isSameExercise: false,
              exerciseDbId: nextExercise.exercise_db_id
            };
          } else {
            // Fall back to general exercise data if sets aren't initialized
            return {
              exerciseName: cleanExerciseName(nextExercise.exercise_name),
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

  // Function to handle rest timer completion
  const handleRestTimerComplete = (exerciseId: string, setIndex: number) => {
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
  };

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
              
              // Play alert sound using Web Audio API
              playAlertSound();
              
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
          return false;
        } else if (count && count > 0) {
          console.warn('Session still exists after deletion attempts, but proceeding anyway');
          return false;
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

  // Add state for navigation confirmation dialog
  const [showNavigationDialog, setShowNavigationDialog] = useState<boolean>(false);
  // Add a ref to track if we're handling a history action
  const handlingHistoryAction = useRef<boolean>(false);
  
  // Add this useEffect to handle browser back button
  useEffect(() => {
    // Handler for browser's back navigation
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isWorkoutStarted && !showCompletionDialog) {
        // Cancel the event and show standard browser dialog
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    // Function to handle popstate (browser back/forward)
    const handlePopState = (e: PopStateEvent) => {
      // Only handle this event if workout is started and not already handling a history action
      if (isWorkoutStarted && !handlingHistoryAction.current) {
        e.preventDefault();
        
        // Set flag that we're handling a history event
        handlingHistoryAction.current = true;
        
        // Push the current location back to history to prevent navigating away
        window.history.pushState(null, '', location.pathname);
        
        // Show our custom navigation dialog
        setShowNavigationDialog(true);
        
        // Reset the flag after a small delay
        setTimeout(() => {
          handlingHistoryAction.current = false;
        }, 100);
      }
    };
    
    // Push an entry to the history stack when workout starts
    // This is needed to ensure we have something to "go back" to
    if (isWorkoutStarted) {
      window.history.pushState(null, '', location.pathname);
    }
    
    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isWorkoutStarted, showCompletionDialog, location.pathname]);
  
  // Function to handle back button click
  const handleBackButtonClick = () => {
    if (isWorkoutStarted) {
      // Show confirmation dialog instead of navigating
      setShowNavigationDialog(true);
    } else {
      // If workout not started, just navigate back
      navigate(-1);
    }
  };
  
  // Function to handle confirmation dialog responses
  const handleNavigationConfirm = (confirmed: boolean) => {
    setShowNavigationDialog(false);
    
    if (confirmed) {
      // If workout is active, pause it before navigating
      if (isWorkoutStarted && !isPaused) {
        pauseWorkout();
      }
      
      // Set the flag to prevent the popstate handler from triggering again
      handlingHistoryAction.current = true;
      
      // Navigate back
      navigate(-1);
    }
  };

  // Completely pause all timers and app updates during dialog
  const [isRestDialogOpen, setIsRestDialogOpen] = useState(false);
  const [tempRestTime, setTempRestTime] = useState('60');
  
  // Update the openRestTimeDialog function
  const openRestTimeDialog = () => {
    // No need to preserve timer state manually - RestTimerManager handles this
    // internally based on the isPaused prop
    
    // Clean up any legacy interval timers
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // Set the initial input value
    setTempRestTime(customRestTime?.toString() || '60');
    
    // Show the isolated dialog
    setIsRestDialogOpen(true);
  };
  
  // Handle saving the custom rest time
  const handleSaveRestTime = (time: number) => {
    setCustomRestTime(time);
    setIsRestDialogOpen(false);
    
    // Show confirmation toast
    showAnnouncementToast(`Custom rest time set to ${time} seconds for all exercises`);
    
    // Resume the timer if it was active
    resumeTimerIfNeeded();
  };
  
  // Handle clearing the custom rest time
  const handleClearRestTime = () => {
    setCustomRestTime(null);
    setIsRestDialogOpen(false);
    
    // Show confirmation toast
    showAnnouncementToast('Using default rest times for each exercise');
    
    // Resume the timer if it was active
    resumeTimerIfNeeded();
  };
  
  // Handle closing the dialog without changes
  const handleCloseRestDialog = () => {
    setIsRestDialogOpen(false);
    
    // Resume the timer if it was active
    resumeTimerIfNeeded();
  };
  
  // Helper to resume timer if needed - no longer needed with the new RestTimerManager
  // which automatically handles pausing/resuming based on the isPaused prop
  const resumeTimerIfNeeded = () => {
    // The timer will automatically resume via the isPaused prop
    // when we close dialogs and set isPaused back to false
  };

  // Add this to the WorkoutSessionPage component, near other state variables
  const [isCountdownDialogOpen, setIsCountdownDialogOpen] = useState(false);
  const [customCountdown, setCustomCountdown] = useState<{
    timeLeft: number;
    totalTime: number;
    isActive: boolean;
  } | null>(null);
  const customCountdownRef = useRef<NodeJS.Timeout | null>(null);

  // Add this near other handlers
  const openCountdownDialog = () => {
    // If there's an active countdown, pause it
    if (customCountdown?.isActive && customCountdownRef.current) {
      clearInterval(customCountdownRef.current);
      customCountdownRef.current = null;
    }
    
    setIsCountdownDialogOpen(true);
  };

  const handleStartCountdown = (seconds: number) => {
    // Clear any existing countdown
    if (customCountdownRef.current) {
      clearInterval(customCountdownRef.current);
      customCountdownRef.current = null;
    }
    
    // Set initial countdown state
    setCustomCountdown({
      timeLeft: seconds,
      totalTime: seconds,
      isActive: true
    });
    
    setIsCountdownDialogOpen(false);
    
    // Start the countdown interval
    customCountdownRef.current = setInterval(() => {
      setCustomCountdown(prev => {
        if (!prev) return null;
        
        const newTimeLeft = prev.timeLeft - 1;
        
        // Handle countdown completion
        if (newTimeLeft <= 0) {
          // Clear interval
          if (customCountdownRef.current) {
            clearInterval(customCountdownRef.current);
            customCountdownRef.current = null;
          }
          
          // Play alert sound using Web Audio API
          playAlertSound();
          
          // Vibrate if supported
          if (navigator.vibrate && window.matchMedia('(max-width: 768px)').matches) {
            navigator.vibrate([300, 100, 300]);
          }
          
          // Show completion toast
          showAnnouncementToast('Countdown completed!');
          
          // Reset countdown
          return null;
        }
        
        // Normal countdown tick
        return {
          ...prev,
          timeLeft: newTimeLeft
        };
      });
    }, 1000);
  };

  const pauseResumeCountdown = () => {
    if (!customCountdown) return;
    
    if (customCountdown.isActive) {
      // Pause
      if (customCountdownRef.current) {
        clearInterval(customCountdownRef.current);
        customCountdownRef.current = null;
      }
      
      setCustomCountdown(prev => prev ? {
        ...prev,
        isActive: false
      } : null);
    } else {
      // Resume
      setCustomCountdown(prev => prev ? {
        ...prev,
        isActive: true
      } : null);
      
      // Restart interval
      customCountdownRef.current = setInterval(() => {
        setCustomCountdown(prev => {
          if (!prev) return null;
          
          const newTimeLeft = prev.timeLeft - 1;
          
          if (newTimeLeft <= 0) {
            // Clear interval
            if (customCountdownRef.current) {
              clearInterval(customCountdownRef.current);
              customCountdownRef.current = null;
            }
            
            // Play alert sound
            playAlertSound();
            
            // Vibrate if supported
            if (navigator.vibrate && window.matchMedia('(max-width: 768px)').matches) {
              navigator.vibrate([300, 100, 300]);
            }
            
            // Show completion toast
            showAnnouncementToast('Countdown completed!');
            
            // Reset countdown
            return null;
          }
          
          return {
            ...prev,
            timeLeft: newTimeLeft
          };
        });
      }, 1000);
    }
  };

  const cancelCountdown = () => {
    if (customCountdownRef.current) {
      clearInterval(customCountdownRef.current);
      customCountdownRef.current = null;
    }
    
    setCustomCountdown(null);
    showAnnouncementToast('Countdown canceled');
  };

  // Add this to the cleanup effect
  useEffect(() => {
    return () => {
      if (customCountdownRef.current) {
        clearInterval(customCountdownRef.current);
        customCountdownRef.current = null;
      }
    };
  }, []);

  // Custom countdown timer display component
  const CustomCountdownDisplay = () => {
    if (!customCountdown) return null;
    
    const progress = (customCountdown.timeLeft / customCountdown.totalTime) * 100;
    const isAlmostDone = customCountdown.timeLeft <= 5 && customCountdown.timeLeft > 0;
    
    // Format time
    const formatCountdownTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    return (
      <div className="fixed top-0 inset-x-0 z-50">
        <div className={`${isAlmostDone ? 'bg-red-600' : 'bg-blue-600'} 
          text-white p-3 shadow-lg flex flex-col items-center w-full
          transition-all ${isAlmostDone ? 'scale-105' : ''}`}>
          
          <div className="w-full max-w-screen-sm mx-auto px-3">
            <div className="flex justify-between items-center mb-1">
              <div className="text-sm font-medium">
                {isAlmostDone ? 'Almost Done!' : 'Custom Countdown'}
              </div>
              
              <div className={`text-2xl font-bold ${isAlmostDone ? 'animate-pulse' : ''}`}>
                {formatCountdownTime(customCountdown.timeLeft)}
              </div>
              
              <div className="flex space-x-2">
                <button 
                  onClick={pauseResumeCountdown}
                  className="text-xs text-white/80 hover:text-white rounded px-2 py-1 bg-white/10"
                >
                  {customCountdown.isActive ? 'Pause' : 'Resume'}
                </button>
                <button 
                  onClick={cancelCountdown}
                  className="text-xs text-white/80 hover:text-white rounded px-2 py-1 bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-blue-800/50 rounded-full h-2 mb-1">
              <div 
                className={`h-2 rounded-full transition-all duration-200 ${isAlmostDone ? 'bg-red-300' : 'bg-white'}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const FeedbackButton = React.memo(({ exercise }: { exercise: ExerciseInstanceData }) => {
    return (
      <button
        onClick={() => setShowingFeedbackForm(exercise.id)}
        className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        Add Feedback
      </button>
    );
  });

  // Add a countdown button component that can be reused in each exercise card
  const CountdownButton = React.memo(() => {
    return (
      <button
        onClick={openCountdownDialog}
        className="flex items-center justify-center px-3 py-1.5 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Start Countdown
      </button>
    );
  });

  // Add a new state variable to track if the description is expanded
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);

  // Add a new state to track expanded notes (near the other state declarations, around line 3360)
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  // Add a helper function to truncate text to two lines (after the isDescriptionExpanded state)
  const truncateNotes = (notes: string, maxLength = 120): string => {
    if (!notes || notes.length <= maxLength) return notes;
    
    // Simple approach: truncate to a character limit that approximates two lines
    return notes.substring(0, maxLength) + '...';
  };

  // Toggle function for notes expansion (near the toggleDemonstration function)
  const toggleNotesExpansion = (exerciseId: string) => {
    setExpandedNotes(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">     
      {/* Absolute positioned toast container that doesn't interfere with layout */}
      {toastMessage && (
        <div className="fixed inset-x-0 top-28 flex items-start justify-center pt-0 z-[9999]">
          <div className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg max-w-[90%] flex items-center">
            <span className="pointer-events-none">{toastMessage}</span>
            <button 
              className="ml-3 text-white/80 hover:text-white focus:outline-none"
              onClick={() => setToastMessage(null)}
              aria-label="Dismiss notification"
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Initial Countdown Overlay */}
      <InitialCountdownDisplay />
      
      {/* Workout Completion Dialog */}
      <CompletionDialog />
      
      {/* Session Resume Dialog */}
      <SessionResumeDialog />
      
      {/* Rest Time Override Dialog */}
      <IsolatedRestTimeDialog 
        isOpen={isRestDialogOpen}
        onClose={handleCloseRestDialog}
        onSave={handleSaveRestTime}
        onClear={handleClearRestTime}
        initialValue={tempRestTime}
        hasCustomValue={customRestTime !== null}
      />
      
      {/* Countdown Timer Dialog */}
      <IsolatedCountdownDialog
        isOpen={isCountdownDialogOpen}
        onClose={() => setIsCountdownDialogOpen(false)}
        onStart={handleStartCountdown}
      />
      
      {/* Add ExerciseFeedbackSystem to manage feedback logic */}
      {workout && profile?.user_id && (
        <ExerciseFeedbackSystem
          workoutSessionId={workoutSessionId}
          workoutId={workoutId || ''}
          userId={profile.user_id}
          workout={workout}
          showingFeedbackForm={showingFeedbackForm}
          setExerciseFeedback={setExerciseFeedback}
          setFeedbackRecommendations={setFeedbackRecommendations}
          setShowingFeedbackForm={setShowingFeedbackForm}
          onFeedbackSubmitted={(message) => setToastMessage(message)}
        />
      )}
      
      <div className="container mx-auto">
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
              <BackButton onClick={handleBackButtonClick} />
            </div>

            {/* Workout Header */}
            <div className="mb-4">
              <div className="flex flex-col space-y-2">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{workout.name}</h1>
                  
                  {workout.description && (
                    <div className="mt-1">
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {isDescriptionExpanded ? workout.description : truncateNotes(workout.description, 80)}
                      </p>
                      
                      {workout.description.length > 80 && (
                        <div 
                          onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                          className="flex items-center text-indigo-600 dark:text-indigo-400 cursor-pointer hover:text-indigo-800 dark:hover:text-indigo-500 text-xs font-medium mt-1"
                        >
                          <span className="mr-1">{isDescriptionExpanded ? 'Show less' : 'See more'}</span>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-4 w-4 transition-transform ${isDescriptionExpanded ? 'transform rotate-180' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Action buttons - moved below the title */}
                <div className="flex flex-wrap gap-2">
                  {isWorkoutStarted && (
                    <button
                      onClick={openRestTimeDialog}
                      className={`flex items-center px-2 py-1 rounded-md text-sm ${
                        customRestTime !== null
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {customRestTime !== null ? `${customRestTime}s Rest` : 'Set Rest'}
                    </button>
                  )}
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
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071a1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243a1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z" clipRule="evenodd" />
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
                  {/* Add this button next to the rest time button in the workout header */}
                  <button
                    onClick={openCountdownDialog}
                    className="flex items-center px-2 py-1 rounded-md text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Countdown
                  </button>
                </div>
              </div>
            </div>

            {/* Workout Timer and Controls */}
            <div className="mb-4 p-3 bg-white dark:bg-gray-800 shadow rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    { !isPaused ? (
                      <WorkoutTimerComponent 
                        isStarted={isWorkoutStarted}
                        isPaused={isPaused}
                        initialElapsedTime={elapsedTime}
                        onTimeUpdate={setElapsedTime}
                      />
                    ) : (
                      formatTime(pausedTimeRef.current)
                    )}
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
                                {/* Display all the recommendation notifications if available */}
                                {feedbackRecommendations[exercise.id] && (
                                  feedbackRecommendations[exercise.id].map((recommendation) => (
                                    <div className={`p-3 mb-3 rounded-lg ${
                                      recommendation.type === 'pain' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100' : 
                                      recommendation.type === 'pump' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100' : 
                                      'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100'
                                    }`}>
                                      <p className="font-medium">{recommendation.message}</p>
                                    </div>
                                  ))
                                )}
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
                                        {cleanExerciseName(exercise.exercise_name)}
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
                                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 ml-9">
                                        <p>
                                          {expandedNotes[exercise.id] ? exercise.notes : truncateNotes(exercise.notes)}
                                        </p>
                                        {exercise.notes.length > 120 && (
                                          <button 
                                            onClick={() => toggleNotesExpansion(exercise.id)}
                                            className="text-indigo-600 dark:text-indigo-400 hover:underline mt-1 text-xs font-medium"
                                          >
                                            {expandedNotes[exercise.id] ? 'Show less' : 'See more'}
                                          </button>
                                        )}
                                      </div>
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
                                        <th scope="col" className="px-1 py-2 w-[22%]">Weight</th>
                                        <th scope="col" className="px-1 py-2 w-[15%]">Reps</th>
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
                                        restSeconds = restSeconds ?? exercise.rest_period_seconds;
                                        
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
                                                  inputMode="decimal"
                                                />
                                              </div>
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
                                              {restSeconds !== null && restSeconds !== undefined ? (
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
                                {/* Add countdown button after the sets table */}
                                <div className="mt-4 flex justify-center gap-3">
                                  <CountdownButton />
                                  <FeedbackButton exercise={exercise} />
                                </div>
                                
                                {/* Show submitted feedback if available */}
                                {exerciseFeedback[exercise.id] && (
                                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mt-4 mx-4 mb-4">
                                    <h3 className="text-lg font-semibold mb-2">Your Feedback</h3>
                                    <div className="flex space-x-4 mb-2">
                                      <div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Pain:</span>
                                        <span className="ml-2 font-medium">{exerciseFeedback[exercise.id].pain_level}/5</span>
                                      </div>
                                      <div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Pump:</span>
                                        <span className="ml-2 font-medium">{exerciseFeedback[exercise.id].pump_level}/5</span>
                                      </div>
                                      <div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Workload:</span>
                                        <span className="ml-2 font-medium">{exerciseFeedback[exercise.id].workload_level}/5</span>
                                      </div>
                                    </div>
                                    {exerciseFeedback[exercise.id].notes && (
                                      <div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Notes:</span>
                                        <p className="mt-1">{exerciseFeedback[exercise.id].notes}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* Show submitted feedback if available */}
                                {exerciseFeedback[exercise.id] && (
                                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mt-4 mx-4 mb-4">
                                    <h3 className="text-lg font-semibold mb-2">Your Current Session Feedback</h3>
                                    <div className="flex space-x-4 mb-2">
                                      <div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Pain:</span>
                                        <span className="ml-2 font-medium">{exerciseFeedback[exercise.id].pain_level}/5</span>
                                      </div>
                                      <div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Pump:</span>
                                        <span className="ml-2 font-medium">{exerciseFeedback[exercise.id].pump_level}/5</span>
                                      </div>
                                      <div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Workload:</span>
                                        <span className="ml-2 font-medium">{exerciseFeedback[exercise.id].workload_level}/5</span>
                                      </div>
                                    </div>
                                    {exerciseFeedback[exercise.id].notes && (
                                      <div>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">Notes:</span>
                                        <p className="mt-1">{exerciseFeedback[exercise.id].notes}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
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
                        {/* Display recommendation notifications if available */}
                        {feedbackRecommendations[exercise.id] && feedbackRecommendations[exercise.id].length > 0 && (
                          <div className="p-4 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Previous Session Feedback</h4>
                            {feedbackRecommendations[exercise.id].map((recommendation, index) => (
                              <div key={index} className={`mt-2 p-2 rounded ${recommendation.type === 'pain' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' : recommendation.type === 'pump' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'}`}>
                                <p className="text-sm font-medium">{recommendation.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
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
                                {cleanExerciseName(exercise.exercise_name)}
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
                              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 ml-9">
                                <p>
                                  {expandedNotes[exercise.id] ? exercise.notes : truncateNotes(exercise.notes)}
                                </p>
                                {exercise.notes.length > 120 && (
                                  <button 
                                    onClick={() => toggleNotesExpansion(exercise.id)}
                                    className="text-indigo-600 dark:text-indigo-400 hover:underline mt-1 text-xs font-medium"
                                  >
                                    {expandedNotes[exercise.id] ? 'Show less' : 'See more'}
                                  </button>
                                )}
                              </div>
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
                                <th scope="col" className="px-1 py-2 w-[22%]">Weight</th>
                                <th scope="col" className="px-1 py-2 w-[15%]">Reps</th>
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
                                restSeconds = restSeconds ?? exercise.rest_period_seconds;
                                
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
                                          inputMode="decimal"
                                        />
                                      </div>
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
                                      {restSeconds !== null && restSeconds !== undefined ? (
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
                        {/* Add countdown and feedback buttons after the sets table */}
                        <div className="mt-4 flex justify-center gap-3">
                          <CountdownButton />
                          <FeedbackButton exercise={exercise} />
                        </div>
                        
                        {/* Show submitted feedback if available */}
                        {exerciseFeedback[exercise.id] && (
                          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mt-4 mb-4">
                            <h3 className="text-lg font-semibold mb-2">Your Current Session Feedback</h3>
                            <div className="flex space-x-4 mb-2">
                              <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Pain:</span>
                                <span className="ml-2 font-medium">{exerciseFeedback[exercise.id].pain_level}/5</span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Pump:</span>
                                <span className="ml-2 font-medium">{exerciseFeedback[exercise.id].pump_level}/5</span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Workload:</span>
                                <span className="ml-2 font-medium">{exerciseFeedback[exercise.id].workload_level}/5</span>
                              </div>
                            </div>
                            {exerciseFeedback[exercise.id].notes && (
                              <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Notes:</span>
                                <p className="mt-1">{exerciseFeedback[exercise.id].notes}</p>
                              </div>
                            )}
                          </div>
                        )}
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
        <RestTimerManager
          ref={restTimerRef}
          isPaused={isPaused}
          getNextExerciseInfo={getNextExerciseInfo}
          onRestComplete={handleRestTimerComplete}
        />
        <SpeechPermissionPrompt />
        <CustomCountdownDisplay />
      </div>
      
      {/* Navigation Confirmation Dialog */}
      {showNavigationDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Confirm Navigation
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to navigate away from this page? Your workout progress will be saved but marked as incomplete.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => handleNavigationConfirm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Stay on Page
              </button>
              <button
                onClick={() => handleNavigationConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Leave Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutSessionPage; 