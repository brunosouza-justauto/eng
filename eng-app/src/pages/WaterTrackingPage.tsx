import React, { useState } from 'react';
import WaterTrackingCard from '../components/water/WaterTrackingCard';
import WaterTrackingHistory from '../components/water/WaterTrackingHistory';
import PageHeader from '../components/ui/PageHeader';

const WaterTrackingPage: React.FC<{ userId: string }> = ({ userId }) => { 
  // Add a refresh key state to trigger refreshes in child components
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Function to handle water updates and trigger a refresh
  const handleWaterUpdated = () => {
    // Increment the refresh key to trigger a re-render of the history component
    setRefreshKey(prevKey => prevKey + 1);
  };

  return (
    <div className="container mx-auto pb-20">
      <PageHeader title="Water Tracking" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <WaterTrackingCard 
          userId={userId} 
          onWaterUpdated={handleWaterUpdated} 
        />
        <WaterTrackingHistory 
          userId={userId} 
          refreshKey={refreshKey} 
        />
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Why Track Water?</h3>
        <div className="space-y-2 text-gray-700 dark:text-gray-300">
          <p>
            Proper hydration is essential for optimal athletic performance and recovery.
            Water helps regulate body temperature, transport nutrients, and remove waste.
          </p>
          <p>
            Even mild dehydration can impact your performance, focus, and energy levels. 
            Tracking your water intake helps ensure you're getting enough fluids throughout the day.
          </p>
        </div>
        
        <h4 className="text-md font-semibold mt-4 mb-2">Benefits of Proper Hydration:</h4>
        <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
          <li>Improved workout performance</li>
          <li>Better recovery between training sessions</li>
          <li>Enhanced nutrient delivery to muscles</li>
          <li>Improved cognitive function and focus</li>
          <li>Better joint lubrication and reduced injury risk</li>
        </ul>
      </div>
      
    </div>
  );
};

export default WaterTrackingPage;
