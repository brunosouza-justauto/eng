import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FormProvider, useForm } from 'react-hook-form';
import FormInput from './FormInput';

// Mock Form Provider wrapper for testing components using useFormContext
const MockFormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const methods = useForm();
    return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('FormInput Component', () => {
    it('should render the label and input field', () => {
        render(
            <MockFormProvider>
                <FormInput name="testInput" label="Test Label" type="text" placeholder="Enter text" />
            </MockFormProvider>
        );

        // Check if the label is rendered
        expect(screen.getByLabelText('Test Label')).toBeInTheDocument();

        // Check if the input field is rendered with placeholder
        expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render a textarea when type is textarea', () => {
        render(
            <MockFormProvider>
                <FormInput name="testTextarea" label="Test Textarea" type="textarea" placeholder="Enter details" />
            </MockFormProvider>
        );

        // Check if the label is rendered
        expect(screen.getByLabelText('Test Textarea')).toBeInTheDocument();

        // Check if the textarea is rendered (use role or placeholder)
        expect(screen.getByRole('textbox', { name: 'Test Textarea' })).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter details')).toBeInTheDocument();
    });

    // TODO: Add tests for error display
}); 