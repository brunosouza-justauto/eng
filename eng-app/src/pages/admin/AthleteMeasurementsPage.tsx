import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import AthleteMeasurementsChart from '../../components/admin/AthleteMeasurementsChart';
import AthleteMeasurementsSummary from '../../components/admin/AthleteMeasurementsSummary';
import AthleteMeasurementsHistory from '../../components/admin/AthleteMeasurementsHistory';
import AthleteBodyMeasurementForm from '../../components/admin/AthleteBodyMeasurementForm';
import { getAthleteAllMeasurements, BodyMeasurement } from '../../services/measurementService';

const AthleteMeasurementsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [athlete, setAthlete] = useState<{
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    gender: 'male' | 'female';
    age: number;
    height_cm: number;
  } | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [showNewMeasurementForm, setShowNewMeasurementForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load athlete details
  useEffect(() => {
    const fetchAthleteDetails = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_id, first_name, last_name, gender, age, height_cm')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          setAthlete(data as any);
        } else {
          throw new Error('Athlete not found');
        }
      } catch (err: unknown) {
        console.error("Error fetching athlete details:", err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load athlete details';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAthleteDetails();
  }, [id]);

  // Load measurements
  useEffect(() => {
    if (!athlete?.user_id) return;
    
    const loadMeasurements = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await getAthleteAllMeasurements(athlete.user_id);
        if (error) throw error;
        setMeasurements(data || []);
      } catch (err) {
        console.error('Error loading measurements:', err);
        setError('Failed to load measurements data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMeasurements();
  }, [athlete, refreshTrigger]);

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

  // Check if we have at least two measurements for comparison
  const hasSufficientData = measurements.length >= 2;
  
  if (isLoading) {
    return (
      <div className="p-4">
        <PageHeader title="Loading..." />
        <Card>
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-t-2 border-b-2 border-indigo-500 rounded-full animate-spin"></div>
          </div>
        </Card>
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

  return (
    <div className="p-4">
      <PageHeader 
        title={`${athlete.first_name} ${athlete.last_name}'s Body Measurements`} 
        subtitle="View and track body measurements progress"
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
          
          <Button
            onClick={toggleNewMeasurementForm}
            variant="primary"
            color="indigo"
            className="px-5 py-2 font-medium"
          >
            {showNewMeasurementForm ? 'Cancel' : 'Add New Measurement'}
          </Button>
        </div>
      </div>
      
      {showNewMeasurementForm && (
        <Card className="mb-6">
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Add New Measurement</h3>
            <AthleteBodyMeasurementForm
              athleteId={athlete.user_id}
              athleteData={{
                gender: athlete.gender,
                age: athlete.age || 0,
                height_cm: athlete.height_cm || 0,
                first_name: athlete.first_name || '',
                last_name: athlete.last_name || ''
              } as any}
              onSaved={handleMeasurementSaved}
            />
          </div>
        </Card>
      )}
      
      {/* Progress Summary Cards */}
      {!isLoading && hasSufficientData && (
        <Card className="mb-6">
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Measurement Progress</h3>
            <AthleteMeasurementsSummary 
              measurements={measurements}
            />
          </div>
        </Card>
      )}
      
      {/* Measurements Chart */}
      {!isLoading && hasSufficientData && (
        <Card className="mb-6">
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Progress Charts</h3>
            <AthleteMeasurementsChart 
              measurements={measurements} 
              className="w-full"
            />
          </div>
        </Card>
      )}
      
      {/* Measurement History */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Measurement History</h3>
          <AthleteMeasurementsHistory
            athleteId={athlete.user_id}
            athleteData={{
              gender: athlete.gender,
              age: athlete.age || 0,
              height_cm: athlete.height_cm || 0,
              first_name: athlete.first_name || '',
              last_name: athlete.last_name || ''
            } as any}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </Card>
    </div>
  );
};

export default AthleteMeasurementsPage;
