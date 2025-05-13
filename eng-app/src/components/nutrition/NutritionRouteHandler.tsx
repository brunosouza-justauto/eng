import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';
import { getUserNutritionPlan } from '../../services/nutritionPlanService';

/**
 * Component that redirects to the user's current nutrition plan or to the
 * nutrition plans page if they don't have one assigned.
 */
const NutritionRouteHandler: React.FC = () => {
  const profile = useSelector(selectProfile);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNutritionPlan = async () => {
      if (!profile?.id) {
        setRedirectUrl('/dashboard');
        setIsLoading(false);
        return;
      }

      try {
        const result = await getUserNutritionPlan(profile.id);
        
        if (result.nutritionPlan?.id) {
          // If user has a nutrition plan, redirect to it (with fragment for scrolling)
          setRedirectUrl(`/meal-plan/${result.nutritionPlan.id}`);
        } else {
          // Otherwise redirect to the nutrition plans page
          setRedirectUrl('/nutrition-plans');
        }
      } catch (error) {
        console.error('Error fetching nutrition plan:', error);
        setRedirectUrl('/nutrition-plans');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNutritionPlan();
  }, [profile?.id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return <Navigate to={redirectUrl || '/dashboard'} replace />;
};

export default NutritionRouteHandler; 