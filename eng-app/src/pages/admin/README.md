# Admin Pages

This directory contains components used by coaches and administrators to manage and view athlete data.

## AthleteNutritionPage

The `AthleteNutritionPage` component provides coaches with a comprehensive view of an athlete's nutrition history, including meal logs, macronutrient distribution, and statistical summaries.

### Features

- **Nutrition Plan Display**: Shows the athlete's current nutrition plan with target calories and macros
- **Nutrition Statistics**: Displays average calories, max calories, completion rate, and macronutrient totals
- **Calorie History Chart**: Visualizes calorie intake over time with target line
- **Meal Logs Table**: Groups meal logs by date, showing detailed food information and macros
- **Time Period Filtering**: Allows switching between "Past 7 Days" and "Month View"
- **Month Navigation**: When in Month View, enables navigation between months

### Data Flow

1. The component fetches the athlete's profile data using their ID from URL parameters
2. It retrieves the athlete's assigned nutrition plan
3. It fetches meal logs for the selected time period (7 days or month)
4. For extra meals, it fetches associated food items separately
5. It processes and normalizes the data for consistent display
6. It calculates daily nutrition summaries and statistics
7. It renders the UI with charts, statistics, and meal logs

### Key Technical Considerations

#### Database Field Mapping

The component handles field name differences between the database and UI:

```typescript
// Example of field mapping:
{
  id: item.id,
  name: foodItemData.food_name || foodItemData.name,
  protein_grams: foodItemData.protein_per_100g || 0,
  carbohydrate_grams: foodItemData.carbs_per_100g || 0,
  fat_grams: foodItemData.fat_per_100g || 0,
  calories: foodItemData.calories_per_100g || 0,
  serving_size: foodItemData.serving_size || 100,
  serving_unit: foodItemData.serving_size_unit || 'g',
  quantity: item.quantity || 1
}
```

#### Nutritional Calculations

The component handles conversions for per 100g values:

```typescript
// For display in the meal logs table
const totalCalories = log.food_items.reduce((sum, food) => {
  const multiplier = food.quantity / 100; // Convert per 100g to actual amount
  return sum + (food.calories * multiplier);
}, 0);
```

#### Time Parsing

Special handling for time strings:

```typescript
const formatTimeString = (timeStr: string): string => {
  try {
    // Handle time string in format "HH:MM:SS"
    const [hours, minutes] = timeStr.split(':');
    
    if (!hours || !minutes) {
      return timeStr; // Return as is if not in expected format
    }
    
    // Create a date object for today with the given hours and minutes
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    
    // Format it
    return format(date, 'h:mm a');
  } catch (e) {
    console.error('Error formatting time:', e);
    return timeStr; // Return original if parsing fails
  }
};
```

### Component Structure

- **Main Page Component**: `AthleteNutritionPage`
- **Visualization Components**:
  - `MacrosPieChart`: Displays macronutrient distribution
  - `NutritionBarChart`: Shows calorie history
  - `MonthNavigation`: Provides controls for month-based navigation
- **Data Processing Functions**:
  - `fetchAthleteData`: Retrieves athlete profile
  - `fetchNutritionPlan`: Gets assigned nutrition plan
  - `fetchMealLogs`: Retrieves meal logs for selected period
  - `processMealLogsIntoDailyData`: Aggregates logs into daily summaries
  - `calculateStats`: Computes statistical values

### Usage

This component is typically accessed via the athlete details page by clicking "View Nutrition History", or directly via URL: `/admin/athletes/:id/nutrition`

### Example

```jsx
// Example usage in a route
<Route 
  path="/admin/athletes/:id/nutrition" 
  element={<AthleteNutritionPage />} 
/>
``` 