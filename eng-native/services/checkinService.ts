import { supabase } from '../lib/supabase';
import {
  CheckIn,
  CheckInWithMetrics,
  CheckInFormData,
  BodyMetrics,
  WellnessMetrics,
} from '../types/checkin';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { getLocalDateString } from '../utils/date';

/**
 * Get all check-ins for a user
 */
export const getCheckIns = async (
  userId: string
): Promise<{ checkIns: CheckInWithMetrics[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select(`
        *,
        body_metrics (*),
        wellness_metrics (*)
      `)
      .eq('user_id', userId)
      .order('check_in_date', { ascending: false });

    if (error) {
      console.error('Error fetching check-ins:', error);
      return { checkIns: [], error: error.message };
    }

    // Transform the data to match our interface
    // Handle both array and single object responses from Supabase
    const checkIns: CheckInWithMetrics[] = (data || []).map((item) => ({
      ...item,
      body_metrics: Array.isArray(item.body_metrics)
        ? item.body_metrics[0]
        : item.body_metrics || undefined,
      wellness_metrics: Array.isArray(item.wellness_metrics)
        ? item.wellness_metrics[0]
        : item.wellness_metrics || undefined,
    }));

    return { checkIns };
  } catch (err) {
    console.error('Error in getCheckIns:', err);
    return { checkIns: [], error: 'Failed to fetch check-ins' };
  }
};

/**
 * Get the most recent check-in for a user
 */
export const getLatestCheckIn = async (
  userId: string
): Promise<{ checkIn: CheckInWithMetrics | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select(`
        *,
        body_metrics (*),
        wellness_metrics (*)
      `)
      .eq('user_id', userId)
      .order('check_in_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching latest check-in:', error);
      return { checkIn: null, error: error.message };
    }

    if (!data) {
      return { checkIn: null };
    }

    // Handle both array and single object responses from Supabase
    const bodyMetrics = Array.isArray(data.body_metrics)
      ? data.body_metrics[0]
      : data.body_metrics;
    const wellnessMetrics = Array.isArray(data.wellness_metrics)
      ? data.wellness_metrics[0]
      : data.wellness_metrics;

    const checkIn: CheckInWithMetrics = {
      ...data,
      body_metrics: bodyMetrics || undefined,
      wellness_metrics: wellnessMetrics || undefined,
    };

    return { checkIn };
  } catch (err) {
    console.error('Error in getLatestCheckIn:', err);
    return { checkIn: null, error: 'Failed to fetch latest check-in' };
  }
};

/**
 * Check if a check-in exists for today
 */
export const hasCheckedInToday = async (
  userId: string
): Promise<{ hasCheckedIn: boolean; checkInId?: string; error?: string }> => {
  try {
    const today = getLocalDateString();

    const { data, error } = await supabase
      .from('check_ins')
      .select('id')
      .eq('user_id', userId)
      .eq('check_in_date', today)
      .maybeSingle();

    if (error) {
      console.error('Error checking today check-in:', error);
      return { hasCheckedIn: false, error: error.message };
    }

    return { hasCheckedIn: !!data, checkInId: data?.id };
  } catch (err) {
    console.error('Error in hasCheckedInToday:', err);
    return { hasCheckedIn: false, error: 'Failed to check today status' };
  }
};

/**
 * Upload a photo to Supabase storage
 */
export const uploadPhoto = async (
  userId: string,
  uri: string,
  position: string
): Promise<{ path: string | null; error?: string }> => {
  try {
    // Read the file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${position}-${timestamp}.jpg`;
    const filePath = `${userId}/photos/${fileName}`;

    // Upload to storage
    const { error } = await supabase.storage
      .from('progress-media')
      .upload(filePath, decode(base64), {
        contentType: 'image/jpeg',
      });

    if (error) {
      console.error('Error uploading photo:', error);
      return { path: null, error: error.message };
    }

    return { path: filePath };
  } catch (err) {
    console.error('Error in uploadPhoto:', err);
    return { path: null, error: 'Failed to upload photo' };
  }
};

/**
 * Submit a new check-in
 */
export const submitCheckIn = async (
  userId: string,
  formData: CheckInFormData,
  photoPaths?: string[]
): Promise<{ checkIn: CheckIn | null; error?: string }> => {
  try {
    // 1. Create the check-in record
    const checkInData = {
      user_id: userId,
      check_in_date: formData.check_in_date,
      photos: photoPaths && photoPaths.length > 0 ? photoPaths : null,
      diet_adherence: formData.diet_adherence,
      training_adherence: formData.training_adherence,
      steps_adherence: formData.steps_adherence,
      notes: formData.notes,
    };

    const { data: checkIn, error: checkInError } = await supabase
      .from('check_ins')
      .insert(checkInData)
      .select('*')
      .single();

    if (checkInError || !checkIn) {
      console.error('Error creating check-in:', checkInError);
      return { checkIn: null, error: checkInError?.message || 'Failed to create check-in' };
    }

    // 2. Create body metrics
    const bodyMetricsData = {
      check_in_id: checkIn.id,
      weight_kg: formData.weight_kg || null,
      body_fat_percentage: formData.body_fat_percentage || null,
      waist_cm: formData.waist_cm || null,
      hip_cm: formData.hip_cm || null,
      chest_cm: formData.chest_cm || null,
      left_arm_cm: formData.left_arm_cm || null,
      right_arm_cm: formData.right_arm_cm || null,
      left_thigh_cm: formData.left_thigh_cm || null,
      right_thigh_cm: formData.right_thigh_cm || null,
    };

    const { error: bodyError } = await supabase
      .from('body_metrics')
      .insert(bodyMetricsData);

    if (bodyError) {
      console.error('Error creating body metrics:', bodyError);
      // Don't fail the whole check-in, just log the error
    }

    // 3. Create wellness metrics
    const wellnessData = {
      check_in_id: checkIn.id,
      sleep_hours: formData.sleep_hours || null,
      sleep_quality: formData.sleep_quality || null,
      stress_level: formData.stress_level || null,
      fatigue_level: formData.fatigue_level || null,
      motivation_level: formData.motivation_level || null,
      digestion: formData.digestion || null,
      menstrual_cycle_notes: formData.menstrual_cycle_notes || null,
    };

    const { error: wellnessError } = await supabase
      .from('wellness_metrics')
      .insert(wellnessData);

    if (wellnessError) {
      console.error('Error creating wellness metrics:', wellnessError);
      // Don't fail the whole check-in, just log the error
    }

    return { checkIn };
  } catch (err) {
    console.error('Error in submitCheckIn:', err);
    return { checkIn: null, error: 'Failed to submit check-in' };
  }
};

/**
 * Get a single check-in by ID with all related data
 */
export const getCheckInById = async (
  checkInId: string
): Promise<{ checkIn: CheckInWithMetrics | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select(`
        *,
        body_metrics (*),
        wellness_metrics (*)
      `)
      .eq('id', checkInId)
      .single();

    if (error) {
      console.error('Error fetching check-in:', error);
      return { checkIn: null, error: error.message };
    }

    if (!data) {
      return { checkIn: null };
    }

    const bodyMetrics = Array.isArray(data.body_metrics)
      ? data.body_metrics[0]
      : data.body_metrics;
    const wellnessMetrics = Array.isArray(data.wellness_metrics)
      ? data.wellness_metrics[0]
      : data.wellness_metrics;

    const checkIn: CheckInWithMetrics = {
      ...data,
      body_metrics: bodyMetrics || undefined,
      wellness_metrics: wellnessMetrics || undefined,
    };

    return { checkIn };
  } catch (err) {
    console.error('Error in getCheckInById:', err);
    return { checkIn: null, error: 'Failed to fetch check-in' };
  }
};

/**
 * Update an existing check-in
 */
export const updateCheckIn = async (
  checkInId: string,
  formData: CheckInFormData,
  photoPaths?: string[]
): Promise<{ checkIn: CheckIn | null; error?: string }> => {
  try {
    // 1. Update the check-in record
    const checkInData: any = {
      diet_adherence: formData.diet_adherence,
      training_adherence: formData.training_adherence,
      steps_adherence: formData.steps_adherence,
      notes: formData.notes,
    };

    // Only update photos if new ones were provided
    if (photoPaths && photoPaths.length > 0) {
      checkInData.photos = photoPaths;
    }

    const { data: checkIn, error: checkInError } = await supabase
      .from('check_ins')
      .update(checkInData)
      .eq('id', checkInId)
      .select('*')
      .single();

    if (checkInError || !checkIn) {
      console.error('Error updating check-in:', checkInError);
      return { checkIn: null, error: checkInError?.message || 'Failed to update check-in' };
    }

    // 2. Update body metrics (upsert)
    const bodyMetricsData = {
      check_in_id: checkInId,
      weight_kg: formData.weight_kg || null,
      body_fat_percentage: formData.body_fat_percentage || null,
      waist_cm: formData.waist_cm || null,
      hip_cm: formData.hip_cm || null,
      chest_cm: formData.chest_cm || null,
      arm_cm: formData.arm_cm || null,
      thigh_cm: formData.thigh_cm || null,
    };

    const { error: bodyError } = await supabase
      .from('body_metrics')
      .upsert(bodyMetricsData, { onConflict: 'check_in_id' });

    if (bodyError) {
      console.error('Error updating body metrics:', bodyError);
    }

    // 3. Update wellness metrics (upsert)
    const wellnessData = {
      check_in_id: checkInId,
      sleep_hours: formData.sleep_hours || null,
      sleep_quality: formData.sleep_quality || null,
      stress_level: formData.stress_level || null,
      fatigue_level: formData.fatigue_level || null,
      motivation_level: formData.motivation_level || null,
      digestion: formData.digestion || null,
      menstrual_cycle_notes: formData.menstrual_cycle_notes || null,
    };

    const { error: wellnessError } = await supabase
      .from('wellness_metrics')
      .upsert(wellnessData, { onConflict: 'check_in_id' });

    if (wellnessError) {
      console.error('Error updating wellness metrics:', wellnessError);
    }

    return { checkIn };
  } catch (err) {
    console.error('Error in updateCheckIn:', err);
    return { checkIn: null, error: 'Failed to update check-in' };
  }
};

/**
 * Get photo URL from storage path
 */
export const getPhotoUrl = (path: string): string => {
  const { data } = supabase.storage.from('progress-media').getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Get days since last check-in
 */
export const getDaysSinceLastCheckIn = async (
  userId: string
): Promise<{ days: number | null; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select('check_in_date')
      .eq('user_id', userId)
      .order('check_in_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching last check-in date:', error);
      return { days: null, error: error.message };
    }

    if (!data) {
      return { days: null }; // No previous check-ins
    }

    const lastDate = new Date(data.check_in_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return { days: diffDays };
  } catch (err) {
    console.error('Error in getDaysSinceLastCheckIn:', err);
    return { days: null, error: 'Failed to calculate days' };
  }
};

/**
 * Format adherence for display
 */
export const formatAdherence = (adherence?: string): string => {
  if (!adherence) return 'Not recorded';
  return adherence;
};

/**
 * Get adherence color
 */
export const getAdherenceColor = (adherence?: string): string => {
  switch (adherence) {
    case 'Perfect':
      return '#22C55E'; // green
    case 'Good':
      return '#84CC16'; // lime
    case 'Average':
      return '#F59E0B'; // amber
    case 'Poor':
      return '#F97316'; // orange
    case 'Off Track':
      return '#EF4444'; // red
    default:
      return '#6B7280'; // gray
  }
};
