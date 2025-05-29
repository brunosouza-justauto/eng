import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../services/supabaseClient';
import { FiUser, FiInfo, FiClipboard, FiCode } from 'react-icons/fi';
import { getMealPlanPrompts } from '../../services/openRouterService';
import { nutritionCalculator } from '../../pages/admin/BMRCalculatorPage';

export interface AthleteProfile {
  user_id: string;
  username: string;
  email: string;
  role: string;
  coach_id: string;
  age: number;
  weight_kg: number;
  height_cm: number;
  body_fat_percentage: number;
  goal_type: string;
  goal_target_fat_loss_kg: number | null;
  goal_target_muscle_gain_kg: number | null;
  goal_timeframe_weeks: number;
  goal_target_weight_kg: number;
  goal_physique_details: string;
  experience_level: string;
  training_time_of_day: string;
  training_days_per_week: number;
  training_current_program: string;
  training_equipment: string;
  training_session_length_minutes: number;
  training_intensity: string;
  nutrition_wakeup_time_of_day: string;
  nutrition_bed_time_of_day: string;
  nutrition_meal_patterns: string;
  nutrition_tracking_method: string;
  nutrition_preferences: string;
  nutrition_allergies: string;
  lifestyle_sleep_hours: number;
  lifestyle_stress_level: number;
  lifestyle_water_intake_liters: number;
  lifestyle_schedule_notes: string;
  supplements_meds: string;
  motivation_readiness: string;
  onboarding_complete: boolean;
  invitation_status: string;
  invited_at: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  gender: string;
  calories_target: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
  step_goal: number;
  meals_per_day: number;
  activity_level: string;
  protein_multiplier: number;
  fat_multiplier: number;
  carb_multiplier: number;
}

interface AthleteDataFormProps {
  onSubmit: (data: AthleteProfile) => void;
  isSubmitting: boolean;
}

/**
 * Form component for selecting an athlete and entering meal plan parameters
 */
const AthleteDataForm: React.FC<AthleteDataFormProps> = ({ onSubmit, isSubmitting }) => {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteProfile | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const [jsonInputOpen, setJsonInputOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  
  const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = useForm<AthleteProfile>({
    defaultValues: {
      user_id: '',
    }
  });

  const selectedAthleteId = watch('user_id');

  // Fetch athletes
  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'athlete');
        
        if (fetchError) throw fetchError;
        
        setAthletes(data || []);
      } catch (err) {
        console.error('Error fetching athletes:', err);
        setError('Failed to load athletes');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAthletes();
  }, []);

  // Update form values when athlete is selected
  useEffect(() => {
    if (selectedAthleteId) {
      const athlete = athletes.find(a => a.user_id === selectedAthleteId);
      if (athlete) {
        setSelectedAthlete(athlete);
        
        setValue('gender', athlete.gender || 'male');
        setValue('age', athlete.age || 30);
        setValue('weight_kg', athlete.weight_kg || 80);
        setValue('height_cm', athlete.height_cm || 180);
        setValue('body_fat_percentage', athlete.body_fat_percentage || 20);
       
        // Set goal based on goal_type
        let goalText = '';
        switch(athlete.goal_type) {
          case 'fat_loss':
            goalText = 'Loose fat and get more defined.';
            break;
          case 'muscle_gain':
            goalText = 'Gain muscle mass and strength.';
            break;
          case 'both':
            goalText = 'Loose fat, gain muscle and improve definition.';
            break;
          case 'maintenance':
            goalText = 'Maintain current physique and improve performance.';
            break;
          default:
            goalText = 'Improve overall fitness and body composition.';
        }
        setValue('goal_physique_details', goalText);
        setValue('goal_type', athlete.goal_type || 'maintenance');
        
        setValue('goal_target_fat_loss_kg', athlete.goal_target_fat_loss_kg || null);
        setValue('goal_target_muscle_gain_kg', athlete.goal_target_muscle_gain_kg || null);        
        
        // Training fields
        setValue('experience_level', athlete.experience_level || 'intermediate');
        setValue('training_days_per_week', athlete.training_days_per_week || 3);
        setValue('training_current_program', athlete.training_current_program || 'full body');
        setValue('training_session_length_minutes', athlete.training_session_length_minutes ? athlete.training_session_length_minutes : 60);
        setValue('training_equipment', athlete.training_equipment || '');
        setValue('training_time_of_day', athlete.training_time_of_day || '');
        
        // Nutrition fields
        setValue('nutrition_tracking_method', athlete.nutrition_tracking_method || '');
        setValue('nutrition_wakeup_time_of_day', athlete.nutrition_wakeup_time_of_day || '');
        setValue('nutrition_bed_time_of_day', athlete.nutrition_bed_time_of_day || '');
        setValue('nutrition_preferences', athlete.nutrition_preferences || 'High protein, balanced diet.');
        setValue('nutrition_allergies', athlete.nutrition_allergies || '');
        setValue('nutrition_meal_patterns', athlete.nutrition_meal_patterns || '3 meals per day');

        let activityLevel = '1.2';

        if (athlete.training_days_per_week === 1) {
          setValue('activity_level', '1.2');
          activityLevel = '1.2';
        } else if (athlete.training_days_per_week === 2) {
          setValue('activity_level', '1.375');
          activityLevel = '1.375';
        } else if (athlete.training_days_per_week === 3) {
          setValue('activity_level', '1.725');
          activityLevel = '1.725';
        } else if (athlete.training_days_per_week === 4) {
          setValue('activity_level', '1.725');
          activityLevel = '1.725';
        } else if (athlete.training_days_per_week === 5) {
          setValue('activity_level', '1.9');
          activityLevel = '1.9';
        } else if (athlete.training_days_per_week === 6) {
          setValue('activity_level', '1.9');
          activityLevel = '1.9';
        } else if (athlete.training_days_per_week === 7) {
          setValue('activity_level', '1.9');
          activityLevel = '1.9';
        }

        let proteinMultiplier = 2;
        let fatMultiplier = 1;

        if (athlete.goal_type === 'fat_loss') {
          setValue('protein_multiplier', 2.4);
          setValue('fat_multiplier', 0.4);
          proteinMultiplier = 2.4;
          fatMultiplier = 0.4;
        } else if (athlete.goal_type === 'muscle_gain') {
          setValue('protein_multiplier', 2);
          setValue('fat_multiplier', 1);
          proteinMultiplier = 2;
          fatMultiplier = 1;
        } else if (athlete.goal_type === 'maintenance') {
          setValue('protein_multiplier', 1.8);
          setValue('fat_multiplier', 0.7);
          proteinMultiplier = 1.8;
          fatMultiplier = 0.7;
        } else {
          setValue('protein_multiplier', 2);
          setValue('fat_multiplier', 1);
          proteinMultiplier = 2;
          fatMultiplier = 1;
        }

        setValue('step_goal', athlete.step_goal || 10000);
        setValue('meals_per_day', athlete.meals_per_day || 4);
        setValue('supplements_meds', athlete.supplements_meds || '');
        setValue('first_name', athlete.first_name || '');
        setValue('last_name', athlete.last_name || '');
        setValue('gender', athlete.gender || '');
               
        // Macros distribution (approximate)
        const nutritionCalculatorResult = nutritionCalculator(athlete.height_cm, athlete.weight_kg, athlete.age, athlete.gender, activityLevel, proteinMultiplier, fatMultiplier, athlete.goal_type);
      
        setValue('calories_target', nutritionCalculatorResult.tdee);
        setValue('protein_target', Math.round(nutritionCalculatorResult.protein_grams));
        setValue('carbs_target', Math.round(nutritionCalculatorResult.carb_grams));
        setValue('fat_target', Math.round(nutritionCalculatorResult.fat_grams));

        setValue('carb_multiplier', Math.round((nutritionCalculatorResult.carb_grams / parseFloat(athlete.weight_kg.toString())) * 100 + Number.EPSILON) / 100);
      }
    }
  }, [selectedAthleteId, athletes, setValue]);

  const generatePrompt = async () => {
    if (!selectedAthlete) return;
    
    try {
      // Get form values
      const formData = getValues();
      setError(null);
      setIsGeneratingPrompt(true);
      
      const { systemPrompt, userPrompt } = getMealPlanPrompts({ athleteData: formData });
      const fullPrompt = JSON.stringify({ systemPrompt, userPrompt }, null, 2);
      
      navigator.clipboard.writeText(fullPrompt)
        .then(() => {
          setPromptCopied(true);
          setTimeout(() => setPromptCopied(false), 3000);
        })
        .catch(err => {
          console.error('Failed to copy prompt:', err);
          setError('Failed to copy prompt to clipboard');
        });
      
      // Open JSON input area
      setJsonInputOpen(true);
      setIsGeneratingPrompt(false);
    } catch (err) {
      console.error('Error generating prompt:', err);
      setError('Failed to generate prompt');
      setIsGeneratingPrompt(false);
    }
  };

  const handleJsonInput = () => {
    if (!jsonInput.trim()) {
      setJsonError('Please paste a valid JSON response');
      return;
    }
    
    try {
      const parsedJson = JSON.parse(jsonInput);
      // Process the JSON response as if it came from the API
      onSubmit({
        ...selectedAthlete!,
        _jsonInput: parsedJson // This will be handled by the parent component
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setJsonError('Invalid JSON format. Please check and try again.');
    }
  };

  const handleFormSubmit = (data: AthleteProfile) => {
    onSubmit(data);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
        Athlete Information for Meal Plan
      </h3>
      
      {error && (
        <div className="p-3 mb-4 text-red-700 bg-red-100 rounded-md dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Select Athlete
          </label>
          <select
            {...register('user_id')}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            disabled={loading || isSubmitting}
          >
            <option value="">-- Select an athlete --</option>
            {athletes.map((athlete) => (
              <option key={athlete.user_id} value={athlete.user_id}>
                {athlete.first_name} {athlete.last_name}
              </option>
            ))}
          </select>
        </div>
        
        {selectedAthlete && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gender
                </label>
                <select
                  {...register('gender')}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  {...register('age', { min: 1, max: 100 })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.age && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Age must be between 1 and 100
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('weight_kg', { min: 0, max: 999 })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.weight_kg && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Weight must be between 1 and 999 kg
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  {...register('height_cm', { min: 1, max: 999 })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.height_cm && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Height must be between 1 and 999 cm
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Body Fat (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('body_fat_percentage', { min: 1, max: 100 })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.body_fat_percentage && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Body fat must be between 1% and 100%
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Goal Type
                </label>
                <select
                  {...register('goal_type', { required: true })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                >
                  <option value="">-- Select goal type --</option>
                  <option value="fat_loss">Fat Loss</option>
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="both">Both</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                {errors.goal_type && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Goal type is required
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Goal
                </label>
                <input
                  type="text"
                  {...register('goal_physique_details', { required: true })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.goal_physique_details && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Goal is required
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Fat Loss (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('goal_target_fat_loss_kg')}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Muscle Gain (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('goal_target_muscle_gain_kg')}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Experience Level
                </label>
                <select
                  {...register('experience_level')}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                >
                  <option value="">-- Select experience level --</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                {errors.experience_level && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Experience level is required
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Training Time of Day
                </label>
                <select
                  {...register('training_time_of_day')}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                >
                  <option value="">-- Select time --</option>
                  {['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', 
                    '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', 
                    '20:00', '21:00', '22:00', '23:00'].map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                {errors.training_time_of_day && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Training time is required
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Training Days per Week
                </label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  {...register('training_days_per_week', { min: 1, max: 7 })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.training_days_per_week && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Must be between 1 and 7 days
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Training Program
                </label>
                <input
                  type="text"
                  {...register('training_current_program', { required: true })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.training_current_program && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Training program is required
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Training Duration (minutes)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="999"
                  {...register('training_session_length_minutes', { min: 1, max: 999 })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.training_session_length_minutes && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Duration must be between 1 and 999 minutes
                  </p>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Available Equipment
              </label>
              <select
                {...register('training_equipment')}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isSubmitting}
              >
                <option value="">-- Select equipment --</option>
                <option value="Home gym">Home gym</option>
                <option value="Bodyweight only">Bodyweight only</option>
                <option value="Full Commercial gym">Full Commercial gym</option>
                <option value="Limited Commercial gym">Limited Commercial gym</option>
                <option value="Dumbbells and kettlebells only">Dumbbells and kettlebells only</option>
                <option value="Dumbbells and barbell only">Dumbbells and barbell only</option>
                <option value="Dumbbells, barbell and kettlebells only">Dumbbells, barbell and kettlebells only</option>
              </select>
              {errors.training_equipment && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  Equipment is required
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Activity Level
                </label>
                <select
                  {...register('activity_level', { required: true })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                >
                  <option value="">-- Select activity level --</option>
                  <option value="1.2">Sedentary: little or no exercise</option>
                  <option value="1.375">Exercise 1-3 times/week</option>
                  <option value="1.55">Exercise 4-5 times/week</option>
                  <option value="1.725">Daily exercise or intense exercise 3-4 times/week</option>
                  <option value="1.9">Intense exercise 6-7 times/week</option>
                  <option value="2.0">Very intense exercise daily, or physical job</option>
                </select>
                {errors.activity_level && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Activity level is required
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Protein Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('protein_multiplier', { required: true })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.protein_multiplier && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Protein multiplier is required
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fat Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('fat_multiplier', { required: true })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.fat_multiplier && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Fat multiplier is required
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Carb Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('carb_multiplier', { required: true })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.carb_multiplier && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Carb multiplier is required
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nutrition Tracking Method
                </label>
                <select
                  {...register('nutrition_tracking_method')}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                >
                  <option value="">-- Select tracking method --</option>
                  <option value="MyFitnessPal">MyFitnessPal</option>
                  <option value="Other app">Other app</option>
                  <option value="Pen & paper">Pen & paper</option>
                  <option value="Don't track">Don't track</option>
                </select>
                {errors.nutrition_tracking_method && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Tracking method is required
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nutrition Meal Patterns
                </label>
                <input
                  type="text"
                  {...register('nutrition_meal_patterns', { required: true })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.nutrition_meal_patterns && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Meal patterns are required
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Wake-up Time
                </label>
                <select
                  {...register('nutrition_wakeup_time_of_day')}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                >
                  <option value="">-- Select time --</option>
                  {['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', 
                    '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', 
                    '20:00', '21:00', '22:00', '23:00'].map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                {errors.nutrition_wakeup_time_of_day && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Wake-up time is required
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bedtime
                </label>
                <select
                  {...register('nutrition_bed_time_of_day')}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                >
                  <option value="">-- Select time --</option>
                  {['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', 
                    '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', 
                    '20:00', '21:00', '22:00', '23:00'].map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
                {errors.nutrition_bed_time_of_day && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Bedtime is required
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Daily Step Goal
                </label>
                <input
                  type="number"
                  step="1000"
                  min="5000"
                  max="20000"
                  {...register('step_goal', { min: 1000, max: 90000 })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.step_goal && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Step goal must be between 1,000 and 90,000
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Meals Per Day
                </label>
                <input
                  type="number"
                  min="3"
                  max="6"
                  {...register('meals_per_day', { min: 3, max: 6 })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.meals_per_day && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Meals per day must be between 3 and 6
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nutrition Allergies
                </label>
                <input
                  type="text"
                  {...register('nutrition_allergies')}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Supplements/Meds
                </label>
                <input
                  type="text"
                  {...register('supplements_meds')}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            <div className="p-3 mb-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-md">
              <div className="flex items-center mb-2">
                <FiInfo className="text-indigo-600 dark:text-indigo-400 mr-2" />
                <h4 className="font-medium text-gray-800 dark:text-white">Macro Nutrients</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Calories
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1200"
                    max="5000"
                    {...register('calories_target', { min: 1200, max: 5000 })}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={isSubmitting}
                  />
                  {errors.calories_target && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      Calories must be between 1,200 and 5,000
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="999"
                    {...register('protein_target', { min: 1, max: 999 })}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={isSubmitting}
                  />
                  {errors.protein_target && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      Protein must be between 1g and 999g
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="999"
                    {...register('carbs_target', { min: 1, max: 999 })}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={isSubmitting}
                  />
                  {errors.carbs_target && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      Carbs must be between 1g and 999g
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="999"
                    {...register('fat_target', { min: 1, max: 999 })}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={isSubmitting}
                  />
                  {errors.fat_target && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      Fat must be between 1g and 999g
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nutritional Preferences
              </label>
              <textarea
                rows={3}
                {...register('nutrition_preferences')}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="E.g., High protein, more meat, eggs, veggies, pasta."
                disabled={isSubmitting}
              />
            </div>
          </>
        )}
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center"
            onClick={generatePrompt}
            disabled={!selectedAthlete || isSubmitting || isGeneratingPrompt}
          >
            {isGeneratingPrompt ? (
              <>
                <svg className="w-4 h-4 mr-2 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Preparing Prompt...
              </>
            ) : (
              <>
                <FiClipboard className="mr-2" />
                {promptCopied ? 'Copied!' : 'Generate Prompt'}
              </>
            )}
          </button>
          
          <button
            type="submit"
            className={`px-4 py-2 ${
              isSubmitting 
                ? 'bg-indigo-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            } text-white rounded-md flex items-center`}
            disabled={isSubmitting || !selectedAthlete}
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 mr-2 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <FiUser className="mr-2" />
                Generate Meal Plan
              </>
            )}
          </button>
        </div>

        {/* JSON Input Area */}
        {jsonInputOpen && (
          <div className="mt-6 p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-md font-medium">Paste AI Response</h3>
              <button 
                type="button" 
                onClick={() => setJsonInputOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <span className="sr-only">Close</span>
                ✕
              </button>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Paste the JSON response from the external AI service below:
            </p>
            
            <textarea
              className="w-full h-48 p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white"
              placeholder="Paste the JSON response here..."
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
            
            {jsonError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{jsonError}</p>
            )}
            
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleJsonInput}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center"
                disabled={!jsonInput.trim()}
              >
                <FiCode className="mr-2" />
                Process JSON
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default AthleteDataForm;
