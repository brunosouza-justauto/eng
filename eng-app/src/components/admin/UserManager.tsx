import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import AddAthleteForm from './AddAthleteForm'; // Import the form
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import UserEditForm from './UserEditForm'; // Import the edit form
import ProgramAssignmentModal from './ProgramAssignmentModal'; // Import the program assignment modal
import { UserProfileListItem, UserProfileFull } from '../../types/profiles'; // Import shared types

const UserManager: React.FC = () => {
    const [users, setUsers] = useState<UserProfileListItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'invited'>('all');

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

    // State for Program Assignment Modal
    const [showProgramModal, setShowProgramModal] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // State for delete confirmation
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
    const [userToDelete, setUserToDelete] = useState<UserProfileListItem | null>(null);
    const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // State for resend invitation
    const [isResendingInvite, setIsResendingInvite] = useState<boolean>(false);
    const [resendError, setResendError] = useState<string | null>(null);

    const profile = useSelector(selectProfile); // Need coach profile for ID

    // Filter users based on selection
    const filteredUsers = React.useMemo(() => {
        if (filter === 'all') return users;
        if (filter === 'active') return users.filter(user => !!user.user_id);
        if (filter === 'invited') return users.filter(user => !user.user_id);
        return users;
    }, [users, filter]);

    // Refactor fetchUsers to be callable
    const fetchUsers = async () => {
        if (!profile || !profile.id) {
            console.error("Cannot fetch users: no coach profile loaded");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            console.log("Fetching users for coach ID:", profile.id);
            
            // Get all athletes for this coach, including those with null user_id (invitations)
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('id, user_id, email, username, role, onboarding_complete, created_at, invitation_status, invited_at')
                .eq('coach_id', profile.id)
                .order('created_at', { ascending: false });
            
            if (fetchError) throw fetchError;
            
            console.log("Fetched profiles:", data ? data.length : 0, "profiles");
            if (data && data.length > 0) {
                console.log("Sample first profile:", {
                    id: data[0].id,
                    email: data[0].email,
                    role: data[0].role,
                    coach_id: profile.id // This is what we're filtering on
                });
            }
            
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

        // If this is an invited user that hasn't signed up yet,
        // just show the basic profile info we have
        if (!user.user_id) {
            // Create a basic profile object with all the optional fields set to null
            const basicProfile: UserProfileFull = {
                ...user,
                // All optional fields will be null by default
            };
            setSelectedUserDetails(basicProfile);
            setIsLoadingDetails(false);
            return;
        }

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
        
        console.log("Adding athlete with coach_id:", profile.id);
        setIsAddingUser(true);
        setAddError(null);
        
        try {
            // Step 1: Send a magic link to the athlete's email
            const { error: inviteError } = await supabase.auth.signInWithOtp({
                email: email,
                options: {
                    emailRedirectTo: `${window.location.origin}/onboarding`,
                }
            });

            if (inviteError) throw inviteError;

            // Step 2: Create a placeholder profile for this athlete
            const newProfileData = {
                email: email,
                coach_id: profile.id,
                role: 'athlete',
                onboarding_complete: false,
                username: email.split('@')[0], // Default username from email
                invitation_status: 'pending',
                invited_at: new Date().toISOString(),
            };
            
            console.log("Creating profile with data:", newProfileData);

            const { data: insertedProfile, error: profileError } = await supabase
                .from('profiles')
                .insert(newProfileData)
                .select()
                .single();

            if (profileError) throw profileError;
            
            console.log("Successfully created profile:", insertedProfile);

            // Success message
            setSuccessMessage(`Invitation sent to ${email} successfully. They'll appear in your list after signing up.`);
            setTimeout(() => setSuccessMessage(null), 5000);
            
            // Close the modal
            handleCloseAddModal();
            
            // We'll fetch users again to include the new placeholder profile
            await fetchUsers();

        } catch (err: unknown) {
            console.error("Error inviting athlete:", err);
            let message = 'Failed to send invite.';
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

    // Handle successful program assignment
    const handleProgramAssignSuccess = () => {
        setSuccessMessage('Program assigned successfully!');
        setTimeout(() => setSuccessMessage(null), 3000); // Clear message after 3 seconds
        fetchUsers(); // Refresh the user list
    };

    // Handle program assignment button click
    const handleProgramAssign = () => {
        setShowProgramModal(true);
    };

    // Handle delete athlete
    const handleDeleteUser = (user: UserProfileListItem) => {
        setUserToDelete(user);
        setShowDeleteConfirmation(true);
        setDeleteError(null);
    };

    // Confirm delete athlete
    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        
        setIsDeletingUser(true);
        setDeleteError(null);

        try {
            // Delete the user's profile
            const { error: deleteError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userToDelete.id);

            if (deleteError) throw deleteError;

            // In a real application, you might want to:
            // 1. Delete related data (assignments, check-ins, etc.)
            // 2. Send a notification to the user
            // 3. Possibly deactivate their auth account via an edge function
            
            // Update the UI by removing the deleted user
            setUsers(users.filter(u => u.id !== userToDelete.id));
            setShowDeleteConfirmation(false);
            setUserToDelete(null);
            
            // Show success message
            setSuccessMessage(`Athlete "${userToDelete.email}" has been removed.`);
            setTimeout(() => setSuccessMessage(null), 3000);
            
        } catch (err) {
            console.error("Error deleting user:", err);
            setDeleteError('Failed to delete athlete. Please try again.');
        } finally {
            setIsDeletingUser(false);
        }
    };

    // Resend invitation
    const handleResendInvitation = async (user: UserProfileListItem) => {
        if (!user.email) {
            setResendError('User email not found.');
            return;
        }
        
        setIsResendingInvite(true);
        setResendError(null);
        
        try {
            // Re-send the magic link
            const { error: inviteError } = await supabase.auth.signInWithOtp({
                email: user.email,
                options: {
                    emailRedirectTo: `${window.location.origin}/onboarding`,
                }
            });

            if (inviteError) throw inviteError;

            // Update the invitation timestamp
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    invitation_status: 'pending',
                    invited_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // Success message
            setSuccessMessage(`Invitation resent to ${user.email} successfully.`);
            setTimeout(() => setSuccessMessage(null), 5000);
            
            // Refresh users list
            await fetchUsers();

        } catch (err: unknown) {
            console.error("Error resending invite:", err);
            let message = 'Failed to resend invitation.';
            if (typeof err === 'object' && err !== null && 'message' in err) {
                message = (err as Error).message;
            }
            setResendError(message);
        } finally {
            setIsResendingInvite(false);
        }
    };

    // Add this function to help debug profile issues
    const debugProfileInfo = async () => {
        try {
            console.log("Current coach profile:", profile);
            
            // Check if there are any profiles at all
            const { data: allProfiles, error: allProfilesError } = await supabase
                .from('profiles')
                .select('id, user_id, email, role, coach_id')
                .limit(10);
                
            if (allProfilesError) throw allProfilesError;
            
            console.log("Sample of all profiles in the database:", allProfiles);
            
            // Check if the coach profile is correctly set
            if (profile && profile.id) {
                const { data: myProfile, error: myProfileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', profile.id)
                    .single();
                    
                if (myProfileError) throw myProfileError;
                
                console.log("My coach profile details:", myProfile);
            }
        } catch (err) {
            console.error("Debug error:", err);
            alert("Check console for debug info");
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Athlete Management</h1>
                <div className="flex space-x-2">
                    <button 
                        onClick={debugProfileInfo}
                        className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                        Debug
                    </button>
                    <button 
                        onClick={handleOpenAddModal}
                        className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700"
                    >
                        Add Athlete
                    </button>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="flex mb-4 space-x-2">
                <button 
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 text-sm rounded ${filter === 'all' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                >
                    All
                </button>
                <button 
                    onClick={() => setFilter('active')}
                    className={`px-3 py-1 text-sm rounded ${filter === 'active' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                >
                    Active
                </button>
                <button 
                    onClick={() => setFilter('invited')}
                    className={`px-3 py-1 text-sm rounded ${filter === 'invited' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                >
                    Invited
                </button>
            </div>

            {successMessage && (
                <div className="p-3 mb-4 text-green-700 bg-green-100 rounded dark:bg-green-900/20 dark:text-green-400">
                    {successMessage}
                </div>
            )}

            {resendError && (
                <div className="p-3 mb-4 text-red-700 bg-red-100 rounded dark:bg-red-900/20 dark:text-red-400">
                    {resendError}
                </div>
            )}

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
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Status</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Invited</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Onboarded</th>
                                <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Joined</th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap dark:text-gray-400">No users found.</td>
                                </tr>
                            )}
                            {filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap dark:text-white">{user.email ?? 'N/A'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">{user.username ?? '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">{user.role}</td>
                                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                                        {!user.user_id ? 
                                            <span className="inline-flex px-2 text-xs font-semibold leading-5 text-yellow-800 bg-yellow-100 rounded-full dark:bg-yellow-900/30 dark:text-yellow-200">Invited</span> : 
                                            <span className="inline-flex px-2 text-xs font-semibold leading-5 text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900/30 dark:text-blue-200">Active</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
                                        {user.invited_at ? new Date(user.invited_at).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                                        {user.onboarding_complete ? 
                                            <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 bg-green-100 rounded-full dark:bg-green-900/30 dark:text-green-200">Yes</span> : 
                                            <span className="inline-flex px-2 text-xs font-semibold leading-5 text-red-800 bg-red-100 rounded-full dark:bg-red-900/30 dark:text-red-200">No</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                        {!user.user_id && (
                                            <button 
                                                onClick={() => handleResendInvitation(user)}
                                                disabled={isResendingInvite}
                                                className="mr-3 text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-200 disabled:opacity-50"
                                            >
                                                Resend
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleViewUser(user)} 
                                            className="mr-3 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200"
                                        >
                                            View
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteUser(user)} 
                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
                                        >
                                            Delete
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
                                            <div className="mt-4 space-y-6">
                                                <div>
                                                    <h4 className="pb-1 mb-2 text-sm font-semibold text-gray-700 border-b border-gray-200 dark:text-gray-300 dark:border-gray-700">Basic Information</h4>
                                                    <div className="grid grid-cols-2 text-sm gap-y-2">
                                                        <div className="text-gray-600 dark:text-gray-400">Email:</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{selectedUserDetails.email || 'N/A'}</div>
                                                        
                                                        <div className="text-gray-600 dark:text-gray-400">Username:</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{selectedUserDetails.username || 'N/A'}</div>
                                                        
                                                        <div className="text-gray-600 dark:text-gray-400">Role:</div>
                                                        <div className="font-medium text-gray-900 capitalize dark:text-white">{selectedUserDetails.role || 'N/A'}</div>
                                                        
                                                        <div className="text-gray-600 dark:text-gray-400">Onboarding Status:</div>
                                                        <div>
                                                            {selectedUserDetails.onboarding_complete ? 
                                                                <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-200">Completed</span> : 
                                                                <span className="inline-flex px-2 text-xs font-semibold leading-5 text-red-800 bg-red-100 rounded-full dark:bg-red-900 dark:text-red-200">Not Completed</span>
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <h4 className="pb-1 mb-2 text-sm font-semibold text-gray-700 border-b border-gray-200 dark:text-gray-300 dark:border-gray-700">Physical Details</h4>
                                                    <div className="grid grid-cols-2 text-sm gap-y-2">
                                                        <div className="text-gray-600 dark:text-gray-400">Age:</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{selectedUserDetails.age || 'N/A'}</div>
                                                        
                                                        <div className="text-gray-600 dark:text-gray-400">Weight:</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{selectedUserDetails.weight_kg ? `${selectedUserDetails.weight_kg} kg` : 'N/A'}</div>
                                                        
                                                        <div className="text-gray-600 dark:text-gray-400">Height:</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{selectedUserDetails.height_cm ? `${selectedUserDetails.height_cm} cm` : 'N/A'}</div>
                                                        
                                                        <div className="text-gray-600 dark:text-gray-400">Body Fat:</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{selectedUserDetails.body_fat_percentage ? `${selectedUserDetails.body_fat_percentage}%` : 'N/A'}</div>
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <h4 className="pb-1 mb-2 text-sm font-semibold text-gray-700 border-b border-gray-200 dark:text-gray-300 dark:border-gray-700">Goals</h4>
                                                    <div className="grid grid-cols-2 text-sm gap-y-2">
                                                        <div className="text-gray-600 dark:text-gray-400">Target Weight:</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{selectedUserDetails.goal_target_weight_kg ? `${selectedUserDetails.goal_target_weight_kg} kg` : 'N/A'}</div>
                                                        
                                                        <div className="text-gray-600 dark:text-gray-400">Timeframe:</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{selectedUserDetails.goal_timeframe_weeks ? `${selectedUserDetails.goal_timeframe_weeks} weeks` : 'N/A'}</div>
                                                        
                                                        <div className="text-gray-600 dark:text-gray-400">Goal Details:</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{selectedUserDetails.goal_physique_details || 'N/A'}</div>
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <h4 className="pb-1 mb-2 text-sm font-semibold text-gray-700 border-b border-gray-200 dark:text-gray-300 dark:border-gray-700">Training</h4>
                                                    <div className="grid grid-cols-2 text-sm gap-y-2">
                                                        <div className="text-gray-600 dark:text-gray-400">Days Per Week:</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{selectedUserDetails.training_days_per_week || 'N/A'}</div>
                                                        
                                                        <div className="text-gray-600 dark:text-gray-400">Current Program:</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{selectedUserDetails.training_current_program || 'N/A'}</div>
                                                        
                                                        <div className="text-gray-600 dark:text-gray-400">Equipment:</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{selectedUserDetails.training_equipment || 'N/A'}</div>
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <h4 className="pb-1 mb-2 text-sm font-semibold text-gray-700 border-b border-gray-200 dark:text-gray-300 dark:border-gray-700">Nutrition</h4>
                                                    <div className="grid grid-cols-2 text-sm gap-y-2">
                                                        <div className="text-gray-600 dark:text-gray-400">Preferences:</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{selectedUserDetails.nutrition_preferences || 'N/A'}</div>
                                                        
                                                        <div className="text-gray-600 dark:text-gray-400">Allergies:</div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{selectedUserDetails.nutrition_allergies || 'N/A'}</div>
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <h4 className="pb-1 mb-2 text-sm font-semibold text-gray-700 border-b border-gray-200 dark:text-gray-300 dark:border-gray-700">Program Assignment</h4>
                                                    {/* Add a button to assign program */}
                                                    <button
                                                        onClick={handleProgramAssign}
                                                        className="px-3 py-1 mt-2 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
                                                    >
                                                        Assign Program
                                                    </button>
                                                </div>
                                            </div>
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

            {/* Program Assignment Modal */}
            {showProgramModal && selectedUserDetails && (
                <ProgramAssignmentModal
                    athleteId={selectedUserDetails.id}
                    onClose={() => setShowProgramModal(false)}
                    onSuccess={handleProgramAssignSuccess}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmation && userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-full overflow-y-auto bg-gray-600 bg-opacity-50">
                    <div className="relative w-full max-w-md p-5 bg-white border rounded-md shadow-lg dark:bg-gray-800">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Delete Athlete</h3>
                        <div className="mt-4">
                            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                                Are you sure you want to delete the athlete "{userToDelete.email}"?
                            </p>
                            
                            {deleteError && (
                                <div className="p-2 mb-4 text-sm text-red-700 bg-red-100 rounded dark:bg-red-900/20 dark:text-red-400">
                                    {deleteError}
                                </div>
                            )}
                            
                            <div className="flex justify-end">
                                <button
                                    onClick={confirmDeleteUser}
                                    disabled={isDeletingUser}
                                    className="px-4 py-2 mr-2 text-base font-medium text-white bg-red-500 rounded-md shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
                                >
                                    {isDeletingUser ? 'Deleting...' : 'Delete'}
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirmation(false)}
                                    className="px-4 py-2 text-base font-medium text-white bg-gray-500 rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TODO: Add pagination controls */}
        </div>
    );
};

export default UserManager; 