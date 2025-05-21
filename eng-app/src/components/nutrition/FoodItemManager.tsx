import React, { useState, useEffect } from 'react';
import { FoodItem } from '../../types/mealPlanning';
import { searchFoodItems } from '../../services/foodItemService';
import BarcodeScanner from './BarcodeScanner';

interface FoodItemManagerProps {
  onSelectFoodItem: (foodItem: FoodItem) => void;
  onAddCustom: () => void;
  onClose: () => void;
}

const FoodItemManager: React.FC<FoodItemManagerProps> = ({
  onSelectFoodItem,
  onAddCustom,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [filterSource, setFilterSource] = useState<string>('');
  const [filterFoodGroup, setFilterFoodGroup] = useState<string>('');
  
  const pageSize = 20;

  // Load initial search results
  useEffect(() => {
    searchFoods();
  }, [currentPage, filterSource, filterFoodGroup]);

  const searchFoods = async (searchQuery?: string) => {
    setIsLoading(true);
    
    try {
      // If a search query is provided, reset to first page
      const queryToUse = searchQuery !== undefined ? searchQuery : query;
      const pageToUse = searchQuery !== undefined ? 0 : currentPage;
      
      if (searchQuery !== undefined) {
        setQuery(searchQuery);
        setCurrentPage(0);
      }
      
      const filters: {
        source?: string;
        food_group?: string;
      } = {};
      
      if (filterSource) filters.source = filterSource;
      if (filterFoodGroup) filters.food_group = filterFoodGroup;
      
      const { items, count } = await searchFoodItems(
        queryToUse,
        filters,
        pageSize,
        pageToUse * pageSize
      );
      
      setSearchResults(items);
      setTotalResults(count);
    } catch (error) {
      console.error('Error searching food items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchFoods(query);
  };

  const handleSelectFoodItem = (foodItem: FoodItem) => {
    onSelectFoodItem(foodItem);
  };

  const handleBarcodeDetect = (foodItem: FoodItem | null, barcode: string) => {
    setShowBarcodeScanner(false);
    
    if (foodItem) {
      onSelectFoodItem(foodItem);
    } else {
      alert('No product found for this barcode: ' + barcode + '. Try adding it as a custom food item.');
    }
  };

  const changePage = (newPage: number) => {
    if (newPage >= 0 && newPage < Math.ceil(totalResults / pageSize)) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold dark:text-white">Food Items</h2>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        <form onSubmit={handleSearch} className="flex-grow">
          <div className="flex">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search food items..."
              className="flex-grow p-2 border rounded-l dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button 
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-r hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800"
            >
              Search
            </button>
          </div>
        </form>

        <button
          onClick={() => setShowBarcodeScanner(true)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
        >
          Scan Barcode
        </button>

        <button
          onClick={onAddCustom}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          Add Custom
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Source
          </label>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">All Sources</option>
            <option value="ausnut">AUSNUT</option>
            <option value="usda">USDA</option>
            <option value="open_food_facts">Open Food Facts</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Food Group
          </label>
          <input
            type="text"
            value={filterFoodGroup}
            onChange={(e) => setFilterFoodGroup(e.target.value)}
            placeholder="Filter by food group"
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {searchResults.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Calories
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Protein
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Carbs
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Fat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {searchResults.map((foodItem, index) => (
                    <tr key={`${foodItem.id}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {foodItem.food_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {foodItem.food_group || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {foodItem.calories_per_100g.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {foodItem.protein_per_100g.toFixed(1)}g
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {foodItem.carbs_per_100g.toFixed(1)}g
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {foodItem.fat_per_100g.toFixed(1)}g
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {foodItem.source || 'ausnut'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleSelectFoodItem(foodItem)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No food items found. Try a different search or add a custom item.
            </div>
          )}

          {totalResults > pageSize && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">{currentPage * pageSize + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min((currentPage + 1) * pageSize, totalResults)}
                </span>{' '}
                of <span className="font-medium">{totalResults}</span> results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 dark:border-gray-600 dark:disabled:text-gray-500"
                >
                  Previous
                </button>
                <button
                  onClick={() => changePage(currentPage + 1)}
                  disabled={(currentPage + 1) * pageSize >= totalResults}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 dark:border-gray-600 dark:disabled:text-gray-500"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

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

export default FoodItemManager; 