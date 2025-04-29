import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import AddAthleteForm from './AddAthleteForm'; // Import the form
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import UserEditForm from './UserEditForm'; // Import the edit form

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
    // State for modal edit mode
    const [isEditingUser, setIsEditingUser] = useState<boolean>(false);
    const [isSavingUser, setIsSavingUser] = useState<boolean>(false); // For edit save state

    // State for Add Athlete Modal
    const [showAddModal, setShowAddModal] = useState<boolean>(false);
    const [isAddingUser, setIsAddingUser] = useState<boolean>(false);
    const [addError, setAddError] = useState<string | null>(null);

    const profile = useSelector(selectProfile); // Need coach profile for ID

    // Refactor fetchUsers to be callable
    const fetchUsers = async () => {
        if (!profile || !profile.id) return;
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('id, user_id, email, username, role, onboarding_complete, created_at')
                .eq('coach_id', profile.id) 
                .neq('role', 'coach')
                .order('created_at', { ascending: false });
            if (fetchError) throw fetchError;
            setUsers(data || []);
        } catch (err: unknown) {
            console.error("Error fetching users:", err);
            setError('Failed to load users.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [profile]); // Depend on profile now

    const handleViewUser = async (user: UserProfileListItem) => {
        setSelectedUser(user);
        setIsModalOpen(true);
        setIsLoadingDetails(true);
        setDetailError(null);
        setSelectedUserDetails(null);
        setIsEditingUser(false); // Start in view mode

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
        setSelectedUserDetails(null);
        setIsEditingUser(false); // Reset edit mode on close
        setDetailError(null);
    };

    const handleOpenAddModal = () => {
        setShowAddModal(true);
        setAddError(null);
    };

    const handleCloseAddModal = () => {
        setShowAddModal(false);
    };

    const handleAddAthlete = async (email: string) => {
        if (!profile || !profile.id) {
            setAddError('Coach profile not loaded. Cannot add athlete.');
            return;
        }
        setIsAddingUser(true);
        setAddError(null);
        
        try {
            // --- Simulate Invite Flow --- 
            console.log(`Simulating sending invite to: ${email}`);
            // In a real implementation, you would call a Supabase Edge Function here.
            // The Edge Function would use the service key to call:
            // await supabase.auth.admin.inviteUserByEmail(email, { 
            //    redirectTo: window.location.origin, // Or your app URL
            //    data: { inviter_coach_id: profile.id } // Optional metadata 
            // });
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000)); 

            // --- End Simulation ---

            // Success (simulation)
            console.log('Simulated invite sent successfully for:', email);
            handleCloseAddModal();
            // Note: We don't refetch users here, as the invite doesn't 
            // immediately create a profile linked to the coach.
            // The user will appear after they sign up and are linked.

        } catch (err: unknown) {
            // This catch block would handle errors from the Edge Function call
            console.error("Error simulating invite:", err);
            let message = 'Failed to send invite (simulation).';
            if (typeof err === 'object' && err !== null && 'message' in err) {
                message = (err as Error).message;
            }
            setAddError(message);
        } finally {
            setIsAddingUser(false);
        }
    };

    const handleUpdateUser = async (formData: Partial<UserProfileFull>) => {
        if (!selectedUserDetails) return;
        setIsSavingUser(true);
        setDetailError(null);
        try {
            // Manually construct payload with only editable fields
            // Adjust this list based on what fields are actually in UserEditForm
            const updatePayload: Partial<UserProfileFull> = {
                username: formData.username,
                role: formData.role,
                age: formData.age,
                weight_kg: formData.weight_kg,
                height_cm: formData.height_cm,
                // ... add ALL other editable fields from UserProfileFull/UserEditForm
                // Ensure type consistency (e.g., convert numbers if needed)
            };
            // Remove undefined properties to avoid overwriting existing DB values
            Object.keys(updatePayload).forEach(key => 
                updatePayload[key as keyof typeof updatePayload] === undefined && delete updatePayload[key as keyof typeof updatePayload]
            );

            console.log("Updating user profile:", selectedUserDetails.id, updatePayload);
            const { data, error } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', selectedUserDetails.id)
                .select('*') 
                .single();

            if (error) throw error;

            // Update state
            setSelectedUserDetails(data as UserProfileFull);
            setUsers(prev => prev.map(u => u.id === data.id ? { ...u, ...data } : u));
            setIsEditingUser(false);

        } catch { 
            setDetailError('Failed to update user profile.');
        } finally {
            setIsSavingUser(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">User Management</h1>
                <button 
                    onClick={handleOpenAddModal}
                    className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700"
                >
                    Add Athlete
                </button>
            </div>

            {isLoading && <p>Loading users...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}

            {!isLoading && (
                <div className="overflow-x-auto bg-white rounded-lg shadow dark:bg-gray-800">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Email</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Username</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Role</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Onboarded</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Joined</th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap dark:text-gray-400">No users found.</td>
                                </tr>
                            )}
                            {users.map((user) => (
                                <tr key={user.user_id}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap dark:text-white">{user.email ?? 'N/A'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">{user.username ?? '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">{user.role}</td>
                                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                                        {user.onboarding_complete ? 
                                            <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-200">Yes</span> : 
                                            <span className="inline-flex px-2 text-xs font-semibold leading-5 text-red-800 bg-red-100 rounded-full dark:bg-red-900 dark:text-red-200">No</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
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

            {/* View/Edit User Modal */} 
            {isModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-full overflow-y-auto bg-gray-600 bg-opacity-50">
                    <div className="relative w-11/12 p-5 bg-white border rounded-md shadow-lg md:w-1/2 lg:w-1/3 dark:bg-gray-800">
                        {/* Modal Header */} 
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">User Details ({selectedUser.email})</h3>
                            <button onClick={() => setIsEditingUser(!isEditingUser)} className="text-xs text-blue-500 hover:underline">
                                {isEditingUser ? 'Cancel Edit' : 'Edit'}
                            </button>
                        </div>
                        
                        {/* Modal Body */} 
                        <div className="py-3 mt-2 space-y-2 px-7">
                             {isLoadingDetails && <p>Loading details...</p>}
                             {detailError && <p className="text-red-500">Error: {detailError}</p>}
                             {!isLoadingDetails && !detailError && selectedUserDetails && (
                                <>
                                    {isEditingUser ? (
                                        /* Render UserEditForm */
                                        <UserEditForm 
                                            user={selectedUserDetails} 
                                            onSave={handleUpdateUser} 
                                            isSaving={isSavingUser} 
                                        />
                                    ) : (
                                        /* View Mode */
                                        <div>
                                             <p className="mb-2 text-sm text-gray-500 dark:text-gray-300">
                                                Read-only view. Click 'Edit' to modify.
                                            </p>
                                            <pre className="p-2 overflow-auto text-xs bg-gray-100 rounded dark:bg-gray-700">{JSON.stringify(selectedUserDetails, null, 2)}</pre>
                                        </div>
                                    )}
                                </> 
                             )}
                        </div>
                        
                        {/* Modal Footer */} 
                        <div className="items-center px-4 py-3 text-right">
                           {isEditingUser ? (
                               // Save button is inside the UserEditForm
                                <span className="text-xs text-gray-500">(Save action is in the form)</span>
                           ) : (
                               <button
                                    id="close-view-btn"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-base font-medium text-white bg-gray-500 rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                >
                                    Close
                                </button>
                           )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Athlete Modal */} 
             {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-full overflow-y-auto bg-gray-600 bg-opacity-50">
                    <div className="relative w-full max-w-md p-5 bg-white border rounded-md shadow-lg dark:bg-gray-800">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Add New Athlete</h3>
                        <div className="mt-4">
                           <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                               Enter the email address of the athlete you want to invite. They will need to sign up using this email.
                           </p>
                           {/* Render AddAthleteForm */}
                           <AddAthleteForm 
                                onAddAthlete={handleAddAthlete} 
                                isAdding={isAddingUser} 
                           />

                            {addError && <p className="mt-2 text-sm text-red-500">Error: {addError}</p>}
                        </div>
                        <div className="items-center px-4 py-3 mt-4 text-right">
                             <button
                                onClick={handleCloseAddModal}
                                className="px-4 py-2 mr-2 text-base font-medium text-white bg-gray-500 rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                            >
                                Cancel
                            </button>
                             {/* Submit button is now inside AddAthleteForm */}
                        </div>
                    </div>
                </div>
            )}

            {/* TODO: Add pagination controls */}
        </div>
    );
};

export default UserManager; 