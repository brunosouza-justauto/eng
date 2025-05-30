import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import FormInput from '../ui/FormInput';
import FormSelect from '../ui/FormSelect';
import { WorkoutAdminData, ExerciseInstanceAdminData, SetType, ExerciseGroupType, ExerciseSet } from '../../types/adminTypes';
import WorkoutForm from './WorkoutForm';
import { FiSearch, FiPlus, FiInfo, FiRefreshCw } from 'react-icons/fi';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import WorkoutArrangement from './WorkoutArrangement';
import { z } from 'zod';
import ProgramBuilderAI from '../ai/ProgramBuilderAI';

// Define options for dropdowns
const TRAINING_PHASE_OPTIONS = [
    { value: 'Bulking', label: 'Bulking' },
    { value: 'Cutting', label: 'Cutting' },
    { value: 'Recomposition', label: 'Recomposition' },
    { value: 'Strength', label: 'Strength' },
    { value: 'Endurance', label: 'Endurance' },
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Any', label: 'Any' }
];

// Define the muscle group mapping for broader categorization
const MUSCLE_GROUP_MAPPING: Record<string, string> = {
    // Arms
    'biceps brachii': 'Arms',
    'biceps': 'Arms',
    'brachialis': 'Arms',
    'forearms': 'Arms',
    'triceps brachii': 'Arms',
    'triceps': 'Arms',
    
    // Shoulders
    'deltoid anterior': 'Shoulders',
    'deltoid lateral': 'Shoulders',
    'deltoid posterior': 'Shoulders',
    'front deltoid': 'Shoulders', 
    'lateral deltoid': 'Shoulders',
    'rear deltoid': 'Shoulders',
    'rotator cuff': 'Shoulders',
    'shoulders': 'Shoulders',
    
    // Chest
    'pectoralis major': 'Chest',
    'pectoralis minor': 'Chest',
    'serratus anterior': 'Chest',
    'chest': 'Chest',
    'upper chest': 'Chest',
    'lower chest': 'Chest',
    
    // Back
    'latissimus dorsi': 'Back',
    'lats': 'Back',
    'lower back': 'Back',
    'rhomboids': 'Back',
    'teres major': 'Back',
    'trapezius': 'Back',
    'traps': 'Back',
    'back': 'Back',
    
    // Core
    'obliques': 'Core',
    'rectus abdominis': 'Core',
    'transverse abdominis': 'Core',
    'abs': 'Core',
    
    // Glutes
    'glutes': 'Glutes',
    
    // Legs
    'calves': 'Legs',
    'hamstrings': 'Legs',
    'hip adductors': 'Legs',
    'hip flexors': 'Legs',
    'quadriceps': 'Legs',
    'quads': 'Legs',
    
    // Neck
    'neck': 'Neck'
};

const FITNESS_LEVEL_OPTIONS = [
    { value: 'Beginner', label: 'Beginner' },
    { value: 'Intermediate', label: 'Intermediate' },
    { value: 'Advanced', label: 'Advanced' },
    { value: 'Athlete', label: 'Athlete' }
];

// Basic type for template list item
interface ProgramTemplateListItem {
    id: string;
    name: string;
    phase: string | null;
    weeks: number;
    created_at: string;
    description: string | null; // This is the field for template notes
    is_public: boolean;
    fitness_level?: string | null;
    version?: number; // Make optional for backward compatibility
    parent_template_id?: string | null;
    is_latest_version?: boolean;
}

// Define simple form data type (matching input values)
interface TemplateFormData {
    name: string;
    phase: string; // No longer nullable, now required
    weeks: string; // Store as string from input
    description: string | null; // This field serves as template notes
    fitness_level: string; // New field for fitness level
    is_public: boolean;
}

// Define Zod schema separately for manual validation
const templateSchema = z.object({
    name: z.string().min(1, 'Template name is required'),
    phase: z.string().min(1, 'Training phase is required'), // Now required
    weeks: z.string({ required_error: 'Weeks duration is required' })
            .min(1, 'Weeks duration is required')
            .regex(/^\d+$/, 'Weeks must be a positive whole number')
            .transform(Number)
            .refine(val => val > 0, { message: 'Weeks must be greater than 0' }),
    description: z.string().trim().optional().nullable(), // Template notes field (existing)
    fitness_level: z.string().min(1, 'Fitness level is required'), // New required field
    is_public: z.boolean().default(false),
});

// Define a type for muscle data
interface MuscleData {
    name: string;
    setsCount: number;
    intensity: number; // 0-100 scale for color intensity
}

// Muscle Heat Map Component
const MuscleHeatMap: React.FC<{ 
    muscleData: MuscleData[];
    title: string;
}> = ({ muscleData, title }) => {
    // Get color intensity for a muscle
    const getColorIntensity = (muscleName: string): number => {
        // First try exact match
        const muscle = muscleData.find(m => 
            m.name.toLowerCase() === muscleName.toLowerCase() ||
            muscleName.toLowerCase().includes(m.name.toLowerCase()) ||
            m.name.toLowerCase().includes(muscleName.toLowerCase())
        );
        
        if (muscle) return muscle.intensity;
        
        // Try to find common categories
        const muscleCategories: Record<string, string[]> = {
            'Arms': ['biceps', 'triceps', 'forearms', 'brachialis'],
            'Shoulders': ['deltoid', 'shoulder'],
            'Chest': ['chest', 'pectoralis'],
            'Back': ['back', 'lats', 'trapezius', 'traps', 'rhomboids'],
            'Core': ['abs', 'obliques', 'rectus abdominis'],
            'Glutes': ['glutes'],
            'Legs': ['quads', 'hamstrings', 'calves']
        };
        
        // Find if this muscle belongs to any category
        let category = '';
        const lowerCaseName = muscleName.toLowerCase();
        
        for (const [cat, muscles] of Object.entries(muscleCategories)) {
            if (muscles.some(m => lowerCaseName.includes(m))) {
                category = cat;
                break;
            }
        }
        
        if (category) {
            // Find category in muscle data
            const categoryData = muscleData.find(m => m.name === category);
            if (categoryData) return categoryData.intensity;
        }
        
        return 0; // No match found
    };

    // Generate color based on intensity (0-100)
    const getColor = (intensity: number): string => {
        if (intensity === 0) return '#2d3748'; // Dark gray for unused muscles
        
        // Create a better color gradient from blue (low) to red (high)
        if (intensity < 20) {
            // Blue to teal range (low intensity: 1-19%)
            const blue = Math.round(180 + (intensity * 3));
            const green = Math.round(120 + (intensity * 4));
            const red = Math.round(20 + (intensity * 2));
            return `rgb(${red}, ${green}, ${blue})`;
        } else if (intensity < 50) {
            // Teal to yellow range (medium-low intensity: 20-49%)
            const factor = (intensity - 20) / 30;
            const blue = Math.round(180 - (factor * 180));
            const green = Math.round(200 - (factor * 60));
            const red = Math.round(60 + (factor * 195));
            return `rgb(${red}, ${green}, ${blue})`;
        } else if (intensity < 80) {
            // Yellow to orange range (medium-high intensity: 50-79%)
            const factor = (intensity - 50) / 30;
            const red = 255;
            const green = Math.round(140 - (factor * 70));
            const blue = Math.round(0 + (factor * 0)); // Blue stays at 0
            return `rgb(${red}, ${green}, ${blue})`;
        } else {
            // Orange to bright red range (high intensity: 80-100%)
            const factor = (intensity - 80) / 20;
            const red = 255;
            const green = Math.round(70 - (factor * 70));
            const blue = 0;
            return `rgb(${red}, ${green}, ${blue})`;
        }
    };

    return (
        <div className="flex flex-col items-center mb-8">
            <h3 className="text-xl font-semibold mb-5 text-gray-800 dark:text-white">{title}</h3>
            <div className="flex flex-col md:flex-row justify-center items-center gap-10 w-full">
                {/* Front View */}
                <div className="w-48 h-96 relative bg-gray-900 bg-opacity-20 rounded-lg p-3 flex flex-col items-center">
                    <svg viewBox="0 0 100 170" className="w-full h-full">
                        {/* Head */}
                        <circle cx="50" cy="20" r="12" fill="#2d3748" stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Neck */}
                        <rect x="45" y="32" width="10" height="8" fill="#2d3748" stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Shoulders */}
                        <path id="shoulder-left" d="M30,40 C25,40 20,45 20,50 L30,50 L30,40 Z" 
                            fill={getColor(getColorIntensity('shoulders'))} stroke="#1a202c" strokeWidth="0.5" />
                        <path id="shoulder-right" d="M70,40 C75,40 80,45 80,50 L70,50 L70,40 Z" 
                            fill={getColor(getColorIntensity('shoulders'))} stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Chest */}
                        <path id="chest" d="M30,40 L70,40 L70,50 C70,60 60,70 50,70 C40,70 30,60 30,50 L30,40 Z" 
                            fill={getColor(getColorIntensity('chest'))} stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Arms */}
                        <path id="arm-left" d="M20,50 L20,80 L30,80 L30,50 L20,50 Z" 
                            fill={getColor(getColorIntensity('arms'))} stroke="#1a202c" strokeWidth="0.5" />
                        <path id="arm-right" d="M70,50 L80,50 L80,80 L70,80 L70,50 Z" 
                            fill={getColor(getColorIntensity('arms'))} stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Forearms */}
                        <path id="forearm-left" d="M20,80 L15,95 L35,95 L30,80 L20,80 Z" 
                            fill={getColor(getColorIntensity('forearms'))} stroke="#1a202c" strokeWidth="0.5" />
                        <path id="forearm-right" d="M70,80 L80,80 L85,95 L65,95 L70,80 Z" 
                            fill={getColor(getColorIntensity('forearms'))} stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Hands */}
                        <path id="hand-left" d="M15,95 L15,100 L35,100 L35,95 L15,95 Z" 
                            fill="#2d3748" stroke="#1a202c" strokeWidth="0.5" />
                        <path id="hand-right" d="M65,95 L65,100 L85,100 L85,95 L65,95 Z" 
                            fill="#2d3748" stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Abs */}
                        <path id="abs" d="M30,50 C30,60 40,70 50,70 C60,70 70,60 70,50 L70,90 L30,90 L30,50 Z" 
                            fill={getColor(getColorIntensity('abs'))} stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Ab lines for definition */}
                        <path d="M40,60 L60,60" fill="none" stroke="#1a202c" strokeWidth="0.3" />
                        <path d="M40,70 L60,70" fill="none" stroke="#1a202c" strokeWidth="0.3" />
                        <path d="M40,80 L60,80" fill="none" stroke="#1a202c" strokeWidth="0.3" />
                        <path d="M50,50 L50,90" fill="none" stroke="#1a202c" strokeWidth="0.3" />
                        
                        {/* Quads */}
                        <path id="quad-left" d="M30,90 L30,130 L45,130 L50,90 L30,90 Z" 
                            fill={getColor(getColorIntensity('quads'))} stroke="#1a202c" strokeWidth="0.5" />
                        <path id="quad-right" d="M50,90 L55,130 L70,130 L70,90 L50,90 Z" 
                            fill={getColor(getColorIntensity('quads'))} stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Calves */}
                        <path id="calf-left" d="M30,130 L28,150 L47,150 L45,130 L30,130 Z" 
                            fill={getColor(getColorIntensity('calves'))} stroke="#1a202c" strokeWidth="0.5" />
                        <path id="calf-right" d="M55,130 L53,150 L72,150 L70,130 L55,130 Z" 
                            fill={getColor(getColorIntensity('calves'))} stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Feet */}
                        <path id="foot-left" d="M28,150 L28,155 L47,155 L47,150 L28,150 Z" 
                            fill="#2d3748" stroke="#1a202c" strokeWidth="0.5" />
                        <path id="foot-right" d="M53,150 L53,155 L72,155 L72,150 L53,150 Z" 
                            fill="#2d3748" stroke="#1a202c" strokeWidth="0.5" />
                    </svg>
                    <div className="text-center mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">Front View</div>
                </div>
                
                {/* Back View */}
                <div className="w-48 h-96 relative bg-gray-900 bg-opacity-20 rounded-lg p-3 flex flex-col items-center">
                    <svg viewBox="0 0 100 170" className="w-full h-full">
                        {/* Head */}
                        <circle cx="50" cy="20" r="12" fill="#2d3748" stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Neck */}
                        <rect x="45" y="32" width="10" height="8" fill="#2d3748" stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Traps */}
                        <path id="traps" d="M40,40 L60,40 L60,45 C55,50 45,50 40,45 L40,40 Z" 
                            fill={getColor(getColorIntensity('traps'))} stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Shoulders */}
                        <path id="shoulder-left" d="M30,40 C25,40 20,45 20,50 L30,50 L30,40 Z" 
                            fill={getColor(getColorIntensity('shoulders'))} stroke="#1a202c" strokeWidth="0.5" />
                        <path id="shoulder-right" d="M70,40 C75,40 80,45 80,50 L70,50 L70,40 Z" 
                            fill={getColor(getColorIntensity('shoulders'))} stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Back */}
                        <path id="back" d="M30,40 L70,40 L70,75 L30,75 Z" 
                            fill={getColor(getColorIntensity('back'))} stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Lats */}
                        <path id="lats-left" d="M30,40 L30,75 L20,60 L20,50 L30,40 Z" 
                            fill={getColor(getColorIntensity('lats'))} stroke="#1a202c" strokeWidth="0.5" />
                        <path id="lats-right" d="M70,40 L80,50 L80,60 L70,75 L70,40 Z" 
                            fill={getColor(getColorIntensity('lats'))} stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Arms */}
                        <path id="arm-left" d="M20,50 L20,80 L30,80 L30,50 L20,50 Z" 
                            fill={getColor(getColorIntensity('arms'))} stroke="#1a202c" strokeWidth="0.5" />
                        <path id="arm-right" d="M70,50 L80,50 L80,80 L70,80 L70,50 Z" 
                            fill={getColor(getColorIntensity('arms'))} stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Forearms */}
                        <path id="forearm-left" d="M20,80 L15,95 L35,95 L30,80 L20,80 Z" 
                            fill={getColor(getColorIntensity('forearms'))} stroke="#1a202c" strokeWidth="0.5" />
                        <path id="forearm-right" d="M70,80 L80,80 L85,95 L65,95 L70,80 Z" 
                            fill={getColor(getColorIntensity('forearms'))} stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Hands */}
                        <path id="hand-left" d="M15,95 L15,100 L35,100 L35,95 L15,95 Z" 
                            fill="#2d3748" stroke="#1a202c" strokeWidth="0.5" />
                        <path id="hand-right" d="M65,95 L65,100 L85,100 L85,95 L65,95 Z" 
                            fill="#2d3748" stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Glutes */}
                        <path id="glutes" d="M30,75 L70,75 L70,90 L30,90 Z" 
                            fill={getColor(getColorIntensity('glutes'))} stroke="#1a202c" strokeWidth="0.5" />
                        <path id="glute-separation" d="M50,75 L50,90" fill="none" stroke="#1a202c" strokeWidth="0.3" />
                        
                        {/* Hamstrings */}
                        <path id="hamstring-left" d="M30,90 L30,130 L45,130 L50,90 L30,90 Z" 
                            fill={getColor(getColorIntensity('hamstrings'))} stroke="#1a202c" strokeWidth="0.5" />
                        <path id="hamstring-right" d="M50,90 L55,130 L70,130 L70,90 L50,90 Z" 
                            fill={getColor(getColorIntensity('hamstrings'))} stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Calves */}
                        <path id="calf-left" d="M30,130 L28,150 L47,150 L45,130 L30,130 Z" 
                            fill={getColor(getColorIntensity('calves'))} stroke="#1a202c" strokeWidth="0.5" />
                        <path id="calf-right" d="M55,130 L53,150 L72,150 L70,130 L55,130 Z" 
                            fill={getColor(getColorIntensity('calves'))} stroke="#1a202c" strokeWidth="0.5" />
                        
                        {/* Feet */}
                        <path id="foot-left" d="M28,150 L28,155 L47,155 L47,150 L28,150 Z" 
                            fill="#2d3748" stroke="#1a202c" strokeWidth="0.5" />
                        <path id="foot-right" d="M53,150 L53,155 L72,155 L72,150 L53,150 Z" 
                            fill="#2d3748" stroke="#1a202c" strokeWidth="0.5" />
                    </svg>
                    <div className="text-center mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">Back View</div>
                </div>
            </div>
            
            {/* Legend */}
            <div className="mt-6 flex flex-wrap justify-center gap-6 bg-gray-900 bg-opacity-20 py-3 px-6 rounded-lg">
                {/* Intensity Scale - Added back */}
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Intensity Scale:</span>
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                            <div className="w-5 h-5 bg-gray-700 mr-1 border border-gray-600 rounded"></div>
                            <span className="text-xs text-gray-600 dark:text-gray-300">No Volume</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-5 h-5 bg-blue-500 mr-1 border border-blue-600 rounded"></div>
                            <span className="text-xs text-gray-600 dark:text-gray-300">Low</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-5 h-5 bg-teal-400 mr-1 border border-teal-500 rounded"></div>
                            <span className="text-xs text-gray-600 dark:text-gray-300">Med-Low</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-5 h-5 bg-yellow-400 mr-1 border border-yellow-500 rounded"></div>
                            <span className="text-xs text-gray-600 dark:text-gray-300">Medium</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-5 h-5 bg-orange-500 mr-1 border border-orange-600 rounded"></div>
                            <span className="text-xs text-gray-600 dark:text-gray-300">Med-High</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-5 h-5 bg-red-600 mr-1 border border-red-700 rounded"></div>
                            <span className="text-xs text-gray-600 dark:text-gray-300">High</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Muscle Set Breakdown Component
const MuscleSetBreakdown: React.FC<{ 
    muscleData: MuscleData[];
    title: string;
    workouts: WorkoutAdminData[];
}> = ({ muscleData, title, workouts }) => {
    // Sort muscles by sets count in descending order
    const sortedMuscleData = [...muscleData].sort((a, b) => b.setsCount - a.setsCount);
    
    // State to track which group is expanded
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    
    // Define color mapping for different muscle groups
    const getGroupColor = (muscleName: string): string => {
        const groupColors: Record<string, string> = {
            'Arms': 'bg-blue-600',
            'Shoulders': 'bg-purple-600',
            'Chest': 'bg-red-600',
            'Back': 'bg-green-600',
            'Core': 'bg-yellow-600',
            'Glutes': 'bg-pink-600',
            'Legs': 'bg-indigo-600',
            'Neck': 'bg-gray-600',
            'Other': 'bg-gray-500'
        };
        
        return groupColors[muscleName] || 'bg-red-600'; // Default to red if not found
    };
    
    // Get text color for different muscle groups
    const getGroupTextColor = (muscleName: string): string => {
        const textColors: Record<string, string> = {
            'Arms': 'text-blue-600 dark:text-blue-400',
            'Shoulders': 'text-purple-600 dark:text-purple-400',
            'Chest': 'text-red-600 dark:text-red-400',
            'Back': 'text-green-600 dark:text-green-400',
            'Core': 'text-yellow-600 dark:text-yellow-400',
            'Glutes': 'text-pink-600 dark:text-pink-400',
            'Legs': 'text-indigo-600 dark:text-indigo-400',
            'Neck': 'text-gray-600 dark:text-gray-400',
            'Other': 'text-gray-600 dark:text-gray-400'
        };
        
        return textColors[muscleName] || 'text-gray-600 dark:text-gray-400';
    };
    
    // Local helper to avoid reference issues with outer function
    const cleanName = (name: string): string => {
        if (!name) return name;
        // Remove text within parentheses and extra whitespace
        return name.replace(/\s*\([^)]*\)\s*/g, ' ') // Remove anything between parentheses
                   .replace(/\s+/g, ' ')             // Replace multiple spaces with a single space
                   .trim();                          // Remove leading/trailing whitespace
    };
    
    // Function to get exercises for a specific muscle group
    const getExercisesForMuscleGroup = (muscleGroup: string): { 
        name: string, 
        setCount: number, 
        isPrimary: boolean, 
        isSecondary: boolean 
    }[] => {
        // Create a map to track exercises and their set counts + muscle targeting
        const exerciseMap: Record<string, { 
            primaryCount: number, 
            secondaryCount: number,
            actualSets: number
        }> = {};
        
        // Loop through all workouts and exercises
        workouts.forEach(workout => {
            if (!workout.exercise_instances) return;
            
            workout.exercise_instances.forEach(exercise => {
                let primaryMuscle: string | null = null;
                let secondaryMuscles: string[] = [];
                
                // Get muscles from the exercise data
                if (exercise.exercises) {
                    const exerciseData = exercise.exercises as unknown;
                    // Safely access properties
                    const data = exerciseData as {
                        primary_muscle_group?: string,
                        body_part?: string,
                        target?: string,
                        secondary_muscle_groups?: string[]
                    };
                    
                    primaryMuscle = data.primary_muscle_group || data.body_part || data.target || null;
                    secondaryMuscles = Array.isArray(data.secondary_muscle_groups) 
                        ? data.secondary_muscle_groups 
                        : [];
                } else {
                    // Fallback to legacy data
                    const legacyData = exercise as unknown as {
                        primary_muscle_group?: string,
                        secondary_muscle_groups?: string[]
                    };
                    
                    primaryMuscle = legacyData.primary_muscle_group || null;
                    secondaryMuscles = legacyData.secondary_muscle_groups || [];
                }
                
                const name = cleanName(exercise.exercise_name);
                // Get the actual number of sets from sets_data when available, or fall back to the sets field
                const setCount = exercise.sets_data?.length || parseInt(exercise.sets as string) || 0;
                
                if (!name || setCount <= 0) return;
                
                // Get muscle category for primary muscle if it exists
                let primaryBelongsToGroup = false;
                if (primaryMuscle) {
                    const primaryLower = primaryMuscle.toLowerCase().trim();
                    let primaryCategory = MUSCLE_GROUP_MAPPING[primaryLower] || primaryMuscle;
                    
                    // If not an exact match, try to find a partial match
                    if (!MUSCLE_GROUP_MAPPING[primaryLower]) {
                        for (const [muscle, category] of Object.entries(MUSCLE_GROUP_MAPPING)) {
                            if (primaryLower.includes(muscle) || muscle.includes(primaryLower)) {
                                primaryCategory = category;
                                break;
                            }
                        }
                    }
                    
                    // Check if this exercise primarily targets the requested muscle group
                    primaryBelongsToGroup = (primaryCategory === muscleGroup);
                }
                
                // Get all secondary muscle categories
                const secondaryBelongsToGroup = secondaryMuscles.some(muscleName => {
                    if (!muscleName) return false;
                    
                    const secondaryLower = muscleName.toLowerCase().trim();
                    let secondaryCategory = MUSCLE_GROUP_MAPPING[secondaryLower] || muscleName;
                    
                    // If not an exact match, try to find a partial match
                    if (!MUSCLE_GROUP_MAPPING[secondaryLower]) {
                        for (const [muscle, category] of Object.entries(MUSCLE_GROUP_MAPPING)) {
                            if (secondaryLower.includes(muscle) || muscle.includes(secondaryLower)) {
                                secondaryCategory = category;
                                break;
                            }
                        }
                    }
                    
                    return secondaryCategory === muscleGroup;
                });
                
                // If this exercise targets our muscle group, add it to the map
                if (primaryBelongsToGroup || secondaryBelongsToGroup) {
                    if (!exerciseMap[name]) {
                        exerciseMap[name] = { 
                            primaryCount: 0, 
                            secondaryCount: 0,
                            actualSets: 0
                        };
                    }
                    
                    if (primaryBelongsToGroup) {
                        exerciseMap[name].primaryCount++;
                        exerciseMap[name].actualSets += setCount;
                    } else if (secondaryBelongsToGroup) {
                        exerciseMap[name].secondaryCount++;
                        // For secondary muscles, count half the sets (rounded up)
                        exerciseMap[name].actualSets += Math.ceil(setCount / 2);
                    }
                }
            });
        });
        
        // Convert map to array of exercises with their set counts
        return Object.entries(exerciseMap)
            .map(([name, counts]) => {
                return { 
                    name, 
                    setCount: counts.actualSets, // Use the actual tracked sets
                    isPrimary: counts.primaryCount > 0,
                    isSecondary: counts.primaryCount === 0 && counts.secondaryCount > 0
                };
            })
            .filter(exercise => exercise.setCount > 0) // Only include exercises with sets
            // Sort first by primary/secondary status (primary first), then by set count within each group
            .sort((a, b) => {
                // Primary exercises come before secondary
                if (a.isPrimary && !b.isPrimary) return -1;
                if (!a.isPrimary && b.isPrimary) return 1;
                
                // Within the same category (primary or secondary), sort by set count
                return b.setCount - a.setCount;
            });
    };
    
    const toggleGroup = (groupName: string) => {
        if (expandedGroup === groupName) {
            setExpandedGroup(null); // Collapse if already expanded
        } else {
            setExpandedGroup(groupName); // Expand the clicked group
        }
    };
    
    return (
        <div className="mb-8">
            <h3 className="text-xl font-semibold mb-5 text-gray-800 dark:text-white">{title}</h3>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Muscle Group
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Total Sets
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Volume Distribution
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                        {sortedMuscleData.length > 0 ? (
                            (() => {
                                // First pass to calculate max sets across all muscle groups
                                const allMuscleExercises = sortedMuscleData.map(muscle => 
                                    getExercisesForMuscleGroup(muscle.name)
                                );
                                const allMuscleTotalSets = allMuscleExercises.map(exercises => 
                                    exercises.reduce((sum, ex) => sum + ex.setCount, 0)
                                );
                                const maxTotalSets = Math.max(...allMuscleTotalSets, 1); // Prevent division by zero
                                
                                // Second pass to render with corrected percentages
                                return sortedMuscleData.map((muscle, index) => {
                                    // Get all exercises for this muscle group to calculate accurate total sets
                                    const muscleExercises = getExercisesForMuscleGroup(muscle.name);
                                    const totalExerciseSets = muscleExercises.reduce((sum, ex) => sum + ex.setCount, 0);
                                    // Calculate corrected intensity percentage
                                    const correctedIntensity = Math.round((totalExerciseSets / maxTotalSets) * 100);
                                    
                                    return (
                                        <React.Fragment key={index}>
                                            <tr 
                                                className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'} 
                                                    hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors`}
                                                onClick={() => toggleGroup(muscle.name)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white capitalize flex items-center">
                                                    <span className={`mr-2 ${expandedGroup === muscle.name ? 'transform rotate-90 transition-transform' : 'transition-transform'}`}>
                                                        ▶
                                                    </span>
                                                    {muscle.name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-500 dark:text-gray-300">
                                                    {totalExerciseSets}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-4">
                                                            <div 
                                                                className={`${getGroupColor(muscle.name)} h-2.5 rounded-full`}
                                                                style={{ width: `${correctedIntensity}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-10 text-right">
                                                            {correctedIntensity}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            {/* Expanded details section */}
                                            {expandedGroup === muscle.name && (
                                                <tr className="bg-gray-50 dark:bg-gray-900/30">
                                                    <td colSpan={3} className="px-4 py-2">
                                                        <div className="px-3 py-3 rounded bg-gray-100 dark:bg-gray-800">
                                                            <h4 className={`text-sm font-medium mb-2 ${getGroupTextColor(muscle.name)}`}>
                                                                Exercises targeting {muscle.name.toLowerCase()}
                                                            </h4>
                                                            <div className="space-y-3">
                                                                {(() => {
                                                                    const exercises = muscleExercises; // Reuse already calculated exercises
                                                                    const primaryExercises = exercises.filter(ex => ex.isPrimary);
                                                                    const secondaryExercises = exercises.filter(ex => ex.isSecondary);
                                                                    
                                                                    return (
                                                                        <>
                                                                            {primaryExercises.length > 0 && (
                                                                                <div>
                                                                                    <h5 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-1 border-b border-red-200 dark:border-red-900 pb-1">
                                                                                        Primary Target
                                                                                    </h5>
                                                                                    <div className="space-y-1">
                                                                                        {primaryExercises.map((exercise, idx) => (
                                                                                            <div key={idx} className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-sm">
                                                                                                <span className="text-gray-800 dark:text-gray-200 font-medium">
                                                                                                    {exercise.name}
                                                                                                </span>
                                                                                                <span className="text-gray-600 dark:text-gray-400 font-medium">{exercise.setCount} sets</span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            
                                                                            {secondaryExercises.length > 0 && (
                                                                                <div className={primaryExercises.length > 0 ? "mt-2" : ""}>
                                                                                    <h5 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-1 border-b border-blue-200 dark:border-blue-900 pb-1">
                                                                                        Secondary Target
                                                                                    </h5>
                                                                                    <div className="space-y-1">
                                                                                        {secondaryExercises.map((exercise, idx) => (
                                                                                            <div key={idx} className="flex justify-between items-center py-1 px-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-sm">
                                                                                                <span className="text-gray-800 dark:text-gray-200">
                                                                                                    {exercise.name}
                                                                                                </span>
                                                                                                <span className="text-gray-600 dark:text-gray-400 font-medium">{exercise.setCount} sets</span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            
                                                                            {exercises.length === 0 && (
                                                                                <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                                                                                    No specific exercises found
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                });
                            })()
                        ) : (
                            <tr>
                                <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                                    No muscle data available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Training Volume Guidelines */}
            <div className="mt-5 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="text-md font-semibold mb-3 text-gray-700 dark:text-gray-200">Weekly Training Volume Guidelines</h4>
                <div className="space-y-3">
                    <div className="flex">
                        <div className="w-28 flex-shrink-0">
                            <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs font-medium">Beginners</span>
                        </div>
                        <div className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                            Start with 4–10 sets per week to stimulate growth, as even minimal volume can yield significant "newbie gains".
                        </div>
                    </div>
                    
                    <div className="flex">
                        <div className="w-28 flex-shrink-0">
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">Intermediate</span>
                        </div>
                        <div className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                            Aim for 12–20 sets (1–4 years), increasing volume gradually to overcome adaptation plateaus.
                        </div>
                    </div>
                    
                    <div className="flex">
                        <div className="w-28 flex-shrink-0">
                            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-medium">Advanced</span>
                        </div>
                        <div className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                            May require 20–30+ sets ({'>'}5 years) for continued growth, but this depends on individual recovery and exercise quality.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProgramBuilder: React.FC = () => {
    const [templates, setTemplates] = useState<ProgramTemplateListItem[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<ProgramTemplateListItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState<boolean>(false);
    const [selectedTemplate, setSelectedTemplate] = useState<ProgramTemplateListItem | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    // State for workouts of the selected template
    const [currentWorkouts, setCurrentWorkouts] = useState<WorkoutAdminData[]>([]);
    const [isLoadingWorkouts, setIsLoadingWorkouts] = useState<boolean>(false);
    // State for workout form
    const [editingWorkout, setEditingWorkout] = useState<WorkoutAdminData | null>(null);
    const [selectedWorkout, setSelectedWorkout] = useState<WorkoutAdminData | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    // 1. First, add a state for the version creation modal
    const [showVersionConfirm, setShowVersionConfirm] = useState<string | null>(null);

    // Add these new states for muscle visualization
    const [muscleData, setMuscleData] = useState<MuscleData[]>([]);
    const [showMuscleVisualizations, setShowMuscleVisualizations] = useState<boolean>(false);
    // Add state to track muscle data refresh
    const [isRefreshingMuscleData, setIsRefreshingMuscleData] = useState<boolean>(false);

    const profile = useSelector(selectProfile);

    // React Hook Form methods - remove resolver
    const methods = useForm<TemplateFormData>({
        // resolver: zodResolver(templateSchema),
        defaultValues: { name: '', phase: '', weeks: '', description: '', fitness_level: 'Intermediate', is_public: false } 
    });
    const { handleSubmit, reset, setError: setFormError, register } = methods; // Add setFormError and register

    // Extract the fetchTemplates function from the useEffect to make it accessible throughout the component
    const fetchTemplates = async () => {
        if (!profile || !profile.id) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('program_templates')
                .select('id, name, phase, weeks, created_at, description, is_public, version, parent_template_id, is_latest_version, fitness_level')
                .eq('coach_id', profile.id)
                .order('created_at', { ascending: false });
            
            if (fetchError) throw fetchError;
            
            // Ensure each template has is_public field, defaulting to false if missing
            const templatesWithVisibility = data?.map(template => ({
                ...template,
                is_public: template.is_public ?? false,
                version: template.version ?? 1,
                is_latest_version: template.is_latest_version ?? true,
                fitness_level: template.fitness_level ?? 'Intermediate'
            })) || [];
            
            setTemplates(templatesWithVisibility);
            setFilteredTemplates(templatesWithVisibility);

        } catch (err: unknown) {
            console.error("Error fetching program templates:", err);
            setError('Failed to load templates.');
        } finally {
            setIsLoading(false);
        }
    };

    // Then modify the useEffect to use the function directly
    // Replace the existing useEffect with:
    useEffect(() => {
        fetchTemplates();
    }, [profile]);

    // Effect to populate form when editing
    useEffect(() => {
        if (selectedTemplate) {
            reset({
                name: selectedTemplate.name,
                phase: selectedTemplate.phase || '',
                weeks: selectedTemplate.weeks.toString(),
                description: selectedTemplate.description || '',
                fitness_level: selectedTemplate.fitness_level || 'Intermediate',
                is_public: selectedTemplate.is_public
            });
        } else {
             reset({ name: '', phase: '', weeks: '', description: '', fitness_level: 'Intermediate', is_public: false });
        }
    }, [selectedTemplate, reset]);

    // Fetch workouts when a template is selected for editing
    useEffect(() => {
        fetchWorkoutsForTemplate();
    }, [selectedTemplate]); // Depend on selectedTemplate

    // Add search filtering
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredTemplates(templates);
            return;
        }
        
        const query = searchQuery.toLowerCase();
        const filtered = templates.filter(
            template => 
                template.name.toLowerCase().includes(query) || 
                (template.phase && template.phase.toLowerCase().includes(query))
        );
        setFilteredTemplates(filtered);
    }, [searchQuery, templates]);

    const handleCreateNew = () => {
        setIsCreating(true);
        setSelectedTemplate(null);
        reset({ name: '', phase: '', weeks: '', description: '', fitness_level: 'Intermediate', is_public: false });
    };

    const handleEdit = (template: ProgramTemplateListItem) => {
        setSelectedTemplate(template);
        setIsCreating(false);
    };

    const handleCancel = () => {
        setIsCreating(false);
        setSelectedTemplate(null);
        setCurrentWorkouts([]); // Clear workouts when cancelling
        reset({ name: '', phase: '', weeks: '', description: '', fitness_level: 'Intermediate', is_public: false });
    };

    // Save handler with manual validation
    const handleSaveTemplate: SubmitHandler<TemplateFormData> = async (formData) => {
        if (!profile || !profile.id) {
             setError('Cannot save template: User profile not loaded.');
             return; 
        }
        setError(null); // Clear general error
         // Clear previous form errors
        Object.keys(formData).forEach(key => setFormError(key as keyof TemplateFormData, {}));

        try {
            // --- Manual Zod Validation ---
            const validationResult = templateSchema.safeParse(formData);
            if (!validationResult.success) {
                // Populate form errors from Zod issues
                validationResult.error.errors.forEach((err) => {
                    if (err.path.length > 0) {
                         setFormError(err.path[0] as keyof TemplateFormData, { 
                             type: 'manual', 
                             message: err.message 
                         });
                    }
                });
                return; // Stop submission
            }
            // --- Validation Passed ---

            // Use validated data (includes transformed `weeks` as number)
            const validatedData = validationResult.data;
            
            const coachProfileId = profile.id;
            const payload = { ...validatedData, coach_id: coachProfileId };
            let resultError;

            if (isCreating) {
                 const { error } = await supabase.from('program_templates').insert(payload);
                resultError = error;
            } else if (selectedTemplate) {
                 const { error } = await supabase
                    .from('program_templates')
                    .update(payload)
                    .eq('id', selectedTemplate.id);
                resultError = error;
            }

            if (resultError) throw resultError;
            
            // Refetch templates after successful save
            await fetchTemplates();
            handleCancel(); 

        } catch (err: unknown) {
             console.error("Error saving template:", err);
             setError('Failed to save template.'); // Show general error
        }
    };

    // --- Workout Handlers ---
    const handleAddWorkout = () => {
        // Create an empty workout object to use for a new workout
        const emptyWorkout: WorkoutAdminData = {
            name: "New Workout",
            day_of_week: null,
            week_number: null,
            order_in_program: currentWorkouts.length,
            description: null,
            exercise_instances: []
        };
        
        // Set both selected and editing workout to our empty workout
        setSelectedWorkout(emptyWorkout);
        setEditingWorkout(emptyWorkout);
    };

    const handleCloseWorkoutModal = () => {
        // Only clear the editing state, not the selected workout
        // This allows us to keep the selected workout for muscle visualization
        setEditingWorkout(null);
        // Keep selectedWorkout state to maintain muscle visualization
    };

    const handleSaveWorkout = async (
        workoutFormData: Omit<WorkoutAdminData, 'exercise_instances' | 'id' | 'program_template_id'>, 
        exercises: ExerciseInstanceAdminData[], // Receive exercises from form
        workoutId?: string
    ) => {
        if (!selectedTemplate || !selectedTemplate.id) {
            setError('Cannot save workout: No program template selected.');
            return;
        }
        
        try {
            let savedWorkoutId = workoutId;
            
            // 1. Create or update the workout
            if (!workoutId) {
                // INSERT new workout
                const { data, error } = await supabase
                    .from('workouts')
                    .insert({
                        ...workoutFormData,
                        program_template_id: selectedTemplate.id
                    })
                    .select('id')
                    .single();
                    
                if (error) throw error;
                if (!data?.id) throw new Error('No workout ID returned from insert');
                
                savedWorkoutId = data.id;
            } else {
                // UPDATE existing workout
                const { error } = await supabase
                    .from('workouts')
                    .update(workoutFormData)
                    .eq('id', workoutId);
                    
                if (error) throw error;
            }
            
            // 2. If we got here, we have a valid workout ID
            if (!savedWorkoutId) throw new Error('Missing workout ID for exercise save');
            
            // 3. When updating, we need to get existing exercise instance IDs before deleting them
            // so we can delete related sets
            let existingExerciseIds: string[] = [];
            if (workoutId) {
                const { data: existingExercises, error: fetchError } = await supabase
                    .from('exercise_instances')
                    .select('id')
                    .eq('workout_id', workoutId);
                    
                if (fetchError) throw fetchError;
                
                existingExerciseIds = existingExercises?.map(ex => ex.id) || [];
                
                // 3.1 Delete all existing exercise sets first
                if (existingExerciseIds.length > 0) {
                    const { error: deleteSetsError } = await supabase
                        .from('exercise_sets')
                        .delete()
                        .in('exercise_instance_id', existingExerciseIds);
                        
                    if (deleteSetsError) throw deleteSetsError;
                }
                
                // 3.2 Now delete the exercise instances
                const { error: deleteExercisesError } = await supabase
                    .from('exercise_instances')
                    .delete()
                    .eq('workout_id', workoutId);
                    
                if (deleteExercisesError) throw deleteExercisesError;
            }
            
            // 4. Insert all current exercises and keep track of their IDs
            const newExerciseIds: Map<number, string> = new Map();
            
            if (exercises.length > 0) {
                // 4.1 Prepare the exercise instance data with the workout_id
                const exerciseData = exercises.map(exercise => {
                    // Create a type that includes workout_id for database operations
                    interface ExerciseInstanceForDb extends Omit<ExerciseInstanceAdminData, 'sets_data'> {
                        workout_id: string;
                    }
                    
                    // Create a more specific interface for internal use that includes superset fields
                    interface ExerciseWithSupersetFields extends ExerciseInstanceAdminData {
                        superset_group_id?: string | null;
                        superset_order?: number;
                    }
                    
                    // Safely access potential superset fields
                    const exerciseWithSuperset = exercise as ExerciseWithSupersetFields;
                    
                    const baseExerciseData = {
                        exercise_db_id: exercise.exercise_db_id,
                        exercise_name: exercise.exercise_name,
                        sets: exercise.sets,
                        reps: exercise.reps,
                        rest_period_seconds: exercise.rest_period_seconds,
                        tempo: exercise.tempo,
                        notes: exercise.notes,
                        order_in_workout: exercise.order_in_workout,
                        set_type: exercise.set_type,
                        each_side: exercise.each_side || false,
                        // Map superset fields to group fields
                        group_id: exerciseWithSuperset.superset_group_id || exercise.group_id || null,
                        group_type: exercise.set_type === SetType.SUPERSET ? ExerciseGroupType.SUPERSET : (exercise.group_type || ExerciseGroupType.NONE),
                        group_order: exerciseWithSuperset.superset_order || exercise.group_order || 0,
                        is_bodyweight: exercise.is_bodyweight || false,
                        workout_id: savedWorkoutId
                    };
                    
                    // Only include ID if it exists and is not null
                    const exerciseForDb: ExerciseInstanceForDb = exercise.id 
                        ? { ...baseExerciseData, id: exercise.id } 
                        : { ...baseExerciseData, id: uuidv4() }; // Generate a new UUID for new exercises
                    
                    return exerciseForDb;
                });
                
                // 4.2 Insert exercise instances and get their IDs
                const { data: insertedExercises, error: insertError } = await supabase
                    .from('exercise_instances')
                    .insert(exerciseData)
                    .select('id, order_in_workout');
                    
                if (insertError) {
                    console.error('Error inserting exercise instances:', insertError);
                    throw insertError;
                }
                
                if (insertedExercises) {
                    // Create a map of exercise index to ID for referencing when creating sets
                    // This uses array index instead of order_in_workout which can have duplicates
                    insertedExercises.forEach((ex, index) => {
                        newExerciseIds.set(index, ex.id);
                    });
                }
                
                // 5. Now insert all exercise sets
                const allSetsToInsert = [];
                
                for (let i = 0; i < exercises.length; i++) {
                    const exercise = exercises[i];
                    // Use the array index to look up the ID instead of order_in_workout
                    const exerciseId = newExerciseIds.get(i);
                    
                    if (exerciseId && exercise.sets_data && exercise.sets_data.length > 0) {
                        // Map each set to include the exercise_instance_id
                        const setData = exercise.sets_data.map(set => ({
                            exercise_instance_id: exerciseId,
                            set_order: set.set_order,
                            type: set.type,
                            reps: set.reps || null,
                            weight: set.weight || null,
                            rest_seconds: set.rest_seconds ?? null,
                            duration: set.duration || null
                        }));
                        
                        allSetsToInsert.push(...setData);
                    } else {
                        console.warn(`No sets to insert for exercise ${exercise.exercise_name}:`, {
                            hasExerciseId: !!exerciseId,
                            hasSetsData: !!exercise.sets_data,
                            setsCount: exercise.sets_data?.length || 0
                        });
                    }
                }
                
                // Insert all sets in a batch if we have any
                if (allSetsToInsert.length > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { data: insertedSets, error: insertSetsError } = await supabase
                        .from('exercise_sets')
                        .insert(allSetsToInsert)
                        .select();
                        
                    if (insertSetsError) {
                        console.error('Error inserting exercise sets:', insertSetsError);
                        throw insertSetsError;
                    }
                }
            }
            
            // 6. Refetch workouts to update the list
            const { data: refreshedWorkouts, error: refreshError } = await supabase
                .from('workouts')
                .select(`
                    *, 
                    exercise_instances(*)
                `)
                .eq('program_template_id', selectedTemplate.id)
                .order('order_in_program', { ascending: true })
                .order('order_in_workout', { foreignTable: 'exercise_instances', ascending: true });
                
            if (refreshError) {
                setError('Workout saved, but failed to refresh workout list.');
            } else if (refreshedWorkouts) {
                // Get all exercise instance IDs
                const exerciseInstanceIds: string[] = [];
                refreshedWorkouts.forEach(workout => {
                    if (workout.exercise_instances && workout.exercise_instances.length > 0) {
                        workout.exercise_instances.forEach((instance: ExerciseInstanceAdminData) => {
                            if (instance.id) {
                                exerciseInstanceIds.push(instance.id);
                            }
                        });
                    }
                });
                
                // Fetch all exercise sets for these instances
                if (exerciseInstanceIds.length > 0) {
                    const { data: setsData, error: setsError } = await supabase
                        .from('exercise_sets')
                        .select('*')
                        .in('exercise_instance_id', exerciseInstanceIds)
                        .order('set_order', { ascending: true });
                        
                    if (setsError) {
                        console.error('Error fetching exercise sets:', setsError);
                    } else if (setsData) {
                        // Group sets by exercise instance ID
                        const setsByExerciseId = new Map<string, ExerciseSet[]>();
                        
                        setsData.forEach(set => {
                            const exerciseId = set.exercise_instance_id;
                            if (!setsByExerciseId.has(exerciseId)) {
                                setsByExerciseId.set(exerciseId, []);
                            }
                            
                            setsByExerciseId.get(exerciseId)?.push({
                                id: set.id,
                                set_order: set.set_order,
                                type: set.type as SetType,
                                reps: set.reps || undefined,
                                weight: set.weight || undefined,
                                rest_seconds: set.rest_seconds ?? undefined,
                                duration: set.duration || undefined
                            });
                        });
                        
                        // Attach sets to their respective exercise instances
                        refreshedWorkouts.forEach(workout => {
                            if (workout.exercise_instances) {
                                // First, identify all group IDs and create a mapping of exercises within each group
                                const exerciseGroups = new Map<string, ExerciseInstanceAdminData[]>();
                                
                                // Pre-process to identify all groups
                                workout.exercise_instances.forEach((instance: ExerciseInstanceAdminData) => {
                                    if (instance.group_id && instance.group_type === ExerciseGroupType.SUPERSET) {
                                        if (!exerciseGroups.has(instance.group_id)) {
                                            exerciseGroups.set(instance.group_id, []);
                                        }
                                        exerciseGroups.get(instance.group_id)?.push(instance);
                                    }
                                });
                                
                                // Process each exercise - attach sets and map group fields to superset fields
                                workout.exercise_instances.forEach((instance: ExerciseInstanceAdminData) => {
                                    // Attach sets if available
                                    if (instance.id && setsByExerciseId.has(instance.id)) {
                                        instance.sets_data = setsByExerciseId.get(instance.id);
                                    }
                                    
                                    // Map group fields to superset fields for the UI component
                                    interface ExerciseWithSupersetFields extends ExerciseInstanceAdminData {
                                        superset_group_id?: string | null;
                                        superset_order?: number;
                                    }
                                    
                                    const instanceWithSuperset = instance as ExerciseWithSupersetFields;
                                    
                                    // If part of a superset group, set superset fields
                                    if (instance.group_id && instance.group_type === ExerciseGroupType.SUPERSET) {
                                        instanceWithSuperset.superset_group_id = instance.group_id;
                                        instanceWithSuperset.superset_order = instance.group_order;
                                    }
                                });
                                
                                // Sort exercise instances by order_in_workout for normal display
                                workout.exercise_instances.sort((a: ExerciseInstanceAdminData, b: ExerciseInstanceAdminData) => 
                                    (a.order_in_workout || 0) - (b.order_in_workout || 0)
                                );
                            }
                        });
                    }
                }
                
                setCurrentWorkouts(refreshedWorkouts);
            } else {
                setCurrentWorkouts([]);
            }
            
            // 7. Close workout form
            handleCloseWorkoutModal();
            
        } catch (err: unknown) {
            console.error("Error saving workout:", err);
            
            // 2. Now modify the error handling in handleSaveWorkout to use the modal instead of confirm()
            // Inside handleSaveWorkout, replace the confirm() dialog block with this:

            // Check if this is a foreign key constraint violation
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const error = err as any;
            if (error?.code === '23503' && error?.message?.includes('violates foreign key constraint') && 
                error?.message?.includes('completed_exercise_sets')) {
                
                // This is the specific error we're looking for - suggest creating a new version
                setError(
                    'Cannot modify this workout as it has already been used by athletes. ' + 
                    'Please create a new version of the program to make changes.'
                );
                
                // Show the version creation modal instead of browser confirm
                if (selectedTemplate?.id) {
                    setShowVersionConfirm(selectedTemplate.id);
                }
            } else {
                // Handle other errors normally
                setError('Failed to save workout.');
            }
        }
    };

    // Fix the duplicateWorkout function to properly refer to the existing fetchWorkoutsForTemplate function
    const duplicateWorkout = async (workout: WorkoutAdminData, targetDayOfWeek: number) => {
        if (!selectedTemplate || !selectedTemplate.id) {
            setError('Cannot duplicate workout: No program template selected.');
            return;
        }

        try {
            setIsLoading(true);
            
            // Create a new workout object without ID (to create a new record)
            const newWorkoutData = {
                program_template_id: selectedTemplate.id,
                name: `${workout.name} (Copy)`,
                day_of_week: targetDayOfWeek,
                week_number: workout.week_number,
                order_in_program: workout.order_in_program,
                description: workout.description
            };

            // 1. Insert the new workout
            const { data: newWorkout, error: workoutError } = await supabase
                .from('workouts')
                .insert(newWorkoutData)
                .select('id')
                .single();

            if (workoutError) throw workoutError;
            if (!newWorkout?.id) throw new Error('No workout ID returned from insert');

            const newWorkoutId = newWorkout.id;

            // 2. Get the original workout's exercise instances
            const { data: exerciseInstances, error: exercisesError } = await supabase
                .from('exercise_instances')
                .select('*')
                .eq('workout_id', workout.id);

            if (exercisesError) throw exercisesError;
            
            if (!exerciseInstances || exerciseInstances.length === 0) {
                // No exercises to duplicate, just return the new workout
                // Refresh the workout list
                if (selectedTemplate) {
                    await fetchWorkoutsForTemplate();
                }
                setIsLoading(false);
                setSuccess(`Duplicated workout "${workout.name}" to ${getDayName(targetDayOfWeek)}`);
                return;
            }

            // 3. Create new exercise instances for the duplicated workout
            const newExerciseData = exerciseInstances.map(exercise => ({
                ...exercise,
                id: uuidv4(), // Generate a new UUID instead of undefined
                workout_id: newWorkoutId // Set to the new workout ID
            }));

            // 4. Insert the new exercise instances
            const { data: newExercises, error: newExercisesError } = await supabase
                .from('exercise_instances')
                .insert(newExerciseData)
                .select('id, exercise_db_id');

            if (newExercisesError) {
                console.error('Error inserting exercise instances:', newExercisesError);
                throw newExercisesError;
            }
            
            if (!newExercises || newExercises.length === 0) {
                console.error('No exercise instances were created.');
                throw new Error('Failed to create exercise instances');
            }
            
            // Create a mapping from old exercise IDs to new exercise IDs
            const exerciseIdMap = new Map<string, string>();
            
            for (let i = 0; i < exerciseInstances.length; i++) {
                if (newExercises && newExercises[i]) {
                    exerciseIdMap.set(exerciseInstances[i].id, newExercises[i].id);
                }
            }

            // 5. Get all exercise sets for the original exercise instances
            const originalExerciseIds = exerciseInstances.map(e => e.id);
            
            const { data: exerciseSets, error: setsError } = await supabase
                .from('exercise_sets')
                .select('*')
                .in('exercise_instance_id', originalExerciseIds);

            if (setsError) {
                console.error('Error fetching exercise sets:', setsError);
                throw setsError;
            }

            if (exerciseSets && exerciseSets.length > 0) {
                // 6. Create new exercise sets for the duplicated exercise instances
                const newSetsData = exerciseSets.map(set => {
                    const newExerciseId = exerciseIdMap.get(set.exercise_instance_id);
                    if (!newExerciseId) {
                        console.error(`Failed to find mapping for exercise instance ID: ${set.exercise_instance_id}`);
                    }
                    
                    return {
                        ...set,
                        id: uuidv4(), // Generate a new UUID for each set too
                        exercise_instance_id: newExerciseId // Map to new exercise ID
                    };
                });
                
                // 7. Insert the new exercise sets
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { data: insertedSets, error: newSetsError } = await supabase
                    .from('exercise_sets')
                    .insert(newSetsData)
                    .select();

                if (newSetsError) {
                    console.error('Error inserting new sets:', newSetsError);
                    throw newSetsError;
                }
                
            }

            // 8. Refresh the workouts to show the newly duplicated one
            if (selectedTemplate) {
                await fetchWorkoutsForTemplate();
            }
            
            setSuccess(`Duplicated workout "${workout.name}" to ${getDayName(targetDayOfWeek)}`);
            
            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                setSuccess(null);
            }, 3000);
            
        } catch (err) {
            console.error('Error duplicating workout:', err);
            setError('Failed to duplicate workout. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function to get day name from day number
    const getDayName = (dayOfWeek: number): string => {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return days[dayOfWeek - 1] || 'Unknown';
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!profile?.id) return;
        setError(null);
        
        try {
            const { error } = await supabase
                .from('program_templates')
                .delete()
                .eq('id', templateId)
                .eq('coach_id', profile.id);
            
            if (error) throw error;
            
            setTemplates(templates.filter(t => t.id !== templateId));
            setFilteredTemplates(filteredTemplates.filter(t => t.id !== templateId));
            
            if (selectedTemplate?.id === templateId) {
                setSelectedTemplate(null);
                setIsCreating(false);
                setCurrentWorkouts([]);
            }
            
        } catch (err) {
            console.error('Error deleting template:', err);
            setError('Failed to delete template. Make sure there are no assigned athletes.');
        } finally {
            setShowDeleteConfirm(null);
        }
    };
    
    const toggleVisibility = async (template: ProgramTemplateListItem) => {
        if (!profile?.id) return;
        setError(null);
        
        try {
            const newVisibility = !template.is_public;
            
            const { error } = await supabase
                .from('program_templates')
                .update({ is_public: newVisibility })
                .eq('id', template.id)
                .eq('coach_id', profile.id);
                
            if (error) throw error;
            
            // Update local state
            const updatedTemplates = templates.map(t => 
                t.id === template.id ? { ...t, is_public: newVisibility } : t
            );
            setTemplates(updatedTemplates);
            setFilteredTemplates(
                filteredTemplates.map(t => t.id === template.id ? { ...t, is_public: newVisibility } : t)
            );
            
            // If this is the selected template, update that too
            if (selectedTemplate?.id === template.id) {
                setSelectedTemplate({ ...selectedTemplate, is_public: newVisibility });
            }
            
            setSuccess(`Program visibility ${newVisibility ? 'made public' : 'made private'}`);
            setTimeout(() => setSuccess(null), 3000);
            
        } catch (err) {
            console.error('Error updating template visibility:', err);
            setError('Failed to update program visibility.');
        }
    };

    // Fix the selectWorkout function to only select a workout without calculating muscle data
    const selectWorkout = (workout: WorkoutAdminData) => {
        // Set editingWorkout instead of selectedWorkout to display the workout form
        setEditingWorkout(workout);
        setSelectedWorkout(workout);
        // No longer calculating muscle data here - now calculated for all workouts combined
    };

    // Update fetchWorkoutsForTemplate to calculate combined muscle data after workouts are loaded
    const fetchWorkoutsForTemplate = async () => {
        if (!selectedTemplate) {
            setCurrentWorkouts([]);
            return;
        }
        setIsLoadingWorkouts(true);
        try {
            // Now that we have a proper database relationship, we can use nested joins
            const { data, error } = await supabase
                .from('workouts')
                .select(`
                    *, 
                    exercise_instances(
                        *,
                        exercises(
                            id,
                            name,
                            primary_muscle_group,
                            secondary_muscle_groups,
                            body_part,
                            target
                        )
                    )
                `)
                .eq('program_template_id', selectedTemplate.id)
                .order('order_in_program', { ascending: true })
                .order('order_in_workout', { foreignTable: 'exercise_instances', ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                // Get all exercise instance IDs for fetching sets
                const exerciseInstanceIds: string[] = [];
                
                data.forEach(workout => {
                    if (workout.exercise_instances && workout.exercise_instances.length > 0) {
                        workout.exercise_instances.forEach((instance: ExerciseInstanceAdminData) => {
                            if (instance.id) {
                                exerciseInstanceIds.push(instance.id);
                            }
                        });
                    }
                });
                                
                // Fetch all exercise sets for these instances (this part remains the same)
                if (exerciseInstanceIds.length > 0) {
                    const { data: setsData, error: setsError } = await supabase
                        .from('exercise_sets')
                        .select('*')
                        .in('exercise_instance_id', exerciseInstanceIds)
                        .order('set_order', { ascending: true });
                        
                    if (setsError) {
                        console.error('Error fetching exercise sets:', setsError);
                    } else if (setsData) {
                        // Group sets by exercise instance ID
                        const setsByExerciseId = new Map<string, ExerciseSet[]>();
                        
                        setsData.forEach(set => {
                            const exerciseId = set.exercise_instance_id;
                            if (!setsByExerciseId.has(exerciseId)) {
                                setsByExerciseId.set(exerciseId, []);
                            }
                            
                            setsByExerciseId.get(exerciseId)?.push({
                                id: set.id,
                                set_order: set.set_order,
                                type: set.type as SetType,
                                reps: set.reps || undefined,
                                weight: set.weight || undefined,
                                rest_seconds: set.rest_seconds ?? undefined,
                                duration: set.duration || undefined
                            });
                        });
                        
                        // Attach sets to their respective exercise instances
                        data.forEach(workout => {
                            if (workout.exercise_instances) {
                                // First, identify all group IDs and create a mapping of exercises within each group
                                const exerciseGroups = new Map<string, ExerciseInstanceAdminData[]>();
                                
                                // Pre-process to identify all groups
                                workout.exercise_instances.forEach((instance: ExerciseInstanceAdminData) => {
                                    if (instance.group_id && instance.group_type === ExerciseGroupType.SUPERSET) {
                                        if (!exerciseGroups.has(instance.group_id)) {
                                            exerciseGroups.set(instance.group_id, []);
                                        }
                                        exerciseGroups.get(instance.group_id)?.push(instance);
                                    }
                                });
                                
                                // Process each exercise - attach sets and map group fields to superset fields
                                workout.exercise_instances.forEach((instance: ExerciseInstanceAdminData) => {
                                    // Attach sets if available
                                    if (instance.id && setsByExerciseId.has(instance.id)) {
                                        instance.sets_data = setsByExerciseId.get(instance.id);
                                    }
                                    
                                    // Map group fields to superset fields for the UI component
                                    interface ExerciseWithSupersetFields extends ExerciseInstanceAdminData {
                                        superset_group_id?: string | null;
                                        superset_order?: number;
                                    }
                                    
                                    const instanceWithSuperset = instance as ExerciseWithSupersetFields;
                                    
                                    // If part of a superset group, set superset fields
                                    if (instance.group_id && instance.group_type === ExerciseGroupType.SUPERSET) {
                                        instanceWithSuperset.superset_group_id = instance.group_id;
                                        instanceWithSuperset.superset_order = instance.group_order;
                                    }
                                });
                                
                                // Sort exercise instances by order_in_workout for normal display
                                workout.exercise_instances.sort((a: ExerciseInstanceAdminData, b: ExerciseInstanceAdminData) => 
                                    (a.order_in_workout || 0) - (b.order_in_workout || 0)
                                );
                            }
                        });
                    }
                }
                
                setCurrentWorkouts(data);
                
                // Calculate combined muscle data across all workouts
                // Use the data directly instead of currentWorkouts which hasn't been updated yet
                const combinedMuscleData = calculateCombinedMuscleDataFromWorkouts(data);
                setMuscleData(combinedMuscleData);
                setShowMuscleVisualizations(combinedMuscleData.length > 0);
            } else {
                setCurrentWorkouts([]);
                setMuscleData([]);
                setShowMuscleVisualizations(false);
            }
        } catch (err) {
            console.error("Error fetching workouts for template:", err);
            setError('Failed to load workouts for this template.');
            setCurrentWorkouts([]); // Clear workouts on error
            setMuscleData([]);
            setShowMuscleVisualizations(false);
        } finally {
            setIsLoadingWorkouts(false);
        }
    };

    // After the duplicateWorkout function, add a new deleteWorkout function
    const deleteWorkout = async (workoutId: string, workoutName: string) => {
        if (!selectedTemplate || !selectedTemplate.id) {
            setError('Cannot delete workout: No program template selected.');
            return;
        }

        try {
            setIsLoading(true);
            
            // 1. Get all exercise instances for this workout
            const { data: exerciseInstances, error: exercisesError } = await supabase
                .from('exercise_instances')
                .select('id')
                .eq('workout_id', workoutId);

            if (exercisesError) throw exercisesError;
            
            // 2. If we have exercise instances, delete all their sets first
            if (exerciseInstances && exerciseInstances.length > 0) {
                const exerciseIds = exerciseInstances.map(e => e.id);
                
                // Delete all exercise sets for these instances
                const { error: setsError } = await supabase
                    .from('exercise_sets')
                    .delete()
                    .in('exercise_instance_id', exerciseIds);

                if (setsError) throw setsError;
            }
            
            // 3. Delete all exercise instances for this workout
            const { error: deleteInstancesError } = await supabase
                .from('exercise_instances')
                .delete()
                .eq('workout_id', workoutId);
                
            if (deleteInstancesError) throw deleteInstancesError;
            
            // 4. Finally delete the workout itself
            const { error: deleteWorkoutError } = await supabase
                .from('workouts')
                .delete()
                .eq('id', workoutId);
                
            if (deleteWorkoutError) throw deleteWorkoutError;
            
            // 5. Refresh the workouts list
            await fetchWorkoutsForTemplate();
            
            setSuccess(`Deleted workout "${workoutName}"`);
            
            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                setSuccess(null);
            }, 3000);
            
        } catch (err) {
            console.error('Error deleting workout:', err);
            setError('Failed to delete workout. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Function to create a new version of an existing program template
    const createNewProgramVersion = async (templateId: string) => {
        // Check if user is logged in
        if (!profile?.id) {
            setError('You must be logged in to create a new version.');
            return;
        }

        try {
            setIsLoading(true);
            
            // First, fetch the original template details
            const { data: originalTemplate, error: templateError } = await supabase
                .from('program_templates')
                .select('*')
                .eq('id', templateId)
                .single();
                
            if (templateError || !originalTemplate) {
                throw new Error('Failed to fetch original template details');
            }
            
            // Create a new template with incremented version
            const newVersion = (originalTemplate.version || 1) + 1;
            const newTemplateData = {
                name: originalTemplate.name,
                description: originalTemplate.description,
                phase: originalTemplate.phase,
                weeks: originalTemplate.weeks,
                is_public: originalTemplate.is_public,
                coach_id: originalTemplate.coach_id || profile.id,
                version: newVersion,
                parent_template_id: templateId // Link to the original template
            };
            
            // Insert the new template
            const { data: newTemplate, error: insertError } = await supabase
                .from('program_templates')
                .insert(newTemplateData)
                .select()
                .single();
                
            if (insertError || !newTemplate) {
                throw new Error('Failed to create new template version');
            }
            
            // Now fetch all workouts associated with the original template
            const { data: originalWorkouts, error: workoutsError } = await supabase
                .from('workouts')
                .select('*')
                .eq('program_template_id', templateId);
                
            if (workoutsError) {
                throw new Error('Failed to fetch original workouts');
            }
            
            // If there are workouts, copy them to the new template
            if (originalWorkouts && originalWorkouts.length > 0) {
                // Map to hold the relationship between old and new workout IDs
                const workoutIdMap = new Map();
                
                // Create new workouts for the new template
                for (const workout of originalWorkouts) {
                    const newWorkoutData = {
                        name: workout.name,
                        description: workout.description,
                        week: workout.week,
                        day: workout.day,
                        day_name: workout.day_name,
                        program_template_id: newTemplate.id,
                        // Add these important fields
                        day_of_week: workout.day_of_week,
                        order_in_program: workout.order_in_program,
                        week_number: workout.week_number
                    };
                    
                    const { data: newWorkout, error: newWorkoutError } = await supabase
                        .from('workouts')
                        .insert(newWorkoutData)
                        .select()
                        .single();
                        
                    if (newWorkoutError || !newWorkout) {
                        throw new Error(`Failed to create new workout: ${workout.name}`);
                    }
                    
                    // Store the mapping from old to new ID
                    workoutIdMap.set(workout.id, newWorkout.id);
                    
                    // Now fetch exercise instances for this workout
                    const { data: exerciseInstances, error: exerciseError } = await supabase
                        .from('exercise_instances')
                        .select('*')
                        .eq('workout_id', workout.id);
                        
                    if (exerciseError) {
                        throw new Error(`Failed to fetch exercise instances for workout: ${workout.name}`);
                    }
                    
                    // If there are exercise instances, copy them to the new workout
                    if (exerciseInstances && exerciseInstances.length > 0) {
                        // Map to hold the relationship between old and new exercise instance IDs
                        const exerciseIdMap = new Map();
                        
                        // Create new exercise instances for the new workout
                        for (const instance of exerciseInstances) {
                            // Create a more complete copy of the exercise instance with all required fields
                            const newInstanceData = {
                                workout_id: newWorkout.id,
                                exercise_id: instance.exercise_id,
                                exercise_db_id: instance.exercise_db_id,
                                exercise_name: instance.exercise_name, // Add this required field
                                sets: instance.sets,
                                reps: instance.reps,
                                order_in_workout: instance.order_in_workout || instance.order_index, // Handle both field names
                                rest_period_seconds: instance.rest_period_seconds || instance.rest_time,
                                tempo: instance.tempo,
                                notes: instance.notes,
                                percentage: instance.percentage,
                                group_id: instance.group_id,
                                group_type: instance.group_type || 'none',
                                group_order: instance.group_order || 0,
                                each_side: instance.each_side || false,
                                set_type: instance.set_type || 'standard',
                                is_bodyweight: instance.is_bodyweight || false
                            };
                            
                            const { data: newInstance, error: newInstanceError } = await supabase
                                .from('exercise_instances')
                                .insert(newInstanceData)
                                .select()
                                .single();
                                
                            if (newInstanceError || !newInstance) {
                                console.error('Error creating exercise instance:', newInstanceError);
                                throw new Error(`Failed to create new exercise instance: ${instance.exercise_name || 'Unknown exercise'}`);
                            }
                            
                            // Store the mapping from old to new ID
                            exerciseIdMap.set(instance.id, newInstance.id);
                        }
                    }
                }
            }
            
            // Refresh the template list and select the new template
            await fetchTemplates();
            selectTemplate(newTemplate.id);
            
            setIsLoading(false);
            setSuccess(`Created new version (v${newVersion}) of template: ${originalTemplate.name}`);
        } catch (error) {
            console.error('Error creating new program version:', error);
            setIsLoading(false);
            setError('Failed to create new program version.');
        }
    };

    // Helper function to select a template by ID
    const selectTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setSelectedTemplate(template);
        }
    };

    // Add this new function to calculate muscle data for all workouts in the template
    const calculateCombinedMuscleDataFromWorkouts = (workouts: WorkoutAdminData[]): MuscleData[] => {
        // Map to hold sets per muscle group across all workouts
        const muscleMap: Record<string, number> = {};
        
        // Track exercises per muscle group to avoid double-counting
        const exerciseTracker: Record<string, Set<string>> = {};
        
        // Process all workouts and their exercises
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        workouts.forEach((workout, widx) => {
            if (!workout.exercise_instances) return;
            
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            workout.exercise_instances.forEach((exercise, eidx) => {
                // Count total sets for this exercise
                const setCount = exercise.sets_data?.length || parseInt(exercise.sets as string) || 0;
                
                // Get primary muscle from the joined exercises data if available
                let primaryMuscle = null;
                let secondaryMuscles: string[] = [];

                // Define the exercise data type for the joined data
                interface ExerciseData {
                    id: number | string;
                    name: string;
                    primary_muscle_group?: string;
                    secondary_muscle_groups?: string[];
                    body_part?: string;
                    target?: string;
                }
                
                // Check if we have the exercises data from the join
                if (exercise.exercises) {
                    // Cast the exercise data to the right type
                    const exerciseData = exercise.exercises as unknown as ExerciseData;
                    primaryMuscle = exerciseData.primary_muscle_group || exerciseData.body_part || exerciseData.target || null;
                    secondaryMuscles = Array.isArray(exerciseData.secondary_muscle_groups) 
                        ? exerciseData.secondary_muscle_groups 
                        : [];
                        
                } else {
                    // Fallback to existing data - for backward compatibility with direct properties
                    
                    // We expect most exercises should have data with the new structure, but keep fallback just in case
                    interface LegacyExerciseData {
                        primary_muscle_group?: string;
                        secondary_muscle_groups?: string[];
                    }
                    
                    const legacyData = exercise as unknown as LegacyExerciseData;
                    primaryMuscle = legacyData.primary_muscle_group || null;
                    secondaryMuscles = legacyData.secondary_muscle_groups || [];
                }
                
                // Create a cleaned version of the exercise name for tracking
                const exerciseName = exercise.exercise_name || '';
                const cleanedName = exerciseName
                    .replace(/\s*\([^)]*\)\s*/g, ' ') // Remove text within parentheses
                    .replace(/\s+/g, ' ')            // Replace multiple spaces with single space
                    .trim();                         // Remove leading/trailing whitespace
                
                // Map the primary muscle to its broader category if available
                if (primaryMuscle) {
                    // Find the broader category (default to the original muscle name if not found)
                    const primaryLower = primaryMuscle.toLowerCase().trim();
                    let primaryCategory = MUSCLE_GROUP_MAPPING[primaryLower] || primaryMuscle;
                    
                    // If not an exact match, try to find a partial match
                    if (!MUSCLE_GROUP_MAPPING[primaryLower]) {
                        for (const [muscle, category] of Object.entries(MUSCLE_GROUP_MAPPING)) {
                            if (primaryLower.includes(muscle) || muscle.includes(primaryLower)) {
                                primaryCategory = category;
                                break;
                            }
                        }
                    }
                    
                    // Initialize tracking for this muscle if needed
                    if (!exerciseTracker[primaryCategory]) {
                        exerciseTracker[primaryCategory] = new Set();
                    }
                    
                    // Only count this exercise if we haven't seen it before for this muscle
                    if (!exerciseTracker[primaryCategory].has(cleanedName)) {
                        muscleMap[primaryCategory] = (muscleMap[primaryCategory] || 0) + setCount;
                        // Mark this exercise as counted for this muscle group
                        exerciseTracker[primaryCategory].add(cleanedName);
                    }
                }
                
                // Add secondary muscle groups with half the weight
                secondaryMuscles.forEach(muscleName => {
                    if (muscleName) {
                        const secondaryLower = muscleName.toLowerCase().trim();
                        let secondaryCategory = MUSCLE_GROUP_MAPPING[secondaryLower] || muscleName;
                        
                        // If not an exact match, try to find a partial match
                        if (!MUSCLE_GROUP_MAPPING[secondaryLower]) {
                            for (const [muscle, category] of Object.entries(MUSCLE_GROUP_MAPPING)) {
                                if (secondaryLower.includes(muscle) || muscle.includes(secondaryLower)) {
                                    secondaryCategory = category;
                                    break;
                                }
                            }
                        }
                        
                        // Initialize tracking for this muscle if needed
                        if (!exerciseTracker[secondaryCategory]) {
                            exerciseTracker[secondaryCategory] = new Set();
                        }
                        
                        // Only count this exercise if we haven't seen it before for this muscle
                        // or if it's not already counted as a primary target
                        if (!exerciseTracker[secondaryCategory].has(cleanedName)) {
                            // Add half the weight for secondary muscles (rounded up)
                            muscleMap[secondaryCategory] = (muscleMap[secondaryCategory] || 0) + Math.ceil(setCount / 2);
                            // Mark this exercise as counted for this muscle group
                            exerciseTracker[secondaryCategory].add(cleanedName);
                        }
                    }
                });
            });
        });

        // Find the maximum sets for any muscle to calculate intensity
        const maxSets = Math.max(...Object.values(muscleMap), 1);
        
        // Convert the map to an array of objects sorted by volume
        const muscleData = Object.entries(muscleMap).map(([name, setsCount]) => ({
            name,
            setsCount,
            intensity: Math.min(100, Math.round((setsCount / maxSets) * 100))
        }));
        
        // Sort by volume descending
        muscleData.sort((a, b) => b.setsCount - a.setsCount);
                
        return muscleData;
    };

    // Helper function to clean exercise names from gender and version indicators
    const cleanExerciseName = (name: string): string => {
      if (!name) return name;
      // Remove text within parentheses and extra whitespace
      return name.replace(/\s*\([^)]*\)\s*/g, ' ') // Remove anything between parentheses
                 .replace(/\s+/g, ' ')             // Replace multiple spaces with a single space
                 .trim();                          // Remove leading/trailing whitespace
    };

    // Function to refresh muscle data
    const refreshMuscleData = async () => {
        if (!selectedTemplate) {
            return;
        }
        
        setIsRefreshingMuscleData(true);
        try {
            await fetchWorkoutsForTemplate();
            setSuccess("Muscle activation data refreshed successfully");
            
            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                setSuccess(null);
            }, 3000);
        } catch (error) {
            console.error("Error refreshing muscle data:", error);
            setError("Failed to refresh muscle activation data");
        } finally {
            setIsRefreshingMuscleData(false);
        }
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="container mx-auto py-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Program Builder</h1>
                    
                    {!selectedTemplate && !isCreating && (
                        <button
                            onClick={handleCreateNew}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                        >
                            <FiPlus className="mr-2" /> New Template
                        </button>
                    )}
                </div>
                
                {error && (
                    <div className="p-4 mb-6 text-red-700 bg-red-100 rounded-md dark:bg-red-800/20 dark:text-red-300" role="alert">
                        {error}
                    </div>
                )}
                
                {success && (
                    <div className="p-4 mb-6 text-green-700 bg-green-100 rounded-md dark:bg-green-800/20 dark:text-green-300" role="alert">
                        {success}
                    </div>
                )}
                
                {/* AI Program Builder Assistant - Only show when not creating or editing a template */}
                {!isCreating && !selectedTemplate && (
                    <div className="mb-6">
                        <ProgramBuilderAI 
                            onProgramCreated={(programId) => {
                                // Fetch templates to update the list with the new program
                                fetchTemplates();
                                
                                // Show success message
                                setSuccess(`AI-generated program ${programId} created successfully!`);
                                // Clear success message after 3 seconds
                                setTimeout(() => setSuccess(null), 3000);
                            }} 
                        />
                    </div>
                )}
                
                {/* Conditional render based on state */}
                {isCreating || selectedTemplate ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4 dark:text-white">
                            {isCreating ? 'Create New Template' : 'Edit Template'}
                        </h2>
                        
                        <FormProvider {...methods}>
                            <form onSubmit={handleSubmit(handleSaveTemplate)} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <FormInput
                                            name="name"
                                            label="Template Name"
                                            required={true}
                                            placeholder="e.g., 12-Week Hypertrophy"
                                        />
                                    </div>
                                    <div>
                                        <FormInput
                                            name="weeks"
                                            label="Duration (weeks)"
                                            required={true}
                                            type="number"
                                            min="1"
                                            max="52"
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <FormSelect
                                            name="phase"
                                            label="Training Phase"
                                            required={true}
                                            options={TRAINING_PHASE_OPTIONS}
                                            placeholder="Select a training phase"
                                        />
                                    </div>
                                    <div>
                                        <FormSelect
                                            name="fitness_level"
                                            label="Fitness Level"
                                            required={true}
                                            options={FITNESS_LEVEL_OPTIONS}
                                            placeholder="Select a fitness level"
                                        />
                                    </div>
                                </div>
                                
                                <div className="mb-4 mt-4">
                                    <label htmlFor="description" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Template Notes
                                    </label>
                                    <textarea
                                        id="description"
                                        {...register('description')}
                                        rows={3}
                                        className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Add programming guidance, variations, progression ideas, etc."
                                    ></textarea>
                                </div>
                                
                                <div className="mb-4">
                                    <div className="flex items-center">
                                        <input
                                            id="is_public"
                                            {...register('is_public')}
                                            type="checkbox"
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="is_public" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                            Make this program public
                                        </label>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Public programs are visible to all athletes. Private programs are only visible to athletes you assign them to.
                                    </p>
                                </div>
                                
                                <div className="flex justify-end space-x-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                    >
                                        Save Template
                                    </button>
                                </div>
                            </form>
                        </FormProvider>
                    </div>
                ) : isLoading ? (
                    <div className="text-center py-10">
                        <p className="text-gray-500 dark:text-gray-400">Loading templates...</p>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                        <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-4">No Templates Yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Create your first program template to get started.
                        </p>
                        <button
                            onClick={handleCreateNew}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            Create Template
                        </button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="relative w-64">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <FiSearch className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="pl-10 pr-4 py-2 w-full border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Search templates..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleCreateNew}
                                className="px-3 py-1.5 bg-indigo-600 text-sm text-white rounded-md hover:bg-indigo-700 flex items-center"
                            >
                                <FiPlus className="mr-1" /> New
                            </button>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phase</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fitness Level</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Weeks</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Visibility</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                    {filteredTemplates.map((template) => (
                                        <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-indigo-900/30">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <div className="font-medium">{template.name}</div>
                                                    {template.version && template.version > 1 && (
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            Version {template.version}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{template.phase || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{template.fitness_level || 'Intermediate'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{template.weeks}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(template.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    template.is_public 
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                                                }`}>
                                                    {template.is_public ? 'Public' : 'Private'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        onClick={() => toggleVisibility(template)}
                                                        className={`text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300`}
                                                        title={template.is_public ? "Make Private" : "Make Public"}
                                                    >
                                                        {template.is_public ? "Make Private" : "Make Public"}
                                                    </button>
                                                    
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent selecting the template
                                                            createNewProgramVersion(template.id);
                                                        }}
                                                        className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                        title="Create New Version"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        New Version
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => handleEdit(template)}
                                                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                    >
                                                        Edit
                                                    </button>
                                                    
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(template.id)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {selectedTemplate && !isCreating && (
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold dark:text-white">
                                Workouts for: {selectedTemplate.name}
                            </h2>
                            <button
                                onClick={handleAddWorkout}
                                className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 flex items-center"
                            >
                                <FiPlus className="mr-1" /> Add Workout
                            </button>
                        </div>
                        
                        {isLoadingWorkouts ? (
                            <div className="text-center py-10">
                                <p className="text-gray-500 dark:text-gray-400">Loading workouts...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                <div className="lg:col-span-3">
                                    {currentWorkouts.length === 0 && !selectedWorkout ? (
                                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                                            <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-4">No Workouts Yet</h3>
                                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                                Add your first workout to this program template.
                                            </p>
                                            <button
                                                onClick={handleAddWorkout}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                            >
                                                Add Workout
                                            </button>
                                        </div>
                                    ) : (
                                        editingWorkout ? (
                                            <WorkoutForm 
                                                workout={editingWorkout}
                                                onSave={handleSaveWorkout}
                                                onCancel={handleCloseWorkoutModal}
                                            />
                                        ) : selectedWorkout ? (
                                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div>
                                                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Program Builder</h1>
                                                        <p className="mt-1 text-gray-600 dark:text-gray-400">Create and manage workout programs for your athletes</p>
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        {!selectedTemplate && !isCreating && (
                                                            <button
                                                                onClick={handleCreateNew}
                                                                className="flex items-center px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                                                            >
                                                                <FiPlus className="mr-2" /> New Program
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                                                        {selectedWorkout.name} Details
                                                    </h3>
                                                    <button
                                                        onClick={() => setEditingWorkout(selectedWorkout)}
                                                        className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
                                                    >
                                                        Edit Workout
                                                    </button>
                                                </div>
                                                
                                                {selectedWorkout.description && (
                                                    <div className="mb-4">
                                                        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                                                        <p className="text-gray-600 dark:text-gray-400">{selectedWorkout.description}</p>
                                                    </div>
                                                )}
                                                
                                                <div className="mb-4">
                                                    <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">Exercises</h4>
                                                    {selectedWorkout.exercise_instances && selectedWorkout.exercise_instances.length > 0 ? (
                                                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                                            {selectedWorkout.exercise_instances.map((exercise, index) => (
                                                                <div key={exercise.id || index} className="py-3">
                                                                    <div className="flex justify-between">
                                                                        <div>
                                                                            {exercise.exercise_name && (
                                                                                <div className="font-medium text-gray-800 dark:text-white">
                                                                                    {index + 1}. {cleanExerciseName(exercise.exercise_name)}
                                                                                </div>
                                                                            )}
                                                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                                {exercise.sets || '-'} sets × {exercise.reps || '-'} reps
                                                                                {exercise.rest_period_seconds ? ` • ${Math.floor(exercise.rest_period_seconds / 60)}:${(exercise.rest_period_seconds % 60).toString().padStart(2, '0')} rest` : ''}
                                                                            </div>
                                                                            {exercise.notes && (
                                                                                <div className="text-sm italic text-gray-500 dark:text-gray-400 mt-1">
                                                                                    Note: {exercise.notes}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {exercise.set_type === 'superset' && (
                                                                            <div className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full">
                                                                                Superset
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-gray-500 dark:text-gray-400">No exercises added to this workout yet.</p>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                                                <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-4">Select a Workout</h3>
                                                <p className="text-gray-500 dark:text-gray-400 mb-6">
                                                    Choose a workout from the panel on the right or create a new one.
                                                </p>
                                                <button
                                                    onClick={handleAddWorkout}
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                                >
                                                    Add Workout
                                                </button>
                                            </div>
                                        )
                                    )}
                                </div>
                                
                                <div className="lg:col-span-1">
                                    <WorkoutArrangement 
                                        workouts={currentWorkouts}
                                        onSelectWorkout={selectWorkout}
                                        selectedWorkoutId={selectedWorkout?.id}
                                        onDuplicateWorkout={duplicateWorkout}
                                        onDeleteWorkout={deleteWorkout}
                                    />
                                </div>
                            </div>
                        )}
                        
                        {/* Add muscle visualizations at the bottom of the template page (for all workouts combined) */}
                        {showMuscleVisualizations && (
                            <div className="mt-12 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                                        Program Muscle Activation Analysis
                                    </h2>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={refreshMuscleData}
                                            disabled={isRefreshingMuscleData}
                                            className="flex items-center px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Refresh muscle data"
                                        >
                                            <FiRefreshCw className={`mr-1.5 ${isRefreshingMuscleData ? 'animate-spin' : ''}`} />
                                            {isRefreshingMuscleData ? 'Refreshing...' : 'Refresh'}
                                        </button>
                                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                            <FiInfo className="mr-1" />
                                            <span>Showing muscle groups targeted across all workouts in this program</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Add muscle heat map */}
                                <MuscleHeatMap 
                                    muscleData={muscleData}
                                    title="Muscle Activation Map"
                                />
                                
                                {/* Add muscle set breakdown */}
                                <MuscleSetBreakdown 
                                    muscleData={muscleData}
                                    title="Sets Per Muscle Group (Across All Workouts)"
                                    workouts={currentWorkouts}
                                />
                            </div>
                        )}
                    </div>
                )}
                
                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
                            <h3 className="text-lg font-semibold mb-4 dark:text-white">Confirm Deletion</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                Are you sure you want to delete this template? This will also delete all workouts and exercises associated with it.
                                This action cannot be undone.
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteTemplate(showDeleteConfirm)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Version Creation Confirmation Modal */}
                {showVersionConfirm && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
                            <h3 className="text-lg font-semibold mb-4 dark:text-white">Create New Version</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                This workout has been used by athletes and cannot be modified directly. 
                                Would you like to create a new version of the program instead?
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowVersionConfirm(null)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (showVersionConfirm) {
                                            createNewProgramVersion(showVersionConfirm);
                                            setShowVersionConfirm(null);
                                        }
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Create New Version
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DndProvider>
    );
};

export default ProgramBuilder; 