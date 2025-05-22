import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import BackButton from '../components/common/BackButton';
import { FiPrinter, FiEdit, FiShoppingCart, FiExternalLink } from 'react-icons/fi';
import DayTypeFrequencyDialog, { DayTypeFrequency } from '../components/nutrition/DayTypeFrequencyDialog';

interface ShoppingCartItem {
  foodItemId: string;
  foodName: string;
  totalGrams: number;
  originalUnit?: string;
}

const ShoppingCartPage: React.FC = () => {
  const [dayTypeFrequencies, setDayTypeFrequencies] = useState<DayTypeFrequency[]>([]);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [shoppingItems, setShoppingItems] = useState<ShoppingCartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');

  // Load saved frequencies from localStorage on initial load
  useEffect(() => {
    const savedFrequencies = localStorage.getItem('dayTypeFrequencies');
    if (savedFrequencies) {
      try {
        setDayTypeFrequencies(JSON.parse(savedFrequencies));
      } catch (e) {
        console.error('Error parsing saved day type frequencies:', e);
      }
    }

    // Get plan ID from URL or localStorage
    const params = new URLSearchParams(window.location.search);
    const urlPlanId = params.get('planId');
    
    if (urlPlanId) {
      setPlanId(urlPlanId);
      // Fetch plan name
      fetchPlanName(urlPlanId);
    } else {
      const savedPlanId = localStorage.getItem('lastShoppingCartPlanId');
      if (savedPlanId) {
        setPlanId(savedPlanId);
        fetchPlanName(savedPlanId);
      }
    }
  }, []);

  // Fetch plan name
  const fetchPlanName = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('nutrition_plans')
        .select('name')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data) {
        setPlanName(data.name);
      }
    } catch (err) {
      console.error('Error fetching plan name:', err);
    }
  };

  // If we have plan ID and frequencies, generate shopping list
  useEffect(() => {
    if (planId && dayTypeFrequencies.length > 0) {
      generateShoppingList();
    }
  }, [planId, dayTypeFrequencies]);

  // Generate shopping list based on day type frequencies
  const generateShoppingList = async () => {
    if (!planId) {
      setError('No nutrition plan selected');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all meals and food items for the nutrition plan
      const { data, error } = await supabase
        .from('nutrition_plans')
        .select(`
          id,
          name,
          meals (
            id,
            name,
            day_type,
            meal_food_items (
              quantity,
              unit,
              food_items (
                id,
                food_name,
                nutrient_basis,
                serving_size_g
              )
            )
          )
        `)
        .eq('id', planId)
        .single();
        
      if (error) throw error;
      
      if (!data || !data.meals) {
        setError('No meals found in this nutrition plan');
        setIsLoading(false);
        return;
      }
      
      // Create a map to aggregate ingredients
      const ingredientMap: Record<string, ShoppingCartItem> = {};
      
      // Process each meal
      data.meals.forEach(meal => {
        // Skip meals without day type
        if (!meal.day_type) return;
        
        // Find the frequency for this day type
        const frequency = dayTypeFrequencies.find(
          f => f.dayType === meal.day_type
        )?.frequency || 0;
        
        // Skip if frequency is 0
        if (frequency === 0) return;
        
        // Process each food item in the meal
        meal.meal_food_items.forEach(item => {
          if (!item.food_items || !item.food_items.id) return;
          
          const foodItem = item.food_items;
          const foodItemId = foodItem.id;
          
          // Convert to grams if possible
          let quantityInGrams = item.quantity;
          
          // If unit is not grams and we have serving size, try to convert
          if (item.unit !== 'g' && foodItem.serving_size_g) {
            quantityInGrams = item.quantity * foodItem.serving_size_g;
          }
          
          // Multiply by frequency
          const totalGrams = quantityInGrams * frequency;
          
          // Add to ingredient map
          if (!ingredientMap[foodItemId]) {
            ingredientMap[foodItemId] = {
              foodItemId,
              foodName: foodItem.food_name,
              totalGrams: 0,
              originalUnit: item.unit
            };
          }
          
          // Add quantity
          ingredientMap[foodItemId].totalGrams += totalGrams;
        });
      });
      
      // Convert map to array and sort by name
      const ingredients = Object.values(ingredientMap)
        .sort((a, b) => a.foodName.localeCompare(b.foodName));
      
      setShoppingItems(ingredients);
      
    } catch (err) {
      console.error('Error generating shopping list:', err);
      setError('Failed to generate shopping list');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle frequency dialog save
  const handleSaveFrequencies = (frequencies: DayTypeFrequency[]) => {
    setDayTypeFrequencies(frequencies);
    localStorage.setItem('dayTypeFrequencies', JSON.stringify(frequencies));
    setShowFrequencyModal(false);
    
    // Save plan ID for next time
    if (planId) {
      localStorage.setItem('lastShoppingCartPlanId', planId);
    }
    
    // Generate shopping list with new frequencies
    generateShoppingList();
  };

  // Handle printing the shopping list
  const handlePrint = () => {
    window.print();
  };

  // Open supermarket search
  const openSupermarketSearch = (foodName: string, supermarket: 'woolworths' | 'coles') => {
    // Get only the part before the first comma (if there is a comma)
    const simplifiedName = foodName.split(',')[0].trim();
    const searchTerm = encodeURIComponent(simplifiedName);
    let url = '';
    
    if (supermarket === 'woolworths') {
      url = `https://www.woolworths.com.au/shop/search/products?searchTerm=${searchTerm}`;
    } else {
      url = `https://www.coles.com.au/search?q=${searchTerm}`;
    }
    
    window.open(url, '_blank');
  };

  return (
    <div className="container mx-auto p-4">
      <BackButton to={planId ? `/meal-plan/${planId}` : '/nutrition-plans'} />
      
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Shopping List {planName && `for ${planName}`}
        </h1>
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFrequencyModal(true)}
              className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              <FiEdit className="mr-2" /> Edit Frequencies
            </button>
            
            <button
              onClick={handlePrint}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <FiPrinter className="mr-2" /> Print
            </button>
          </div>
        </div>
        
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-300">Generating shopping list...</span>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded mb-4">
            {error}
          </div>
        )}
        
        {!isLoading && !error && shoppingItems.length === 0 && (
          <div className="text-center py-8">
            <FiShoppingCart className="mx-auto text-4xl text-gray-400 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">
              {dayTypeFrequencies.length === 0 
                ? "Please set day type frequencies to generate a shopping list" 
                : "No items in your shopping list"}
            </p>
            <button
              onClick={() => setShowFrequencyModal(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Set Frequencies
            </button>
          </div>
        )}
        
        {!isLoading && shoppingItems.length > 0 && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-200 border-b dark:border-gray-600">Ingredient</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-200 text-right border-b dark:border-gray-600 w-[120px]">Amount</th>
                    <th className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-200 text-center border-b dark:border-gray-600 w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {shoppingItems.map((item) => (
                    <tr key={item.foodItemId} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-4 py-4 text-gray-800 dark:text-gray-200 whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px] sm:max-w-xs">{item.foodName}</td>
                      <td className="px-4 py-4 text-gray-800 dark:text-gray-200 text-right font-medium">
                        {Math.round(item.totalGrams)}g
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col sm:flex-row justify-center sm:space-x-4 space-y-2 sm:space-y-0">
                          <button
                            onClick={() => openSupermarketSearch(item.foodName, 'woolworths')}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors"
                            title="Search at Woolworths"
                          >
                            <span className="sr-only">Search at Woolworths</span>
                            <div className="flex items-center justify-center">
                              <span className="mr-1 text-xs font-medium">Woolies</span>
                              <FiExternalLink size={14} />
                            </div>
                          </button>
                          
                          <button
                            onClick={() => openSupermarketSearch(item.foodName, 'coles')}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:underline transition-colors"
                            title="Search at Coles"
                          >
                            <span className="sr-only">Search at Coles</span>
                            <div className="flex items-center justify-center">
                              <span className="mr-1 text-xs font-medium">Coles</span>
                              <FiExternalLink size={14} />
                            </div>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Day Type Frequency Dialog */}
      {showFrequencyModal && planId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <DayTypeFrequencyDialog
            planId={planId}
            initialFrequencies={dayTypeFrequencies}
            onSave={handleSaveFrequencies}
            onCancel={() => setShowFrequencyModal(false)}
          />
        </div>
      )}
      
      {/* Printable styles - these will only affect print media */}
      <style>
        {`
        /* Mobile styles */
        @media (max-width: 640px) {
          .overflow-x-auto {
            margin: 0 -1rem;
            width: calc(100% + 2rem);
          }
          
          table {
            table-layout: fixed;
          }
        }
        
        @media print {
          /* Hide elements that shouldn't be printed */
          button, .no-print, header, footer {
            display: none !important;
          }
          
          /* Ensure white background and black text */
          body, .container, table {
            background: white !important;
            color: black !important;
          }
          
          /* Remove shadows and make table full width */
          .shadow-sm, .shadow-lg {
            box-shadow: none !important;
          }
          
          table {
            width: 100% !important;
          }
          
          /* Ensure table header is visible */
          thead {
            display: table-header-group;
          }
          
          /* Add page breaks appropriately */
          tr {
            page-break-inside: avoid;
          }
          
          /* Ensure fonts are readable */
          body {
            font-size: 12pt;
          }
          
          /* Set page margins */
          @page {
            margin: 1cm;
          }
          
          /* Hide the 'Actions' column when printing */
          th:nth-child(3), td:nth-child(3) {
            display: none !important;
          }
          
          /* Ensure table rows are not cut off between pages */
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Hide the 'Back to Dashboard' button when printing */
          .back-button {
            display: none !important;
          }
        }
        `}
      </style>
    </div>
  );
};

export default ShoppingCartPage; 