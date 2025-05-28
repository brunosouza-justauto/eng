import React, { useState, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { supabase } from '../../services/supabaseClient';
import FormInput from '../ui/FormInput';
import { v4 as uuidv4 } from 'uuid';
import { formatDate } from '../../utils/dateUtils';

// Spinner component for loading states
const Spinner = ({ size = "small" }: { size?: "small" | "medium" | "large" }) => {
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-6 h-6",
    large: "w-8 h-8"
  };
  
  return (
    <div className={`inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent ${sizeClasses[size]} text-blue-600 dark:text-blue-400 align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]`} 
      role="status">
      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
        Loading...
      </span>
    </div>
  );
};

// Define Zod schema for check-in data (refine as needed)
const checkInSchema = z.object({
    // Check-in date
    check_in_date: z.string().min(1, 'Date is required'),
    
    // Body Metrics - All of these are optional now
    weight_kg: z.coerce.number({invalid_type_error: 'Weight must be a number'})
        .positive('Weight must be greater than 0'),
    body_fat_percentage: z.union([
        z.string().trim().transform(val => val === "" ? null : val).nullable(),
        z.coerce.number().min(0).max(100, 'Body fat % must be between 0 and 100').nullable()
    ]).nullable().optional(),
    waist_cm: z.union([
        z.string().trim().transform(val => val === "" ? null : val).nullable(),
        z.coerce.number().positive('Waist must be greater than 0').nullable()
    ]).nullable().optional(),
    hip_cm: z.union([
        z.string().trim().transform(val => val === "" ? null : val).nullable(),
        z.coerce.number().positive('Hip measurement must be greater than 0').nullable()
    ]).nullable().optional(),
    
    // Updated limb measurements to support left/right
    left_arm_cm: z.union([
        z.string().trim().transform(val => val === "" ? null : val).nullable(),
        z.coerce.number().positive('Left arm measurement must be greater than 0').nullable()
    ]).nullable().optional(),
    right_arm_cm: z.union([
        z.string().trim().transform(val => val === "" ? null : val).nullable(),
        z.coerce.number().positive('Right arm measurement must be greater than 0').nullable()
    ]).nullable().optional(),
    chest_cm: z.union([
        z.string().trim().transform(val => val === "" ? null : val).nullable(),
        z.coerce.number().positive('Chest measurement must be greater than 0').nullable()
    ]).nullable().optional(),
    left_thigh_cm: z.union([
        z.string().trim().transform(val => val === "" ? null : val).nullable(),
        z.coerce.number().positive('Left thigh measurement must be greater than 0').nullable()
    ]).nullable().optional(),
    right_thigh_cm: z.union([
        z.string().trim().transform(val => val === "" ? null : val).nullable(),
        z.coerce.number().positive('Right thigh measurement must be greater than 0').nullable()
    ]).nullable().optional(),

    // Wellness Metrics
    sleep_hours: z.coerce.number().nonnegative().max(24, 'Sleep hours must be between 0 and 24'),
    sleep_quality: z.coerce.number().int().min(1).max(5), // 1-5 scale
    stress_level: z.coerce.number().int().min(1).max(5), // 1-5 scale
    fatigue_level: z.coerce.number().int().min(1).max(5), // 1-5 scale
    digestion: z.string().trim().optional().nullable(),
    motivation_level: z.coerce.number().int().min(1).max(5), // 1-5 scale
    menstrual_cycle_notes: z.string().trim().optional().nullable(),

    // Adherence
    diet_adherence: z.string().trim().min(1, 'Diet adherence is required'),
    training_adherence: z.string().trim().min(1, 'Training adherence is required'),
    steps_adherence: z.string().trim().min(1, 'Steps adherence is required'),
    notes: z.string().trim().min(1, 'General notes are required'),

    // Media - handled separately, not part of Zod schema for direct form values
    // photos: z.any(),
    // video_url: z.string().url().optional().nullable(),
});

type CheckInData = z.infer<typeof checkInSchema>;

// Define DB table structures (subset, based on form schema)
interface CheckInInsert {
    user_id: string;
    check_in_date: string; // Now required
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
    // Updated to support left/right measurements
    left_arm_cm?: number | null;
    right_arm_cm?: number | null;
    chest_cm?: number | null;
    left_thigh_cm?: number | null;
    right_thigh_cm?: number | null;
}

interface WellnessMetricsInsert {
    check_in_id?: string; // Will be set after check_in insert
    sleep_hours?: number | null;
    sleep_quality?: number | null;
    stress_level?: number | null;
    fatigue_level?: number | null;
    digestion?: string | null;
    motivation_level?: number | null;
    menstrual_cycle_notes?: string | null;
    // Add other metrics
}

// Define rating scales for consistent use
const RATING_SCALE = [
    { value: "1", label: "1 - Very Low" },
    { value: "2", label: "2 - Low" },
    { value: "3", label: "3 - Moderate" },
    { value: "4", label: "4 - High" },
    { value: "5", label: "5 - Very High" }
];

// Define adherence options for consistent use
const ADHERENCE_OPTIONS = [
    { value: "Perfect", label: "Perfect - 100% On Plan" },
    { value: "Good", label: "Good - Mostly On Plan" },
    { value: "Average", label: "Average - Some Deviations" },
    { value: "Poor", label: "Poor - Significant Deviations" },
    { value: "Off Track", label: "Off Track - Did Not Follow Plan" }
];

// Define our photo types for structure
type PhotoPosition = 'front' | 'side' | 'back';

interface PhotoCapture {
  position: PhotoPosition;
  file: File | null;
  preview: string | null;
}

interface CheckInFormProps {
    defaultDate?: string; // YYYY-MM-DD format
    onSubmitSuccess?: () => void; // Add callback for submission success
}

const CheckInForm: React.FC<CheckInFormProps> = ({ 
    defaultDate = formatDate(new Date()),
    onSubmitSuccess
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
    const profile = useSelector(selectProfile);
    
    // Replace single photoFiles state with structured photos
    const [photos, setPhotos] = useState<Record<PhotoPosition, PhotoCapture>>({
        front: { position: 'front', file: null, preview: null },
        side: { position: 'side', file: null, preview: null },
        back: { position: 'back', file: null, preview: null }
    });
    
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [isCameraActive, setIsCameraActive] = useState<PhotoPosition | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    
    // Refs for camera functionality
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRefs = {
        front: useRef<HTMLInputElement>(null),
        side: useRef<HTMLInputElement>(null),
        back: useRef<HTMLInputElement>(null)
    };

    const methods = useForm<CheckInData>({
        resolver: zodResolver(checkInSchema),
        mode: 'onBlur',
        defaultValues: {
            check_in_date: defaultDate,
        }
    });

    const { handleSubmit, reset } = methods;

    // Handle photo selection from device
    const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>, position: PhotoPosition) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const previewUrl = URL.createObjectURL(file);
            
            setPhotos(prev => ({
                ...prev,
                [position]: {
                    ...prev[position],
                    file,
                    preview: previewUrl
                }
            }));
        }
    };

    // Start camera for capturing a photo
    const startCamera = async (position: PhotoPosition) => {
        setCameraReady(false);
        setCameraError(null);
        setIsCameraActive(position);
        
        // Try environment camera first (back camera)
        try {
            await initializeCamera('environment');
            return;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
            try {
                // Fallback to user camera (front camera)
                await initializeCamera('user');
                return;
            } catch (frontErr) {
                handleCameraError(frontErr);
            }
        }
    };

    const initializeCamera = async (facingMode: 'environment' | 'user') => {
        // First, ensure any previous stream is stopped
        stopCameraStream();
        
        // Request camera with appropriate settings
        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        if (!videoRef.current) {
            throw new Error("Video element reference not available");
        }
        
        // Connect the stream to the video element
        videoRef.current.srcObject = stream;
        
        // Wait for the video to be ready
        await new Promise<void>((resolve, reject) => {
            if (!videoRef.current) return reject("No video element");
            
            // Set up event handlers
            const loadedHandler = () => {
                resolve();
            };
            
            const errorHandler = (e: Event | string) => {
                console.error("Video element error:", e);
                reject("Failed to load video");
            };
            
            videoRef.current.onloadedmetadata = loadedHandler;
            videoRef.current.onerror = errorHandler as OnErrorEventHandler;
            
            // If metadata is already loaded, resolve immediately
            if (videoRef.current.readyState >= 2) {
                resolve();
            }
        });
        
        // Start playing the video
        await videoRef.current.play();
        setCameraReady(true);
    };
    
    const handleCameraError = (err: Error | unknown) => {
        console.error("Camera access error:", err);
        let errorMessage = "Could not access camera. ";
        
        // Check if the error has a name property
        const errorWithName = err as { name?: string };
        
        if (errorWithName.name === "NotAllowedError" || errorWithName.name === "PermissionDeniedError") {
            errorMessage += "Please grant camera permission and try again.";
        } else if (errorWithName.name === "NotFoundError" || errorWithName.name === "DevicesNotFoundError") {
            errorMessage += "No camera found on your device.";
        } else if (errorWithName.name === "NotReadableError" || errorWithName.name === "TrackStartError") {
            errorMessage += "Camera is already in use by another application.";
        } else if (errorWithName.name === "OverconstrainedError" || errorWithName.name === "ConstraintNotSatisfiedError") {
            errorMessage += "Camera does not meet requirements. Try a different camera.";
        } else {
            errorMessage += "Please check your camera and try again.";
        }
        
        setCameraError(errorMessage);
        setIsCameraActive(null);
        setCameraReady(false);
    };

    // Capture photo from camera
    const capturePhoto = () => {
        if (!isCameraActive || !videoRef.current || !canvasRef.current || !cameraReady) {
            console.error("Cannot capture photo: camera not ready");
            return;
        }
        
        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            // Set canvas dimensions to match video dimensions
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Draw the video frame to the canvas
            const context = canvas.getContext('2d');
            if (!context) {
                throw new Error("Could not get canvas context");
            }
            
            // Draw the current video frame
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert canvas to blob
            canvas.toBlob((blob) => {
                if (!blob) {
                    throw new Error("Failed to create blob from canvas");
                }
                
                // Create file from blob
                const file = new File([blob], `${isCameraActive}-photo.jpg`, { type: 'image/jpeg' });
                const previewUrl = URL.createObjectURL(blob);
                
                // Update state with the captured photo
                setPhotos(prev => ({
                    ...prev,
                    [isCameraActive!]: {
                        ...prev[isCameraActive!],
                        file,
                        preview: previewUrl
                    }
                }));
                
                // Stop the camera
                stopCamera();
            }, 'image/jpeg', 0.92);
        } catch (err) {
            console.error("Error capturing photo:", err);
            alert("Failed to capture photo. Please try again.");
        }
    };
    
    // Stop the camera stream and reset state
    const stopCamera = () => {
        stopCameraStream();
        setIsCameraActive(null);
        setCameraReady(false);
        setCameraError(null);
    };
    
    // Helper to stop stream only
    const stopCameraStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    // Clear a specific photo
    const clearPhoto = (position: PhotoPosition) => {
        setPhotos(prev => ({
            ...prev,
            [position]: {
                ...prev[position],
                file: null,
                preview: null
            }
        }));
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
        const filePath = `${profile!.user_id}/${folder}/${fileName}`;

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

        return filePath; // Return the storage path
    };

    const onSubmit = async (formData: CheckInData) => {
        if (!profile || !profile.user_id) {
            console.error("No valid profile or user_id found:", profile);
            setSubmitError('User profile not found. Please log in again.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(false);
        setUploadProgress(0); // Start progress at 0

        let uploadedPhotoPaths: string[] = [];
        let uploadedVideoPath: string | undefined = undefined;

        try {
            // 1. Upload Photos (now structured as front, side, back)
            const photoFiles = Object.values(photos)
                .filter(photo => photo.file !== null)
                .map(photo => photo.file) as File[];
                
            if (photoFiles.length > 0) {
                const uploadPromises = photoFiles.map(async (file, index) => {
                    const path = await uploadFile(file, 'photos');
                    // Rough progress update
                    setUploadProgress(Math.round(((index + 1) / (photoFiles.length + (videoFile ? 1 : 0))) * 100));
                    return path;
                });
                uploadedPhotoPaths = await Promise.all(uploadPromises);
            }

            // 2. Upload Video (if present)
            if (videoFile) {
                uploadedVideoPath = await uploadFile(videoFile, 'videos');
                setUploadProgress(100); // Mark as complete after video (if exists)
            }
            
            setUploadProgress(null); // Clear progress indicator

            // 3. Prepare data for DB insertion
            const checkInData: CheckInInsert = {
                user_id: profile.user_id,
                check_in_date: formData.check_in_date,
                photos: uploadedPhotoPaths.length > 0 ? uploadedPhotoPaths : undefined,
                video_url: uploadedVideoPath,
                diet_adherence: formData.diet_adherence,
                training_adherence: formData.training_adherence,
                steps_adherence: formData.steps_adherence,
                notes: formData.notes,
            };

            const bodyMetricsData: BodyMetricsInsert = {
                weight_kg: Number(formData.weight_kg) || null,
                body_fat_percentage: formData.body_fat_percentage ? Number(formData.body_fat_percentage) : null,
                waist_cm: formData.waist_cm ? Number(formData.waist_cm) : null,
                hip_cm: formData.hip_cm ? Number(formData.hip_cm) : null,
                // Updated to use left/right measurements
                left_arm_cm: formData.left_arm_cm ? Number(formData.left_arm_cm) : null,
                right_arm_cm: formData.right_arm_cm ? Number(formData.right_arm_cm) : null,
                chest_cm: formData.chest_cm ? Number(formData.chest_cm) : null,
                left_thigh_cm: formData.left_thigh_cm ? Number(formData.left_thigh_cm) : null,
                right_thigh_cm: formData.right_thigh_cm ? Number(formData.right_thigh_cm) : null,
            };

            const wellnessMetricsData: WellnessMetricsInsert = {
                sleep_hours: formData.sleep_hours,
                sleep_quality: formData.sleep_quality,
                stress_level: formData.stress_level,
                fatigue_level: formData.fatigue_level,
                digestion: formData.digestion,
                motivation_level: formData.motivation_level,
                menstrual_cycle_notes: formData.menstrual_cycle_notes,
                // Map other metrics
            };

            // 4. Insert data into DB (handle potential partial failures if not using transaction)
            const { data: checkInResult, error: checkInError } = await supabase
                .from('check_ins')
                .insert(checkInData)
                .select('id') // Select the ID of the newly created check-in
                .single();

            if (checkInError || !checkInResult?.id) {
                console.error("Error inserting check-in record:", checkInError);
                throw checkInError || new Error('Failed to create check-in record or retrieve ID.');
            }
            const checkInId = checkInResult.id;

            // Add check_in_id to related metrics
            bodyMetricsData.check_in_id = checkInId;
            wellnessMetricsData.check_in_id = checkInId;

            // Insert Body Metrics (only if there's data)
            if (Object.values(bodyMetricsData).some(v => v !== undefined && v !== null && v !== checkInId)) {
                const { error: bodyMetricsError } = await supabase.from('body_metrics').insert(bodyMetricsData);
                if (bodyMetricsError) throw bodyMetricsError; // Fail fast for now
            }

             // Insert Wellness Metrics (only if there's data)
            if (Object.values(wellnessMetricsData).some(v => v !== undefined && v !== null && v !== checkInId)) {
                const { error: wellnessMetricsError } = await supabase.from('wellness_metrics').insert(wellnessMetricsData);
                 if (wellnessMetricsError) throw wellnessMetricsError; // Fail fast for now
            }

            // 5. Handle Success
            setSubmitSuccess(true);
            reset(); // Reset the form
            
            // Reset photo and video states
            setPhotos({
                front: { position: 'front', file: null, preview: null },
                side: { position: 'side', file: null, preview: null },
                back: { position: 'back', file: null, preview: null }
            });
            setVideoFile(null);
            
            // Call the callback if provided
            if (onSubmitSuccess) {
                onSubmitSuccess();
            }

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

    // Modified component to render a select dropdown with label
    const SelectInput = ({ 
        name, 
        label, 
        options, 
        placeholder = "Select an option"
    }: { 
        name: keyof CheckInData, 
        label: string, 
        options: {value: string, label: string}[],
        placeholder?: string
    }) => {
        return (
            <div className="mb-4">
                <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label}
                </label>
                <select
                    id={name}
                    {...methods.register(name)}
                    className="block w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    disabled={isSubmitting}
                >
                    <option value="">{placeholder}</option>
                    {options.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
        );
    };

    // Only show the success message if we're not using the parent's success handling
    if (submitSuccess && !onSubmitSuccess) {
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
                
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Fields marked with an asterisk (*) are required.
                </div>
                
                <section>
                    <h3 className="text-lg font-medium mb-3 border-b border-gray-300 dark:border-gray-600 pb-1">Body Metrics</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                        <FormInput 
                            name="weight_kg" 
                            label="Weight (kg) *" 
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
                        <FormInput 
                            name="left_arm_cm"
                            label="Left Arm (cm)"
                            type="number"
                            placeholder="e.g., 35.0"
                            step="0.1"
                        />
                        <FormInput 
                            name="right_arm_cm"
                            label="Right Arm (cm)"
                            type="number"
                            placeholder="e.g., 35.0"
                            step="0.1"
                        />
                        <FormInput 
                            name="chest_cm"
                            label="Chest (cm)"
                            type="number"
                            placeholder="e.g., 100.0"
                            step="0.1"
                        />
                        <FormInput 
                            name="left_thigh_cm"
                            label="Left Thigh (cm)"
                            type="number"
                            placeholder="e.g., 60.0"
                            step="0.1"
                        />
                        <FormInput 
                            name="right_thigh_cm"
                            label="Right Thigh (cm)"
                            type="number"
                            placeholder="e.g., 60.0"
                            step="0.1"
                        />
                    </div>
                </section>
                
                <section>
                    <h3 className="text-lg font-medium mb-3 border-b border-gray-300 dark:border-gray-600 pb-1">Wellness</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                         <FormInput 
                            name="sleep_hours"
                            label="Avg Sleep (hours) *"
                            type="number"
                            placeholder="e.g., 7.5"
                            step="0.1"
                        />
                        <SelectInput
                            name="sleep_quality"
                            label="Sleep Quality *"
                            options={RATING_SCALE}
                            placeholder="Select sleep quality..."
                        />
                        <SelectInput
                            name="stress_level"
                            label="Stress Level *"
                            options={RATING_SCALE}
                            placeholder="Select stress level..."
                        />
                        <SelectInput
                            name="fatigue_level"
                            label="Fatigue Level *"
                            options={RATING_SCALE}
                            placeholder="Select fatigue level..."
                        />
                        <SelectInput
                            name="motivation_level"
                            label="Motivation Level *"
                            options={RATING_SCALE}
                            placeholder="Select motivation level..."
                        />
                    </div>
                     <FormInput 
                        name="digestion"
                        label="Digestion Notes (optional)"
                        type="textarea"
                        placeholder="Any issues? (e.g., Good, Bloated, etc.)"
                        rows={2}
                    />
                    <FormInput 
                        name="menstrual_cycle_notes"
                        label="Menstrual Cycle Notes (optional)"
                        type="textarea"
                        placeholder="Note any details about your cycle if relevant"
                        rows={2}
                    />
                </section>

                <section>
                    <h3 className="text-lg font-medium mb-3 border-b border-gray-300 dark:border-gray-600 pb-1">Adherence & Notes</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 mb-4">
                        <SelectInput
                            name="diet_adherence"
                            label="Diet Adherence *"
                            options={ADHERENCE_OPTIONS}
                            placeholder="Select diet adherence..."
                        />
                        <SelectInput
                            name="training_adherence"
                            label="Training Adherence *"
                            options={ADHERENCE_OPTIONS}
                            placeholder="Select training adherence..."
                        />
                        <SelectInput
                            name="steps_adherence"
                            label="Steps Adherence *"
                            options={ADHERENCE_OPTIONS}
                            placeholder="Select steps adherence..."
                        />
                    </div>
                    <FormInput 
                        name="notes"
                        label="General Notes / How was your week? *"
                        type="textarea"
                        placeholder="Any challenges, successes, questions for your coach?"
                        rows={4}
                    />
                </section>

                <section>
                    <h3 className="text-lg font-medium mb-3 border-b border-gray-300 dark:border-gray-600 pb-1">Progress Media</h3>
                    
                    {/* Camera UI - Only shown when camera is active */}
                    {isCameraActive && (
                        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex flex-col items-center justify-center p-4">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg w-full max-w-lg">
                                <h4 className="text-lg font-semibold mb-4 text-center">
                                    Take {isCameraActive.charAt(0).toUpperCase() + isCameraActive.slice(1)} Photo
                                </h4>
                                
                                <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                                    {cameraError ? (
                                        <div className="p-4 text-red-500 text-center">
                                            <p>{cameraError}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <video 
                                                ref={videoRef} 
                                                playsInline 
                                                className="w-full h-auto"
                                            />
                                            {!cameraReady && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                                                    <div className="text-white text-center">
                                                        <Spinner size="medium" />
                                                        <p className="mt-2">Initializing camera...</p>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                
                                <div className="flex justify-between">
                                    <button 
                                        type="button"
                                        onClick={stopCamera}
                                        className="py-2 px-4 bg-gray-500 text-white rounded hover:bg-gray-600"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={capturePhoto}
                                        disabled={!cameraReady || !!cameraError}
                                        className={`py-2 px-4 rounded ${
                                            cameraReady && !cameraError
                                                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                                : "bg-gray-400 text-gray-200 cursor-not-allowed"
                                        }`}
                                    >
                                        {cameraReady ? "Capture" : "Waiting..."}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Hidden canvas for processing camera capture */}
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Structured Photo Upload UI */}
                    <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Progress Photos</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            Please upload or take photos from three angles to track your physical progress. Photos should be taken in good lighting with minimal/fitted clothing for accurate assessment.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {(['front', 'side', 'back'] as PhotoPosition[]).map((position) => (
                                <div key={position} className="border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                                    <h5 className="text-sm font-medium mb-2 capitalize">
                                        {position} View
                                    </h5>
                                    
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                        {position === 'front' ? 
                                            'Stand facing the camera with arms slightly away from sides, palms facing forward.' : 
                                            position === 'side' ? 
                                            'Stand sideways (right side preferred) with arms at sides or slightly forward.' : 
                                            'Stand with your back to the camera, arms slightly away from body.'}
                                    </p>
                                    
                                    {photos[position].preview ? (
                                        <div className="relative">
                                            <img 
                                                src={photos[position].preview} 
                                                alt={`${position} view`}
                                                className="w-full h-32 object-cover rounded"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => clearPhoto(position)}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                disabled={isSubmitting}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <input
                                                id={`photo-${position}`}
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handlePhotoChange(e, position)}
                                                ref={fileInputRefs[position]}
                                                disabled={isSubmitting}
                                                className="hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRefs[position].current?.click()}
                                                className="w-full py-1 px-2 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                disabled={isSubmitting}
                                            >
                                                Select from Gallery
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => startCamera(position)}
                                                className="w-full py-1 px-2 bg-indigo-50 dark:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 rounded text-sm text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800"
                                                disabled={isSubmitting}
                                            >
                                                Take Photo
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Video Input - Keep existing functionality */}
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
                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-3">
                            <div 
                                className="bg-blue-600 h-2.5 rounded-full relative overflow-hidden transition-all duration-300" 
                                style={{ width: `${uploadProgress}%` }}
                            >
                                {/* Animated gradient overlay */}
                                <div className="absolute inset-0 w-full h-full animate-gradient-x bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 bg-200"></div>
                            </div>
                            <div className="flex items-center justify-center mt-2 space-x-2">
                                <Spinner size="small" />
                                <p className="text-sm text-center">
                                    Uploading media: {uploadProgress}%
                                </p>
                            </div>
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
                    {isSubmitting ? (
                        <div className="flex items-center">
                            <Spinner size="small" />
                            <span className="ml-2">Submitting...</span>
                        </div>
                    ) : 'Submit Check-in'}
                </button>
            </form>
        </FormProvider>
    );
};

export default CheckInForm; 