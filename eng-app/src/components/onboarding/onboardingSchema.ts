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
    age: z.coerce.number({invalid_type_error: 'Age must be a number'})
             .int({ message: 'Age must be a whole number' })
             .positive({ message: 'Age must be positive' })
             .optional()
             .nullable(),
    weight_kg: z.coerce.number({invalid_type_error: 'Weight must be a number'})
                     .positive({ message: 'Weight must be positive' })
                     .optional()
                     .nullable(),
    height_cm: z.coerce.number({invalid_type_error: 'Height must be a number'})
                     .positive({ message: 'Height must be positive' })
                     .optional()
                     .nullable(),
    body_fat_percentage: z.coerce.number({invalid_type_error: 'Body fat % must be a number'})
                              .min(0, { message: 'Body fat % cannot be negative' })
                              .max(100, { message: 'Body fat % cannot exceed 100' })
                              .optional()
                              .nullable(),

    // == Step 2: Goals ==
    goal_target_fat_loss_kg: z.coerce.number({invalid_type_error: 'Target fat loss must be a number'})
                                  .nonnegative({ message: 'Target fat loss cannot be negative' })
                                  .optional()
                                  .nullable(),
    goal_timeframe_weeks: z.coerce.number({invalid_type_error: 'Timeframe must be a number'})
                               .int({ message: 'Timeframe must be a whole number' })
                               .positive({ message: 'Timeframe must be positive' })
                               .optional()
                               .nullable(),
    goal_target_weight_kg: z.coerce.number({invalid_type_error: 'Target weight must be a number'})
                                .positive({ message: 'Target weight must be positive' })
                                .optional()
                                .nullable(),
    goal_physique_details: z.string().trim().optional().nullable(),

    // == Step 3: Training Habits ==
    training_days_per_week: z.coerce.number({invalid_type_error: 'Training days must be a number'})
                                 .int({ message: 'Training days must be a whole number' })
                                 .min(0, { message: 'Training days cannot be negative' })
                                 .max(7, { message: 'Training days cannot exceed 7' })
                                 .optional()
                                 .nullable(),
    training_current_program: z.string().trim().optional().nullable(),
    training_equipment: z.string().trim().optional().nullable(), // Consider multi-select later
    training_session_length_minutes: z.coerce.number({invalid_type_error: 'Session length must be a number'})
                                          .int({ message: 'Session length must be a whole number' })
                                          .positive({ message: 'Session length must be positive' })
                                          .optional()
                                          .nullable(),
    training_intensity: z.string().trim().optional().nullable(), // Consider enum/select later (e.g., RPE, RIR)

    // == Step 4: Nutrition Habits ==
    nutrition_meal_patterns: z.string().trim().optional().nullable(),
    nutrition_tracking_method: z.string().trim().optional().nullable(), // Consider enum/select later
    nutrition_preferences: z.string().trim().optional().nullable(),
    nutrition_allergies: z.string().trim().optional().nullable(),

    // == Step 5: Lifestyle & More ==
    lifestyle_sleep_hours: z.coerce.number({invalid_type_error: 'Sleep hours must be a number'})
                               .nonnegative({ message: 'Sleep hours cannot be negative' })
                               .max(24, { message: 'Sleep hours cannot exceed 24' })
                               .optional()
                               .nullable(),
    lifestyle_stress_level: z.coerce.number({invalid_type_error: 'Stress level must be a number'})
                               .int({ message: 'Stress level must be a whole number' })
                               .min(1, { message: 'Stress scale is usually 1-10' })
                               .max(10, { message: 'Stress scale is usually 1-10' })
                               .optional()
                               .nullable(), // Assuming 1-10 scale
    lifestyle_water_intake_liters: z.coerce.number({invalid_type_error: 'Water intake must be a number'})
                                      .nonnegative({ message: 'Water intake cannot be negative' })
                                      .optional()
                                      .nullable(),
    lifestyle_schedule_notes: z.string().trim().optional().nullable(),
    supplements_meds: z.string().trim().optional().nullable(),
    motivation_readiness: z.string().trim().optional().nullable(), // Consider enum/select later
});

// Export the inferred type for use in forms
export type OnboardingData = z.infer<typeof onboardingSchema>; 