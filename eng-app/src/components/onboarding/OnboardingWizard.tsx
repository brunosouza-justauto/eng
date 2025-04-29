import React, { useState, FormEvent } from 'react';
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
        resolver: zodResolver(onboardingSchema) as any,
        mode: 'onBlur',
        defaultValues: { /* TODO: Consider fetching existing profile data if re-onboarding */ }
    });

    const { handleSubmit, trigger, getValues } = methods;

    const handleNext = async () => {
        const fieldsToValidate = stepFields[currentStep] || [];
        
        // Special handling for step 5 - skip validation of stress level field
        if (currentStep === 5) {
            // Skip the stress level field regardless of value
            // This will allow the user to proceed with an empty stress level field
            const filteredFields = fieldsToValidate.filter(field => field !== 'lifestyle_stress_level');
            const isValid = await trigger(filteredFields as (keyof OnboardingData)[]);
            
            // Step 5 is the last step, so don't try to go to the next step
            // Just update the form data
            if (isValid) {
                setFormData(prev => ({ ...prev, ...getValues() }));
            }
            return;
        }
        
        const isValid = await trigger(fieldsToValidate as (keyof OnboardingData)[]);

        if (isValid && currentStep < steps.length) {
            setFormData(prev => ({ ...prev, ...getValues() })); 
            setCurrentStep(prev => prev + 1);
        }
    };
    
    // Add a manual submit handler to prevent auto-submission
    const handleManualSubmit = async () => {
        // First validate all fields in this step except stress level
        const fieldsToValidate = stepFields[currentStep].filter(
            field => field !== 'lifestyle_stress_level'
        );
        
        const isValid = await trigger(fieldsToValidate as (keyof OnboardingData)[]);
        
        if (isValid) {
            // Update form data with current values
            const currentValues = getValues();
            setFormData(prev => ({ ...prev, ...currentValues }));
            
            // Then manually call handleSubmit with our onSubmit function
            handleSubmit(onSubmit as any)();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
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

        try {
            // First, check if there's an existing placeholder profile with this email
            // This would be the case if a coach invited this athlete
            const { data: existingProfile, error: lookupError } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', user.email)
                .is('user_id', null)
                .single();
            
            if (lookupError && lookupError.code !== 'PGRST116') { // PGRST116 is "not found" which is OK
                console.warn("Error checking for existing profile:", lookupError);
            }
            
            let updateResult;
            
            if (existingProfile) {
                // Found a placeholder profile - update it with the user data and onboarding info
                console.log('Found existing placeholder profile:', existingProfile.id);
                
                updateResult = await supabase
                    .from('profiles')
                    .update({
                        ...finalData,
                        user_id: user.id,
                        onboarding_complete: true,
                        invitation_status: 'accepted'
                    })
                    .eq('id', existingProfile.id);
            } else {
                // No placeholder profile found - do regular update by user_id
                updateResult = await supabase
                    .from('profiles')
                    .update({ 
                        ...finalData, 
                        onboarding_complete: true
                    })
                    .eq('user_id', user.id);
            }
            
            if (updateResult.error) {
                throw updateResult.error;
            }

            // Manually update Redux profile state
            if (currentProfile) { 
                dispatch(setProfile({ 
                    ...currentProfile, // Keep existing profile data
                    onboarding_complete: true // Just update the flag
                }));
            } else {
                // If profile wasn't loaded, we can't reliably update it.
                // Fetching it again might be better after redirect, but log a warning.
                console.warn("Profile was null in Redux state, cannot update onboarding status locally.");
            }
            
            console.log('Onboarding profile update complete. Redirecting...');
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
            <div className="max-w-2xl p-6 mx-auto">
                <div className="p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                    <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white">
                        Step {currentStep}: {steps[currentStep - 1]?.name}
                    </h2>
                    
                    {/* Use onSubmit={e => e.preventDefault()} to prevent auto-submission */}
                    <form onSubmit={(e: FormEvent) => { e.preventDefault(); }}>
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
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                            >
                                Previous
                            </button>

                            {currentStep < steps.length ? (
                                <button 
                                    type="button" 
                                    onClick={handleNext}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                                >
                                    Next
                                </button>
                            ) : (
                                <button 
                                    type="button" // Changed from "submit" to "button"
                                    onClick={handleManualSubmit}
                                    disabled={isSubmitting} // Disable while submitting
                                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving...' : 'Complete Onboarding'}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </FormProvider>
    );
};

export default OnboardingWizard; 