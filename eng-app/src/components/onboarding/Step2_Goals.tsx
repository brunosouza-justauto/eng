import React, { useEffect, useState } from 'react';
import { useFormContext, useWatch, Controller } from 'react-hook-form';
import FormInput from '../ui/FormInput';
import { OnboardingData } from './onboardingSchema';

// Step 2 Component
const Step2_Goals: React.FC = () => {
    const { register, setValue, control, formState: { errors } } = useFormContext<OnboardingData>();
    const [calculatedWeight, setCalculatedWeight] = useState<number | null>(null);
    
    // Watch for changes in relevant fields
    const goalType = useWatch({ control, name: 'goal_type' });
    const weightKg = useWatch({ control, name: 'weight_kg' });
    const bodyFatPercentage = useWatch({ control, name: 'body_fat_percentage' });
    const targetFatLossKg = useWatch({ control, name: 'goal_target_fat_loss_kg' });
    const targetMuscleGainKg = useWatch({ control, name: 'goal_target_muscle_gain_kg' });

    // Calculate target weight when dependencies change
    useEffect(() => {
        if (weightKg && goalType) {
            // Convert all values to numbers to ensure proper calculation
            const currentWeight = Number(weightKg);
            const fatLoss = Number(targetFatLossKg || 0);
            const muscleGain = Number(targetMuscleGainKg || 0);
            
            let targetWeight = currentWeight;
            
            if (goalType === 'fat_loss') {
                targetWeight = Math.max(0, currentWeight - fatLoss);
            } 
            else if (goalType === 'muscle_gain') {
                targetWeight = currentWeight + muscleGain;
            }
            else if (goalType === 'both') {
                targetWeight = currentWeight - fatLoss + muscleGain;
            }
            
            // Round to 1 decimal place for display
            targetWeight = Math.round(targetWeight * 10) / 10;
            
            // Set our local state for display
            setCalculatedWeight(targetWeight);
            
            // Still set the form value for submission
            setValue('goal_target_weight_kg', targetWeight, { shouldValidate: true });
        }

        console.log('goal_target_weight_kg', weightKg);

    }, [weightKg, goalType, targetFatLossKg, targetMuscleGainKg, setValue, control]);

    return (
        <div className="space-y-4">
            <div className="mb-4">
                <label htmlFor="goal_type" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Primary Goal <span className="text-red-400">*</span>
                </label>
                <Controller
                    name="goal_type"
                    control={control}
                    render={({ field }) => (
                        <select
                            id="goal_type"
                            {...field}
                            className={`block w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white ${
                                errors.goal_type 
                                    ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20' 
                                    : 'border-gray-300 dark:border-gray-600'
                            }`}
                            required
                            autoFocus
                        >
                            <option value="">Select Your Primary Goal</option>
                            <option value="fat_loss">Fat Loss</option>
                            <option value="muscle_gain">Muscle Gain</option>
                            <option value="both">Both (Recomposition)</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                    )}
                />
                
                {errors.goal_type && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        Primary goal must be selected.
                    </p>
                )}
            </div>
            
            {(goalType === 'fat_loss' || goalType === 'both') && (
                <FormInput 
                    name="goal_target_fat_loss_kg"
                    label="Target Fat Loss (kg)"
                    type="number" 
                    placeholder="e.g., 5" 
                    step="0.1"
                    required
                />
            )}
            
            {(goalType === 'muscle_gain' || goalType === 'both') && (
                <FormInput 
                    name="goal_target_muscle_gain_kg"
                    label="Target Muscle Gain (kg)"
                    type="number" 
                    placeholder="e.g., 3" 
                    step="0.1"
                    required
                />
            )}
            
            <FormInput 
                name="goal_timeframe_weeks"
                label="Desired Timeframe (weeks, optional)"
                type="number" 
                placeholder="e.g., 12"
                required
            />
            
            <div className="mb-4">
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Target Body Weight (kg, calculated) <span className="text-red-400">*</span>
                </label>
                <div className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm bg-gray-50 dark:bg-gray-800 dark:border-gray-600 text-gray-900 dark:text-gray-300">
                    {calculatedWeight !== null ? calculatedWeight : 'Calculated based on selections'}
                </div>

                {/* Hidden input to store the value for form submission */}
                <input 
                    type="hidden"
                    {...register("goal_target_weight_kg")}
                />
                
                {weightKg && goalType && calculatedWeight !== null && (
                    <div className="mt-2 p-3 text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded-md">
                        <p>
                            Target weight has been automatically calculated based on your current weight 
                            ({weightKg} kg) and your selected goal.
                        </p>
                        {bodyFatPercentage && goalType === 'fat_loss' && targetFatLossKg && (
                            <p className="mt-1">
                                With your current body fat of {bodyFatPercentage}%, losing {targetFatLossKg} kg 
                                of fat would result in approximately {Math.max(0, Number(bodyFatPercentage) - (Number(targetFatLossKg) / Number(weightKg) * 100)).toFixed(1)}% 
                                body fat at your target weight.
                            </p>
                        )}
                    </div>
                )}
            </div>
            
            <FormInput 
                name="goal_physique_details"
                label="Specific Physique Goals (optional)"
                type="textarea" 
                placeholder="Describe your physique goals (e.g., improve shoulder width, leaner midsection...)"
                required
            />
        </div>
    );
};

export default Step2_Goals; 