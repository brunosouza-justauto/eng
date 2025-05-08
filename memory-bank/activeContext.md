# Active Context

## Current Focus
We are enhancing the workout experience in the application with advanced training features:

1. **Workout Session Enhancement** 🚧
   - Adding comprehensive rest timer functionality
   - Implementing exercise demonstrations with GIFs
   - Adding voice announcements for next exercises
   - Implementing vibration feedback for mobile devices
   - Enhancing user experience during workouts

2. **Meal Planning System** 🚧
   - Adding ability to manage meals within nutrition plans
   - Implementing food item search and selection
   - Creating custom recipe functionality
   - Building multi-day meal planning capability
   - Adding nutritional calculations for meals and plans

3. **Bug Fixes and Optimizations** 🔧
   - Addressing UI/UX issues in dark mode
   - Improving authentication stability
   - Enhancing data quality for food items
   - Fixing food data classification mapping

4. **Previous Completed Focus Areas** ✅
   - Exercise Data Fetching Performance
   - Dashboard Workout Display
   - Program Builder Improvements

## Recent Changes

### Exercise Demonstration Enhancements
- Added YouTube link integration to exercise demonstrations - allowing users to watch video demonstrations
- Implemented a text sanitization system to fix encoding issues in exercise instructions and tips
- Created a "Watch on YouTube" button with the YouTube branding that opens videos in a new tab
- Added proper visual organization of demonstration content (image, YouTube link, instructions, tips)
- Enhanced mobile-friendly layout with appropriate spacing and sizing for all content sections
- Fixed character encoding issues (e.g., "DonÃ†t" → "Don't") in exercise instructions
- Applied comprehensive text sanitization for various special characters and apostrophes

### Workout Session Timer Enhancements
- Implemented a comprehensive rest timer system for tracking rest periods between sets
- Added countdown timers with visual, audio, and vibration feedback
- Implemented speech synthesis for announcing upcoming exercises
- Created a system for exercise demonstration GIFs from the HeyGainz API
- Added an accordion-style UI for viewing exercise demonstrations on demand
- Implemented image caching to prevent unnecessary API calls
- Added ability to enable/disable voice feedback with persistent preference
- Enhanced timer UI with countdown animation and progress bar
- Added mobile device vibration for haptic feedback during workouts
- Implemented "next exercise preview" to show upcoming exercises during rest
- Fixed performance issues with exercise image loading

### Check-In Form and Review Improvements
- Fixed foreign key constraint error when submitting check-ins by using correct user_id from profile
- Added improved logging for check-in submission process to help diagnose future issues
- Fixed issue with "No athletes found" in the admin check-ins area
- Updated CheckInReview component to use selectProfile instead of selectUser for correct coach ID
- Enhanced athlete check-in list with improved UI and better handling of empty states
- Added standardized dropdown selects for adherence fields and rating scales in the check-in form
- Implemented consistent rating scales for wellness metrics (sleep quality, stress, fatigue, etc.)
- Created reusable SelectInput component for better form standardization
- Fixed data flow between coach profiles and athlete listings
- Improved label clarity and visual hierarchy throughout the check-in interface

### Dashboard Improvements
- Fixed issue where dashboard wouldn't show both workout plans and nutrition plans simultaneously
- Updated DashboardPage component to fetch program assignments and nutrition plan assignments separately
- Modified assignment data structure handling to support multiple rows per athlete in the assigned_plans table
- Improved error reporting and console logging for better debugging of assignments
- Enhanced user experience by showing both workout and nutrition information together

### Nutrition Plan Assignment
- **New Feature**: Coaches can now assign nutrition plans to individual athletes
- Created `NutritionPlanAssignmentModal` component to select and assign plans
- Updated athlete profile page to show current nutrition plan and enable changes
- Using the `assigned_plans` table to store both program and nutrition plan assignments
- Implemented data transformation utilities to handle complex database return types
- Ensured proper data refreshing after plan assignments

### Food Data Ingestion Improvements
- ✅ Fixed issues with food classification data mapping from Excel files
- ✅ Implemented proper lookup between classification IDs and names using `afcd_details.xlsx`
- ✅ Added update mode to ingest script for correcting existing food data
- ✅ Enhanced error handling and batch processing for more reliable ingestion
- ✅ Improved food group standardization with better mapping and statistics reporting

### Authentication Improvements
- Fixed issue with unwanted redirects when alt-tabbing back to the browser
- Disabled automatic token refreshing on window focus in Supabase client
- Enhanced event handling for auth state changes to ignore TOKEN_REFRESHED events
- Improved Redux state updates for significant authentication events only

### Meal Planning System Enhancements
- Created comprehensive RecipeManager component for recipe management
- Integrated recipe selection into the FoodSelector component
- Added ability to manage recipes directly from the MealPlanner interface
- Improved food data ingestion with standardized food group categorization
- Added statistics tracking and reporting for food group mapping during ingestion
- Enhanced dark mode text contrast in meal planning components

### UI/UX Improvements
- Fixed dark mode text contrast issues in meal planning components
- Improved readability of meal names and nutrition labels in dark mode
- Enhanced user experience with more intuitive recipe management flow
- Added clear visual feedback for recipe addition to meals

### Exercise Service Improvements
- Implemented `getExercisesByIds()` function to fetch only specific exercises needed
- Replaced inefficient `getAllExercisesCached()` usage in workout view
- Updated `getExerciseById()` to directly fetch a single exercise from the API
- Added developer documentation for best practices with exercise fetching
- Created a README file for the services directory

### NextWorkoutWidget Improvements
- Removed limit on workouts fetched from program templates
- Added logic to display the workout corresponding to current day of week
- Implemented REST DAY display with program overview
- Removed unused week_number field references
- Added helper functions for day name conversion
- Updated UI to show day names instead of numbers
- Fixed TypeScript type issues for SetType mapping

### WorkoutSessionPage Mobile Responsiveness
- Table layout has been optimized for mobile with percentage-based column widths
- "Set" column is hidden on mobile screens to save space
- All inputs use `w-full` to adapt to available space
- Added `truncate max-w-full` to type labels to prevent text overflow
- Reduced padding from `px-4` to `px-2` throughout the table to save space

### Toast Notification System
- Implemented a React-based toast notification system that appears above the content
- Fixed issues with the announcement toast pushing exercise images to the left
- Used `fixed inset-0` with `pointer-events-none` to ensure the toast doesn't interfere with layout or interactions
- Added timeout cleanup to prevent memory leaks
- Toast displays exercise transitions and countdown information

### Rest Timer Functionality
- Fixed the "Skip" button to properly clear timer intervals
- Added `handleSkipTimer` function to clean up timer resources when skipped
- Positioned the timer in the bottom-right corner with appropriate z-index

### Workout Completion Flow Improvements
- Implemented automatic workout completion when the user finishes the last set
- Added a congratulatory dialog that appears when all sets are completed
- Modified the completion flow so clicking "Continue" on the dialog actually saves the workout
- Fixed the dialog behavior to properly call the completeWorkout() function upon confirmation

## Next Steps

### Workout Experience Enhancements
1. 🚧 Add customizable rest timer presets for different exercise types
2. 🚧 Implement advanced circuit and superset support in workout tracking
3. 🚧 Create printable/shareable workout summary reports
4. 🚧 Add workout statistics and personal record tracking
5. 🚧 Implement exercise history view with progress graphs

### Multi-Day Meal Planning Enhancement
1. 🚧 Extend existing meal planning UI to support multi-day view and management
2. 🚧 Implement UI for creating meal templates across multiple days
3. 🚧 Add day type labeling (e.g., Training Day, Rest Day) for different nutritional needs
4. 🚧 Create calendar view for visualizing a complete meal plan cycle
5. 🚧 Implement copy/duplicate functionality for entire days

### Food Search Improvements  
1. 🚧 Enhance food filtering with dietary preferences (vegetarian, vegan, gluten-free)
2. 🚧 Implement autocomplete suggestions for common foods
3. 🚧 Add advanced filtering by macro ranges (e.g., high protein, low carb)
4. 🚧 Create "Frequently Used" section based on user history
5. 🚧 Improve unit conversion accuracy for different food densities

### Nutrition Analytics
1. 🚧 Create a dashboard for tracking daily/weekly nutrition targets vs. actuals
2. 🚧 Implement visual charts for macronutrient distribution
3. 🚧 Add progress tracking for body metrics correlated with nutrition adherence
4. 🚧 Create printable/shareable meal plan reports
5. 🚧 Implement nutrition goal setting and progress visualization

### Dashboard Enhancements
1. 📝 Add performance metrics to dashboard (workout completion, nutrition adherence)
2. 📝 Implement calendar view widget for upcoming workouts/meals
3. 📝 Add quick actions (log workout, record meal) directly from dashboard
4. 📝 Provide customization options for widget arrangement and preferences

### Check-In Form Improvements
1. 🚧 Replace text inputs with standardized select/radio inputs for consistency
2. 🚧 Add photo upload capability for progress photos
3. 🚧 Implement trend visualization for check-in metrics
4. 🚧 Add automated feedback based on check-in data
5. 🚧 Create coach notification system for key check-in metrics

## Active Decisions and Considerations

### Workout Session Enhancement Approach
- Using Web Speech API for voice announcements with user permission system
- Implementing Vibration API for mobile devices with feature detection
- Caching exercise demonstration images to prevent redundant API calls
- Using HeyGainz API to fetch realistic exercise demonstration GIFs
- Providing multi-sensory feedback (visual, audio, tactile) for comprehensive experience
- All feedback systems are opt-in and can be toggled by the user
- Storing user preferences in localStorage for persistence between sessions
- Handling API-provided YouTube links to enable video demonstrations
- Implementing text sanitization to fix encoding issues in external API data

### Multi-Day Meal Planning Approach
- The current system already has day_number field in meals table, supporting multi-day functionality
- Need to decide on UI approach - calendar view vs. tabbed day view vs. scrollable timeline
- Should provide flexibility to create meal templates (e.g., "Training Day", "Rest Day") 
- Consider implementing meal cycles (e.g., 7-day plans that repeat)
- Need to balance simplicity with flexibility for different dietary approaches

### Food Search and Filtering  
- Currently implementing basic category and text search only
- Need more sophisticated filtering by dietary preferences and nutritional content
- Consider indexing strategy for performance with large food database
- Proper unit conversion needs food-specific density information
- Should implement "recently used" or "favorites" functionality

### Nutrition Analytics Requirements
- Need to determine key metrics for nutrition tracking (beyond basic macros)
- Consider how to handle partial adherence and deviations from plan
- Should correlate nutrition adherence with physical progress metrics
- Privacy considerations for sharing nutrition data with coaches
- Performance optimization for handling large datasets of meal records

### Assignment Data Structure
- Using a single `assigned_plans` table for both training programs and nutrition plans
- When assigning either type, we store it in a separate row for the athlete with appropriate fields
- For workout plans, we store `program_template_id` (with `nutrition_plan_id` as NULL)
- For nutrition plans, we store `nutrition_plan_id` (with `program_template_id` as NULL)
- This approach provides flexibility while avoiding complex joins on fetches
- Dashboard queries are now separate for each assignment type for accurate fetching
- We keep only the most recent assignment of each type as the "active" one

### Nutrition Plan Assignments
- Using the same `assigned_plans` table for both training programs and nutrition plans
- Programs use `program_template_id` while nutrition plans use `nutrition_plan_id`
- When assigning a nutrition plan, `program_template_id` is set to `null` and vice versa
- We query with appropriate IS NULL / NOT NULL filters to get the correct type of assignment
- This approach provides flexibility while using existing database schema

- Recipes will be specific to each coach (not shared)
- Food items and recipes will appear in the same search results
- Nutritional values for recipes will be calculated from ingredients
- Meals will remain tied to nutrition plans (not independent)
- We'll implement a comprehensive unit conversion system for food quantities
- Multi-day planning will support different meal plans for training vs. rest days
- When a recipe is added to a meal, it will be broken down into individual items for quantity editing
- Food items are now categorized into standardized groups for better organization and filtering
- Food classifications come from the AFCD dataset and are mapped to standardized food groups