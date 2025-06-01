import React, { useState, FormEvent, useEffect } from 'react';
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
    1: ['first_name', 'last_name', 'age', 'weight_kg', 'height_cm', 'body_fat_percentage', 'gender'],
    2: ['goal_type', 'goal_target_fat_loss_kg', 'goal_timeframe_weeks', 'goal_target_weight_kg', 'goal_physique_details'],
    3: ['experience_level', 'training_days_per_week', 'training_current_program', 'training_equipment', 'training_time_of_day', 'training_session_length_minutes', 'training_intensity'],
    4: ['nutrition_meal_patterns', 'nutrition_tracking_method', 'nutrition_wakeup_time_of_day', 'nutrition_bed_time_of_day', 'nutrition_preferences', 'nutrition_allergies'],
    5: ['lifestyle_sleep_hours', 'lifestyle_stress_level', 'lifestyle_water_intake_liters', 'lifestyle_schedule_notes', 'supplements_meds', 'motivation_readiness']
};
// -----------------------------------------------

const OnboardingWizard: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    const navigate = useNavigate(); // Hook for navigation
    const user = useSelector(selectUser);
    const currentProfile = useSelector(selectProfile); // Get current profile
    const dispatch = useDispatch(); // Get dispatch function

    // Initialize form with current profile data if available
    const methods = useForm<OnboardingData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(onboardingSchema) as any,
        mode: 'onBlur',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        defaultValues: currentProfile as any || {}
    });

    const { handleSubmit, trigger, reset, getValues, setError } = methods;

    // Fetch existing profile data when component mounts
    useEffect(() => {
        const fetchProfileData = async () => {
            if (!user?.id) {
                setIsLoadingProfile(false);
                return;
            }

            try {
                const { data: profileData, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (error) throw error;
                
                // Set the form data with existing profile values
                if (profileData) {
                    // Reset the form with existing data
                    reset(profileData);
                }
            } catch (error) {
                console.error('Error fetching profile data:', error);
            } finally {
                setIsLoadingProfile(false);
            }
        };

        fetchProfileData();
    }, [user?.id, reset]);

    const handleNext = async () => {
        const fieldsToValidate = stepFields[currentStep] || [];
        
        // Special handling for step 5 - skip validation of stress level field
        if (currentStep === 2) {
            // Validate based on goal type
            const fieldsToCheck = [...fieldsToValidate];
            
            // Run the validation
            const isValid = await trigger(fieldsToCheck as (keyof OnboardingData)[]);

            const formValues = getValues();
            
            if (!formValues.goal_type) {
                // Trigger validation just on goal_type
                setError('goal_type', {
                    type: 'required',
                    message: 'Please select a goal type'
                });
                return;
            }
            
            if (formValues.goal_type === 'fat_loss') {
                // Check if the target fat loss field is filled
                if (!formValues.goal_target_fat_loss_kg) {
                    setError('goal_target_fat_loss_kg', {
                        type: 'required',
                        message: 'Target fat loss is required for this goal type'
                    });
                    return;
                }
            } else if (formValues.goal_type === 'muscle_gain') {
                // Check if the target muscle gain field is filled
                if (!formValues.goal_target_muscle_gain_kg) {
                    setError('goal_target_muscle_gain_kg', {
                        type: 'required',
                        message: 'Target muscle gain is required for this goal type'
                    });
                    return;
                }
            } else if (formValues.goal_type === 'both') {
                // Check if both fields are filled
                let hasError = false;
                
                if (!formValues.goal_target_fat_loss_kg) {
                    setError('goal_target_fat_loss_kg', {
                        type: 'required',
                        message: 'Target fat loss is required for this goal type'
                    });
                    hasError = true;
                }
                
                if (!formValues.goal_target_muscle_gain_kg) {
                    setError('goal_target_muscle_gain_kg', {
                        type: 'required',
                        message: 'Target muscle gain is required for this goal type'
                    });
                    hasError = true;
                }
                
                if (hasError) {
                    return;
                }
            }

            if (!isValid) {
                return;
            }
        } else if (currentStep === 5) {
            // Skip the stress level field regardless of value
            // This will allow the user to proceed with an empty stress level field
            const filteredFields = fieldsToValidate.filter(field => field !== 'lifestyle_stress_level');
            const isValid = await trigger(filteredFields as (keyof OnboardingData)[]);
            
            // Step 5 is the last step, so don't try to go to the next step
            // Just update the form data
            if (!isValid) {
                return;
            }
            return;
        }
        
        const isValid = await trigger(fieldsToValidate as (keyof OnboardingData)[]);

        if (isValid && currentStep < steps.length) {
            // Just proceed to next step
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
            // Then manually call handleSubmit with our onSubmit function
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            handleSubmit(onSubmit as any)();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const onSubmit = async (data: OnboardingData) => {
        if (!user?.id) {
            setSubmitError('User not authenticated. Please sign in again.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            // Generate a username from first and last name
            const firstname = data.first_name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const lastname = data.last_name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const username = `${firstname}.${lastname}`;

            // Data to be saved to the profile
            const profileUpdate = {
                ...data,
                username, // Set the generated username
                onboarding_complete: true
            };

            // Save the data to the profile
            const { error } = await supabase
                .from('profiles')
                .update(profileUpdate)
                .eq('user_id', user.id);

            if (error) throw error;

            // Update the Redux state with the updated profile
            // First fetch the complete updated profile
            const { data: updatedProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (fetchError) throw fetchError;

            // Update Redux state
            if (updatedProfile) {
                dispatch(setProfile(updatedProfile));
            }

            // Redirect to the dashboard
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
                        Step {currentStep} / {steps.length} - {steps[currentStep - 1]?.name}
                    </h2>
                    
                    {isLoadingProfile ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : (
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
                    )}
                </div>
            </div>
        </FormProvider>
    );
};

export default OnboardingWizard; 