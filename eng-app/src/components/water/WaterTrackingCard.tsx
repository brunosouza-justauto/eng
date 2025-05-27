import React, { useState, useEffect } from 'react';
import { FiPlus, FiDroplet } from 'react-icons/fi';
import { waterTrackingService } from '../../services/waterTrackingService';
import { WaterTrackingProgress } from '../../types/waterTracking';
import CircularProgress from '../ui/CircularProgress';

interface WaterTrackingCardProps {
  userId: string;
  onWaterUpdated?: () => void; // Optional callback when water is updated
}

const WaterTrackingCard: React.FC<WaterTrackingCardProps> = ({ userId, onWaterUpdated }) => {
  const [progress, setProgress] = useState<WaterTrackingProgress>({
    currentAmount: 0,
    goal: 2500,
    percentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [addAmount, setAddAmount] = useState(250); // Default increment value in ml
  const [updating, setUpdating] = useState(false);

  const quickAddOptions = [250, 500, 750];

  // Fetch water tracking data on component mount
  useEffect(() => {
    const fetchWaterData = async () => {
      try {
        setLoading(true);
        const today = new Date();
        
        // Get water goal
        const goal = await waterTrackingService.getWaterGoal(userId);
        
        // Get today's entry if it exists
        const entry = await waterTrackingService.getWaterTrackingEntry(userId, today);
        
        const currentAmount = entry?.amount_ml || 0;
        const percentage = Math.min(Math.round((currentAmount / goal) * 100), 100);
        
        setProgress({
          currentAmount,
          goal,
          percentage
        });
      } catch (error) {
        console.error('Error fetching water data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchWaterData();
    }
  }, [userId]);

  // Handle adding water
  const handleAddWater = async (amount: number) => {
    if (!userId || updating) return;
    
    try {
      setUpdating(true);
      
      await waterTrackingService.addWaterAmount(userId, amount);
      
      // Update progress state
      const newAmount = progress.currentAmount + amount;
      const newPercentage = Math.min(Math.round((newAmount / progress.goal) * 100), 100);
      
      setProgress({
        ...progress,
        currentAmount: newAmount,
        percentage: newPercentage
      });
      
      // Notify parent component about the update
      if (onWaterUpdated) {
        onWaterUpdated();
      }
    } catch (error) {
      console.error('Error updating water amount:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Format water amount for display
  const formatWaterAmount = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}L`;
    }
    return `${amount}ml`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 transition-all">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold flex items-center text-gray-800 dark:text-white">
          <FiDroplet className="mr-2 text-blue-500" /> Water Intake
        </h3>
        <span className="text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full font-medium">Today</span>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="relative w-48 h-48">
                <CircularProgress 
                  percentage={progress.percentage} 
                  size={192}
                  strokeWidth={14}
                  circleColor="rgb(226, 232, 240)" // slate-200
                  progressColor="rgb(59, 130, 246)" // blue-500
                  textColor="rgb(59, 130, 246)" // blue-500
                  showPercentage={false} // Don't show percentage text from CircularProgress
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-full w-28 h-28 shadow-inner border border-gray-100 dark:border-gray-700">
                  <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {formatWaterAmount(progress.currentAmount)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    of {formatWaterAmount(progress.goal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="text-center mb-3 text-gray-600 dark:text-gray-300 font-medium">Quick Add</div>
            <div className="flex justify-center space-x-3">
              {quickAddOptions.map(option => (
                <button
                  key={option}
                  onClick={() => handleAddWater(option)}
                  disabled={updating}
                  className="px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800/70 transition-all disabled:opacity-50 shadow-sm hover:shadow transform hover:-translate-y-0.5"
                >
                  +{option}ml
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
            <div className="flex-1 mr-3">
              <input
                type="number"
                min="10"
                max="2000"
                step="10"
                value={addAmount}
                onChange={(e) => setAddAmount(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white outline-none transition-all"
                placeholder="Custom amount"
              />
            </div>
            <button
              onClick={() => handleAddWater(addAmount)}
              disabled={updating || addAmount <= 0}
              className="flex items-center justify-center h-11 w-11 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg disabled:opacity-50 shadow-sm transition-all transform hover:-translate-y-0.5"
              aria-label="Add custom water amount"
            >
              <FiPlus size={20} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default WaterTrackingCard;
