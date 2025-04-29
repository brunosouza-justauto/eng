import React from 'react';
import FormInput from '../ui/FormInput';

// Step 3 Component
const Step3_Training: React.FC = () => {
    return (
        <div className="space-y-4">
            <FormInput 
                name="training_days_per_week"
                label="Training Days per Week (0-7, optional)"
                type="number" 
                placeholder="e.g., 4"
                autoFocus
            />
            <FormInput 
                name="training_current_program"
                label="Current Training Program (optional)"
                type="textarea" 
                placeholder="Briefly describe your current routine or program name (e.g., PPL, Starting Strength, Coach XYZ program...)"
            />
            <FormInput 
                name="training_equipment"
                label="Equipment Available (optional)"
                type="textarea" 
                placeholder="List main equipment (e.g., Full gym, Dumbbells only, Bodyweight only...)"
            />
            <FormInput 
                name="training_session_length_minutes"
                label="Typical Session Length (minutes, optional)"
                type="number" 
                placeholder="e.g., 60"
            />
             <FormInput 
                name="training_intensity"
                label="Typical Training Intensity (optional)"
                type="textarea" 
                placeholder="Describe intensity (e.g., RPE 7-9, Train to failure, Moderate effort...)"
            />
        </div>
    );
};

export default Step3_Training; 