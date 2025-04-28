import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import { supabase } from '../../services/supabaseClient';
import { format } from 'date-fns'; // For formatting dates

// Define types for the data needed (expand as necessary)
interface CheckInTimelineData {
    id: string;
    check_in_date: string; // Date string
    notes: string | null;
    photos: string[] | null;
    video_url: string | null;
    // Potentially fetch related body/wellness metrics here too if needed for preview
    body_metrics: { weight_kg: number | null }[] | null;
    wellness_metrics: { sleep_hours: number | null, stress_level: number | null }[] | null;
}

const CheckInTimeline: React.FC = () => {
    const [checkIns, setCheckIns] = useState<CheckInTimelineData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const user = useSelector(selectUser);

    useEffect(() => {
        const fetchCheckIns = async () => {
            if (!user) return;

            setIsLoading(true);
            setError(null);
            setCheckIns([]);

            try {
                const { data, error: fetchError } = await supabase
                    .from('check_ins')
                    .select(`
                        id,
                        check_in_date,
                        notes,
                        photos,
                        video_url,
                        body_metrics ( weight_kg ), 
                        wellness_metrics ( sleep_hours, stress_level )
                    `)
                    .eq('user_id', user.id)
                    .order('check_in_date', { ascending: false })
                    .limit(20); // Limit initial load
                
                if (fetchError) throw fetchError;

                setCheckIns(data || []);

            } catch (err: unknown) {
                console.error("Error fetching check-in history:", err);
                let message = 'Failed to load check-in history.';
                if (typeof err === 'object' && err !== null && 'message' in err) {
                    message = (err as Error).message;
                }
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchCheckIns();

    }, [user]);

    // Function to get public URL for storage items
    const getPublicUrl = (filePath: string | null | undefined): string | null => {
        if (!filePath) return null;
        try {
            const { data } = supabase.storage.from('progress-media').getPublicUrl(filePath);
            return data?.publicUrl || null;
        } catch (error) {
            console.error('Error getting public URL:', error);
            return null;
        }
    };

    return (
        <div className="space-y-6">
            {isLoading && <p>Loading history...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}
            {!isLoading && checkIns.length === 0 && <p>No check-ins found.</p>}
            {!isLoading && checkIns.map((checkIn) => (
                <div key={checkIn.id} className="p-4 bg-white dark:bg-gray-800 rounded shadow">
                    <h3 className="font-semibold mb-2">{format(new Date(checkIn.check_in_date), 'PPP')}</h3>
                    {/* Display key metrics */}
                    <div className="text-sm mb-2 space-x-4">
                        <span>Weight: {checkIn.body_metrics?.[0]?.weight_kg ?? 'N/A'} kg</span>
                        <span>Sleep: {checkIn.wellness_metrics?.[0]?.sleep_hours ?? 'N/A'} hrs</span>
                        <span>Stress: {checkIn.wellness_metrics?.[0]?.stress_level ?? 'N/A'}/5</span>
                    </div>
                    {checkIn.notes && <p className="text-sm mb-2 italic text-gray-600 dark:text-gray-400">Notes: {checkIn.notes}</p>}
                    
                    {/* Display Media Links/Thumbnails */}
                    <div className="flex flex-wrap gap-2 mt-2">
                        {checkIn.photos?.map((photoPath) => {
                            const url = getPublicUrl(photoPath);
                            return url ? (
                                <a key={photoPath} href={url} target="_blank" rel="noopener noreferrer">
                                    <img src={url} alt="Progress photo" className="h-16 w-16 object-cover rounded" />
                                </a>
                            ) : null;
                        })}
                        {checkIn.video_url && (
                             <a href={getPublicUrl(checkIn.video_url) ?? '#'} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm">
                                 View Video
                             </a>
                        )}
                    </div>
                     {/* TODO: Add link/button to view full check-in details */}
                </div>
            ))}
            {/* TODO: Add pagination or infinite scroll */}
        </div>
    );
};

export default CheckInTimeline; 