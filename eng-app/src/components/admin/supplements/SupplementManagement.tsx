import React, { useEffect, useState } from 'react';
import { getAllSupplements, createSupplement, updateSupplement, deleteSupplement } from '../../../services/supplementService';
import { Supplement, supplementSchema } from '../../../types/supplements';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import LoadingSpinner from '../../common/LoadingSpinner';
import SupplementList from './SupplementList';
import SupplementForm from './SupplementForm';
import SupplementAssignmentSection from './SupplementAssignmentSection';
import SupplementAssignmentList from './SupplementAssignmentList';

enum Mode {
  View = 'view',
  Create = 'create',
  Edit = 'edit',
}

enum Tab {
  Assign = 'assign',
  ViewAssignments = 'viewAssignments',
}

// Type for form data
interface FormData {
  name: string;
  category: string;
  default_dosage: string;
  default_timing: string;
  notes: string;
}

const SupplementManagement: React.FC = () => {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(Mode.View);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Assign);
  const [selectedSupplement, setSelectedSupplement] = useState<Supplement | null>(null);
  
  // Initialize form
  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(supplementSchema) as any,
    defaultValues: {
      name: '',
      category: 'Vitamins',
      default_dosage: '',
      default_timing: '',
      notes: '',
    },
  });

  // Fetch supplements on component mount
  useEffect(() => {
    fetchSupplements();
  }, []);

  // Fetch supplements from the API
  const fetchSupplements = async () => {
    try {
      setLoading(true);
      const data = await getAllSupplements();
      setSupplements(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch supplements:', err);
      setError('Failed to load supplements. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Select a supplement for editing
  const handleEditSupplement = (supplement: Supplement) => {
    setSelectedSupplement(supplement);
    reset({
      name: supplement.name,
      category: supplement.category,
      default_dosage: supplement.default_dosage || '',
      default_timing: supplement.default_timing || '',
      notes: supplement.notes || '',
    });
    setMode(Mode.Edit);
  };

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      if (mode === Mode.Create) {
        await createSupplement({
          name: data.name,
          category: data.category as any,
          default_dosage: data.default_dosage,
          default_timing: data.default_timing,
          notes: data.notes,
        });
      } else if (mode === Mode.Edit && selectedSupplement) {
        await updateSupplement(selectedSupplement.id, {
          name: data.name,
          category: data.category as any,
          default_dosage: data.default_dosage,
          default_timing: data.default_timing,
          notes: data.notes,
        });
      }
      
      // Reset form and fetch updated supplements
      reset();
      setMode(Mode.View);
      setSelectedSupplement(null);
      await fetchSupplements();
    } catch (err) {
      console.error('Failed to save supplement:', err);
      setError('Failed to save supplement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle supplement deletion
  const handleDeleteSupplement = async (supplementId: string) => {
    if (!window.confirm('Are you sure you want to delete this supplement?')) return;
    
    try {
      setLoading(true);
      await deleteSupplement(supplementId);
      await fetchSupplements();
    } catch (err) {
      console.error('Failed to delete supplement:', err);
      setError('Failed to delete supplement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel form editing
  const handleCancel = () => {
    reset();
    setMode(Mode.View);
    setSelectedSupplement(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Supplement List */}
      <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Supplements</h2>
          <button
            type="button"
            onClick={() => {
              reset();
              setMode(Mode.Create);
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
          >
            Add New
          </button>
        </div>
        
        {loading && <LoadingSpinner />}
        
        {error && (
          <div className="text-red-500 dark:text-red-400 mb-4">
            {error}
          </div>
        )}
        
        <SupplementList 
          supplements={supplements}
          onEdit={handleEditSupplement}
          onDelete={handleDeleteSupplement}
        />
      </div>
      
      {/* Right Panel: Form or Assignment Section */}
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {mode !== Mode.View ? (
          <>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
              {mode === Mode.Create ? 'Add New Supplement' : 'Edit Supplement'}
            </h2>
            
            <SupplementForm 
              control={control}
              errors={errors}
              onSubmit={handleSubmit(onSubmit)}
              onCancel={handleCancel}
              isSubmitting={loading}
            />
          </>
        ) : (
          <>
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab(Tab.Assign)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === Tab.Assign
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  Assign Supplements
                </button>
                <button
                  onClick={() => setActiveTab(Tab.ViewAssignments)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === Tab.ViewAssignments
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  View Assignments
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === Tab.Assign ? (
              <SupplementAssignmentSection supplements={supplements} />
            ) : (
              <SupplementAssignmentList />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SupplementManagement; 