import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { UserProfileFull } from '../../types/profiles';
import UserEditForm from '../../components/admin/UserEditForm';
import Card from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const CoachDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [coachDetails, setCoachDetails] = useState<UserProfileFull | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchCoachDetails = async () => {
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
                    setCoachDetails(data as UserProfileFull);
                } else {
                    throw new Error('Coach not found');
                }
            } catch (err: unknown) {
                console.error("Error fetching coach details:", err);
                const errorMessage = err instanceof Error ? err.message : 'Failed to load coach details';
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCoachDetails();
    }, [id]);

    const handleUpdateCoach = async (formData: Partial<UserProfileFull>) => {
        if (!coachDetails || !id) return;
        
        setIsSaving(true);
        setError(null);
        
        try {
            // Only include relevant coach fields
            const updatePayload: Partial<UserProfileFull> = {
                username: formData.username,
                role: formData.role,
                // Add other coach-specific fields here if needed
            };
            
            // Remove undefined properties to avoid overwriting existing DB values
            Object.keys(updatePayload).forEach(key => 
                updatePayload[key as keyof typeof updatePayload] === undefined && 
                delete updatePayload[key as keyof typeof updatePayload]
            );

            console.log("Updating coach profile:", id, updatePayload);
            const { data, error } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', id)
                .select('*') 
                .single();

            if (error) throw error;

            // Update state with the updated data
            setCoachDetails(data as UserProfileFull);
            setIsEditing(false);
            setSuccessMessage('Coach profile updated successfully');
            
            // Clear success message after a few seconds
            setTimeout(() => setSuccessMessage(null), 5000);

        } catch (err: unknown) { 
            console.error("Error updating coach:", err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to update coach profile';
            setError(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-gray-800 dark:text-white">Loading coach details...</p>
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
                        onClick={() => navigate('/admin/coaches')}
                    >
                        Back to Coaches
                    </Button>
                </Card>
            </div>
        );
    }

    if (!coachDetails) {
        return (
            <div className="p-8">
                <Card className="p-6">
                    <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white">Coach Not Found</h2>
                    <p className="text-gray-800 dark:text-white">The requested coach could not be found.</p>
                    <Button 
                        color="indigo" 
                        className="mt-4" 
                        onClick={() => navigate('/admin/coaches')}
                    >
                        Back to Coaches
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Coach Details</h1>
                <Button onClick={() => navigate('/admin/coaches')} variant="secondary">
                    Back to Coaches
                </Button>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded">
                    {successMessage}
                </div>
            )}

            {/* Coach Details */}
            {!isLoading && !error && coachDetails && !isEditing && (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{coachDetails.username || 'Unnamed Coach'}</h2>
                        <div className="space-x-2">
                            <Button 
                                onClick={() => setIsEditing(true)}
                                variant="primary"
                            >
                                Edit Profile
                            </Button>
                        </div>
                    </div>

                    <Card className="mb-6 p-6">
                        <h3 className="text-lg font-medium mb-4 border-b pb-2 text-gray-800 dark:text-white">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Username</p>
                                <p className="font-medium text-gray-800 dark:text-white">{coachDetails.username || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                                <p className="font-medium text-gray-800 dark:text-white">{coachDetails.email || 'Not provided'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
                                <p className="font-medium text-gray-800 dark:text-white capitalize">{coachDetails.role || 'Not assigned'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Account Created</p>
                                <p className="font-medium text-gray-800 dark:text-white">
                                    {new Date(coachDetails.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Coach-specific information can be added in additional cards here */}
                </>
            )}

            {/* Edit Coach Form */}
            {!isLoading && !error && coachDetails && isEditing && (
                <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Edit Coach</h2>
                        <Button 
                            onClick={() => setIsEditing(false)}
                            variant="secondary"
                        >
                            Cancel
                        </Button>
                    </div>
                    
                    <UserEditForm 
                        user={coachDetails}
                        onSave={handleUpdateCoach}
                        isSaving={isSaving}
                    />
                </Card>
            )}
        </div>
    );
};

export default CoachDetailsPage; 