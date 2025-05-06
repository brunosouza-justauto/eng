import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';

interface NutritionPlan {
    id: string;
    name: string;
    total_calories: number | null;
    protein_grams: number | null;
    carbohydrate_grams: number | null;
    fat_grams: number | null;
    description: string | null;
    created_at: string;
}

interface NutritionPlanAssignment {
    id: string;
    nutrition_plan_id: string;
    start_date: string;
    assigned_at?: string;
    nutrition_plan?: {
        id: string;
        name: string;
    };
}

interface NutritionPlanAssignmentModalProps {
    athleteId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const NutritionPlanAssignmentModal: React.FC<NutritionPlanAssignmentModalProps> = ({ athleteId, onClose, onSuccess }) => {
    const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentAssignment, setCurrentAssignment] = useState<NutritionPlanAssignment | null>(null);
    // Get the current user profile from Redux store
    const userProfile = useSelector(selectProfile);

    // Fetch athlete's current nutrition plan assignment
    useEffect(() => {
        const fetchCurrentAssignment = async () => {
            try {
                // First get the most recent assignment
                const { data: assignmentData, error: assignmentError } = await supabase
                    .from('assigned_plans')
                    .select('id, nutrition_plan_id, start_date')
                    .eq('athlete_id', athleteId)
                    .is('program_template_id', null) // Only get nutrition plan assignments
                    .not('nutrition_plan_id', 'is', null) // Must have a nutrition plan ID
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                if (assignmentError) throw assignmentError;
                
                if (assignmentData && assignmentData.nutrition_plan_id) {
                    console.log("Current nutrition plan assignment:", assignmentData);
                    
                    // Then fetch the nutrition plan details separately
                    const { data: planData, error: planError } = await supabase
                        .from('nutrition_plans')
                        .select('id, name')
                        .eq('id', assignmentData.nutrition_plan_id)
                        .single();
                    
                    if (planError) {
                        console.error('Error fetching nutrition plan details:', planError);
                    }
                    
                    // Create the assignment with properly typed data
                    const fixedAssignment: NutritionPlanAssignment = {
                        id: assignmentData.id,
                        nutrition_plan_id: assignmentData.nutrition_plan_id,
                        start_date: assignmentData.start_date,
                        nutrition_plan: planData ? {
                            id: planData.id,
                            name: planData.name
                        } : undefined
                    };
                    
                    setCurrentAssignment(fixedAssignment);
                    setSelectedPlanId(assignmentData.nutrition_plan_id);
                }
            } catch (err) {
                console.error('Error fetching current nutrition plan assignment:', err);
                // Don't show error to user, just log it
            }
        };
        
        fetchCurrentAssignment();
    }, [athleteId]);

    // Fetch available nutrition plans created by the coach
    useEffect(() => {
        const fetchNutritionPlans = async () => {
            if (!userProfile || !userProfile.id) return;
            
            setIsLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('nutrition_plans')
                    .select('id, name, total_calories, protein_grams, carbohydrate_grams, fat_grams, description, created_at')
                    .eq('coach_id', userProfile.id)
                    .order('name');
                
                if (fetchError) throw fetchError;
                setNutritionPlans(data || []);
            } catch (err) {
                console.error('Error fetching nutrition plans:', err);
                setError('Failed to load nutrition plans.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchNutritionPlans();
    }, [userProfile]);

    const handleAssignNutritionPlan = async () => {
        if (!selectedPlanId) {
            setError('Please select a nutrition plan to assign.');
            return;
        }

        if (!userProfile || !userProfile.id) {
            setError('User authentication error. Please try logging in again.');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            // Create a new nutrition plan assignment
            // No need to update previous assignments since we always use the most recent one
            const { error: assignError } = await supabase
                .from('assigned_plans')
                .insert({
                    athlete_id: athleteId,
                    nutrition_plan_id: selectedPlanId,
                    assigned_by: userProfile.id,
                    assigned_at: new Date().toISOString(),
                    start_date: new Date().toISOString().split('T')[0] // Today as the start date
                });

            if (assignError) throw assignError;
            
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error assigning nutrition plan:', err);
            setError('Failed to assign nutrition plan. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Format macros function to show nutrition plan details
    const formatMacros = (plan: NutritionPlan) => {
        const parts = [];
        if (plan.total_calories) parts.push(`${plan.total_calories} calories`);
        if (plan.protein_grams) parts.push(`${plan.protein_grams}g protein`);
        if (plan.carbohydrate_grams) parts.push(`${plan.carbohydrate_grams}g carbs`);
        if (plan.fat_grams) parts.push(`${plan.fat_grams}g fat`);
        
        return parts.length > 0 ? parts.join(' • ') : 'No nutrition details specified';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-full overflow-y-auto bg-gray-600 bg-opacity-50">
            <div className="relative w-full max-w-md p-5 bg-white border rounded-md shadow-lg dark:bg-gray-800">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Assign Nutrition Plan</h3>
                
                <div className="mt-4">
                    {isLoading ? (
                        <div className="flex justify-center">
                            <div className="w-6 h-6 border-2 border-t-2 border-gray-200 rounded-full dark:border-gray-700 border-t-indigo-600 animate-spin"></div>
                        </div>
                    ) : nutritionPlans.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            No nutrition plans available to assign. Please create a nutrition plan first.
                        </p>
                    ) :
                        <div className="space-y-4">
                            {currentAssignment && (
                                <div className="p-3 mb-3 text-sm text-indigo-700 bg-indigo-100 rounded dark:bg-indigo-900/20 dark:text-indigo-300">
                                    <span className="font-medium">Current Nutrition Plan:</span> {currentAssignment.nutrition_plan?.name || "Unknown Plan"}
                                    <p className="mt-1 text-xs">Assigned on {new Date(currentAssignment.start_date).toLocaleDateString()}</p>
                                </div>
                            )}
                            
                            <div>
                                <label htmlFor="nutrition-plan-select" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {currentAssignment ? 'Select New Nutrition Plan' : 'Select Nutrition Plan'}
                                </label>
                                <select
                                    id="nutrition-plan-select"
                                    value={selectedPlanId}
                                    onChange={(e) => setSelectedPlanId(e.target.value)}
                                    className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="">-- Select a Nutrition Plan --</option>
                                    {nutritionPlans.map(plan => (
                                        <option key={plan.id} value={plan.id}>
                                            {plan.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {selectedPlanId && (
                                <div className="p-3 text-sm text-gray-600 rounded dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                                    {(() => {
                                        const selectedPlan = nutritionPlans.find(p => p.id === selectedPlanId);
                                        if (!selectedPlan) return 'No details available.';
                                        
                                        return (
                                            <>
                                                <div className="font-medium mb-1">{formatMacros(selectedPlan)}</div>
                                                {selectedPlan.description && (
                                                    <div className="mt-2">{selectedPlan.description}</div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    }
                    
                    {error && (
                        <div className="p-2 mt-2 text-sm text-red-700 bg-red-100 rounded dark:bg-red-900/20 dark:text-red-400">
                            {error}
                        </div>
                    )}
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded dark:bg-gray-700 dark:text-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleAssignNutritionPlan}
                        disabled={isLoading || isSaving || !selectedPlanId}
                        className="px-3 py-1.5 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {isSaving 
                            ? 'Saving...' 
                            : currentAssignment && currentAssignment.nutrition_plan_id === selectedPlanId 
                                ? 'Confirm Plan' 
                                : currentAssignment 
                                    ? 'Change Plan' 
                                    : 'Assign Plan'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NutritionPlanAssignmentModal; 