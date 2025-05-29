import React from 'react';
import FormInput from '../ui/FormInput';
import { useFormContext, Controller } from 'react-hook-form';
// Step 4 Component
const Step4_Nutrition: React.FC = () => {
    const { control, formState: { errors } } = useFormContext();
    return (
        <div className="space-y-4">
            <div className="mb-4">
                <label htmlFor="nutrition_tracking_method" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    How do you track nutrition? <span className="text-red-400">*</span>
                </label>
                <Controller
                    name="nutrition_tracking_method"
                    control={control}
                    render={({ field }) => (
                        <select
                            {...field}
                            className={`block w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white ${
                                errors.nutrition_tracking_method 
                                    ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20' 
                                    : 'border-gray-300 dark:border-gray-600'
                            }`}
                            autoFocus
                            required
                        >
                            <option value="">Select your tracking method</option>
                            <option value="MyFitnessPal">MyFitnessPal</option>
                            <option value="Other app">Other app</option>
                            <option value="Pen & paper">Pen & paper</option>
                            <option value="Don't track">Don't track</option>
                        </select>
                    )}
                />
                {errors.nutrition_tracking_method && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        Tracking method must be selected.
                    </p>
                )}
            </div>

            <div className="mb-4">
                <label htmlFor="nutrition_wakeup_time_of_day" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Typical Wakeup Time <span className="text-red-400">*</span>
                </label>
                <Controller
                    name="nutrition_wakeup_time_of_day"
                    control={control}
                    render={({ field }) => (
                        <select
                            id="nutrition_wakeup_time_of_day"
                            {...field}
                            className={`block w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white ${
                                errors.nutrition_wakeup_time_of_day 
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
                {errors.nutrition_wakeup_time_of_day && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        Wakeup time must be selected.
                    </p>
                )}
            </div>
            
            <div className="mb-4">
                <label htmlFor="nutrition_bed_time_of_day" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Typical Bed Time <span className="text-red-400">*</span>
                </label>
                <Controller
                    name="nutrition_bed_time_of_day"
                    control={control}
                    render={({ field }) => (
                        <select
                            id="nutrition_bed_time_of_day"
                            {...field}
                            className={`block w-full px-3 py-2 mt-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white ${
                                errors.nutrition_bed_time_of_day 
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
                {errors.nutrition_bed_time_of_day && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        Bed time must be selected.
                    </p>
                )}
            </div>

            <FormInput 
                name="nutrition_meal_patterns"
                label="Typical Meal Patterns"
                type="textarea" 
                placeholder="e.g., 3 meals + 2 snacks, Intermittent fasting 16/8, Eat every 3 hours..."
                required
            />
             <FormInput 
                name="nutrition_preferences"
                label="Dietary Preferences (optional)"
                type="textarea" 
                placeholder="e.g., Vegetarian, Vegan, Gluten-free, High protein, Likes spicy food..."
            />
             <FormInput 
                name="nutrition_allergies"
                label="Food Allergies / Intolerances (optional)"
                type="textarea" 
                placeholder="e.g., Peanuts, Dairy, Shellfish, None..."
            />
        </div>
    );
};

export default Step4_Nutrition; 