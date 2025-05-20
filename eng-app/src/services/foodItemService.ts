import { supabase } from './supabaseClient';
import { FoodItem, CustomFoodItemFormData } from '../types/mealPlanning';

// Constants for external API sources
const OPEN_FOOD_FACTS_API = 'https://world.openfoodfacts.org/api/v2';
const USDA_FOOD_DATA_API = 'https://api.nal.usda.gov/fdc/v1';

/**
 * Create a new custom food item
 * @param foodItem Food item data
 * @param userId User ID of the creator
 */
export const createCustomFoodItem = async (
    foodItem: CustomFoodItemFormData,
    userId: string
): Promise<FoodItem> => {
    try {
        const { data, error } = await supabase
            .from('food_items')
            .insert({
                ...foodItem,
                source: 'custom',
                created_by: userId,
                is_verified: false
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating custom food item:', error);
        throw error;
    }
};

/**
 * Update an existing custom food item
 * @param id Food item ID
 * @param foodItem Updated food item data
 * @param userId User ID (for permission check)
 */
export const updateCustomFoodItem = async (
    id: string,
    foodItem: Partial<CustomFoodItemFormData>,
    userId: string
): Promise<FoodItem> => {
    try {
        // First verify that the user is the creator of this food item
        const { data: existingItem, error: checkError } = await supabase
            .from('food_items')
            .select('created_by')
            .eq('id', id)
            .single();
        
        if (checkError) throw checkError;
        
        if (existingItem.created_by !== userId) {
            throw new Error('You can only edit food items that you created');
        }
        
        const { data, error } = await supabase
            .from('food_items')
            .update(foodItem)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating custom food item:', error);
        throw error;
    }
};

/**
 * Search for food items with more advanced filtering
 * @param query Search query
 * @param filters Additional filters (source, food_group, etc.)
 * @param limit Maximum number of results
 * @param offset Pagination offset
 * @param includeExternalSources Whether to search external sources if local results are insufficient
 */
export const searchFoodItems = async (
    query: string,
    filters?: {
        source?: string;
        food_group?: string;
        created_by?: string;
        is_verified?: boolean;
    },
    limit: number = 20,
    offset: number = 0,
    includeExternalSources: boolean = true
): Promise<{ items: FoodItem[]; count: number }> => {
    try {
        let foodQuery = supabase
            .from('food_items')
            .select('*', { count: 'exact' });
        
        // Apply search filter if provided
        if (query && query.trim() !== '') {
            foodQuery = foodQuery.ilike('food_name', `%${query}%`);
        }
        
        // Apply additional filters if provided
        if (filters) {
            if (filters.source) {
                foodQuery = foodQuery.eq('source', filters.source);
            }
            
            if (filters.food_group) {
                foodQuery = foodQuery.eq('food_group', filters.food_group);
            }
            
            if (filters.created_by) {
                foodQuery = foodQuery.eq('created_by', filters.created_by);
            }
            
            if (filters.is_verified !== undefined) {
                foodQuery = foodQuery.eq('is_verified', filters.is_verified);
            }
        }
        
        // Add pagination
        foodQuery = foodQuery
            .order('food_name', { ascending: true })
            .range(offset, offset + limit - 1);
        
        const { data, error, count } = await foodQuery;
        
        if (error) throw error;
        
        // If we have enough local results or external sources are not requested, return them
        if ((data && data.length >= limit) || !includeExternalSources || !query || query.trim() === '') {
            return {
                items: data || [],
                count: count || 0
            };
        }
        
        // Try to fetch additional items from external sources when:
        // 1. We have a specific source filter (USDA only for text search)
        // 2. We have fewer local results than requested limit
        // 3. We have a search query

        const externalItems: FoodItem[] = [];
        let additionalCount = 0;

        // Only search USDA for text searches
        // If we're specifically searching for USDA items or have no source filter
        if ((!filters?.source || filters.source === 'usda') && query && query.trim() !== '') {
            try {
                const usdaItems = await searchFromUSDA(query, limit - (data?.length || 0));
                if (usdaItems && usdaItems.length > 0) {
                    externalItems.push(...usdaItems);
                    additionalCount += usdaItems.length;
                }
            } catch (err) {
                console.error('Error fetching from USDA:', err);
                // Continue execution, don't break if external sources fail
            }
        }

        // Combine local and external results
        const combinedItems = [...(data || []), ...externalItems];
        
        return {
            items: combinedItems,
            count: (count || 0) + additionalCount
        };
    } catch (error) {
        console.error('Error searching food items:', error);
        throw error;
    }
};

/**
 * Get a food item by its barcode
 * @param barcode Barcode to search for
 */
export const getFoodItemByBarcode = async (barcode: string): Promise<FoodItem | null> => {
    try {
        // First check our own database
        const { data, error } = await supabase
            .from('food_items')
            .select('*')
            .eq('barcode', barcode)
            .maybeSingle();
        
        if (error) throw error;
        
        // If found in our database, return it
        if (data) return data;
        
        // Otherwise, try to fetch from Open Food Facts API
        return await fetchFromOpenFoodFacts(barcode);
    } catch (error) {
        console.error('Error fetching food item by barcode:', error);
        throw error;
    }
};

/**
 * Fetch food data from Open Food Facts API by barcode
 * @param barcode Product barcode
 */
export const fetchFromOpenFoodFacts = async (barcode: string): Promise<FoodItem | null> => {
    try {
        const response = await fetch(`${OPEN_FOOD_FACTS_API}/product/${barcode}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                return null; // Product not found
            }
            throw new Error(`Open Food Facts API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check if the product exists and has nutrition data
        if (!data.product || !data.product.nutriments) {
            return null;
        }
        
        // Map Open Food Facts data to our FoodItem structure
        const product = data.product;
        const nutriments = product.nutriments;
        
        const foodItem: Omit<FoodItem, 'id' | 'created_at' | 'updated_at'> = {
            food_name: product.product_name || 'Unknown product',
            food_group: product.categories_tags ? product.categories_tags[0] : undefined,
            calories_per_100g: nutriments.energy_value || 0,
            protein_per_100g: nutriments.proteins || 0,
            carbs_per_100g: nutriments.carbohydrates || 0,
            fat_per_100g: nutriments.fat || 0,
            fiber_per_100g: nutriments.fiber || 0,
            barcode: barcode,
            source: 'open_food_facts',
            source_id: product._id,
            brand: product.brands,
            nutrient_basis: '100g',
            is_verified: true
        };
        
        // Save to our database for future use
        const { data: savedItem, error } = await supabase
            .from('food_items')
            .insert(foodItem)
            .select()
            .single();
        
        if (error) throw error;
        return savedItem;
        
    } catch (error) {
        console.error('Error fetching from Open Food Facts:', error);
        return null;
    }
};

/**
 * Search food data from Open Food Facts API by name
 * @param query Search query
 * @param limit Maximum number of results
 */
export const searchFromOpenFoodFacts = async (query: string, limit: number = 20): Promise<FoodItem[]> => {
    try {
        console.log(`Searching Open Food Facts v2 API for "${query}" (limit: ${limit})`);
        
        // Add a timeout to the fetch request so it doesn't hang indefinitely
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        // Ensure page_size is at least 1
        const safeLimit = Math.max(1, limit);
        
        // Use proper v2 API structure - use code parameter for barcode or product name
        // Include only essential fields to reduce response size
        // Encode search terms properly and specify exact needed fields
        const url = `${OPEN_FOOD_FACTS_API}/search?categories_tags_en=${encodeURIComponent(query)}&page_size=${safeLimit}` + 
                   `&fields=code,product_name,brands,categories_tags,nutriments,_id`;
        
        console.log(`Using v2 API: ${url}`);
        
        // Set proper headers including User-Agent with contact information
        const response = await fetch(
            url,
            {
                method: 'GET',
                headers: {
                    // Proper user agent with app name and contact as recommended in docs
                    'User-Agent': 'ENG-App-FoodDatabase/1.0 (bsconsultingltda@gmail.com)',
                    'Accept': 'application/json'
                },
                signal: controller.signal
            }
        );
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Open Food Facts API error: ${response.statusText} (${response.status})`);
        }
        
        const data = await response.json();
        
        // Check for valid products in the response
        const products = data.products || [];
        
        if (!products.length) {
            console.log('No products found in Open Food Facts for query:', query);
            return [];
        }
        
        console.log(`Found ${products.length} products in Open Food Facts for query: ${query}`);
        
        // Process all valid products
        interface OpenFoodFactsProduct {
            product_name?: string;
            categories_tags?: string[];
            nutriments?: {
                energy_value?: number;
                energy?: number;
                proteins?: number;
                carbohydrates?: number;
                fat?: number;
                fiber?: number;
            };
            code?: string;
            _id?: string;
            brands?: string;
        }

        const validProducts = products.filter((product: OpenFoodFactsProduct) => 
            product.product_name && product.nutriments && 
            (product.nutriments.energy_value || product.nutriments.energy) &&
            product._id // Ensure we have a source_id
        );
        
        console.log(`Found ${validProducts.length} valid products with complete data`);
        
        // Map to our data structure and save to database
        const foodItems: FoodItem[] = [];
        
        for (const product of validProducts) {
            const nutriments = product.nutriments!;
            
            // Using upsert now that we have the proper constraint
            const foodItem: Omit<FoodItem, 'id' | 'created_at' | 'updated_at'> = {
                food_name: product.product_name || 'Unknown product',
                food_group: product.categories_tags?.length ? product.categories_tags[0] : undefined,
                calories_per_100g: nutriments.energy_value || (nutriments.energy ? nutriments.energy / 4.184 : 0), // Convert kJ to kcal if needed
                protein_per_100g: nutriments.proteins || 0,
                carbs_per_100g: nutriments.carbohydrates || 0,
                fat_per_100g: nutriments.fat || 0,
                fiber_per_100g: nutriments.fiber || 0,
                barcode: product.code,
                source: 'open_food_facts',
                source_id: product._id,
                brand: product.brands,
                nutrient_basis: '100g',
                is_verified: true
            };
            
            try {
                // Use upsert to either insert a new record or return the existing one
                const { data: savedItem, error } = await supabase
                    .from('food_items')
                    .upsert(foodItem, { 
                        onConflict: 'source,source_id',
                        ignoreDuplicates: false // Update existing records
                    })
                    .select()
                    .single();
                
                if (error) {
                    console.error('Error upserting Open Food Facts item:', error);
                    continue;
                }
                
                foodItems.push(savedItem);
            } catch (err) {
                console.error('Error processing Open Food Facts item:', err);
            }
        }
        
        return foodItems;
    } catch (error) {
        // Check if this is an abort error (timeout)
        if (error instanceof DOMException && error.name === 'AbortError') {
            console.error('Search request to Open Food Facts timed out after 8 seconds');
        } else {
            console.error('Error searching Open Food Facts:', error);
        }
        return [];
    }
};

/**
 * Search foods from USDA FoodData Central
 * @param query Search query
 * @param limit Maximum number of results
 */
export const searchFromUSDA = async (query: string, limit: number = 20): Promise<FoodItem[]> => {
    try {
        const apiKey = import.meta.env.VITE_USDA_API_KEY;
        if (!apiKey) {
            throw new Error('USDA API key is missing. Please add VITE_USDA_API_KEY to your .env file.');
        }
        
        const response = await fetch(
            `${USDA_FOOD_DATA_API}/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&pageSize=${limit}`
        );
        
        if (!response.ok) {
            throw new Error(`USDA API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.foods || !data.foods.length) {
            return [];
        }
        
        // Define types for USDA data
        interface USDAFoodNutrient {
            nutrientId: number;
            nutrientName: string;
            value: number;
            unitName: string;
        }

        interface USDAFood {
            fdcId: string;
            description: string;
            foodCategory: string;
            foodNutrients: USDAFoodNutrient[];
        }
        
        // Map USDA data to our FoodItem structure
        const foodItems: FoodItem[] = [];
        
        for (const food of data.foods as USDAFood[]) {
            // Skip if no fdcId is available
            if (!food.fdcId) continue;
            
            const foodItemData = {
                food_name: food.description,
                food_group: food.foodCategory,
                calories_per_100g: food.foodNutrients.find((n: USDAFoodNutrient) => n.nutrientName === 'Energy')?.value || 0,
                protein_per_100g: food.foodNutrients.find((n: USDAFoodNutrient) => n.nutrientName === 'Protein')?.value || 0,
                carbs_per_100g: food.foodNutrients.find((n: USDAFoodNutrient) => n.nutrientName === 'Carbohydrate, by difference')?.value || 0,
                fat_per_100g: food.foodNutrients.find((n: USDAFoodNutrient) => n.nutrientName === 'Total lipid (fat)')?.value || 0,
                fiber_per_100g: food.foodNutrients.find((n: USDAFoodNutrient) => n.nutrientName === 'Fiber, total dietary')?.value || 0,
                source: 'usda',
                source_id: food.fdcId,
                nutrient_basis: '100g',
                is_verified: true
            };
            
            try {
                // Use upsert to either insert a new record or return the existing one
                const { data: savedItem, error } = await supabase
                    .from('food_items')
                    .upsert(foodItemData, {
                        onConflict: 'source,source_id', 
                        ignoreDuplicates: false // Update existing records
                    })
                    .select()
                    .single();
                
                if (error) {
                    console.error('Error upserting USDA item:', error);
                    continue;
                }
                
                foodItems.push(savedItem);
            } catch (err) {
                console.error('Error processing USDA item:', err);
            }
        }
        
        return foodItems;
    } catch (error) {
        console.error('Error searching from USDA:', error);
        return [];
    }
};

/**
 * Import foods from USDA FoodData Central
 * @param query Search query
 * @param limit Maximum number of results to import
 */
export const importFromUSDA = async (query: string, limit: number = 20): Promise<FoodItem[]> => {
    // This function is maintained for backward compatibility
    // It now calls the new searchFromUSDA function
    return searchFromUSDA(query, limit);
};

/**
 * Get the list of unique food groups
 */
export const getFoodGroups = async (): Promise<string[]> => {
    try {
        const { data, error } = await supabase
            .from('food_items')
            .select('food_group')
            .not('food_group', 'is', null);
        
        if (error) throw error;
        
        // Extract unique food groups
        const foodGroups = new Set<string>();
        data?.forEach(item => {
            if (item.food_group) {
                foodGroups.add(item.food_group);
            }
        });
        
        return Array.from(foodGroups).sort();
    } catch (error) {
        console.error('Error fetching food groups:', error);
        throw error;
    }
};

/**
 * Search for a food item by barcode and return in the searchFoodItems format
 * @param barcode Barcode to search for
 */
export const searchFoodItemByBarcode = async (barcode: string): Promise<{ items: FoodItem[]; count: number; item?: FoodItem }> => {
    try {
        const foodItem = await getFoodItemByBarcode(barcode);
        
        if (foodItem) {
            return {
                items: [foodItem],
                count: 1,
                item: foodItem
            };
        } else {
            return {
                items: [],
                count: 0
            };
        }
    } catch (error) {
        console.error('Error searching food item by barcode:', error);
        throw error;
    }
}; 