import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import FormInput from '../ui/FormInput';
import { OnboardingData } from './onboardingSchema';

// Step 3 Component
const Step3_Training: React.FC = () => {
    const { formState: { errors }, control } = useFormContext<OnboardingData>();   
    return (
        <div className="space-y-4">            
            <div className="mb-4">
                <label htmlFor="experience_level" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Experience Level <span className="text-red-400">*</span>
                </label>
                <Controller
                    name="experience_level"
                    control={control}
                    render={({ field }) => (
                        <select
                            id="experience_level"
                            {...field}
                            className={`block w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white ${
                                errors.experience_level 
                                    ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20' 
                                    : 'border-gray-300 dark:border-gray-600'
                            }`}
                            required
                            autoFocus
                        >
                            <option value="">Select your experience level</option>
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    )}
                />

                {errors.experience_level && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        Experience level must be selected.
                    </p>
                )}
            </div>
            <div className="mb-4">
                <label htmlFor="training_equipment" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Equipment Available <span className="text-red-400">*</span>
                </label>
                <Controller
                    name="training_equipment"
                    control={control}
                    render={({ field }) => (
                        <select
                            id="training_equipment"
                            {...field}
                            className={`block w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white ${
                                errors.training_equipment 
                                    ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20' 
                                    : 'border-gray-300 dark:border-gray-600'
                            }`}
                            required
                        >
                            <option value="">Select your equipment</option>
                            <option value="Home gym">Home gym</option>
                            <option value="Bodyweight only">Bodyweight only</option>
                            <option value="Full Commercial gym">Full Commercial gym</option>
                            <option value="Limited Commercial gym">Limited Commercial gym</option>
                            <option value="Dumbbells and kettlebells only">Dumbbells and kettlebells only</option>
                            <option value="Dumbbells and barbell only">Dumbbells and barbell only</option>
                            <option value="Dumbbells, barbell and kettlebells only">Dumbbells, barbell and kettlebells only</option>
                        </select>
                    )}
                />
                {errors.training_equipment && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.training_equipment.message as string}
                    </p>
                )}
            </div>

            <div className="mb-4">
                <label htmlFor="training_time_of_day" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Training Time of Day <span className="text-red-400">*</span>
                </label>
                <Controller
                    name="training_time_of_day"
                    control={control}
                    render={({ field }) => (
                        <select
                            id="training_time_of_day"
                            {...field}
                            className={`block w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white ${
                                errors.training_time_of_day 
                                    ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20' 
                                    : 'border-gray-300 dark:border-gray-600'
                            }`}
                            required
                        >
                            <option value="">Select your time of day</option>
                            <option value="00:00">00:00</option>
                            <option value="01:00">01:00</option>
                            <option value="02:00">02:00</option>
                            <option value="03:00">03:00</option>
                            <option value="04:00">04:00</option>
                            <option value="05:00">05:00</option>
                            <option value="06:00">06:00</option>
                            <option value="07:00">07:00</option>
                            <option value="08:00">08:00</option>
                            <option value="09:00">09:00</option>
                            <option value="10:00">10:00</option>
                            <option value="11:00">11:00</option>
                            <option value="12:00">12:00</option>
                            <option value="13:00">13:00</option>
                            <option value="14:00">14:00</option>
                            <option value="15:00">15:00</option>
                            <option value="16:00">16:00</option>
                            <option value="17:00">17:00</option>
                            <option value="18:00">18:00</option>
                            <option value="19:00">19:00</option>
                            <option value="20:00">20:00</option>
                            <option value="21:00">21:00</option>
                            <option value="22:00">22:00</option>
                            <option value="23:00">23:00</option>
                        </select>
                    )}
                />
                {errors.training_time_of_day && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {errors.training_time_of_day.message as string}
                    </p>
                )}
            </div>

            <FormInput 
                name="training_days_per_week"
                label="Training Days per Week (0-7)"
                type="number" 
                placeholder="How many days can you train per week?"
                min="0"
                max="7"
                required
            />
            <FormInput 
                name="training_current_program"
                label="Typical Training Program (optional)"
                type="textarea" 
                placeholder="Briefly describe your current routine or program name if you have one (e.g., PPL, Starting Strength, Coach XYZ program...)"
            />
            <FormInput 
                name="training_session_length_minutes"
                label="Typical Session Length in minutes if you train (optional)"
                type="number" 
                placeholder="e.g., 60"
            />
            <FormInput 
                name="training_intensity"
                label="Typical Training Intensity (optional)"
                type="textarea" 
                placeholder="Describe intensity (e.g., RPE 7-9, Train to failure, Moderate effort...)"
            />
        </div>
    );
};

export default Step3_Training; 