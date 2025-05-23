import React from 'react';
import CheckInTimeline from '../components/history/CheckInTimeline';
import BackButton from '../components/common/BackButton';

const CheckInHistoryPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <BackButton to="/dashboard" />

      <h1 className="text-3xl font-bold mb-6">Check-in History</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Your complete check-in history is displayed below. Track your progress over time.
      </p>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <CheckInTimeline />
      </div>
    </div>
  );
};

export default CheckInHistoryPage; 