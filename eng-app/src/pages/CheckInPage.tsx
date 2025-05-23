import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CheckInForm from '../components/check-in/CheckInForm'; // Import the form
import BackButton from '../components/common/BackButton';
import { formatDate } from '../utils/dateUtils';

const CheckInPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [isSubmitSuccess, setIsSubmitSuccess] = useState(false);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  // Handle successful submission
  const handleSubmitSuccess = () => {
    // Scroll to the top of the page
    window.scrollTo(0, 0);
    setIsSubmitSuccess(true);
  };
  
  // Success view
  if (isSubmitSuccess) {
    return (
      <div className="container mx-auto py-8">
        <BackButton to="/dashboard" />

        <h1 className="text-3xl font-bold mb-6 text-center">Weekly Check-in</h1>
        
        <div className="max-w-xl mx-auto p-6 text-center bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">Check-in Submitted Successfully!</h2>
          <p className="mb-6">Your coach will review your update shortly.</p>
          
          <button 
            onClick={() => navigate('/dashboard')} 
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Form view (pre-submission)
  return (
    <div className="container mx-auto py-8">
      <BackButton to="/dashboard" />

      <h1 className="text-3xl font-bold mb-6 text-center">Weekly Check-in</h1>
      <p className="text-center mb-8">Please provide your updates for the past week.</p>
      
      {/* Date selector */}
      <div className="max-w-xl mx-auto mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <label htmlFor="check-in-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Check-in Date
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                Today's date is selected by default. Change it to log a past check-in.
              </p>
            </div>
            <input
              id="check-in-date"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="block w-full md:w-auto rounded-md border border-gray-300 shadow-sm py-2 px-3 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>
      
      <CheckInForm 
        defaultDate={selectedDate} 
        onSubmitSuccess={handleSubmitSuccess} 
      />
    </div>
  );
};

export default CheckInPage; 