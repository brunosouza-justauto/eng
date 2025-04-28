# Progress: ENG App

## Current Status

*   **Phase 8 (Testing & CI/CD):** Setting up initial testing configurations and CI workflow.

## What Works

*   **Phase 0: Project Setup & Configuration** (Completed)
*   **Phase 1: Backend Setup (Supabase)** (Completed)
*   **Phase 2: Core Frontend & Authentication** (Completed)
    *   React Router setup implemented.
    *   Redux store setup with auth slice.
    *   Login Page component created and functional (Magic Link).
    *   Protected Routes implemented.
*   **Phase 3: Onboarding & User Profile** (Completed)
    *   Multi-step onboarding wizard (`OnboardingWizard` + Step components) created.
    *   Zod schema (`onboardingSchema`) defined for validation.
    *   Form state managed with `react-hook-form` and `zodResolver`.
    *   Per-step validation implemented.
    *   Collected data saved to Supabase `profiles` table on submit.
    *   `onboarding_complete` flag set in DB and Redux state updated.
    *   Enforced redirection to onboarding for incomplete profiles.
*   **Phase 4: Athlete Dashboard & Core Features** (Completed)
    *   Dashboard page layout and widgets created.
    *   Fetching and display of assigned plans/goals implemented.
    *   Exercise DB service created with basic caching.
    *   Detail view components (`WorkoutView`, `MealPlanView`) created with data fetching.
    *   Navigation between dashboard and detail views implemented.
    *   Wger exercise data integrated into `WorkoutView`.
*   **Phase 5: Weekly Check-ins & History** (Substantially Complete - Charting Deferred)
    *   Check-in page and form structure created.
    *   Zod schema defined for check-in data.
    *   Form fields implemented for metrics, wellness, adherence, notes.
    *   Media (photo/video) upload to Supabase Storage integrated.
    *   Submission logic saves data to `check_ins`, `body_metrics`, `wellness_metrics` tables.
    *   History page created.
    *   `CheckInTimeline` component fetches and displays past check-ins with media.
*   **Phase 6: Admin CMS** (Structure Complete - Implementation Pending)
    *   Admin routing, role-based access control (`AdminRoute`), and layout (`AdminLayout`) created.
    *   Placeholder components created for `UserManager`, `ProgramBuilder`, `MealPlanner`, `StepGoalSetter`, `CheckInReview`.
    *   Basic user list implemented in `UserManager` with detail view modal structure.
*   **Phase 7: PWA & Offline Caching** (Setup Complete - Testing Pending)
    *   `vite-plugin-pwa` configured with manifest and basic service worker caching.
    *   `redux-persist` configured to save `auth` state to IndexedDB.
    *   `PersistGate` implemented.

## What's Left to Build

*   **Phase 5: Weekly Check-ins & History**
    *   Progress Charts component and integration (Deferred to Phase 9).
*   **Phase 6: Admin CMS** (Implementation)
    *   Full implementation of User Management, Program Builder, Meal Planner, Step Goal Setter, Check-in Review.
*   **Phase 7: PWA & Offline Caching**
    *   Detailed configuration of service worker caching strategies (runtime caching).
    *   Testing of offline functionality.
    *   Creation of PWA icons.
*   **Phase 8: Testing & CI/CD** (Implementation)
    *   Writing unit/integration tests for components, services, reducers.
    *   Setting up GitHub Actions workflow for CI (lint, test, build).
    *   Setting up CD pipeline (deployment to Vercel/Netlify).
*   **Phase 9: Finalization & Documentation** (Including UI polish, Charts)

## Known Issues

*   High severity vulnerability reported during `vite-plugin-pwa` install (needs audit/update).
*   Onboarding form `FormInput` component duplication (can be refactored later).
*   Basic UI styling - detailed styling deferred to Phase 9.
*   Check-in form adherence fields use basic text input (consider select/radio).
*   Error handling for partial failures during check-in submission (e.g., DB insert fails after upload).
*   Current step progress display/tracking in `StepGoalWidget` is placeholder.
*   Admin components are placeholders requiring full implementation. 