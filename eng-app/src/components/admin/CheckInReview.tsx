import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { format } from 'date-fns';
import { FiSearch, FiUser, FiCalendar, FiFileText } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

// Types needed
interface UserSelectItem {
    id: string;
    user_id: string;
    email: string | null;
    username: string | null;
}
// Use same type as CheckInTimeline for now
interface CheckInListItem {
    id: string;
    check_in_date: string; 
    notes: string | null;
    body_metrics: { weight_kg: number | null } | null;
    // Add other preview fields if needed
}

const CheckInReview: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserSelectItem[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserSelectItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [checkIns, setCheckIns] = useState<CheckInListItem[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingCheckIns, setIsLoadingCheckIns] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const profile = useSelector(selectProfile);

    // Fetch users (athletes linked to coach)
    useEffect(() => {
        const fetchAthletes = async () => {
            if (!profile || !profile.id) {
                console.log("No coach profile available");
                setIsLoadingUsers(false);
                return;
            }
            
            setIsLoadingUsers(true);
            setError(null);
            
            try {
                console.log("Fetching athletes for coach ID:", profile.id);
                const { data, error: fetchError } = await supabase
                    .from('profiles')
                    .select('id, user_id, email, username')
                    .eq('coach_id', profile.id)
                    .neq('role', 'coach');
                    
                if (fetchError) throw fetchError;
                
                console.log("Fetched athletes:", data);
                setUsers(data || []);
                setFilteredUsers(data || []);
            } catch (err) { 
                console.error("Error fetching athletes:", err);
                setError('Failed to load athletes.'); 
            }
            finally { setIsLoadingUsers(false); }
        };
        fetchAthletes();
    }, [profile]);

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
                 
                 // Transform data to match our interface
                 const transformedData = data?.map(item => ({
                    ...item,
                    body_metrics: item.body_metrics?.[0] || null
                 })) || [];
                 
                 setCheckIns(transformedData);
            } catch { setError('Failed to load check-ins.'); setCheckIns([]); }
             finally { setIsLoadingCheckIns(false); }
        };
        fetchCheckIns();
    }, [selectedUserId]);

    const handleViewDetails = (checkInId: string) => {
        // Navigate to the check-in detail page
        navigate(`/admin/checkins/${checkInId}`);
    };

    const handleUserSelect = (userId: string) => {
        // Find the selected user to get their user_id (which links to check-ins)
        const selectedUser = users.find(user => user.id === userId);
        if (selectedUser) {
            setSelectedUserId(selectedUser.user_id);
            setCheckIns([]);
        }
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
                                    <li key={user.id}>
                                        <button 
                                            onClick={() => handleUserSelect(user.id)}
                                            className={`w-full text-left px-4 py-3 flex items-center hover:bg-gray-50 dark:hover:bg-indigo-900/30 transition-colors
                                                ${selectedUserId === user.user_id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
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
                            
                            {/* Check-ins list */}
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                {checkIns.map(checkIn => (
                                    <li key={checkIn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <button
                                            onClick={() => handleViewDetails(checkIn.id)}
                                            className="w-full text-left px-4 py-3 flex items-center justify-between"
                                        >
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/30 rounded-full p-2">
                                                    <FiCalendar className="text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm font-medium text-gray-800 dark:text-white">
                                                        {format(new Date(checkIn.check_in_date), 'MMMM d, yyyy')}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        {checkIn.body_metrics && checkIn.body_metrics.weight_kg != null
                                                            ? `Weight: ${checkIn.body_metrics.weight_kg} kg`
                                                            : 'No weight recorded'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {checkIn.notes ? 
                                                    (checkIn.notes.length > 30 
                                                        ? `${checkIn.notes.substring(0, 30)}...` 
                                                        : checkIn.notes) 
                                                    : 'No notes'}
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CheckInReview; 