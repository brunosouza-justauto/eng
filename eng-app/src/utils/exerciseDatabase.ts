/**
 * Simple exercise database for the program builder
 * In a production app, this would likely come from an API or database
 */

export interface Exercise {
  id: string;
  name: string;
  category: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
}

// Basic exercise database with common exercises grouped by category
export const exerciseDatabase: Exercise[] = [
  // Compound Lower Body Exercises
  {
    id: "squat-barbell",
    name: "Barbell Squat",
    category: "Compound",
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Hamstrings", "Lower Back", "Core"]
  },
  {
    id: "deadlift-conventional",
    name: "Deadlift",
    category: "Compound",
    primaryMuscle: "Lower Back",
    secondaryMuscles: ["Glutes", "Hamstrings", "Quadriceps", "Traps", "Forearms"]
  },
  {
    id: "lunge-walking",
    name: "Walking Lunges",
    category: "Compound",
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Hamstrings", "Core"]
  },
  {
    id: "leg-press",
    name: "Leg Press",
    category: "Compound",
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Hamstrings"]
  },
  {
    id: "romanian-deadlift",
    name: "Romanian Deadlift",
    category: "Compound",
    primaryMuscle: "Hamstrings",
    secondaryMuscles: ["Glutes", "Lower Back"]
  },
  
  // Upper Body Push Exercises
  {
    id: "bench-press-barbell",
    name: "Barbell Bench Press",
    category: "Compound",
    primaryMuscle: "Chest",
    secondaryMuscles: ["Triceps", "Shoulders"]
  },
  {
    id: "overhead-press",
    name: "Overhead Press",
    category: "Compound",
    primaryMuscle: "Shoulders",
    secondaryMuscles: ["Triceps", "Upper Chest", "Core"]
  },
  {
    id: "bench-press-dumbbell",
    name: "Dumbbell Bench Press",
    category: "Compound",
    primaryMuscle: "Chest",
    secondaryMuscles: ["Triceps", "Shoulders"]
  },
  {
    id: "dips",
    name: "Dips",
    category: "Compound",
    primaryMuscle: "Chest",
    secondaryMuscles: ["Triceps", "Shoulders"]
  },
  {
    id: "push-up",
    name: "Push-Up",
    category: "Compound",
    primaryMuscle: "Chest",
    secondaryMuscles: ["Triceps", "Shoulders", "Core"]
  },
  
  // Upper Body Pull Exercises
  {
    id: "pull-up",
    name: "Pull-Up",
    category: "Compound",
    primaryMuscle: "Back",
    secondaryMuscles: ["Biceps", "Shoulders"]
  },
  {
    id: "row-barbell",
    name: "Barbell Row",
    category: "Compound",
    primaryMuscle: "Back",
    secondaryMuscles: ["Biceps", "Rear Delts", "Forearms"]
  },
  {
    id: "row-dumbbell",
    name: "Dumbbell Row",
    category: "Compound",
    primaryMuscle: "Back",
    secondaryMuscles: ["Biceps", "Rear Delts", "Forearms"]
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    category: "Compound",
    primaryMuscle: "Back",
    secondaryMuscles: ["Biceps", "Forearms"]
  },
  {
    id: "face-pull",
    name: "Face Pull",
    category: "Compound",
    primaryMuscle: "Rear Delts",
    secondaryMuscles: ["Traps", "Rotator Cuff"]
  },
  
  // Isolation Exercises - Arms
  {
    id: "curl-bicep-dumbbell",
    name: "Dumbbell Bicep Curl",
    category: "Isolation",
    primaryMuscle: "Biceps",
    secondaryMuscles: ["Forearms"]
  },
  {
    id: "curl-hammer",
    name: "Hammer Curl",
    category: "Isolation",
    primaryMuscle: "Biceps",
    secondaryMuscles: ["Forearms", "Brachialis"]
  },
  {
    id: "tricep-extension-rope",
    name: "Rope Tricep Extension",
    category: "Isolation",
    primaryMuscle: "Triceps",
    secondaryMuscles: []
  },
  {
    id: "tricep-pushdown",
    name: "Tricep Pushdown",
    category: "Isolation",
    primaryMuscle: "Triceps",
    secondaryMuscles: []
  },
  
  // Isolation Exercises - Shoulders
  {
    id: "lateral-raise",
    name: "Lateral Raise",
    category: "Isolation",
    primaryMuscle: "Side Delts",
    secondaryMuscles: []
  },
  {
    id: "front-raise",
    name: "Front Raise",
    category: "Isolation",
    primaryMuscle: "Front Delts",
    secondaryMuscles: []
  },
  {
    id: "reverse-fly",
    name: "Reverse Fly",
    category: "Isolation",
    primaryMuscle: "Rear Delts",
    secondaryMuscles: ["Upper Back"]
  },
  
  // Isolation Exercises - Legs
  {
    id: "leg-extension",
    name: "Leg Extension",
    category: "Isolation",
    primaryMuscle: "Quadriceps",
    secondaryMuscles: []
  },
  {
    id: "leg-curl",
    name: "Leg Curl",
    category: "Isolation",
    primaryMuscle: "Hamstrings",
    secondaryMuscles: []
  },
  {
    id: "calf-raise",
    name: "Calf Raise",
    category: "Isolation",
    primaryMuscle: "Calves",
    secondaryMuscles: []
  },
  
  // Core Exercises
  {
    id: "plank",
    name: "Plank",
    category: "Core",
    primaryMuscle: "Abdominals",
    secondaryMuscles: ["Lower Back"]
  },
  {
    id: "crunch",
    name: "Crunch",
    category: "Core",
    primaryMuscle: "Abdominals",
    secondaryMuscles: []
  },
  {
    id: "russian-twist",
    name: "Russian Twist",
    category: "Core",
    primaryMuscle: "Obliques",
    secondaryMuscles: ["Abdominals"]
  },
  {
    id: "leg-raise",
    name: "Leg Raise",
    category: "Core",
    primaryMuscle: "Lower Abs",
    secondaryMuscles: ["Hip Flexors"]
  }
];

/**
 * Search the exercise database by name
 * @param query Search text
 * @returns Array of matching exercises
 */
export const searchExercises = (query: string): Exercise[] => {
  if (!query || query.trim() === '') {
    return exerciseDatabase;
  }
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return exerciseDatabase.filter(exercise => 
    exercise.name.toLowerCase().includes(normalizedQuery) ||
    exercise.primaryMuscle.toLowerCase().includes(normalizedQuery) ||
    exercise.secondaryMuscles.some(muscle => 
      muscle.toLowerCase().includes(normalizedQuery)
    )
  );
};

/**
 * Get exercise categories for filtering
 */
export const getExerciseCategories = (): string[] => {
  return [...new Set(exerciseDatabase.map(ex => ex.category))];
};

/**
 * Get all muscles targeted across exercises for filtering
 */
export const getMuscleGroups = (): string[] => {
  const allMuscles = exerciseDatabase.flatMap(ex => 
    [ex.primaryMuscle, ...ex.secondaryMuscles]
  );
  return [...new Set(allMuscles)];
};

/**
 * Get an exercise by ID
 */
export const getExerciseById = (id: string): Exercise | undefined => {
  return exerciseDatabase.find(ex => ex.id === id);
}; 