import { supabase } from './supabaseClient';

export enum BFCalculationMethod {
  JACKSON_POLLOCK_3 = 'jackson_pollock_3',
  JACKSON_POLLOCK_4 = 'jackson_pollock_4',
  JACKSON_POLLOCK_7 = 'jackson_pollock_7',
  DURNIN_WOMERSLEY = 'durnin_womersley',
  PARRILLO = 'parrillo',
  NAVY_TAPE = 'navy_tape'
}

export interface BodyMeasurement {
  id?: string;
  user_id: string;
  measurement_date: string;
  weight_kg?: number;
  weight_change_kg?: number;
  
  // Circumference measurements (cm)
  waist_cm?: number;
  neck_cm?: number;
  hips_cm?: number;
  
  // Skinfold measurements (mm)
  chest_mm?: number;
  abdominal_mm?: number;
  thigh_mm?: number;
  tricep_mm?: number;
  subscapular_mm?: number;
  suprailiac_mm?: number;
  midaxillary_mm?: number;
  bicep_mm?: number;
  lower_back_mm?: number;
  calf_mm?: number;
  
  // Body composition calculations
  body_fat_percentage?: number;
  body_fat_override?: number;
  lean_body_mass_kg?: number;
  fat_mass_kg?: number;
  basal_metabolic_rate?: number;
  
  calculation_method?: BFCalculationMethod;
  notes?: string;
  created_at?: string;
  created_by?: string;
}

/**
 * Calculate body fat percentage using Jackson-Pollock 3-site formula
 * Sites for males: Chest, Abdomen, Thigh
 * Sites for females: Tricep, Suprailiac, Thigh
 */
export function calculateJacksonPollock3(
  gender: 'male' | 'female',
  age: number,
  chest_mm: number,
  abdominal_mm: number,
  thigh_mm: number,
  tricep_mm?: number,
  suprailiac_mm?: number
): number {
  // Sum of skinfolds - different sites based on gender
  let sum = 0;
  
  if (gender === 'male') {
    // For males: chest, abdominal, thigh
    sum = chest_mm + abdominal_mm + thigh_mm;
  } else {
    // For females: tricep, suprailiac, thigh
    if (!tricep_mm || !suprailiac_mm) {
      throw new Error('For females, tricep and suprailiac measurements are required for Jackson-Pollock 3-site formula');
    }
    sum = tricep_mm + suprailiac_mm + thigh_mm;
  }
  
  // Calculate body density
  let bodyDensity = 0;
  
  if (gender === 'male') {
    bodyDensity = 1.10938 - (0.0008267 * sum) + (0.0000016 * sum * sum) - (0.0002574 * age);
  } else { // female
    bodyDensity = 1.0994921 - (0.0009929 * sum) + (0.0000023 * sum * sum) - (0.0001392 * age);
  }
  
  // Convert body density to body fat percentage using Siri equation
  const bodyFatPercentage = (495 / bodyDensity) - 450;
  
  return parseFloat(bodyFatPercentage.toFixed(1));
}

/**
 * Calculate body fat percentage using Jackson-Pollock 4-site formula
 * Sites: Abdominal, Suprailiac, Tricep, Thigh
 */
export function calculateJacksonPollock4(
  gender: 'male' | 'female',
  age: number,
  abdominal_mm: number,
  suprailiac_mm: number,
  tricep_mm: number,
  thigh_mm: number
): number {
  // Sum of skinfolds
  const sum = abdominal_mm + suprailiac_mm + tricep_mm + thigh_mm;
  
  // Calculate body density
  let bodyDensity = 0;
  
  if (gender === 'male') {
    bodyDensity = 1.10938 - (0.0008267 * sum) + (0.0000016 * sum * sum) - (0.0002574 * age);
  } else { // female
    bodyDensity = 1.0994921 - (0.0009929 * sum) + (0.0000023 * sum * sum) - (0.0001392 * age);
  }
  
  // Convert body density to body fat percentage using Siri equation
  const bodyFatPercentage = (495 / bodyDensity) - 450;
  
  return parseFloat(bodyFatPercentage.toFixed(1));
}

/**
 * Calculate body fat percentage using Jackson-Pollock 7-site formula
 * Sites: Chest, Midaxillary, Tricep, Subscapular, Abdomen, Suprailiac, Thigh
 */
export function calculateJacksonPollock7(
  gender: 'male' | 'female',
  age: number,
  chest_mm: number,
  midaxillary_mm: number,
  tricep_mm: number,
  subscapular_mm: number,
  abdominal_mm: number,
  suprailiac_mm: number,
  thigh_mm: number
): number {
  // Sum of skinfolds
  const sum = chest_mm + midaxillary_mm + tricep_mm + subscapular_mm + abdominal_mm + suprailiac_mm + thigh_mm;
  
  // Calculate body density
  let bodyDensity = 0;
  
  if (gender === 'male') {
    bodyDensity = 1.112 - (0.00043499 * sum) + (0.00000055 * sum * sum) - (0.00028826 * age);
  } else { // female
    bodyDensity = 1.097 - (0.00046971 * sum) + (0.00000056 * sum * sum) - (0.00012828 * age);
  }
  
  // Convert body density to body fat percentage using Siri equation
  const bodyFatPercentage = (495 / bodyDensity) - 450;
  
  return parseFloat(bodyFatPercentage.toFixed(1));
}

/**
 * Calculate body fat percentage using Durnin-Womersley formula
 * Sites: Bicep, Tricep, Subscapular, Suprailiac
 */
export function calculateDurninWomersley(
  gender: 'male' | 'female',
  age: number,
  bicep_mm: number,
  tricep_mm: number,
  subscapular_mm: number,
  suprailiac_mm: number
): number {
  // Sum of skinfolds
  const sum = bicep_mm + tricep_mm + subscapular_mm + suprailiac_mm;
  
  // Constants based on age and gender
  let c = 0, m = 0;
  
  if (gender === 'male') {
    if (age < 17) {
      c = 1.1533; m = 0.0643;
    } else if (age < 20) {
      c = 1.1620; m = 0.0630;
    } else if (age < 30) {
      c = 1.1631; m = 0.0632;
    } else if (age < 40) {
      c = 1.1422; m = 0.0544;
    } else if (age < 50) {
      c = 1.1620; m = 0.0700;
    } else {
      c = 1.1715; m = 0.0779;
    }
  } else { // female
    if (age < 17) {
      c = 1.1369; m = 0.0598;
    } else if (age < 20) {
      c = 1.1549; m = 0.0678;
    } else if (age < 30) {
      c = 1.1599; m = 0.0717;
    } else if (age < 40) {
      c = 1.1423; m = 0.0632;
    } else if (age < 50) {
      c = 1.1333; m = 0.0612;
    } else {
      c = 1.1339; m = 0.0645;
    }
  }
  
  // Calculate body density
  const bodyDensity = c - (m * Math.log10(sum));
  
  // Convert body density to body fat percentage using Siri equation
  const bodyFatPercentage = (495 / bodyDensity) - 450;
  
  return parseFloat(bodyFatPercentage.toFixed(1));
}

/**
 * Calculate body fat percentage using Parrillo formula
 * Sites: Chest, Abdomen, Thigh, Bicep, Tricep, Subscapular, Suprailiac, Lower Back, Calf
 */
export function calculateParrillo(
  gender: 'male' | 'female',
  chest_mm: number,
  abdominal_mm: number,
  thigh_mm: number,
  bicep_mm: number,
  tricep_mm: number,
  subscapular_mm: number,
  suprailiac_mm: number,
  lower_back_mm: number,
  calf_mm: number
): number {
  // Sum of skinfolds
  const sum = chest_mm + abdominal_mm + thigh_mm + bicep_mm + tricep_mm + 
              subscapular_mm + suprailiac_mm + lower_back_mm + calf_mm;
  
  // Parrillo calculation - revised based on standard implementation
  const bodyFatPercentage = sum * 0.27;
  
  return parseFloat(bodyFatPercentage.toFixed(1));
}

/**
 * Calculate body fat percentage using Navy Tape method
 * Males: Neck, Waist
 * Females: Neck, Waist, Hips
 */
export function calculateNavyTape(
  gender: 'male' | 'female',
  height_cm: number,
  neck_cm: number,
  waist_cm: number,
  hips_cm?: number
): number {
  let bodyFatPercentage = 0;
  
  if (gender === 'male') {
    bodyFatPercentage = 495 / (1.0324 - 0.19077 * Math.log10(waist_cm - neck_cm) + 0.15456 * Math.log10(height_cm)) - 450;
  } else { // female
    if (!hips_cm) {
      throw new Error('Hip measurement required for females using Navy Tape method');
    }
    bodyFatPercentage = 495 / (1.29579 - 0.35004 * Math.log10(waist_cm + hips_cm - neck_cm) + 0.22100 * Math.log10(height_cm)) - 450;
  }
  
  return parseFloat(bodyFatPercentage.toFixed(1));
}

/**
 * Calculate lean body mass and fat mass
 */
export function calculateBodyComposition(
  weightKg: number,
  bodyFatPercentage: number
): { leanMassKg: number; fatMassKg: number } {
  const fatMassKg = (bodyFatPercentage / 100) * weightKg;
  const leanMassKg = weightKg - fatMassKg;
  
  return {
    leanMassKg: parseFloat(leanMassKg.toFixed(1)),
    fatMassKg: parseFloat(fatMassKg.toFixed(1))
  };
}

/**
 * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor equation
 */
export function calculateBMR(
  gender: 'male' | 'female',
  weightKg: number,
  heightCm: number,
  age: number
): number {
  let bmr = 0;
  
  if (gender === 'male') {
    bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
  } else { // female
    bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
  }
  
  return parseFloat(bmr.toFixed(0));
}

/**
 * Save new measurement for an athlete
 */
export async function saveMeasurement(measurement: BodyMeasurement) {
  try {
    const { data, error } = await supabase
      .from('athlete_measurements')
      .upsert(measurement, { onConflict: 'user_id, measurement_date' })
      .select();
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error saving measurement:', error);
    return { data: null, error };
  }
}

/**
 * Get all measurements for a specific athlete
 */
export async function getAthleteAllMeasurements(athleteId: string) {
  try {
    const { data, error } = await supabase
      .from('athlete_measurements')
      .select('*')
      .eq('user_id', athleteId)
      .order('measurement_date', { ascending: false });
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching measurements:', error);
    return { data: null, error };
  }
}

/**
 * Get latest measurement for a specific athlete
 */
export async function getAthleteLatestMeasurement(athleteId: string) {
  try {
    const { data, error } = await supabase
      .from('athlete_measurements')
      .select('*')
      .eq('user_id', athleteId)
      .order('measurement_date', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error fetching latest measurement:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching latest measurement:', error);
    return { data: null, error };
  }
}

/**
 * Get recent measurements for a specific athlete (limited to a specific count)
 */
export async function getAthleteRecentMeasurements(athleteId: string, limit: number = 5) {
  try {
    const { data, error } = await supabase
      .from('athlete_measurements')
      .select('*')
      .eq('user_id', athleteId)
      .order('measurement_date', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching recent measurements:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching recent measurements:', error);
    return { data: null, error };
  }
}

export async function getAthleteLatestBodyMetrics(athleteId: string) {
  try {
    
    const { data, error } = await supabase
      .from('check_ins')
      .select(`
          body_metrics(*)
      `)
      .eq('user_id', athleteId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching latest body metrics:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching latest body metrics:', error);
    return { data: null, error };
  }
}

/**
 * Delete a measurement record
 */
export async function deleteMeasurement(measurementId: string) {
  try {
    const { error } = await supabase
      .from('athlete_measurements')
      .delete()
      .eq('id', measurementId);
      
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting measurement:', error);
    return { success: false, error };
  }
} 