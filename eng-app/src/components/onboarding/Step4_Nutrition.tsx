import React from 'react';
import FormInput from '../ui/FormInput';

// Step 4 Component
const Step4_Nutrition: React.FC = () => {
    return (
        <div className="space-y-4">
             <FormInput 
                name="nutrition_meal_patterns"
                label="Typical Meal Patterns / Timing (optional)"
                type="textarea" 
                placeholder="e.g., 3 meals + 2 snacks, Intermittent fasting 16/8, Eat every 3 hours..."
                autoFocus
            />
            <FormInput 
                name="nutrition_tracking_method"
                label="How do you track nutrition? (optional)"
                type="textarea" 
                placeholder="e.g., MyFitnessPal, Cronometer, Pen & paper, Don't track..."
            />
             <FormInput 
                name="nutrition_preferences"
                label="Dietary Preferences (optional)"
                type="textarea" 
                placeholder="e.g., Vegetarian, Vegan, Gluten-free, High protein, Likes spicy food..."
            />
             <FormInput 
                name="nutrition_allergies"
                label="Food Allergies / Intolerances (optional)"
                type="textarea" 
                placeholder="e.g., Peanuts, Dairy, Shellfish, None..."
            />
        </div>
    );
};

export default Step4_Nutrition; 