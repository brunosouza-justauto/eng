import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { supabase } from '../../services/supabaseClient';
import { format } from 'date-fns'; // For formatting dates
import { FiEdit2, FiX, FiImage } from 'react-icons/fi';

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
            console.log("No valid profile found");
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
            console.log(`Fetching check-ins for user_id: ${profile.user_id}, page: ${pageNumber}`);
            
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
                console.log('Last item is visible, loading more...');
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
            // Log the original file path for debugging
            console.log('Original file path:', filePath);
            
            // Make sure filePath doesn't already include the bucket name or any prefixes
            let path = filePath;
            if (path.startsWith('progress-media/')) {
                path = path.slice('progress-media/'.length);
            }
            if (path.startsWith('/')) {
                path = path.slice(1);
            }
            
            // Log the processed path
            console.log('Processed path:', path);
            
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
    
    console.log('HERE');
    console.log(checkIns);
    
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
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                {format(new Date(checkIn.check_in_date), 'MMMM d, yyyy')}
                            </h3>
                            {/* Could add action buttons here (view details, delete, etc.) */}
                        </div>

                        {/* Display metrics in a grid for better organization */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Body Metrics Card */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2 border-b dark:border-gray-600 pb-1">Body Metrics</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="space-y-1">
                                        <p><span className="font-medium">Weight:</span> {displayMetric(checkIn.body_metrics?.weight_kg, ' kg')}</p>
                                        <p><span className="font-medium">Body Fat:</span> {displayMetric(checkIn.body_metrics?.body_fat_percentage, '%')}</p>
                                        <p><span className="font-medium">Waist:</span> {displayMetric(checkIn.body_metrics?.waist_cm, ' cm')}</p>
                                        <p><span className="font-medium">Hips:</span> {displayMetric(checkIn.body_metrics?.hip_cm, ' cm')}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p><span className="font-medium">Arms:</span> {displayMetric(checkIn.body_metrics?.left_arm_cm, ' cm')} / {displayMetric(checkIn.body_metrics?.right_arm_cm, ' cm')}</p>
                                        <p><span className="font-medium">Chest:</span> {displayMetric(checkIn.body_metrics?.chest_cm, ' cm')}</p>
                                        <p><span className="font-medium">Thighs:</span> {displayMetric(checkIn.body_metrics?.left_thigh_cm, ' cm')} / {displayMetric(checkIn.body_metrics?.right_thigh_cm, ' cm')}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Wellness Metrics Card */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2 border-b dark:border-gray-600 pb-1">Wellness</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="space-y-1">
                                        <p><span className="font-medium">Sleep:</span> {displayMetric(checkIn.wellness_metrics?.sleep_hours, ' hrs')}</p>
                                        <p><span className="font-medium">Sleep Quality:</span> {displayMetric(checkIn.wellness_metrics?.sleep_quality, '/5')}</p>
                                        <p><span className="font-medium">Stress:</span> {displayMetric(checkIn.wellness_metrics?.stress_level, '/5')}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p><span className="font-medium">Fatigue:</span> {displayMetric(checkIn.wellness_metrics?.fatigue_level, '/5')}</p>
                                        <p><span className="font-medium">Motivation:</span> {displayMetric(checkIn.wellness_metrics?.motivation_level, '/5')}</p>
                                        <p><span className="font-medium">Digestion:</span> {checkIn.wellness_metrics?.digestion || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Adherence Card */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md mb-4">
                            <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2 border-b dark:border-gray-600 pb-1">Adherence</h4>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                <p><span className="font-medium">Diet:</span> {checkIn.diet_adherence || 'N/A'}</p>
                                <p><span className="font-medium">Training:</span> {checkIn.training_adherence || 'N/A'}</p>
                                <p><span className="font-medium">Steps:</span> {checkIn.steps_adherence || 'N/A'}</p>
                            </div>
                        </div>
                        
                        {/* Notes Section */}
                        {checkIn.notes && (
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md mb-4">
                                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2 border-b dark:border-gray-600 pb-1">Notes</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{checkIn.notes}</p>
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