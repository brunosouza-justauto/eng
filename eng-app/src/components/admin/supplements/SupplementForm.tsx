import React from 'react';
import { Control, FieldErrors, Controller } from 'react-hook-form';
import { SUPPLEMENT_CATEGORIES, SUPPLEMENT_SCHEDULES } from '../../../types/supplements';

interface FormData {
  name: string;
  category: string;
  default_dosage: string;
  default_timing: string;
  notes: string;
}

interface SupplementFormProps {
  control: Control<FormData>;
  errors: FieldErrors<FormData>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const SupplementForm: React.FC<SupplementFormProps> = ({
  control,
  errors,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name <span className="text-red-600">*</span>
          </label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                placeholder="Supplement name"
                disabled={isSubmitting}
              />
            )}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category <span className="text-red-600">*</span>
          </label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                disabled={isSubmitting}
              >
                {SUPPLEMENT_CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.category && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.category.message}</p>
          )}
        </div>

        {/* Default Dosage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Default Dosage
          </label>
          <Controller
            name="default_dosage"
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
          {errors.default_dosage && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.default_dosage.message}</p>
          )}
        </div>

        {/* Default Timing */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Default Timing
          </label>
          <Controller
            name="default_timing"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                disabled={isSubmitting}
              >
                <option value="">-- Select timing --</option>
                {SUPPLEMENT_SCHEDULES.map(schedule => (
                  <option key={schedule} value={schedule}>
                    {schedule}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.default_timing && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.default_timing.message}</p>
          )}
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

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-70"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save Supplement'}
        </button>
      </div>
    </form>
  );
};

export default SupplementForm; 