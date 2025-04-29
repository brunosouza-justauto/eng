import React from 'react';
// Removed useFormContext import as it's handled by FormInput
// import { useFormContext } from 'react-hook-form';
// Removed OnboardingData import as it's handled by FormInput
// import { OnboardingData } from './onboardingSchema';
import FormInput from '../ui/FormInput'; // Import the shared component

// Reusable Input component for onboarding fields
// interface FormInputProps {
//     name: keyof OnboardingData;
//     label: string;
//     type?: 'text' | 'number' | 'email' | 'tel'; // Extend as needed
//     placeholder?: string;
//     step?: string; // For number inputs
//     required?: boolean;
// }

// const FormInput: React.FC<FormInputProps> = ({ name, label, type = 'text', placeholder, step, required }) => {
//     const { register, formState: { errors } } = useFormContext<OnboardingData>();
//     const error = errors[name]?.message;

//     return (
//         <div className="mb-4">
//             <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
//                 {label} {required && <span className="text-red-500">*</span>}
//             </label>
//             <input
//                 id={name}
//                 type={type} // Use text for numbers to allow better handling via zod preprocess
//                 step={step}
//                 placeholder={placeholder}
//                 {...register(name)}
//                 className={`mt-1 block w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white`}
//             />
//             {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{typeof error === 'string' ? error : 'Invalid input'}</p>}
//         </div>
//     );
// };

// Step 1 Component
const Step1_Demographics: React.FC = () => {
    return (
        <div className="space-y-4">
            <FormInput name="age" label="Age" type="number" placeholder="e.g., 30" autoFocus />
            <FormInput name="weight_kg" label="Current Weight (kg)" type="number" placeholder="e.g., 75.5" step="0.1"/>
            <FormInput name="height_cm" label="Height (cm)" type="number" placeholder="e.g., 180" step="0.1"/>
            <FormInput name="body_fat_percentage" label="Estimated Body Fat (%)" type="number" placeholder="e.g., 15" step="0.1"/>
            {/* Add more fields as needed for this step */}
        </div>
    );
};

export default Step1_Demographics; 