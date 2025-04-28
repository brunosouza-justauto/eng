import { useFormContext, FieldValues, Path, FieldError } from 'react-hook-form';

// Make the component generic to accept different form data types
interface FormInputProps<T extends FieldValues> {
    name: Path<T>; // Use Path for type safety
    label: string;
    type?: 'text' | 'number' | 'email' | 'tel' | 'textarea';
    placeholder?: string;
    step?: string; // For number inputs
    required?: boolean;
    rows?: number; // For textarea
}

const FormInput = <T extends FieldValues>({
    name,
    label,
    type = 'text',
    placeholder,
    step,
    required,
    rows,
}: FormInputProps<T>) => {
    const { register, formState: { errors } } = useFormContext<T>();
    // Access the error message safely, considering nested paths
    const error = errors[name] as FieldError | undefined;
    const errorMessage = error?.message;
    const commonClasses = `mt-1 block w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white`;

    return (
        <div className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {type === 'textarea' ? (
                <textarea
                    id={name}
                    placeholder={placeholder}
                    rows={rows || 3}
                    {...register(name)}
                    className={commonClasses}
                    aria-invalid={error ? "true" : "false"}
                />
            ) : (
                <input
                    id={name}
                    type={type}
                    step={step}
                    placeholder={placeholder}
                    {...register(name)}
                    className={commonClasses}
                    aria-invalid={error ? "true" : "false"}
                />
            )}
            {errorMessage && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{typeof errorMessage === 'string' ? errorMessage : 'Invalid input'}</p>}
        </div>
    );
};

export default FormInput; 