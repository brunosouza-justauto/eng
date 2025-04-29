import React from 'react';
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import { UserProfileFull } from './UserManager'; // Import full profile type

// TODO: Define Zod schema for editable fields
// TODO: Define form data type

interface UserEditFormProps {
    user: UserProfileFull;
    onSave: (data: Partial<UserProfileFull>) => Promise<void>;
    isSaving: boolean;
}

const UserEditForm: React.FC<UserEditFormProps> = ({ user, onSave, isSaving }) => {

    // TODO: Initialize react-hook-form, handle submit

    const handleSubmitForm = (/* data */) => {
        const updatedData: Partial<UserProfileFull> = { /* map form data */ };
        onSave(updatedData);
    };

    return (
        <form onSubmit={handleSubmitForm} className="space-y-4">
            <p>(Edit Form Placeholder - Fields for Role, Username, etc.)</p>
            
            {/* Example: Role Select (replace with actual implementation) */}
            <div className="mb-4">
                <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select 
                    id="role-select"
                    defaultValue={user.role} 
                    // {...register('role')} 
                    className="block w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                >
                    <option value="athlete">Athlete</option>
                    <option value="coach">Coach</option>
                </select>
            </div>

            {/* TODO: Add other editable fields based on UserProfileFull */}

            <div className="flex justify-end gap-3 mt-4">
                 {/* Cancel button is handled by parent modal */}
                 <button 
                    type="submit" 
                    disabled={isSaving} 
                    className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
};

export default UserEditForm; 