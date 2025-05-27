import React, { useState, useEffect } from 'react';
import { FiDroplet, FiSave } from 'react-icons/fi';
import { waterTrackingService } from '../../services/waterTrackingService';
import { toast } from 'react-hot-toast';

interface WaterGoalSettingsProps {
  userId: string;
  defaultValue?: number;
  onUpdate?: (newGoal: number) => void;
}

const WaterGoalSettings: React.FC<WaterGoalSettingsProps> = ({ 
  userId, 
  defaultValue = 2500,
  onUpdate 
}) => {
  const [waterGoal, setWaterGoal] = useState<number>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchWaterGoal = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        const goal = await waterTrackingService.getWaterGoal(userId);
        setWaterGoal(goal);
      } catch (error) {
        console.error('Error fetching water goal:', error);
        toast.error('Failed to load water goal settings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchWaterGoal();
  }, [userId]);

  const handleSaveGoal = async () => {
    if (!userId || saving) return;
    
    try {
      setSaving(true);
      await waterTrackingService.updateWaterGoal(userId, waterGoal);
      toast.success('Water goal updated successfully');
      if (onUpdate) {
        onUpdate(waterGoal);
      }
    } catch (error) {
      console.error('Error updating water goal:', error);
      toast.error('Failed to update water goal');
    } finally {
      setSaving(false);
    }
  };

  const handleWaterGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setWaterGoal(value);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center mb-4">
        <FiDroplet className="text-blue-500 mr-2" size={20} />
        <h3 className="text-lg font-semibold">Daily Water Intake Goal</h3>
      </div>
      
      {loading ? (
        <div className="animate-pulse">Loading...</div>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="waterGoal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Water goal (ml)
            </label>
            <div className="flex items-center">
              <input
                id="waterGoal"
                type="number"
                min="500"
                max="10000"
                step="50"
                value={waterGoal}
                onChange={handleWaterGoalChange}
                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              />
              <button
                onClick={handleSaveGoal}
                disabled={saving}
                className="ml-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50"
              >
                <FiSave className="mr-1" /> Save
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            <p>Recommended daily water intake:</p>
            <ul className="list-disc ml-5 mt-1">
              <li>General recommendation: 2000-3000 ml</li>
              <li>Active individuals: 3000-4000 ml</li>
              <li>Highly active/athletes: 4000-5000+ ml</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterGoalSettings;
