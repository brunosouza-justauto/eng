import React from 'react';
import OnboardingWizard from '../components/onboarding/OnboardingWizard'; // Import the wizard

const OnboardingPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Welcome! Let's get started.</h1>
      <p className="text-center mb-8">Please provide some details to help personalize your experience.</p>
      <OnboardingWizard /> {/* Render the wizard */}
      {/* Remove placeholder */}
      {/* <div className="text-center text-lg font-semibold text-orange-500">Onboarding Wizard Component Placeholder</div> */}
    </div>
  );
};

export default OnboardingPage; 