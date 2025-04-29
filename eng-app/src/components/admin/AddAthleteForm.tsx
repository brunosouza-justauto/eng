import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Schema for the form
const addAthleteSchema = z.object({
    email: z.string().email('Invalid email address').min(1, 'Email is required'),
});
type AddAthleteFormData = z.infer<typeof addAthleteSchema>;

interface AddAthleteFormProps {
    onAddAthlete: (email: string) => Promise<void>;
    isAdding: boolean;
}

const AddAthleteForm: React.FC<AddAthleteFormProps> = ({ onAddAthlete, isAdding }) => {

    const { register, handleSubmit, formState: { errors } } = useForm<AddAthleteFormData>({
        resolver: zodResolver(addAthleteSchema),
    });

    const handleFormSubmit: SubmitHandler<AddAthleteFormData> = (data) => {
        onAddAthlete(data.email); // Call parent handler with email
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div>
                <label htmlFor="add-email" className="sr-only">Email</label>
                <input 
                    id="add-email"
                    type="email"
                    placeholder="Athlete Email Address"
                    {...register('email')}
                    className={`block w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white`}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <button 
                type="submit"
                disabled={isAdding}
                className="w-full px-4 py-2 bg-indigo-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
                {isAdding ? 'Adding...' : 'Add Athlete'}
            </button>
             {/* Cancel button is outside the form in the parent modal */}
        </form>
    );
};

export default AddAthleteForm; 