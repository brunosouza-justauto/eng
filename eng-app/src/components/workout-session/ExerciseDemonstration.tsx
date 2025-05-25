import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchExerciseById, searchExercises } from '../../utils/exerciseAPI';

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
interface ExerciseDemonstrationProps {
  exerciseName: string;
  exerciseDbId?: string | null;
  expanded?: boolean;
}

const ExerciseDemonstration = React.memo(({ 
  exerciseName, 
  exerciseDbId, 
  expanded = true 
}: ExerciseDemonstrationProps) => {
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

export default ExerciseDemonstration;
