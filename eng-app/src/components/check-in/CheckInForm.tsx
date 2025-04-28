import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import { supabase } from '../../services/supabaseClient';
import FormInput from '../ui/FormInput';
import { v4 as uuidv4 } from 'uuid';

// Define Zod schema for check-in data (refine as needed)
const checkInSchema = z.object({
    // Body Metrics
    weight_kg: z.coerce.number({invalid_type_error: 'Weight must be a number'})
                   .positive()
                   .optional()
                   .nullable(),
    body_fat_percentage: z.coerce.number({invalid_type_error: 'Body fat % must be a number'})
                   .min(0)
                   .max(100)
                   .optional()
                   .nullable(),
    waist_cm: z.coerce.number().positive().optional().nullable(),
    hip_cm: z.coerce.number().positive().optional().nullable(),
    // Add other body measurements (chest, arm, thigh...)

    // Wellness Metrics
    sleep_hours: z.coerce.number().nonnegative().max(24).optional().nullable(),
    sleep_quality: z.coerce.number().int().min(1).max(5).optional().nullable(), // 1-5 scale
    stress_level: z.coerce.number().int().min(1).max(5).optional().nullable(), // 1-5 scale
    fatigue_level: z.coerce.number().int().min(1).max(5).optional().nullable(), // 1-5 scale
    digestion: z.string().trim().optional().nullable(),
    motivation_level: z.coerce.number().int().min(1).max(5).optional().nullable(), // 1-5 scale
    // menstrual_cycle_notes: z.string().trim().optional().nullable(),

    // Adherence
    diet_adherence: z.string().trim().optional().nullable(), // Consider enum/select later
    training_adherence: z.string().trim().optional().nullable(), // Consider enum/select later
    steps_adherence: z.string().trim().optional().nullable(), // Consider enum/select later
    notes: z.string().trim().optional().nullable(),

    // Media - handled separately, not part of Zod schema for direct form values
    // photos: z.any(),
    // video_url: z.string().url().optional().nullable(),
});

type CheckInData = z.infer<typeof checkInSchema>;

// Define DB table structures (subset, based on form schema)
interface CheckInInsert {
    user_id: string;
    check_in_date?: string; // Default to CURRENT_DATE in DB
    photos?: string[]; // Store array of storage paths
    video_url?: string; // Store single storage path
    diet_adherence?: string | null;
    training_adherence?: string | null;
    steps_adherence?: string | null;
    notes?: string | null;
}

interface BodyMetricsInsert {
    check_in_id?: string; // Will be set after check_in insert
    weight_kg?: number | null;
    body_fat_percentage?: number | null;
    waist_cm?: number | null;
    hip_cm?: number | null;
    // Add other metrics
}

interface WellnessMetricsInsert {
    check_in_id?: string; // Will be set after check_in insert
    sleep_hours?: number | null;
    sleep_quality?: number | null;
    stress_level?: number | null;
    fatigue_level?: number | null;
    digestion?: string | null;
    motivation_level?: number | null;
    // Add other metrics
}

const CheckInForm: React.FC = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
    const user = useSelector(selectUser);
    // State for selected files
    const [photoFiles, setPhotoFiles] = useState<FileList | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    const methods = useForm<CheckInData>({
        resolver: zodResolver(checkInSchema),
        mode: 'onBlur',
    });

    const { handleSubmit, reset } = methods;

    const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setPhotoFiles(event.target.files);
        }
    };

    const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setVideoFile(event.target.files[0]);
        }
    };

    // Function to upload a single file
    const uploadFile = async (file: File, folder: string): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${user!.id}/${folder}/${fileName}`;

        console.log(`Uploading ${folder} to: ${filePath}`);

        const { error: uploadError } = await supabase.storage
            .from('progress-media') // Ensure this bucket exists and has policies set up
            .upload(filePath, file, {
                // Upsert false prevents overwriting (shouldn't happen with uuid)
                // cacheControl: '3600', // Optional: cache control
            });

        if (uploadError) {
            console.error(`Error uploading ${folder}:`, uploadError);
            throw new Error(`Failed to upload ${folder}: ${uploadError.message}`);
        }

        console.log(`${folder} uploaded successfully: ${filePath}`);
        return filePath; // Return the storage path
    };

    const onSubmit = async (formData: CheckInData) => {
        if (!user) {
            setSubmitError('User not found. Please log in again.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(false);
        setUploadProgress(0); // Start progress at 0

        let uploadedPhotoPaths: string[] = [];
        let uploadedVideoPath: string | undefined = undefined;

        try {
            // 1. Upload Photos
            if (photoFiles && photoFiles.length > 0) {
                console.log(`Starting upload of ${photoFiles.length} photos...`);
                const uploadPromises = Array.from(photoFiles).map(async (file, index) => {
                    const path = await uploadFile(file, 'photos');
                    // Rough progress update
                    setUploadProgress(Math.round(((index + 1) / (photoFiles.length + (videoFile ? 1 : 0))) * 100));
                    return path;
                });
                uploadedPhotoPaths = await Promise.all(uploadPromises);
                console.log('All photos uploaded.');
            }

            // 2. Upload Video (if present)
            if (videoFile) {
                console.log('Starting video upload...');
                uploadedVideoPath = await uploadFile(videoFile, 'videos');
                setUploadProgress(100); // Mark as complete after video (if exists)
                console.log('Video uploaded.');
            }
            
            setUploadProgress(null); // Clear progress indicator

            // 3. Prepare data for DB insertion
            const checkInData: CheckInInsert = {
                user_id: user.id,
                photos: uploadedPhotoPaths.length > 0 ? uploadedPhotoPaths : undefined,
                video_url: uploadedVideoPath,
                diet_adherence: formData.diet_adherence,
                training_adherence: formData.training_adherence,
                steps_adherence: formData.steps_adherence,
                notes: formData.notes,
            };

            const bodyMetricsData: BodyMetricsInsert = {
                weight_kg: formData.weight_kg,
                body_fat_percentage: formData.body_fat_percentage,
                waist_cm: formData.waist_cm,
                hip_cm: formData.hip_cm,
                // Map other metrics
            };

            const wellnessMetricsData: WellnessMetricsInsert = {
                sleep_hours: formData.sleep_hours,
                sleep_quality: formData.sleep_quality,
                stress_level: formData.stress_level,
                fatigue_level: formData.fatigue_level,
                digestion: formData.digestion,
                motivation_level: formData.motivation_level,
                // Map other metrics
            };

            // 4. Insert data into DB (handle potential partial failures if not using transaction)
            console.log('Inserting check_in record...');
            const { data: checkInResult, error: checkInError } = await supabase
                .from('check_ins')
                .insert(checkInData)
                .select('id') // Select the ID of the newly created check-in
                .single();

            if (checkInError || !checkInResult?.id) {
                throw checkInError || new Error('Failed to create check-in record or retrieve ID.');
            }
            console.log(`Check-in record created with ID: ${checkInResult.id}`);
            const checkInId = checkInResult.id;

            // Add check_in_id to related metrics
            bodyMetricsData.check_in_id = checkInId;
            wellnessMetricsData.check_in_id = checkInId;

            // Insert Body Metrics (only if there's data)
            if (Object.values(bodyMetricsData).some(v => v !== undefined && v !== null && v !== checkInId)) {
                console.log('Inserting body_metrics record...');
                const { error: bodyMetricsError } = await supabase.from('body_metrics').insert(bodyMetricsData);
                if (bodyMetricsError) throw bodyMetricsError; // Fail fast for now
                console.log('Body metrics inserted.');
            }

             // Insert Wellness Metrics (only if there's data)
            if (Object.values(wellnessMetricsData).some(v => v !== undefined && v !== null && v !== checkInId)) {
                console.log('Inserting wellness_metrics record...');
                const { error: wellnessMetricsError } = await supabase.from('wellness_metrics').insert(wellnessMetricsData);
                 if (wellnessMetricsError) throw wellnessMetricsError; // Fail fast for now
                 console.log('Wellness metrics inserted.');
            }

            // 5. Handle Success
            setSubmitSuccess(true);
            reset(); // Reset the form
            setPhotoFiles(null);
            setVideoFile(null);

        } catch (error: unknown) {
            console.error('Error submitting check-in:', error);
            let message = 'Failed to save check-in data.';
            if (typeof error === 'object' && error !== null && 'message' in error) {
                message = (error as Error).message;
            }
            // TODO: Consider deleting already uploaded files if DB insert fails?
            setSubmitError(message);
        } finally {
            setIsSubmitting(false);
            setUploadProgress(null);
        }
    };

    if (submitSuccess) {
        return (
            <div className="max-w-xl mx-auto p-6 text-center">
                <h2 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">Check-in Submitted Successfully!</h2>
                <p>Your coach will review your update shortly.</p>
                {/* TODO: Add button to go back to dashboard or view history */}
            </div>
        );
    }

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md space-y-6">
                
                <section>
                    <h3 className="text-lg font-medium mb-3 border-b border-gray-300 dark:border-gray-600 pb-1">Body Metrics</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                        <FormInput 
                            name="weight_kg" 
                            label="Weight (kg)" 
                            type="number" 
                            placeholder="e.g., 75.0"
                            step="0.1"
                        />
                        <FormInput 
                            name="body_fat_percentage"
                            label="Body Fat (%)"
                            type="number"
                            placeholder="e.g., 15.0"
                            step="0.1"
                        />
                         <FormInput 
                            name="waist_cm"
                            label="Waist (cm)"
                            type="number"
                            placeholder="e.g., 80.5"
                            step="0.1"
                        />
                         <FormInput 
                            name="hip_cm"
                            label="Hips (cm)"
                            type="number"
                            placeholder="e.g., 95.0"
                            step="0.1"
                        />
                        {/* TODO: Add inputs for other measurements (chest, arm, thigh) if defined in schema */}
                    </div>
                </section>
                
                <section>
                    <h3 className="text-lg font-medium mb-3 border-b border-gray-300 dark:border-gray-600 pb-1">Wellness</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                         <FormInput 
                            name="sleep_hours"
                            label="Avg Sleep (hours)"
                            type="number"
                            placeholder="e.g., 7.5"
                            step="0.1"
                        />
                        <FormInput 
                            name="sleep_quality"
                            label="Sleep Quality (1-5)"
                            type="number"
                            placeholder="1=Poor, 5=Great"
                        />
                        <FormInput 
                            name="stress_level"
                            label="Stress Level (1-5)"
                            type="number"
                            placeholder="1=Low, 5=High"
                        />
                        <FormInput 
                            name="fatigue_level"
                            label="Fatigue Level (1-5)"
                            type="number"
                            placeholder="1=Low, 5=High"
                        />
                        <FormInput 
                            name="motivation_level"
                            label="Motivation Level (1-5)"
                            type="number"
                            placeholder="1=Low, 5=High"
                        />
                    </div>
                     <FormInput 
                        name="digestion"
                        label="Digestion Notes (optional)"
                        type="textarea"
                        placeholder="Any issues? (e.g., Good, Bloated, etc.)"
                        rows={2}
                    />
                    {/* TODO: Add menstrual_cycle_notes field if needed */}
                </section>

                <section>
                    <h3 className="text-lg font-medium mb-3 border-b border-gray-300 dark:border-gray-600 pb-1">Adherence & Notes</h3>
                    {/* TODO: Consider replacing adherence fields with Select or Radio components */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 mb-4">
                        <FormInput 
                            name="diet_adherence"
                            label="Diet Adherence (optional)"
                            type="text" 
                            placeholder="e.g., Perfect, Good, Off track..."
                        />
                         <FormInput 
                            name="training_adherence"
                            label="Training Adherence (optional)"
                            type="text" 
                            placeholder="e.g., All sessions hit, Missed 1, etc."
                        />
                         <FormInput 
                            name="steps_adherence"
                            label="Steps Adherence (optional)"
                            type="text" 
                            placeholder="e.g., Hit target, Slightly under..."
                        />
                    </div>
                    <FormInput 
                        name="notes"
                        label="General Notes / How was your week? (optional)"
                        type="textarea"
                        placeholder="Any challenges, successes, questions for your coach?"
                        rows={4}
                    />
                </section>

                <section>
                    <h3 className="text-lg font-medium mb-3 border-b border-gray-300 dark:border-gray-600 pb-1">Progress Media</h3>
                    {/* Photo Input */}
                    <div className="mb-4">
                        <label htmlFor="photos" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Progress Photos (select multiple)
                        </label>
                        <input
                            id="photos"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handlePhotoChange}
                            disabled={isSubmitting}
                            className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800 disabled:opacity-50"
                        />
                         {photoFiles && <p className="text-xs mt-1 text-gray-500">{photoFiles.length} photo(s) selected.</p>}
                    </div>
                    
                    {/* Video Input */}
                    <div className="mb-4">
                        <label htmlFor="video" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Progress Video (optional)
                        </label>
                        <input
                            id="video"
                            type="file"
                            accept="video/*"
                            onChange={handleVideoChange}
                            disabled={isSubmitting}
                            className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800 disabled:opacity-50"
                        />
                        {videoFile && <p className="text-xs mt-1 text-gray-500">Video selected: {videoFile.name}</p>}
                    </div>

                    {/* Placeholder for upload progress bar */}
                    {isSubmitting && uploadProgress !== null && (
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                            <p className="text-xs text-center mt-1">Uploading media: {uploadProgress}%</p>
                        </div>
                    )}
                </section>

                {/* Submission Error Display */}
                {submitError && (
                    <p className="mt-4 text-sm text-center text-red-600 dark:text-red-400">Error: {submitError}</p>
                )}

                {/* Submit Button */}
                <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 dark:focus:ring-offset-gray-800"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Check-in'}
                </button>
            </form>
        </FormProvider>
    );
};

export default CheckInForm; 