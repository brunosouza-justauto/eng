# Active Context

## Current Focus
We are enhancing the app's user experience and marketing capabilities while continuing to improve core functionality:

1. **Professional Homepage & Landing Experience** ✅
   - Created a professional landing page for coach marketing and service offerings
   - Implemented sections for coach bio, packages, testimonials, and Instagram content
   - Added social media integration with links to Instagram, Facebook, YouTube, and TikTok
   - Integrated real Instagram embeds to showcase the coach's content
   - Implemented responsive design that works across all device sizes

2. **Exercise Data Independence** ✅
   - Migrated from external HeyGainz API to local database for exercise data
   - Updated all components to use the local exercise database
   - Created compatibility adapters to maintain backward compatibility
   - Refactored exercise search, filtering, and detail fetching
   - Eliminated external API dependencies for improved reliability

3. **PWA and Deployment Enhancement** ✅
   - Implementing Progressive Web App support for installable experience
   - Setting up Vercel deployment with optimized configuration
   - Creating API proxies for external fitness services
   - Enhancing offline capabilities with service worker caching

4. **Type Safety Improvements** ✅
   - Refining TypeScript types in service layer
   - Eliminating 'any' types in critical functions
   - Fixing compatibility issues between interfaces
   - Improving overall code quality and maintainability

5. **Workout Session Enhancement** 🚧
   - Adding comprehensive rest timer functionality
   - Implementing exercise demonstrations with GIFs
   - Adding voice announcements for next exercises
   - Implementing vibration feedback for mobile devices
   - Enhancing user experience during workouts
   - Fixing rest period handling for 0-second rest times

6. **Meal Planning System** 🚧
   - Adding ability to manage meals within nutrition plans
   - Implementing food item search and selection
   - Creating custom recipe functionality
   - Building multi-day meal planning capability
   - Adding nutritional calculations for meals and plans

7. **Mobile Dashboard Experience** 🚧
   - Enhancing DashboardPageV2 with improved tab-based navigation
   - Adding notification indicators to show action-needed areas
   - Fixing meal logging integration in dashboard alerts
   - Improving mobile navigation usability and visual feedback
   - Streamlining user flows between dashboard sections

8. **Bug Fixes and Optimizations** 🔧
   - Addressing UI/UX issues in dark mode
   - Improving authentication stability
   - Enhancing data quality for food items
   - Fixing food data classification mapping
   - Resolving Supabase query issues in data aggregation

9. **Previous Completed Focus Areas** ✅
   - Exercise Data Fetching Performance
   - Dashboard Workout Display
   - Program Builder Improvements

## Current Focus: Mobile Experience Enhancement

We're improving the mobile experience of the app, particularly the dashboard, with a focus on:

1. **Dashboard Status Notification System**
   - Implemented red notification badges on mobile tab navigation
   - Created status indicators for incomplete tasks in each section
   - Added real-time tracking of missed meals, pending check-ins, and activity goals
   - Connected notification badges to data sources with appropriate state updates
   - Improved visual feedback for users to quickly identify action items

2. **Action Flow Improvements**
   - Fixed "Click here to log these meals!" functionality in MissedMealsAlert
   - Implemented intelligent navigation between tabs when actions are needed
   - Added automatic scrolling to relevant sections after tab changes
   - Created fallback navigation for non-dashboard pages
   - Improved user flow between alert notifications and action areas

3. **Supabase Query Optimization**
   - Fixed aggregation queries for step counts and other metrics
   - Implemented proper syntax for Supabase column aggregation
   - Corrected data access patterns for aggregated results
   - Added error handling for database operation failures
   - Improved type safety in database query results

## Active Decisions

1. **Mobile Navigation Design Pattern**
   - Using bottom tab navigation with icon-based indicators
   - Implementing notification badges that follow platform conventions
   - Displaying badges only when action is needed, avoiding notification fatigue
   - Using consistent visual language across all notification types

2. **Notification State Management**
   - Tracking completion status separately for each activity type
   - Using React effects to retrieve real-time status data
   - Updating notification states in response to user actions
   - Memorizing derived notification states to prevent unnecessary re-renders

3. **Interaction Design for Alerts**
   - Making alerts actionable with direct navigation to relevant areas
   - Implementing smart detection of current location/context
   - Using delayed scrolling to allow for tab transitions to complete
   - Preserving scroll positions during navigation to improve user experience

## Next Steps

1. **Notification Preferences**
   - Add user control over which notifications appear
   - Implement persistence for notification preferences
   - Create settings UI for notification customization

2. **Enhanced Mobile Navigation**
   - Consider adding swipe gestures between tabs
   - Implement animation transitions between sections
   - Add haptic feedback for interactions on supported devices

3. **Activity Completion Feedback**
   - Add celebration animations for completed tasks
   - Implement progressive achievements for recurring activities
   - Create visual feedback when notifications are cleared

## Recent Changes

### Mobile Dashboard Notification System
- Implemented notification badges for the bottom tabs in DashboardPageV2
- Added real-time status tracking for workouts, meals, steps, and check-ins
- Fixed the "Click here to log these meals!" functionality in MissedMealsAlert
- Created an intelligent navigation system between dashboard tabs
- Implemented proper database queries for activity completion status
- Fixed Supabase aggregation queries for step counts and other metrics
- Added smart context detection for navigation between dashboard sections
- Implemented callback pattern for communication between components
- Enhanced visual feedback with consistent red notification badges

### Athlete Nutrition History Enhancements
- Implemented a comprehensive nutrition history page for coaches to view athlete meal logs
- Created a robust data retrieval system that properly maps database fields to component fields
- Fixed calculation logic for nutritional values based on food quantities (per 100g)
- Implemented date grouping for meal logs with visually distinct date headers
- Added proper time formatting for displaying meal times in a user-friendly format
- Created synchronized filters between the calorie history chart and meal logs table
- Enhanced UI with hover states, proper spacing, and clear visual hierarchy
- Fixed data types to ensure correct calculations and avoid "NaN" display values
- Built nutrition summary statistics (average calories, protein/carbs/fat totals)
- Implemented a nutritional breakdown visualization with color-coded macro percentages

### PWA and Update Notification Improvements
- Fixed issue with repeated update notifications by implementing a cooldown mechanism
- Created a user-friendly update notification component to replace browser confirm dialogs
- Updated the service worker to use versioning for better cache management
- Implemented different caching strategies for different types of content (HTML vs static assets)
- Added proper type definitions for PWA-related interfaces
- Enhanced mobile detection for PWA installation prompts
- Created standardized manifest.json with proper metadata and icons
- Added offline support through service worker caching

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

### Meal Plan View Improvements
- Fixed meal log status detection by changing database table query from 'logged_meals' to 'meal_logs'
- Added error logging for meal logs queries to help with debugging
- Moved the meal logging buttons from the header to the bottom of each meal card
- Improved button UI with explicit text labels ("Log this meal" and "Remove from log")
- Enhanced visual feedback with better button styling (green for logging, red for removing)
- Maintained the logged meal checkmark indicator in the meal title section

### Missed Meals Notification System
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

## Current Focus: Marketing and Professional Landing Page

We've implemented a comprehensive landing page to enable coaches to effectively market their services and showcase their expertise:

1. **Professional Landing Page**
   - Created a visually appealing homepage with sections for coach bio, services, testimonials, and social media
   - Implemented modern design elements with gradient backgrounds, card layouts, and responsive components
   - Added a prominent call-to-action to encourage visitor engagement and conversions
   - Ensured compatibility with both light and dark modes

2. **Coach Bio Showcase**
   - Created a dedicated "About Me" section with competition photo and professional credentials
   - Implemented a bio that emphasizes the coach's bodybuilding experience and coaching philosophy
   - Added visual indicators for key coaching attributes (competition experience, evidence-based, results-driven)
   - Designed the layout to create immediate credibility and connection with potential clients

3. **Package Offerings and Pricing**
   - Implemented a clear pricing structure with four distinct package options
   - Created visually distinct cards to showcase different service tiers
   - Added detailed "What's included" lists for each package
   - Highlighted the featured package with accent colors and styling

4. **Social Media Integration**
   - Added direct links to Instagram, Facebook, YouTube, and TikTok profiles
   - Implemented professional icon styling with hover effects
   - Created a dedicated Instagram Reels section to showcase the coach's content
   - Implemented proper embed components that load Instagram's embed script dynamically

## Active Decisions

1. **Landing Page Strategy**
   - Making the landing page the default route for visitors to immediately showcase coach credentials
   - Creating clear pathways to sign up or log in from multiple points on the page
   - Emphasizing the coach's competition experience and bodybuilding credentials
   - Using Instagram embeds to provide social proof and show the coach's content style

2. **Visual Design Approach**
   - Implementing a dark, fitness-focused color scheme with indigo accents
   - Using gradients and shadows to create depth and visual interest
   - Placing the coach's competition photo prominently in multiple sections
   - Creating consistent visual patterns across sections for brand cohesion

3. **Technical Implementation**
   - Creating a reusable InstagramEmbed component for handling social media integration
   - Using React's useEffect hook to properly load Instagram's embed script
   - Implementing responsive layouts that adapt to various screen sizes
   - Ensuring proper TypeScript typing for all components

## Next Steps

1. **Analytics Integration**
   - Implement tracking for landing page engagement and conversions
   - Add event tracking for package clicks and social media interactions
   - Create funnel analysis for visitor-to-signup journey

2. **Testimonial Enhancement**
   - Replace placeholder testimonials with real client feedback
   - Add before/after transformation photos
   - Implement a testimonial carousel for mobile devices

3. **Content Management**
   - Create an admin interface for updating homepage content
   - Implement a media library for managing photos and videos
   - Add the ability to change pricing and package details dynamically

## Recent Changes

### Homepage and Landing Page Implementation
- Created a professional homepage with sections for coach bio, services, Instagram content, and call-to-action
- Implemented a detailed "About Me" section showcasing the coach's IFBB bodybuilding experience
- Added package offerings with clear pricing and feature details ($40/month app access, $200 custom plan, $700 12-week transformation, $50/week premium coaching)
- Integrated Instagram embeds using a custom React component that handles the Instagram embed script
- Added social media links to Instagram, Facebook, YouTube, and TikTok (@brunoifbb)
- Implemented responsive design that works across desktop, tablet, and mobile devices
- Created visually appealing UI with gradient backgrounds, card layouts, and professional styling
- Added proper dark/light mode support throughout the landing page
- Implemented clear navigation and call-to-action buttons for visitor conversion

## Current Focus

We are currently enhancing the meal planning functionality in the ENG app. The most recent improvements include:

### Meal Planner Management Features
We've added comprehensive meal management capabilities to the `MealPlannerIntegrated` component:

1. **Meal Reordering**: Implementation of up/down arrow controls to reorder meals within a day type
   - Implemented in `handleMoveMealUp` and `handleMoveMealDown` functions
   - Updates `order_in_plan` values in the database
   - Provides immediate visual feedback with arrow buttons that change color on hover

2. **Meal Editing**: Creation of modal dialog for editing existing meal properties
   - Edit meal name, time suggestion, day type, description, and notes
   - Uses the same UI components as the meal creation flow for consistency
   - Updates are saved directly to the database via Supabase

3. **Meal Deletion**: Addition of deletion capability with confirmation dialog
   - Includes a confirmation dialog to prevent accidental deletions
   - Properly removes the meal and associated food items from the database
   - Uses a distinct red color scheme to indicate destructive action

4. **Time Format Standardization**: Conversion from 12-hour (AM/PM) to 24-hour time format for consistency
   - Changed hour selection from 1-12 to 00-23 range
   - Removed AM/PM selector for a cleaner interface
   - Updated time presets to use 24-hour format (e.g., "19:30" instead of "7:30 PM")
   - Modified time parsing and formatting functions to handle 24-hour time

5. **Enhanced Time Picker**: Implementation of a structured time picker with hour/minute dropdowns in 24-hour format
   - Added hour and minute dropdowns to the time picker for better time selection
   - Updated time parsing and formatting functions to handle 24-hour time

6. **UI/UX Improvements**: General styling enhancements to the meal planner interface
   - Added better spacing, consistent button styling, and improved layout
   - Enhanced average nutrition calculation to properly account for different day types

7. **Average Nutrition Calculation**: Improved calculation of average nutrition values by day type
   - Updated meal logging logic to use meal_logs table for better data organization
   - Fixed caching issues where meal items would disappear when switching between meal days
   - Added TypeScript interfaces and types to ensure proper type safety

## Recent Decisions

- Adopted 24-hour time format for international compatibility and clarity
- Used modals for complex operations to maintain a clean main interface
- Implemented stopPropagation in button click handlers to prevent unwanted behavior
- Added confirmation for destructive actions like deletion

## Current Tasks

- Test the new meal management features across different devices
- Consider enhancing the mobile experience for these features
- Identify any performance optimizations for large meal plans
- Review accessibility of the new UI elements

## Current Focus
We are currently enhancing the meal planning functionality within the nutrition module of the ENG application. Recent work has focused on improving the user experience for meal management, including:

1. **Meal Reordering**: Implementation of up/down arrow controls to reorder meals within a day type
2. **Meal Editing**: Creation of modal dialog for editing existing meal properties
3. **Meal Deletion**: Addition of deletion capability with confirmation dialog
4. **Time Format Standardization**: Conversion from 12-hour (AM/PM) to 24-hour time format for consistency
5. **Enhanced Time Picker**: Implementation of a structured time picker with hour/minute dropdowns in 24-hour format
6. **UI/UX Improvements**: General styling enhancements to the meal planner interface
7. **Average Nutrition Calculation**: Improved calculation of average nutrition values by day type

## Recent Changes

### MealPlannerIntegrated Component
The `MealPlannerIntegrated.tsx` component has undergone significant enhancement:

- Added reordering functionality using `updateMealOrder` Supabase function
- Implemented edit meal functionality with a modal dialog that supports:
  - Changing meal name
  - Updating time suggestion (using 24-hour format)
  - Modifying day type
  - Adding/editing description and notes
- Added delete meal functionality with confirmation dialog
- Converted time picker from 12-hour to 24-hour format
- Enhanced UI with better spacing, consistent button styling, and improved layout
- Improved average nutrition calculation to properly account for different day types
- Fixed caching issues where meal items would disappear when switching between meal days
- Added TypeScript interfaces and types to ensure proper type safety

### Supabase Database Interactions
- Utilizing `order_in_plan` field to manage meal sequence
- Implementing proper transaction handling for data operations
- Optimistic UI updates with subsequent backend confirmation
- Error handling with user feedback via toast notifications

## Next Steps

### Short-term Priorities
1. Address remaining TypeScript linter errors in the MealPlannerIntegrated component
2. Consider implementing drag-and-drop functionality for more intuitive meal reordering
3. Explore bulk operations for meals (e.g., bulk delete, duplicate)
4. Further enhance the UI with animations for smoother transitions

### Medium-term Goals
1. Implement meal templates for quick creation of common meal configurations
2. Add nutritional goal tracking against meal plans
3. Develop print/export functionality for meal plans
4. Integrate with shopping list functionality

## Active Decisions
1. Using 24-hour format for all time inputs and displays for global consistency
2. Following modal pattern for complex forms and confirmation dialogs
3. Implementing optimistic UI updates for better perceived performance
4. Structuring meal management with day types as the primary organization method

## Current Challenges
1. Some TypeScript linter errors related to property types and function parameters
2. Need for better responsive design on smaller screen sizes
3. Ensuring consistent state management across complex operations
4. Performance optimization with larger meal plans

## Technical Considerations
1. Proper use of React hooks and dependencies to prevent render issues
2. Consistent error handling and user feedback mechanisms
3. Type safety across component boundaries
4. Optimized database queries to reduce latency

## Current Focus

We're enhancing the ENG app's supplement management and meal planning features:

1. **Supplement Assignment List Performance**
   - Implemented search functionality to replace loading all assignments at once
   - Added a search-based approach that only loads data when queried
   - Improved UI with search guidance and "no results" state

2. **Meal Planning Smart Selection**
   - Enhanced MealLoggingWidget to automatically select day types based on workout schedule
   - Added workout detection logic to sync nutrition with training
   - Implemented intelligent fallback options

3. **Database Constraints Solution**
   - Identified constraint issue in athlete_supplements table that prevented multiple assignments of the same supplement
   - Proposed SQL solution to modify the unique constraint to include start_date

## Recent Changes

- Created searchAthleteSupplementAssignments service function to enable filtered loading of supplement assignments
- Implemented dynamic search functionality in the SupplementAssignmentList component
- Added workout detection logic to MealLoggingWidget to select appropriate day types
- Fixed case sensitivity issue in day type comparison (using lowercase for "training" and "rest")

## Next Steps

- Execute the SQL commands to update the database constraint for athlete_supplements
- Enhance the edit functionality for supplement assignments with proper type handling
- Consider implementing more comprehensive search capabilities including partial matches
- Test the workout-based day type selection across different user scenarios