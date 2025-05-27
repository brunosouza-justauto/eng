import React, { useState, useEffect } from 'react';
import { FiPlus, FiDroplet } from 'react-icons/fi';
import { waterTrackingService } from '../../services/waterTrackingService';
import { WaterTrackingProgress } from '../../types/waterTracking';
import CircularProgress from '../ui/CircularProgress';

interface WaterTrackingCardProps {
  userId: string;
}

const WaterTrackingCard: React.FC<WaterTrackingCardProps> = ({ userId }) => {
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <FiDroplet className="mr-2 text-blue-500" /> Water Intake
        </h3>
        <span className="text-sm text-gray-500">Today</span>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-pulse">Loading...</div>
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-6">
            <div className="w-32 h-32 relative">
              <CircularProgress 
                percentage={progress.percentage} 
                size={128}
                strokeWidth={12}
                circleColor="rgb(59, 130, 246)" // blue-500
                progressColor="rgb(59, 130, 246)" // blue-500
                textColor="rgb(59, 130, 246)" // blue-500
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">
                  {formatWaterAmount(progress.currentAmount)}
                </span>
                <span className="text-xs text-gray-500">
                  of {formatWaterAmount(progress.goal)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="text-center mb-2">Quick Add</div>
            <div className="flex justify-center space-x-2">
              {quickAddOptions.map(option => (
                <button
                  key={option}
                  onClick={() => handleAddWater(option)}
                  disabled={updating}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
                >
                  +{option}ml
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="flex-1 mr-2">
              <input
                type="number"
                min="10"
                max="2000"
                step="10"
                value={addAmount}
                onChange={(e) => setAddAmount(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg text-center"
              />
            </div>
            <button
              onClick={() => handleAddWater(addAmount)}
              disabled={updating || addAmount <= 0}
              className="flex items-center justify-center h-10 w-10 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              <FiPlus />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default WaterTrackingCard;
