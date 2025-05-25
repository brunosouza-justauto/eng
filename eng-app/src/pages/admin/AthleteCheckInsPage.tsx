import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { FiClipboard, FiTrendingUp, FiBarChart2, FiImage, FiActivity } from 'react-icons/fi';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { Button } from '../../components/ui/Button';
import AthleteMeasurementsChart from '../../components/admin/AthleteMeasurementsChart';
import { BodyMeasurement } from '../../services/measurementService';

// Types for check-in data
interface CheckInData {
  id: string;
  user_id: string;
  check_in_date: string;
  photos: string[] | null;
  video_url: string | null;
  diet_adherence: string | null;
  training_adherence: string | null;
  steps_adherence: string | null;
  notes: string | null;
  coach_feedback: string | null;
  created_at: string;
  updated_at: string;
  body_metrics: { 
    weight_kg: number | null;
    body_fat_percentage: number | null;
    waist_cm: number | null;
    hip_cm: number | null;
    left_arm_cm: number | null;
    right_arm_cm: number | null;
    chest_cm: number | null;
    left_thigh_cm: number | null;
    right_thigh_cm: number | null;
  } | null;
  wellness_metrics: { 
    sleep_hours: number | null;
    sleep_quality: number | null;
    stress_level: number | null;
    fatigue_level: number | null;
    motivation_level: number | null;
    digestion: string | null;
    menstrual_cycle_notes: string | null;
  } | null;
}

interface AthleteData {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

// Convert check-in data to BodyMeasurement format for the chart component
const checkInsToBodyMeasurements = (checkIns: CheckInData[]): BodyMeasurement[] => {
  return checkIns
    .filter(checkIn => checkIn.body_metrics && 
      (checkIn.body_metrics.weight_kg !== null || checkIn.body_metrics.body_fat_percentage !== null))
    .map(checkIn => {
      const weight = checkIn.body_metrics?.weight_kg || 0;
      const bodyFat = checkIn.body_metrics?.body_fat_percentage || 0;
      
      // Calculate lean and fat mass if both weight and body fat are available
      let leanMass = null;
      let fatMass = null;
      
      if (weight > 0 && bodyFat > 0) {
        fatMass = weight * (bodyFat / 100);
        leanMass = weight - fatMass;
      }
      
      return {
        user_id: checkIn.user_id,
        measurement_date: checkIn.check_in_date,
        weight_kg: weight,
        body_fat_percentage: bodyFat,
        lean_body_mass_kg: leanMass,
        fat_mass_kg: fatMass,
        // Including measurement of specific body parts
        waist_cm: checkIn.body_metrics?.waist_cm || null,
        hip_cm: checkIn.body_metrics?.hip_cm || null,
        chest_cm: checkIn.body_metrics?.chest_cm || null,
        left_arm_cm: checkIn.body_metrics?.left_arm_cm || null,
        right_arm_cm: checkIn.body_metrics?.right_arm_cm || null,
        left_thigh_cm: checkIn.body_metrics?.left_thigh_cm || null,
        right_thigh_cm: checkIn.body_metrics?.right_thigh_cm || null
      } as BodyMeasurement;
    });
};

// Component for month navigation
const PeriodNavigation: React.FC<{ 
  currentDate: Date, 
  setCurrentDate: (date: Date) => void,
  timeframe: 'week' | 'month' | 'year' | 'all'
}> = ({ currentDate, setCurrentDate, timeframe }) => {
  // Only show this when in month or year view (not for week or all time)
  if (timeframe === 'week' || timeframe === 'all') return null;
  
  const handlePrev = () => {
    const prevDate = new Date(currentDate);
    if (timeframe === 'month') {
      prevDate.setMonth(prevDate.getMonth() - 1);
    } else if (timeframe === 'year') {
      prevDate.setFullYear(prevDate.getFullYear() - 1);
    }
    setCurrentDate(prevDate);
  };
  
  const handleNext = () => {
    const nextDate = new Date(currentDate);
    if (timeframe === 'month') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (timeframe === 'year') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
    setCurrentDate(nextDate);
  };
  
  const periodLabel = timeframe === 'month' 
    ? format(currentDate, 'MMMM yyyy')
    : format(currentDate, 'yyyy');
  
  const buttonLabel = timeframe === 'month' ? 'Month' : 'Year';
  
  return (
    <div className="flex items-center mt-4 space-x-2">
      <Button variant="secondary" size="sm" onClick={handlePrev}>
        Previous {buttonLabel}
      </Button>
      <span className="px-2 text-sm font-medium">
        {periodLabel}
      </span>
      <Button variant="secondary" size="sm" onClick={handleNext}>
        Next {buttonLabel}
      </Button>
    </div>
  );
};

// Component for displaying a single measurement with comparison
const MeasurementBar: React.FC<{
  label: string;
  value: number;
  unit: string;
  prevValue: number | null;
}> = ({ label, value, unit, prevValue }) => {
  // Calculate change and determine color
  const change = prevValue !== null ? value - prevValue : null;
  const changeText = change !== null 
    ? `${change > 0 ? '+' : ''}${change.toFixed(1)} ${unit}` 
    : '';
  const changeColor = change === null 
    ? '' 
    : change < 0 
      ? 'text-green-500' 
      : change > 0 
        ? 'text-red-500' 
        : 'text-gray-500';
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center">
          <span className="text-sm">{value} {unit}</span>
          {change !== null && (
            <span className={`ml-2 text-xs ${changeColor}`}>{changeText}</span>
          )}
        </div>
      </div>
      
      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
        <div 
          className="absolute h-full bg-indigo-500 rounded-full"
          style={{ width: '100%', maxWidth: `${Math.min(100, value / 2)}%` }}
        ></div>
        {prevValue !== null && (
          <div 
            className="absolute w-1 h-4 -mt-1 bg-gray-500"
            style={{ left: `${Math.min(100, prevValue / 2)}%` }}
            title={`Previous: ${prevValue} ${unit}`}
          ></div>
        )}
      </div>
    </div>
  );
};

const AthleteCheckInsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [athlete, setAthlete] = useState<AthleteData | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartTimeframe, setChartTimeframe] = useState<'week' | 'month' | 'year' | 'all'>('week');
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
        
        // Fetch check-in data
        await fetchCheckIns();
        
      } catch (err) {
        console.error('Error fetching athlete data:', err);
        setError('Failed to load athlete data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAthleteData();
  }, [id]);

  // Fetch check-ins based on timeframe
  const fetchCheckIns = async () => {
    try {
      if (!athlete?.user_id) return;
      
      let query = supabase
        .from('check_ins')
        .select(`
          id,
          user_id,
          check_in_date,
          photos,
          video_url,
          diet_adherence,
          training_adherence,
          steps_adherence,
          notes,
          coach_feedback,
          created_at,
          updated_at,
          body_metrics:body_metrics(
            weight_kg, 
            body_fat_percentage,
            waist_cm,
            hip_cm,
            left_arm_cm,
            right_arm_cm,
            chest_cm,
            left_thigh_cm,
            right_thigh_cm
          ),
          wellness_metrics:wellness_metrics(
            sleep_hours,
            sleep_quality,
            stress_level,
            fatigue_level,
            motivation_level,
            digestion,
            menstrual_cycle_notes
          )
        `)
        .eq('user_id', athlete.user_id)
        .order('check_in_date', { ascending: false });
      
      // Only apply date filters if not viewing all time
      if (chartTimeframe !== 'all') {
        let startDate: Date;
        let endDate = new Date();
        
        if (chartTimeframe === 'week') {
          startDate = subDays(currentDate, 30); // Show last 30 days for check-ins
        } else if (chartTimeframe === 'month') {
          startDate = startOfMonth(currentDate);
          endDate = endOfMonth(currentDate);
        } else { // year
          startDate = new Date(currentDate.getFullYear(), 0, 1); // Jan 1 of current year
          endDate = new Date(currentDate.getFullYear(), 11, 31); // Dec 31 of current year
        }
        
        const formattedStartDate = format(startDate, 'yyyy-MM-dd');
        const formattedEndDate = format(endDate, 'yyyy-MM-dd');
        
        query = query
          .gte('check_in_date', formattedStartDate)
          .lte('check_in_date', formattedEndDate);
      }
      
      const { data, error } = await query;

      console.log("Check-in data:", data);
        
      if (error) throw error;
      
      if (data) {
        // Transform the data to match our interface
        const transformedData = data.map(checkIn => {
          return {
            ...checkIn,
            body_metrics: Array.isArray(checkIn.body_metrics) && checkIn.body_metrics.length > 0 
              ? checkIn.body_metrics[0] 
              : checkIn.body_metrics || null,
            wellness_metrics: Array.isArray(checkIn.wellness_metrics) && checkIn.wellness_metrics.length > 0 
              ? checkIn.wellness_metrics[0] 
              : checkIn.wellness_metrics || null
          };
        }) as CheckInData[];

        console.log("Transformed check-in data:", transformedData);
        
        setCheckIns(transformedData);
      }
      
    } catch (err) {
      console.error('Error fetching check-ins:', err);
      setError('Failed to load check-in data');
    }
  };

  // Refresh data when timeframe changes
  useEffect(() => {
    if (athlete?.user_id) {
      fetchCheckIns();
    }
  }, [chartTimeframe, currentDate, athlete?.user_id]);

  // Calculate statistics
  const calculateStats = () => {
    if (!checkIns || checkIns.length === 0) {
      return {
        totalCheckIns: 0,
        averageWeight: 0,
        weightChange: 0,
        bodyFatChange: 0
      };
    }

    console.log("Check-ins:", checkIns);
    
    // Get check-ins with weight data
    const checkInsWithWeight = checkIns.filter(
      checkIn => checkIn.body_metrics && checkIn.body_metrics.weight_kg !== null
    );

    console.log("Check-ins with weight data:", checkInsWithWeight);
    
    // Get check-ins with body fat data
    const checkInsWithBodyFat = checkIns.filter(
      checkIn => checkIn.body_metrics && checkIn.body_metrics.body_fat_percentage !== null
    );

    console.log("Check-ins with body fat data:", checkInsWithBodyFat);
    
    // Calculate average weight
    const totalWeight = checkInsWithWeight.reduce(
      (sum, checkIn) => sum + (checkIn.body_metrics!.weight_kg || 0), 
      0
    );
    const averageWeight = checkInsWithWeight.length > 0 
      ? totalWeight / checkInsWithWeight.length 
      : 0;
    
    // Calculate weight change (first check-in vs. last check-in)
    let weightChange = 0;
    if (checkInsWithWeight.length >= 2) {
      const firstWeight = checkInsWithWeight[checkInsWithWeight.length - 1].body_metrics!.weight_kg || 0;
      const lastWeight = checkInsWithWeight[0].body_metrics!.weight_kg || 0;
      weightChange = lastWeight - firstWeight;
    }
    
    // Calculate body fat change
    let bodyFatChange = 0;
    if (checkInsWithBodyFat.length >= 2) {
      const firstBodyFat = checkInsWithBodyFat[checkInsWithBodyFat.length - 1].body_metrics!.body_fat_percentage || 0;
      const lastBodyFat = checkInsWithBodyFat[0].body_metrics!.body_fat_percentage || 0;
      bodyFatChange = lastBodyFat - firstBodyFat;
    }
    
    return {
      totalCheckIns: checkIns.length,
      averageWeight: averageWeight,
      weightChange: weightChange,
      bodyFatChange: bodyFatChange
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

  // Reverse order for charts (oldest to newest)
  const sortedForCharts = [...checkIns].reverse();

  return (
    <div className="p-4">
      <PageHeader 
        title={`${athlete.first_name} ${athlete.last_name}'s Check-in History`} 
        subtitle="View check-in history, body measurements, and progress"
      />
      
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
          <div className="mb-4 sm:mb-0">
            <Button
              onClick={() => navigate(`/admin/athletes/${id}`)}
              variant="secondary"
              className="mr-2"
            >
              Back to Athlete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 mb-6">
        {/* Stats Card */}
        <Card>
          <div className="p-4">
            <h2 className="mb-4 text-xl font-semibold">Statistics</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4 sm:grid-cols-4">
              <div className="p-4 border rounded-lg border-gray-700">
                <div className="flex items-center mb-2">
                  <FiClipboard className="mr-2 text-indigo-500" />
                  <span className="text-sm text-gray-500">Total Check-ins</span>
                </div>
                <div className="text-xl font-bold">{stats.totalCheckIns}</div>
              </div>
              
              <div className="p-4 border rounded-lg border-gray-700">
                <div className="flex items-center mb-2">
                  <FiBarChart2 className="mr-2 text-green-500" />
                  <span className="text-sm text-gray-500">Avg Weight</span>
                </div>
                <div className="text-xl font-bold">{stats.averageWeight.toFixed(1)} kg</div>
              </div>
              
              <div className="p-4 border rounded-lg border-gray-700">
                <div className="flex items-center mb-2">
                  <FiTrendingUp className="mr-2 text-yellow-500" />
                  <span className="text-sm text-gray-500">Weight Change</span>
                </div>
                <div className="text-xl font-bold">
                  {stats.weightChange > 0 ? '+' : ''}{stats.weightChange.toFixed(1)} kg
                </div>
              </div>
              
              <div className="p-4 border rounded-lg border-gray-700">
                <div className="flex items-center mb-2">
                  <FiActivity className="mr-2 text-purple-500" />
                  <span className="text-sm text-gray-500">Body Fat Change</span>
                </div>
                <div className="text-xl font-bold">
                  {stats.bodyFatChange > 0 ? '+' : ''}{stats.bodyFatChange.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Combined Weight and Body Fat Chart Card */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Body Composition Trends</h2>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant={chartTimeframe === 'week' ? 'primary' : 'secondary'} 
                  size="sm"
                  onClick={() => setChartTimeframe('week')}
                >
                  Past 30 Days
                </Button>
                <Button 
                  variant={chartTimeframe === 'month' ? 'primary' : 'secondary'} 
                  size="sm"
                  onClick={() => setChartTimeframe('month')}
                >
                  Month View
                </Button>
                <Button 
                  variant={chartTimeframe === 'year' ? 'primary' : 'secondary'} 
                  size="sm"
                  onClick={() => setChartTimeframe('year')}
                >
                  Year View
                </Button>
                <Button 
                  variant={chartTimeframe === 'all' ? 'primary' : 'secondary'} 
                  size="sm"
                  onClick={() => setChartTimeframe('all')}
                >
                  All Time
                </Button>
              </div>
            </div>
            
            {checkIns.length > 1 ? (
              <div className="h-[400px]">
                <AthleteMeasurementsChart 
                  measurements={checkInsToBodyMeasurements(sortedForCharts)}
                  className="h-full"
                  hideTitle={true}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                At least two measurements are needed to display a chart.
              </div>
            )}

            {/* Update to use PeriodNavigation instead of MonthNavigation */}
            <PeriodNavigation 
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              timeframe={chartTimeframe}
            />
          </div>
        </Card>
        
        {/* Body Metrics Chart Card */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Body Measurements Trend</h2>
            </div>
            
            {checkIns.length === 0 ? (
              <div className="text-center p-6 text-gray-500">
                No check-ins found for this athlete.
              </div>
            ) : checkIns.length > 0 && checkIns[0].body_metrics ? (
              <div className="space-y-4">
                {/* Waist */}
                {checkIns[0].body_metrics.waist_cm !== null && (
                  <MeasurementBar 
                    label="Waist" 
                    value={checkIns[0].body_metrics.waist_cm!} 
                    unit="cm"
                    prevValue={checkIns.length > 1 && checkIns[1].body_metrics ? checkIns[1].body_metrics.waist_cm : null}
                  />
                )}
                
                {/* Hip */}
                {checkIns[0].body_metrics.hip_cm !== null && (
                  <MeasurementBar 
                    label="Hip" 
                    value={checkIns[0].body_metrics.hip_cm!} 
                    unit="cm"
                    prevValue={checkIns.length > 1 && checkIns[1].body_metrics ? checkIns[1].body_metrics.hip_cm : null}
                  />
                )}
                
                {/* Chest */}
                {checkIns[0].body_metrics.chest_cm !== null && (
                  <MeasurementBar 
                    label="Chest" 
                    value={checkIns[0].body_metrics.chest_cm!} 
                    unit="cm"
                    prevValue={checkIns.length > 1 && checkIns[1].body_metrics ? checkIns[1].body_metrics.chest_cm : null}
                  />
                )}
                
                {/* Left Arm */}
                {checkIns[0].body_metrics.left_arm_cm !== null && (
                  <MeasurementBar 
                    label="Left Arm" 
                    value={checkIns[0].body_metrics.left_arm_cm!} 
                    unit="cm"
                    prevValue={checkIns.length > 1 && checkIns[1].body_metrics ? checkIns[1].body_metrics.left_arm_cm : null}
                  />
                )}
                
                {/* Right Arm */}
                {checkIns[0].body_metrics.right_arm_cm !== null && (
                  <MeasurementBar 
                    label="Right Arm" 
                    value={checkIns[0].body_metrics.right_arm_cm!} 
                    unit="cm"
                    prevValue={checkIns.length > 1 && checkIns[1].body_metrics ? checkIns[1].body_metrics.right_arm_cm : null}
                  />
                )}
                
                {/* Left Thigh */}
                {checkIns[0].body_metrics.left_thigh_cm !== null && (
                  <MeasurementBar 
                    label="Left Thigh" 
                    value={checkIns[0].body_metrics.left_thigh_cm!} 
                    unit="cm"
                    prevValue={checkIns.length > 1 && checkIns[1].body_metrics ? checkIns[1].body_metrics.left_thigh_cm : null}
                  />
                )}
                
                {/* Right Thigh */}
                {checkIns[0].body_metrics.right_thigh_cm !== null && (
                  <MeasurementBar 
                    label="Right Thigh" 
                    value={checkIns[0].body_metrics.right_thigh_cm!} 
                    unit="cm"
                    prevValue={checkIns.length > 1 && checkIns[1].body_metrics ? checkIns[1].body_metrics.right_thigh_cm : null}
                  />
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 p-4">
                No measurement data available
              </div>
            )}
          </div>
        </Card>
        
        {/* Detailed history table */}
        <Card>
          <div className="p-4">
            <h2 className="mb-4 text-xl font-semibold">Check-in History</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Date</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Weight</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Body Fat %</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Media</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Diet</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Training</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {checkIns.map((checkIn) => (
                    <tr key={checkIn.id}>
                      <td className="px-2 py-2 text-sm">
                        {format(parseISO(checkIn.check_in_date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-2 py-2 text-sm">
                        {checkIn.body_metrics?.weight_kg 
                          ? `${checkIn.body_metrics.weight_kg} kg` 
                          : 'Not recorded'}
                      </td>
                      <td className="px-2 py-2 text-sm">
                        {checkIn.body_metrics?.body_fat_percentage 
                          ? `${checkIn.body_metrics.body_fat_percentage}%` 
                          : 'Not recorded'}
                      </td>
                      <td className="px-2 py-2 text-sm">
                        {(checkIn.photos && checkIn.photos.length > 0) || checkIn.video_url ? (
                          <span className="text-green-500 inline-flex items-center">
                            <FiImage className="mr-1" /> Yes
                          </span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-sm">
                        {checkIn.diet_adherence || 'N/A'}
                      </td>
                      <td className="px-2 py-2 text-sm">
                        {checkIn.training_adherence || 'N/A'}
                      </td>
                      <td className="px-2 py-2 text-sm">
                        <button
                          onClick={() => window.location.href = `/admin/checkins/${checkIn.id}`}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AthleteCheckInsPage; 