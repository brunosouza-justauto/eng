import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

// Define type for user profile data (subset needed for list)
interface UserProfileListItem {
    id: string; // profile UUID
    user_id: string; // auth user UUID
    email: string | null;
    username: string | null;
    role: string;
    onboarding_complete: boolean;
    created_at: string;
}

// Define type for full user profile data (can reuse/refine from onboarding later)
interface UserProfileFull extends UserProfileListItem {
    age?: number | null;
    weight_kg?: number | null;
    height_cm?: number | null;
    body_fat_percentage?: number | null;
    goal_target_fat_loss_kg?: number | null;
    goal_timeframe_weeks?: number | null;
    goal_target_weight_kg?: number | null;
    goal_physique_details?: string | null;
    training_days_per_week?: number | null;
    training_current_program?: string | null;
    training_equipment?: string | null;
    training_session_length_minutes?: number | null;
    training_intensity?: string | null;
    nutrition_meal_patterns?: string | null;
    nutrition_tracking_method?: string | null;
    nutrition_preferences?: string | null;
    nutrition_allergies?: string | null;
    lifestyle_sleep_hours?: number | null;
    lifestyle_stress_level?: number | null;
    lifestyle_water_intake_liters?: number | null;
    lifestyle_schedule_notes?: string | null;
    supplements_meds?: string | null;
    motivation_readiness?: string | null;
    // Add other profile fields if needed
}

const UserManager: React.FC = () => {
    const [users, setUsers] = useState<UserProfileListItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // State for modal
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [selectedUser, setSelectedUser] = useState<UserProfileListItem | null>(null);
    const [selectedUserDetails, setSelectedUserDetails] = useState<UserProfileFull | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            setError(null);
            setUsers([]);

            try {
                // Fetch all profiles (consider pagination for large numbers)
                const { data, error: fetchError } = await supabase
                    .from('profiles')
                    .select('id, user_id, email, username, role, onboarding_complete, created_at')
                    .order('created_at', { ascending: false });

                if (fetchError) throw fetchError;

                setUsers(data || []);

            } catch (err: unknown) {
                console.error("Error fetching users:", err);
                let message = 'Failed to load users.';
                if (typeof err === 'object' && err !== null && 'message' in err) {
                    message = (err as Error).message;
                }
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const handleViewUser = async (user: UserProfileListItem) => {
        setSelectedUser(user);
        setIsModalOpen(true);
        setIsLoadingDetails(true);
        setDetailError(null);
        setSelectedUserDetails(null);

        console.log('Fetching details for user:', user.user_id);
        try {
             const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.user_id)
                .single();

            if (error) throw error;

            if (data) {
                setSelectedUserDetails(data as UserProfileFull);
            } else {
                throw new Error('Full profile not found.');
            }
        } catch (err: unknown) {
            console.error("Error fetching user details:", err);
            let message = 'Failed to load user details.';
            if (typeof err === 'object' && err !== null && 'message' in err) {
                message = (err as Error).message;
            }
            setDetailError(message);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">User Management</h1>

            {isLoading && <p>Loading users...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}

            {!isLoading && (
                <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Onboarded</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Joined</th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">No users found.</td>
                                </tr>
                            )}
                            {users.map((user) => (
                                <tr key={user.user_id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.email ?? 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.username ?? '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {user.onboarding_complete ? 
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Yes</span> : 
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">No</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            onClick={() => handleViewUser(user)} 
                                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Placeholder for Modal - Implement next */}
            {isModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
                    <div className="relative p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white dark:bg-gray-800">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">User Details ({selectedUser.email})</h3>
                        <div className="mt-2 px-7 py-3 space-y-2">
                             {isLoadingDetails && <p>Loading details...</p>}
                             {detailError && <p className="text-red-500">Error: {detailError}</p>}
                             {!isLoadingDetails && !detailError && selectedUserDetails && (
                                <>
                                    <p className="text-sm text-gray-500 dark:text-gray-300">
                                        Editing coming soon...
                                    </p>
                                    {/* TODO: Render UserEditForm component here */}
                                    <pre className="text-xs overflow-auto bg-gray-100 dark:bg-gray-700 p-2 rounded">{JSON.stringify(selectedUserDetails, null, 2)}</pre>
                                </> 
                             )}
                              {!isLoadingDetails && !detailError && !selectedUserDetails && (
                                 <p className="text-sm text-gray-500 dark:text-gray-300">
                                     Could not load full details.
                                 </p>
                             )}
                        </div>
                        <div className="items-center px-4 py-3">
                            <button
                                id="ok-btn"
                                onClick={handleCloseModal}
                                className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TODO: Add pagination controls */}
        </div>
    );
};

export default UserManager; 