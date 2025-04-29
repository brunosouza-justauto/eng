import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { UserProfileFull } from '../../types/profiles';
import UserEditForm from '../../components/admin/UserEditForm';
import Card from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import ProgramAssignmentModal from '../../components/admin/ProgramAssignmentModal';

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
                goal_timeframe_weeks: formData.goal_timeframe_weeks,
                goal_target_weight_kg: formData.goal_target_weight_kg,
                goal_physique_details: formData.goal_physique_details,
                
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
                motivation_readiness: formData.motivation_readiness
            };
            
            // Remove undefined properties to avoid overwriting existing DB values
            Object.keys(updatePayload).forEach(key => 
                updatePayload[key as keyof typeof updatePayload] === undefined && 
                delete updatePayload[key as keyof typeof updatePayload]
            );

            console.log("Updating athlete profile:", id, updatePayload);
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
                        Back to Athletes
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
                        Back to Athletes
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Athlete Details</h1>
                <Button onClick={() => navigate('/admin/athletes')} variant="secondary">
                    Back to Athletes
                </Button>
            </div>

            {/* Loading State */}
            {isLoading && (
                <Card className="p-6">
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                    </div>
                </Card>
            )}

            {/* Error State */}
            {error && !isLoading && (
                <Card className="p-6 border-red-300 bg-red-50 dark:bg-red-900/20">
                    <div className="text-red-700 dark:text-red-400">
                        <h3 className="font-bold mb-2">Error</h3>
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
                <Card className="p-6">
                    <div className="text-center">
                        <h3 className="font-bold mb-2 text-gray-800 dark:text-white">Athlete Not Found</h3>
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
                <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded">
                    {successMessage}
                </div>
            )}

            {/* Athlete Details */}
            {!isLoading && !error && athleteDetails && !isEditing && (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{athleteDetails.username || 'Unnamed Athlete'}</h2>
                        <div className="space-x-2">
                            <Button 
                                onClick={() => setIsEditing(true)}
                                variant="primary"
                            >
                                Edit Profile
                            </Button>
                            <Button 
                                onClick={() => setShowProgramModal(true)}
                                variant="secondary"
                            >
                                Manage Programs
                            </Button>
                        </div>
                    </div>

                    <Card className="mb-6 p-6">
                        <h3 className="text-lg font-medium mb-4 border-b pb-2 text-gray-800 dark:text-white">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <p className="font-medium text-gray-800 dark:text-white capitalize">{athleteDetails.role || 'Not assigned'}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="mb-6 p-6">
                        <h3 className="text-lg font-medium mb-4 border-b pb-2 text-gray-800 dark:text-white">Physical Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        </div>
                    </Card>

                    <Card className="mb-6 p-6">
                        <h3 className="text-lg font-medium mb-4 border-b pb-2 text-gray-800 dark:text-white">Goals</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Target Weight (kg)</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.goal_target_weight_kg || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Target Fat Loss (kg)</p>
                                <p className="font-medium text-gray-800 dark:text-white">{athleteDetails.goal_target_fat_loss_kg || 'Not provided'}</p>
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

                    <Card className="mb-6 p-6">
                        <h3 className="text-lg font-medium mb-4 border-b pb-2 text-gray-800 dark:text-white">Training</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <Card className="mb-6 p-6">
                        <h3 className="text-lg font-medium mb-4 border-b pb-2 text-gray-800 dark:text-white">Nutrition</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <Card className="mb-6 p-6">
                        <h3 className="text-lg font-medium mb-4 border-b pb-2 text-gray-800 dark:text-white">Lifestyle</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </>
            )}

            {/* Edit Athlete Form */}
            {!isLoading && !error && athleteDetails && isEditing && (
                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Edit Athlete</h2>
                        <Button 
                            onClick={() => setIsEditing(false)}
                            variant="secondary"
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
                    athleteId={athleteDetails.id}
                    onClose={() => setShowProgramModal(false)}
                    onSuccess={() => {
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
                        
                        fetchAthleteDetails();
                        setShowProgramModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default AthleteDetailsPage; 