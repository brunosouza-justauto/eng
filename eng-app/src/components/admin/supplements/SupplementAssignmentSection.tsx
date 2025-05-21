import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../../../services/supabaseClient';
import { 
  Supplement,
  athleteSupplementSchema,
  SUPPLEMENT_SCHEDULES
} from '../../../types/supplements';
import { assignSupplementToAthlete } from '../../../services/supplementService';
import LoadingSpinner from '../../common/LoadingSpinner';

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface SupplementAssignmentSectionProps {
  supplements: Supplement[];
}

// Custom type to make form handling work better with react-hook-form
type SupplementAssignmentFormData = {
  supplement_id: string;
  dosage: string;
  timing: string;
  schedule: string;
  notes: string;
  start_date: string;
  end_date: string;
};

const SupplementAssignmentSection: React.FC<SupplementAssignmentSectionProps> = ({ supplements }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<SupplementAssignmentFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(athleteSupplementSchema) as any,
    defaultValues: {
      supplement_id: '',
      dosage: '',
      timing: '',
      schedule: 'Daily',
      notes: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
    }
  });

  // Watch selected supplement_id to apply default values
  const selectedSupplementId = watch('supplement_id');

  // Fetch all users with the athlete role
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_id, first_name, last_name, email')
          .eq('role', 'athlete')
          .order('last_name', { ascending: true });

        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load athletes. Please try again later.');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Apply default values from selected supplement
  useEffect(() => {
    if (selectedSupplementId) {
      const supplement = supplements.find(s => s.id === selectedSupplementId);
      if (supplement) {
        reset({
          ...watch(),
          dosage: supplement.default_dosage || '',
          timing: 'Daily or Every Other Day',
          schedule: supplement.default_timing || '',
          notes: supplement.notes || '',
        });
      }
    }
  }, [selectedSupplementId, supplements, reset, watch]);

  const onSubmit = async (data: SupplementAssignmentFormData) => {
    if (!selectedUser) {
      setError('Please select an athlete');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id || '';
      
      await assignSupplementToAthlete({
        user_id: selectedUser,
        supplement_id: data.supplement_id,
        prescribed_by: currentUserId,
        dosage: data.dosage,
        timing: data.timing,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schedule: data.schedule as any,
        notes: data.notes,
        start_date: data.start_date,
        end_date: data.end_date && data.end_date !== '' ? data.end_date : undefined,
      });
      
      setSuccess('Supplement assigned successfully');
      
      // Clear form for next assignment
      reset({
        supplement_id: '',
        dosage: '',
        timing: '',
        schedule: 'Daily',
        notes: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error assigning supplement:', err);
      setError('Failed to assign supplement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
        Assign Supplement to Athlete
      </h2>

      {/* User selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Select Athlete <span className="text-red-600">*</span>
        </label>
        
        {loadingUsers ? (
          <LoadingSpinner size="small" />
        ) : (
          <select
            value={selectedUser || ''}
            onChange={(e) => setSelectedUser(e.target.value || null)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            disabled={isSubmitting}
          >
            <option value="">-- Select an athlete --</option>
            {users.map(user => (
              <option key={user.user_id} value={user.user_id}>
                {user.first_name} {user.last_name} ({user.email})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Success/Error messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-md">
          {success}
        </div>
      )}

      {/* Supplement assignment form */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        <div className="space-y-4">
          {/* Supplement Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Supplement <span className="text-red-600">*</span>
            </label>
            <Controller
              name="supplement_id"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              )}
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.notes.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-70"
            disabled={isSubmitting || !selectedUser}
          >
            {isSubmitting ? 'Assigning...' : 'Assign Supplement'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupplementAssignmentSection; 