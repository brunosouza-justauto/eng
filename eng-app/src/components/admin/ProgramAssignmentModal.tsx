import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

interface Program {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
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

    // Fetch available programs
    useEffect(() => {
        const fetchPrograms = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('program_templates')
                    .select('id, name, description, created_at')
                    .order('name');
                
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

        setIsSaving(true);
        setError(null);

        try {
            // In a real implementation, you would:
            // 1. Check if the athlete already has this program assigned
            // 2. Create a new assignment record
            // 3. Possibly copy workouts from the template to the athlete's assigned program
            
            // For now, we'll just simulate the assignment
            const { error: assignError } = await supabase
                .from('athlete_program_assignments')
                .insert({
                    athlete_id: athleteId,
                    program_template_id: selectedProgramId,
                    assigned_at: new Date().toISOString(),
                    status: 'active'
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
                            <div className="w-6 h-6 border-2 border-t-2 border-gray-200 dark:border-gray-700 border-t-indigo-600 rounded-full animate-spin"></div>
                        </div>
                    ) : programs.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No programs available to assign.</p>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="program-select" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Select Program
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
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {selectedProgramId && (
                                <div className="p-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded">
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
                        {isSaving ? 'Assigning...' : 'Assign Program'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProgramAssignmentModal; 