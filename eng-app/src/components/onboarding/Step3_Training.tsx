import React, { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import FormInput from '../ui/FormInput';
import { OnboardingData } from './onboardingSchema';

// Step 3 Component
const Step3_Training: React.FC = () => {
    const { control, setValue } = useFormContext<OnboardingData>();
    
    // Watch for changes in training days
    const trainingDays = useWatch({ control, name: 'training_days_per_week' });
    
    // Set session length to 0 when training days is 0
    useEffect(() => {
        if (trainingDays === 0) {
            setValue('training_session_length_minutes', 0, { shouldValidate: true });
        }
    }, [trainingDays, setValue]);

    return (
        <div className="space-y-4">
            <FormInput 
                name="training_days_per_week"
                label="Current Training Days per Week (0-7)"
                type="number" 
                placeholder="e.g., 4"
                min="0"
                max="7"
                autoFocus
            />
            
            {trainingDays !== 0 && (
                <>
                    <FormInput 
                        name="training_current_program"
                        label="Current Training Program (optional)"
                        type="textarea" 
                        placeholder="Briefly describe your current routine or program name (e.g., PPL, Starting Strength, Coach XYZ program...)"
                    />
                    <FormInput 
                        name="training_equipment"
                        label="Equipment Available (optional)"
                        type="textarea" 
                        placeholder="List main equipment (e.g., Full gym, Dumbbells only, Bodyweight only...)"
                    />
                    <FormInput 
                        name="training_session_length_minutes"
                        label="Typical Session Length (minutes)"
                        type="number" 
                        placeholder="e.g., 60"
                    />
                    <FormInput 
                        name="training_intensity"
                        label="Typical Training Intensity (optional)"
                        type="textarea" 
                        placeholder="Describe intensity (e.g., RPE 7-9, Train to failure, Moderate effort...)"
                    />
                </>
            )}
            
            {trainingDays === 0 && (
                <div className="p-4 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded-md">
                    <p className="font-medium">No Current Training</p>
                    <p className="mt-1">
                        You've indicated that you currently don't train. That's okay! We'll design a beginner-friendly 
                        program that will ease you into fitness.
                    </p>
                </div>
            )}
        </div>
    );
};

export default Step3_Training; 