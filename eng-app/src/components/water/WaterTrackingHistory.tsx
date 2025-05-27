import React, { useState, useEffect } from 'react';
import { FiDroplet, FiCalendar } from 'react-icons/fi';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { waterTrackingService } from '../../services/waterTrackingService';
import { WaterTrackingEntry } from '../../types/waterTracking';

interface WaterTrackingHistoryProps {
  userId: string;
}

const WaterTrackingHistory: React.FC<WaterTrackingHistoryProps> = ({ userId }) => {
  const [history, setHistory] = useState<WaterTrackingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [waterGoal, setWaterGoal] = useState<number>(2500);
  
  useEffect(() => {
    const fetchWaterHistory = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        
        // Get water goal
        const goal = await waterTrackingService.getWaterGoal(userId);
        setWaterGoal(goal);
        
        // Get date range for the current week
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday as week start
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
        
        // Fetch water tracking history
        const historyData = await waterTrackingService.getWaterTrackingHistory(
          userId, 
          weekStart,
          weekEnd
        );
        
        setHistory(historyData);
      } catch (error) {
        console.error('Error fetching water history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchWaterHistory();
  }, [userId]);
  
  // Generate entries for each day of the week
  const getDailyEntries = () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const entry = history.find(h => h.date === dateStr);
      
      return {
        date: day,
        formattedDate: format(day, 'EEE'),
        fullDate: format(day, 'MMM d'),
        amount: entry?.amount_ml || 0,
        percentage: Math.min(Math.round(((entry?.amount_ml || 0) / waterGoal) * 100), 100)
      };
    });
  };
  
  const formatWaterAmount = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}L`;
    }
    return `${amount}ml`;
  };
  
  const dailyEntries = getDailyEntries();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <FiDroplet className="mr-2 text-blue-500" /> Water History
        </h3>
        <div className="flex items-center text-sm text-gray-500">
          <FiCalendar className="mr-1" /> This Week
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-pulse">Loading...</div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-7 gap-2">
            {dailyEntries.map((entry, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="text-xs text-gray-500 mb-1">{entry.formattedDate}</div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-24 flex flex-col-reverse">
                  <div 
                    className="bg-blue-500 rounded-full transition-all duration-500 ease-in-out"
                    style={{ height: `${entry.percentage}%` }}
                  />
                </div>
                <div className="text-xs font-medium mt-1">{formatWaterAmount(entry.amount)}</div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center text-sm text-gray-500">
              Daily Goal: {formatWaterAmount(waterGoal)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterTrackingHistory;
