import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { supabase } from '../../services/supabaseClient';
import { format } from 'date-fns'; // For formatting dates

// Define types for the data needed in our component
interface CheckInTimelineData {
    id: string;
    check_in_date: string; // Date string
    notes: string | null;
    photos: string[] | null;
    video_url: string | null;
    diet_adherence: string | null;
    training_adherence: string | null;
    steps_adherence: string | null;
    // Expanded metrics
    body_metrics: { 
        weight_kg: number | null;
        body_fat_percentage: number | null;
        waist_cm: number | null;
        hip_cm: number | null;
        arm_cm: number | null;
        chest_cm: number | null;
        thigh_cm: number | null;
    } | null;
    wellness_metrics: { 
        sleep_hours: number | null;
        sleep_quality: number | null;
        stress_level: number | null;
        fatigue_level: number | null;
        motivation_level: number | null;
        digestion: string | null;
    } | null;
}

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
        arm_cm: number | null;
        chest_cm: number | null;
        thigh_cm: number | null;
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
    const [checkIns, setCheckIns] = useState<CheckInTimelineData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const profile = useSelector(selectProfile);
    
    // Reference for the intersection observer
    const observer = useRef<IntersectionObserver | null>(null);
    // Reference for the last item element
    const lastCheckInRef = useRef<HTMLDivElement | null>(null);

    // Helper function to transform the Supabase response to match our component data structure
    const transformCheckInData = (data: CheckInSupabaseResponse[]): CheckInTimelineData[] => {
        return data.map(item => ({
            ...item,
            body_metrics: item.body_metrics && item.body_metrics[0] ? {
                weight_kg: item.body_metrics[0].weight_kg,
                body_fat_percentage: item.body_metrics[0].body_fat_percentage,
                waist_cm: item.body_metrics[0].waist_cm,
                hip_cm: item.body_metrics[0].hip_cm,
                arm_cm: item.body_metrics[0].arm_cm,
                chest_cm: item.body_metrics[0].chest_cm,
                thigh_cm: item.body_metrics[0].thigh_cm,
            } : null,
            wellness_metrics: item.wellness_metrics && item.wellness_metrics[0] ? {
                sleep_hours: item.wellness_metrics[0].sleep_hours,
                sleep_quality: item.wellness_metrics[0].sleep_quality,
                stress_level: item.wellness_metrics[0].stress_level,
                fatigue_level: item.wellness_metrics[0].fatigue_level,
                motivation_level: item.wellness_metrics[0].motivation_level,
                digestion: item.wellness_metrics[0].digestion,
            } : null
        }));
    };

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
                        arm_cm,
                        chest_cm,
                        thigh_cm
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

            console.log(`Fetched ${data?.length || 0} check-ins`);
            
            // Check if we've reached the end of the data
            if (!data || data.length < ITEMS_PER_PAGE) {
                setHasMore(false);
            }
            
            // Transform the data to match our component structure
            const transformedData = transformCheckInData(data as CheckInSupabaseResponse[]);
            
            // Update state with new data
            if (append) {
                setCheckIns(prev => [...prev, ...transformedData]);
            } else {
                setCheckIns(transformedData);
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
                        className="p-5 bg-white dark:bg-gray-800 rounded-lg shadow"
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
                                        <p><span className="font-medium">Arms:</span> {displayMetric(checkIn.body_metrics?.arm_cm, ' cm')}</p>
                                        <p><span className="font-medium">Chest:</span> {displayMetric(checkIn.body_metrics?.chest_cm, ' cm')}</p>
                                        <p><span className="font-medium">Thighs:</span> {displayMetric(checkIn.body_metrics?.thigh_cm, ' cm')}</p>
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
                        
                        {/* Media Section */}
                        {(checkIn.photos?.length || checkIn.video_url) && (
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">
                                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2 border-b dark:border-gray-600 pb-1">Media</h4>
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