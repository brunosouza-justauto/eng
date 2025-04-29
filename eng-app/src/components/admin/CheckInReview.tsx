import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import { format } from 'date-fns';

// Types needed
interface UserSelectItem {
    user_id: string;
    email: string | null;
    username: string | null;
}
// Use same type as CheckInTimeline for now
interface CheckInListItem {
    id: string;
    check_in_date: string; 
    notes: string | null;
    body_metrics: { weight_kg: number | null }[] | null;
    // Add other preview fields if needed
}

// Type for full check-in details
interface CheckInFullData extends CheckInListItem {
    photos: string[] | null;
    video_url: string | null;
    diet_adherence: string | null;
    training_adherence: string | null;
    steps_adherence: string | null;
    coach_feedback: string | null;
    body_metrics: { 
        weight_kg: number | null; 
        body_fat_percentage: number | null;
        waist_cm: number | null;
        hip_cm: number | null;
        // Add other fields
     }[] | null;
    wellness_metrics: { 
        sleep_hours: number | null; 
        sleep_quality: number | null;
        stress_level: number | null; 
        fatigue_level: number | null;
        digestion: string | null;
        motivation_level: number | null;
        // Add other fields
     }[] | null;
}

const CheckInReview: React.FC = () => {
    const [users, setUsers] = useState<UserSelectItem[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [checkIns, setCheckIns] = useState<CheckInListItem[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingCheckIns, setIsLoadingCheckIns] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const coach = useSelector(selectUser);
    const [selectedCheckIn, setSelectedCheckIn] = useState<CheckInFullData | null>(null);
    const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string>('');
    const [isSavingFeedback, setIsSavingFeedback] = useState<boolean>(false);

    // Fetch users (athletes linked to coach)
    useEffect(() => {
        const fetchAthletes = async () => {
            if (!coach) return;
            setIsLoadingUsers(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('profiles')
                    .select('user_id, email, username')
                    .eq('coach_id', coach.id)
                    .neq('role', 'coach');
                if (fetchError) throw fetchError;
                setUsers(data || []);
            } catch { setError('Failed to load users.'); }
            finally { setIsLoadingUsers(false); }
        };
        fetchAthletes();
    }, [coach]);

    // Fetch check-ins when selected user changes
     useEffect(() => {
        const fetchCheckIns = async () => {
            if (!selectedUserId) {
                setCheckIns([]);
                return;
            }
            setIsLoadingCheckIns(true);
            setError(null);
            setCheckIns([]);
            try {
                 const { data, error: fetchError } = await supabase
                    .from('check_ins')
                    .select('id, check_in_date, notes, body_metrics(weight_kg)') // Select fields needed for list
                    .eq('user_id', selectedUserId)
                    .order('check_in_date', { ascending: false })
                    .limit(50); // Limit check-ins shown initially
                 if (fetchError) throw fetchError;
                 setCheckIns(data || []);
            } catch { setError('Failed to load check-ins.'); setCheckIns([]); }
             finally { setIsLoadingCheckIns(false); }
        };
        fetchCheckIns();
    }, [selectedUserId]);

    // Function to get public URL (assuming it's defined as before)
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

    const handleViewDetails = async (checkInId: string) => {
        setShowDetailModal(true);
        setIsLoadingDetails(true);
        setDetailError(null);
        setSelectedCheckIn(null);
        setFeedback(''); // Clear previous feedback

        try {
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

            setSelectedCheckIn(data as CheckInFullData);
            setFeedback(data.coach_feedback || ''); // Populate existing feedback

        } catch (err) {
             console.error("Error fetching check-in details:", err);
             setDetailError('Failed to load check-in details.');
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleCloseDetailModal = () => {
        setShowDetailModal(false);
        setSelectedCheckIn(null);
    };

    const handleSaveFeedback = async () => {
        if (!selectedCheckIn) return;
        setIsSavingFeedback(true);
        setDetailError(null);
        try {
            const { error } = await supabase
                .from('check_ins')
                .update({ coach_feedback: feedback, updated_at: new Date() })
                .eq('id', selectedCheckIn.id);
            
            if (error) throw error;
            // Optimistically update local state or refetch list if needed
            setSelectedCheckIn(prev => prev ? { ...prev, coach_feedback: feedback } : null);
            // Maybe show a success message
            // handleCloseDetailModal(); // Optional: close modal after save

        } catch (err) {
            console.error("Error saving feedback:", err);
            setDetailError('Failed to save feedback.');
        } finally {
            setIsSavingFeedback(false);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Check-in Review</h1>
            {isLoadingUsers && <p>Loading users...</p>}
            {error && <p className="text-red-500 mb-4">Error: {error}</p>}
            {!isLoadingUsers && (
                <div className="mb-4 max-w-xs">
                    <label htmlFor="userSelectReview" className="block text-sm font-medium mb-1">Select Athlete</label>
                    <select 
                        id="userSelectReview"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                    >
                        <option value="" disabled>-- Select an Athlete --</option>
                        {users.map(user => (
                            <option key={user.user_id} value={user.user_id}>
                                {user.username || user.email}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {selectedUserId && (
                <div>
                    <h2 className="text-xl font-semibold mb-3">Check-ins for Selected Athlete</h2>
                    {isLoadingCheckIns && <p>Loading check-ins...</p>}
                    {!isLoadingCheckIns && checkIns.length === 0 && <p>No check-ins found for this user.</p>}
                    {!isLoadingCheckIns && checkIns.length > 0 && (
                        <div className="space-y-3">
                            {checkIns.map((checkIn) => (
                                <div key={checkIn.id} className="p-3 bg-white dark:bg-gray-800 rounded shadow">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold">{format(new Date(checkIn.check_in_date), 'PPP')}</span>
                                        <button onClick={() => handleViewDetails(checkIn.id)} className="text-xs text-indigo-600 hover:underline">View Details</button>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">Notes: {checkIn.notes || '-'}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Weight: {checkIn.body_metrics?.[0]?.weight_kg ?? 'N/A'} kg</p>
                                    {/* TODO: Add feedback display/input area */}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Detail Modal */}
            {showDetailModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex justify-center items-center p-4 overflow-y-auto">
                    <div className="relative p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">Check-in Details</h3>
                        {isLoadingDetails && <p>Loading details...</p>}
                        {detailError && <p className="text-red-500 mb-2">Error: {detailError}</p>}
                        {selectedCheckIn && (
                             <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                {/* Display all fetched details: Metrics, Wellness, Adherence, Notes, Media */}
                                <p><strong>Date:</strong> {format(new Date(selectedCheckIn.check_in_date), 'PPP')}</p>
                                <p><strong>Weight:</strong> {selectedCheckIn.body_metrics?.[0]?.weight_kg ?? 'N/A'} kg</p>
                                {/* ... Display ALL other metrics from selectedCheckIn.body_metrics[0] ... */}
                                <p><strong>Sleep:</strong> {selectedCheckIn.wellness_metrics?.[0]?.sleep_hours ?? 'N/A'} hrs (Quality: {selectedCheckIn.wellness_metrics?.[0]?.sleep_quality ?? 'N/A'}/5)</p>
                                {/* ... Display ALL other wellness metrics ... */}
                                <p><strong>Diet Adherence:</strong> {selectedCheckIn.diet_adherence || '-'}</p>
                                <p><strong>Training Adherence:</strong> {selectedCheckIn.training_adherence || '-'}</p>
                                <p><strong>Steps Adherence:</strong> {selectedCheckIn.steps_adherence || '-'}</p>
                                <p><strong>Notes:</strong> {selectedCheckIn.notes || '-'}</p>
                                
                                {/* Media Display */}
                                <div className="flex flex-wrap gap-2">
                                    {selectedCheckIn.photos?.map(p => getPublicUrl(p)).filter(url => !!url).map(url => (
                                        <a key={url} href={url!} target="_blank" rel="noopener noreferrer"><img src={url!} alt="" className="h-24 w-24 object-cover rounded"/></a>
                                    ))}
                                    {selectedCheckIn.video_url && getPublicUrl(selectedCheckIn.video_url) && (
                                        <a href={getPublicUrl(selectedCheckIn.video_url)!} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">(View Video)</a>
                                    )}
                                </div>

                                {/* Feedback Section */}
                                <div className="mt-4 pt-4 border-t dark:border-gray-600">
                                    <label htmlFor="coachFeedback" className="block text-sm font-medium mb-1">Coach Feedback</label>
                                    <textarea 
                                        id="coachFeedback"
                                        rows={4}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleSaveFeedback}
                                        disabled={isSavingFeedback}
                                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {isSavingFeedback ? 'Saving...' : 'Save Feedback'}
                                    </button>
                                </div>
                             </div>
                        )}
                        <div className="items-center px-4 py-3 mt-4 text-right border-t dark:border-gray-600">
                            <button onClick={handleCloseDetailModal} className="px-4 py-2 bg-gray-500 text-white ...">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckInReview; 