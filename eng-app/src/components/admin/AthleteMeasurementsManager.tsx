import React, { useState, useEffect } from 'react';
import AthleteBodyMeasurementForm from './AthleteBodyMeasurementForm';
import AthleteMeasurementsHistory from './AthleteMeasurementsHistory';
import AthleteMeasurementsChart from './AthleteMeasurementsChart';
import AthleteMeasurementsSummary from './AthleteMeasurementsSummary';
import Button from '../ui/Button';
import { getAthleteAllMeasurements, BodyMeasurement } from '../../services/measurementService';

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
  
  // Load measurements for the chart
  useEffect(() => {
    const loadMeasurements = async () => {
      setLoading(true);
      try {
        const { data } = await getAthleteAllMeasurements(athleteId);
        setMeasurements(data || []);
      } catch (err) {
        console.error('Error loading measurements for chart:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadMeasurements();
  }, [athleteId, refreshTrigger]);
  
  // Check if we have at least two measurements for comparison
  const hasSufficientData = measurements.length >= 2;
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 sm:mb-0">
          Body Measurements for {athleteData.first_name} {athleteData.last_name}
        </h2>
        
        <Button
          onClick={toggleNewMeasurementForm}
          variant="primary"
          color="indigo"
          className="px-5 py-2 font-medium"
        >
          {showNewMeasurementForm ? 'Cancel' : 'Add New Measurement'}
        </Button>
      </div>
      
      {showNewMeasurementForm && (
        <div className="mb-8">
          <AthleteBodyMeasurementForm
            athleteId={athleteId}
            athleteData={athleteData}
            onSaved={handleMeasurementSaved}
          />
        </div>
      )}
      
      {/* Progress Summary Cards */}
      {!loading && hasSufficientData && (
        <div className="mb-8">
          <AthleteMeasurementsSummary 
            measurements={measurements}
          />
        </div>
      )}
      
      {/* Measurements Chart */}
      {!loading && hasSufficientData && (
        <div className="mb-8">
          <AthleteMeasurementsChart 
            measurements={measurements} 
            className="w-full"
          />
        </div>
      )}
      
      <AthleteMeasurementsHistory
        athleteId={athleteId}
        athleteData={athleteData}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
};

export default AthleteMeasurementsManager; 