import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { FiActivity, FiTarget, FiTrendingUp, FiBarChart2, FiCheck, FiX } from 'react-icons/fi';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import { C } from 'vitest/dist/chunks/reporters.d.79o4mouw.js';

// Types for step data
interface StepEntry {
  id: string;
  user_id: string;
  date: string;
  step_count: number;
  created_at: string;
  updated_at: string;
}

interface StepGoal {
  id: string;
  user_id: string;
  daily_steps: number;
  assigned_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AthleteData {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

// BarChart component for step data visualization
const StepBarChart: React.FC<{ 
  data: StepEntry[],
  goal: number | null
}> = ({ data, goal }) => {
  // Skip if no data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No step data available
      </div>
    );
  }

  // Find the max step count for scaling
  const maxSteps = Math.max(...data.map(entry => entry.step_count), goal || 0);
  const chartHeight = 200; // pixels
  
  return (
    <div className="pt-4">
      {/* Goal line */}
      {goal && (
        <div 
          className="relative w-full border-t border-dashed border-indigo-500"
          style={{ 
            top: `${chartHeight - (goal / maxSteps) * chartHeight}px`,
            marginBottom: '8px'
          }}
        >
          <span className="absolute right-0 px-1 text-xs text-indigo-600 transform -translate-y-full bg-gray-100 dark:bg-gray-800 dark:text-indigo-400">
            Goal: {goal.toLocaleString()} steps
          </span>
        </div>
      )}
      
      <div className="flex items-end h-64 mt-8 space-x-2 overflow-x-auto">
        {data.map((entry) => (
          <div key={entry.id} className="flex flex-col items-center">
            <div 
              className={`w-12 ${entry.step_count >= (goal || 0) ? 'bg-green-500' : 'bg-indigo-500'} rounded-t`}
              style={{ 
                height: `${(entry.step_count / maxSteps) * chartHeight}px`,
                minHeight: '1px'
              }}
              title={`${entry.step_count.toLocaleString()} steps`}
            ></div>
            <div className="mt-2 text-xs text-gray-600 whitespace-nowrap dark:text-gray-400">
              {format(parseISO(entry.date), 'MMM dd')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Add a MonthNavigation component to use setCurrentDate
const MonthNavigation: React.FC<{ 
  currentDate: Date, 
  setCurrentDate: (date: Date) => void,
  timeframe: 'week' | 'month'
}> = ({ currentDate, setCurrentDate, timeframe }) => {
  // Only show this when in month view
  if (timeframe !== 'month') return null;
  
  const handlePrevMonth = () => {
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentDate(prevMonth);
  };
  
  const handleNextMonth = () => {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentDate(nextMonth);
  };
  
  return (
    <div className="flex items-center mt-4 space-x-2">
      <Button variant="secondary" size="sm" onClick={handlePrevMonth}>
        Previous Month
      </Button>
      <span className="px-2 text-sm font-medium">
        {format(currentDate, 'MMMM yyyy')}
      </span>
      <Button variant="secondary" size="sm" onClick={handleNextMonth}>
        Next Month
      </Button>
    </div>
  );
};

const AthleteStepsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  const [athlete, setAthlete] = useState<AthleteData | null>(null);
  const [stepEntries, setStepEntries] = useState<StepEntry[]>([]);
  const [stepGoal, setStepGoal] = useState<StepGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartTimeframe, setChartTimeframe] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Fetch athlete data
  useEffect(() => {
    const fetchAthleteData = async () => {
      try {
        if (!id) return;
        
        // Fetch athlete data
        const { data: athleteData, error: athleteError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, user_id')
          .eq('id', id)
          .single();
          
        if (athleteError) throw athleteError;
        setAthlete(athleteData);
        
        // Fetch step data and goal
        await Promise.all([
          fetchStepEntries(),
          fetchStepGoal()
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

  // Fetch step entries based on timeframe
  const fetchStepEntries = async () => {
    try {
      console.log('athlete', athlete);
      if (!athlete?.id) return;
      
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
      
      // Fetch step data for the selected time period
      const { data, error } = await supabase
        .from('step_entries')
        .select('*')
        .eq('user_id', athlete?.user_id)
        .gte('date', formattedStartDate)
        .lte('date', formattedEndDate)
        .order('date', { ascending: false });

      console.log('formattedStartDate', formattedStartDate);
      console.log('formattedEndDate', formattedEndDate);
      console.log('id', id);
      console.log('athlete?.user_id', athlete?.user_id);

      console.log('step data', data);
        
      if (error) throw error;
      
      // Fill in any missing dates with zero steps
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
          user_id: id,
          date: formattedDay,
          step_count: 0,
          created_at: format(day, 'yyyy-MM-dd\'T\'HH:mm:ss'),
          updated_at: format(day, 'yyyy-MM-dd\'T\'HH:mm:ss')
        };
      });
      
      // Sort by date (newest to oldest)
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setStepEntries(result);
      
    } catch (err) {
      console.error('Error fetching step entries:', err);
      setError('Failed to load step data');
    }
  };

  // Fetch current step goal
  const fetchStepGoal = async () => {
    try {
      if (!id) return;
      
      // Fetch active step goal
      const { data, error } = await supabase
        .from('step_goals')
        .select('*')
        .eq('user_id', id)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (error) throw error;
      
      setStepGoal(data);
      
    } catch (err) {
      console.error('Error fetching step goal:', err);
      // This is not a critical error, so just log it
    }
  };

  // Refresh data when timeframe changes
  useEffect(() => {
    if (athlete?.id) {
      fetchStepEntries();
    }
  }, [chartTimeframe, currentDate, athlete?.id]);

  // Calculate statistics
  const calculateStats = () => {
    if (!stepEntries || stepEntries.length === 0) {
      return {
        averageSteps: 0,
        maxSteps: 0,
        daysAboveGoal: 0,
        totalSteps: 0
      };
    }
    
    const nonZeroEntries = stepEntries.filter(entry => entry.step_count > 0);
    
    const totalSteps = nonZeroEntries.reduce((sum, entry) => sum + entry.step_count, 0);
    const maxSteps = Math.max(...nonZeroEntries.map(entry => entry.step_count));
    const averageSteps = nonZeroEntries.length > 0 
      ? Math.round(totalSteps / nonZeroEntries.length) 
      : 0;
    const daysAboveGoal = stepGoal 
      ? nonZeroEntries.filter(entry => entry.step_count >= stepGoal.daily_steps).length 
      : 0;
      
    return {
      averageSteps,
      maxSteps,
      daysAboveGoal,
      totalSteps
    };
  };

  const stats = calculateStats();

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
        title={`${athlete.first_name} ${athlete.last_name}'s Step Data`} 
        subtitle="View step history, goals, and progress"
      />
      
      <div className="grid gap-4 mb-6">
        {/* Step Goal Card */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Step Goal</h2>
              {/* Add a button to set step goal here if needed */}
            </div>
            
            <div className="p-4 mb-4 border rounded-lg border-gray-700">
              <div className="flex items-center mb-4">
                <FiTarget className="mr-2 text-indigo-500" size={24} />
                <span className="text-2xl font-bold">
                  {stepGoal ? stepGoal.daily_steps.toLocaleString() : 'Not set'}
                </span>
                <span className="ml-2 text-gray-500">steps / day</span>
              </div>
              
              {stepGoal && (
                <div className="text-sm text-gray-500">
                  Goal set on {format(parseISO(stepGoal.assigned_at), 'MMMM d, yyyy')}
                </div>
              )}
            </div>
          </div>
        </Card>
        
        {/* Stats Card */}
        <Card>
          <div className="p-4">
            <h2 className="mb-4 text-xl font-semibold">Statistics</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4 sm:grid-cols-4">
              <div className="p-4 border rounded-lg border-gray-700">
                <div className="flex items-center mb-2">
                  <FiActivity className="mr-2 text-indigo-500" />
                  <span className="text-sm text-gray-500">Average Steps</span>
                </div>
                <div className="text-xl font-bold">{stats.averageSteps.toLocaleString()}</div>
              </div>
              
              <div className="p-4 border rounded-lg border-gray-700">
                <div className="flex items-center mb-2">
                  <FiTrendingUp className="mr-2 text-green-500" />
                  <span className="text-sm text-gray-500">Max Steps</span>
                </div>
                <div className="text-xl font-bold">{stats.maxSteps.toLocaleString()}</div>
              </div>
              
              <div className="p-4 border rounded-lg border-gray-700">
                <div className="flex items-center mb-2">
                  <FiTarget className="mr-2 text-yellow-500" />
                  <span className="text-sm text-gray-500">Days Above Goal</span>
                </div>
                <div className="text-xl font-bold">{stats.daysAboveGoal}</div>
              </div>
              
              <div className="p-4 border rounded-lg border-gray-700">
                <div className="flex items-center mb-2">
                  <FiBarChart2 className="mr-2 text-purple-500" />
                  <span className="text-sm text-gray-500">Total Steps</span>
                </div>
                <div className="text-xl font-bold">{stats.totalSteps.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Chart Card */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Step History</h2>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant={chartTimeframe === 'week' ? 'primary' : 'secondary'} 
                  size="sm"
                  onClick={() => setChartTimeframe('week')}
                >
                  Past 7 Days
                </Button>
                <Button 
                  variant={chartTimeframe === 'month' ? 'primary' : 'secondary'} 
                  size="sm"
                  onClick={() => setChartTimeframe('month')}
                >
                  Month View
                </Button>
              </div>
            </div>
            
            <StepBarChart 
              data={stepEntries}
              goal={stepGoal?.daily_steps || null}
            />

            {/* Month navigation controls */}
            <MonthNavigation 
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              timeframe={chartTimeframe}
            />
          </div>
        </Card>
        
        {/* Detailed history table */}
        <Card>
          <div className="p-4">
            <h2 className="mb-4 text-xl font-semibold">Step Log</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Date</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Steps</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">% of Goal</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {stepEntries.map((entry) => {
                    const goalPercentage = stepGoal 
                      ? Math.round((entry.step_count / stepGoal.daily_steps) * 100) 
                      : 0;
                    
                    const goalMet = stepGoal && entry.step_count >= stepGoal.daily_steps;
                    
                    return (
                      <tr key={entry.id}>
                        <td className="px-2 py-2 text-sm">
                          {format(parseISO(entry.date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-2 py-2 text-sm">
                          {entry.step_count.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-sm">
                          {stepGoal ? `${goalPercentage}%` : '-'}
                        </td>
                        <td className="px-2 py-2">
                          {entry.step_count > 0 ? (
                            <span className={`inline-flex items-center ${goalMet ? 'text-green-500' : 'text-yellow-500'}`}>
                              {goalMet 
                                ? <><FiCheck className="mr-1" /> Goal Met</> 
                                : <><FiX className="mr-1" /> Below Goal</>}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-gray-400">
                              <FiX className="mr-1" /> No Data
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AthleteStepsPage; 