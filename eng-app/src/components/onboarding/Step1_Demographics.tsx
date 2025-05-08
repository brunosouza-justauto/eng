import React from 'react';
import FormInput from '../ui/FormInput';
import FormSelect from '../ui/FormSelect';

// Step 1 Component
const Step1_Demographics: React.FC = () => {
    return (
        <div className="space-y-4">
            <FormInput name="first_name" label="First Name" type="text" placeholder="Your first name" autoFocus required />
            <FormInput name="last_name" label="Last Name" type="text" placeholder="Your last name" required />
            <FormInput name="age" label="Age" type="number" placeholder="e.g., 30" />
            <FormInput name="weight_kg" label="Current Weight (kg)" type="number" placeholder="e.g., 75.5" step="0.1"/>
            <FormInput name="height_cm" label="Height (cm)" type="number" placeholder="e.g., 180" step="0.1"/>
            
            <div className="mb-4">
                <FormInput name="body_fat_percentage" label="Estimated Body Fat (%)" type="number" placeholder="e.g., 15" step="0.1"/>
                
                <div className="mt-2 p-3 text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded-md">
                    <p className="font-medium mb-1">Typical Body Fat Percentage Ranges:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                            <p className="font-medium">Men:</p>
                            <ul className="list-disc ml-5 space-y-1">
                                <li>Essential fat: 2-5%</li>
                                <li>Athletes: 6-13%</li>
                                <li>Fitness: 14-17%</li>
                                <li>Average: 18-24%</li>
                                <li>Obese: 25%+</li>
                            </ul>
                        </div>
                        <div>
                            <p className="font-medium">Women:</p>
                            <ul className="list-disc ml-5 space-y-1">
                                <li>Essential fat: 10-13%</li>
                                <li>Athletes: 14-20%</li>
                                <li>Fitness: 21-24%</li>
                                <li>Average: 25-31%</li>
                                <li>Obese: 32%+</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            
            <FormSelect 
                name="gender"
                label="Gender"
                required
                options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" }
                ]}
                placeholder="Select Gender"
            />
        </div>
    );
};

export default Step1_Demographics; 