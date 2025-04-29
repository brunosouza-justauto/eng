import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';

// Types needed
interface UserSelectItem {
    user_id: string;
    email: string | null;
    username: string | null;
}

const StepGoalSetter: React.FC = () => {
    const [users, setUsers] = useState<UserSelectItem[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [newGoal, setNewGoal] = useState<string>(''); // Input field state
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingGoal, setIsLoadingGoal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const coach = useSelector(selectUser); // Assuming the logged-in admin is the coach

    // Fetch users (athletes associated with the coach - Requires coach_id link in profiles)
    useEffect(() => {
        const fetchAthletes = async () => {
            if (!coach) return;
            setIsLoadingUsers(true);
            setError(null);
            try {
                 // TODO: Adjust this query based on how athletes are linked to coaches
                 // This assumes a coach_id field on the athlete's profile points to the coach's profile id
                const { data, error: fetchError } = await supabase
                    .from('profiles')
                    .select('user_id, email, username')
                    .eq('coach_id', coach.id) // Find athletes linked to this coach
                    .neq('role', 'coach'); // Exclude other coaches if necessary
                
                if (fetchError) throw fetchError;
                setUsers(data || []);
            } catch {
                setError('Failed to load users.');
            }
             finally { setIsLoadingUsers(false); }
        };
        fetchAthletes();
    }, [coach]);

    // Fetch current goal when selected user changes
    useEffect(() => {
        const fetchCurrentGoal = async () => {
            if (!selectedUserId) {
                setNewGoal('');
                return;
            }
            setIsLoadingGoal(true);
            setError(null);
            try {
                 const { data, error: fetchError } = await supabase
                    .from('step_goals')
                    .select('id, daily_steps')
                    .eq('user_id', selectedUserId)
                    .eq('is_active', true)
                    .maybeSingle();
                 if (fetchError) throw fetchError;
                 setNewGoal(data?.daily_steps?.toString() ?? '');
            } catch {
                setError('Failed to load current step goal.');
                setNewGoal('');
            }
            finally { setIsLoadingGoal(false); }
        };
        fetchCurrentGoal();
    }, [selectedUserId]);

    // Save Goal Logic
    const handleSaveGoal = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedUserId) return;
        
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
                .eq('user_id', selectedUserId)
                .eq('is_active', true)
                .maybeSingle();
            
            if (findError) throw findError;

            if (currentActiveGoal) {
                console.log('Deactivating old goal:', currentActiveGoal.id);
                const { error: deactivateError } = await supabase
                    .from('step_goals')
                    .update({ is_active: false, updated_at: new Date() })
                    .eq('id', currentActiveGoal.id);
                if (deactivateError) throw deactivateError;
            }

            // 2. Insert the new goal as active
            console.log('Inserting new goal for user:', selectedUserId, 'Goal:', newGoalValue);
            const { error: insertError } = await supabase
                .from('step_goals')
                .insert({ 
                    user_id: selectedUserId,
                    daily_steps: newGoalValue,
                    is_active: true 
                 })
                 // No need to select if not using the result
                 // .select('id, daily_steps')
                 // .single(); 

            if (insertError) throw insertError;
            
            // Success
            setSaveMessage('Step goal saved successfully!');
             // No need to refetch, just update state locally if needed, 
             // but form already shows the new value.
             // setCurrentGoal(insertedGoal); // If currentGoal state was kept
             
             // Clear success message after a delay
             setTimeout(() => setSaveMessage(null), 3000);

        } catch (err: unknown) {
             console.error("Error saving step goal:", err);
             setError('Failed to save step goal.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Step Goal Setter</h1>
            {isLoadingUsers && <p>Loading users...</p>}
            {error && <p className="text-red-500 mb-4">Error: {error}</p>}
            {!isLoadingUsers && (
                 <form onSubmit={handleSaveGoal} className="space-y-4 max-w-md">
                    <div>
                        <label htmlFor="userSelect" className="block text-sm font-medium mb-1">Select Athlete</label>
                        <select 
                            id="userSelect"
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                            required
                        >
                            <option value="" disabled>-- Select an Athlete --</option>
                            {users.map(user => (
                                <option key={user.user_id} value={user.user_id}>
                                    {user.username || user.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedUserId && (
                        <div>
                             <label htmlFor="stepGoalInput" className="block text-sm font-medium mb-1">Daily Step Goal</label>
                             {isLoadingGoal ? <p>Loading current goal...</p> : (
                                <input 
                                    id="stepGoalInput"
                                    type="number"
                                    value={newGoal}
                                    onChange={(e) => setNewGoal(e.target.value)}
                                    placeholder="Enter daily steps" 
                                    className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                                    min="0"
                                />
                             )}
                        </div>
                    )}
                    
                    <button 
                        type="submit"
                        disabled={!selectedUserId || isLoadingGoal || isSaving}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save Goal'}
                    </button>
                     {saveMessage && <p className="text-green-600 text-sm">{saveMessage}</p>}
                </form>
            )}
        </div>
    );
};

export default StepGoalSetter; 