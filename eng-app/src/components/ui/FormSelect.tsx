import { useFormContext, FieldValues, Path, FieldError } from 'react-hook-form';

// Make the component generic to accept different form data types
interface FormSelectProps<T extends FieldValues> {
    name: Path<T>; // Use Path for type safety
    label: string;
    options: { value: string; label: string }[];
    placeholder?: string;
    required?: boolean;
    autoFocus?: boolean;
}

const FormSelect = <T extends FieldValues>({
    name,
    label,
    options,
    placeholder,
    required,
    autoFocus,
}: FormSelectProps<T>) => {
    const { register, formState: { errors } } = useFormContext<T>();
    
    // Access the error message safely, considering nested paths
    const error = errors[name] as FieldError | undefined;
    const errorMessage = error?.message;
    
    // Further improved classes with better dark mode support for errors
    const commonClasses = `mt-1 block w-full px-3 py-2 border rounded-md shadow-sm 
        ${error 
            ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/20' 
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
        } 
        placeholder-gray-400 dark:placeholder-gray-500
        focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400
        text-gray-900 dark:text-white`;

    return (
        <div className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
            </label>
            <select
                id={name}
                autoFocus={autoFocus}
                {...register(name)}
                className={commonClasses}
                aria-invalid={error ? "true" : "false"}
            >
                {placeholder && (
                    <option value="">{placeholder}</option>
                )}
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {errorMessage && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {typeof errorMessage === 'string' ? errorMessage : 'Invalid input'}
                </p>
            )}
        </div>
    );
};

export default FormSelect; 