import React from 'react';
import FormInput from '../ui/FormInput'; // Import the shared component

// Step 2 Component
const Step2_Goals: React.FC = () => {
    return (
        <div className="space-y-4">
            <FormInput 
                name="goal_target_fat_loss_kg"
                label="Target Fat Loss (kg, optional)"
                type="number" 
                placeholder="e.g., 5" 
                step="0.1"
                autoFocus
            />
            <FormInput 
                name="goal_timeframe_weeks"
                label="Desired Timeframe (weeks, optional)"
                type="number" 
                placeholder="e.g., 12"
            />
            <FormInput 
                name="goal_target_weight_kg"
                label="Target Body Weight (kg, optional)"
                type="number" 
                placeholder="e.g., 70"
                step="0.1"
            />
            <FormInput 
                name="goal_physique_details"
                label="Specific Physique Goals (optional)"
                type="textarea" 
                placeholder="Describe your physique goals (e.g., improve shoulder width, leaner midsection...)"
            />
        </div>
    );
};

export default Step2_Goals; 