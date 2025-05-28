import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { format } from 'date-fns';
import { FiArrowLeft, FiSave } from 'react-icons/fi';

// Type for full check-in details (same as in CheckInReview)
interface CheckInFullData {
    id: string;
    check_in_date: string; 
    user_id: string;
    coach_feedback: string | null;
    diet_adherence: string | null;
    notes: string | null;
    photos: string[] | null;
    steps_adherence: string | null;
    training_adherence: string | null;
    video_url: string | null;
    body_metrics: { 
        id: string;
        left_arm_cm: number | null;
        right_arm_cm: number | null;
        body_fat_percentage: number | null;
        chest_cm: number | null;
        hip_cm: number | null;
        left_thigh_cm: number | null;
        right_thigh_cm: number | null;
        waist_cm: number | null;
        weight_kg: number | null;
        check_in_id: string;
        created_at: string;
        updated_at: string;
    } | null;
    wellness_metrics: {
        id: string;
        digestion: string | null;
        fatigue_level: number | null;
        menstrual_cycle_notes: string | null;
        motivation_level: number | null;
        sleep_hours: number | null; 
        sleep_quality: number | null;
        stress_level: number | null; 
        check_in_id: string;
        created_at: string;
        updated_at: string;
    } | null;
}

// Type for athlete profile
interface AthleteProfile {
    id: string;
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    username: string | null;
}

const CheckInDetail: React.FC = () => {
    const { checkInId } = useParams<{ checkInId: string }>();
    const navigate = useNavigate();
    
    const [checkIn, setCheckIn] = useState<CheckInFullData | null>(null);
    const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
    const [feedback, setFeedback] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchCheckInDetails = async () => {
            if (!checkInId) return;
            
            setIsLoading(true);
            setError(null);
            
            try {
                // Fetch check-in data with related metrics
                const { data, error } = await supabase
                    .from('check_ins')
                    .select(`
                        *,
                        body_metrics(*),
                        wellness_metrics(*)
                    `)
                    .eq('id', checkInId)
                    .single();
                
                if (error) throw error;
                if (!data) throw new Error('Check-in not found.');

                setCheckIn(data as CheckInFullData);
                setFeedback(data.coach_feedback || '');

                // Fetch athlete profile information
                if (data.user_id) {
                    const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('user_id', data.user_id)
                        .single();
                    
                    if (profileError) {
                        console.error("Error fetching athlete profile:", profileError);
                    } else if (profileData) {
                        setAthlete(profileData as AthleteProfile);
                    }
                }
            } catch (err) {
                console.error("Error fetching check-in details:", err);
                setError('Failed to load check-in details.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchCheckInDetails();
    }, [checkInId]);

    // Function to get public URL for storage items
    const getPublicUrl = (filePath: string | null | undefined): string | null => {
        if (!filePath) return null;
        try {
            // Log the original file path for debugging
            console.log('Original file path:', filePath);
            
            // Make sure filePath doesn't already include the bucket name or any prefixes
            // Strip any leading slashes or bucket prefixes
            let path = filePath;
            if (path.startsWith('progress-media/')) {
                path = path.slice('progress-media/'.length);
            }
            if (path.startsWith('/')) {
                path = path.slice(1);
            }
            
            // Log the processed path
            console.log('Processed path:', path);
            
            // Get URL with error handling
            const { data } = supabase.storage.from('progress-media').getPublicUrl(path);
            
            // Log URL for debugging
            console.log('Generated public URL:', data?.publicUrl);
            
            // Alternative URL construction for testing
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rxrorgjxmfgrjczmdjrf.supabase.co';
            const alternativeUrl = `${supabaseUrl}/storage/v1/object/public/progress-media/${path}`;
            console.log('Alternative URL:', alternativeUrl);
            
            // Return the Supabase-generated URL
            return data?.publicUrl || null;
        } catch (error) {
            console.error('Error getting public URL:', error);
            return null;
        }
    };

    const handleSaveFeedback = async () => {
        if (!checkIn) return;
        
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);
        
        try {
            const { error } = await supabase
                .from('check_ins')
                .update({ coach_feedback: feedback, updated_at: new Date() })
                .eq('id', checkIn.id);
            
            if (error) throw error;
            
            // Update local state
            setCheckIn(prev => prev ? { ...prev, coach_feedback: feedback } : null);
            setSuccessMessage('Feedback saved successfully!');
            
            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error("Error saving feedback:", err);
            setError('Failed to save feedback.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleBackToList = () => {
        navigate('/admin/checkins');
    };

    // Render loading state
    if (isLoading) {
        return (
            <div className="container mx-auto py-6">
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading check-in details...</p>
                </div>
            </div>
        );
    }

    // Render error state
    if (error || !checkIn) {
        return (
            <div className="container mx-auto py-6">
                <div className="bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded">
                    <p>{error || 'Check-in not found'}</p>
                </div>
                <div className="mt-4">
                    <button 
                        onClick={handleBackToList}
                        className="flex items-center text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        <FiArrowLeft className="mr-1" /> Back to check-ins
                    </button>
                </div>
            </div>
        );
    }

    // Format athlete name
    const athleteName = athlete 
        ? `${athlete.first_name || ''} ${athlete.last_name || ''}`.trim() || athlete.username || athlete.email 
        : 'Unknown Athlete';

    return (
        <div className="container mx-auto py-6">
            {/* Header with back button */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <div>
                    <button 
                        onClick={handleBackToList}
                        className="flex items-center text-indigo-600 dark:text-indigo-400 hover:underline mb-2"
                    >
                        <FiArrowLeft className="mr-1" /> Back to check-ins
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Check-in Details</h1>
                    <div className="flex items-center text-gray-600 dark:text-gray-400 mt-1">
                        <p className="mr-4">
                            <span className="font-medium">Athlete:</span> {athleteName}
                        </p>
                        <p>
                            <span className="font-medium">Date:</span> {format(new Date(checkIn.check_in_date), 'MMMM d, yyyy')}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center">
                    <button 
                        onClick={handleSaveFeedback}
                        disabled={isSaving}
                        className={`px-4 py-2 ${isSaving ? 'bg-green-500' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md flex items-center`}
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </>
                        ) : (
                            <>
                                <FiSave className="mr-2" /> Save Feedback
                            </>
                        )}
                    </button>
                </div>
            </div>
            
            {/* Success message */}
            {successMessage && (
                <div className="bg-green-100 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-400 p-4 mb-6 rounded">
                    <p>{successMessage}</p>
                </div>
            )}
            
            {/* Error message */}
            {error && (
                <div className="bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 mb-6 rounded">
                    <p>{error}</p>
                </div>
            )}

            {/* Main content */}
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">Basic Info</h2>
                        <div className="space-y-2">
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Notes:</span> 
                                {checkIn.notes || '-'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">Adherence</h2>
                        <div className="space-y-2">
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Diet:</span> 
                                {checkIn.diet_adherence || '-'}
                            </p>
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Training:</span> 
                                {checkIn.training_adherence || '-'}
                            </p>
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Steps:</span> 
                                {checkIn.steps_adherence || '-'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">Body Metrics</h2>
                        <div className="space-y-2">
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Weight:</span> 
                                {checkIn.body_metrics && checkIn.body_metrics.weight_kg != null 
                                    ? `${checkIn.body_metrics.weight_kg} kg` 
                                    : 'N/A'}
                            </p>
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Body Fat:</span> 
                                {checkIn.body_metrics && checkIn.body_metrics.body_fat_percentage != null 
                                    ? `${checkIn.body_metrics.body_fat_percentage}%` 
                                    : 'N/A'}
                            </p>
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Arms:</span> 
                                {checkIn.body_metrics && checkIn.body_metrics.left_arm_cm != null && checkIn.body_metrics.right_arm_cm != null 
                                    ? `${checkIn.body_metrics.left_arm_cm} cm / ${checkIn.body_metrics.right_arm_cm} cm` 
                                    : 'N/A'}
                            </p>
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Chest:</span> 
                                {checkIn.body_metrics && checkIn.body_metrics.chest_cm != null 
                                    ? `${checkIn.body_metrics.chest_cm} cm` 
                                    : 'N/A'}
                            </p>
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Waist:</span> 
                                {checkIn.body_metrics && checkIn.body_metrics.waist_cm != null 
                                    ? `${checkIn.body_metrics.waist_cm} cm` 
                                    : 'N/A'}
                            </p>
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Hip:</span> 
                                {checkIn.body_metrics && checkIn.body_metrics.hip_cm != null 
                                    ? `${checkIn.body_metrics.hip_cm} cm` 
                                    : 'N/A'}
                            </p>
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Thighs:</span> 
                                {checkIn.body_metrics && checkIn.body_metrics.left_thigh_cm != null && checkIn.body_metrics.right_thigh_cm != null 
                                    ? `${checkIn.body_metrics.left_thigh_cm} cm / ${checkIn.body_metrics.right_thigh_cm} cm` 
                                    : 'N/A'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">Wellness Metrics</h2>
                        <div className="space-y-2">
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Sleep:</span> 
                                {checkIn.wellness_metrics && checkIn.wellness_metrics.sleep_hours != null 
                                    ? `${checkIn.wellness_metrics.sleep_hours} hrs` 
                                    : 'N/A'}
                            </p>
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Sleep Quality:</span> 
                                {checkIn.wellness_metrics && checkIn.wellness_metrics.sleep_quality != null 
                                    ? `${checkIn.wellness_metrics.sleep_quality}/5` 
                                    : 'N/A'}
                            </p>
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Stress:</span> 
                                {checkIn.wellness_metrics && checkIn.wellness_metrics.stress_level != null 
                                    ? `${checkIn.wellness_metrics.stress_level}/5` 
                                    : 'N/A'}
                            </p>
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Fatigue:</span> 
                                {checkIn.wellness_metrics && checkIn.wellness_metrics.fatigue_level != null 
                                    ? `${checkIn.wellness_metrics.fatigue_level}/5` 
                                    : 'N/A'}
                            </p>
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Motivation:</span> 
                                {checkIn.wellness_metrics && checkIn.wellness_metrics.motivation_level != null 
                                    ? `${checkIn.wellness_metrics.motivation_level}/5` 
                                    : 'N/A'}
                            </p>
                            <p className="text-sm dark:text-gray-300">
                                <span className="mr-2 font-medium text-gray-600 dark:text-white">Digestion:</span> 
                                {checkIn.wellness_metrics && checkIn.wellness_metrics.digestion 
                                    ? checkIn.wellness_metrics.digestion 
                                    : 'N/A'}
                            </p>
                            {checkIn.wellness_metrics && checkIn.wellness_metrics.menstrual_cycle_notes && (
                                <p className="text-sm dark:text-gray-300">
                                    <span className="mr-2 font-medium text-gray-600 dark:text-white">Menstrual Cycle:</span> 
                                    {checkIn.wellness_metrics.menstrual_cycle_notes}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Media Display */}
                {(checkIn.photos?.length || checkIn.video_url) && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">Media</h2>
                        <div className="flex flex-wrap gap-3">
                            {checkIn.photos?.map(p => {
                                console.log('Processing photo path:', p);
                                const url = getPublicUrl(p);
                                
                                // Generate a fallback URL directly
                                let fallbackUrl = null;
                                if (p) {
                                    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rxrorgjxmfgrjczmdjrf.supabase.co';
                                    let path = p;
                                    if (path.startsWith('progress-media/')) {
                                        path = path.slice('progress-media/'.length);
                                    }
                                    if (path.startsWith('/')) {
                                        path = path.slice(1);
                                    }
                                    fallbackUrl = `${supabaseUrl}/storage/v1/object/public/progress-media/${path}`;
                                }
                                
                                return url ? (
                                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="relative">
                                        <img 
                                            src={url} 
                                            alt="Check-in photo" 
                                            className="object-cover w-24 h-24 rounded hover:opacity-90 transition-opacity"
                                            onError={(e) => {
                                                console.error('Image failed to load:', url);
                                                if (fallbackUrl && fallbackUrl !== url) {
                                                    console.log('Trying fallback URL:', fallbackUrl);
                                                    e.currentTarget.src = fallbackUrl;
                                                } else {
                                                    console.log('Using placeholder image');
                                                    e.currentTarget.src = 'https://via.placeholder.com/100?text=Image+Error';
                                                }
                                            }}
                                        />
                                    </a>
                                ) : fallbackUrl ? (
                                    <a key={fallbackUrl} href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="relative">
                                        <img 
                                            src={fallbackUrl} 
                                            alt="Check-in photo (fallback)" 
                                            className="object-cover w-24 h-24 rounded hover:opacity-90 transition-opacity border border-yellow-500"
                                            onError={(e) => {
                                                console.error('Fallback image failed to load:', fallbackUrl);
                                                e.currentTarget.src = 'https://via.placeholder.com/100?text=Image+Error';
                                            }}
                                        />
                                    </a>
                                ) : null;
                            })}
                            {checkIn.video_url && (() => {
                                const videoUrl = getPublicUrl(checkIn.video_url);
                                
                                // Create fallback URL for video
                                let fallbackVideoUrl = null;
                                if (checkIn.video_url) {
                                    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rxrorgjxmfgrjczmdjrf.supabase.co';
                                    let path = checkIn.video_url;
                                    if (path.startsWith('progress-media/')) {
                                        path = path.slice('progress-media/'.length);
                                    }
                                    if (path.startsWith('/')) {
                                        path = path.slice(1);
                                    }
                                    fallbackVideoUrl = `${supabaseUrl}/storage/v1/object/public/progress-media/${path}`;
                                }
                                
                                return videoUrl ? (
                                    <a href={videoUrl} target="_blank" rel="noopener noreferrer" 
                                       className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                        View Video
                                    </a>
                                ) : fallbackVideoUrl ? (
                                    <a href={fallbackVideoUrl} target="_blank" rel="noopener noreferrer" 
                                       className="flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                                        View Video (Fallback)
                                    </a>
                                ) : null;
                            })()}
                            {(!checkIn.photos?.length && !checkIn.video_url) && (
                                <p className="text-gray-500 dark:text-gray-400">No media attached to this check-in</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Feedback Section */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-3 pb-1 border-b border-gray-200 dark:border-gray-700">Coach Feedback</h2>
                    <textarea 
                        rows={5}
                        className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="Enter your feedback for this check-in..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                    />
                    <div className="mt-3 flex justify-end">
                        <button 
                            onClick={handleSaveFeedback}
                            disabled={isSaving}
                            className={`px-4 py-2 ${isSaving ? 'bg-green-500' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md flex items-center`}
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FiSave className="mr-2" /> Save Feedback
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckInDetail; 