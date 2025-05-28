import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { UserProfileFull } from '../../types/profiles';
import UserEditForm from '../../components/admin/UserEditForm';
import Card from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import ProgramAssignmentModal from '../../components/admin/ProgramAssignmentModal';
import NutritionPlanAssignmentModal from '../../components/admin/NutritionPlanAssignmentModal';
import AthleteMeasurementsManager from '../../components/admin/AthleteMeasurementsManager';
import { format, parseISO, subDays } from 'date-fns';
import { FiCalendar, FiActivity, FiClipboard } from 'react-icons/fi';

// Add a proper interface for the program assignment
interface AthleteProgram {
    id: string;
    program_template_id: string;
    start_date: string;
    assigned_at: string;
    program?: {
        id: string;
        name: string;
        description: string | null;
        version?: number;
    };
}

// Add interface for nutrition plan assignment
interface AthleteNutritionPlan {
    id: string;
    nutrition_plan_id: string;
    start_date: string;
    assigned_at: string;
    nutrition_plan?: {
        id: string;
        name: string;
        description: string | null;
    };
}

// Add interface for step goals
interface StepGoal {
    id: string;
    user_id: string;
    daily_steps: number;
    assigned_at: string;
    is_active: boolean;
}

// Add interface for water goals
interface WaterGoal {
    id: string;
    user_id: string;
    water_goal_ml: number;
    created_at: string;
    updated_at: string;
}

interface WaterEntry {
    id: string;
    user_id: string;
    amount_ml: number;
    date: string;
    created_at: string;
    updated_at: string;
}

// Add interface for step entries
interface StepEntry {
    id: string;
    user_id: string;
    date: string;
    step_count: number;
    created_at: string;
    updated_at: string;
}

// Add interface for check-ins
interface CheckIn {
    id: string;
    user_id: string;
    check_in_date: string;
    photos: string[] | null;
    video_url: string | null;
    diet_adherence: string | null;
    training_adherence: string | null;
    steps_adherence: string | null;
    notes: string | null;
    coach_feedback: string | null;
    created_at: string;
    body_metrics?: {
        weight_kg: number | null;
        body_fat_percentage: number | null;
    } | null;
}

// Define database result types for the transform functions
interface ProgramDbResult {
    id: string;
    program_template_id: string;
    start_date: string;
    assigned_at: string;
    program: unknown; // This can be different formats depending on the query
}

interface NutritionPlanDbResult {
    id: string;
    nutrition_plan_id: string;
    start_date: string;
    assigned_at: string;
    nutrition_plan: unknown; // This can be different formats depending on the query
}

// Helper function to safely transform program assignment data
function transformProgramData(data: ProgramDbResult): AthleteProgram {
    // Extract program info safely
    let programInfo: { id: string, name: string, description: string | null, version?: number } | undefined = undefined;
    
    if (data.program) {
        if (Array.isArray(data.program) && data.program.length > 0) {
            const firstItem = data.program[0];
            programInfo = {
                id: String(firstItem.id || ''),
                name: String(firstItem.name || ''),
                description: firstItem.description || null,
                version: firstItem.version as number | undefined
            };
        } else if (typeof data.program === 'object' && data.program !== null) {
            const programObj = data.program as Record<string, unknown>;
            programInfo = {
                id: String(programObj.id || ''),
                name: String(programObj.name || ''),
                description: (programObj.description as string) || null,
                version: programObj.version as number | undefined
            };
        }
    }
    
    return {
        id: data.id,
        program_template_id: data.program_template_id,
        start_date: data.start_date,
        assigned_at: data.assigned_at,
        program: programInfo
    };
}

// Helper function to safely transform nutrition plan assignment data
function transformNutritionPlanData(data: NutritionPlanDbResult): AthleteNutritionPlan {
    // Extract nutrition plan info safely
    let nutritionPlanInfo: { id: string, name: string, description: string | null } | undefined = undefined;
    
    if (data.nutrition_plan) {
        if (Array.isArray(data.nutrition_plan) && data.nutrition_plan.length > 0) {
            const firstItem = data.nutrition_plan[0];
            nutritionPlanInfo = {
                id: String(firstItem.id || ''),
                name: String(firstItem.name || ''),
                description: firstItem.description || null
            };
        } else if (typeof data.nutrition_plan === 'object' && data.nutrition_plan !== null) {
            const planObj = data.nutrition_plan as Record<string, unknown>;
            nutritionPlanInfo = {
                id: String(planObj.id || ''),
                name: String(planObj.name || ''),
                description: (planObj.description as string) || null
            };
        }
    }
    
    return {
        id: data.id,
        nutrition_plan_id: data.nutrition_plan_id,
        start_date: data.start_date,
        assigned_at: data.assigned_at,
        nutrition_plan: nutritionPlanInfo
    };
}

const AthleteDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [athleteDetails, setAthleteDetails] = useState<UserProfileFull | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    
    // State for Program Assignment Modal
    const [showProgramModal, setShowProgramModal] = useState<boolean>(false);
    
    // State for Nutrition Plan Assignment Modal
    const [showNutritionPlanModal, setShowNutritionPlanModal] = useState<boolean>(false);

    // Use the types for the states
    const [currentProgram, setCurrentProgram] = useState<AthleteProgram | null>(null);
    const [currentNutritionPlan, setCurrentNutritionPlan] = useState<AthleteNutritionPlan | null>(null);

    // Step goal states
    const [stepGoal, setStepGoal] = useState<StepGoal | null>(null);
    const [stepEntries, setStepEntries] = useState<StepEntry[]>([]);
    const [isLoadingStepData, setIsLoadingStepData] = useState<boolean>(true);
    
    // Water goal states
    const [waterGoal, setWaterGoal] = useState<WaterGoal | null>(null);
    const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
    const [isLoadingWaterData, setIsLoadingWaterData] = useState<boolean>(true);
    
    // Check-in states
    const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
    const [isLoadingCheckIns, setIsLoadingCheckIns] = useState<boolean>(false);

    useEffect(() => {
        const fetchAthleteDetails = async () => {
            if (!id) return;

            setIsLoading(true);
            setError(null);

            try {
                // First try to fetch by id directly
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                if (data) {
                    setAthleteDetails(data as UserProfileFull);
                } else {
                    throw new Error('Athlete not found');
                }
            } catch (err: unknown) {
                console.error("Error fetching athlete details:", err);
                const errorMessage = err instanceof Error ? err.message : 'Failed to load athlete details';
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAthleteDetails();
    }, [id]);

    // Fetch current program and nutrition plan assignments
    useEffect(() => {
        if (!id) return;

        const fetchAssignments = async () => {
            try {
                // Fetch current program assignment
                const { data: programData, error: programError } = await supabase
                    .from('assigned_plans')
                    .select(`
                        id,
                        program_template_id,
                        start_date,
                        assigned_at,
                        program:program_templates!program_template_id(id, name, description, version)
                    `)
                    .eq('athlete_id', id)
                    .not('program_template_id', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (programError) throw programError;
                
                if (programData) {
                    // Transform the data to match our type
                    setCurrentProgram(transformProgramData(programData));
                }

                // Fetch current nutrition plan assignment
                const { data: nutritionData, error: nutritionError } = await supabase
                    .from('assigned_plans')
                    .select(`
                        id,
                        nutrition_plan_id,
                        start_date,
                        assigned_at,
                        nutrition_plan:nutrition_plans!nutrition_plan_id(id, name, description)
                    `)
                    .eq('athlete_id', id)
                    .is('program_template_id', null)
                    .not('nutrition_plan_id', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (nutritionError) throw nutritionError;
                
                if (nutritionData) {
                    // Transform the data to match our type
                    setCurrentNutritionPlan(transformNutritionPlanData(nutritionData));
                }
            } catch (err) {
                console.error("Error fetching athlete assignments:", err);
                // Don't display error to user, just log it
            }
        };

        fetchAssignments();
    }, [id]);

    // Fetch step goals and step entries
    useEffect(() => {
        if (!athleteDetails || !athleteDetails.user_id) return;
        
        const fetchStepData = async () => {
            setIsLoadingStepData(true);
            
            try {// Fetch current step goal
                const { data: goalData, error: goalError } = await supabase
                    .from('step_goals')
                    .select('*')
                    .eq('user_id', athleteDetails.id)
                    .eq('is_active', true)
                    .order('assigned_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                if (goalError) throw goalError;
                
                if (goalData) {
                    setStepGoal(goalData as StepGoal);
                }
                
                // Fetch step entries for the last 7 days
                const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');
                const today = format(new Date(), 'yyyy-MM-dd');
                
                const { data: entriesData, error: entriesError } = await supabase
                    .from('step_entries')
                    .select('*')
                    .eq('user_id', athleteDetails.user_id)
                    .gte('date', sevenDaysAgo)
                    .lte('date', today)
                    .order('date', { ascending: false });
                
                if (entriesError) throw entriesError;
                setStepEntries(entriesData || []);
            } catch (err) {
                console.error('Error fetching step data:', err);
                // Don't set error state, just silently fail this section
            } finally {
                setIsLoadingStepData(false);
            }
        };
        
        fetchStepData();
    }, [athleteDetails]);

    // Fetch water goal
    useEffect(() => {
        const fetchWaterGoal = async () => {
            if (!athleteDetails || !athleteDetails.user_id) return;
            setIsLoadingWaterData(true);
            
            try {               
                // Fetch current water goal
                const { data: waterGoalData, error: waterGoalError } = await supabase
                    .from('water_goals')
                    .select('*')
                    .eq('user_id', athleteDetails.user_id)
                    .single();
                
                if (waterGoalError && waterGoalError.code !== 'PGRST116') {
                    throw waterGoalError;
                }
                
                setWaterGoal(waterGoalData || null);

                // Fetch water entries for the last 7 days
                const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');
                const today = format(new Date(), 'yyyy-MM-dd');
                
                const { data: entriesData, error: entriesError } = await supabase
                    .from('water_tracking')
                    .select('*')
                    .eq('user_id', athleteDetails.user_id)
                    .gte('date', sevenDaysAgo)
                    .lte('date', today)
                    .order('date', { ascending: false });

                console.log('Water entries:', entriesData);
                
                if (entriesError) throw entriesError;

                setWaterEntries(entriesData || []);

            } catch (err) {
                console.error('Error fetching water goal data:', err);
                // Don't set error state, just silently fail this section
            } finally {
                setIsLoadingWaterData(false);
            }
        };
        
        fetchWaterGoal();
    }, [athleteDetails]);

    // Fetch check-ins
    useEffect(() => {
        if (!athleteDetails || !athleteDetails.user_id) return;
        
        const fetchCheckIns = async () => {
            setIsLoadingCheckIns(true);
            
            try {
                // Fetch the most recent check-ins (limit to 5)
                const { data, error } = await supabase
                    .from('check_ins')
                    .select(`
                        id,
                        user_id,
                        check_in_date,
                        photos,
                        video_url,
                        diet_adherence,
                        training_adherence,
                        steps_adherence,
                        notes,
                        coach_feedback,
                        created_at,
                        body_metrics:body_metrics(weight_kg, body_fat_percentage)
                    `)
                    .eq('user_id', athleteDetails.user_id)
                    .order('check_in_date', { ascending: false })
                    .limit(5);
                
                if (error) throw error;
                
                if (data) {
                    // Transform the nested body metrics to match our interface
                    const transformedData = data.map(checkIn => {
                        return {
                            ...checkIn,
                            body_metrics: checkIn.body_metrics && checkIn.body_metrics.length > 0 
                                ? checkIn.body_metrics[0] 
                                : null
                        };
                    });
                    
                    setCheckIns(transformedData as CheckIn[]);
                }
            } catch (err) {
                console.error("Error fetching check-ins:", err);
                // Don't display error to user, just log it
            } finally {
                setIsLoadingCheckIns(false);
            }
        };
        
        fetchCheckIns();
    }, [athleteDetails]);

    const handleUpdateAthlete = async (formData: Partial<UserProfileFull>) => {
        if (!athleteDetails || !id) return;
        
        setIsSaving(true);
        setError(null);
        
        try {
            // Include ALL fields from UserProfileFull that can be edited
            const updatePayload: Partial<UserProfileFull> = {
                username: formData.username,
                role: formData.role,
                
                // Physical details
                age: formData.age,
                weight_kg: formData.weight_kg,
                height_cm: formData.height_cm,
                body_fat_percentage: formData.body_fat_percentage,
                
                // Goals
                goal_target_fat_loss_kg: formData.goal_target_fat_loss_kg,
                goal_target_muscle_gain_kg: formData.goal_target_muscle_gain_kg,
                goal_timeframe_weeks: formData.goal_timeframe_weeks,
                goal_target_weight_kg: formData.goal_target_weight_kg,
                goal_physique_details: formData.goal_physique_details,
                goal_type: formData.goal_type,
                
                // Training
                training_days_per_week: formData.training_days_per_week,
                training_current_program: formData.training_current_program,
                training_equipment: formData.training_equipment,
                training_session_length_minutes: formData.training_session_length_minutes,
                training_intensity: formData.training_intensity,
                
                // Nutrition
                nutrition_meal_patterns: formData.nutrition_meal_patterns,
                nutrition_tracking_method: formData.nutrition_tracking_method,
                nutrition_preferences: formData.nutrition_preferences,
                nutrition_allergies: formData.nutrition_allergies,
                
                // Lifestyle
                lifestyle_sleep_hours: formData.lifestyle_sleep_hours,
                lifestyle_stress_level: formData.lifestyle_stress_level,
                lifestyle_water_intake_liters: formData.lifestyle_water_intake_liters,
                lifestyle_schedule_notes: formData.lifestyle_schedule_notes,
                supplements_meds: formData.supplements_meds,
                motivation_readiness: formData.motivation_readiness,
                gender: formData.gender,
            };
            
            // Remove undefined properties to avoid overwriting existing DB values
            Object.keys(updatePayload).forEach(key => 
                updatePayload[key as keyof typeof updatePayload] === undefined && 
                delete updatePayload[key as keyof typeof updatePayload]
            );

            const { data, error } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', id)
                .select('*') 
                .single();

            if (error) throw error;

            // Update state with the updated data
            setAthleteDetails(data as UserProfileFull);
            setIsEditing(false);
            setSuccessMessage('Athlete profile updated successfully');
            
            // Clear success message after a few seconds
            setTimeout(() => setSuccessMessage(null), 5000);

        } catch (err: unknown) { 
            console.error("Error updating athlete:", err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to update athlete profile';
            setError(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    // Program Assignment Modal success handler
    const handleProgramAssignmentSuccess = async () => {
        // Refresh athlete details after program assignment
        const fetchAthleteDetails = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (data) {
                    setAthleteDetails(data as UserProfileFull);
                }
            } catch (err) {
                console.error("Error refreshing athlete details:", err);
            }
        };
        
        // Also refresh program assignments
        const fetchCurrentProgram = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('assigned_plans')
                    .select(`
                        id,
                        program_template_id,
                        start_date,
                        assigned_at,
                        program:program_templates!program_template_id(id, name, description, version)
                    `)
                    .eq('athlete_id', id)
                    .not('program_template_id', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (error) throw error;
                
                if (data) {
                    setCurrentProgram(transformProgramData(data));
                }
            } catch (err) {
                console.error("Error refreshing program assignment:", err);
            }
        };
        
        await Promise.all([fetchAthleteDetails(), fetchCurrentProgram()]);
        setShowProgramModal(false);
        setSuccessMessage('Program assigned successfully');
        setTimeout(() => setSuccessMessage(null), 5000);
    };

    // Nutrition Plan Assignment Modal success handler
    const handleNutritionPlanAssignmentSuccess = async () => {
        // Refresh athlete details 
        const fetchAthleteDetails = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (data) {
                    setAthleteDetails(data as UserProfileFull);
                }
            } catch (err) {
                console.error("Error refreshing athlete details:", err);
            }
        };
        
        // Also refresh nutrition plan assignments
        const fetchCurrentNutritionPlan = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('assigned_plans')
                    .select(`
                        id,
                        nutrition_plan_id,
                        start_date,
                        assigned_at,
                        nutrition_plan:nutrition_plans!nutrition_plan_id(id, name, description)
                    `)
                    .eq('athlete_id', id)
                    .is('program_template_id', null)
                    .not('nutrition_plan_id', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (error) throw error;
                
                if (data) {
                    setCurrentNutritionPlan(transformNutritionPlanData(data));
                }
            } catch (err) {
                console.error("Error refreshing nutrition plan assignment:", err);
            }
        };
        
        await Promise.all([fetchAthleteDetails(), fetchCurrentNutritionPlan()]);
        setShowNutritionPlanModal(false);
        setSuccessMessage('Nutrition plan assigned successfully');
        setTimeout(() => setSuccessMessage(null), 5000);
    };

    // Render the Step Goal Card
    const renderStepGoalCard = () => {
        return (
            <Card className="p-4 mb-4 sm:p-6 sm:mb-6">
                <div className="flex items-center justify-between pb-2 mb-4 border-b">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white">Step Goal</h3>
                </div>
                
                {isLoadingStepData ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="w-10 h-10 border-t-2 border-b-2 border-indigo-500 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        <div className="mb-4">
                            {stepGoal ? (
                                <div>
                                    <p className="mb-2 font-medium text-indigo-600 dark:text-indigo-400">
                                        {stepGoal.daily_steps.toLocaleString()} steps per day
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Assigned on {new Date(stepGoal.assigned_at).toLocaleDateString()}
                                    </p>
                                    <div className="flex flex-wrap mt-3 gap-2">
                                        <button 
                                            onClick={() => navigate('/admin/stepgoals')}
                                            className="inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-sm px-4 py-2"
                                        >
                                            Manage Step Goals
                                        </button>
                                        <button 
                                            onClick={() => navigate(`/admin/athletes/${id}/steps`)}
                                            className="inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 text-sm px-4 py-2"
                                        >
                                            View Step History
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">No step goal assigned yet.</p>
                                    <div className="flex flex-wrap mt-3 gap-2">
                                        <button 
                                            onClick={() => navigate('/admin/stepgoals')}
                                            className="inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-sm px-4 py-2"
                                        >
                                            Assign Step Goal
                                        </button>
                                        <button 
                                            onClick={() => navigate(`/admin/athletes/${id}/steps`)}
                                            className="inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 text-sm px-4 py-2"
                                        >
                                            View Step History
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-gray-800 dark:text-white flex items-center">
                                    <FiCalendar className="mr-2" /> Recent Step Log
                                </h4>
                            </div>
                            
                            {stepEntries.length > 0 ? (
                                <div className="overflow-hidden bg-white rounded-lg shadow dark:bg-gray-800">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">
                                                    Date
                                                </th>
                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                    Steps
                                                </th>
                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                    Goal Met
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                            {stepEntries.map((entry) => {
                                                const goalMet = stepGoal && entry.step_count >= stepGoal.daily_steps;
                                                
                                                return (
                                                    <tr key={entry.id}>
                                                        <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                                                            {format(parseISO(entry.date), 'MMM d, yyyy')}
                                                        </td>
                                                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                            {entry.step_count.toLocaleString()}
                                                        </td>
                                                        <td className="px-3 py-4 text-sm">
                                                            {stepGoal ? (
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                    goalMet 
                                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                                }`}>
                                                                    {goalMet ? 'Yes' : 'No'} 
                                                                    <FiActivity className={`ml-1 ${goalMet ? 'text-green-500' : 'text-red-500'}`} />
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400 dark:text-gray-500">No goal set</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-4 text-center text-gray-500 bg-gray-50 rounded dark:bg-gray-700/50 dark:text-gray-400">
                                    No step logs recorded in the last 7 days.
                                </div>
                            )}
                        </div>
                    </>
                )}
            </Card>
        );
    };

    // Render the Water Goal Card
    const renderWaterGoalCard = () => {
        return (
            <Card className="p-4 mb-4 sm:p-6 sm:mb-6">
                <div className="flex items-center justify-between pb-2 mb-4 border-b">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white">Water Goal</h3>
                </div>
                
                {isLoadingWaterData ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="w-10 h-10 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        <div className="mb-4">
                            {waterGoal ? (
                                <>
                                    <div>
                                        <p className="mb-2 font-medium text-blue-600 dark:text-blue-400">
                                            {waterGoal.water_goal_ml.toLocaleString()} ml per day
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Last updated: {new Date(waterGoal.created_at).toLocaleDateString()}
                                        </p>
                                        <div className="flex flex-wrap mt-3 gap-2">
                                            <button 
                                                onClick={() => navigate('/admin/watergoals')}
                                                className="inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-sm px-4 py-2"
                                            >
                                                Manage Water Goals
                                            </button>
                                            <button 
                                                onClick={() => navigate(`/admin/athletes/${id}/water`)}
                                                className="inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 text-sm px-4 py-2"
                                            >
                                                View Water History
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium text-gray-800 dark:text-white flex items-center">
                                                <FiCalendar className="mr-2" /> Recent Water Log
                                            </h4>
                                        </div>

                                        {waterEntries.length > 0 ? (
                                            <div className="overflow-hidden bg-white rounded-lg shadow dark:bg-gray-800">
                                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                                        <tr>
                                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">
                                                                Date
                                                            </th>
                                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                                Water Intake
                                                            </th>
                                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                                Goal Met
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                                        {waterEntries.map((entry) => {
                                                            const goalMet = waterGoal && entry.amount_ml >= waterGoal.water_goal_ml;
                                                            
                                                            return (
                                                                <tr key={entry.id}>
                                                                    <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                                                                        {format(parseISO(entry.date), 'MMM d, yyyy')}
                                                                    </td>
                                                                    <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                                        {entry.amount_ml}
                                                                    </td>
                                                                    <td className="px-3 py-4 text-sm">
                                                                        {stepGoal ? (
                                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                                goalMet 
                                                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                                                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                                            }`}>
                                                                                {goalMet ? 'Yes' : 'No'} 
                                                                                <FiActivity className={`ml-1 ${goalMet ? 'text-green-500' : 'text-red-500'}`} />
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-400 dark:text-gray-500">No goal set</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="p-4 text-center text-gray-500 bg-gray-50 rounded dark:bg-gray-700/50 dark:text-gray-400">
                                                No water logs recorded in the last 7 days.
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">No water goal assigned yet.</p>
                                    <div className="flex flex-wrap mt-3 gap-2">
                                        <button 
                                            onClick={() => navigate('/admin/watergoals')}
                                            className="inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700 text-sm px-4 py-2"
                                        >
                                            Assign Water Goal
                                        </button>
                                        <button 
                                            onClick={() => navigate(`/admin/athletes/${id}/water`)}
                                            className="inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 text-sm px-4 py-2"
                                        >
                                            View Water History
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </Card>
        );
    };

    // Render check-in history card
    const renderCheckInCard = () => {
        return (
            <Card className="p-4 mb-4 sm:p-6 sm:mb-6">
                <div className="flex items-center justify-between pb-2 mb-4 border-b">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white">Check-Ins</h3>
                </div>
                
                {isLoadingCheckIns ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="w-10 h-10 border-t-2 border-b-2 border-indigo-500 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        <div className="mb-4">
                            {checkIns.length > 0 ? (
                                <div>
                                    <p className="mb-2 font-medium text-indigo-600 dark:text-indigo-400">
                                        Latest check-in: {format(parseISO(checkIns[0].check_in_date), 'MMMM d, yyyy')}
                                    </p>
                                    <div className="flex flex-wrap mt-3 gap-2">
                                        <button 
                                            onClick={() => navigate(`/admin/checkins/${checkIns[0].id}`)}
                                            className="inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-sm px-4 py-2"
                                        >
                                            View Latest Check-in
                                        </button>
                                        <button 
                                            onClick={() => navigate(`/admin/athletes/${id}/check-ins`)}
                                            className="inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 text-sm px-4 py-2"
                                        >
                                            View All Check-ins
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">No check-ins submitted yet.</p>
                                    <div className="flex flex-wrap mt-3 gap-2">
                                        <button 
                                            onClick={() => navigate(`/admin/athletes/${id}/check-ins`)}
                                            className="inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 text-sm px-4 py-2"
                                        >
                                            Check-in History
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {checkIns.length > 0 && (
                            <div className="mt-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium text-gray-800 dark:text-white flex items-center">
                                        <FiClipboard className="mr-2" /> Recent Check-ins
                                    </h4>
                                </div>
                                
                                <div className="overflow-hidden bg-white rounded-lg shadow dark:bg-gray-800">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">
                                                    Date
                                                </th>
                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                    Weight
                                                </th>
                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                    Body Fat %
                                                </th>
                                                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                            {checkIns.map((checkIn) => (
                                                <tr key={checkIn.id}>
                                                    <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                                                        {format(parseISO(checkIn.check_in_date), 'MMM d, yyyy')}
                                                    </td>
                                                    <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                        {checkIn.body_metrics?.weight_kg 
                                                            ? `${checkIn.body_metrics.weight_kg} kg` 
                                                            : 'Not recorded'}
                                                    </td>
                                                    <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                        {checkIn.body_metrics?.body_fat_percentage
                                                            ? `${checkIn.body_metrics.body_fat_percentage}%`
                                                            : 'Not recorded'}
                                                    </td>
                                                    <td className="px-3 py-4 text-sm">
                                                        <button
                                                            onClick={() => navigate(`/admin/checkins/${checkIn.id}`)}
                                                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Card>
        );
    };

    if (isLoading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-gray-800 dark:text-white">Loading athlete details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <Card className="p-6">
                    <h2 className="mb-4 text-xl font-semibold text-red-600 dark:text-red-400">Error</h2>
                    <p className="text-gray-800 dark:text-white">{error}</p>
                    <Button 
                        color="indigo" 
                        className="mt-4" 
                        onClick={() => navigate('/admin/athletes')}
                    >
                        Return to Athletes List
                    </Button>
                </Card>
            </div>
        );
    }

    if (!athleteDetails) {
        return (
            <div className="p-8">
                <Card className="p-6">
                    <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white">Athlete Not Found</h2>
                    <p className="text-gray-800 dark:text-white">The requested athlete could not be found.</p>
                    <Button 
                        color="indigo" 
                        className="mt-4" 
                        onClick={() => navigate('/admin/athletes')}
                    >
                        Return to Athletes List
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="container px-2 py-4 mx-auto sm:px-4 sm:py-8">
            <div className="flex flex-col items-start justify-between mb-4 sm:flex-row sm:items-center sm:mb-6">
                <h1 className="mb-3 text-2xl font-bold text-gray-800 dark:text-white sm:mb-0">Athlete Details</h1>
                <Button onClick={() => navigate('/admin/athletes')} variant="secondary" className="text-sm">
                    Return to Athletes List
                </Button>
            </div>

            {/* Loading State */}
            {isLoading && (
                <Card className="p-4 sm:p-6">
                    <div className="flex items-center justify-center h-40">
                        <div className="w-12 h-12 border-t-2 border-b-2 border-indigo-500 rounded-full animate-spin"></div>
                    </div>
                </Card>
            )}

            {/* Error State */}
            {error && !isLoading && (
                <Card className="p-4 sm:p-6 border-red-300 bg-red-50 dark:bg-red-900/20">
                    <div className="text-red-700 dark:text-red-400">
                        <h3 className="mb-2 font-bold">Error</h3>
                        <p>{error}</p>
                        <Button 
                            className="mt-4" 
                            onClick={() => navigate('/admin/athletes')}
                            variant="secondary"
                        >
                            Return to Athletes List
                        </Button>
                    </div>
                </Card>
            )}

            {/* Athlete Not Found */}
            {!isLoading && !error && !athleteDetails && (
                <Card className="p-4 sm:p-6">
                    <div className="text-center">
                        <h3 className="mb-2 font-bold text-gray-800 dark:text-white">Athlete Not Found</h3>
                        <p>The athlete you're looking for could not be found.</p>
                        <Button 
                            className="mt-4" 
                            onClick={() => navigate('/admin/athletes')}
                            variant="secondary"
                        >
                            Return to Athletes List
                        </Button>
                    </div>
                </Card>
            )}

            {/* Success Message */}
            {successMessage && (
                <div className="p-3 mb-4 text-green-700 bg-green-100 rounded dark:bg-green-900/20 dark:text-green-400">
                    {successMessage}
                </div>
            )}

            {/* Athlete Details */}
            {!isLoading && !error && athleteDetails && !isEditing && (
                <>
                    <div className="flex flex-col mb-4 space-y-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{athleteDetails.first_name} {athleteDetails.last_name}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:flex-row sm:space-y-0 mb-4">
                        <div className="flex flex-wrap gap-2 sm:flex-row sm:space-y-0">
                            <Button 
                                onClick={() => setIsEditing(true)}
                                variant="primary"
                                className="w-full sm:w-auto"
                            >
                                Edit Profile
                            </Button>
                            <Button 
                                onClick={() => navigate(`/admin/athletes/${id}/steps`)}
                                variant="secondary"
                                className="w-full sm:w-auto"
                            >
                                View Steps History
                            </Button>
                            <Button 
                                onClick={() => navigate(`/admin/athletes/${id}/workouts`)}
                                variant="secondary"
                                className="w-full sm:w-auto"
                            >
                                View Training History
                            </Button>
                            <Button 
                                onClick={() => navigate(`/admin/athletes/${id}/nutrition`)}
                                variant="secondary"
                                className="w-full sm:w-auto"
                            >
                                View Nutrition History
                            </Button>
                            <Button 
                                onClick={() => navigate(`/admin/athletes/${id}/check-ins`)}
                                variant="secondary"
                                className="w-full sm:w-auto"
                            >
                                View Check-ins
                            </Button>
                            <Button 
                                onClick={() => navigate(`/admin/athletes/${id}/water`)}
                                variant="secondary"
                                className="w-full sm:w-auto"
                            >
                                View Water History
                            </Button>
                            <Button
                                onClick={() => navigate(`/admin/athletes/${id}/measurements`)}
                                variant="secondary"
                                className="w-full sm:w-auto"
                            >
                                View Body Measurements
                            </Button>
                            <Button 
                                onClick={() => setShowProgramModal(true)}
                                variant="secondary"
                                className="w-full sm:w-auto"
                            >
                                Manage Programs
                            </Button>
                            <Button 
                                onClick={() => setShowNutritionPlanModal(true)}
                                variant="secondary"
                                className="w-full sm:w-auto"
                            >
                                Manage Nutrition Plan
                            </Button>
                        </div>
                    </div>
                    
                    <Card className="p-4 mb-4 sm:p-6 sm:mb-6">
                        <h3 className="pb-2 mb-4 text-lg font-medium text-gray-800 border-b dark:text-white">Basic Information</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">First Name</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.first_name || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Last Name</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.last_name || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Username</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.username || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.email || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
                                <p className="font-medium text-gray-800 capitalize dark:text-white">{athleteDetails.role || 'Not assigned'}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 mb-4 sm:p-6 sm:mb-6">
                        <h3 className="pb-2 mb-4 text-lg font-medium text-gray-800 border-b dark:text-white">Goals</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Goal Type</p>
                                <p className="font-medium text-gray-800 dark:text-white">
                                    {athleteDetails.goal_type ? 
                                        athleteDetails.goal_type === 'fat_loss' ? 'Fat Loss' :
                                        athleteDetails.goal_type === 'muscle_gain' ? 'Muscle Gain' :
                                        athleteDetails.goal_type === 'both' ? 'Both (Fat Loss & Muscle Gain)' :
                                        athleteDetails.goal_type === 'maintenance' ? 'Maintenance' : 
                                        athleteDetails.goal_type
                                    : 'Not provided'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Target Weight (kg)</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.goal_target_weight_kg || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Target Fat Loss (kg)</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.goal_target_fat_loss_kg || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Target Muscle Gain (kg)</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.goal_target_muscle_gain_kg || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Timeframe (weeks)</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.goal_timeframe_weeks || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Physique Details</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.goal_physique_details || 'Not provided'}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 mb-4 sm:p-6 sm:mb-6">
                        <h3 className="pb-2 mb-4 text-lg font-medium text-gray-800 border-b dark:text-white">Lifestyle</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Sleep Hours</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.lifestyle_sleep_hours || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Stress Level</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.lifestyle_stress_level || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Water Intake (liters)</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.lifestyle_water_intake_liters || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Schedule Notes</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.lifestyle_schedule_notes || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Supplements/Medications</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.supplements_meds || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Motivation/Readiness</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.motivation_readiness || 'Not provided'}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 mb-4 sm:p-6 sm:mb-6">
                        <h3 className="pb-2 mb-4 text-lg font-medium text-gray-800 border-b dark:text-white">Training</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Days Per Week</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.training_days_per_week || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Current Program</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.training_current_program || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Equipment</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.training_equipment || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Session Length (minutes)</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.training_session_length_minutes || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Intensity</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.training_intensity || 'Not provided'}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Training Program Card */}
                    <Card className="p-4 mb-4 sm:p-6 sm:mb-6">
                        <h3 className="pb-2 mb-4 text-lg font-medium text-gray-800 border-b dark:text-white">Training Program</h3>
                        {currentProgram && currentProgram.program ? (
                            <div>
                                <p className="mb-2 font-medium text-indigo-600 dark:text-indigo-400">
                                    {currentProgram.program.name}
                                    {currentProgram.program.version && currentProgram.program.version > 1 && 
                                        <span className="ml-1">v{currentProgram.program.version}</span>
                                    }
                                </p>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    Assigned on {new Date(currentProgram.start_date).toLocaleDateString()}
                                </p>
                                <button 
                                    onClick={() => setShowProgramModal(true)}
                                    className="mt-3 inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-sm px-4 py-2"
                                >
                                    Change Program
                                </button>
                                <button 
                                    onClick={() => navigate(`/admin/athletes/${id}/workouts`)}
                                    className="mt-3 sm:ml-2 inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 text-sm px-4 py-2"
                                >
                                    View Training History
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p className="text-gray-600 dark:text-gray-400">No program assigned yet.</p>
                                <button 
                                    onClick={() => setShowProgramModal(true)}
                                    className="mt-3 inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-sm px-4 py-2"
                                >
                                    Assign Program
                                </button>
                                <button 
                                    onClick={() => navigate(`/admin/athletes/${id}/workouts`)}
                                    className="mt-3 sm:ml-2 inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 text-sm px-4 py-2"
                                >
                                    View Training History
                                </button>
                            </div>
                        )}
                    </Card>

                    <Card className="p-4 mb-4 sm:p-6 sm:mb-6">
                        <h3 className="pb-2 mb-4 text-lg font-medium text-gray-800 border-b dark:text-white">Nutrition</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Meal Patterns</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.nutrition_meal_patterns || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tracking Method</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.nutrition_tracking_method || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Preferences</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.nutrition_preferences || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Allergies</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.nutrition_allergies || 'Not provided'}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Nutrition Plan Card */}
                    <Card className="p-4 mb-4 sm:p-6 sm:mb-6">
                        <h3 className="pb-2 mb-4 text-lg font-medium text-gray-800 border-b dark:text-white">Nutrition Plan</h3>
                        {currentNutritionPlan && currentNutritionPlan.nutrition_plan ? (
                            <div>
                                <p className="mb-2 font-medium text-indigo-600 dark:text-indigo-400">
                                    {currentNutritionPlan.nutrition_plan.name}
                                </p>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    Assigned on {new Date(currentNutritionPlan.start_date).toLocaleDateString()}
                                </p>
                                <button 
                                    onClick={() => setShowNutritionPlanModal(true)}
                                    className="mt-3 inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-sm px-4 py-2"
                                >
                                    Change Nutrition Plan
                                </button>
                                <button 
                                    onClick={() => navigate(`/admin/athletes/${id}/nutrition-history`)}
                                    className="mt-3 sm:ml-2 inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 text-sm px-4 py-2"
                                >
                                    View Nutrition History
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p className="text-gray-600 dark:text-gray-400">No nutrition plan assigned yet.</p>
                                <button 
                                    onClick={() => setShowNutritionPlanModal(true)}
                                    className="mt-3 inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-sm px-4 py-2"
                                >
                                    Assign Nutrition Plan
                                </button>
                                <button 
                                    onClick={() => navigate(`/admin/athletes/${id}/nutrition-history`)}
                                    className="mt-3 sm:ml-2 inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 text-sm px-4 py-2"
                                >
                                    View Nutrition History
                                </button>
                            </div>
                        )}
                    </Card>

                    <Card className="p-4 mb-4 sm:p-6 sm:mb-6">
                        <h3 className="pb-2 mb-4 text-lg font-medium text-gray-800 border-b dark:text-white">Physical Details</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Age</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.age || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Weight (kg)</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.weight_kg || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Height (cm)</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.height_cm || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Body Fat %</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.body_fat_percentage || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Gender</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.gender || 'Not provided'}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Body Measurements Tracking */}
                    <Card className="p-4 mb-4 sm:p-6 sm:mb-6">
                        <AthleteMeasurementsManager 
                            athleteId={athleteDetails.user_id || ''}
                            athleteData={{
                                gender: athleteDetails.gender as 'male' | 'female',
                                age: athleteDetails.age || 0,
                                height_cm: athleteDetails.height_cm || 0,
                                first_name: athleteDetails.first_name || '',
                                last_name: athleteDetails.last_name || ''
                            }}
                        />
                    </Card>

                    {/* Step Goal Card */}
                    {renderStepGoalCard()}

                    {/* Water Goal Card */}
                    {renderWaterGoalCard()}

                    {/* Check-in Card */}
                    {renderCheckInCard()}
                </>
            )}

            {/* Edit Athlete Form */}
            {!isLoading && !error && athleteDetails && isEditing && (
                <Card className="p-4 sm:p-6">
                    <div className="flex flex-col mb-4 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white sm:mb-0">Edit Athlete</h2>
                        <Button 
                            onClick={() => setIsEditing(false)}
                            variant="secondary"
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                    </div>
                    
                    <UserEditForm 
                        user={athleteDetails}
                        onSave={handleUpdateAthlete}
                        isSaving={isSaving}
                    />
                </Card>
            )}

            {/* Program Assignment Modal */}
            {athleteDetails && showProgramModal && (
                <ProgramAssignmentModal
                    athleteId={athleteDetails.id || ''}
                    onClose={() => setShowProgramModal(false)}
                    onSuccess={handleProgramAssignmentSuccess}
                />
            )}

            {/* Nutrition Plan Assignment Modal */}
            {athleteDetails && showNutritionPlanModal && (
                <NutritionPlanAssignmentModal
                    athleteId={athleteDetails.id || ''}
                    onClose={() => setShowNutritionPlanModal(false)}
                    onSuccess={handleNutritionPlanAssignmentSuccess}
                />
            )}
        </div>
    );
};

export default AthleteDetailsPage; 