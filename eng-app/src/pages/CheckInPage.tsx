import React from 'react';
import CheckInForm from '../components/check-in/CheckInForm'; // Import the form

const CheckInPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Weekly Check-in</h1>
      <p className="text-center mb-8">Please provide your updates for the past week.</p>
      <CheckInForm /> {/* Render the form */}
      {/* Remove placeholder */}
      {/* <div className="text-center text-lg font-semibold text-orange-500">Check-in Form Component Placeholder</div> */}
    </div>
  );
};

export default CheckInPage; 