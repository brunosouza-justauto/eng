import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useSelector } from 'react-redux';
import { selectUser, selectProfile } from '../../store/slices/authSlice';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiClipboard } from 'react-icons/fi';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useNavigate } from 'react-router-dom';
import AthleteBodyMeasurementForm from './AthleteBodyMeasurementForm';
import { BodyMeasurement as ServiceBodyMeasurement, BFCalculationMethod } from '../../services/measurementService';

// Types needed
interface UserSelectItem {
  id: string; // profile id (primary key)
  user_id: string; // auth user id
  email: string | null;
  username: string | null;
  first_name?: string | null;
  last_name?: string | null;
  gender?: 'male' | 'female';
  age?: number;
  height_cm?: number;
}

// Local interface for database measurements
interface BodyMeasurement {
  id: string;
  user_id: string;
  measurement_date: string;
  weight_kg?: number | null;
  weight_change_kg?: number | null;
  waist_cm?: number | null;
  neck_cm?: number | null;
  hips_cm?: number | null;
  tricep_mm?: number | null;
  subscapular_mm?: number | null;
  suprailiac_mm?: number | null;
  midaxillary_mm?: number | null;
  bicep_mm?: number | null;
  lower_back_mm?: number | null;
  calf_mm?: number | null;
  chest_mm?: number | null;
  abdominal_mm?: number | null;
  thigh_mm?: number | null;
  body_fat_percentage?: number | null;
  body_fat_override?: number | null;
  lean_body_mass_kg?: number | null;
  fat_mass_kg?: number | null;
  basal_metabolic_rate?: number | null;
  calculation_method?: string | null;
  notes?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  user?: UserSelectItem;
}

// Main component for managing athlete measurements
const MeasurementManager: React.FC = () => {
  // State for athletes and measurements
  const [athletes, setAthletes] = useState<UserSelectItem[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<UserSelectItem | null>(null);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [filteredMeasurements, setFilteredMeasurements] = useState<BodyMeasurement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedMeasurement, setSelectedMeasurement] = useState<BodyMeasurement | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingMeasurements, setIsLoadingMeasurements] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);

  const navigate = useNavigate();

  // Fetch athletes linked to this coach
  useEffect(() => {
    const fetchAthletes = async () => {
      if (!user || !profile) return;
      setIsLoadingUsers(true);
      setError(null);
      try {
        // Fetch athletes linked to this coach
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id, user_id, email, username, first_name, last_name, gender, age, height_cm')
          .eq('coach_id', profile.id)
          .order('first_name, last_name');
        
        if (fetchError) throw fetchError;
        setAthletes(data || []);
      } catch (err) {
        console.error("Error fetching athletes:", err);
        setError('Failed to load athletes. Please refresh the page and try again.');
      } finally { 
        setIsLoadingUsers(false);
      }
    };
    fetchAthletes();
  }, [user, profile]);

  // Fetch measurements for selected athlete
  useEffect(() => {
    if (!selectedAthlete) {
      setMeasurements([]);
      setFilteredMeasurements([]);
      return;
    }
    
    const fetchAthleteMeasurements = async () => {      
      setIsLoadingMeasurements(true);
      setError(null);
      
      try {        
        const { data, error: fetchError } = await supabase
          .from('athlete_measurements')
          .select('*')
          .eq('user_id', selectedAthlete.user_id)
          .order('measurement_date', { ascending: false });
        
        if (fetchError) throw fetchError;
        
        // Add user data to measurements
        const measurementsWithUserData = data?.map(measurement => {
          return { ...measurement, user: selectedAthlete };
        }) || [];
        
        setMeasurements(measurementsWithUserData);
        setFilteredMeasurements(measurementsWithUserData);
      } catch (err) {
        console.error("Error loading measurements:", err);
        setError('Failed to load measurements.');
      } finally {
        setIsLoadingMeasurements(false);
      }
    };
    
    fetchAthleteMeasurements();
  }, [selectedAthlete]);

  // Filter measurements based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMeasurements(measurements);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = measurements.filter(measurement => {
      const user = measurement.user;
      return (
        user?.first_name?.toLowerCase().includes(query) ||
        user?.last_name?.toLowerCase().includes(query) ||
        user?.username?.toLowerCase().includes(query) ||
        user?.email?.toLowerCase().includes(query) ||
        (measurement.weight_kg?.toString() || '').includes(query) ||
        (measurement.waist_cm?.toString() || '').includes(query) ||
        (measurement.measurement_date || '').includes(query)
      );
    });
    
    setFilteredMeasurements(filtered);
  }, [searchQuery, measurements]);

  // Reset form
  const resetForm = () => {
    setSelectedMeasurement(null);
  };

  // Create new measurement form
  const handleCreateNew = () => {
    resetForm();
    setIsCreating(true);
    setIsEditing(false);
  };

  // Edit measurement logic
  const handleEdit = (measurement: BodyMeasurement) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedMeasurement(measurement);
  };

  // Cancel form logic
  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    resetForm();
  };

  // Delete measurement logic
  const handleDelete = async (id: string) => {
    setIsSaving(true);
    setError(null);
    setSaveMessage(null);
    
    try {
      const { error: deleteError } = await supabase
        .from('athlete_measurements')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      // Update the list
      setMeasurements(measurements.filter(m => m.id !== id));
      setFilteredMeasurements(filteredMeasurements.filter(m => m.id !== id));
      
      setSaveMessage('Measurement deleted successfully.');
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error("Error deleting measurement:", err);
      setError('Failed to delete measurement. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="measurement-manager">
      <div className="container px-4 py-6 mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Athlete Measurements Manager</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Add and manage body measurements for your athletes
            </p>
          </div>
          
          <div className="flex space-x-2">
            {!isEditing && !isCreating && selectedAthlete && (
              <>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/athletes/${selectedAthlete.id}/measurements`)}
                  className="ml-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  View all measurements
                </button>
                <Button
                  onClick={handleCreateNew}
                  variant="primary"
                >
                  <FiPlus className="mr-2" /> New Measurement
                </Button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 mb-6 text-red-700 bg-red-100 border-l-4 border-red-500 rounded dark:bg-red-900/20 dark:text-red-400" role="alert">
            <p>{error}</p>
          </div>
        )}

        {saveMessage && (
          <div className="p-4 mb-6 text-green-700 bg-green-100 border-l-4 border-green-500 rounded dark:bg-green-900/20 dark:text-green-400" role="alert">
            <p>{saveMessage}</p>
          </div>
        )}
        
        {/* Two-column layout: Athletes list on the left, measurements on the right */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left column: Athletes list */}
          <div className="w-full md:w-1/3 lg:w-1/4">
            <Card className="h-full">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-800 dark:text-white">Athletes</h2>
              </div>
              
              {isLoadingUsers ? (
                <div className="flex items-center justify-center p-8">
                  <Spinner size="md" />
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Loading athletes...</span>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[70vh] overflow-y-auto">
                  {athletes.length === 0 ? (
                    <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                      No athletes found
                    </div>
                  ) : (
                    athletes.map(athlete => (
                      <div 
                        key={athlete.id} 
                        className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center ${selectedAthlete?.id === athlete.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                        onClick={() => setSelectedAthlete(athlete)}
                      >
                        <div className="w-10 h-10 mr-3 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold">
                          {athlete.first_name?.[0]}{athlete.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {athlete.first_name} {athlete.last_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {athlete.email}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          </div>
          
          {/* Right column: Measurements */}
          <div className="w-full md:w-2/3 lg:w-3/4">
            {!selectedAthlete ? (
              <Card className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="mb-4 p-4 rounded-full bg-gray-100 dark:bg-gray-800 inline-block">
                    <FiClipboard className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Select an Athlete</h3>
                  <p className="text-gray-600 dark:text-gray-400">Choose an athlete from the list to view and manage their body measurements</p>
                </div>
              </Card>
            ) : (
              <div>
                {/* Form for creating/editing measurements */}
                {(isCreating || isEditing) && (
                  <Card className="mb-6">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-xl font-semibold">
                        {isCreating ? 'Add New Measurement' : 'Edit Measurement'}
                      </h2>
                    </div>
                    <div className="p-4">
                      {selectedAthlete && (
                        <div className="mb-4 p-4 border rounded-lg border-gray-200 dark:border-gray-700">
                          <AthleteBodyMeasurementForm
                            athleteId={selectedAthlete.user_id}
                            athleteData={{
                              gender: selectedAthlete.gender || 'male', // Assuming default gender if not available
                              age: selectedAthlete.age || 30, // Assuming default age if not available
                              height_cm: selectedAthlete.height_cm || 170 // Assuming default height if not available
                            }}
                            existingMeasurement={selectedMeasurement ? (
                              // Convert our local BodyMeasurement to the ServiceBodyMeasurement type
                              // required by AthleteBodyMeasurementForm
                              {
                                id: selectedMeasurement.id,
                                user_id: selectedMeasurement.user_id,
                                measurement_date: selectedMeasurement.measurement_date,
                                weight_kg: selectedMeasurement.weight_kg || undefined,
                                weight_change_kg: selectedMeasurement.weight_change_kg || undefined,
                                waist_cm: selectedMeasurement.waist_cm || undefined,
                                neck_cm: selectedMeasurement.neck_cm || undefined,
                                hips_cm: selectedMeasurement.hips_cm || undefined,
                                tricep_mm: selectedMeasurement.tricep_mm || undefined,
                                subscapular_mm: selectedMeasurement.subscapular_mm || undefined,
                                suprailiac_mm: selectedMeasurement.suprailiac_mm || undefined,
                                midaxillary_mm: selectedMeasurement.midaxillary_mm || undefined,
                                thigh_mm: selectedMeasurement.thigh_mm || undefined,
                                bicep_mm: selectedMeasurement.bicep_mm || undefined,
                                lower_back_mm: selectedMeasurement.lower_back_mm || undefined,
                                calf_mm: selectedMeasurement.calf_mm || undefined,
                                chest_mm: selectedMeasurement.chest_mm || undefined,
                                abdominal_mm: selectedMeasurement.abdominal_mm || undefined,
                                body_fat_percentage: selectedMeasurement.body_fat_percentage || undefined,
                                body_fat_override: selectedMeasurement.body_fat_override || undefined,
                                lean_body_mass_kg: selectedMeasurement.lean_body_mass_kg || undefined,
                                fat_mass_kg: selectedMeasurement.fat_mass_kg || undefined,
                                basal_metabolic_rate: selectedMeasurement.basal_metabolic_rate || undefined,
                                // Cast string to BFCalculationMethod enum
                                calculation_method: selectedMeasurement.calculation_method as BFCalculationMethod || undefined,
                                notes: selectedMeasurement.notes || undefined,
                                created_by: selectedMeasurement.created_by || undefined
                              } as ServiceBodyMeasurement
                            ) : undefined}
                            onSaved={() => {
                              // Reset form and refresh measurements
                              setIsCreating(false);
                              setIsEditing(false);
                              resetForm();
                              
                              // Reload measurements
                              const fetchAthleteMeasurements = async () => {      
                                setIsLoadingMeasurements(true);
                                setError(null);
                                
                                try {        
                                  const { data, error: fetchError } = await supabase
                                    .from('athlete_measurements')
                                    .select('*')
                                    .eq('user_id', selectedAthlete.user_id)
                                    .order('measurement_date', { ascending: false });
                                  
                                  if (fetchError) throw fetchError;
                                  
                                  // Add user data to measurements
                                  const measurementsWithUserData = data?.map(measurement => {
                                    return { ...measurement, user: selectedAthlete };
                                  }) || [];
                                  
                                  setMeasurements(measurementsWithUserData);
                                  setFilteredMeasurements(measurementsWithUserData);
                                  setSaveMessage(`Measurement ${isEditing ? 'updated' : 'added'} successfully.`);
                                } catch (err) {
                                  console.error("Error loading measurements:", err);
                                  setError('Failed to load measurements.');
                                } finally {
                                  setIsLoadingMeasurements(false);
                                }
                              };
                              
                              fetchAthleteMeasurements();
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          onClick={handleCancel}
                          variant="secondary"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Measurements table */}
                <Card className="mb-6 overflow-auto">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2 sm:mb-0">
                        Measurements for {selectedAthlete.first_name} {selectedAthlete.last_name}
                      </h3>                      
                      <div className="relative max-w-xs">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <FiSearch className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </div>
                        <input
                          type="text"
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Filter by weight"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {isLoadingMeasurements ? (
                    <div className="flex items-center justify-center p-8">
                      <Spinner size="md" />
                      <span className="ml-2 text-gray-600 dark:text-gray-400">Loading measurements...</span>
                    </div>
                  ) : filteredMeasurements.length === 0 ? (
                    <div className="p-8 text-center text-gray-600 dark:text-gray-400">
                      No measurements found for this athlete
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                              Date
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                              Weight (kg)
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                              Body Fat %
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                              Waist (cm)
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                              Neck (cm)
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                              Chest (mm)
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                              Abdominal (mm)
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                              Thigh (mm)
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                              Tricep (mm)
                            </th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                          {filteredMeasurements.map((measurement) => (
                            <tr key={measurement.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">{formatDate(measurement.measurement_date)}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">{measurement.weight_kg ? `${measurement.weight_kg}` : '-'}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">{measurement.body_fat_percentage ? `${measurement.body_fat_percentage}%` : '-'}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">{measurement.waist_cm ? `${measurement.waist_cm}` : '-'}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">{measurement.neck_cm ? `${measurement.neck_cm}` : '-'}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">{measurement.chest_mm ? `${measurement.chest_mm}` : '-'}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">{measurement.abdominal_mm ? `${measurement.abdominal_mm}` : '-'}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">{measurement.thigh_mm ? `${measurement.thigh_mm}` : '-'}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900 dark:text-white">{measurement.tricep_mm ? `${measurement.tricep_mm}` : '-'}</div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => handleEdit(measurement)}
                                  className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                                >
                                  <FiEdit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(measurement.id)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>

                                {/* Delete confirmation dialog */}
                                {showDeleteConfirm === measurement.id && (
                                  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
                                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Confirm Deletion</h3>
                                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                                        Are you sure you want to delete this measurement? This action cannot be undone.
                                      </p>
                                      <div className="flex justify-end space-x-3">
                                        <Button 
                                          onClick={() => setShowDeleteConfirm(null)} 
                                          variant="secondary"
                                          disabled={isSaving}
                                        >
                                          Cancel
                                        </Button>
                                        <Button 
                                          onClick={() => handleDelete(measurement.id)} 
                                          variant="danger"
                                          disabled={isSaving}
                                        >
                                          {isSaving ? <Spinner size="sm" /> : <FiTrash2 />}
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeasurementManager;