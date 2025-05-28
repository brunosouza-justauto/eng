import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '../../services/supabaseClient';
import { FiUser, FiInfo } from 'react-icons/fi';

interface AthleteProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  gender: string;
  age: number;
  weight_kg: number;
  height_cm: number;
  body_fat_percentage: number;
  goal_type: string;
  training_days_per_week: number;
  training_session_length_minutes: number;
}

interface ProgramBuilderFormProps {
  onSubmit: (data: AthleteFormData) => void;
  isSubmitting: boolean;
}

export interface AthleteFormData {
  athleteId: string;
  gender: string;
  age: number;
  weight: number;
  height: number;
  bodyFat: number;
  experience: string;
  goal: string;
  trainingDays: number;
  sessionDuration: number;
  preferences: string;
  targetMuscleGroups: string[];
  availableEquipment: string[];
  injuryConsiderations: string;
}

// Options for select dropdowns
const experienceLevelOptions = [
  { value: 'Beginner', label: 'Beginner' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Advanced', label: 'Advanced' }
];

const muscleGroupOptions = [
  { value: 'Chest', label: 'Chest' },
  { value: 'Back', label: 'Back' },
  { value: 'Shoulders', label: 'Shoulders' },
  { value: 'Arms', label: 'Arms' },
  { value: 'Legs', label: 'Legs' },
  { value: 'Glutes', label: 'Glutes' },
  { value: 'Core', label: 'Core' },
  { value: 'Neck', label: 'Neck' },
];

const equipmentOptions = [
  { value: 'All Commercial Equipments', label: 'All Commercial Equipments' },
  { value: 'Bodyweight Only', label: 'Bodyweight Only' },
  { value: 'Treadmill', label: 'Treadmill' },
  { value: 'Elliptical', label: 'Elliptical' },
  { value: 'Rowing Machine', label: 'Rowing Machine' },
  { value: 'Stationary Bike', label: 'Stationary Bike' },
  { value: 'Swimming Pool', label: 'Swimming Pool' },
  { value: 'Stair Climber', label: 'Stair Climber' },
  { value: 'Barbell', label: 'Barbell' },
  { value: 'Dumbbells', label: 'Dumbbells' },
  { value: 'Kettlebells', label: 'Kettlebells' },
  { value: 'Flat Bench', label: 'Flat Bench' },
  { value: 'Incline Bench', label: 'Incline Bench' },
  { value: 'Decline Bench', label: 'Decline Bench' },
  { value: 'Cable Machine', label: 'Cable Machine' },
  { value: 'Multi-Station Machines', label: 'Multi-Station Machines' },
  { value: 'Smith Machine', label: 'Smith Machine' },
  { value: 'Power Rack/Squat Rack', label: 'Power Rack/Squat Rack' },
  { value: 'Leg Press', label: 'Leg Press' },
  { value: 'Leg Extension', label: 'Leg Extension' },
  { value: 'Leg Curl', label: 'Leg Curl' },
  { value: 'Hip Thruster', label: 'Hip Thruster' },
  { value: 'Hip Adductor', label: 'Hip Adductor' },
  { value: 'Hip Abductor', label: 'Hip Abductor' },
  { value: 'Pullup Bar', label: 'Pullup Bar' },
  { value: 'Dip Station', label: 'Dip Station' },
  { value: 'Chest Fly', label: 'Chest Fly' },
  { value: 'Flat Bench Press', label: 'Flat Bench Press' },
  { value: 'Incline Bench Press', label: 'Incline Bench Press' },
  { value: 'Decline Bench Press', label: 'Decline Bench Press' },
  { value: 'Overhead Press', label: 'Overhead Press' },
  { value: 'Lateral Raises', label: 'Lateral Raises' },
  { value: 'Front Raises', label: 'Front Raises' },
  { value: 'Side Raises', label: 'Side Raises' },
  { value: 'Shoulder Press', label: 'Shoulder Press' },
  { value: 'Bicep Curls', label: 'Bicep Curls' },
  { value: 'Tricep Curls', label: 'Tricep Curls' },
  { value: 'Hammer Curls', label: 'Hammer Curls' },
  { value: 'Lat Pulldown', label: 'Lat Pulldown' },
  { value: 'Cable Row', label: 'Cable Row' },
  { value: 'Resistance Bands', label: 'Resistance Bands' },
  { value: 'Medicine Ball', label: 'Medicine Ball' },
  { value: 'Swiss Ball', label: 'Swiss Ball' },
  { value: 'Foam Roller', label: 'Foam Roller' },
  { value: 'GHD Machine', label: 'GHD Machine' },
];

/**
 * Form component for selecting an athlete and entering program parameters
 */
const ProgramBuilderForm: React.FC<ProgramBuilderFormProps> = ({ onSubmit, isSubmitting }) => {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteProfile | null>(null);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<AthleteFormData>({
    defaultValues: {
      athleteId: '',
      gender: 'male',
      age: 30,
      weight: 80,
      height: 180,
      bodyFat: 20,
      experience: 'Intermediate',
      goal: 'Build muscle and strength while maintaining good definition',
      trainingDays: 4,
      sessionDuration: 60,
      preferences: 'Compound movements, some isolation work, progressive overload',
      targetMuscleGroups: ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Core', 'Neck'],
      availableEquipment: ['All Commercial Equipments'],
      injuryConsiderations: 'None'
    }
  });

  const selectedAthleteId = watch('athleteId');

  // Fetch athletes
  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id, user_id, first_name, last_name, gender, age, weight_kg, height_cm, body_fat_percentage, goal_type, training_days_per_week, training_session_length_minutes')
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
      const athlete = athletes.find(a => a.id === selectedAthleteId);
      if (athlete) {
        setSelectedAthlete(athlete);
        
        setValue('gender', athlete.gender || 'male');
        setValue('age', athlete.age || 30);
        setValue('weight', athlete.weight_kg || 80);
        setValue('height', athlete.height_cm || 180);
        setValue('bodyFat', athlete.body_fat_percentage || 20);
        
        // Set goal based on goal_type
        let goalText = '';
        switch(athlete.goal_type) {
          case 'fat_loss':
            goalText = 'Lose fat while maintaining muscle mass';
            break;
          case 'muscle_gain':
            goalText = 'Build muscle and strength';
            break;
          case 'both':
            goalText = 'Build muscle and lose fat simultaneously';
            break;
          case 'maintenance':
            goalText = 'Maintain current physique and improve performance';
            break;
          default:
            goalText = 'Build muscle and strength while maintaining good definition';
        }
        setValue('goal', goalText);
        
        setValue('trainingDays', athlete.training_days_per_week || 4);
        setValue('sessionDuration', athlete.training_session_length_minutes || 60);
      }
    }
  }, [selectedAthleteId, athletes, setValue]);

  const handleFormSubmit = (data: AthleteFormData) => {
    onSubmit(data);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
        Athlete Information for Program Generation
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
            {...register('athleteId')}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            disabled={loading || isSubmitting}
          >
            <option value="">-- Select an athlete --</option>
            {athletes.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
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
                  {...register('age', { min: 18, max: 100 })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.age && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Age must be between 18 and 100
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
                  {...register('weight', { min: 40, max: 200 })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.weight && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Weight must be between 40 and 200 kg
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  {...register('height', { min: 140, max: 220 })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.height && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Height must be between 140 and 220 cm
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
                  {...register('bodyFat', { min: 5, max: 50 })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.bodyFat && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Body fat must be between 5% and 50%
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Experience Level
                </label>
                <select
                  {...register('experience', { required: true })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                >
                  <option value="">-- Select Experience Level --</option>
                  {experienceLevelOptions.map(option => (
                      <option key={option.value} value={option.value}>
                          {option.label}
                      </option>
                  ))}
                </select>
                {errors.experience && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Experience level is required
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Training Days per Week
                </label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  {...register('trainingDays', { min: 1, max: 7 })}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={isSubmitting}
                />
                {errors.trainingDays && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Must be between 1 and 7 days
                  </p>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Session Duration (minutes)
              </label>
              <input
                type="number"
                step="5"
                min="20"
                max="180"
                {...register('sessionDuration', { min: 20, max: 180 })}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isSubmitting}
              />
              {errors.sessionDuration && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  Duration must be between 20 and 180 minutes
                </p>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Training Goal
              </label>
              <input
                type="text"
                {...register('goal', { required: true })}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={isSubmitting}
              />
              {errors.goal && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  Goal is required
                </p>
              )}
            </div>
            
            <div className="p-3 mb-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-md">
              <div className="flex items-center mb-2">
                <FiInfo className="text-indigo-600 dark:text-indigo-400 mr-2" />
                <h4 className="font-medium text-gray-800 dark:text-white">Program Preferences</h4>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Muscle Groups
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {muscleGroupOptions.map((option) => (
                    <div key={option.value} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`muscle-${option.value}`}
                        value={option.value}
                        checked={watch('targetMuscleGroups')?.includes(option.value)}
                        onChange={(e) => {
                          const currentValues = watch('targetMuscleGroups') || [];
                          if (e.target.checked) {
                            setValue('targetMuscleGroups', [...currentValues, option.value]);
                          } else {
                            setValue('targetMuscleGroups', currentValues.filter(v => v !== option.value));
                          }
                        }}
                        disabled={isSubmitting}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                      <label htmlFor={`muscle-${option.value}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Available Equipment
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {equipmentOptions.map((option) => (
                    <div key={option.value} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`equipment-${option.value}`}
                        value={option.value}
                        checked={watch('availableEquipment')?.includes(option.value)}
                        onChange={(e) => {
                          const currentValues = watch('availableEquipment') || [];
                          if (e.target.checked) {
                            setValue('availableEquipment', [...currentValues, option.value]);
                          } else {
                            setValue('availableEquipment', currentValues.filter(v => v !== option.value));
                          }
                        }}
                        disabled={isSubmitting}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                      <label htmlFor={`equipment-${option.value}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Injury Considerations
                </label>
                <input
                  type="text"
                  {...register('injuryConsiderations')}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="E.g., shoulder impingement, knee pain, lower back issues"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Training Preferences
                </label>
                <textarea
                  rows={3}
                  {...register('preferences')}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="E.g., compound movements, supersets, circuit training, etc."
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            <div className="flex justify-end">
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
                    Generate Program
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default ProgramBuilderForm;
