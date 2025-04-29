import React from 'react';
import OnboardingWizard from '../components/onboarding/OnboardingWizard'; // Import the wizard

const OnboardingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">Welcome! Let's get started.</h1>
        <p className="text-center mb-8 text-gray-600 dark:text-gray-300">Please provide some details to help personalize your experience.</p>
        <OnboardingWizard />
      </div>
    </div>
  );
};

export default OnboardingPage; 