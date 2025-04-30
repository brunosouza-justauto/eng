import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import { format } from 'date-fns';
import { FiSearch, FiUser, FiCalendar, FiFileText, FiX } from 'react-icons/fi';

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
    const [filteredUsers, setFilteredUsers] = useState<UserSelectItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
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
                setFilteredUsers(data || []);
            } catch { setError('Failed to load users.'); }
            finally { setIsLoadingUsers(false); }
        };
        fetchAthletes();
    }, [coach]);

    // Filter users based on search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredUsers(users);
            return;
        }
        
        const query = searchQuery.toLowerCase();
        const filtered = users.filter(
            user => 
                (user.username && user.username.toLowerCase().includes(query)) || 
                (user.email && user.email.toLowerCase().includes(query))
        );
        setFilteredUsers(filtered);
    }, [searchQuery, users]);

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

    const handleUserSelect = (userId: string) => {
        setSelectedUserId(userId);
        setCheckIns([]);
    };

    return (
        <div className="container mx-auto py-6 px-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Check-in Review</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Review and provide feedback on athlete check-ins</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 mb-6 rounded" role="alert">
                    <p>{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Athletes Selection Panel */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                    <div className="p-4 border-b dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Athletes</h2>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <FiSearch className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="pl-10 pr-4 py-2 w-full border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="Search athletes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-y-auto max-h-[400px]">
                        {isLoadingUsers ? (
                            <div className="flex justify-center items-center p-6">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center p-6 text-gray-500 dark:text-gray-400">
                                No athletes found
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredUsers.map(user => (
                                    <li key={user.user_id}>
                                        <button 
                                            onClick={() => handleUserSelect(user.user_id)}
                                            className={`w-full text-left px-4 py-3 flex items-center hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors
                                                ${selectedUserId === user.user_id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500' : ''}`}
                                        >
                                            <FiUser className="mr-2 text-gray-500 dark:text-gray-400" />
                                            <span className="text-gray-800 dark:text-white font-medium">
                                                {user.username || user.email?.split('@')[0] || 'Unknown'}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Check-in List Panel */}
                <div className="md:col-span-3">
                    {!selectedUserId ? (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                            <FiFileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No Athlete Selected</h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                Select an athlete from the list to view their check-ins
                            </p>
                        </div>
                    ) : isLoadingCheckIns ? (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                            <div className="flex justify-center">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
                            </div>
                            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading check-ins...</p>
                        </div>
                    ) : checkIns.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                            <FiCalendar className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No Check-ins Found</h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                This athlete hasn't submitted any check-ins yet
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                            <div className="p-4 border-b dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                                    Check-ins
                                </h2>
                            </div>
                            <div className="overflow-y-auto max-h-[600px]">
                                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {checkIns.map((checkIn) => (
                                        <div key={checkIn.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center">
                                                    <FiCalendar className="mr-2 text-gray-500 dark:text-gray-400" />
                                                    <span className="font-medium text-gray-800 dark:text-white">
                                                        {format(new Date(checkIn.check_in_date), 'PPP')}
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={() => handleViewDetails(checkIn.id)} 
                                                    className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                                                >
                                                    View Details
                                                </button>
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                                <span className="font-medium">Notes:</span> {checkIn.notes || 'No notes provided'}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                <span className="font-medium">Weight:</span> {checkIn.body_metrics?.[0]?.weight_kg ?? 'N/A'} kg
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            {showDetailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black bg-opacity-50">
                    <div className="relative w-full max-w-3xl p-6 bg-white rounded-lg shadow-lg dark:bg-gray-800">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Check-in Details</h3>
                            <button 
                                onClick={handleCloseDetailModal}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <FiX className="h-5 w-5" />
                            </button>
                        </div>

                        {isLoadingDetails ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mb-4"></div>
                                <p className="text-gray-500 dark:text-gray-400">Loading check-in details...</p>
                            </div>
                        ) : detailError ? (
                            <div className="bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded">
                                <p>{detailError}</p>
                            </div>
                        ) : selectedCheckIn && (
                            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                        <h4 className="font-medium text-gray-800 dark:text-white mb-3">Basic Info</h4>
                                        <div className="space-y-2">
                                            <p className="text-sm"><span className="font-medium text-gray-600 dark:text-gray-300">Date:</span> {format(new Date(selectedCheckIn.check_in_date), 'PPP')}</p>
                                            <p className="text-sm"><span className="font-medium text-gray-600 dark:text-gray-300">Notes:</span> {selectedCheckIn.notes || '-'}</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                        <h4 className="font-medium text-gray-800 dark:text-white mb-3">Adherence</h4>
                                        <div className="space-y-2">
                                            <p className="text-sm"><span className="font-medium text-gray-600 dark:text-gray-300">Diet:</span> {selectedCheckIn.diet_adherence || '-'}</p>
                                            <p className="text-sm"><span className="font-medium text-gray-600 dark:text-gray-300">Training:</span> {selectedCheckIn.training_adherence || '-'}</p>
                                            <p className="text-sm"><span className="font-medium text-gray-600 dark:text-gray-300">Steps:</span> {selectedCheckIn.steps_adherence || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                        <h4 className="font-medium text-gray-800 dark:text-white mb-3">Body Metrics</h4>
                                        <div className="space-y-2">
                                            <p className="text-sm"><span className="font-medium text-gray-600 dark:text-gray-300">Weight:</span> {selectedCheckIn.body_metrics?.[0]?.weight_kg ?? 'N/A'} kg</p>
                                            <p className="text-sm"><span className="font-medium text-gray-600 dark:text-gray-300">Body Fat:</span> {selectedCheckIn.body_metrics?.[0]?.body_fat_percentage ?? 'N/A'}%</p>
                                            <p className="text-sm"><span className="font-medium text-gray-600 dark:text-gray-300">Waist:</span> {selectedCheckIn.body_metrics?.[0]?.waist_cm ?? 'N/A'} cm</p>
                                            <p className="text-sm"><span className="font-medium text-gray-600 dark:text-gray-300">Hip:</span> {selectedCheckIn.body_metrics?.[0]?.hip_cm ?? 'N/A'} cm</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                        <h4 className="font-medium text-gray-800 dark:text-white mb-3">Wellness Metrics</h4>
                                        <div className="space-y-2">
                                            <p className="text-sm"><span className="font-medium text-gray-600 dark:text-gray-300">Sleep:</span> {selectedCheckIn.wellness_metrics?.[0]?.sleep_hours ?? 'N/A'} hrs (Quality: {selectedCheckIn.wellness_metrics?.[0]?.sleep_quality ?? 'N/A'}/5)</p>
                                            <p className="text-sm"><span className="font-medium text-gray-600 dark:text-gray-300">Stress:</span> {selectedCheckIn.wellness_metrics?.[0]?.stress_level ?? 'N/A'}/5</p>
                                            <p className="text-sm"><span className="font-medium text-gray-600 dark:text-gray-300">Fatigue:</span> {selectedCheckIn.wellness_metrics?.[0]?.fatigue_level ?? 'N/A'}/5</p>
                                            <p className="text-sm"><span className="font-medium text-gray-600 dark:text-gray-300">Motivation:</span> {selectedCheckIn.wellness_metrics?.[0]?.motivation_level ?? 'N/A'}/5</p>
                                            <p className="text-sm"><span className="font-medium text-gray-600 dark:text-gray-300">Digestion:</span> {selectedCheckIn.wellness_metrics?.[0]?.digestion ?? 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Media Display */}
                                {(selectedCheckIn.photos?.length || selectedCheckIn.video_url) && (
                                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                        <h4 className="font-medium text-gray-800 dark:text-white mb-3">Media</h4>
                                        <div className="flex flex-wrap gap-3">
                                            {selectedCheckIn.photos?.map(p => getPublicUrl(p)).filter(url => !!url).map(url => (
                                                <a key={url} href={url!} target="_blank" rel="noopener noreferrer">
                                                    <img src={url!} alt="" className="object-cover w-24 h-24 rounded hover:opacity-90 transition-opacity"/>
                                                </a>
                                            ))}
                                            {selectedCheckIn.video_url && getPublicUrl(selectedCheckIn.video_url) && (
                                                <a href={getPublicUrl(selectedCheckIn.video_url)!} target="_blank" rel="noopener noreferrer" 
                                                   className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                                    View Video
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Feedback Section */}
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-800 dark:text-white mb-3">Coach Feedback</h4>
                                    <textarea 
                                        rows={4}
                                        className="w-full p-3 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                        placeholder="Enter your feedback for this check-in..."
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                    />
                                    <div className="mt-3 flex justify-end">
                                        <button 
                                            onClick={handleSaveFeedback}
                                            disabled={isSavingFeedback}
                                            className={`px-4 py-2 ${isSavingFeedback ? 'bg-green-500' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md flex items-center`}
                                        >
                                            {isSavingFeedback && (
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            )}
                                            {isSavingFeedback ? 'Saving...' : 'Save Feedback'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckInReview; 