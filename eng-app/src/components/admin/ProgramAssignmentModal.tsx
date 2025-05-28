import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { ProgramAssignment } from '../../types/profiles';

interface Program {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    version: number;
    parent_template_id: string | null;
    is_latest_version: boolean;
}

interface ProgramAssignmentModalProps {
    athleteId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const ProgramAssignmentModal: React.FC<ProgramAssignmentModalProps> = ({ athleteId, onClose, onSuccess }) => {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [selectedProgramId, setSelectedProgramId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentAssignment, setCurrentAssignment] = useState<ProgramAssignment | null>(null);
    // Get the current user profile from Redux store
    const userProfile = useSelector(selectProfile);

    // Fetch athlete's current program assignment
    useEffect(() => {
        const fetchCurrentAssignment = async () => {
            try {
                const { data, error } = await supabase
                    .from('assigned_plans')
                    .select(`
                        id,
                        program_template_id,
                        start_date,
                        program:program_templates!program_template_id(id, name, version)
                    `)
                    .eq('athlete_id', athleteId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                if (error) throw error;
                
                if (data) {
                    // Fix the program property structure
                    const fixedAssignment: ProgramAssignment = {
                        id: data.id,
                        program_template_id: data.program_template_id,
                        start_date: data.start_date,
                        // Handle the case where program could be returned in different formats
                        program: Array.isArray(data.program) && data.program.length > 0 
                            ? { 
                                id: data.program[0].id as string, 
                                name: data.program[0].name as string,
                                version: data.program[0].version as number | undefined
                            }
                            : data.program && typeof data.program === 'object' && 'id' in data.program && 'name' in data.program
                                ? { 
                                    id: data.program.id as string, 
                                    name: data.program.name as string,
                                    version: data.program.version as number | undefined
                                }
                                : undefined
                    };
                    setCurrentAssignment(fixedAssignment);
                    setSelectedProgramId(data.program_template_id);
                }
            } catch (err) {
                console.error('Error fetching current assignment:', err);
                // Don't show error to user, just log it
            }
        };
        
        fetchCurrentAssignment();
    }, [athleteId]);

    // Fetch available programs
    useEffect(() => {
        const fetchPrograms = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('program_templates')
                    .select('id, name, description, created_at, version, parent_template_id, is_latest_version')
                    .order('name')
                    .order('version', { ascending: false });
                
                if (fetchError) throw fetchError;
                setPrograms(data || []);
            } catch (err) {
                console.error('Error fetching programs:', err);
                setError('Failed to load programs.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPrograms();
    }, []);

    const handleAssignProgram = async () => {
        if (!selectedProgramId) {
            setError('Please select a program to assign.');
            return;
        }

        if (!userProfile || !userProfile.id) {
            setError('User authentication error. Please try logging in again.');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            // Create a new program assignment
            // No need to update previous assignments since we always use the most recent one
            const { error: assignError } = await supabase
                .from('assigned_plans')
                .insert({
                    athlete_id: athleteId,
                    program_template_id: selectedProgramId,
                    assigned_by: userProfile.id,
                    assigned_at: new Date().toISOString(),
                    start_date: new Date().toISOString().split('T')[0] // Today as the start date
                });

            if (assignError) throw assignError;
            
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error assigning program:', err);
            setError('Failed to assign program. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center w-full h-full overflow-y-auto bg-gray-600 bg-opacity-50">
            <div className="relative w-full max-w-md p-5 bg-white border rounded-md shadow-lg dark:bg-gray-800">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Assign Program</h3>
                
                <div className="mt-4">
                    {isLoading ? (
                        <div className="flex justify-center">
                            <div className="w-6 h-6 border-2 border-t-2 border-gray-200 rounded-full dark:border-gray-700 border-t-indigo-600 animate-spin"></div>
                        </div>
                    ) : programs.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No programs available to assign.</p>
                    ) : (
                        <div className="space-y-4">
                            {currentAssignment && (
                                <div className="p-3 mb-3 text-sm text-indigo-700 bg-indigo-100 rounded dark:bg-indigo-900/20 dark:text-indigo-300">
                                    <span className="font-medium">Current Program:</span> {currentAssignment.program?.name || "Unknown Program"}
                                    {currentAssignment.program?.version && currentAssignment.program.version > 1 && (
                                        <span className="ml-1 font-medium">v{currentAssignment.program.version}</span>
                                    )}
                                    <p className="mt-1 text-xs">Assigned on {new Date(currentAssignment.start_date).toLocaleDateString()}</p>
                                </div>
                            )}
                            
                            <div>
                                <label htmlFor="program-select" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {currentAssignment ? 'Select New Program' : 'Select Program'}
                                </label>
                                <select
                                    id="program-select"
                                    value={selectedProgramId}
                                    onChange={(e) => setSelectedProgramId(e.target.value)}
                                    className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="">-- Select a Program --</option>
                                    {programs.map(program => (
                                        <option key={program.id} value={program.id}>
                                            {program.name}
                                            {program.version && program.version > 1 && ` v${program.version}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {selectedProgramId && (
                                <div className="p-3 text-sm text-gray-600 rounded dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                                    {programs.find(p => p.id === selectedProgramId)?.description || 'No description available.'}
                                </div>
                            )}
                        </div>
                    )}
                    
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
                        onClick={handleAssignProgram}
                        disabled={isLoading || isSaving || !selectedProgramId}
                        className="px-3 py-1.5 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {isSaving 
                            ? 'Saving...' 
                            : currentAssignment && currentAssignment.program_template_id === selectedProgramId 
                                ? 'Confirm Program' 
                                : currentAssignment 
                                    ? 'Change Program' 
                                    : 'Assign Program'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProgramAssignmentModal; 