import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { supabase } from '../../services/supabaseClient';
import { format } from 'date-fns'; // For formatting dates
import { FiEdit2, FiX, FiImage, FiSave } from 'react-icons/fi';

// Define rating scales for consistent use (from CheckInForm)
const RATING_SCALE = [
    { value: "1", label: "1 - Very Low" },
    { value: "2", label: "2 - Low" },
    { value: "3", label: "3 - Moderate" },
    { value: "4", label: "4 - High" },
    { value: "5", label: "5 - Very High" }
];

// Define adherence options for consistent use (from CheckInForm)
const ADHERENCE_OPTIONS = [
    { value: "Perfect", label: "Perfect - 100% On Plan" },
    { value: "Good", label: "Good - Mostly On Plan" },
    { value: "Average", label: "Average - Some Deviations" },
    { value: "Poor", label: "Poor - Significant Deviations" },
    { value: "Off Track", label: "Off Track - Did Not Follow Plan" }
];

// Interface for Supabase response structure
interface CheckInSupabaseResponse {
    id: string;
    check_in_date: string;
    notes: string | null;
    photos: string[] | null;
    video_url: string | null;
    diet_adherence: string | null;
    training_adherence: string | null;
    steps_adherence: string | null;
    body_metrics: {
        id: string;
        weight_kg: number | null;
        body_fat_percentage: number | null;
        waist_cm: number | null;
        hip_cm: number | null;
        left_arm_cm: number | null;
        right_arm_cm: number | null;
        chest_cm: number | null;
        left_thigh_cm: number | null;
        right_thigh_cm: number | null;
    }[] | null;
    wellness_metrics: {
        id: string;
        sleep_hours: number | null;
        sleep_quality: number | null;
        stress_level: number | null;
        fatigue_level: number | null;
        motivation_level: number | null;
        digestion: string | null;
    }[] | null;
}

const ITEMS_PER_PAGE = 5; // Set a smaller number of items per page for better UX

const CheckInTimeline: React.FC = () => {
    const [checkIns, setCheckIns] = useState<CheckInSupabaseResponse[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [editingCheckIn, setEditingCheckIn] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [editForm, setEditForm] = useState<{[key: string]: any}>({});
    const profile = useSelector(selectProfile);
    
    // Reference for the intersection observer
    const observer = useRef<IntersectionObserver | null>(null);
    // Reference for the last item element
    const lastCheckInRef = useRef<HTMLDivElement | null>(null);
    // Reference for file input - create a separate ref for each check-in to avoid conflicts
    const fileInputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});

    // Function to fetch check-ins
    const fetchCheckIns = useCallback(async (pageNumber: number, append: boolean = false) => {
        if (!profile || !profile.user_id) {
            setIsLoading(false);
            return;
        }

        // Set loading states based on whether this is initial load or loading more
        if (append) {
            setIsLoadingMore(true);
        } else {
            setIsLoading(true);
            setError(null);
            if (!append) setCheckIns([]);
        }

        try {
            const offset = pageNumber * ITEMS_PER_PAGE;
            const { data, error: fetchError } = await supabase
                .from('check_ins')
                .select(`
                    id,
                    check_in_date,
                    notes,
                    photos,
                    video_url,
                    diet_adherence,
                    training_adherence,
                    steps_adherence,
                    body_metrics (
                        id,
                        weight_kg,
                        body_fat_percentage,
                        waist_cm,
                        hip_cm,
                        left_arm_cm,
                        right_arm_cm,
                        chest_cm,
                        left_thigh_cm,
                        right_thigh_cm
                    ), 
                    wellness_metrics (
                        id,
                        sleep_hours,
                        sleep_quality,
                        stress_level,
                        fatigue_level,
                        motivation_level,
                        digestion
                    )
                `)
                .eq('user_id', profile.user_id)
                .order('check_in_date', { ascending: false })
                .range(offset, offset + ITEMS_PER_PAGE - 1);
            
            if (fetchError) throw fetchError;

            // Check if we've reached the end of the data
            if (!data || data.length < ITEMS_PER_PAGE) {
                setHasMore(false);
            }
            
            // Update state with new data
            if (append) {
                setCheckIns(prev => [...prev, ...data]);
            } else {
                setCheckIns(data);
            }

        } catch (err: unknown) {
            console.error("Error fetching check-in history:", err);
            let message = 'Failed to load check-in history.';
            if (typeof err === 'object' && err !== null && 'message' in err) {
                message = (err as Error).message;
            }
            setError(message);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [profile]);

    // Initial data loading
    useEffect(() => {
        fetchCheckIns(0, false);
    }, [fetchCheckIns]);
    
    // Setup the intersection observer for infinite scrolling
    const lastCheckInCallback = useCallback((node: HTMLDivElement) => {
        if (isLoadingMore) return;
        
        // Disconnect previous observer if it exists
        if (observer.current) observer.current.disconnect();
        
        // Create a new observer
        observer.current = new IntersectionObserver(entries => {
            // If the last item is visible and we have more items to load
            if (entries[0].isIntersecting && hasMore) {
                fetchCheckIns(checkIns.length / ITEMS_PER_PAGE, true);
            }
        });
        
        // Observe the last item
        if (node) {
            lastCheckInRef.current = node;
            observer.current.observe(node);
        }
    }, [hasMore, isLoadingMore, fetchCheckIns, checkIns.length]);

    // Function to handle file upload for a check-in
    const handlePhotoUpload = async (checkInId: string, files: FileList) => {
        if (!profile?.user_id) return;
        
        setIsUploading(true);
        setUploadError(null);
        
        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                // Create a unique file name to avoid collisions
                const fileName = `${profile.user_id}/${checkInId}/${Date.now()}-${file.name}`;
                
                // Upload the file to Supabase storage
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { data, error } = await supabase.storage
                    .from('progress-media')
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                    });
                
                if (error) throw error;
                return fileName;
            });
            
            // Wait for all uploads to complete
            const uploadedFilePaths = await Promise.all(uploadPromises);
            
            // Get the current check-in to update its photos
            const checkInToUpdate = checkIns.find(checkIn => checkIn.id === checkInId);
            if (!checkInToUpdate) throw new Error('Check-in not found');
            
            // Combine existing photos with new ones
            const updatedPhotos = [...(checkInToUpdate.photos || []), ...uploadedFilePaths];
            
            // Update the check-in in the database
            const { error: updateError } = await supabase
                .from('check_ins')
                .update({ photos: updatedPhotos })
                .eq('id', checkInId);
            
            if (updateError) throw updateError;
            
            // Update the local state
            setCheckIns(prevCheckIns => 
                prevCheckIns.map(checkIn => 
                    checkIn.id === checkInId ? { ...checkIn, photos: updatedPhotos } : checkIn
                )
            );
            
            // Exit edit mode
            setEditingCheckIn(null);
        } catch (err) {
            console.error('Error uploading photos:', err);
            setUploadError('Failed to upload photos. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };
    
    // Function to get public URL for storage items
    const getPublicUrl = (filePath: string | null | undefined): string | null => {
        if (!filePath) return null;
        try {
            // Make sure filePath doesn't already include the bucket name or any prefixes
            let path = filePath;
            if (path.startsWith('progress-media/')) {
                path = path.slice('progress-media/'.length);
            }
            if (path.startsWith('/')) {
                path = path.slice(1);
            }
            
            const { data } = supabase.storage.from('progress-media').getPublicUrl(path);
            return data?.publicUrl || null;
        } catch (error) {
            console.error('Error getting public URL:', error);
            return null;
        }
    };

    // Helper function to safely display metric values
    const displayMetric = (value: number | null | undefined, unit: string = '') => {
        // Check explicitly for null or undefined, but allow 0 values
        return value !== null && value !== undefined ? `${value}${unit}` : 'N/A';
    };

    // Function to start editing a check-in
    const startEditing = (checkIn: CheckInSupabaseResponse) => {
        setEditingCheckIn(checkIn.id);
        setSaveError(null);
        
        // Get the first (and should be only) body_metrics and wellness_metrics records
        const bodyMetrics = Array.isArray(checkIn.body_metrics) ? checkIn.body_metrics[0] : checkIn.body_metrics;
        const wellnessMetrics = Array.isArray(checkIn.wellness_metrics) ? checkIn.wellness_metrics[0] : checkIn.wellness_metrics;
        
        // Initialize form with current values
        setEditForm({
            [checkIn.id]: {
                // Basic info
                notes: checkIn.notes || '',
                diet_adherence: checkIn.diet_adherence || '',
                training_adherence: checkIn.training_adherence || '',
                steps_adherence: checkIn.steps_adherence || '',
                
                // Body metrics - handle both null and undefined cases
                weight_kg: bodyMetrics?.weight_kg?.toString() || '',
                body_fat_percentage: bodyMetrics?.body_fat_percentage?.toString() || '',
                waist_cm: bodyMetrics?.waist_cm?.toString() || '',
                hip_cm: bodyMetrics?.hip_cm?.toString() || '',
                left_arm_cm: bodyMetrics?.left_arm_cm?.toString() || '',
                right_arm_cm: bodyMetrics?.right_arm_cm?.toString() || '',
                chest_cm: bodyMetrics?.chest_cm?.toString() || '',
                left_thigh_cm: bodyMetrics?.left_thigh_cm?.toString() || '',
                right_thigh_cm: bodyMetrics?.right_thigh_cm?.toString() || '',
                
                // Wellness metrics - handle both null and undefined cases
                sleep_hours: wellnessMetrics?.sleep_hours?.toString() || '',
                sleep_quality: wellnessMetrics?.sleep_quality?.toString() || '',
                stress_level: wellnessMetrics?.stress_level?.toString() || '',
                fatigue_level: wellnessMetrics?.fatigue_level?.toString() || '',
                motivation_level: wellnessMetrics?.motivation_level?.toString() || '',
                digestion: wellnessMetrics?.digestion || ''
            }
        });
    };

    // Function to update form values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFormValue = (checkInId: string, field: string, value: any) => {
        setEditForm(prev => ({
            ...prev,
            [checkInId]: {
                ...prev[checkInId],
                [field]: value
            }
        }));
    };

    // Function to save check-in changes
    const saveCheckInChanges = async (checkInId: string) => {
        setIsSaving(true);
        setSaveError(null);
        
        try {
            const formData = editForm[checkInId];
            if (!formData) throw new Error('No form data found');
            
            const checkIn = checkIns.find(ci => ci.id === checkInId);
            if (!checkIn) throw new Error('Check-in not found');

            // Update main check-in record
            const { error: checkInError } = await supabase
                .from('check_ins')
                .update({
                    notes: formData.notes || null,
                    diet_adherence: formData.diet_adherence || null,
                    training_adherence: formData.training_adherence || null,
                    steps_adherence: formData.steps_adherence || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', checkInId);
            
            if (checkInError) throw checkInError;

            // Update body metrics if they exist
            const bodyMetrics = Array.isArray(checkIn.body_metrics) ? checkIn.body_metrics[0] : checkIn.body_metrics;
            if (bodyMetrics?.id) {
                const { error: bodyError } = await supabase
                    .from('body_metrics')
                    .update({
                        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
                        body_fat_percentage: formData.body_fat_percentage ? parseFloat(formData.body_fat_percentage) : null,
                        waist_cm: formData.waist_cm ? parseFloat(formData.waist_cm) : null,
                        hip_cm: formData.hip_cm ? parseFloat(formData.hip_cm) : null,
                        left_arm_cm: formData.left_arm_cm ? parseFloat(formData.left_arm_cm) : null,
                        right_arm_cm: formData.right_arm_cm ? parseFloat(formData.right_arm_cm) : null,
                        chest_cm: formData.chest_cm ? parseFloat(formData.chest_cm) : null,
                        left_thigh_cm: formData.left_thigh_cm ? parseFloat(formData.left_thigh_cm) : null,
                        right_thigh_cm: formData.right_thigh_cm ? parseFloat(formData.right_thigh_cm) : null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', bodyMetrics.id);
                
                if (bodyError) throw bodyError;
            }

            // Update wellness metrics if they exist
            const wellnessMetrics = Array.isArray(checkIn.wellness_metrics) ? checkIn.wellness_metrics[0] : checkIn.wellness_metrics;
            if (wellnessMetrics?.id) {
                const { error: wellnessError } = await supabase
                    .from('wellness_metrics')
                    .update({
                        sleep_hours: formData.sleep_hours ? parseFloat(formData.sleep_hours) : null,
                        sleep_quality: formData.sleep_quality ? parseInt(formData.sleep_quality) : null,
                        stress_level: formData.stress_level ? parseInt(formData.stress_level) : null,
                        fatigue_level: formData.fatigue_level ? parseInt(formData.fatigue_level) : null,
                        motivation_level: formData.motivation_level ? parseInt(formData.motivation_level) : null,
                        digestion: formData.digestion || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', wellnessMetrics.id);
                
                if (wellnessError) throw wellnessError;
            }

            // Refresh the data to show updated values
            await fetchCheckIns(0, false);
            
            // Exit edit mode
            setEditingCheckIn(null);
            setEditForm(prev => ({ ...prev, [checkInId]: undefined }));
            
        } catch (err) {
            console.error('Error saving check-in changes:', err);
            setSaveError('Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Function to cancel editing
    const cancelEditing = () => {
        setEditingCheckIn(null);
        setEditForm({});
        setSaveError(null);
    };
    
    return (
        <div className="space-y-6">
            {isLoading && checkIns.length === 0 && (
                <div className="flex justify-center p-6">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
                </div>
            )}
            
            {error && (
                <div className="bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded">
                    <p>Error: {error}</p>
                </div>
            )}
            
            {!isLoading && checkIns.length === 0 && (
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <p className="text-gray-600 dark:text-gray-400">No check-ins found. Start tracking your progress by submitting a weekly check-in.</p>
                </div>
            )}
            
            {checkIns.map((checkIn, index) => {
                // Determine if this is the last item
                const isLastItem = index === checkIns.length - 1;
                
                return (
                    <div 
                        key={checkIn.id} 
                        className="bg-white dark:bg-gray-800 rounded-lg shadow"
                        ref={isLastItem ? lastCheckInCallback : undefined}
                    >
                        <div className="flex justify-between items-center mb-3 p-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                {format(new Date(checkIn.check_in_date), 'MMMM d, yyyy')}
                            </h3>
                            <div className="flex items-center gap-2">
                                {editingCheckIn !== checkIn.id ? (
                                    <button 
                                        onClick={() => startEditing(checkIn)}
                                        className="text-indigo-600 hover:text-indigo-500 p-2 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
                                        aria-label="Edit check-in"
                                    >
                                        <FiEdit2 size={18} />
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => saveCheckInChanges(checkIn.id)}
                                            disabled={isSaving}
                                            className="text-green-600 hover:text-green-500 p-2 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 transition disabled:opacity-50"
                                            aria-label="Save changes"
                                        >
                                            <FiSave size={18} />
                                        </button>
                                        <button 
                                            onClick={cancelEditing}
                                            disabled={isSaving}
                                            className="text-gray-600 hover:text-gray-500 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
                                            aria-label="Cancel editing"
                                        >
                                            <FiX size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {saveError && (
                            <div className="mx-4 mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-md text-sm">
                                {saveError}
                            </div>
                        )}

                        {isSaving && (
                            <div className="mx-4 mb-4 p-3 bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 rounded-md text-sm">
                                Saving changes...
                            </div>
                        )}

                        {/* Display metrics in a grid for better organization */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Body Metrics Card */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2 border-b dark:border-gray-600 pb-1">Body Metrics</h4>
                                {editingCheckIn === checkIn.id ? (
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="space-y-2">
                                            <div>
                                                <label className="font-medium">Weight (kg):</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={editForm[checkIn.id]?.weight_kg || ''}
                                                    onChange={(e) => updateFormValue(checkIn.id, 'weight_kg', e.target.value)}
                                                    className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="font-medium">Body Fat (%):</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={editForm[checkIn.id]?.body_fat_percentage || ''}
                                                    onChange={(e) => updateFormValue(checkIn.id, 'body_fat_percentage', e.target.value)}
                                                    className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="font-medium">Waist (cm):</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={editForm[checkIn.id]?.waist_cm || ''}
                                                    onChange={(e) => updateFormValue(checkIn.id, 'waist_cm', e.target.value)}
                                                    className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="font-medium">Hips (cm):</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={editForm[checkIn.id]?.hip_cm || ''}
                                                    onChange={(e) => updateFormValue(checkIn.id, 'hip_cm', e.target.value)}
                                                    className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div>
                                                <label className="font-medium">Left Arm (cm):</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={editForm[checkIn.id]?.left_arm_cm || ''}
                                                    onChange={(e) => updateFormValue(checkIn.id, 'left_arm_cm', e.target.value)}
                                                    className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="font-medium">Right Arm (cm):</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={editForm[checkIn.id]?.right_arm_cm || ''}
                                                    onChange={(e) => updateFormValue(checkIn.id, 'right_arm_cm', e.target.value)}
                                                    className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="font-medium">Chest (cm):</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={editForm[checkIn.id]?.chest_cm || ''}
                                                    onChange={(e) => updateFormValue(checkIn.id, 'chest_cm', e.target.value)}
                                                    className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-1">
                                                <div>
                                                    <label className="font-medium text-xs">Left Thigh:</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={editForm[checkIn.id]?.left_thigh_cm || ''}
                                                        onChange={(e) => updateFormValue(checkIn.id, 'left_thigh_cm', e.target.value)}
                                                        className="w-full mt-1 px-1 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="font-medium text-xs">Right Thigh:</label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={editForm[checkIn.id]?.right_thigh_cm || ''}
                                                        onChange={(e) => updateFormValue(checkIn.id, 'right_thigh_cm', e.target.value)}
                                                        className="w-full mt-1 px-1 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="space-y-1">
                                            <p><span className="font-medium">Weight:</span> {displayMetric((Array.isArray(checkIn.body_metrics) ? checkIn.body_metrics[0]?.weight_kg : checkIn.body_metrics?.weight_kg), ' kg')}</p>
                                            <p><span className="font-medium">Body Fat:</span> {displayMetric((Array.isArray(checkIn.body_metrics) ? checkIn.body_metrics[0]?.body_fat_percentage : checkIn.body_metrics?.body_fat_percentage), '%')}</p>
                                            <p><span className="font-medium">Waist:</span> {displayMetric((Array.isArray(checkIn.body_metrics) ? checkIn.body_metrics[0]?.waist_cm : checkIn.body_metrics?.waist_cm), ' cm')}</p>
                                            <p><span className="font-medium">Hips:</span> {displayMetric((Array.isArray(checkIn.body_metrics) ? checkIn.body_metrics[0]?.hip_cm : checkIn.body_metrics?.hip_cm), ' cm')}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p><span className="font-medium">Arms:</span> {displayMetric((Array.isArray(checkIn.body_metrics) ? checkIn.body_metrics[0]?.left_arm_cm : checkIn.body_metrics?.left_arm_cm), ' cm')} / {displayMetric((Array.isArray(checkIn.body_metrics) ? checkIn.body_metrics[0]?.right_arm_cm : checkIn.body_metrics?.right_arm_cm), ' cm')}</p>
                                            <p><span className="font-medium">Chest:</span> {displayMetric((Array.isArray(checkIn.body_metrics) ? checkIn.body_metrics[0]?.chest_cm : checkIn.body_metrics?.chest_cm), ' cm')}</p>
                                            <p><span className="font-medium">Thighs:</span> {displayMetric((Array.isArray(checkIn.body_metrics) ? checkIn.body_metrics[0]?.left_thigh_cm : checkIn.body_metrics?.left_thigh_cm), ' cm')} / {displayMetric((Array.isArray(checkIn.body_metrics) ? checkIn.body_metrics[0]?.right_thigh_cm : checkIn.body_metrics?.right_thigh_cm), ' cm')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Wellness Metrics Card */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2 border-b dark:border-gray-600 pb-1">Wellness</h4>
                                {editingCheckIn === checkIn.id ? (
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="space-y-2">
                                            <div>
                                                <label className="font-medium">Sleep (hrs):</label>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    value={editForm[checkIn.id]?.sleep_hours || ''}
                                                    onChange={(e) => updateFormValue(checkIn.id, 'sleep_hours', e.target.value)}
                                                    className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="font-medium">Sleep Quality (1-5):</label>
                                                <select
                                                    value={editForm[checkIn.id]?.sleep_quality || ''}
                                                    onChange={(e) => updateFormValue(checkIn.id, 'sleep_quality', e.target.value)}
                                                    className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                >
                                                    <option value="">Select...</option>
                                                    {RATING_SCALE.map(option => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="font-medium">Stress (1-5):</label>
                                                <select
                                                    value={editForm[checkIn.id]?.stress_level || ''}
                                                    onChange={(e) => updateFormValue(checkIn.id, 'stress_level', e.target.value)}
                                                    className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                >
                                                    <option value="">Select...</option>
                                                    {RATING_SCALE.map(option => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div>
                                                <label className="font-medium">Fatigue (1-5):</label>
                                                <select
                                                    value={editForm[checkIn.id]?.fatigue_level || ''}
                                                    onChange={(e) => updateFormValue(checkIn.id, 'fatigue_level', e.target.value)}
                                                    className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                >
                                                    <option value="">Select...</option>
                                                    {RATING_SCALE.map(option => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="font-medium">Motivation (1-5):</label>
                                                <select
                                                    value={editForm[checkIn.id]?.motivation_level || ''}
                                                    onChange={(e) => updateFormValue(checkIn.id, 'motivation_level', e.target.value)}
                                                    className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                >
                                                    <option value="">Select...</option>
                                                    {RATING_SCALE.map(option => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="font-medium">Digestion:</label>
                                                <textarea
                                                    value={editForm[checkIn.id]?.digestion || ''}
                                                    onChange={(e) => updateFormValue(checkIn.id, 'digestion', e.target.value)}
                                                    className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                                    rows={2}
                                                    placeholder="e.g., Good, Bloated, etc."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="space-y-1">
                                            <p><span className="font-medium">Sleep:</span> {displayMetric((Array.isArray(checkIn.wellness_metrics) ? checkIn.wellness_metrics[0]?.sleep_hours : checkIn.wellness_metrics?.sleep_hours), ' hrs')}</p>
                                            <p><span className="font-medium">Sleep Quality:</span> {displayMetric((Array.isArray(checkIn.wellness_metrics) ? checkIn.wellness_metrics[0]?.sleep_quality : checkIn.wellness_metrics?.sleep_quality), '/5')}</p>
                                            <p><span className="font-medium">Stress:</span> {displayMetric((Array.isArray(checkIn.wellness_metrics) ? checkIn.wellness_metrics[0]?.stress_level : checkIn.wellness_metrics?.stress_level), '/5')}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p><span className="font-medium">Fatigue:</span> {displayMetric((Array.isArray(checkIn.wellness_metrics) ? checkIn.wellness_metrics[0]?.fatigue_level : checkIn.wellness_metrics?.fatigue_level), '/5')}</p>
                                            <p><span className="font-medium">Motivation:</span> {displayMetric((Array.isArray(checkIn.wellness_metrics) ? checkIn.wellness_metrics[0]?.motivation_level : checkIn.wellness_metrics?.motivation_level), '/5')}</p>
                                            <p><span className="font-medium">Digestion:</span> {(Array.isArray(checkIn.wellness_metrics) ? checkIn.wellness_metrics[0]?.digestion : checkIn.wellness_metrics?.digestion) || 'N/A'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Adherence Card */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md mb-4">
                            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2 border-b dark:border-gray-600 pb-1">Adherence</h4>
                            {editingCheckIn === checkIn.id ? (
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                        <label className="font-medium">Diet:</label>
                                        <select
                                            value={editForm[checkIn.id]?.diet_adherence || ''}
                                            onChange={(e) => updateFormValue(checkIn.id, 'diet_adherence', e.target.value)}
                                            className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                        >
                                            <option value="">Select...</option>
                                            {ADHERENCE_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-medium">Training:</label>
                                        <select
                                            value={editForm[checkIn.id]?.training_adherence || ''}
                                            onChange={(e) => updateFormValue(checkIn.id, 'training_adherence', e.target.value)}
                                            className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                        >
                                            <option value="">Select...</option>
                                            {ADHERENCE_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-medium">Steps:</label>
                                        <select
                                            value={editForm[checkIn.id]?.steps_adherence || ''}
                                            onChange={(e) => updateFormValue(checkIn.id, 'steps_adherence', e.target.value)}
                                            className="w-full mt-1 px-2 py-1 text-xs border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                        >
                                            <option value="">Select...</option>
                                            {ADHERENCE_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <p><span className="font-medium">Diet:</span> {checkIn.diet_adherence || 'N/A'}</p>
                                    <p><span className="font-medium">Training:</span> {checkIn.training_adherence || 'N/A'}</p>
                                    <p><span className="font-medium">Steps:</span> {checkIn.steps_adherence || 'N/A'}</p>
                                </div>
                            )}
                        </div>
                        
                        {/* Notes Section */}
                        {(checkIn.notes || editingCheckIn === checkIn.id) && (
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md mb-4">
                                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2 border-b dark:border-gray-600 pb-1">Notes</h4>
                                {editingCheckIn === checkIn.id ? (
                                    <textarea
                                        value={editForm[checkIn.id]?.notes || ''}
                                        onChange={(e) => updateFormValue(checkIn.id, 'notes', e.target.value)}
                                        className="w-full mt-1 px-2 py-2 text-sm border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                        rows={3}
                                        placeholder="Add notes about this check-in..."
                                    />
                                ) : (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{checkIn.notes}</p>
                                )}
                            </div>
                        )}
                        
                        {/* Media Section - Always show even if no photos, to allow adding photos */}
                        {(
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                                <div className="flex justify-between items-center mb-2 border-b dark:border-gray-600 pb-1">
                                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Media</h4>
                                    {editingCheckIn !== checkIn.id ? (
                                        <button 
                                            onClick={() => setEditingCheckIn(checkIn.id)}
                                            className="text-indigo-600 hover:text-indigo-500 p-1 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
                                            aria-label="Edit check-in"
                                        >
                                            <FiEdit2 size={16} />
                                        </button>
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <button 
                                                onClick={() => setEditingCheckIn(null)}
                                                className="text-gray-600 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                                aria-label="Cancel editing"
                                            >
                                                <FiX size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {checkIn.photos?.map((photoPath) => {
                                        const url = getPublicUrl(photoPath);
                                        return url ? (
                                            <a key={photoPath} href={url} target="_blank" rel="noopener noreferrer">
                                                <img 
                                                    src={url} 
                                                    alt="Progress" 
                                                    className="h-20 w-20 object-cover rounded hover:opacity-90 transition"
                                                    onError={(e) => {
                                                        console.error('Image failed to load:', url);
                                                        e.currentTarget.src = 'https://via.placeholder.com/100?text=Image+Error';
                                                    }}
                                                />
                                            </a>
                                        ) : null;
                                    })}
                                    {checkIn.video_url && (
                                        <a 
                                            href={getPublicUrl(checkIn.video_url) ?? '#'} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                                        >
                                            View Video
                                        </a>
                                    )}
                                </div>
                                    {editingCheckIn === checkIn.id && (
                                        <div className="mt-3 pt-3 border-t dark:border-gray-600">
                                            <input 
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                ref={(el) => {
                                                    if (el) fileInputRefs.current[checkIn.id] = el;
                                                }}
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files?.length) {
                                                        handlePhotoUpload(checkIn.id, e.target.files);
                                                    }
                                                }}
                                            />
                                            {uploadError && (
                                                <div className="text-red-500 text-xs mb-2">{uploadError}</div>
                                            )}
                                            <button 
                                                onClick={() => fileInputRefs.current[checkIn.id]?.click()}
                                                disabled={isUploading}
                                                className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isUploading ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                        Uploading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FiImage className="mr-2" />
                                                        Add Photos
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>
                );
            })}
            
            {/* Loading more indicator */}
            {isLoadingMore && (
                <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
            )}
            
            {/* End of list message */}
            {!isLoading && !isLoadingMore && !hasMore && checkIns.length > 0 && (
                <div className="text-center p-4 text-gray-500 dark:text-gray-400">
                    You've reached the end of your check-in history.
                </div>
            )}
        </div>
    );
};

export default CheckInTimeline; 