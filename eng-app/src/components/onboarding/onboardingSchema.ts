import { z } from 'zod';

// Revised Helper: Preprocesses input, then applies the provided number schema
// Remove the numericString helper function
// const numericString = <T extends z.ZodTypeAny>(schema: T) => 
//   z.preprocess((a) => {
//     if (typeof a === 'string') {
//         if (a.trim() === '') return undefined;
//         const parsed = parseFloat(a);
//         return isNaN(parsed) ? a : parsed;
//     }
//     return a;
//   }, schema);

export const onboardingSchema = z.object({
    // == Step 1: Demographics ==
    first_name: z.string().min(1, { message: 'First name is required' }).trim(),
    last_name: z.string().min(1, { message: 'Last name is required' }).trim(),
    age: z.coerce.number({invalid_type_error: 'Age must be a number'})
             .int({ message: 'Age must be a whole number' })
             .positive({ message: 'Age must be positive' }),
    weight_kg: z.coerce.number({invalid_type_error: 'Weight must be a number'})
                     .positive({ message: 'Weight must be positive' }),
    height_cm: z.coerce.number({invalid_type_error: 'Height must be a number'})
                     .positive({ message: 'Height must be positive' }),
    body_fat_percentage: z.coerce.number({invalid_type_error: 'Body fat % must be a number'})
                              .int({ message: 'Body fat % must be a whole number' })
                              .positive({ message: 'Body fat % must be positive' })
                              .min(-1, { message: 'Body fat % cannot be negative' })
                              .max(100, { message: 'Body fat % cannot exceed 100' }),
    gender: z.enum(['male', 'female'], {
      required_error: "Gender is required",
      invalid_type_error: "Gender must be selected",
    }),

    // == Step 2: Goals ==
    goal_type: z.enum(['fat_loss', 'muscle_gain', 'both', 'maintenance'], {
      required_error: "Primary goal is required",
      invalid_type_error: "Primary goal must be selected",
    }),
    // These fields will be conditionally required based on goal_type
    goal_target_fat_loss_kg: z.coerce.number({invalid_type_error: 'Target fat loss must be a number'})
                                  .nonnegative({ message: 'Target fat loss cannot be negative' })
                                  .optional(),
    goal_target_muscle_gain_kg: z.coerce.number({invalid_type_error: 'Target muscle gain must be a number'})
                                     .nonnegative({ message: 'Target muscle gain cannot be negative' })
                                     .optional(),
    goal_timeframe_weeks: z.coerce.number({invalid_type_error: 'Timeframe must be a number'})
                               .int({ message: 'Timeframe must be a whole number' })
                               .positive({ message: 'Timeframe must be positive' }),
    goal_target_weight_kg: z.coerce.number({invalid_type_error: 'Target weight must be a number'})
                                .positive({ message: 'Target weight must be positive' }),
    goal_physique_details: z.string().trim(),

    // == Step 3: Training Habits ==
    experience_level: z.enum(['beginner', 'intermediate', 'advanced'], {
        required_error: "Experience level is required",
        invalid_type_error: "Experience level must be selected",
    }),
    training_equipment: z.enum(['Home gym', 'Bodyweight only', 'Full Commercial gym', 'Limited Commercial gym', 'Dumbbells and kettlebells only', 'Dumbbells and barbell only', 'Dumbbells, barbell and kettlebells only'], {
        required_error: "Training equipment is required",
        invalid_type_error: "Training equipment must be selected",
    }),
    training_days_per_week: z.coerce.number({invalid_type_error: 'Training days must be a number'})
                                 .int({ message: 'Training days must be a whole number' })
                                 .min(3, { message: 'Training days must be more or equal to 3' })
                                 .max(7, { message: 'Training days cannot exceed 7' }),
    training_current_program: z.string().trim().optional().nullable(),
    training_time_of_day: z.enum(['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'], {
      required_error: "Training time of day is required",
      invalid_type_error: "Training time of day must be selected",
    }),
    training_session_length_minutes: z.coerce.number({invalid_type_error: 'Session length must be a number'})
                                          .int({ message: 'Session length must be a whole number' })
                                          .optional(),
    training_intensity: z.string().trim().optional().nullable(),

    // == Step 4: Nutrition Habits ==
    nutrition_tracking_method: z.enum(['MyFitnessPal', 'Other app', 'Pen & paper', 'Don\'t track'], {
      required_error: "Tracking method is required",
      invalid_type_error: "Tracking method must be selected",
    }),
    nutrition_wakeup_time_of_day: z.enum(['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'], {
      required_error: "Wakeup time is required",
      invalid_type_error: "Wakeup time must be selected",
    }),
    nutrition_bed_time_of_day: z.enum(['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'], {
      required_error: "Bed time is required",
      invalid_type_error: "Bed time must be selected",
    }),
    nutrition_meal_patterns: z.string().trim(),
    nutrition_preferences: z.string().trim().optional().nullable(),
    nutrition_allergies: z.string().trim().optional().nullable(),

    // == Step 5: Lifestyle & More ==
    lifestyle_sleep_hours: z.coerce.number({invalid_type_error: 'Sleep hours must be a number'})
                               .nonnegative({ message: 'Sleep hours cannot be negative' })
                               .max(24, { message: 'Sleep hours cannot exceed 24' })
                               .optional()
                               .nullable(),

    lifestyle_stress_level: z.preprocess(
        // Convert empty strings to null
        (val) => val === '' || val === undefined ? null : val,
        z.union([
            z.null(),
            z.coerce.number({invalid_type_error: 'Stress level must be a number'})
              .int({ message: 'Stress level must be a whole number' })
              .min(1, { message: 'Stress scale is usually 1-10' })
              .max(10, { message: 'Stress scale is usually 1-10' })
        ])
    ),
    lifestyle_water_intake_liters: z.coerce.number({invalid_type_error: 'Water intake must be a number'})
                                      .min(0.1, { message: 'Water intake must be more or equal to 0.1' })
                                      .max(99, { message: 'Water intake cannot exceed 99' })
                                      .nonnegative({ message: 'Water intake cannot be negative' }),
    lifestyle_schedule_notes: z.string().trim().optional().nullable(),
    supplements_meds: z.string().trim().optional().nullable(),
    motivation_readiness: z.string().trim().min(1, { message: 'Motivation & Readiness for Change is required' }),
}).superRefine((data, ctx) => {
    // Apply conditional validation based on goal_type
    if (data.goal_type === 'fat_loss' || data.goal_type === 'both') {
        // Fat loss goal requires target fat loss
        if (data.goal_target_fat_loss_kg === undefined || data.goal_target_fat_loss_kg === null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Target fat loss is required for this goal type',
                path: ['goal_target_fat_loss_kg']
            });
        }
    }
    
    if (data.goal_type === 'muscle_gain' || data.goal_type === 'both') {
        // Muscle gain goal requires target muscle gain
        if (data.goal_target_muscle_gain_kg === undefined || data.goal_target_muscle_gain_kg === null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Target muscle gain is required for this goal type',
                path: ['goal_target_muscle_gain_kg']
            });
        }
    }
});

// Export the inferred type for use in forms
export type OnboardingData = z.infer<typeof onboardingSchema>; 