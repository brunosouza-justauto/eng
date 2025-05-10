import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getAthleteAllMeasurements, deleteMeasurement, BodyMeasurement, BFCalculationMethod } from '../../services/measurementService';
import Button from '../ui/Button';
import AthleteBodyMeasurementForm from './AthleteBodyMeasurementForm';

interface AthleteMeasurementsHistoryProps {
  athleteId: string;
  athleteData: {
    gender: 'male' | 'female';
    age: number;
    height_cm: number;
  };
  refreshTrigger?: number; // Used to trigger refresh from parent
}

const AthleteMeasurementsHistory: React.FC<AthleteMeasurementsHistoryProps> = ({
  athleteId,
  athleteData,
  refreshTrigger = 0
}) => {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMeasurement, setEditingMeasurement] = useState<BodyMeasurement | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // Format calculation method for display
  const getCalculationMethodName = (method?: BFCalculationMethod) => {
    switch (method) {
      case BFCalculationMethod.JACKSON_POLLOCK_3:
        return 'Jackson/Pollock 3 Point';
      case BFCalculationMethod.JACKSON_POLLOCK_4:
        return 'Jackson/Pollock 4 Point';
      case BFCalculationMethod.JACKSON_POLLOCK_7:
        return 'Jackson/Pollock 7 Point';
      case BFCalculationMethod.DURNIN_WOMERSLEY:
        return 'Durnin/Womersley';
      case BFCalculationMethod.PARRILLO:
        return 'Parrillo Method';
      case BFCalculationMethod.NAVY_TAPE:
        return 'Navy Tape Method';
      default:
        return 'Unknown Method';
    }
  };

  // Load measurements
  const loadMeasurements = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await getAthleteAllMeasurements(athleteId);
      
      if (error) throw error;
      
      setMeasurements(data || []);
    } catch (err: Error | unknown) {
      console.error('Error loading measurements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load measurements');
    } finally {
      setLoading(false);
    }
  };

  // Load measurements on component mount and when refreshTrigger changes
  useEffect(() => {
    loadMeasurements();
  }, [athleteId, refreshTrigger]);

  // Handle deletion of a measurement
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this measurement?')) {
      return;
    }
    
    try {
      const { success, error } = await deleteMeasurement(id);
      
      if (!success) throw error;
      
      // Refresh the measurements list
      loadMeasurements();
    } catch (err: Error | unknown) {
      console.error('Error deleting measurement:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete measurement');
    }
  };

  // Handle edit button click
  const handleEdit = (measurement: BodyMeasurement) => {
    setEditingMeasurement(measurement);
    setShowEditForm(true);
  };

  // Handle measurement saved/updated
  const handleMeasurementSaved = () => {
    setShowEditForm(false);
    setEditingMeasurement(null);
    loadMeasurements();
  };

  return (
    <>
      {showEditForm && (
        <div className="mb-8">
          <AthleteBodyMeasurementForm 
            athleteId={athleteId}
            athleteData={athleteData}
            existingMeasurement={editingMeasurement || undefined}
            onSaved={handleMeasurementSaved}
          />
          
          <div className="mt-4">
            <Button 
              onClick={() => setShowEditForm(false)}
              variant="secondary"
              className="px-5"
            >
              Cancel Edit
            </Button>
          </div>
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Measurement History</h2>
        </div>
        
        <div className="p-5">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading measurements...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          ) : measurements.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400">No measurements recorded yet.</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Add a new measurement to start tracking progress.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Weight (kg)
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Body Fat %
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Lean Mass (kg)
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fat Mass (kg)
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Method
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {measurements.map((measurement) => (
                    <tr key={measurement.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-300">
                        {format(new Date(measurement.measurement_date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {measurement.weight_kg?.toFixed(1)}
                        {measurement.weight_change_kg && (
                          <span className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded ${
                            measurement.weight_change_kg > 0 
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                              : measurement.weight_change_kg < 0 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {measurement.weight_change_kg > 0 ? '+' : ''}
                            {measurement.weight_change_kg.toFixed(1)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {measurement.body_fat_percentage?.toFixed(1)}%
                        {measurement.body_fat_override && (
                          <span className="ml-1 text-xs text-orange-500 dark:text-orange-400" title="Manually overridden">*</span>
                        )}
                        {measurement.id !== measurements[measurements.length - 1]?.id && measurements.indexOf(measurement) < measurements.length - 1 && (
                          (() => {
                            const nextMeasurement = measurements[measurements.indexOf(measurement) + 1];
                            if (nextMeasurement && nextMeasurement.body_fat_percentage && measurement.body_fat_percentage) {
                              const change = measurement.body_fat_percentage - nextMeasurement.body_fat_percentage;
                              return (
                                <span className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded ${
                                  change > 0 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                    : change < 0 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {change > 0 ? '-' : change < 0 ? '+' : ''}
                                  {Math.abs(change).toFixed(1)}
                                </span>
                              );
                            }
                            return null;
                          })()
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {measurement.lean_body_mass_kg?.toFixed(1)}
                        {measurement.id !== measurements[measurements.length - 1]?.id && measurements.indexOf(measurement) < measurements.length - 1 && (
                          (() => {
                            const nextMeasurement = measurements[measurements.indexOf(measurement) + 1];
                            if (nextMeasurement && nextMeasurement.lean_body_mass_kg && measurement.lean_body_mass_kg) {
                              const change = measurement.lean_body_mass_kg - nextMeasurement.lean_body_mass_kg;
                              return (
                                <span className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded ${
                                  change > 0 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                    : change < 0 
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {change > 0 ? '+' : ''}
                                  {change.toFixed(1)}
                                </span>
                              );
                            }
                            return null;
                          })()
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {measurement.fat_mass_kg?.toFixed(1)}
                        {measurement.id !== measurements[measurements.length - 1]?.id && measurements.indexOf(measurement) < measurements.length - 1 && (
                          (() => {
                            const nextMeasurement = measurements[measurements.indexOf(measurement) + 1];
                            if (nextMeasurement && nextMeasurement.fat_mass_kg && measurement.fat_mass_kg) {
                              const change = measurement.fat_mass_kg - nextMeasurement.fat_mass_kg;
                              return (
                                <span className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded ${
                                  change > 0 
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' 
                                    : change < 0 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {change > 0 ? '+' : ''}
                                  {change.toFixed(1)}
                                </span>
                              );
                            }
                            return null;
                          })()
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {getCalculationMethodName(measurement.calculation_method)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button
                          variant="text"
                          color="indigo"
                          onClick={() => handleEdit(measurement)}
                          className="inline-flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          Edit
                        </Button>
                        <Button
                          variant="text"
                          color="red"
                          onClick={() => measurement.id && handleDelete(measurement.id)}
                          className="inline-flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AthleteMeasurementsHistory; 