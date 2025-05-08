import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectUser, selectProfile } from '../../store/slices/authSlice';

// Types needed
interface UserSelectItem {
    id: string; // profile id (primary key)
    user_id: string; // auth user id
    email: string | null;
    username: string | null;
    first_name?: string | null;
    last_name?: string | null;
}

const StepGoalSetter: React.FC = () => {
    const [users, setUsers] = useState<UserSelectItem[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');
    const [newGoal, setNewGoal] = useState<string>(''); // Input field state
    const [currentGoal, setCurrentGoal] = useState<number | null>(null);
    const [currentSteps, setCurrentSteps] = useState<number | null>(null);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingGoal, setIsLoadingGoal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    
    const user = useSelector(selectUser);
    const profile = useSelector(selectProfile);

    // Fetch athletes linked to this coach
    useEffect(() => {
        const fetchAthletes = async () => {
            if (!user || !profile) return;
            setIsLoadingUsers(true);
            setError(null);
            try {
                // Fetch athletes linked to this coach using the assigned_plans relationship
                const { data, error: fetchError } = await supabase
                    .from('profiles')
                    .select('id, user_id, email, username, first_name, last_name')
                    .eq('coach_id', profile.id) // Using profile.id as coach_id
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

    // Fetch current goal when selected user changes
    useEffect(() => {
        const fetchCurrentGoal = async () => {
            if (!selectedProfileId) {
                setNewGoal('');
                setCurrentGoal(null);
                setCurrentSteps(null);
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
                
                // TODO: Fetch athlete's current step count if we have a step tracking feature
                // This is a placeholder for future functionality
                setCurrentSteps(null);
                
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
                    user_id: selectedProfileId, // Use profile.id instead of user_id
                    daily_steps: newGoalValue,
                    is_active: true 
                });

            if (insertError) throw insertError;
            
            // Update UI with success message and new goal
            setSaveMessage(`Step goal of ${newGoalValue.toLocaleString()} steps successfully assigned!`);
            setCurrentGoal(newGoalValue);
            
            // Clear success message after a delay
            setTimeout(() => setSaveMessage(null), 5000);

        } catch (err: unknown) {
            console.error("Error saving step goal:", err);
            setError(`Failed to save step goal: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Get display name for selected user
    const getSelectedUserName = () => {
        if (!selectedProfileId) return '';
        const user = users.find(u => u.id === selectedProfileId);
        return user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || user?.email || 'Selected Athlete';
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Step Goal Setter</h1>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="mb-4 text-gray-600 dark:text-gray-400">
                    Assign daily step goals to your athletes to help them stay active and track their progress.
                </p>
                
                {error && (
                    <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {error}
                    </div>
                )}
                
                {saveMessage && (
                    <div className="mb-4 p-3 bg-green-100 border-l-4 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {saveMessage}
                    </div>
                )}
                
                {isLoadingUsers ? (
                    <div className="flex items-center justify-center p-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        <span className="ml-2">Loading athletes...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSaveGoal} className="space-y-6">
                        {/* Athlete Selection */}
                        <div>
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

                        {/* Selected Athlete Info */}
                        {selectedProfileId && (
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h3 className="font-medium mb-3">
                                    {getSelectedUserName()}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <span className="block text-sm text-gray-600 dark:text-gray-400">Current Goal:</span>
                                        <span className="text-lg font-semibold">
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
                                    {currentSteps !== null && (
                                        <div>
                                            <span className="block text-sm text-gray-600 dark:text-gray-400">Current Steps Today:</span>
                                            <span className="text-lg font-semibold">{currentSteps.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step Goal Input Field */}
                        {selectedProfileId && (
                            <div>
                                <label htmlFor="stepGoalInput" className="block mb-2 text-sm font-medium text-gray-800 dark:text-white">
                                    Set Daily Step Goal
                                </label>
                                {isLoadingGoal ? (
                                    <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                ) : (
                                    <div className="flex">
                                        <input 
                                            id="stepGoalInput"
                                            type="number"
                                            value={newGoal}
                                            onChange={(e) => setNewGoal(e.target.value)}
                                            placeholder="Enter daily steps" 
                                            className="flex-1 block p-2.5 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            min="0"
                                        />
                                        <button 
                                            type="submit"
                                            disabled={isLoadingGoal || isSaving}
                                            className="px-4 py-2.5 text-white bg-indigo-600 rounded-r-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                                        >
                                            {isSaving ? 'Saving...' : 'Save Goal'}
                                        </button>
                                    </div>
                                )}
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    Recommended: 7,000-10,000 steps for general health, can be adjusted based on individual needs.
                                </p>
                            </div>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
};

export default StepGoalSetter; 