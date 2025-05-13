import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { supabase } from '../../services/supabaseClient';
import Card from '../ui/Card';
import { ButtonLink } from '../ui/Button';
import { format, startOfWeek, endOfWeek, addWeeks, parseISO } from 'date-fns';

const CheckInReminderWidget: React.FC = () => {
  const [hasWeeklyCheckIn, setHasWeeklyCheckIn] = useState<boolean>(false);
  const [lastCheckInDate, setLastCheckInDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const profile = useSelector(selectProfile);

  // Memoize the date calculations to prevent re-renders
  const { currentWeekStart, currentWeekEnd } = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return { currentWeekStart: start, currentWeekEnd: end };
  }, []); // Empty dependency array means this runs only once
  
  // Calculate the next check-in date (add 1 week to the last check-in date)
  const getNextCheckInDate = (): Date => {
    const today = new Date();
    
    if (lastCheckInDate) {
      // If there's a previous check-in, calculate next date based on that
      const lastDate = parseISO(lastCheckInDate);
      
      // If we already submitted for this week, next check-in is next week
      if (hasWeeklyCheckIn) {
        return addWeeks(lastDate, 1);
      }
    }
    
    // If we don't have a last check-in date or it wasn't in this week,
    // the next check-in is today
    return today;
  };

  useEffect(() => {
    const fetchCheckIns = async () => {
      if (!profile || !profile.user_id) {
        console.log("No valid profile found");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log("Checking for weekly check-ins for user_id:", profile.user_id);
        
        // Get the most recent check-in
        const { data: recentData, error: recentError } = await supabase
          .from('check_ins')
          .select('check_in_date')
          .eq('user_id', profile.user_id)
          .order('check_in_date', { ascending: false })
          .limit(1);
        
        if (recentError) throw recentError;
        
        // Get check-ins for the current week
        const { data: weeklyData, error: weeklyError } = await supabase
          .from('check_ins')
          .select('id, check_in_date')
          .eq('user_id', profile.user_id)
          .gte('check_in_date', currentWeekStart.toISOString())
          .lte('check_in_date', currentWeekEnd.toISOString());
        
        if (weeklyError) throw weeklyError;
        
        // Set the check-in status
        const hasCheckInThisWeek = weeklyData && weeklyData.length > 0;
        setHasWeeklyCheckIn(hasCheckInThisWeek);
        
        // Set the most recent check-in date if available
        if (recentData && recentData.length > 0) {
          setLastCheckInDate(recentData[0].check_in_date);
        }

      } catch (err: unknown) {
        console.error("Error checking weekly check-in status:", err);
        let message = 'Failed to check weekly check-in status.';
        if (typeof err === 'object' && err !== null && 'message' in err) {
          message = (err as Error).message;
        }
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCheckIns();
  }, [profile]); // Remove currentWeekStart and currentWeekEnd from dependencies

  // Get the day name for display
  const getNextCheckInDayDisplay = (): string => {
    const nextDate = getNextCheckInDate();
    return format(nextDate, 'EEEE');
  };

  // Format the next check-in date for display
  const getNextCheckInDateDisplay = (): string => {
    const nextDate = getNextCheckInDate();
    return format(nextDate, 'MMMM d, yyyy');
  };

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
        <h2 className="text-lg font-medium">Weekly Check-in</h2>
      </div>
      {hasWeeklyCheckIn && (
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          Completed
        </span>
      )}
      {!hasWeeklyCheckIn && (
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
          Due
        </span>
      )}
    </div>
  );

  return (
    <Card
      header={header}
      className="h-full flex flex-col"
      variant="default"
    >
      <div className="flex-grow space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-red-500 dark:text-red-400">Error: {error}</p>
          </div>
        ) : (
          <div className="text-center py-4">
            {hasWeeklyCheckIn ? (
              <div id="check-in-complete">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Weekly Check-in Complete!
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  You've submitted your check-in for this week.
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  Next check-in will be available on {getNextCheckInDayDisplay()}, {getNextCheckInDateDisplay()}.
                </p>
                <ButtonLink
                  to="/history"
                  variant="secondary"
                  color="indigo"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  }
                >
                  View Check-in History
                </ButtonLink>
              </div>
            ) : (
              <div id="check-in-due">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Weekly Check-in Due
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Track your progress by submitting your check-in this week.
                </p>
                <ButtonLink
                  to="/check-in/new"
                  variant="primary"
                  color="indigo"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                >
                  Submit Check-in
                </ButtonLink>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default CheckInReminderWidget; 