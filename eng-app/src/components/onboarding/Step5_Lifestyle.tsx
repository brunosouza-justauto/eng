import React from 'react';
import FormInput from '../ui/FormInput';

// Step 5 Component
const Step5_Lifestyle: React.FC = () => {
    return (
        <div className="space-y-4">
            <FormInput 
                name="lifestyle_sleep_hours"
                label="Average Sleep (hours/night, optional)"
                type="number" 
                placeholder="e.g., 7.5"
                step="0.1"
            />
            <FormInput 
                name="lifestyle_stress_level"
                label="Average Stress Level (1-10, optional)"
                type="number" 
                placeholder="1=Low, 10=High"
            />
            <FormInput 
                name="lifestyle_water_intake_liters"
                label="Average Daily Water Intake (liters, optional)"
                type="number" 
                placeholder="e.g., 3.5"
                step="0.1"
            />
             <FormInput 
                name="lifestyle_schedule_notes"
                label="Weekday vs Weekend Schedule Differences (optional)"
                type="textarea" 
                placeholder="Describe any significant differences in sleep, activity, or eating patterns."
            />
             <FormInput 
                name="supplements_meds"
                label="Current Supplements & Medications (optional)"
                type="textarea" 
                placeholder="List any supplements or medications you take regularly."
            />
             <FormInput 
                name="motivation_readiness"
                label="Motivation & Readiness for Change (optional)"
                type="textarea" 
                placeholder="What motivates you? How ready are you to make changes? Any potential challenges?"
            />
        </div>
    );
};

export default Step5_Lifestyle; 