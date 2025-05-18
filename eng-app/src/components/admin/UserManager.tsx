import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { UserProfileListItem } from '../../types/profiles'; // Import shared types
import InvitationManager from './InvitationManager'; // Import the new InvitationManager
import { useNavigate } from 'react-router-dom'; // Import for navigation
import { FiSearch } from 'react-icons/fi'; // Import icons

const UserManager: React.FC = () => {
    const navigate = useNavigate(); // Hook for navigation
    const [users, setUsers] = useState<UserProfileListItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'invited'>('all');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isMobileView, setIsMobileView] = useState<boolean>(window.innerWidth < 768);

    // State for delete confirmation
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
    const [userToDelete, setUserToDelete] = useState<UserProfileListItem | null>(null);
    const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // State for resend invitation
    const [isResendingInvite, setIsResendingInvite] = useState<boolean>(false);
    const [resendError, setResendError] = useState<string | null>(null);

    const profile = useSelector(selectProfile); // Need coach profile for ID

    // Add resize listener to detect mobile/desktop view
    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth < 768);
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Get pending invitations (users with no user_id)
    const pendingInvitations = React.useMemo(() => {
        return users.filter(user => !user.user_id);
    }, [users]);

    // Filter users based on selection
    const filteredUsers = React.useMemo(() => {
        if (filter === 'all') return users;
        if (filter === 'active') return users.filter(user => !!user.user_id);
        if (filter === 'invited') return users.filter(user => !user.user_id);
        return users;
    }, [users, filter]);

    // Fetch users based on coach ID
    const fetchUsers = async () => {
        if (!profile || !profile.id) {
            setError('Coach profile not loaded. Cannot fetch athletes.');
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        setError(null);
        console.log("Fetching athletes for coach_id:", profile.id);

        try {
            // Get all users where coach_id matches the current coach's profile ID
            // Include program assignments and program names
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    program_assignments:assigned_plans!athlete_id(
                        id,
                        program_template_id,
                        start_date,
                        assigned_at,
                        program:program_templates!program_template_id(id, name, version)
                    )
                `)
                .eq('coach_id', profile.id)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            console.log("Fetched users with programs:", data);
            setUsers(data as UserProfileListItem[]);
        } catch (err: unknown) {
            console.error("Error fetching users:", err);
            let message = 'Failed to load athletes.';
            if (typeof err === 'object' && err !== null && 'message' in err) {
                message = (err as Error).message;
            }
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch users on component mount or when profile changes
    useEffect(() => {
        fetchUsers();
    }, [profile]);

    // Handle viewing user details - now navigates to the dedicated page
    const handleViewUser = (user: UserProfileListItem) => {
        navigate(`/admin/athletes/${user.id}`);
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
            // Generate a secure random password
            const generateRandomPassword = () => {
                const length = 12;
                const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=';
                let password = '';
                for (let i = 0, n = charset.length; i < length; ++i) {
                    password += charset.charAt(Math.floor(Math.random() * n));
                }
                return password;
            };
            
            // Use the admin API to create/update the user with email verification bypassed
            const { error: createUserError } = await supabase.auth.admin.createUser({
                email: user.email,
                password: generateRandomPassword(),
                email_confirm: true, // Pre-validate the email
                user_metadata: {
                    invited_at: new Date().toISOString(),
                    role: user.role || 'athlete',
                }
            });

            // Fall back to magic link if admin API method fails
            if (createUserError) {
                console.log('Admin user creation failed, falling back to magic link:', createUserError);
                
                // Re-send the magic link as a fallback
                const { error: inviteError } = await supabase.auth.signInWithOtp({
                    email: user.email,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/verify`,
                    }
                });
    
                if (inviteError) throw inviteError;
            }

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

    // Function to render status badge
    const renderStatusBadge = (user: UserProfileListItem) => {
        if (!user.user_id) {
            return <span className="inline-flex px-2 text-xs font-semibold leading-5 text-yellow-800 bg-yellow-100 rounded-full dark:bg-yellow-900/30 dark:text-yellow-200">Invited</span>;
        } 
        return <span className="inline-flex px-2 text-xs font-semibold leading-5 text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900/30 dark:text-blue-200">Active</span>;
    };

    // Function to render onboarding badge
    const renderOnboardingBadge = (user: UserProfileListItem) => {
        if (user.onboarding_complete) {
            return <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 bg-green-100 rounded-full dark:bg-green-900/30 dark:text-green-200">Yes</span>;
        }
        return <span className="inline-flex px-2 text-xs font-semibold leading-5 text-red-800 bg-red-100 rounded-full dark:bg-red-900/30 dark:text-red-200">No</span>;
    };

    // Function to get active program name
    const getActiveProgramName = (user: UserProfileListItem): string => {
        if (!user.program_assignments || user.program_assignments.length === 0) {
            return 'No program assigned';
        }
        
        // Get the most recent program assignment
        const latestAssignment = user.program_assignments.sort((a, b) => 
            new Date(b.assigned_at || "").getTime() - new Date(a.assigned_at || "").getTime()
        )[0];
        
        if (!latestAssignment || !latestAssignment.program) {
            return 'No active program';
        }
        
        // Display version if it exists and is greater than 1
        if (latestAssignment.program.version && latestAssignment.program.version > 1) {
            return `${latestAssignment.program.name} v${latestAssignment.program.version}`;
        }
        
        return latestAssignment.program.name;
    };

    // Function to render program badge
    const renderProgramBadge = (user: UserProfileListItem) => {
        if (!user.program_assignments || user.program_assignments.length === 0) {
            return <span className="inline-flex px-2 text-xs font-semibold leading-5 text-gray-800 bg-gray-100 rounded-full dark:bg-gray-700 dark:text-gray-300">No Program</span>;
        }
        
        // Get the most recent program assignment
        const latestAssignment = user.program_assignments.sort((a, b) => 
            new Date(b.assigned_at || "").getTime() - new Date(a.assigned_at || "").getTime()
        )[0];
        
        if (!latestAssignment || !latestAssignment.program) {
            return <span className="inline-flex px-2 text-xs font-semibold leading-5 text-gray-800 bg-gray-100 rounded-full dark:bg-gray-700 dark:text-gray-300">No Program</span>;
        }
        
        // Program name with version if applicable
        const programName = latestAssignment.program.version && latestAssignment.program.version > 1
            ? `${latestAssignment.program.name} v${latestAssignment.program.version}`
            : latestAssignment.program.name;
        
        return (
            <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 bg-green-100 rounded-full dark:bg-green-900/30 dark:text-green-200">
                {programName}
            </span>
        );
    };

    // Helper function to get user display name
    const getUserDisplayName = (user: UserProfileListItem): string => {
        if (user.first_name && user.last_name) {
            return `${user.first_name} ${user.last_name}`;
        } else if (user.username) {
            return user.username;
        } else {
            return user.email || 'Unnamed User';
        }
    };

    return (
        <div className="container px-4 py-6 mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Athlete Management</h1>
                <div className="flex space-x-2">
                    <button 
                        onClick={debugProfileInfo}
                        className="hidden px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                        Debug
                    </button>
                </div>
            </div>

            {/* Display success message globally */}
            {successMessage && (
                <div className="p-3 mb-4 text-green-700 bg-green-100 rounded dark:bg-green-900/20 dark:text-green-400">
                    {successMessage}
                </div>
            )}

            {error && (
                <div className="p-4 mb-6 text-red-700 bg-red-100 border-l-4 border-red-500 rounded dark:bg-red-900/20 dark:border-red-500 dark:text-red-400" role="alert">
                    <p>{error}</p>
                </div>
            )}

            {resendError && (
                <div className="p-3 mb-4 text-red-700 bg-red-100 rounded dark:bg-red-900/20 dark:text-red-400">
                    {resendError}
                </div>
            )}

            {/* Render InvitationManager component */}
            {profile && profile.id && (
                <InvitationManager 
                    coachId={profile.id}
                    pendingInvitations={pendingInvitations}
                    onInviteSent={(email) => {
                        setSuccessMessage(`Invitation sent to ${email} successfully.`);
                        setTimeout(() => setSuccessMessage(null), 5000);
                        fetchUsers(); // Refresh the user list
                    }}
                    onResendInvitation={handleResendInvitation}
                    isResendingInvite={isResendingInvite}
                />
            )}

            {/* Filter Controls */}
            <div className="flex mb-6 space-x-2">
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

            {isLoading ? (
                <div className="py-10 text-center">
                    <p className="text-gray-500 dark:text-gray-400">Loading athletes...</p>
                </div>
            ) : !isMobileView && (
                <div className="overflow-hidden bg-white rounded-lg shadow-md dark:bg-gray-800">
                    <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                        <div className="flex items-center">
                            <div className="relative w-64">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <FiSearch className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="w-full py-2 pl-10 pr-4 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="Search athletes..."
                                    // Add search functionality if needed
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Email</th>
                                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Name</th>
                                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Status</th>
                                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Invited</th>
                                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Onboarded</th>
                                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Joined</th>
                                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Program</th>
                                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Gender</th>
                                    <th scope="col" className="relative px-6 py-3">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap dark:text-gray-400">No athletes found.</td>
                                    </tr>
                                )}
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-indigo-900/30">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap dark:text-white">{user.email}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">{user.first_name} {user.last_name}</td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                            {renderStatusBadge(user)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
                                            {user.invited_at ? new Date(user.invited_at).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                            {renderOnboardingBadge(user)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
                                            {getActiveProgramName(user)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">{user.gender ?? 'N/A'}</td>
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
                </div>
            )}

            {/* Mobile card view */}
            {!isLoading && isMobileView && (
                <div className="grid grid-cols-1 gap-4">
                    {filteredUsers.length === 0 && (
                        <div className="p-4 text-sm text-center text-gray-500 bg-white rounded-lg shadow dark:bg-gray-800 dark:text-gray-400">
                            No athletes found.
                        </div>
                    )}
                    {filteredUsers.map((user) => (
                        <div key={user.id} className="overflow-hidden bg-white rounded-lg shadow dark:bg-gray-800">
                            <div className="px-4 py-5 sm:p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-medium leading-6 text-gray-900 truncate dark:text-white">
                                            {getUserDisplayName(user)}
                                        </h3>
                                        <div className="flex flex-wrap mt-1 gap-x-2">
                                            {renderStatusBadge(user)}
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {user.username ?? '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Role</p>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white">{user.role}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Joined</p>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Invited</p>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                            {user.invited_at ? new Date(user.invited_at).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Onboarded</p>
                                        <div className="mt-1">
                                            {renderOnboardingBadge(user)}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Program</p>
                                        <div className="mt-1">
                                            {renderProgramBadge(user)}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Gender</p>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white">{user.gender ?? 'N/A'}</p>
                                    </div>
                                </div>
                                
                                <div className="flex justify-end mt-4 space-x-3">
                                    {!user.user_id && (
                                        <button 
                                            onClick={() => handleResendInvitation(user)}
                                            disabled={isResendingInvite}
                                            className="px-3 py-1 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50"
                                        >
                                            Resend
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleViewUser(user)} 
                                        className="px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:hover:bg-indigo-900/50"
                                    >
                                        View
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteUser(user)} 
                                        className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmation && userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-full overflow-y-auto bg-black bg-opacity-50">
                    <div className="relative w-full max-w-md p-5 bg-white rounded-lg shadow-lg dark:bg-gray-800">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Delete Athlete</h3>
                        <div className="mt-4">
                            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                                Are you sure you want to delete the athlete "{getUserDisplayName(userToDelete)}"?
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
                                    className="px-4 py-2 mr-2 text-base font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
                                >
                                    {isDeletingUser ? 'Deleting...' : 'Delete'}
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirmation(false)}
                                    className="px-4 py-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
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