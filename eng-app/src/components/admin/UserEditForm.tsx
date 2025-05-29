import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserProfileFull } from '../../types/profiles'; // Import shared type
import { Resolver } from 'react-hook-form';

interface UserEditFormProps {
    user: UserProfileFull;
    onSave: (data: Partial<UserProfileFull>) => Promise<void>;
    isSaving: boolean;
}

// User edit schema with validation
const userEditSchema = z.object({
    username: z.string().optional(),
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    role: z.enum(['athlete', 'coach']),
    // Physical details
    age: z.preprocess(
        // Convert empty string to null
        (val) => val === '' ? null : val,
        z.union([
            z.null(),
            z.coerce.number().int().positive().max(120)
        ])
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
    gender: z.string().min(1, 'Gender is required'),
    // Goals
    goal_type: z.enum(['fat_loss', 'muscle_gain', 'both', 'maintenance']).nullable().optional(),
    goal_target_fat_loss_kg: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(0, 'Target fat loss must be positive').nullable().optional()
    ),
    goal_target_muscle_gain_kg: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(0, 'Target muscle gain must be positive').nullable().optional()
    ),
    goal_timeframe_weeks: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(0, 'Timeframe must be positive').nullable().optional()
    ),
    goal_target_weight_kg: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(0, 'Target weight must be positive').nullable().optional()
    ),
    goal_physique_details: z.string().nullable().optional(),
    // Training
    experience_level: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
    training_days_per_week: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(3, 'Training days must be at least 3').max(7, 'Training days cannot exceed 7').nullable().optional()
    ),
    training_current_program: z.string().nullable().optional(),
    training_equipment: z.enum([
        'Home gym', 
        'Bodyweight only', 
        'Full Commercial gym', 
        'Limited Commercial gym', 
        'Dumbbells and kettlebells only', 
        'Dumbbells and barbell only', 
        'Dumbbells, barbell and kettlebells only'
    ]).nullable().optional(),
    training_time_of_day: z.enum([
        '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', 
        '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', 
        '20:00', '21:00', '22:00', '23:00'
    ]).nullable().optional(),
    training_session_length_minutes: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(0, 'Session length must be positive').nullable().optional()
    ),
    training_intensity: z.string().nullable().optional(),
    // Nutrition
    nutrition_meal_patterns: z.string().nullable().optional(),
    nutrition_tracking_method: z.enum(['MyFitnessPal', 'Other app', 'Pen & paper', 'Don\'t track']).nullable().optional(),
    nutrition_wakeup_time_of_day: z.enum([
        '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', 
        '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', 
        '20:00', '21:00', '22:00', '23:00'
    ]).nullable().optional(),
    nutrition_bed_time_of_day: z.enum([
        '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', 
        '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', 
        '20:00', '21:00', '22:00', '23:00'
    ]).nullable().optional(),
    nutrition_preferences: z.string().nullable().optional(),
    nutrition_allergies: z.string().nullable().optional(),
    // Lifestyle
    lifestyle_sleep_hours: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(0, 'Sleep hours must be positive').max(24, 'Sleep hours cannot exceed 24').nullable().optional()
    ),
    lifestyle_stress_level: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(1, 'Stress level must be between 1-10').max(10, 'Stress level must be between 1-10').nullable().optional()
    ),
    lifestyle_water_intake_liters: z.preprocess(
        (val) => (val === '' ? null : Number(val)),
        z.number().min(0.1, 'Water intake must be at least 0.1').max(99, 'Water intake cannot exceed 99').nullable().optional()
    ),
    lifestyle_schedule_notes: z.string().nullable().optional(),
    supplements_meds: z.string().nullable().optional(),
    motivation_readiness: z.string().nullable().optional(),
});

// Create a type for the form data from the schema
type EditFormValues = z.infer<typeof userEditSchema>;

const UserEditForm: React.FC<UserEditFormProps> = ({ user, onSave, isSaving }) => {
    const methods = useForm<EditFormValues>({
        resolver: zodResolver(userEditSchema) as unknown as Resolver<EditFormValues>,
        defaultValues: {
            username: user.username || '',
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            role: (user.role as 'athlete' | 'coach') || 'athlete',
            gender: user.gender || '',
            // Physical details
            age: user.age || null,
            weight_kg: user.weight_kg || null,
            height_cm: user.height_cm || null,
            body_fat_percentage: user.body_fat_percentage || null,
            // Goals
            goal_type: (user.goal_type as 'fat_loss' | 'muscle_gain' | 'both' | 'maintenance' | null) || null,
            goal_target_fat_loss_kg: user.goal_target_fat_loss_kg || null,
            goal_target_muscle_gain_kg: user.goal_target_muscle_gain_kg || null,
            goal_timeframe_weeks: user.goal_timeframe_weeks || null,
            goal_target_weight_kg: user.goal_target_weight_kg || null,
            goal_physique_details: user.goal_physique_details || null,
            // Training
            experience_level: (user.experience_level as 'beginner' | 'intermediate' | 'advanced' | null) || null,
            training_days_per_week: user.training_days_per_week || null,
            training_current_program: user.training_current_program || null,
            training_equipment: (user.training_equipment as 'Home gym' | 'Bodyweight only' | 'Full Commercial gym' | 'Limited Commercial gym' | 'Dumbbells and kettlebells only' | 'Dumbbells and barbell only' | 'Dumbbells, barbell and kettlebells only' | null) || null,
            training_time_of_day: (user.training_time_of_day as '00:00' | '01:00' | '02:00' | '03:00' | '04:00' | '05:00' | '06:00' | '07:00' | '08:00' | '09:00' | '10:00' | '11:00' | '12:00' | '13:00' | '14:00' | '15:00' | '16:00' | '17:00' | '18:00' | '19:00' | '20:00' | '21:00' | '22:00' | '23:00' | null) || null,
            training_session_length_minutes: user.training_session_length_minutes || null,
            training_intensity: user.training_intensity || null,
            // Nutrition
            nutrition_meal_patterns: user.nutrition_meal_patterns || null,
            nutrition_tracking_method: (user.nutrition_tracking_method as 'MyFitnessPal' | 'Other app' | 'Pen & paper' | 'Don\'t track' | null) || null,
            nutrition_wakeup_time_of_day: (user.nutrition_wakeup_time_of_day as '00:00' | '01:00' | '02:00' | '03:00' | '04:00' | '05:00' | '06:00' | '07:00' | '08:00' | '09:00' | '10:00' | '11:00' | '12:00' | '13:00' | '14:00' | '15:00' | '16:00' | '17:00' | '18:00' | '19:00' | '20:00' | '21:00' | '22:00' | '23:00' | null) || null,
            nutrition_bed_time_of_day: (user.nutrition_bed_time_of_day as '00:00' | '01:00' | '02:00' | '03:00' | '04:00' | '05:00' | '06:00' | '07:00' | '08:00' | '09:00' | '10:00' | '11:00' | '12:00' | '13:00' | '14:00' | '15:00' | '16:00' | '17:00' | '18:00' | '19:00' | '20:00' | '21:00' | '22:00' | '23:00' | null) || null,
            nutrition_preferences: user.nutrition_preferences || null,
            nutrition_allergies: user.nutrition_allergies || null,
            // Lifestyle
            lifestyle_sleep_hours: user.lifestyle_sleep_hours || null,
            lifestyle_stress_level: user.lifestyle_stress_level || null,
            lifestyle_water_intake_liters: user.lifestyle_water_intake_liters || null,
            lifestyle_schedule_notes: user.lifestyle_schedule_notes || null,
            supplements_meds: user.supplements_meds || null,
            motivation_readiness: user.motivation_readiness || null,
        }
    });

    const { handleSubmit, register, formState: { errors } } = methods;

    const handleFormSubmit = (data: EditFormValues) => {
        // Generate a username from first and last name if username is empty
        if (!data.username && data.first_name && data.last_name) {
            const firstname = data.first_name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const lastname = data.last_name.toLowerCase().replace(/[^a-z0-9]/g, '');
            data.username = `${firstname}.${lastname}`;
        }
        
        onSave(data as Partial<UserProfileFull>);
    };

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Athlete Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                        <input 
                            id="first_name"
                            {...register('first_name')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.first_name && <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>}
                    </div>
                    
                    <div>
                        <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                        <input 
                            id="last_name"
                            {...register('last_name')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.last_name && <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                        <input 
                            id="username"
                            {...register('username')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave blank to auto-generate from name</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <div>
                        <label htmlFor="body_fat_percentage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body Fat (%)</label>
                        <input 
                            id="body_fat_percentage"
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            {...register('body_fat_percentage')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.body_fat_percentage && <p className="mt-1 text-sm text-red-600">{errors.body_fat_percentage.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                        <select 
                            id="gender"
                            {...register('gender')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                        {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>}
                    </div>
                </div>
                
                <h3 className="text-md font-medium text-gray-800 dark:text-white mt-4 mb-2">Goals</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label htmlFor="goal_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Goal Type</label>
                        <select 
                            id="goal_type"
                            {...register('goal_type')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">Select Goal Type</option>
                            <option value="fat_loss">Fat Loss</option>
                            <option value="muscle_gain">Muscle Gain</option>
                            <option value="both">Both (Fat Loss & Muscle Gain)</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                        {errors.goal_type && <p className="mt-1 text-sm text-red-600">{errors.goal_type.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="goal_target_fat_loss_kg" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Fat Loss (kg)</label>
                        <input 
                            id="goal_target_fat_loss_kg"
                            type="number"
                            step="0.1"
                            {...register('goal_target_fat_loss_kg')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.goal_target_fat_loss_kg && <p className="mt-1 text-sm text-red-600">{errors.goal_target_fat_loss_kg.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="goal_target_muscle_gain_kg" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Muscle Gain (kg)</label>
                        <input 
                            id="goal_target_muscle_gain_kg"
                            type="number"
                            step="0.1"
                            {...register('goal_target_muscle_gain_kg')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.goal_target_muscle_gain_kg && <p className="mt-1 text-sm text-red-600">{errors.goal_target_muscle_gain_kg.message}</p>}
                    </div>
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
                        <label htmlFor="experience_level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Experience Level</label>
                        <select 
                            id="experience_level"
                            {...register('experience_level')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">Select Experience</option>
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                        {errors.experience_level && <p className="mt-1 text-sm text-red-600">{errors.experience_level.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="training_days_per_week" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Training Days Per Week</label>
                        <input 
                            id="training_days_per_week"
                            type="number"
                            min="3" 
                            max="7"
                            {...register('training_days_per_week')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.training_days_per_week && <p className="mt-1 text-sm text-red-600">{errors.training_days_per_week.message}</p>}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="training_time_of_day" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Training Time of Day</label>
                        <select 
                            id="training_time_of_day"
                            {...register('training_time_of_day')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">Select Time</option>
                            {['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', 
                              '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', 
                              '20:00', '21:00', '22:00', '23:00'].map(time => (
                                <option key={time} value={time}>{time}</option>
                            ))}
                        </select>
                        {errors.training_time_of_day && <p className="mt-1 text-sm text-red-600">{errors.training_time_of_day.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="training_session_length_minutes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Session Length (minutes)</label>
                        <input 
                            id="training_session_length_minutes"
                            type="number"
                            min="0"
                            {...register('training_session_length_minutes')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.training_session_length_minutes && <p className="mt-1 text-sm text-red-600">{errors.training_session_length_minutes.message}</p>}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="training_equipment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Available Equipment</label>
                        <select 
                            id="training_equipment"
                            {...register('training_equipment')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">Select Equipment</option>
                            <option value="Home gym">Home gym</option>
                            <option value="Bodyweight only">Bodyweight only</option>
                            <option value="Full Commercial gym">Full Commercial gym</option>
                            <option value="Limited Commercial gym">Limited Commercial gym</option>
                            <option value="Dumbbells and kettlebells only">Dumbbells and kettlebells only</option>
                            <option value="Dumbbells and barbell only">Dumbbells and barbell only</option>
                            <option value="Dumbbells, barbell and kettlebells only">Dumbbells, barbell and kettlebells only</option>
                        </select>
                        {errors.training_equipment && <p className="mt-1 text-sm text-red-600">{errors.training_equipment.message}</p>}
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
                    <label htmlFor="training_intensity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Training Intensity</label>
                    <input 
                        id="training_intensity"
                        {...register('training_intensity')}
                        className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
                
                <h3 className="text-md font-medium text-gray-800 dark:text-white mt-4 mb-2">Nutrition</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="nutrition_meal_patterns" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meal Patterns</label>
                        <textarea 
                            id="nutrition_meal_patterns"
                            {...register('nutrition_meal_patterns')}
                            rows={2}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div>
                        <label htmlFor="nutrition_tracking_method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tracking Method</label>
                        <select 
                            id="nutrition_tracking_method"
                            {...register('nutrition_tracking_method')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">Select Method</option>
                            <option value="MyFitnessPal">MyFitnessPal</option>
                            <option value="Other app">Other app</option>
                            <option value="Pen & paper">Pen & paper</option>
                            <option value="Don't track">Don't track</option>
                        </select>
                        {errors.nutrition_tracking_method && <p className="mt-1 text-sm text-red-600">{errors.nutrition_tracking_method.message}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="nutrition_wakeup_time_of_day" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wakeup Time</label>
                        <select 
                            id="nutrition_wakeup_time_of_day"
                            {...register('nutrition_wakeup_time_of_day')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">Select Time</option>
                            {['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', 
                              '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', 
                              '20:00', '21:00', '22:00', '23:00'].map(time => (
                                <option key={time} value={time}>{time}</option>
                            ))}
                        </select>
                        {errors.nutrition_wakeup_time_of_day && <p className="mt-1 text-sm text-red-600">{errors.nutrition_wakeup_time_of_day.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="nutrition_bed_time_of_day" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bedtime</label>
                        <select 
                            id="nutrition_bed_time_of_day"
                            {...register('nutrition_bed_time_of_day')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">Select Time</option>
                            {['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', 
                              '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', 
                              '20:00', '21:00', '22:00', '23:00'].map(time => (
                                <option key={time} value={time}>{time}</option>
                            ))}
                        </select>
                        {errors.nutrition_bed_time_of_day && <p className="mt-1 text-sm text-red-600">{errors.nutrition_bed_time_of_day.message}</p>}
                    </div>
                </div>
                
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <label htmlFor="lifestyle_stress_level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stress Level (1-10)</label>
                        <input 
                            id="lifestyle_stress_level"
                            type="number"
                            min="1"
                            max="10"
                            {...register('lifestyle_stress_level')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.lifestyle_stress_level && <p className="mt-1 text-sm text-red-600">{errors.lifestyle_stress_level.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="lifestyle_water_intake_liters" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Water Intake (liters)</label>
                        <input 
                            id="lifestyle_water_intake_liters"
                            type="number"
                            step="0.1"
                            min="0"
                            {...register('lifestyle_water_intake_liters')}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                        {errors.lifestyle_water_intake_liters && <p className="mt-1 text-sm text-red-600">{errors.lifestyle_water_intake_liters.message}</p>}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="lifestyle_schedule_notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Schedule Notes</label>
                        <textarea 
                            id="lifestyle_schedule_notes"
                            {...register('lifestyle_schedule_notes')}
                            rows={2}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
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
                
                <div>
                    <label htmlFor="motivation_readiness" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivation & Readiness</label>
                    <textarea 
                        id="motivation_readiness"
                        {...register('motivation_readiness')}
                        rows={2}
                        className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
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