import React, { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import FormInput from '../ui/FormInput';
import { OnboardingData } from './onboardingSchema';

// Step 2 Component
const Step2_Goals: React.FC = () => {
    const { register, setValue, control } = useFormContext<OnboardingData>();
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
    }, [weightKg, goalType, targetFatLossKg, targetMuscleGainKg, setValue]);

    return (
        <div className="space-y-4">
            <div className="mb-4">
                <label htmlFor="goal_type" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Primary Goal
                </label>
                <select
                    id="goal_type"
                    {...register("goal_type")}
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                    <option value="">Select Your Primary Goal</option>
                    <option value="fat_loss">Fat Loss</option>
                    <option value="muscle_gain">Muscle Gain</option>
                    <option value="both">Both (Recomposition)</option>
                    <option value="maintenance">Maintenance</option>
                </select>
            </div>
            
            {(goalType === 'fat_loss' || goalType === 'both') && (
                <FormInput 
                    name="goal_target_fat_loss_kg"
                    label="Target Fat Loss (kg)"
                    type="number" 
                    placeholder="e.g., 5" 
                    step="0.1"
                />
            )}
            
            {(goalType === 'muscle_gain' || goalType === 'both') && (
                <FormInput 
                    name="goal_target_muscle_gain_kg"
                    label="Target Muscle Gain (kg)"
                    type="number" 
                    placeholder="e.g., 3" 
                    step="0.1"
                />
            )}
            
            <FormInput 
                name="goal_timeframe_weeks"
                label="Desired Timeframe (weeks, optional)"
                type="number" 
                placeholder="e.g., 12"
            />
            
            <div className="mb-4">
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Target Body Weight (kg, calculated)
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
            />
        </div>
    );
};

export default Step2_Goals; 