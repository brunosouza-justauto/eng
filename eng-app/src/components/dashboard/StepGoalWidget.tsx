import React from 'react';

interface StepGoalWidgetProps {
  dailyGoal: number | null | undefined;
}

const StepGoalWidget: React.FC<StepGoalWidgetProps> = ({ dailyGoal }) => {
  // TODO: Fetch/calculate current step progress
  const currentProgress = 0; // Placeholder
  const progressPercentage = dailyGoal && dailyGoal > 0 
                            ? Math.min(100, Math.round((currentProgress / dailyGoal) * 100)) 
                            : 0;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-3 flex-shrink-0">Daily Steps</h2>
      <div className="flex-grow text-sm space-y-2">
        {dailyGoal !== null && dailyGoal !== undefined ? (
          <>
            <div className="flex justify-between items-baseline">
              <span>Goal:</span>
              <span className="font-semibold text-lg">{dailyGoal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span>Today:</span>
              <span className="font-semibold text-lg">{currentProgress.toLocaleString()}</span>
            </div>
            {/* Basic Progress Bar Placeholder */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
              <div 
                className="bg-green-500 h-2.5 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-right text-gray-500 dark:text-gray-400">{progressPercentage}% complete</p>
          </>
        ) : (
          <p>No active step goal assigned.</p>
        )}
      </div>
    </div>
  );
};

export default StepGoalWidget; 