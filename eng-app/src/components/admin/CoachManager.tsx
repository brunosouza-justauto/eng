import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { UserProfileListItem } from '../../types/profiles'; // Import shared types
import InvitationManager from './InvitationManager'; // Import the new InvitationManager
import { FiSearch } from 'react-icons/fi'; // Import icons
import { useNavigate } from 'react-router-dom'; // Import for navigation

const CoachManager: React.FC = () => {
    const navigate = useNavigate(); // Hook for navigation
    const [coaches, setCoaches] = useState<UserProfileListItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'invited'>('all');
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isMobileView, setIsMobileView] = useState<boolean>(window.innerWidth < 768);

    // State for delete confirmation
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
    const [coachToDelete, setCoachToDelete] = useState<UserProfileListItem | null>(null);
    const [isDeletingCoach, setIsDeletingCoach] = useState<boolean>(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // State for resend invitation
    const [isResendingInvite, setIsResendingInvite] = useState<boolean>(false);
    const [resendError, setResendError] = useState<string | null>(null);

    const profile = useSelector(selectProfile); // Need admin profile for ID

    // Add resize listener to detect mobile/desktop view
    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth < 768);
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Get pending invitations (coaches with no user_id)
    const pendingInvitations = React.useMemo(() => {
        return coaches.filter(coach => !coach.user_id);
    }, [coaches]);

    // Filter coaches based on selection
    const filteredCoaches = React.useMemo(() => {
        if (filter === 'all') return coaches;
        if (filter === 'active') return coaches.filter(coach => !!coach.user_id);
        if (filter === 'invited') return coaches.filter(coach => !coach.user_id);
        return coaches;
    }, [coaches, filter]);

    // Fetch coaches
    const fetchCoaches = async () => {
        if (!profile || !profile.id) {
            setError('Admin profile not loaded. Cannot fetch coaches.');
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        setError(null);

        try {
            // Get all users with role = coach
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'coach')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            setCoaches(data as UserProfileListItem[]);
        } catch (err: unknown) {
            console.error("Error fetching coaches:", err);
            let message = 'Failed to load coaches.';
            if (typeof err === 'object' && err !== null && 'message' in err) {
                message = (err as Error).message;
            }
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch coaches on component mount or when profile changes
    useEffect(() => {
        fetchCoaches();
    }, [profile]);

    // Handle viewing coach details
    const handleViewCoach = (coach: UserProfileListItem) => {
        navigate(`/admin/coaches/${coach.id}`);
    };

    // Handle delete coach
    const handleDeleteCoach = (coach: UserProfileListItem) => {
        setCoachToDelete(coach);
        setShowDeleteConfirmation(true);
        setDeleteError(null);
    };

    // Confirm delete coach
    const confirmDeleteCoach = async () => {
        if (!coachToDelete) return;
        
        setIsDeletingCoach(true);
        setDeleteError(null);

        try {
            // Delete the coach's profile
            const { error: deleteError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', coachToDelete.id);

            if (deleteError) throw deleteError;
            
            // Update the UI by removing the deleted coach
            setCoaches(coaches.filter(c => c.id !== coachToDelete.id));
            setShowDeleteConfirmation(false);
            setCoachToDelete(null);
            
            // Show success message
            setSuccessMessage(`Coach "${coachToDelete.email}" has been removed.`);
            setTimeout(() => setSuccessMessage(null), 3000);
            
        } catch (err) {
            console.error("Error deleting coach:", err);
            setDeleteError('Failed to delete coach. Please try again.');
        } finally {
            setIsDeletingCoach(false);
        }
    };

    // Resend invitation
    const handleResendInvitation = async (coach: UserProfileListItem) => {
        if (!coach.email) {
            setResendError('Coach email not found.');
            return;
        }
        
        setIsResendingInvite(true);
        setResendError(null);
        
        try {
            // Re-send the magic link
            const { error: inviteError } = await supabase.auth.signInWithOtp({
                email: coach.email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/verify`,
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
                .eq('id', coach.id);

            if (updateError) throw updateError;

            // Success message
            setSuccessMessage(`Invitation resent to ${coach.email} successfully.`);
            setTimeout(() => setSuccessMessage(null), 5000);
            
            // Refresh coaches list
            await fetchCoaches();

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

    // Function to render status badge
    const renderStatusBadge = (coach: UserProfileListItem) => {
        if (!coach.user_id) {
            return <span className="inline-flex px-2 text-xs font-semibold leading-5 text-yellow-800 bg-yellow-100 rounded-full dark:bg-yellow-900/30 dark:text-yellow-200">Invited</span>;
        } 
        return <span className="inline-flex px-2 text-xs font-semibold leading-5 text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900/30 dark:text-blue-200">Active</span>;
    };

    // Function to render onboarding badge
    const renderOnboardingBadge = (coach: UserProfileListItem) => {
        if (coach.onboarding_complete) {
            return <span className="inline-flex px-2 text-xs font-semibold leading-5 text-green-800 bg-green-100 rounded-full dark:bg-green-900/30 dark:text-green-200">Yes</span>;
        }
        return <span className="inline-flex px-2 text-xs font-semibold leading-5 text-red-800 bg-red-100 rounded-full dark:bg-red-900/30 dark:text-red-200">No</span>;
    };

    return (
        <div className="container mx-auto py-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Coach Management</h1>
            </div>

            {/* Display success message globally */}
            {successMessage && (
                <div className="p-3 mb-4 text-green-700 bg-green-100 rounded dark:bg-green-900/20 dark:text-green-400">
                    {successMessage}
                </div>
            )}

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded dark:bg-red-900/20 dark:border-red-500 dark:text-red-400" role="alert">
                    <p>{error}</p>
                </div>
            )}

            {resendError && (
                <div className="p-3 mb-4 text-red-700 bg-red-100 rounded dark:bg-red-900/20 dark:text-red-400">
                    {resendError}
                </div>
            )}

            {/* Render InvitationManager component for coaches */}
            {profile && profile.id && (
                <InvitationManager 
                    coachId={profile.id}
                    pendingInvitations={pendingInvitations}
                    userRole="coach"
                    onInviteSent={(email) => {
                        setSuccessMessage(`Invitation sent to ${email} successfully.`);
                        setTimeout(() => setSuccessMessage(null), 5000);
                        fetchCoaches(); // Refresh the coach list
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
                <div className="text-center py-10">
                    <p className="text-gray-500 dark:text-gray-400">Loading coaches...</p>
                </div>
            ) : !isMobileView && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                    <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="relative w-64">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <FiSearch className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="pl-10 pr-4 py-2 w-full border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="Search coaches..."
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
                                    <th scope="col" className="relative px-6 py-3">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {filteredCoaches.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-4 text-sm text-center text-gray-500 whitespace-nowrap dark:text-gray-400">No coaches found.</td>
                                    </tr>
                                )}
                                {filteredCoaches.map((coach) => (
                                    <tr key={coach.id} className="hover:bg-gray-50 dark:hover:bg-indigo-900/30">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap dark:text-white">{coach.email ?? 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">{coach.first_name} {coach.last_name}</td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                            {renderStatusBadge(coach)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
                                            {coach.invited_at ? new Date(coach.invited_at).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                            {renderOnboardingBadge(coach)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
                                            {new Date(coach.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                            {!coach.user_id && (
                                                <button 
                                                    onClick={() => handleResendInvitation(coach)}
                                                    disabled={isResendingInvite}
                                                    className="mr-3 text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-200 disabled:opacity-50"
                                                >
                                                    Resend
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleViewCoach(coach)} 
                                                className="mr-3 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200"
                                            >
                                                View
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteCoach(coach)} 
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
                    {filteredCoaches.length === 0 && (
                        <div className="p-4 text-sm text-center text-gray-500 bg-white rounded-lg shadow dark:bg-gray-800 dark:text-gray-400">
                            No coaches found.
                        </div>
                    )}
                    {filteredCoaches.map((coach) => (
                        <div key={coach.id} className="overflow-hidden bg-white rounded-lg shadow dark:bg-gray-800">
                            <div className="px-4 py-5 sm:p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-medium leading-6 text-gray-900 truncate dark:text-white">
                                            {coach.email ?? 'N/A'}
                                        </h3>
                                        <div className="flex flex-wrap mt-1 gap-x-2">
                                            {renderStatusBadge(coach)}
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {coach.username ?? '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Role</p>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white">{coach.role}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Joined</p>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                            {new Date(coach.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Invited</p>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                            {coach.invited_at ? new Date(coach.invited_at).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Onboarded</p>
                                        <div className="mt-1">
                                            {renderOnboardingBadge(coach)}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex justify-end mt-4 space-x-3">
                                    {!coach.user_id && (
                                        <button 
                                            onClick={() => handleResendInvitation(coach)}
                                            disabled={isResendingInvite}
                                            className="px-3 py-1 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50"
                                        >
                                            Resend
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleViewCoach(coach)} 
                                        className="px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-200 dark:hover:bg-indigo-900/50"
                                    >
                                        View
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteCoach(coach)} 
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
            {showDeleteConfirmation && coachToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-full overflow-y-auto bg-black bg-opacity-50">
                    <div className="relative w-full max-w-md p-5 bg-white rounded-lg shadow-lg dark:bg-gray-800">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Delete Coach</h3>
                        <div className="mt-4">
                            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                                Are you sure you want to delete the coach "{coachToDelete.email}"?
                            </p>
                            
                            {deleteError && (
                                <div className="p-2 mb-4 text-sm text-red-700 bg-red-100 rounded dark:bg-red-900/20 dark:text-red-400">
                                    {deleteError}
                                </div>
                            )}
                            
                            <div className="flex justify-end">
                                <button
                                    onClick={confirmDeleteCoach}
                                    disabled={isDeletingCoach}
                                    className="px-4 py-2 mr-2 text-base font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
                                >
                                    {isDeletingCoach ? 'Deleting...' : 'Delete'}
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirmation(false)}
                                    className="px-4 py-2 text-base font-medium border border-gray-300 rounded-md shadow-sm text-gray-700 dark:text-gray-300 dark:border-gray-600 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoachManager; 