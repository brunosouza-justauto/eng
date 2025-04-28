import React from 'react';
import CheckInTimeline from '../components/history/CheckInTimeline'; // Import Timeline
// import ProgressCharts from '../components/history/ProgressCharts'; // Create this later

const HistoryPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Check-in History & Progress</h1>
      
      {/* TODO: Add date range filters or other controls */}

      <div className="space-y-8">
         {/* Placeholder for Charts */}
         <section>
            <h2 className="text-xl font-semibold mb-4">Progress Charts</h2>
             {/* <ProgressCharts /> */}
             <div className="p-4 bg-white dark:bg-gray-800 rounded shadow text-center text-gray-500 dark:text-gray-400">Charts Placeholder</div>
        </section>
        
        {/* Render Timeline */}
        <section>
            <h2 className="text-xl font-semibold mb-4">Timeline</h2>
            <CheckInTimeline /> {/* Render Timeline */}
            {/* Removed placeholder */}
            {/* <div className="p-4 bg-white dark:bg-gray-800 rounded shadow text-center text-gray-500 dark:text-gray-400">Check-in Timeline Placeholder</div> */}
        </section>
      </div>

    </div>
  );
};

export default HistoryPage; 