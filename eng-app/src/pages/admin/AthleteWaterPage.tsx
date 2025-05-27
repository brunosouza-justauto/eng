import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { FiDroplet, FiTarget, FiTrendingUp, FiBarChart2, FiCheck, FiX } from 'react-icons/fi';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import WaterGoalSettings from '../../components/admin/WaterGoalSettings';

// Types for water tracking data
interface WaterTrackingEntry {
  id: string;
  user_id: string;
  date: string;
  amount_ml: number;
  created_at: string;
  updated_at: string;
}

// WaterGoal is managed in the water_goals table

interface AthleteData {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

// BarChart component for water data visualization
const WaterBarChart: React.FC<{ 
  data: WaterTrackingEntry[],
  goal: number | null
}> = ({ data, goal }) => {
  // Skip if no data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No water tracking data available
      </div>
    );
  }

  // Make sure all entries have their dates properly formatted
  const processedData = data.map(entry => {
    // Ensure date is in YYYY-MM-DD format
    const dateObj = new Date(entry.date);
    const formattedDate = dateObj.toISOString().split('T')[0];
    
    return {
      ...entry,
      date: formattedDate,
    };
  });
  
  // Sort data by date (ascending)
  const sortedData = [...processedData].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  // Find maximum value for scaling
  const maxAmount = Math.max(
    ...sortedData.map(entry => entry.amount_ml),
    goal || 0,
    // Set a minimum max value to ensure bars are visible even with small values
    1000
  );

  // Calculate chart statistics
  const nonZeroEntries = sortedData.filter(entry => entry.amount_ml > 0);
  const hasEntries = nonZeroEntries.length > 0;

  // No special date handling needed
  
  return (
    <div className="h-64">
      {/* Chart container */}
      <div className="flex h-full relative">
        {/* Goal line that spans across the chart */}
        {goal && goal > 0 && (
          <div 
            className="absolute w-full border-t-2 border-dashed border-red-500 z-10"
            style={{ 
              bottom: `${(goal / maxAmount) * 100}%`,
              display: (goal / maxAmount) * 100 <= 100 ? 'block' : 'none'
            }}
          >
            <span className="absolute right-0 -top-5 text-xs text-red-500 font-medium bg-white dark:bg-gray-800 px-1 rounded">
              {goal / 1000}L
            </span>
          </div>
        )}

        {sortedData.map((entry, index) => {
          // Calculate percentage with a minimum height for better visualization
          const percentage = maxAmount > 0 ? (entry.amount_ml / maxAmount) * 100 : 0;
          const isAboveGoal = goal && entry.amount_ml >= goal;
          const isEmpty = entry.amount_ml === 0;
          
          return (
            <div 
              key={entry.id || index} 
              className="flex flex-col items-center justify-end flex-1 relative"
            >
              {/* The bar */}
              <div className="w-full h-full px-1 flex justify-center">
                <div 
                  className={`w-full h-full relative rounded ${
                    isEmpty ? 'bg-gray-200 rounded dark:bg-gray-700' : 
                    isAboveGoal ? 'bg-green-500 rounded' : 'bg-blue-500 rounded'
                  } ${hasEntries ? 'shadow-md' : ''}`}
                  style={{ 
                    height: `${isEmpty ? 15 : Math.max(percentage, 10)}%`,
                    transition: 'height 0.3s ease-in-out',
                  }}
                />
              </div>
              
              {/* Day label */}
              <div className="text-xs mt-1 font-medium text-gray-600 dark:text-gray-400">
                {format(parseISO(entry.date), 'dd')}
              </div>
              
              {/* Day value */}
              <div className={`text-xs ${isEmpty ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300 font-medium'} -mt-1`}>
                {isEmpty ? '0L' : `${Math.round(entry.amount_ml / 100) / 10}L`}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-end text-xs gap-2">       
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 bg-green-500 mr-1 rounded-sm"></span>
          <span className="text-gray-600 dark:text-gray-400">Above goal</span>
        </div>
        
        <div className="flex items-center">
          <span className="inline-block w-3 h-3 bg-gray-200 dark:bg-gray-700 mr-1 rounded-sm"></span>
          <span className="text-gray-600 dark:text-gray-400">No water</span>
        </div>
        
        {goal && (
          <div className="flex items-center">
            <span className="inline-block w-4 h-0 border-t-2 border-dashed border-red-500 mr-1"></span>
            <span className="text-gray-600 dark:text-gray-400">Goal: {goal / 1000}L</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Month navigation component
const MonthNavigation: React.FC<{
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  timeframe: 'week' | 'month';
}> = ({ currentDate, setCurrentDate, timeframe }) => {
  const handlePrevious = () => {
    if (timeframe === 'week') {
      setCurrentDate(subDays(currentDate, 7));
    } else {
      const prevMonth = new Date(currentDate);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      setCurrentDate(prevMonth);
    }
  };

  const handleNext = () => {
    if (timeframe === 'week') {
      setCurrentDate(subDays(currentDate, -7));
    } else {
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setCurrentDate(nextMonth);
    }
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <Button
        onClick={handlePrevious}
        variant="outline"
        size="sm"
      >
        Previous {timeframe}
      </Button>
      <h3 className="text-lg font-medium">
        {timeframe === 'week' ? 'Last 7 Days' : format(currentDate, 'MMMM yyyy')}
      </h3>
      <Button
        onClick={handleNext}
        variant="outline"
        size="sm"
        disabled={timeframe === 'week' && new Date().getTime() - currentDate.getTime() < 7 * 24 * 60 * 60 * 1000}
      >
        Next {timeframe}
      </Button>
    </div>
  );
};

const AthleteWaterPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [athlete, setAthlete] = useState<AthleteData | null>(null);
  const [waterEntries, setWaterEntries] = useState<WaterTrackingEntry[]>([]);
  const [waterGoal, setWaterGoal] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartTimeframe, setChartTimeframe] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Initial data fetch
  useEffect(() => {
    const fetchAthleteData = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch athlete profile data
        const { data: athleteData, error: athleteError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, user_id')
          .eq('id', id)
          .single();
          
        if (athleteError) throw athleteError;
        setAthlete(athleteData);
        
        // Fetch water data and goal
        await Promise.all([
          fetchWaterEntries(athleteData.user_id),
          fetchWaterGoal(athleteData.user_id)
        ]);
        
      } catch (err) {
        console.error('Error fetching athlete data:', err);
        setError('Failed to load athlete data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAthleteData();
  }, [id]);

  // Fetch water entries based on timeframe
  const fetchWaterEntries = async (userId: string) => {
    try {
      if (!userId) return;
      
      let startDate: Date;
      let endDate = new Date();
      
      if (chartTimeframe === 'week') {
        startDate = subDays(currentDate, 7); // Show last 7 days
      } else { // month
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      }
      
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      // Fetch water data for the selected time period
      const { data, error } = await supabase
        .from('water_tracking')
        .select('*')
        .eq('user_id', userId)
        .gte('date', formattedStartDate)
        .lte('date', formattedEndDate)
        .order('date', { ascending: false });
        
      if (error) throw error;
      
      // Fill in any missing dates with zero water
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });
      const result = allDays.map(day => {
        const formattedDay = format(day, 'yyyy-MM-dd');
        const existingEntry = data?.find(entry => entry.date === formattedDay);
        
        if (existingEntry) {
          return existingEntry;
        }
        
        // Return placeholder entry for days without data
        return {
          id: `placeholder-${formattedDay}`,
          user_id: userId,
          date: formattedDay,
          amount_ml: 0,
          created_at: format(day, 'yyyy-MM-dd\'T\'HH:mm:ss'),
          updated_at: format(day, 'yyyy-MM-dd\'T\'HH:mm:ss')
        };
      });
      
      // Sort by date (newest to oldest)
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setWaterEntries(result);
      
    } catch (err) {
      console.error('Error fetching water entries:', err);
      setError('Failed to load water data');
    }
  };

  // Fetch current water goal
  const fetchWaterGoal = async (userId: string) => {
    try {
      if (!userId) return;
      
      // Fetch water goal from water_goals table
      const { data, error } = await supabase
        .from('water_goals')
        .select('water_goal_ml')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No goal found, use default
          setWaterGoal(2500);
        } else {
          throw error;
        }
      } else {
        setWaterGoal(data.water_goal_ml || 2500);
      }
      
    } catch (err) {
      console.error('Error fetching water goal:', err);
      // This is not a critical error, so just log it
      setWaterGoal(2500);
    }
  };

  // Refresh data when timeframe changes
  useEffect(() => {
    if (athlete?.user_id) {
      fetchWaterEntries(athlete.user_id);
    }
  }, [chartTimeframe, currentDate, athlete?.user_id]);

  // Calculate statistics
  const calculateStats = () => {
    if (!waterEntries || waterEntries.length === 0) {
      return {
        averageWater: 0,
        maxWater: 0,
        daysAboveGoal: 0,
        totalWater: 0
      };
    }
    
    const nonZeroEntries = waterEntries.filter(entry => entry.amount_ml > 0);
    
    const totalWater = nonZeroEntries.reduce((sum, entry) => sum + entry.amount_ml, 0);
    const maxWater = Math.max(...nonZeroEntries.map(entry => entry.amount_ml));
    const averageWater = nonZeroEntries.length > 0 
      ? Math.round(totalWater / nonZeroEntries.length) 
      : 0;
    const daysAboveGoal = waterGoal 
      ? nonZeroEntries.filter(entry => entry.amount_ml >= waterGoal).length 
      : 0;
      
    return {
      averageWater,
      maxWater,
      daysAboveGoal,
      totalWater
    };
  };

  const stats = calculateStats();

  // The WaterGoalSettings component handles goal updates

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <PageHeader title="Error" />
        <Card>
          <div className="p-4 text-red-500">{error}</div>
        </Card>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="p-4">
        <PageHeader title="Athlete Not Found" />
        <Card>
          <div className="p-4">The requested athlete could not be found.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <PageHeader 
        title={`${athlete.first_name} ${athlete.last_name}'s Water Tracking`} 
        subtitle="View water intake history, goals, and progress"
      />

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
          <div className="mb-4 sm:mb-0">
            <Button
              onClick={() => navigate(`/admin/athletes/${id}`)}
              variant="secondary"
              size="sm"
            >
              Back to Athlete Profile
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Water Goal Card */}
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FiTarget className="mr-2 text-blue-500" /> Water Goal
            </h3>
            
            {athlete && (
              <WaterGoalSettings 
                userId={athlete.user_id} 
                defaultValue={waterGoal || 2500}
                onUpdate={(newGoalValue) => {
                  setWaterGoal(newGoalValue);
                  // Refresh data
                  fetchWaterEntries(athlete.user_id);
                }}
              />
            )}
          </div>
        </Card>

        {/* Stats Cards */}
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FiTrendingUp className="mr-2 text-blue-500" /> Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Average Intake</p>
                <p className="text-xl font-bold">{(stats.averageWater / 1000).toFixed(1)}L</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Max Intake</p>
                <p className="text-xl font-bold">{(stats.maxWater / 1000).toFixed(1)}L</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Days Above Goal</p>
                <p className="text-xl font-bold">{stats.daysAboveGoal}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Volume</p>
                <p className="text-xl font-bold">{(stats.totalWater / 1000).toFixed(1)}L</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Time Period Selection */}
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FiDroplet className="mr-2 text-blue-500" /> Time Period
            </h3>
            <div className="flex space-x-4">
              <Button
                variant={chartTimeframe === 'week' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setChartTimeframe('week')}
              >
                Last 7 Days
              </Button>
              <Button
                variant={chartTimeframe === 'month' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setChartTimeframe('month')}
              >
                Monthly
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Water Chart Card */}
      <Card className="mb-6">
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FiBarChart2 className="mr-2 text-blue-500" /> Water Intake History
          </h3>
          <MonthNavigation 
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            timeframe={chartTimeframe}
          />
          <WaterBarChart 
            key={`water-chart-${waterEntries.length}-${waterGoal}-${Date.now()}`}
            data={waterEntries} 
            goal={waterGoal} 
          />
        </div>
      </Card>

      {/* Water Tracking Entries */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FiDroplet className="mr-2 text-blue-500" /> Water Tracking Log
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Water Intake
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Goal
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {waterEntries.filter(entry => {
                  // Only show entries for the selected time period
                  if (chartTimeframe === 'week') {
                    return true; // Already filtered in the fetchWaterEntries function
                  } else {
                    return entry.date.startsWith(format(currentDate, 'yyyy-MM'));
                  }
                }).map(entry => (
                  <tr key={entry.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {format(parseISO(entry.date), 'MMMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {entry.amount_ml > 0 ? `${(entry.amount_ml / 1000).toFixed(1)}L` : 'No data'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {waterGoal ? `${(waterGoal / 1000).toFixed(1)}L` : 'Not set'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {entry.amount_ml === 0 ? (
                        <span className="text-gray-500 dark:text-gray-400">No data</span>
                      ) : waterGoal && entry.amount_ml >= waterGoal ? (
                        <span className="text-green-500 flex items-center">
                          <FiCheck className="mr-1" /> Goal Reached
                        </span>
                      ) : (
                        <span className="text-red-500 flex items-center">
                          <FiX className="mr-1" /> Below Goal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AthleteWaterPage;
