import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import { WaterGoal } from '../../types/waterTracking';

interface WaterGoalCardProps {
  waterGoal: WaterGoal | null;
  isLoading: boolean;
  athleteId: string;
}

const WaterGoalCard: React.FC<WaterGoalCardProps> = ({ 
  waterGoal, 
  isLoading, 
  athleteId 
}) => {
  const navigate = useNavigate();

  return (
    <Card className="p-4 mb-4 sm:p-6 sm:mb-6">
      <div className="flex items-center justify-between pb-2 mb-4 border-b">
        <h3 className="text-lg font-medium text-gray-800 dark:text-white">Water Goal</h3>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-24">
          <div className="w-10 h-10 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            {waterGoal ? (
              <div>
                <p className="mb-2 font-medium text-blue-600 dark:text-blue-400">
                  {waterGoal.water_goal_ml.toLocaleString()} ml per day
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Last updated: {new Date(waterGoal.updated_at || waterGoal.created_at).toLocaleDateString()}
                </p>
                <div className="flex flex-wrap mt-3 gap-2">
                  <button 
                    onClick={() => navigate('/admin/watergoals')}
                    className="inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700 text-sm px-4 py-2"
                  >
                    Manage Water Goals
                  </button>
                  <button 
                    onClick={() => navigate(`/admin/athletes/${athleteId}/water`)}
                    className="inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 text-sm px-4 py-2"
                  >
                    View Water History
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-gray-400">No water goal assigned yet.</p>
                <div className="flex flex-wrap mt-3 gap-2">
                  <button 
                    onClick={() => navigate('/admin/watergoals')}
                    className="inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700 text-sm px-4 py-2"
                  >
                    Assign Water Goal
                  </button>
                  <button 
                    onClick={() => navigate(`/admin/athletes/${athleteId}/water`)}
                    className="inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 text-sm px-4 py-2"
                  >
                    View Water History
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
};

export default WaterGoalCard;
