# Progress: ENG App

## Current Status

*   **Phase 6 (Admin CMS Implementation):** Implementing basic forms/save logic for `MealPlanner` and `StepGoalSetter`.

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
*   **Phase 6: Admin CMS** (Partially Implemented)
    *   Admin routing, layout, role protection created.
    *   `UserManager`: List, View (fetch full details), Add Athlete (simulated invite) implemented. Edit/Assign pending.
    *   `ProgramBuilder`: List, Create/Edit form & save logic for template details implemented. Workout/Exercise management implemented.
    *   Basic list/fetch logic in `MealPlanner`, `StepGoalSetter`, `CheckInReview`.
*   **Phase 7: PWA & Offline Caching** (Setup Complete - Testing Pending)
    *   `vite-plugin-pwa` configured with manifest and basic service worker caching.
    *   `redux-persist` configured to save `auth` state to IndexedDB.
    *   `PersistGate` implemented.
*   **Phase 8: Testing & CI/CD** (Setup Complete - Implementation Pending)
    *   Vitest configured with RTL setup.
    *   Basic unit test for `FormInput` created.
    *   Basic GitHub Actions CI workflow (`ci.yml`) created (lint, test).
*   **Phase 9: Finalization & Documentation** (Partial - Layout/Nav Done)
    *   Main application layout (`MainLayout`, `Header`, `Footer`) implemented.
    *   Basic navigation structure and Logout functionality added.

## What's Left to Build

*   **Phase 5: Weekly Check-ins & History**
    *   Progress Charts.
*   **Phase 6: Admin CMS** (Implementation)
    *   Finish `UserManager` (edit form, assign roles/coach).
    *   Finish `ProgramBuilder` (wger search/linking, nested saves refinement).
    *   Full implementation of `MealPlanner` (create/edit plans, meals, food items + AFCD linking).
    *   Full implementation of `StepGoalSetter` (save/update logic).
    *   Full implementation of `CheckInReview` (detail view, feedback).
*   **Phase 7: PWA & Offline Caching**
    *   Runtime caching, offline testing, PWA icons.
*   **Phase 8: Testing & CI/CD** (Implementation)
    *   Writing comprehensive tests.
    *   Setting up CD pipeline.
*   **Phase 9: Finalization & Documentation**
    *   Overall UI/UX refinement.
    *   Implement deferred features (Charts).
    *   Address Known Issues.
    *   Final documentation review.

## Known Issues

*   High severity vulnerability reported during `vite-plugin-pwa` install.
*   Onboarding form `FormInput` duplication.
*   Check-in form adherence fields need better input type.
*   Check-in form error handling for partial failures.
*   `StepGoalWidget` progress display is placeholder.
*   Admin components require further implementation (nested data, complex forms, saves).
*   Admin `UserProfileFull` type needs refinement.
*   Admin list views lack pagination.
*   Coach/Athlete linking mechanism in DB/Admin UI needs implementation. 