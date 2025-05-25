import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AthleteBodyMeasurementForm from './AthleteBodyMeasurementForm';
import Button from '../ui/Button';
import { getAthleteRecentMeasurements, BodyMeasurement } from '../../services/measurementService';
import { format, parseISO } from 'date-fns';

interface AthleteMeasurementsManagerProps {
  athleteId: string;
  athleteData: {
    gender: 'male' | 'female';
    age: number;
    height_cm: number;
    first_name: string;
    last_name: string;
  };
}

const AthleteMeasurementsManager: React.FC<AthleteMeasurementsManagerProps> = ({
  athleteId,
  athleteData
}) => {
  const navigate = useNavigate();
  const [showNewMeasurementForm, setShowNewMeasurementForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Toggle the new measurement form
  const toggleNewMeasurementForm = () => {
    setShowNewMeasurementForm(prev => !prev);
  };
  
  // Handle measurement saved
  const handleMeasurementSaved = () => {
    setShowNewMeasurementForm(false);
    // Increment refresh trigger to reload measurements
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Load recent measurements only (up to 5 most recent)
  useEffect(() => {
    const loadMeasurements = async () => {
      setLoading(true);
      try {
        // This should be updated in the service to fetch only recent measurements
        const { data } = await getAthleteRecentMeasurements(athleteId, 5);
        setMeasurements(data || []);
      } catch (err) {
        console.error('Error loading recent measurements:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadMeasurements();
  }, [athleteId, refreshTrigger]);
  
  return (
    <div>
      <div className="flex items-center justify-between pb-2 mb-4 border-b">
        <h3 className="text-lg font-medium text-gray-800 dark:text-white">Body Measurements</h3>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-24">
          <div className="w-10 h-10 border-t-2 border-b-2 border-indigo-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            {measurements.length > 0 ? (
              <div>
                <p className="mb-2 font-medium text-indigo-600 dark:text-indigo-400">
                  Latest measurement: {format(parseISO(measurements[0].measurement_date), 'MMMM d, yyyy')}
                </p>
                <div className="flex flex-wrap mt-3 gap-2">
                  <Button 
                    onClick={toggleNewMeasurementForm}
                    variant="primary"
                    className="text-sm"
                  >
                    {showNewMeasurementForm ? 'Cancel' : 'Add New Measurement'}
                  </Button>
                  <button 
                    onClick={() => {
                      // Get the parent athlete ID from URL - for example, /admin/athletes/123
                      // Extract the ID from the current path
                      const pathParts = window.location.pathname.split('/');
                      const athleteIdFromPath = pathParts[pathParts.indexOf('athletes') + 1];
                      navigate(`/admin/athletes/${athleteIdFromPath}/measurements`);
                    }}
                    className="inline-flex items-center justify-center font-medium shadow-sm rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors dark:focus:ring-offset-gray-900 disabled:opacity-70 disabled:cursor-not-allowed bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 text-sm px-4 py-2"
                  >
                    View All Measurements
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-gray-400">No measurements recorded yet.</p>
                <div className="flex flex-wrap mt-3 gap-2">
                  <Button 
                    onClick={toggleNewMeasurementForm}
                    variant="primary"
                    color="indigo"
                    className="text-sm"
                  >
                    Add First Measurement
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {showNewMeasurementForm && (
            <div className="mb-4 p-4 border rounded-lg border-gray-200 dark:border-gray-700">
              <AthleteBodyMeasurementForm
                athleteId={athleteId}
                athleteData={athleteData}
                onSaved={handleMeasurementSaved}
              />
            </div>
          )}
          
          {measurements.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-800 dark:text-white flex items-center">
                  Recent Measurements
                </h4>
              </div>
              
              <div className="overflow-hidden bg-white rounded-lg shadow dark:bg-gray-800">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">
                        Date
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Weight
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Body Fat %
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Chest
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Arms
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {measurements.map((measurement) => (
                      <tr key={measurement.id}>
                        <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                          {format(parseISO(measurement.measurement_date), 'MMM d, yyyy')}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {measurement.weight_kg ? `${measurement.weight_kg} kg` : 'N/A'}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {measurement.body_fat_percentage ? `${measurement.body_fat_percentage}%` : 'N/A'}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {measurement.chest_mm ? `${measurement.chest_mm/10} cm` : 'N/A'}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {measurement.tricep_mm ? `${measurement.tricep_mm/10} cm` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AthleteMeasurementsManager; 