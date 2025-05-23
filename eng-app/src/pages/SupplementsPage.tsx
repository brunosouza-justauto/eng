import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getAthleteSupplementsBySchedule } from '../services/supplementService';
import { AthleteSupplementWithDetails, SupplementSchedule } from '../types/supplements';
import SupplementScheduleList from '../components/supplements/SupplementScheduleList';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { RootState } from '../store/store';
import BackButton from '../components/common/BackButton';

interface SupplementsBySchedule {
  schedule: SupplementSchedule;
  supplements: AthleteSupplementWithDetails[];
}

const SupplementsPage: React.FC = () => {
  const [supplementsBySchedule, setSupplementsBySchedule] = useState<SupplementsBySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = useSelector((state: RootState) => state.auth.user?.id);

  useEffect(() => {
    const fetchSupplements = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        const data = await getAthleteSupplementsBySchedule(userId);
        setSupplementsBySchedule(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch supplements:', err);
        setError('Failed to load supplements. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSupplements();
  }, [userId]);

  // Order schedules by priority (common time-based order)
  const orderedSchedules = [...supplementsBySchedule].sort((a, b) => {
    const scheduleOrder = {
      'Morning': 1,
      'Before Workout': 2,
      'During Workout': 3,
      'After Workout': 4,
      'Afternoon': 5,
      'Evening': 6,
      'Before Bed': 7,
      'Daily': 8,
      'With Meal': 9,
      'Empty Stomach': 10
    };
    
    const orderA = scheduleOrder[a.schedule as keyof typeof scheduleOrder] || 100;
    const orderB = scheduleOrder[b.schedule as keyof typeof scheduleOrder] || 100;
    
    return orderA - orderB;
  });

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-500 dark:text-red-400">
        <BackButton />
        <h1 className="text-2xl font-bold mb-4">My Supplements</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <BackButton />
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">My Supplements</h1>
        
        {orderedSchedules.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              No supplements assigned yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {orderedSchedules.map(scheduleGroup => (
              <div key={scheduleGroup.schedule} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
                <SupplementScheduleList 
                  schedule={scheduleGroup.schedule} 
                  supplements={scheduleGroup.supplements}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplementsPage; 