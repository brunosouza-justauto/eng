import React, { useState } from 'react';
import Card from '../ui/Card';
import { FiActivity, FiArrowUp, FiWatch } from 'react-icons/fi';

interface StepGoalWidgetProps {
  dailyGoal: number | null | undefined;
}

const StepGoalWidget: React.FC<StepGoalWidgetProps> = ({ dailyGoal }) => {
  // In a real implementation, this would fetch data from a step tracking API or database
  // For now, we'll use mock data as a placeholder
  const [currentProgress, setCurrentProgress] = useState<number>(Math.floor(Math.random() * 2000)); // Random placeholder
  
  const progressPercentage = dailyGoal && dailyGoal > 0 
                           ? Math.min(100, Math.round((currentProgress / dailyGoal) * 100)) 
                           : 0;

  // Function to determine progress color
  const getProgressColor = () => {
    if (progressPercentage < 25) return 'bg-red-500 dark:bg-red-600';
    if (progressPercentage < 75) return 'bg-yellow-500 dark:bg-yellow-600';
    return 'bg-green-500 dark:bg-green-600';
  };

  // Demo function for future implementation - simulate updating steps count
  const simulateStepUpdate = () => {
    // This is just for demo purposes - in a real app, this would connect to a fitness API
    setCurrentProgress(prev => Math.min(prev + Math.floor(Math.random() * 500) + 100, dailyGoal || 10000));
  };

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <FiActivity className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
        <h2 className="text-lg font-medium">Daily Steps</h2>
      </div>
      {dailyGoal && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          progressPercentage >= 100 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
        }`}>
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
              <div className="flex items-center">
                <span className="font-semibold text-xl">{currentProgress.toLocaleString()}</span>
                {currentProgress > 0 && (
                  <span className="ml-2 text-xs text-green-600 dark:text-green-400 flex items-center">
                    <FiArrowUp className="mr-1" />
                    Active
                  </span>
                )}
              </div>
            </div>
            
            {/* Enhanced Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
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

            {/* Placeholder for future step tracking integration */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={simulateStepUpdate}
                className="w-full py-2 px-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-800/30 text-indigo-700 dark:text-indigo-300 rounded-md transition-colors text-sm flex items-center justify-center"
              >
                <FiWatch className="mr-2" />
                <span>Sync with fitness device</span>
              </button>
              <p className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">
                Coming soon: Connect with Fitbit, Garmin, Apple Health and more
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
              <FiActivity className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">No Active Step Goal</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your coach hasn't set a daily step goal for you yet.
            </p>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg w-full">
              <p className="text-sm font-medium">Benefits of daily steps:</p>
              <ul className="text-sm text-left mt-2 space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Improved cardiovascular health</li>
                <li>• Better weight management</li>
                <li>• Enhanced mood and mental well-being</li>
                <li>• Increased energy levels</li>
              </ul>
              <p className="text-xs mt-4 text-center text-gray-500 dark:text-gray-500">
                Contact your coach to set up your personalized daily step target
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default StepGoalWidget; 