import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectUser, selectProfile } from '../../store/slices/authSlice';
import { FiSearch, FiPlus } from 'react-icons/fi';

// Types needed
interface UserSelectItem {
    id: string; // profile id (primary key)
    user_id: string; // auth user id
    email: string | null;
    username: string | null;
    first_name?: string | null;
    last_name?: string | null;
}

interface StepGoalItem {
    id: string;
    user_id: string;
    daily_steps: number;
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
    user?: UserSelectItem;
}

const StepGoalSetter: React.FC = () => {
    const [users, setUsers] = useState<UserSelectItem[]>([]);
    const [allStepGoals, setAllStepGoals] = useState<StepGoalItem[]>([]);
    const [filteredStepGoals, setFilteredStepGoals] = useState<StepGoalItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');
    const [newGoal, setNewGoal] = useState<string>(''); // Input field state
    const [currentGoal, setCurrentGoal] = useState<number | null>(null);
    
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingGoals, setIsLoadingGoals] = useState(true);
    const [isLoadingGoal, setIsLoadingGoal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    
    const user = useSelector(selectUser);
    const profile = useSelector(selectProfile);

    // Fetch athletes linked to this coach
    useEffect(() => {
        const fetchAthletes = async () => {
            if (!user || !profile) return;
            setIsLoadingUsers(true);
            setError(null);
            try {
                // Fetch athletes linked to this coach
                const { data, error: fetchError } = await supabase
                    .from('profiles')
                    .select('id, user_id, email, username, first_name, last_name')
                    .eq('coach_id', profile.id)
                    .order('username, email');
                
                if (fetchError) throw fetchError;
                setUsers(data || []);
            } catch (err) {
                console.error("Error fetching athletes:", err);
                setError('Failed to load athletes. Please refresh the page and try again.');
            } finally { 
                setIsLoadingUsers(false);
            }
        };
        fetchAthletes();
    }, [user, profile]);

    // Fetch all active step goals
    useEffect(() => {
        const fetchAllStepGoals = async () => {
            if (!profile || !users.length) return;
            
            setIsLoadingGoals(true);
            setError(null);
            
            try {
                const userIds = users.map(u => u.id);
                
                const { data, error: fetchError } = await supabase
                    .from('step_goals')
                    .select('*')
                    .in('user_id', userIds)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });
                
                if (fetchError) throw fetchError;
                
                // Merge user data with step goals
                const goalsWithUserData = data?.map(goal => {
                    const userData = users.find(u => u.id === goal.user_id);
                    return { ...goal, user: userData };
                }) || [];
                
                setAllStepGoals(goalsWithUserData);
                setFilteredStepGoals(goalsWithUserData);
            } catch (err) {
                console.error("Error loading step goals:", err);
                setError('Failed to load step goals.');
            } finally {
                setIsLoadingGoals(false);
            }
        };
        
        if (users.length > 0) {
            fetchAllStepGoals();
        }
    }, [users, profile]);

    // Filter step goals based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredStepGoals(allStepGoals);
            return;
        }
        
        const query = searchQuery.toLowerCase();
        const filtered = allStepGoals.filter(goal => {
            const user = goal.user;
            return (
                user?.first_name?.toLowerCase().includes(query) ||
                user?.last_name?.toLowerCase().includes(query) ||
                user?.username?.toLowerCase().includes(query) ||
                user?.email?.toLowerCase().includes(query) ||
                goal.daily_steps.toString().includes(query)
            );
        });
        
        setFilteredStepGoals(filtered);
    }, [searchQuery, allStepGoals]);

    // Fetch current goal when selected user changes
    useEffect(() => {
        const fetchCurrentGoal = async () => {
            if (!selectedProfileId) {
                setNewGoal('');
                setCurrentGoal(null);
                return;
            }
            
            setIsLoadingGoal(true);
            setError(null);
            
            try {
                // Fetch active step goal
                const { data: goalData, error: fetchError } = await supabase
                    .from('step_goals')
                    .select('id, daily_steps')
                    .eq('user_id', selectedProfileId)
                    .eq('is_active', true)
                    .maybeSingle();
                
                if (fetchError) throw fetchError;
                
                if (goalData) {
                    setCurrentGoal(goalData.daily_steps);
                    setNewGoal(goalData.daily_steps.toString());
                } else {
                    setCurrentGoal(null);
                    setNewGoal('');
                }
                
            } catch (err) {
                console.error("Error loading current step goal:", err);
                setError('Failed to load current step goal.');
                setNewGoal('');
                setCurrentGoal(null);
            } finally { 
                setIsLoadingGoal(false);
            }
        };
        
        fetchCurrentGoal();
    }, [selectedProfileId]);

    // Save Goal Logic
    const handleSaveGoal = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedProfileId) return;
        
        const newGoalValue = parseInt(newGoal, 10);
        if (isNaN(newGoalValue) || newGoalValue < 0) {
            setError('Please enter a valid non-negative number for the step goal.');
            return;
        }
        
        setIsSaving(true);
        setError(null);
        setSaveMessage(null);

        try {
            // 1. Find and deactivate the current active goal (if one exists)
            const { data: currentActiveGoal, error: findError } = await supabase
                .from('step_goals')
                .select('id')
                .eq('user_id', selectedProfileId)
                .eq('is_active', true)
                .maybeSingle();
            
            if (findError) throw findError;

            if (currentActiveGoal) {
                console.log('Deactivating old goal:', currentActiveGoal.id);
                const { error: deactivateError } = await supabase
                    .from('step_goals')
                    .update({ is_active: false, updated_at: new Date().toISOString() })
                    .eq('id', currentActiveGoal.id);
                    
                if (deactivateError) throw deactivateError;
            }

            // 2. Insert the new goal as active
            console.log('Inserting new goal for profile:', selectedProfileId, 'Goal:', newGoalValue);
            const { error: insertError } = await supabase
                .from('step_goals')
                .insert({ 
                    user_id: selectedProfileId,
                    daily_steps: newGoalValue,
                    is_active: true 
                });

            if (insertError) throw insertError;
            
            // Update UI with success message and new goal
            setSaveMessage(`Step goal of ${newGoalValue.toLocaleString()} steps successfully assigned!`);
            setCurrentGoal(newGoalValue);
            
            // Refresh the list of goals
            const userIds = users.map(u => u.id);
            const { data } = await supabase
                .from('step_goals')
                .select('*')
                .in('user_id', userIds)
                .eq('is_active', true)
                .order('created_at', { ascending: false });
                
            if (data) {
                const goalsWithUserData = data.map(goal => {
                    const userData = users.find(u => u.id === goal.user_id);
                    return { ...goal, user: userData };
                });
                
                setAllStepGoals(goalsWithUserData);
                setFilteredStepGoals(goalsWithUserData);
            }
            
            // Close the form
            handleCancel();
            
            // Clear success message after a delay
            setTimeout(() => setSaveMessage(null), 5000);

        } catch (err: unknown) {
            console.error("Error saving step goal:", err);
            setError(`Failed to save step goal: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Delete goal logic
    const handleDeleteGoal = async (goalId: string) => {
        if (!profile) return;
        setError(null);
        
        try {
            // Mark the goal as inactive instead of deleting
            const { error } = await supabase
                .from('step_goals')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', goalId);
            
            if (error) throw error;
            
            // Update the local state
            setAllStepGoals(goals => goals.filter(goal => goal.id !== goalId));
            setFilteredStepGoals(goals => goals.filter(goal => goal.id !== goalId));
            
            // If we were editing this goal, reset the form
            if (isEditing) {
                handleCancel();
            }
            
            setSaveMessage('Step goal successfully removed.');
            
            // Clear success message after a delay
            setTimeout(() => setSaveMessage(null), 5000);
        } catch (err) {
            console.error("Error deleting step goal:", err);
            setError('Failed to delete step goal.');
        } finally {
            setShowDeleteConfirm(null);
        }
    };

    // Get display name for a user
    const getUserDisplayName = (userId: string) => {
        const user = users.find(u => u.id === userId);
        return user?.first_name && user?.last_name 
            ? `${user.first_name} ${user.last_name}` 
            : user?.username || user?.email || 'Unknown Athlete';
    };

    // Create new goal logic
    const handleCreateNew = () => {
        setIsCreating(true);
        setIsEditing(false);
        setSelectedProfileId('');
        setNewGoal('');
        setCurrentGoal(null);
    };

    // Edit goal logic
    const handleEdit = (goal: StepGoalItem) => {
        setIsEditing(true);
        setIsCreating(false);
        setSelectedProfileId(goal.user_id);
        setNewGoal(goal.daily_steps.toString());
        setCurrentGoal(goal.daily_steps);
    };

    // Cancel form logic
    const handleCancel = () => {
        setIsCreating(false);
        setIsEditing(false);
        setSelectedProfileId('');
        setNewGoal('');
        setCurrentGoal(null);
    };

    return (
        <div className="step-goal-setter">
            <div className="container px-4 py-6 mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Step Goal Setter</h1>
                        <p className="mt-1 text-gray-600 dark:text-gray-400">
                            Assign daily step goals to your athletes to help them stay active
                        </p>
                    </div>
                    
                    <div className="flex space-x-2">
                        {!isEditing && !isCreating && (
                            <button
                                onClick={handleCreateNew}
                                className="flex items-center px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                            >
                                <FiPlus className="mr-2" /> New Goal
                            </button>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="p-4 mb-6 text-red-700 bg-red-100 border-l-4 border-red-500 rounded dark:bg-red-900/20 dark:text-red-400" role="alert">
                        <p>{error}</p>
                    </div>
                )}

                {saveMessage && (
                    <div className="p-4 mb-6 text-green-700 bg-green-100 border-l-4 border-green-500 rounded dark:bg-green-900/20 dark:text-green-400" role="alert">
                        <p>{saveMessage}</p>
                    </div>
                )}

                {/* Confirmation Dialog for Delete */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="max-w-md p-6 mx-auto bg-white rounded-lg dark:bg-gray-800">
                            <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Confirm Deletion</h3>
                            <p className="mb-6 text-gray-600 dark:text-gray-400">
                                Are you sure you want to remove this step goal? This action cannot be undone.
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button 
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => showDeleteConfirm && handleDeleteGoal(showDeleteConfirm)}
                                    className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form for Creating/Editing Step Goal */}
                {(isCreating || isEditing) && (
                    <div className="p-6 mb-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                                {isCreating ? 'Create New Step Goal' : `Editing Step Goal for ${getUserDisplayName(selectedProfileId)}`}
                            </h2>
                            <button
                                onClick={handleCancel}
                                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveGoal} className="space-y-4">
                            {/* Athlete Selection (only shown when creating) */}
                            {isCreating && (
                                <div className="mb-4">
                                    <label htmlFor="userSelect" className="block mb-2 text-sm font-medium text-gray-800 dark:text-white">
                                        Select Athlete
                                    </label>
                                    <select 
                                        id="userSelect"
                                        value={selectedProfileId}
                                        onChange={(e) => setSelectedProfileId(e.target.value)}
                                        className="block w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        required
                                    >
                                        <option value="" disabled>-- Select an Athlete --</option>
                                        {users.length > 0 ? (
                                            users.map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {(user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username) || user.email}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="" disabled>No athletes available</option>
                                        )}
                                    </select>
                                    {users.length === 0 && (
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                            No athletes are assigned to you. Add athletes first to set step goals.
                                        </p>
                                    )}
                                </div>
                            )}
                            
                            {/* Daily Steps Input */}
                            {(isCreating && selectedProfileId) || isEditing ? (
                                <div className="mb-4">
                                    <label htmlFor="stepGoalInput" className="block mb-2 text-sm font-medium text-gray-800 dark:text-white">
                                        Daily Step Goal
                                    </label>
                                    <div className="flex">
                                        <input 
                                            id="stepGoalInput"
                                            type="number"
                                            value={newGoal}
                                            onChange={(e) => setNewGoal(e.target.value)}
                                            placeholder="Enter daily steps" 
                                            className="flex-1 block p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        Recommended: 7,000-10,000 steps for general health, can be adjusted based on individual needs.
                                    </p>
                                </div>
                            ) : null}
                            
                            {/* Selected Athlete Current Goal (only shown when creating and an athlete is selected) */}
                            {isCreating && selectedProfileId && (
                                <div className="p-4 mb-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <h3 className="font-medium mb-3 text-gray-800 dark:text-white">
                                        Current Goal for {getUserDisplayName(selectedProfileId)}
                                    </h3>
                                    <div>
                                        <span className="block text-sm text-gray-600 dark:text-gray-400">Current Goal:</span>
                                        <span className="text-lg font-semibold text-gray-800 dark:text-white">
                                            {isLoadingGoal ? (
                                                <span className="inline-flex items-center">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500 mr-2"></div>
                                                    Loading...
                                                </span>
                                            ) : currentGoal ? (
                                                `${currentGoal.toLocaleString()} steps`
                                            ) : (
                                                'No active goal'
                                            )}
                                        </span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Submit Button */}
                            <div className="flex justify-end pt-3 space-x-3 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="submit"
                                    className={`px-4 py-2 ${isSaving ? 'bg-green-500' : 'bg-green-600 hover:bg-green-700'} text-white rounded-md flex items-center`}
                                    disabled={isSaving || !selectedProfileId}
                                >
                                    {isSaving && (
                                        <svg className="w-4 h-4 mr-2 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    )}
                                    {isCreating ? 'Create Goal' : 'Update Goal'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Step Goals Listing */}
                {!isLoadingUsers && !isLoadingGoals && !isCreating && !isEditing && (
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
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleCreateNew}
                                className="px-3 py-1.5 bg-indigo-600 text-sm text-white rounded-md hover:bg-indigo-700 flex items-center"
                            >
                                <FiPlus className="mr-1" /> New
                            </button>
                        </div>
                        
                        {isLoadingGoals ? (
                            <div className="flex items-center justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                <span className="ml-2">Loading step goals...</span>
                            </div>
                        ) : filteredStepGoals.length === 0 ? (
                            <div className="py-8 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                                <h3 className="mb-2 text-lg font-medium text-gray-800 dark:text-white">No Step Goals</h3>
                                <p className="mb-4 text-gray-600 dark:text-gray-400">Create your first step goal to get started</p>
                                <button 
                                    onClick={handleCreateNew} 
                                    className="flex items-center px-4 py-2 mx-auto text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                                >
                                    <FiPlus className="mr-1" /> Create New Goal
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Athlete</th>
                                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Daily Step Goal</th>
                                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Set On</th>
                                            <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase dark:text-gray-300">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                        {filteredStepGoals.map((goal) => (
                                            <tr key={goal.id} className="hover:bg-gray-50 dark:hover:bg-indigo-900/30">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {getUserDisplayName(goal.user_id)}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {goal.user?.email}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {goal.daily_steps.toLocaleString()} steps
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-500 dark:text-gray-300">
                                                        {new Date(goal.created_at).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleEdit(goal)}
                                                        className="mr-3 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(goal.id)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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
                    </div>
                )}
            </div>
        </div>
    );
};

export default StepGoalSetter; 