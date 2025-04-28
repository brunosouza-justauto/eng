import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { supabase } from '../../services/supabaseClient';
import { selectUser, selectProfile, setProfile } from '../../store/slices/authSlice';

// Import the actual schema and type
import { onboardingSchema, OnboardingData } from './onboardingSchema';

// Import actual step components
import Step1_Demographics from './Step1_Demographics';
import Step2_Goals from './Step2_Goals';
import Step3_Training from './Step3_Training';
import Step4_Nutrition from './Step4_Nutrition';
import Step5_Lifestyle from './Step5_Lifestyle';

const steps = [
    { id: 1, component: Step1_Demographics, name: 'Demographics' },
    { id: 2, component: Step2_Goals, name: 'Goals' },
    { id: 3, component: Step3_Training, name: 'Training Habits' },
    { id: 4, component: Step4_Nutrition, name: 'Nutrition Habits' },
    { id: 5, component: Step5_Lifestyle, name: 'Lifestyle & More' },
];

// --- Define fields associated with each step --- 
const stepFields: Record<number, (keyof OnboardingData)[]> = {
    1: ['age', 'weight_kg', 'height_cm', 'body_fat_percentage'],
    2: ['goal_target_fat_loss_kg', 'goal_timeframe_weeks', 'goal_target_weight_kg', 'goal_physique_details'],
    3: ['training_days_per_week', 'training_current_program', 'training_equipment', 'training_session_length_minutes', 'training_intensity'],
    4: ['nutrition_meal_patterns', 'nutrition_tracking_method', 'nutrition_preferences', 'nutrition_allergies'],
    5: ['lifestyle_sleep_hours', 'lifestyle_stress_level', 'lifestyle_water_intake_liters', 'lifestyle_schedule_notes', 'supplements_meds', 'motivation_readiness']
};
// -----------------------------------------------

const OnboardingWizard: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<Partial<OnboardingData>>({}); // Keep track of data across steps
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const navigate = useNavigate(); // Hook for navigation
    const user = useSelector(selectUser);
    const currentProfile = useSelector(selectProfile); // Get current profile
    const dispatch = useDispatch(); // Get dispatch function

    const methods = useForm<OnboardingData>({
        resolver: zodResolver(onboardingSchema),
        mode: 'onBlur',
        defaultValues: { /* TODO: Consider fetching existing profile data if re-onboarding */ }
    });

    const { handleSubmit, trigger, getValues } = methods;

    const handleNext = async () => {
        const fieldsToValidate = stepFields[currentStep] || [];
        const isValid = await trigger(fieldsToValidate as (keyof OnboardingData)[]);

        if (isValid && currentStep < steps.length) {
            // Revert to simpler state update, acknowledging potential type complexity
            // The final validation happens in onSubmit anyway.
            setFormData(prev => ({ ...prev, ...getValues() })); 
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            // Optionally save current step data before going back
            // setFormData(prev => ({ ...prev, ...getValues() })); 
            setCurrentStep(prev => prev - 1);
        }
    };

    const onSubmit = async (data: OnboardingData) => {
        if (!user) {
            setSubmitError('User not found. Please log in again.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        const finalData = { ...formData, ...data };
        console.log('Combined form data:', finalData);

        // Prepare data for Supabase update - *remove* manual updated_at
        const profileUpdateData = { 
            ...finalData, 
            onboarding_complete: true
            // updated_at is handled by DB trigger
         };
        console.log('Sending to Supabase:', profileUpdateData);

        try {
            // Only update, don't need to select back here if RLS is correct
            const { error } = await supabase
                .from('profiles')
                .update(profileUpdateData)
                .eq('user_id', user.id);
            
            // Log potential error only
            console.log('Supabase update response:', { error });

            if (error) {
                throw error;
            }

            // Manually update Redux profile state - *only* update needed fields
            if (currentProfile) { 
                dispatch(setProfile({ 
                    ...currentProfile, // Keep existing profile data
                    onboarding_complete: true // Just update the flag
                    // No need to merge the full profileUpdateData here
                }));
            } else {
                 // If profile wasn't loaded, we can't reliably update it.
                 // Fetching it again might be better after redirect, but log a warning.
                 console.warn("Profile was null in Redux state, cannot update onboarding status locally.");
            }
            
            console.log('Onboarding profile update simulated in Redux. Redirecting...');
            navigate('/dashboard'); 

        } catch (error: unknown) {
            console.error('Error updating profile:', error);
            let message = 'Failed to save onboarding data.';
            if (typeof error === 'object' && error !== null && 'message' in error) {
                message = (error as Error).message;
            }
            setSubmitError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const CurrentStepComponent = steps[currentStep - 1]?.component;

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Step {currentStep}: {steps[currentStep - 1]?.name}</h2>
                
                {/* Render the current step's component */}
                {CurrentStepComponent && <CurrentStepComponent />}
                
                {/* Submission Error Display */}
                {submitError && (
                    <p className="mt-4 text-sm text-center text-red-600 dark:text-red-400">Error: {submitError}</p>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                    <button 
                        type="button" 
                        onClick={handlePrevious} 
                        disabled={currentStep === 1}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                        Previous
                    </button>

                    {currentStep < steps.length ? (
                        <button 
                            type="button" 
                            onClick={handleNext}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                        >
                            Next
                        </button>
                    ) : (
                        <button 
                            type="submit"
                            disabled={isSubmitting} // Disable while submitting
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : 'Complete Onboarding'}
                        </button>
                    )}
                </div>
            </form>
        </FormProvider>
    );
};

export default OnboardingWizard; 