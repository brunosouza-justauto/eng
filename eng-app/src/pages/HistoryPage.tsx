import React from 'react';
import CheckInTimeline from '../components/history/CheckInTimeline'; // Import Timeline
// import ProgressCharts from '../components/history/ProgressCharts'; // Create this later

const HistoryPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Check-in History & Progress</h1>
      
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <p className="text-gray-600 dark:text-gray-400">
          Track your progress over time with a comprehensive history of all your check-ins. 
          Your data is displayed in an easy-to-read timeline format to help visualize your fitness journey.
        </p>
      </div>

      {/* TODO: Add date range filters or other controls */}
      <div className="mb-6 flex flex-wrap justify-end gap-2">
        {/* Placeholder for future filters */}
        {/* <select className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
          <option>Last 3 months</option>
          <option>Last 6 months</option>
          <option>All time</option>
        </select> */}
      </div>

      <div className="space-y-8">
         {/* Placeholder for Charts */}
         <section>
            <h2 className="text-xl font-semibold mb-4">Progress Charts</h2>
             {/* <ProgressCharts /> */}
             <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  Charts visualizing your progress metrics will appear here.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Continue submitting weekly check-ins to see trends in your weight, body measurements, and wellness metrics.
                </p>
             </div>
        </section>
        
        {/* Render Timeline */}
        <section>
            <h2 className="text-xl font-semibold mb-4">Timeline</h2>
            <CheckInTimeline /> {/* Render Timeline */}
        </section>
      </div>

    </div>
  );
};

export default HistoryPage; 