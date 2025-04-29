import React from 'react';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserProfileFull } from '../../types/profiles'; // Import shared type

interface UserEditFormProps {
    user: UserProfileFull;
    onSave: (data: Partial<UserProfileFull>) => Promise<void>;
    isSaving: boolean;
}

// Define Zod schema for validation
const userEditSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    role: z.string(),
    age: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(0, 'Age must be positive').max(120, 'Age cannot exceed 120').nullable().optional()
    ),
    weight_kg: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(0, 'Weight must be positive').nullable().optional()
    ),
    height_cm: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(0, 'Height must be positive').nullable().optional()
    ),
    body_fat_percentage: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(0, 'Body fat percentage must be positive').max(100, 'Body fat percentage cannot exceed 100%').nullable().optional()
    ),
    goal_target_weight_kg: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(0, 'Target weight must be positive').nullable().optional()
    ),
    goal_timeframe_weeks: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(0, 'Timeframe must be positive').nullable().optional()
    ),
    goal_physique_details: z.string().nullable().optional(),
    training_days_per_week: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(0, 'Training days must be positive').max(7, 'Training days cannot exceed 7').nullable().optional()
    ),
    training_current_program: z.string().nullable().optional(),
    training_equipment: z.string().nullable().optional(),
    nutrition_preferences: z.string().nullable().optional(),
    nutrition_allergies: z.string().nullable().optional(),
    lifestyle_sleep_hours: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(0, 'Sleep hours must be positive').max(24, 'Sleep hours cannot exceed 24').nullable().optional()
    ),
    supplements_meds: z.string().nullable().optional(),
});

type FormData = z.infer<typeof userEditSchema>;

const UserEditForm: React.FC<UserEditFormProps> = ({ user, onSave, isSaving }) => {
    const methods = useForm<FormData>({
        resolver: zodResolver(userEditSchema),
        defaultValues: {
            username: user.username || '',
            role: user.role || 'athlete',
            age: user.age || null,
            weight_kg: user.weight_kg || null,
            height_cm: user.height_cm || null,
            body_fat_percentage: user.body_fat_percentage || null,
            goal_target_weight_kg: user.goal_target_weight_kg || null,
            goal_timeframe_weeks: user.goal_timeframe_weeks || null,
            goal_physique_details: user.goal_physique_details || null,
            training_days_per_week: user.training_days_per_week || null,
            training_current_program: user.training_current_program || null,
            training_equipment: user.training_equipment || null,
            nutrition_preferences: user.nutrition_preferences || null,
            nutrition_allergies: user.nutrition_allergies || null,
            lifestyle_sleep_hours: user.lifestyle_sleep_hours || null,
            supplements_meds: user.supplements_meds || null,
        }
    });

    const { handleSubmit, register, formState: { errors } } = methods;

    const handleFormSubmit: SubmitHandler<FormData> = (data) => {
        onSave(data);
    };

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Athlete Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                        <input 
                            id="username"
                            {...register('username')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>}
                    </div>
                    
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                        <select 
                            id="role"
                            {...register('role')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="athlete">Athlete</option>
                            <option value="coach">Coach</option>
                        </select>
                        {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>}
                    </div>
                </div>
                
                <h3 className="text-md font-medium text-gray-800 dark:text-white mt-4 mb-2">Physical Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="age" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Age</label>
                        <input 
                            id="age"
                            type="number"
                            {...register('age')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.age && <p className="mt-1 text-sm text-red-600">{errors.age.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="weight_kg" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weight (kg)</label>
                        <input 
                            id="weight_kg"
                            type="number"
                            step="0.1"
                            {...register('weight_kg')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.weight_kg && <p className="mt-1 text-sm text-red-600">{errors.weight_kg.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="height_cm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Height (cm)</label>
                        <input 
                            id="height_cm"
                            type="number"
                            {...register('height_cm')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.height_cm && <p className="mt-1 text-sm text-red-600">{errors.height_cm.message}</p>}
                    </div>
                </div>
                
                <h3 className="text-md font-medium text-gray-800 dark:text-white mt-4 mb-2">Goals</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="goal_target_weight_kg" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Weight (kg)</label>
                        <input 
                            id="goal_target_weight_kg"
                            type="number"
                            step="0.1"
                            {...register('goal_target_weight_kg')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.goal_target_weight_kg && <p className="mt-1 text-sm text-red-600">{errors.goal_target_weight_kg.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="goal_timeframe_weeks" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Timeframe (weeks)</label>
                        <input 
                            id="goal_timeframe_weeks"
                            type="number"
                            {...register('goal_timeframe_weeks')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.goal_timeframe_weeks && <p className="mt-1 text-sm text-red-600">{errors.goal_timeframe_weeks.message}</p>}
                    </div>
                </div>
                
                <div>
                    <label htmlFor="goal_physique_details" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Details</label>
                    <textarea 
                        id="goal_physique_details"
                        {...register('goal_physique_details')}
                        rows={2}
                        className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
                
                <h3 className="text-md font-medium text-gray-800 dark:text-white mt-4 mb-2">Training</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="training_days_per_week" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Training Days Per Week</label>
                        <input 
                            id="training_days_per_week"
                            type="number"
                            min="0" 
                            max="7"
                            {...register('training_days_per_week')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.training_days_per_week && <p className="mt-1 text-sm text-red-600">{errors.training_days_per_week.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="training_current_program" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Program</label>
                        <input 
                            id="training_current_program"
                            {...register('training_current_program')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                </div>
                
                <div>
                    <label htmlFor="training_equipment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Available Equipment</label>
                    <textarea 
                        id="training_equipment"
                        {...register('training_equipment')}
                        rows={2}
                        className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
                
                <h3 className="text-md font-medium text-gray-800 dark:text-white mt-4 mb-2">Nutrition</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="nutrition_preferences" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dietary Preferences</label>
                        <textarea 
                            id="nutrition_preferences"
                            {...register('nutrition_preferences')}
                            rows={2}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <label htmlFor="nutrition_allergies" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allergies/Intolerances</label>
                        <textarea 
                            id="nutrition_allergies"
                            {...register('nutrition_allergies')}
                            rows={2}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                </div>
                
                <h3 className="text-md font-medium text-gray-800 dark:text-white mt-4 mb-2">Lifestyle</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="lifestyle_sleep_hours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Average Sleep (hours)</label>
                        <input 
                            id="lifestyle_sleep_hours"
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            {...register('lifestyle_sleep_hours')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.lifestyle_sleep_hours && <p className="mt-1 text-sm text-red-600">{errors.lifestyle_sleep_hours.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="supplements_meds" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplements/Medications</label>
                        <textarea 
                            id="supplements_meds"
                            {...register('supplements_meds')}
                            rows={2}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                    <button 
                        type="submit" 
                        disabled={isSaving} 
                        className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </FormProvider>
    );
};

export default UserEditForm; 