import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  searchAthleteSupplementAssignments, 
  removeAthleteSupplementAssignment,
  updateAthleteSupplement,
  getAllSupplements
} from '../../../services/supplementService';
import { 
  AthleteSupplementWithDetails, 
  Supplement,
  athleteSupplementSchema,
  SUPPLEMENT_SCHEDULES
} from '../../../types/supplements';
import LoadingSpinner from '../../common/LoadingSpinner';
import { FiTrash2, FiEdit } from 'react-icons/fi';

interface ExtendedSupplementAssignment extends AthleteSupplementWithDetails {
  athlete_name?: string;
}

const SupplementAssignmentList: React.FC = () => {
  const [assignments, setAssignments] = useState<ExtendedSupplementAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);
  const [editInProgress, setEditInProgress] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<ExtendedSupplementAssignment | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  // Setup form
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(athleteSupplementSchema),
    defaultValues: {
      supplement_id: '',
      dosage: '',
      timing: '',
      schedule: 'Daily' as const,
      notes: '',
      start_date: '',
      end_date: '',
    }
  });

  const fetchSupplements = async () => {
    try {
      const data = await getAllSupplements();
      setSupplements(data);
    } catch (err) {
      console.error('Failed to fetch supplements:', err);
    }
  };

  const searchAssignments = async (term: string) => {
    if (!term || term.trim() === '') {
      setAssignments([]);
      setHasSearched(false);
      return;
    }

    try {
      setLoading(true);
      const data = await searchAthleteSupplementAssignments(term);
      setAssignments(data);
      setHasSearched(true);
      setError(null);
    } catch (err) {
      console.error('Failed to search supplement assignments:', err);
      setError('Failed to search assignments. Please try again later.');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplements();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim()) {
        searchAssignments(searchTerm);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this supplement assignment?')) {
      return;
    }

    try {
      setDeleteInProgress(id);
      await removeAthleteSupplementAssignment(id);
      setAssignments(assignments.filter(assignment => assignment.id !== id));
    } catch (err) {
      console.error('Failed to delete supplement assignment:', err);
      setError('Failed to delete assignment. Please try again.');
    } finally {
      setDeleteInProgress(null);
    }
  };

  const handleEditAssignment = (assignment: ExtendedSupplementAssignment) => {
    setSelectedAssignment(assignment);
    reset({
      supplement_id: assignment.supplement_id,
      dosage: assignment.dosage,
      timing: assignment.timing || '',
      schedule: assignment.schedule,
      notes: assignment.notes || '',
      start_date: assignment.start_date,
      end_date: assignment.end_date || '',
    });
    setEditModalOpen(true);
  };

  const onSubmitEdit = async (data: any) => {
    if (!selectedAssignment) return;
    
    try {
      setEditInProgress(selectedAssignment.id);
      
      await updateAthleteSupplement(selectedAssignment.id, {
        supplement_id: data.supplement_id,
        dosage: data.dosage,
        timing: data.timing,
        schedule: data.schedule,
        notes: data.notes,
        start_date: data.start_date,
        end_date: data.end_date && data.end_date !== '' ? data.end_date : undefined,
      });
      
      // Refresh assignments
      await searchAssignments(searchTerm);
      
      // Close modal and show success message
      setEditModalOpen(false);
      setUpdateSuccess('Supplement assignment updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Failed to update supplement assignment:', err);
      setError('Failed to update assignment. Please try again.');
    } finally {
      setEditInProgress(null);
    }
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setSelectedAssignment(null);
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM d, yyyy');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
        Athlete Supplement Assignments
      </h2>

      {/* Search Box */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by athlete, supplement, or schedule..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
        />
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Type at least 3 characters to search for athletes, supplements, or schedules
        </p>
      </div>

      {/* Success Message */}
      {updateSuccess && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-md">
          {updateSuccess}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">
          {error}
        </div>
      )}

      {/* Loading Spinner or Initial State */}
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="medium" />
        </div>
      ) : !hasSearched ? (
        <div className="text-center py-16 px-4">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <p className="text-lg font-medium">Enter an athlete name, supplement, or schedule to search</p>
            <p className="mt-2">Results will appear here after you search</p>
          </div>
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No supplement assignments found matching your search.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Athlete
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Supplement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Prescribed By
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {assignments.map(assignment => (
                <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {assignment.athlete_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {assignment.supplement_name}
                    <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full">
                      {assignment.supplement_category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {assignment.schedule}
                    {assignment.timing && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {assignment.timing}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatDate(assignment.start_date)}
                    {assignment.end_date && (
                      <> to {formatDate(assignment.end_date)}</>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {assignment.prescribed_by_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end space-x-3">
                    <button
                      onClick={() => handleEditAssignment(assignment)}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none"
                      aria-label="Edit assignment"
                    >
                      <FiEdit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      disabled={deleteInProgress === assignment.id}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 focus:outline-none"
                      aria-label="Delete assignment"
                    >
                      {deleteInProgress === assignment.id ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                      ) : (
                        <FiTrash2 className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Edit Supplement Assignment
              </h3>
              <button 
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-4">
              {/* Supplement Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Supplement <span className="text-red-600">*</span>
                </label>
                <Controller
                  name="supplement_id"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      disabled={editInProgress !== null}
                    >
                      <option value="">-- Select a supplement --</option>
                      {supplements.map(supplement => (
                        <option key={supplement.id} value={supplement.id}>
                          {supplement.name} ({supplement.category})
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.supplement_id && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.supplement_id.message}</p>
                )}
              </div>

              {/* Dosage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dosage <span className="text-red-600">*</span>
                </label>
                <Controller
                  name="dosage"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., 1 capsule, 5mg, 2 tablets"
                      disabled={editInProgress !== null}
                    />
                  )}
                />
                {errors.dosage && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.dosage.message}</p>
                )}
              </div>

              {/* Timing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Timing
                </label>
                <Controller
                  name="timing"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Daily, Every Other Day..."
                      disabled={editInProgress !== null}
                    />
                  )}
                />
                {errors.timing && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.timing.message}</p>
                )}
              </div>

              {/* Schedule */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Schedule <span className="text-red-600">*</span>
                </label>
                <Controller
                  name="schedule"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      disabled={editInProgress !== null}
                    >
                      {SUPPLEMENT_SCHEDULES.map(schedule => (
                        <option key={schedule} value={schedule}>
                          {schedule}
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.schedule && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.schedule.message}</p>
                )}
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date <span className="text-red-600">*</span>
                  </label>
                  <Controller
                    name="start_date"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="date"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        disabled={editInProgress !== null}
                      />
                    )}
                  />
                  {errors.start_date && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.start_date.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date (Optional)
                  </label>
                  <Controller
                    name="end_date"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="date"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        disabled={editInProgress !== null}
                      />
                    )}
                  />
                  {errors.end_date && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.end_date.message}</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <textarea
                      {...field}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Additional information or instructions"
                      disabled={editInProgress !== null}
                    />
                  )}
                />
                {errors.notes && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.notes.message}</p>
                )}
              </div>

              {/* Submit/Cancel buttons */}
              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  disabled={editInProgress !== null}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-70"
                  disabled={editInProgress !== null}
                >
                  {editInProgress ? 'Updating...' : 'Update Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplementAssignmentList; 