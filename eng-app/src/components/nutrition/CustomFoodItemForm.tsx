import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  CustomFoodItemFormData, 
  customFoodItemSchema, 
  FoodItem 
} from '../../types/mealPlanning';
import BarcodeScanner from './BarcodeScanner';
import { createCustomFoodItem } from '../../services/foodItemService';
import { useSelector } from 'react-redux';
import { selectProfile } from '../../store/slices/authSlice';

interface CustomFoodItemFormProps {
  onSave: (foodItem: FoodItem) => void;
  onCancel: () => void;
  initialData?: Partial<CustomFoodItemFormData>;
}

const CustomFoodItemForm: React.FC<CustomFoodItemFormProps> = ({
  onSave,
  onCancel,
  initialData
}) => {
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userProfile = useSelector(selectProfile);
  
  const defaultValues: CustomFoodItemFormData = {
    food_name: initialData?.food_name || '',
    food_group: initialData?.food_group || '',
    calories_per_100g: initialData?.calories_per_100g || 0,
    protein_per_100g: initialData?.protein_per_100g || 0,
    carbs_per_100g: initialData?.carbs_per_100g || 0,
    fat_per_100g: initialData?.fat_per_100g || 0,
    fiber_per_100g: initialData?.fiber_per_100g || 0,
    serving_size_g: initialData?.serving_size_g || 100,
    serving_size_unit: initialData?.serving_size_unit || 'g',
    barcode: initialData?.barcode || '',
    brand: initialData?.brand || '',
    nutrient_basis: initialData?.nutrient_basis || '100g'
  };
  
  const { 
    control, 
    handleSubmit, 
    formState: { errors },
    setValue,
    watch
  } = useForm<CustomFoodItemFormData>({
    // @ts-expect-error Type mismatch with zodResolver is a known issue
    resolver: zodResolver(customFoodItemSchema),
    defaultValues
  });
  
  const watchedBarcode = watch('barcode');
  
  const processSubmit = async (data: CustomFoodItemFormData) => {
    if (!userProfile?.id) {
      setError('You must be logged in to create a food item');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const newFoodItem = await createCustomFoodItem(data, userProfile.id);
      onSave(newFoodItem);
    } catch (err) {
      console.error('Error creating food item:', err);
      setError('Failed to create food item. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  const handleBarcodeDetect = (foodItem: FoodItem | null, barcode: string) => {
    setShowBarcodeScanner(false);
    
    if (foodItem) {
      // If we found an existing item from the barcode, populate the form with its data
      setValue('food_name', foodItem.food_name);
      setValue('food_group', foodItem.food_group || '');
      setValue('calories_per_100g', foodItem.calories_per_100g);
      setValue('protein_per_100g', foodItem.protein_per_100g);
      setValue('carbs_per_100g', foodItem.carbs_per_100g);
      setValue('fat_per_100g', foodItem.fat_per_100g);
      setValue('fiber_per_100g', foodItem.fiber_per_100g || 0);
      setValue('barcode', foodItem.barcode);
      setValue('brand', foodItem.brand || '');
      
      // Notify user that we found and pre-populated the item
      alert(`Found product: ${foodItem.food_name} with barcode: ${barcode}. You can edit details before saving.`);
    } else if (watchedBarcode) {
      // If we didn't find anything but have a barcode, just keep that
      alert('No product found for this barcode: ' + barcode + '. Please enter nutrition information manually.');
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 dark:text-white">
        {initialData ? 'Edit Food Item' : 'Add Custom Food Item'}
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded dark:bg-red-900 dark:text-red-100">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit((data) => {
        // Using two-step casting to avoid TypeScript errors
        const formData = data as unknown as CustomFoodItemFormData;
        processSubmit(formData);
      })}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Basic Information */}
          <div className="md:col-span-2">
            <label className="block mb-1 font-medium dark:text-white">Food Name *</label>
            <Controller
              name="food_name"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter food name"
                />
              )}
            />
            {errors.food_name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.food_name.message}</p>
            )}
          </div>
          
          <div>
            <label className="block mb-1 font-medium dark:text-white">Brand</label>
            <Controller
              name="brand"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Brand name (optional)"
                />
              )}
            />
          </div>
          
          <div>
            <label className="block mb-1 font-medium dark:text-white">Food Group</label>
            <Controller
              name="food_group"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="E.g., Dairy, Meat, Vegetable"
                />
              )}
            />
          </div>
          
          <div className="flex space-x-2">
            <div className="flex-grow">
              <label className="block mb-1 font-medium dark:text-white">Barcode</label>
              <Controller
                name="barcode"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Barcode (optional)"
                  />
                )}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setShowBarcodeScanner(true)}
                className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800"
              >
                Scan
              </button>
            </div>
          </div>
          
          <div>
            <label className="block mb-1 font-medium dark:text-white">Nutrient Basis</label>
            <Controller
              name="nutrient_basis"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="100g">Per 100g</option>
                  <option value="100ml">Per 100ml</option>
                </select>
              )}
            />
          </div>
          
          {/* Nutritional Information */}
          <div className="md:col-span-2">
            <h3 className="font-bold mb-2 dark:text-white">Nutritional Values (per 100g/ml)</h3>
          </div>
          
          <div>
            <label className="block mb-1 font-medium dark:text-white">Calories (kcal) *</label>
            <Controller
              name="calories_per_100g"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              )}
            />
            {errors.calories_per_100g && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.calories_per_100g.message}</p>
            )}
          </div>
          
          <div>
            <label className="block mb-1 font-medium dark:text-white">Protein (g) *</label>
            <Controller
              name="protein_per_100g"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              )}
            />
            {errors.protein_per_100g && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.protein_per_100g.message}</p>
            )}
          </div>
          
          <div>
            <label className="block mb-1 font-medium dark:text-white">Carbohydrates (g) *</label>
            <Controller
              name="carbs_per_100g"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              )}
            />
            {errors.carbs_per_100g && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.carbs_per_100g.message}</p>
            )}
          </div>
          
          <div>
            <label className="block mb-1 font-medium dark:text-white">Fat (g) *</label>
            <Controller
              name="fat_per_100g"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              )}
            />
            {errors.fat_per_100g && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fat_per_100g.message}</p>
            )}
          </div>
          
          <div>
            <label className="block mb-1 font-medium dark:text-white">Fiber (g)</label>
            <Controller
              name="fiber_per_100g"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              )}
            />
            {errors.fiber_per_100g && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fiber_per_100g.message}</p>
            )}
          </div>
          
          <div>
            <label className="block mb-1 font-medium dark:text-white">Serving Size</label>
            <div className="flex space-x-2">
              <div className="flex-grow">
                <Controller
                  name="serving_size_g"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="number"
                      min="0"
                      step="0.1"
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  )}
                />
                {errors.serving_size_g && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.serving_size_g.message}</p>
                )}
              </div>
              <div className="w-24">
                <Controller
                  name="serving_size_unit"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="oz">oz</option>
                      <option value="serving">serving</option>
                      <option value="piece">piece</option>
                    </select>
                  )}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-700 dark:hover:bg-indigo-800"
          >
            {isSubmitting ? 'Saving...' : 'Save Food Item'}
          </button>
        </div>
      </form>
      
      {showBarcodeScanner && (
        <BarcodeScanner
          onDetect={handleBarcodeDetect}
          onClose={() => setShowBarcodeScanner(false)}
          onError={(error) => {
            console.error('Barcode scanner error:', error);
            setShowBarcodeScanner(false);
          }}
        />
      )}
    </div>
  );
};

export default CustomFoodItemForm; 