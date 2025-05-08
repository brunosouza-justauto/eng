import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { supabase } from '../../services/supabaseClient';
import Card from '../ui/Card';
import { ButtonLink } from '../ui/Button';
import { format } from 'date-fns'; // For formatting dates

// Define types for the data needed in our component
interface CheckInData {
  id: string;
  check_in_date: string; // Date string
  notes: string | null;
  photos: string[] | null;
  video_url: string | null;
  diet_adherence: string | null;
  training_adherence: string | null;
  steps_adherence: string | null;
  // Expanded metrics
  body_metrics: { 
      weight_kg: number | null;
      body_fat_percentage: number | null;
      waist_cm: number | null;
      hip_cm: number | null;
      arm_cm: number | null;
      chest_cm: number | null;
      thigh_cm: number | null;
  } | null;
  wellness_metrics: { 
      sleep_hours: number | null;
      sleep_quality: number | null;
      stress_level: number | null;
      fatigue_level: number | null;
      motivation_level: number | null;
      digestion: string | null;
  } | null;
}

const LatestCheckInWidget: React.FC = () => {
  const [latestCheckIn, setLatestCheckIn] = useState<CheckInData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const profile = useSelector(selectProfile);

  useEffect(() => {
    const fetchLatestCheckIn = async () => {
      if (!profile || !profile.user_id) {
        console.log("No valid profile found");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log("Fetching latest check-in for user_id:", profile.user_id);
        const { data, error: fetchError } = await supabase
          .from('check_ins')
          .select(`
            id,
            check_in_date,
            notes,
            photos,
            video_url,
            diet_adherence,
            training_adherence,
            steps_adherence,
            body_metrics (
              id,
              weight_kg,
              body_fat_percentage,
              waist_cm,
              hip_cm,
              arm_cm,
              chest_cm,
              thigh_cm
            ), 
            wellness_metrics (
              id,
              sleep_hours,
              sleep_quality,
              stress_level,
              fatigue_level,
              motivation_level,
              digestion
            )
          `)
          .eq('user_id', profile.user_id)
          .order('check_in_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (fetchError) throw fetchError;

        console.log("Fetched latest check-in:", data);
        setLatestCheckIn(data as unknown as CheckInData);

      } catch (err: unknown) {
        console.error("Error fetching latest check-in:", err);
        let message = 'Failed to load check-in data.';
        if (typeof err === 'object' && err !== null && 'message' in err) {
          message = (err as Error).message;
        }
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLatestCheckIn();
  }, [profile]);

  // Helper function to safely display metric values
  const displayMetric = (value: number | null | undefined, unit: string = '') => {
    // Check explicitly for null or undefined, but allow 0 values
    return value !== null && value !== undefined ? `${value}${unit}` : 'N/A';
  };

  // Helper function to get adherence label and color class
  const getAdherenceDetails = (adherence: string | null) => {
    // Map adherence values to appropriate label and color
    switch (adherence) {
      case 'Perfect':
        return { label: 'Perfect', colorClass: 'text-green-400 dark:text-green-400' };
      case 'Good':
        return { label: 'Good', colorClass: 'text-cyan-400 dark:text-cyan-400' };
      case 'Average':
        return { label: 'Average', colorClass: 'text-yellow-400 dark:text-yellow-400' };
      case 'Poor':
        return { label: 'Poor', colorClass: 'text-red-500 dark:text-red-400' };
      case 'Off Track':
        return { label: 'Off Track', colorClass: 'text-red-600 dark:text-red-500' };
      // Keep handling legacy values
      case 'high':
        return { label: 'Good', colorClass: 'text-cyan-400 dark:text-cyan-400' };
      case 'medium':
        return { label: 'Average', colorClass: 'text-yellow-400 dark:text-yellow-400' };
      case 'low':
        return { label: 'Poor', colorClass: 'text-red-500 dark:text-red-400' };
      default:
        return { label: '-', colorClass: 'text-gray-500 dark:text-gray-400' };
    }
  };

  // Create a header for the card
  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400 dark:text-indigo-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
        <h2 className="text-lg font-medium">Latest Check-in</h2>
      </div>
      {latestCheckIn && (
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          {format(new Date(latestCheckIn.check_in_date), 'MMM d, yyyy')}
        </span>
      )}
    </div>
  );

  return (
    <Card
      header={header}
      className="h-full flex flex-col border-0 overflow-hidden"
      variant="default"
    >
      <div className="flex-grow p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-red-500 dark:text-red-400">Error: {error}</p>
          </div>
        ) : !latestCheckIn ? (
          <div className="text-center p-4">
            <p className="text-gray-400 dark:text-gray-400 mb-4">No check-ins found. Start tracking your progress by submitting your first check-in.</p>
            <ButtonLink
              to="/check-in/new"
              variant="primary"
              color="indigo"
              className="w-full"
            >
              Submit First Check-in
            </ButtonLink>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Key metrics from the latest check-in */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-indigo-100 text-indigo-800 dark:bg-gray-700 p-4 rounded-md">
                <h4 className="font-medium text-sm text-indigo-900 dark:text-gray-200 mb-2">Body</h4>
                <div className="space-y-1 text-sm text-indigo-800 dark:text-white">
                  <p><span className="font-medium">Weight:</span> {displayMetric(latestCheckIn.body_metrics?.weight_kg, ' kg')}</p>
                  <p><span className="font-medium">Body Fat:</span> {displayMetric(latestCheckIn.body_metrics?.body_fat_percentage, '%')}</p>
                  <p><span className="font-medium">Waist:</span> {displayMetric(latestCheckIn.body_metrics?.waist_cm, ' cm')}</p>
                  {latestCheckIn.body_metrics?.hip_cm && (
                    <p><span className="font-medium">Hip:</span> {displayMetric(latestCheckIn.body_metrics?.hip_cm, ' cm')}</p>
                  )}
                  {latestCheckIn.body_metrics?.arm_cm && (
                    <p><span className="font-medium">Arm:</span> {displayMetric(latestCheckIn.body_metrics?.arm_cm, ' cm')}</p>
                  )}
                  {latestCheckIn.body_metrics?.chest_cm && (
                    <p><span className="font-medium">Chest:</span> {displayMetric(latestCheckIn.body_metrics?.chest_cm, ' cm')}</p>
                  )}
                  {latestCheckIn.body_metrics?.thigh_cm && (
                    <p><span className="font-medium">Thigh:</span> {displayMetric(latestCheckIn.body_metrics?.thigh_cm, ' cm')}</p>
                  )}
                </div>
              </div>
              <div className="bg-indigo-100 text-indigo-800 dark:bg-gray-700 p-4 rounded-md">
                <h4 className="font-medium text-sm text-indigo-900 dark:text-gray-200 mb-2">Wellness</h4>
                <div className="space-y-1 text-sm text-indigo-800 dark:text-white">
                  <p><span className="font-medium">Sleep:</span> {displayMetric(latestCheckIn.wellness_metrics?.sleep_hours, ' hrs')}</p>
                  {latestCheckIn.wellness_metrics?.sleep_quality && (
                    <p><span className="font-medium">Sleep Quality:</span> {displayMetric(latestCheckIn.wellness_metrics?.sleep_quality, '/5')}</p>
                  )}
                  <p><span className="font-medium">Stress:</span> {displayMetric(latestCheckIn.wellness_metrics?.stress_level, '/5')}</p>
                  {latestCheckIn.wellness_metrics?.fatigue_level && (
                    <p><span className="font-medium">Fatigue:</span> {displayMetric(latestCheckIn.wellness_metrics?.fatigue_level, '/5')}</p>
                  )}
                  <p><span className="font-medium">Motivation:</span> {displayMetric(latestCheckIn.wellness_metrics?.motivation_level, '/5')}</p>
                  {latestCheckIn.wellness_metrics?.digestion && (
                    <p><span className="font-medium">Digestion:</span> {latestCheckIn.wellness_metrics?.digestion}</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Adherence indicators as colored text labels */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center flex flex-col">
                {(() => {
                  const { label, colorClass } = getAdherenceDetails(latestCheckIn.diet_adherence);
                  return (
                    <>
                      <span className={`${colorClass} text-base font-medium`}>{label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">Diet</span>
                    </>
                  );
                })()}
              </div>
              <div className="text-center flex flex-col">
                {(() => {
                  const { label, colorClass } = getAdherenceDetails(latestCheckIn.training_adherence);
                  return (
                    <>
                      <span className={`${colorClass} text-base font-medium`}>{label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">Training</span>
                    </>
                  );
                })()}
              </div>
              <div className="text-center flex flex-col">
                {(() => {
                  const { label, colorClass } = getAdherenceDetails(latestCheckIn.steps_adherence);
                  return (
                    <>
                      <span className={`${colorClass} text-base font-medium`}>{label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">Steps</span>
                    </>
                  );
                })()}
              </div>
            </div>
            
            {/* Notes preview if available */}
            {latestCheckIn.notes && (
              <div className="bg-indigo-100 text-indigo-800 dark:bg-gray-700 p-4 rounded-md">
                <h4 className="font-medium text-sm text-indigo-800 dark:text-gray-300 mb-1">Notes:</h4>
                <p className="text-sm text-indigo-800 dark:text-gray-300 line-clamp-2">{latestCheckIn.notes}</p>
              </div>
            )}
            
            {/* Photo and video indicators removed to match the design */}
            
            <div className="text-center pt-1">
              <ButtonLink
                to="/check-in/history"
                className="w-full py-2 bg-[#5955DD] hover:bg-[#4944c7] text-white font-medium rounded-md"
              >
                See All Check-ins
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default LatestCheckInWidget; 