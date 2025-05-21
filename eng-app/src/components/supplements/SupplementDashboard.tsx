import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { getAthleteSupplementsBySchedule } from '../../services/supplementService';
import { AthleteSupplementWithDetails, SupplementSchedule } from '../../types/supplements';
import SupplementScheduleList from './SupplementScheduleList';
import { RootState } from '../../store/store';
import Card from '../ui/Card';
import { FiExternalLink } from 'react-icons/fi';

interface SupplementsBySchedule {
  schedule: SupplementSchedule;
  supplements: AthleteSupplementWithDetails[];
}

const SupplementDashboard: React.FC = () => {
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

  // Create the header component
  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        <h2 className="text-lg font-medium">Supplements</h2>
      </div>
      <Link 
        to="/supplements"
        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium flex items-center"
      >
        View All
        <FiExternalLink className="ml-1 w-3.5 h-3.5" />
      </Link>
    </div>
  );

  if (loading) {
    return (
      <Card header={header} className="h-full flex flex-col" variant="default">
        <div className="flex justify-center py-8">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card header={header} className="h-full flex flex-col" variant="default">
        <div className="p-4 text-red-500 dark:text-red-400">
          <p>{error}</p>
        </div>
      </Card>
    );
  }

  const totalSupplements = supplementsBySchedule.reduce((total, group) => total + group.supplements.length, 0);

  return (
    <Card header={header} className="h-full flex flex-col" variant="default">
      {totalSupplements === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-gray-600 dark:text-gray-400">
            No supplements assigned yet.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {/* Show up to 3 schedules on the dashboard */}
          {orderedSchedules.slice(0, 3).map(scheduleGroup => (
            <SupplementScheduleList 
              key={scheduleGroup.schedule}
              schedule={scheduleGroup.schedule} 
              supplements={scheduleGroup.supplements}
              compact={true}
            />
          ))}

          {orderedSchedules.length > 3 && (
            <div className="mt-2 text-center">
              <Link 
                to="/supplements"
                className="text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
              >
                View {orderedSchedules.length - 3} more schedules
              </Link>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default SupplementDashboard; 