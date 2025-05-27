import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectUser, selectProfile } from '../../store/slices/authSlice';
import { FiSearch, FiPlus, FiDroplet } from 'react-icons/fi';

// Types needed
interface UserSelectItem {
    id: string; // profile id (primary key)
    user_id: string; // auth user id
    email: string | null;
    username: string | null;
    first_name?: string | null;
    last_name?: string | null;
}

interface WaterGoalItem {
    id: string;
    user_id: string;
    water_goal_ml: number;
    created_at: string;
    updated_at: string | null;
    user?: UserSelectItem;
}

const WaterGoalSetter: React.FC = () => {
    const [users, setUsers] = useState<UserSelectItem[]>([]);
    const [allWaterGoals, setAllWaterGoals] = useState<WaterGoalItem[]>([]);
    const [filteredWaterGoals, setFilteredWaterGoals] = useState<WaterGoalItem[]>([]);
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

    // Fetch all water goals
    useEffect(() => {
        const fetchAllWaterGoals = async () => {
            if (!profile || !users.length) return;
            
            setIsLoadingGoals(true);
            setError(null);
            
            try {
                const userIds = users.map(u => u.user_id);
                
                const { data, error: fetchError } = await supabase
                    .from('water_goals')
                    .select('*')
                    .in('user_id', userIds)
                    .order('created_at', { ascending: false });
                
                if (fetchError) throw fetchError;
                
                // Merge user data with water goals
                const goalsWithUserData = data?.map(goal => {
                    const userData = users.find(u => u.user_id === goal.user_id);
                    return { ...goal, user: userData };
                }).filter(goal => goal.user) || [];
                
                setAllWaterGoals(goalsWithUserData);
                setFilteredWaterGoals(goalsWithUserData);
            } catch (err) {
                console.error("Error fetching water goals:", err);
                setError('Failed to load water goals. Please refresh the page and try again.');
            } finally {
                setIsLoadingGoals(false);
            }
        };
        
        if (users.length > 0) {
            fetchAllWaterGoals();
        }
    }, [users, profile]);

    // Filter goals when search query changes
    useEffect(() => {
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            const filtered = allWaterGoals.filter(goal => {
                const userName = `${goal.user?.first_name || ''} ${goal.user?.last_name || ''}`.toLowerCase();
                const userEmail = (goal.user?.email || '').toLowerCase();
                return userName.includes(lowerQuery) || userEmail.includes(lowerQuery);
            });
            setFilteredWaterGoals(filtered);
        } else {
            setFilteredWaterGoals(allWaterGoals);
        }
    }, [searchQuery, allWaterGoals]);

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    // Get user full name
    const getUserName = (userId: string) => {
        const user = users.find(u => u.user_id === userId);
        if (!user) return 'Unknown User';
        
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        
        if (firstName || lastName) {
            return `${firstName} ${lastName}`.trim();
        }
        
        return user.email || user.username || 'Unnamed User';
    };

    // Toggle edit mode for a goal
    const handleEditClick = async (userId: string) => {
        setSelectedProfileId(userId);
        setIsEditing(true);
        setIsLoadingGoal(true);
        setError(null);
        
        try {
            const { data, error: fetchError } = await supabase
                .from('water_goals')
                .select('water_goal_ml')
                .eq('user_id', userId)
                .single();
            
            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }
            
            const goalValue = data?.water_goal_ml || 2500; // Default to 2500ml if no goal set
            setCurrentGoal(goalValue);
            setNewGoal(goalValue.toString());
        } catch (err) {
            console.error("Error fetching water goal:", err);
            setError('Failed to load water goal. Please try again.');
        } finally {
            setIsLoadingGoal(false);
        }
    };

    // Create a new goal
    const handleCreateClick = () => {
        setIsCreating(true);
        setSelectedProfileId('');
        setCurrentGoal(null);
        setNewGoal('2500'); // Default to 2500ml
    };

    // Save water goal changes
    const handleSaveGoal = async () => {
        if (!selectedProfileId || !newGoal) {
            setError('Please select an athlete and enter a goal value.');
            return;
        }
        
        const goalValue = parseInt(newGoal);
        if (isNaN(goalValue) || goalValue < 0) {
            setError('Please enter a valid number for the water goal.');
            return;
        }
        
        setIsSaving(true);
        setError(null);
        setSaveMessage(null);
        
        try {
            // Check if goal already exists
            const { data: existingGoal, error: checkError } = await supabase
                .from('water_goals')
                .select('id')
                .eq('user_id', selectedProfileId)
                .maybeSingle();
            
            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
            }
            
            let saveError;
            
            if (existingGoal) {
                // Update existing goal
                const { error } = await supabase
                    .from('water_goals')
                    .update({
                        water_goal_ml: goalValue,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', selectedProfileId);
                
                saveError = error;
            } else {
                // Create new goal
                const { error } = await supabase
                    .from('water_goals')
                    .insert({
                        user_id: selectedProfileId,
                        water_goal_ml: goalValue
                    });
                
                saveError = error;
            }
            
            if (saveError) throw saveError;
            
            // Refresh goals list
            const { data: refreshedData, error: refreshError } = await supabase
                .from('water_goals')
                .select('*')
                .eq('user_id', selectedProfileId)
                .single();
                
            if (refreshError) throw refreshError;
            
            // Update local state
            const updatedGoals = allWaterGoals.filter(g => g.user_id !== selectedProfileId);
            const userData = users.find(u => u.user_id === selectedProfileId);
            
            const newGoalItem: WaterGoalItem = {
                ...refreshedData,
                user: userData
            };
            
            setAllWaterGoals([newGoalItem, ...updatedGoals]);
            setSaveMessage('Water goal saved successfully.');
            
            // Reset form
            setIsEditing(false);
            setIsCreating(false);
            setSelectedProfileId('');
            setNewGoal('');
            
            // Update filtered goals
            const lowerQuery = searchQuery.toLowerCase();
            const filtered = [...updatedGoals, newGoalItem].filter(goal => {
                if (!searchQuery) return true;
                const userName = `${goal.user?.first_name || ''} ${goal.user?.last_name || ''}`.toLowerCase();
                const userEmail = (goal.user?.email || '').toLowerCase();
                return userName.includes(lowerQuery) || userEmail.includes(lowerQuery);
            });
            
            setFilteredWaterGoals(filtered);
            
        } catch (err) {
            console.error("Error saving water goal:", err);
            setError('Failed to save water goal. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setIsEditing(false);
        setIsCreating(false);
        setSelectedProfileId('');
        setNewGoal('');
        setError(null);
    };

    // Delete a goal
    const handleDeleteGoal = async (goalId: string) => {
        setIsSaving(true);
        setError(null);
        setSaveMessage(null);
        
        try {
            const { error: deleteError } = await supabase
                .from('water_goals')
                .delete()
                .eq('id', goalId);
            
            if (deleteError) throw deleteError;
            
            // Update local state
            const updatedGoals = allWaterGoals.filter(g => g.id !== goalId);
            setAllWaterGoals(updatedGoals);
            
            // Update filtered goals
            const updatedFiltered = filteredWaterGoals.filter(g => g.id !== goalId);
            setFilteredWaterGoals(updatedFiltered);
            
            setSaveMessage('Water goal deleted successfully.');
        } catch (err) {
            console.error("Error deleting water goal:", err);
            setError('Failed to delete water goal. Please try again.');
        } finally {
            setIsSaving(false);
            setShowDeleteConfirm(null);
        }
    };

    // Handle goal input change
    const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Only allow numbers
        if (/^\d*$/.test(value)) {
            setNewGoal(value);
        }
    };

    // Handle athlete selection in create mode
    const handleAthleteSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedProfileId(e.target.value);
    };

    // Format date for display
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
            return 'Invalid date';
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Water Goal Management</h1>
                <p className="text-gray-600 dark:text-gray-400">Set and manage daily water intake goals for your athletes</p>
            </div>
            
            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 border-l-4 border-red-500 rounded">
                    {error}
                </div>
            )}
            
            {saveMessage && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 border-l-4 border-green-500 rounded">
                    {saveMessage}
                </div>
            )}
            
            {/* Edit/Create Form */}
            {(isEditing || isCreating) && (
                <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">
                        {isEditing ? 'Edit Water Goal' : 'Create New Water Goal'}
                    </h2>
                    
                    {isLoadingGoal ? (
                        <div className="animate-pulse">Loading...</div>
                    ) : (
                        <div className="space-y-4">
                            {isCreating && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Select Athlete
                                    </label>
                                    <select
                                        value={selectedProfileId}
                                        onChange={handleAthleteSelect}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="">-- Select an athlete --</option>
                                        {users.map(user => (
                                            <option key={user.user_id} value={user.user_id}>
                                                {user.first_name && user.last_name 
                                                    ? `${user.first_name} ${user.last_name}` 
                                                    : user.email || user.username || 'Unnamed User'
                                                }
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            {isEditing && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Athlete
                                    </label>
                                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                                        {getUserName(selectedProfileId)}
                                    </div>
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Daily Water Intake Goal (ml)
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="text"
                                        value={newGoal}
                                        onChange={handleGoalChange}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="Enter water goal in ml"
                                    />
                                    <span className="ml-2 text-gray-600 dark:text-gray-400">ml</span>
                                </div>
                                {currentGoal !== null && (
                                    <p className="mt-1 text-sm text-gray-500">
                                        Current goal: {currentGoal} ml
                                    </p>
                                )}
                            </div>
                            
                            <div className="flex space-x-2">
                                <button
                                    onClick={handleSaveGoal}
                                    disabled={isSaving || !selectedProfileId || !newGoal}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save Goal'}
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
                <div className="relative w-full md:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiSearch className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search athletes..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                </div>
                <button
                    onClick={handleCreateClick}
                    disabled={isCreating || isEditing}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                    <FiPlus className="mr-2" />
                    Add Water Goal
                </button>
            </div>
            
            {/* Goals List */}
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                {isLoadingGoals || isLoadingUsers ? (
                    <div className="p-4 animate-pulse">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-4"></div>
                    </div>
                ) : filteredWaterGoals.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                        {searchQuery ? (
                            <p>No water goals found matching your search.</p>
                        ) : (
                            <div>
                                <FiDroplet className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                                <p className="mb-2">No water goals have been set yet.</p>
                                <p>Click "Add Water Goal" to set goals for your athletes.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Athlete
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Daily Water Goal
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Last Updated
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {filteredWaterGoals.map(goal => (
                                    <tr key={goal.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                                    {(goal.user?.first_name?.[0] || goal.user?.email?.[0] || '?').toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {getUserName(goal.user_id)}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {goal.user?.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <FiDroplet className="text-blue-500 mr-2" />
                                                <span className="text-sm text-gray-900 dark:text-white">
                                                    {goal.water_goal_ml} ml
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(goal.updated_at || goal.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {showDeleteConfirm === goal.id ? (
                                                <div className="flex justify-end items-center space-x-2">
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">Confirm delete?</span>
                                                    <button 
                                                        onClick={() => handleDeleteGoal(goal.id)} 
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                    >
                                                        Yes
                                                    </button>
                                                    <button 
                                                        onClick={() => setShowDeleteConfirm(null)} 
                                                        className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end space-x-3">
                                                    <button
                                                        onClick={() => handleEditClick(goal.user_id)}
                                                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                        disabled={isEditing || isCreating}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(goal.id)}
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                        disabled={isEditing || isCreating}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WaterGoalSetter;
