import React from 'react';
import Card from '../ui/Card';

interface StepGoalWidgetProps {
  dailyGoal: number | null | undefined;
}

const StepGoalWidget: React.FC<StepGoalWidgetProps> = ({ dailyGoal }) => {
  // TODO: Fetch/calculate current step progress
  const currentProgress = 0; // Placeholder
  const progressPercentage = dailyGoal && dailyGoal > 0 
                            ? Math.min(100, Math.round((currentProgress / dailyGoal) * 100)) 
                            : 0;

  // Function to determine progress color
  const getProgressColor = () => {
    if (progressPercentage < 25) return 'bg-red-500 dark:bg-red-600';
    if (progressPercentage < 75) return 'bg-yellow-500 dark:bg-yellow-600';
    return 'bg-green-500 dark:bg-green-600';
  };

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.05 3.636a1 1 0 010 1.414 7 7 0 000 9.9 1 1 0 11-1.414 1.414 9 9 0 010-12.728 1 1 0 011.414 0zm9.9 0a1 1 0 011.414 0 9 9 0 010 12.728 1 1 0 11-1.414-1.414 7 7 0 000-9.9 1 1 0 010-1.414zM7.879 6.464a1 1 0 010 1.414 3 3 0 000 4.243 1 1 0 11-1.415 1.414 5 5 0 010-7.07 1 1 0 011.415 0zm4.242 0a1 1 0 011.415 0 5 5 0 010 7.072 1 1 0 01-1.415-1.415 3 3 0 000-4.242 1 1 0 010-1.415z" clipRule="evenodd" />
        </svg>
        <h2 className="text-lg font-medium">Daily Steps</h2>
      </div>
      {dailyGoal && (
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
          {progressPercentage}% Complete
        </span>
      )}
    </div>
  );

  return (
    <Card 
      header={header} 
      className="h-full flex flex-col"
      variant="default"
    >
      <div className="flex-grow space-y-4">
        {dailyGoal !== null && dailyGoal !== undefined ? (
          <>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600 dark:text-gray-400">Goal:</span>
              <span className="font-semibold text-xl">{dailyGoal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-gray-600 dark:text-gray-400">Today:</span>
              <span className="font-semibold text-xl">{currentProgress.toLocaleString()}</span>
            </div>
            
            {/* Enhanced Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className={`${getProgressColor()} h-3 rounded-full transition-all duration-500 ease-in-out`}
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span>0</span>
                <span>{Math.floor(dailyGoal / 2).toLocaleString()}</span>
                <span>{dailyGoal.toLocaleString()}</span>
              </div>
            </div>

            {/* Motivation message based on progress */}
            <p className="text-sm text-center mt-4 font-medium">
              {progressPercentage === 0 && "Let's get those steps in today!"}
              {progressPercentage > 0 && progressPercentage < 25 && "Great start! Keep moving!"}
              {progressPercentage >= 25 && progressPercentage < 50 && "You're making good progress!"}
              {progressPercentage >= 50 && progressPercentage < 75 && "More than halfway there!"}
              {progressPercentage >= 75 && progressPercentage < 100 && "Almost there! Finish strong!"}
              {progressPercentage === 100 && "Congratulations! Goal achieved!"}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400">No active step goal assigned</p>
            <p className="text-xs mt-2 text-gray-500 dark:text-gray-500">Contact your coach to set up your daily target</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default StepGoalWidget; 