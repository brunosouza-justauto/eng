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

## Current Focus: Meal Planning and Nutrition Tracking

We've been enhancing the meal planning and nutrition tracking features of the ENG App. Recent work has focused on:

1. **Meal Plan View Enhancements**
   - Implementing a dark-themed UI that aligns with the application's design language
   - Improving the organization of nutrition information for food items
   - Refining table layouts for better readability and user experience
   - Adjusting visual elements for clarity and emphasis on important data

2. **Navigation and Context Preservation**
   - Adding support for day type parameters via URL query strings
   - Creating seamless transitions between the dashboard and meal plan views
   - Ensuring user context is maintained when navigating between related screens

3. **Nutrition Data Visualization**
   - Enhancing the display of macro and calorie data
   - Creating a more prominent visual hierarchy for nutritional information
   - Improving the accessibility and readability of nutritional metrics

## Active Decisions

1. **UI Design Principles**
   - Using consistent spacing patterns across nutrition-related components
   - Employing a dark theme with strategic color highlights for important data
   - Implementing responsive layouts that work well on various device sizes

2. **Navigation Flow**
   - Preserving user context (like selected day type) when moving between screens
   - Using URL parameters to maintain state across navigation boundaries
   - Creating intuitive paths between related nutrition components

3. **Testing & Refinement**
   - Actively testing layout adjustments for optimal spacing and readability
   - Iterating on visual hierarchy based on user feedback
   - Ensuring responsive behavior across different viewport sizes

## Next Steps

1. **Nutrition Analytics**
   - Develop enhanced visualizations for tracking nutrition goals vs. actuals
   - Create trend analyses for macro consumption over time
   - Implement comparison views between different day types

2. **Meal Planning Extensions**
   - Consider implementing drag-and-drop functionality for meal rearrangement
   - Add support for meal templates and favorites
   - Enhance food search capabilities with filters and intelligent suggestions

3. **Mobile Optimizations**
   - Further refine responsive layouts for small screens
   - Implement touch-friendly interactions for meal logging
   - Optimize performance for nutrition calculations on mobile devices

## Current Focus: Fitness Device Integration Improvements

We've recently focused on enhancing the fitness device integration functionality in the application, addressing several key issues:

### 1. Fitbit OAuth Authentication Fix
- Fixed authentication issues with Fitbit's OAuth implementation
- Added proper Basic Authentication headers for Fitbit token exchange and refresh
- Enhanced logging for better debugging of OAuth flows
- Improved error handling for token exchange process

### 2. CORS Issue Resolution for Fitness APIs
- Implemented a development proxy in Vite to handle CORS restrictions
- Added `/api/fitbit` proxy path that forwards requests to Fitbit's API
- Updated the `syncFitbitSteps` function to use the proxy instead of direct API calls
- Improved error reporting for API requests

### 3. UI and Structure Fixes
- Fixed HTML structure issue in the StepGoalWidget component 
- Corrected invalid nesting of div elements within p elements
- Added a sync button to the UI for connected fitness devices
- Enhanced user feedback during synchronization processes

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