import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { FiX, FiInfo } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { selectProfile, selectUser } from '../../store/slices/authSlice';

export const DAY_TYPES = [
  'Training Day',
  'Rest Day', 
  'Low Carb Day',
  'High Carb Day',
  'Moderate Carb Day',
  'Refeed Day',
  'Deload Day',
  'Competition Day',
  'Travel Day',
  'Custom Day'
] as const;

export type DayType = typeof DAY_TYPES[number];

export interface DayTypeFrequency {
  dayType: DayType;
  frequency: number;
}

// Interface for upcoming workouts
interface UpcomingWorkout {
  id: string;
  name: string;
  day_of_week: number;
  order_in_program: number;
  date: string;
  nutrition_day_type?: string;
}

interface DayTypeFrequencyDialogProps {
  planId: string;
  onSave: (frequencies: DayTypeFrequency[]) => void;
  onCancel: () => void;
  initialFrequencies?: DayTypeFrequency[];
}

const DayTypeFrequencyDialog: React.FC<DayTypeFrequencyDialogProps> = ({
  planId,
  onSave,
  onCancel,
  initialFrequencies = []
}) => {
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const [frequencies, setFrequencies] = useState<DayTypeFrequency[]>(initialFrequencies);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedFrequencies, setSuggestedFrequencies] = useState<Record<string, number>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load meal plan day types
  useEffect(() => {
    const fetchMealPlanDayTypes = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch unique day types from meals in this plan
        const { data, error } = await supabase
          .from('nutrition_plans')
          .select(`
            meals (
              day_type
            )
          `)
          .eq('id', planId)
          .single();
          
        if (error) throw error;
        
        if (data && data.meals) {
          // Extract unique day types
          const dayTypes = Array.from(new Set(
            data.meals
              .map(meal => meal.day_type)
              .filter(Boolean) as DayType[]
          ));
          
          // Initialize frequencies if empty
          if (frequencies.length === 0) {
            setFrequencies(
              dayTypes.map(dayType => ({ dayType, frequency: 0 }))
            );
          }
          
          // Analyze upcoming workouts for suggestions
          fetchUpcomingWorkouts();
        }
      } catch (err) {
        console.error('Error fetching meal plan day types:', err);
        setError('Failed to load meal plan day types');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMealPlanDayTypes();
  }, [planId, frequencies.length, profile.id, user.id]);

  // Fetch upcoming workouts to suggest frequencies
  const fetchUpcomingWorkouts = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select(`
          *,
          program_assignments:assigned_plans!athlete_id(
              id,
              program_template_id,
              nutrition_plan_id,
              start_date,
              assigned_at,
              program:program_templates!program_template_id(id, name, version),
              nutrition_plan:nutrition_plans!nutrition_plan_id(id, name)
          )
      `)
      .eq('id', profile.id)
      .single();

      if (profileError) throw profileError;

      if (profileData.program_assignments.length === 0) {
        throw new Error('No program assignments found');
      }

      let workoutPlanId = null;

      for (const assignment of profileData.program_assignments) {
        // Then check if this template is the one we want
        if (assignment.program_template_id !== null) {
          workoutPlanId = assignment.program_template_id;
        }
      }

      if (!workoutPlanId) {
        throw new Error('No workout plan ID found');
      }

      // Then fetch all workouts for this program
      const { data: workoutsData, error: workoutsError } = await supabase
      .from('workouts')
      .select('*')
      .eq('program_template_id', workoutPlanId)
      .order('day_of_week', { ascending: true })
      .order('order_in_program', { ascending: true });
      
      if (workoutsError) throw workoutsError;

      if (!workoutsData) {
        setSuggestedFrequencies({
          'Training Day': 4,
          'Rest Day': 3,
          'Low Carb Day': 0,
          'High Carb Day': 0,
        });
        return;
      }
      
      // Count nutrition day types
      const dayCounts: Record<string, number> = {
        'Training Day': 0,
        'Rest Day': 0,
        'Low Carb Day': 0,
        'High Carb Day': 0,
      };
      
      // Process the workouts
      workoutsData.forEach((workout: UpcomingWorkout) => {
        // Check if workout name has rest in it.
        if (workout.name.toLowerCase().includes('rest')) {
          dayCounts['Rest Day'] = (dayCounts['Rest Day'] || 0) + 1;
        } else if (workout.name.toLowerCase().includes('low carb')) {
          dayCounts['Low Carb Day'] = (dayCounts['Low Carb Day'] || 0) + 1;
        } else if (workout.name.toLowerCase().includes('high carb')) {
          dayCounts['High Carb Day'] = (dayCounts['High Carb Day'] || 0) + 1;
        } else {
          dayCounts['Training Day'] = (dayCounts['Training Day'] || 0) + 1;
        }
      });

      // count the number of days in the week
      const daysInWeek = 7;
      const totalDays = dayCounts['Training Day'] + dayCounts['Rest Day'] + dayCounts['Low Carb Day'] + dayCounts['High Carb Day'];
      const daysToAdd = daysInWeek - totalDays;

      if (daysToAdd > 0) { 
        dayCounts['Rest Day'] = dayCounts['Rest Day'] + daysToAdd;
      }
      
      // Set suggested frequencies - default to common pattern if no data
      setSuggestedFrequencies({
        'Training Day': dayCounts['Training Day'] || 0,
        'Rest Day': dayCounts['Rest Day'] || 0,
        'Low Carb Day': dayCounts['Low Carb Day'] || 0,
        'High Carb Day': dayCounts['High Carb Day'] || 0,
      });
      
    } catch (err) {
      console.error('Error analyzing upcoming workouts:', err);
    }
  };

  // Handle frequency change
  const handleFrequencyChange = (dayType: DayType, value: number) => {
    // Ensure value is a non-negative integer
    const frequency = Math.max(0, Math.floor(Number(value)));
    
    setFrequencies(prev => 
      prev.map(item => 
        item.dayType === dayType ? { ...item, frequency } : item
      )
    );
  };

  // Apply suggested frequencies
  const applySuggestions = () => {
    setFrequencies(prev => 
      prev.map(item => ({
        ...item,
        frequency: suggestedFrequencies[item.dayType] || 0
      }))
    );
    setShowSuggestions(false);
  };

  // Save frequencies
  const handleSave = () => {
    // Only include day types with non-zero frequencies
    const nonZeroFrequencies = frequencies.filter(f => f.frequency > 0);
    onSave(nonZeroFrequencies);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          Set Day Type Frequencies
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FiX size={24} />
        </button>
      </div>
      
      <p className="text-gray-600 dark:text-gray-300 mb-2">
        How many days of each type do you need for this week?
      </p>
      
      {showSuggestions && Object.keys(suggestedFrequencies).length > 0 && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md flex items-start">
          <FiInfo className="text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Based on your upcoming workouts, we suggest:
            </p>
            <ul className="text-sm text-blue-600 dark:text-blue-400 mt-1 list-disc list-inside">
              {Object.entries(suggestedFrequencies)
                .filter(([, count]) => count > 0)
                .map(([dayType, count]) => (
                  <li key={dayType}>{dayType}: {count} days</li>
                ))
              }
            </ul>
            <button
              onClick={applySuggestions}
              className="mt-2 text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
            >
              Apply Suggestions
            </button>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 mb-4">{error}</div>
      ) : (
        <div className="space-y-3 mt-4 max-h-80 overflow-y-auto">
          {frequencies.map(({ dayType, frequency }) => (
            <div key={dayType} className="flex items-center justify-between">
              <label 
                htmlFor={`frequency-${dayType}`}
                className="text-gray-700 dark:text-gray-300 flex-grow"
              >
                {dayType}
              </label>
              <input
                id={`frequency-${dayType}`}
                type="number"
                min="0"
                value={frequency}
                onChange={(e) => handleFrequencyChange(dayType, parseInt(e.target.value))}
                className="ml-4 w-16 p-2 text-center border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          ))}
          
          {!showSuggestions && Object.keys(suggestedFrequencies).length > 0 && (
            <button
              onClick={() => setShowSuggestions(true)}
              className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 mt-2"
            >
              Show Suggestions
            </button>
          )}
        </div>
      )}
      
      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          disabled={isLoading}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default DayTypeFrequencyDialog; 