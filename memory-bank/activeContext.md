# Active Context

## Current Focus
We are enhancing the reliability of the app by eliminating external dependencies while continuing to improve the workout and nutrition tracking experience:

1. **Exercise Data Independence** ✅
   - Migrated from external HeyGainz API to local database for exercise data
   - Updated all components to use the local exercise database
   - Created compatibility adapters to maintain backward compatibility
   - Refactored exercise search, filtering, and detail fetching
   - Eliminated external API dependencies for improved reliability

2. **PWA and Deployment Enhancement** ✅
   - Implementing Progressive Web App support for installable experience
   - Setting up Vercel deployment with optimized configuration
   - Creating API proxies for external fitness services
   - Enhancing offline capabilities with service worker caching

3. **Type Safety Improvements** ✅
   - Refining TypeScript types in service layer
   - Eliminating 'any' types in critical functions
   - Fixing compatibility issues between interfaces
   - Improving overall code quality and maintainability

4. **Workout Session Enhancement** 🚧
   - Adding comprehensive rest timer functionality
   - Implementing exercise demonstrations with GIFs
   - Adding voice announcements for next exercises
   - Implementing vibration feedback for mobile devices
   - Enhancing user experience during workouts
   - Fixing rest period handling for 0-second rest times

5. **Meal Planning System** 🚧
   - Adding ability to manage meals within nutrition plans
   - Implementing food item search and selection
   - Creating custom recipe functionality
   - Building multi-day meal planning capability
   - Adding nutritional calculations for meals and plans

6. **Bug Fixes and Optimizations** 🔧
   - Addressing UI/UX issues in dark mode
   - Improving authentication stability
   - Enhancing data quality for food items
   - Fixing food data classification mapping

7. **Previous Completed Focus Areas** ✅
   - Exercise Data Fetching Performance
   - Dashboard Workout Display
   - Program Builder Improvements

## Current Focus: PWA Enhancements and Fixes

We've been improving the Progressive Web App functionality to create a more reliable and user-friendly experience:

1. **PWA Update Notification Fixes**
   - Fixed issue with repeated update prompts appearing
   - Implemented a time-based cooldown system (24-hour window)
   - Added session-based tracking to prevent multiple notifications
   - Created proper localStorage persistence for update preferences
   - Replaced browser confirm dialog with a custom React component

2. **Service Worker Improvements**
   - Updated service worker to use explicit versioning
   - Implemented better caching strategies (stale-while-revalidate for assets)
   - Added network-first strategy for HTML content
   - Enhanced cache management with proper cleanup of old versions
   - Improved error handling and logging for better debugging

3. **Mobile Installation Experience**
   - Added targeted installation prompts for mobile users
   - Implemented proper device detection for iOS/Android
   - Created user-friendly installation UI with clear instructions
   - Added persistence to prevent repeated prompts after dismissal

4. **Offline Capabilities**
   - Enhanced caching of critical app assets
   - Implemented manifest.json with proper app metadata
   - Added appropriate icon sizes for different platforms
   - Configured app shortcuts for quick access to key features

## Active Decisions

1. **PWA Update Strategy**
   - Implementing a user-friendly update notification system instead of browser dialogs
   - Using a time-based cooldown to prevent notification fatigue
   - Providing clear visual cues for available updates

2. **Caching Strategy**
   - Using network-first strategy for HTML/dynamic content
   - Implementing stale-while-revalidate for static assets
   - Carefully managing cache versions to ensure proper updates

3. **Installation Experience**
   - Focusing installation prompts on mobile users where the benefit is greatest
   - Creating non-intrusive UI that appears after user engagement
   - Storing user preferences to respect dismissal decisions

## Next Steps

1. **Extended Offline Support**
   - Implement offline data synchronization
   - Add offline indicator in the UI
   - Create graceful degradation for features requiring connectivity

2. **Enhanced Installation Analytics**
   - Track PWA installation rates
   - Analyze usage patterns between installed vs. browser users
   - Optimize prompt timing based on user engagement

3. **Push Notifications**
   - Implement push notification support for check-in reminders
   - Add notification permission flow
   - Create backend infrastructure for scheduling notifications

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

## Recent Changes

### PWA and Update Notification Improvements
- Fixed issue with repeated update notifications by implementing a cooldown mechanism
- Created a user-friendly update notification component to replace browser confirm dialogs
- Updated the service worker to use versioning for better cache management
- Implemented different caching strategies for different types of content (HTML vs static assets)
- Added proper type definitions for PWA-related interfaces
- Enhanced mobile detection for PWA installation prompts
- Created standardized manifest.json with proper metadata and icons
- Added offline support through service worker caching

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

### Coach Notification System Implementation
- ✅ Designed and implemented a comprehensive coach notification system with database triggers
- ✅ Created real-time notifications for significant athlete activities (new assignments, workout completions, check-ins)
- ✅ Added specialized step goal achievement notifications that integrate with the fitness tracking system
- ✅ Implemented intelligent notification triggers that dynamically detect table structures and columns
- ✅ Built a flexible system that adapts to personalized step goals from the `step_goals` table
- ✅ Created a user-friendly notification UI with distinctive icons for different notification types
- ✅ Added error handling to ensure notification scripts adapt to various database configurations
- ✅ Integrated notifications with Redux state management for real-time updates
- ✅ Implemented mark-as-read functionality with optimistic UI updates
- ✅ Added navigation to relevant pages when clicking on notifications (workouts, profiles, fitness metrics)
- ✅ Created detailed documentation for customizing and extending the notification system

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

### PWA and Deployment Enhancements
- Added Progressive Web App configuration using vite-plugin-pwa
- Created custom SVG icons for application installation (192x192 and 512x512)
- Implemented PWA installation handler for better user experience
- Added service worker for offline capabilities and asset caching
- Created Vercel serverless functions for API proxies (Fitbit, etc.)
- Set up vercel.json configuration for optimal deployment
- Configured routing and caching strategies for the production environment
- Updated main entry point to properly register service worker
- Fixed repeated update notification issue with cooldown mechanism
- Created custom update notification UI component for better user experience
- Implemented proper mobile detection for targeted installation prompts
- Enhanced service worker with version-based caching strategies

### Type Safety Improvements
- Enhanced type definitions in mealLoggingService.ts
- Created proper interfaces for meal logging data structures
- Added type definitions for PWA-related interfaces
- Enhanced type safety in service worker implementation
- Removed usage of 'any' type in favor of specific interfaces

### Rest Period 0-Second Value Fix
- Fixed critical issue with rest periods set to 0 seconds being converted to nulls in the database
- Modified code in ProgramBuilder.tsx to use nullish coalescing (??) operator instead of logical OR (||)
- Updated `rest_seconds: set.rest_seconds ?? null` to correctly handle 0 values
- Applied same fix to set data attachment logic during workout fetching
- Ensured 0-second rest times are properly saved and displayed instead of defaulting to 60 seconds
- Enhanced workout experience by allowing coaches to specify immediate transitions between exercises
- Fixed dropdown support for selecting 0 seconds in the WorkoutForm and WorkoutSession pages

### WorkoutForm and WorkoutSession Improvements
- Added toggle button for expanding or collapsing all exercises at once
- Improved bodyweight toggle UI with better positioning and clearer active state
- Reduced width of weight column in exercise table for better space utilization
- Increased checkbox size for improved usability and touch targets
- Added "Each Side" badge for exercises performed on each side with amber/yellow styling
- Added tempo indicator with clock icon for exercises with specific tempo requirements
- Enhanced workout history page to display "Each Side" and tempo information

### Workout Session UI Enhancements
- Added custom rest time override functionality that allows athletes to set a specific rest time for all exercises
- Created countdown timer functionality for timed activities like warmups or stretching independent of the exercise rest timer
- Improved the position of notifications to prevent overlapping with the rest timer
- Reordered weight and reps columns in the exercise sets table to put weight before reps, matching common weightlifting notation
- Enhanced the countdown timer interface with progress bar, pause/resume controls, and visual feedback
- Added countdown buttons to individual exercise cards for easier access during workouts
- Fixed issues with timer interfaces refreshing too quickly during user input

### Workout History Improvements
- Completely redesigned the workout history view to group completed sets by exercise
- Added visual exercise cards with clear exercise names and set details
- Implemented intelligent deduplication of sets to prevent duplicate display
- Added concise exercise summaries showing patterns (e.g., "3× 10 reps @ 20kg | 8 reps @ 25kg")
- Enhanced visual hierarchy with exercise numbering and consistent styling
- Improved status indicators for completed and skipped sets
- Added ability to delete workout sessions with confirmation dialog
- Implemented cascade deletion that removes both session data and associated completed sets

### User Experience Refinements
- Added haptic feedback (vibration) for mobile devices during countdown events
- Enhanced audio alerts with customized sounds for different timer events
- Improved visual indication of active timers with color changes and animations
- Added fallback mechanisms for handling missing or malformed data in history views
- Implemented progress indicators during deletion operations
- Enhanced confirmation dialogs to clearly identify the session being deleted

### Code Quality Improvements
- Added proper error handling for workout session deletion
- Implemented data validation to prevent display of malformed set data
- Enhanced state management for timer components
- Fixed various TypeScript errors and improved type safety
- Improved component isolation to prevent unwanted re-renders

### Workout Weight Auto-Copying Feature
- The WorkoutSessionPage component has a smart feature for automatically carrying forward weights from previous sets
- When a user attempts to mark a set as completed with an empty weight field, the system:
  - Checks previous sets for the same exercise to find the most recent weight used
  - Automatically applies that weight to the current set
  - Shows a notification to the user: "Using previous weight: X"
  - Marks the set as completed
  - If no previous weight exists, it shows an error asking the user to enter a weight or mark as bodyweight

This feature improves the user experience by reducing repetitive data entry during workouts, making it faster to log sets with the same weight.

## Active Development Focus

### Current Focus
- Enhancing meal logging functionality on the meal plan page
- Improving UI/UX for meal logging actions
- Fixing data fetching issues with logged meals
- Optimizing the dashboard for better meal tracking

### Recent Changes

#### Meal Plan View Improvements
- Fixed meal log status detection by changing database table query from 'logged_meals' to 'meal_logs'
- Added error logging for meal logs queries to help with debugging
- Moved the meal logging buttons from the header to the bottom of each meal card
- Improved button UI with explicit text labels ("Log this meal" and "Remove from log")
- Enhanced visual feedback with better button styling (green for logging, red for removing)
- Maintained the logged meal checkmark indicator in the meal title section

#### Missed Meals Notification System
- Added MissedMealsAlert component to the dashboard
- Implemented debugging tools to ensure proper rendering
- Added notification system for missed meals
- Fixed issues with duplicate alerts on the dashboard

### Active Technical Decisions
- Using Supabase meal_logs table (not logged_meals) for storing user's meal logging data
- Following consistent UI patterns for action buttons (full-width at the bottom of cards with clear labeling)
- Using icon + text combinations for better user feedback
- Implementing proper loading states during async operations

### Current Workflow Considerations
- Ensuring all meal logging components share consistent UI patterns
- Maintaining clear visual indicators for logged vs. unlogged meals
- Optimizing data fetching to reduce redundant queries
- Prioritizing mobile-friendly interfaces with adequate touch targets

## Next Steps

Continue identifying and implementing quality-of-life improvements for workout tracking that reduce friction and make the app more intuitive to use during active workouts.

## Active Decisions

- The app should intelligently assist users during workout sessions by reducing manual data entry when possible
- Clear user feedback should be provided when automatic actions are taken
- The UI should be optimized for quick interactions during workouts