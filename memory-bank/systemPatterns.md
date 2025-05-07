# System Patterns: ENG App

## 1. Architecture Overview

*   **Full-Stack Web Application:** Single Page Application (SPA) frontend with a backend API.
*   **Frontend:** React 18 + Vite, TypeScript, React Router v6 for client-side routing with code-splitting.
*   **Backend/API:** Supabase (BaaS) providing Authentication, PostgreSQL Database (with Row-Level Security), and Storage.
*   **State Management:** Redux Toolkit, with persistence to IndexedDB for offline capabilities (workout data, current meal plan).
*   **Styling:** Tailwind CSS (utility-first approach), including built-in dark mode support.
*   **Forms:** React Hook Form paired with Zod for schema-based validation.
*   **Deployment:** Continuous Integration/Continuous Deployment (CI/CD) via GitHub Actions, deploying to Vercel or Netlify (TBD), including preview deployments.

## 2. Key Technical Decisions & Patterns

*   **Mobile-First Responsive PWA:** The application must be designed for mobile devices primarily and function as a Progressive Web App, including offline caching for specific routes (e.g., workout pages, current meal plan).
*   **Component-Based UI:** Leverage React's component model.
*   **Utility-First CSS:** Use Tailwind CSS for styling.
*   **Schema-Driven Forms:** Employ Zod for robust form validation.
*   **API Integration:** Connect to external APIs (HeyGainz Exercise API) and ingest data from external sources (AFCD Excel file).
*   **Database:** Supabase PostgreSQL with Row Level Security (RLS) enforced.
*   **Authentication:** Supabase Auth using Email Magic Link.
*   **Data Ingestion:** One-time script (`scripts/ingest-afcd.js`) used to populate `food_items` from the AFCD Excel source.

## 3. Data Models (High-Level)

```text
// User Centric Model
User
 ├─ profile: (age, weight, height, bodyFat%, goals, demographics, training habits, nutrition habits, lifestyle info, supplements/meds, motivation)
 ├─ stepGoal: (dailySteps: number)
 ├─ program: (ref → ProgramTemplate)
 ├─ mealPlan: (ref → NutritionPlan)
 └─ checkIns: (array → CheckIn)

// Program Structure
ProgramTemplate
 ├─ name: string
 ├─ phase: string
 ├─ weeks: number
 └─ workouts: (array → ExerciseInstance) // Linked to Exercise DB ID

// Nutrition Structure
NutritionPlan
 ├─ name: string
 ├─ totalCalories: number
 ├─ macros: { protein: number, carbs: number, fat: number }
 └─ meals: (array → MealFoodItem → FoodItem) // Linked to AFCD ID via FoodItem

FoodItem // Populated from AFCD, stored in `food_items` table
 ├─ id: uuid
 ├─ afcd_id: text (unique)
 ├─ food_name: text
 ├─ food_group: text
 ├─ calories_per_100: float8 // Note: Based on nutrient_basis
 ├─ protein_per_100: float8  // Note: Based on nutrient_basis
 ├─ carbs_per_100: float8    // Note: Based on nutrient_basis
 ├─ fat_per_100: float8      // Note: Based on nutrient_basis
 ├─ fiber_per_100: float8    // Note: Based on nutrient_basis
 ├─ serving_size_g: float8
 ├─ serving_size_unit: text
 └─ nutrient_basis: text ('100g' or '100mL') // Indicates unit for nutrient values

MealFoodItem // Junction table: links Meal to FoodItem with quantity
 ├─ meal_id: uuid
 ├─ food_item_id: uuid
 ├─ quantity: float8
 └─ unit: text (e.g., 'g', 'slice', 'cup')

// Check-in Details
CheckIn
 ├─ date: timestamp
 ├─ photos: (array → URL/storage ref)
 ├─ video?: (URL/storage ref)
 ├─ bodyMetrics: { weight: number, measurements: object } // Specific measurements TBD
 ├─ wellnessMetrics: { sleep: number, stress: number, fatigue: number } // Ratings or specific metrics TBD
 └─ adherence: { diet: string, training: string, steps: string, notes: string } // Could be ratings or text
```

*Notes:*
*   The `food_items` table now includes a `nutrient_basis` column. Frontend logic must check this field when displaying or calculating nutrition based on these items.
*   Specific fields within `profile`, `bodyMetrics`, `wellnessMetrics`, and `adherence` require further definition based on the onboarding survey and check-in form details. 

## 4. Dark/Light Mode Implementation Pattern

The application follows a modern React architecture with the following key patterns:

* **Frontend Framework**: React with TypeScript
* **State Management**: Redux with Redux Toolkit
* **Routing**: React Router
* **Forms**: react-hook-form with Zod validation
* **Styling**: Tailwind CSS with custom theme configuration
* **Backend**: Supabase (PostgreSQL + Auth + Storage)
* **Testing**: Vitest with React Testing Library
* **Build Tool**: Vite

### State Management

1. **Redux Store Structure**
   * Feature-based slices
   * Authentication state in `authSlice`
   * User profile data in `profileSlice`
   * Application UI state in `uiSlice`
   * Persisted state with `redux-persist`

2. **API Integration**
   * Custom hooks for data fetching
   * Services for specific API domains (exercises, meals, etc.)
   * Redux Toolkit Query for cached data interactions

### Component Architecture

1. **Page Components**
   * Container components for data fetching and state management
   * Connected to Redux store
   * Manage routing logic
   * Handle authentication/authorization checks

2. **UI Components**
   * Presentational components receiving props
   * Reusable design system elements
   * Styled with Tailwind CSS utilities

3. **Layout Components**
   * Provide consistent structure across pages
   * Handle responsive design adjustments
   * Manage navigation elements

### Routing

1. **Protected Routes**
   * Auth-required routes wrapped in protection
   * Role-based route access (admin, coach, athlete)
   * Redirect logic for unauthorized access

2. **Nested Routes**
   * Feature-based route organization
   * Shared layouts for related routes
   * Route parameters for dynamic content

### Form Handling

1. **Form Validation**
   * Zod schemas for type validation
   * react-hook-form for form state management
   * Custom validation error messages
   * Field-level error handling

2. **Form Components**
   * Reusable input components with consistent styling
   * Form groups for related fields
   * Support for various input types (text, select, radio, etc.)

### Theme System

1. **Dark/Light Mode Toggle**
   * Theme state stored in Redux `uiSlice`
   * User preference persisted in localStorage
   * System preference detection with media query
   * Theme applied through Tailwind CSS classes on the root element
   * Smooth transitions between themes with CSS variables

2. **CSS Variables**
   * Theme colors defined as CSS variables
   * Applied to HTML element based on current theme
   * Consistent color application across components
   * Support for both light and dark modes with appropriate contrast

## Component Relationships

```mermaid
flowchart TD
    App --> Auth[Auth System]
    App --> Layout[Layout Components]
    App --> Router[React Router]
    
    Auth --> AuthSlice[Auth Slice]
    Auth --> SupabaseAuth[Supabase Auth]
    
    Layout --> Sidebar[Sidebar Navigation]
    Layout --> Header[Header Components]
    Layout --> Footer[Footer Components]
    Layout --> ThemeProvider[Theme Provider]
    
    ThemeProvider --> UISlice[UI Slice]
    
    Router --> ProtectedRoutes[Protected Routes]
    Router --> PublicRoutes[Public Routes]
    
    ProtectedRoutes --> Dashboard[Dashboard Page]
    ProtectedRoutes --> Profile[Profile Pages]
    ProtectedRoutes --> Admin[Admin Pages]
    
    PublicRoutes --> Login[Login Page]
    PublicRoutes --> SignUp[SignUp Page]
    PublicRoutes --> LandingPage[Landing Page]
```

## Workout Session Architecture

The workout session timer and exercise demonstration system follows a sophisticated pattern to enhance the workout experience:

```mermaid
flowchart TD
    WorkoutSession[Workout Session Page] --> TimerSystem[Rest Timer System]
    WorkoutSession --> ExerciseList[Exercise List]
    WorkoutSession --> SessionControls[Session Controls]
    
    TimerSystem --> RestTimer[Rest Timer Display]
    TimerSystem --> AudioAlert[Audio Alert System]
    TimerSystem --> VibrationFeedback[Vibration Feedback]
    TimerSystem --> SpeechSystem[Speech Synthesis]
    
    RestTimer --> NextExercisePreview[Next Exercise Preview]
    NextExercisePreview --> ExerciseDemonstration[Exercise Demonstration]
    
    ExerciseList --> ExerciseAccordion[Exercise Accordion]
    ExerciseAccordion --> ExerciseDemonstration
    
    ExerciseDemonstration --> ImageCache[Exercise Image Cache]
    ImageCache --> HeyGainzAPI[HeyGainz API]
```

### Exercise Image System

1. **Global Cache Implementation**
   * Uses a global Map to cache exercise images
   * Prevents redundant API calls for the same exercise
   * Caches both by exercise ID and exercise name
   * Persists for the duration of the session

2. **Exercise Demonstration Component**
   * Wrapped in React.memo to prevent unnecessary re-renders
   * Lazy loading of images with loading state
   * Fallback UI for missing or failed images
   * Supports both exercise database IDs and name-based lookups
   * Displays appropriate indicators for GIF animations

3. **API Integration**
   * Primary lookup via fetchExerciseById for direct ID matches
   * Secondary fuzzy search for name-based matching
   * Error handling with appropriate fallbacks
   * Loading states for improved user experience

### Timer System

1. **Rest Timer Implementation**
   * Interval-based countdown with useRef for stability
   * Visual progress indication with percentage calculations
   * Special formatting for countdown display
   * Enhanced visual feedback during final countdown seconds
   * Pause/resume capabilities synchronized with workout state

2. **Multi-Sensory Feedback**
   * **Visual**: Animation, color changes, countdown display
   * **Audio**: End-of-timer sound, countdown beeps
   * **Tactile**: Vibration patterns for mobile devices
   * **Voice**: Speech synthesis announcements

3. **Speech Synthesis**
   * User permission prompt with persistent preference
   * Context-aware announcements based on next exercise or set
   * Visual fallback for browsers without speech support
   * Configurable through user toggle

4. **Mobile Integration**
   * Vibration API with feature detection
   * Different vibration patterns for different events
   * Mobile-specific optimizations for touch interactions

### User Interaction Patterns

1. **Exercise List Navigation**
   * Accordion pattern for viewing/hiding demonstrations
   * Set completion toggles with automatic timer triggering
   * Progress tracking through checkboxes
   * Visual indication of completed exercises

2. **Timer Controls**
   * Skip button for ending rest early
   * Automatic start on set completion
   * Visual countdown during final seconds
   * Next exercise preview for preparation

3. **User Preferences**
   * Voice feedback toggle with persistent storage
   * Permission-based features with clear user prompts
   * Accessibility considerations for all feedback types

### Data Flow

1. **Set Completion**
   * User marks set as complete
   * System checks for rest period requirement
   * Timer initialized with appropriate duration
   * Next exercise information gathered
   * Multi-sensory feedback begins

2. **Timer Completion**
   * Final countdown with enhanced feedback
   * Announcement of next exercise details
   * Return to workout view for next set
   * Audio alert signals timer end

3. **Exercise Demonstration**
   * On-demand loading via toggle
   * Cached images for performance
   * Loading states with spinners
   * Error states with appropriate fallbacks

## State Flow

```mermaid
flowchart TD
    User[User Action] --> Dispatch[Dispatch Action]
    Dispatch --> Reducer[Redux Reducer]
    Reducer --> State[Update State]
    State --> Selectors[Selectors]
    Selectors --> Components[Render Components]
    
    API[API Call] --> ThunkAction[Thunk Action]
    ThunkAction --> Dispatch
    
    LocalStorage[Local Storage] --> Persist[Redux Persist]
    Persist --> State
    State --> Persist
```

## Data Schema

Key application data schemas:

1. **User**
   * Basic authentication fields
   * Role-based permissions
   * Profile linkage

2. **Profile**
   * Detailed user information
   * Preferences and settings
   * Onboarding status

3. **Workouts**
   * Exercise collections
   * Scheduling data
   * Progress tracking

4. **Check-ins**
   * Regular progress updates
   * Measurements and metrics
   * Photos and media

5. **Goals**
   * Target objectives
   * Timeframes
   * Progress indicators

## Technical Decisions

1. **TypeScript** for type safety and developer experience
2. **Redux Toolkit** for simplified state management
3. **Supabase** for quick backend implementation
4. **Tailwind CSS** for rapid styling with consistent design
5. **Vite** for fast development and optimized builds
6. **React Router** for declarative routing
7. **PWA Support** for offline capabilities
8. **GitHub Actions** for CI/CD automation

## UI Architecture

### Layout Structure
- **Flex-based Layout Pattern**
  - Root container: `flex flex-col min-h-screen`
  - Main content wrapper: `flex flex-1 overflow-hidden`
  - Sidebar: Fixed width with responsive behavior
  - Content area: `flex-1 flex-col w-0 overflow-hidden`
  - Footer: Outside both sidebar and content for full-width display

- **Responsive Patterns**
  - Desktop: Sidebar and content side-by-side
  - Mobile: Hidden sidebar with slide-in behavior
  - State-based conditional rendering for optimized mobile experiences
  - Table view (desktop) vs. Card view (mobile) for data display

### Navigation
- **Sidebar Navigation**
  - Consistent `NavItem` component shared between layouts
  - Active state indicators with consistent styling
  - Context-specific sections with clear visual separation
  - Cross-navigation between Admin and Main layouts

- **Mobile Navigation**
  - Slide-in animation with transform and transition
  - Semi-transparent backdrop for focus
  - Close button for easy dismissal
  - Hamburger menu toggle in header

### Component Patterns

- **Card-based Content**
  - Consistent padding, border-radius, and shadows
  - White background with dark mode support
  - Clear section headers
  - Proper spacing between content blocks

- **Tables and Lists**
  - Desktop: Full table with all columns
  - Mobile: Card view with key information prominently displayed
  - Status indicators with consistent badge styling
  - Action buttons with appropriate visual hierarchy

- **Form Patterns**
  - Standardized input styling
  - Clear labels and error states
  - Grouped related fields
  - Responsive form layouts

- **Button Patterns**
  - Primary actions: Filled background with strong color
  - Secondary actions: Outlined or lighter background
  - Destructive actions: Red/warning colors
  - Touch-friendly sizing on mobile

## State Management

### Responsive State
- Window resize listener to detect screen size
- State variable to track mobile vs. desktop view
- Conditional rendering based on viewport size
- Responsive behavior without page refresh

### UI State
- Sidebar open/closed state
- Modal visibility state
- Loading and error states
- Filter and selection states

## Accessibility Patterns

- Semantic HTML structure
- Keyboard navigation support
- Screen reader-friendly labeling
- Color contrast compliance
- Focus indicators for interactive elements

## CSS Methodology

- Tailwind CSS utility-first approach
- Dark mode support with `dark:` variant classes
- Responsive design with breakpoint prefixes
- Component extraction for reusable patterns
- Consistent spacing and sizing scale 