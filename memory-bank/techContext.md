# Tech Context: ENG App

## 1. Core Technologies

*   **Frontend Framework:** React 18 (using Vite for build tooling)
*   **Language:** TypeScript (with strict mode enforced)
*   **Routing:** React Router v6
*   **State Management:** Redux Toolkit
*   **Styling:** Tailwind CSS
*   **Forms & Validation:** React Hook Form + Zod
*   **Backend:** Supabase (PostgreSQL)
*   **Database:** PostgreSQL (via Supabase)
*   **Testing:** Vitest + React Testing Library

## 2. Development Setup

*   **Package Manager:** npm
*   **Initialization:** (Commands executed during Phase 0)
*   **Linting & Testing:**
    ```bash
    # Run linters and tests (required before submitting Pull Requests)
    npm run lint && npm run test
    ```

## 3. Technical Constraints & Considerations

*   **Target Test Coverage:** 80% via Vitest/RTL.
*   **Offline Capability:** Requires careful state management (persisted to IndexedDB) and Service Worker configuration for PWA functionality, especially for workout pages and current meal plan.
*   **Environment Variables:** Sensitive keys (Supabase URL, Anon Key, Service Role Key) must be managed via `.env` file and not committed to the repository. The `SUPABASE_SERVICE_KEY` is required only for backend/scripting tasks (like AFCD ingestion).
*   **TypeScript Strict Mode:** Code must adhere to strict TypeScript rules.
*   **Nutrient Basis:** The `food_items` table contains a `nutrient_basis` column ('100g' or '100mL') indicating the unit basis for stored nutrient values. Frontend calculations must account for this.

## 4. External Dependencies & Integrations

*   **Exercise Database API:** `https://svc.heygainz.com/api/exercises` API for accessing exercise data. The API provides endpoints for listing exercises, searching exercises, and filtering by muscle groups. Requires caching strategy for performance and offline use.
*   **Australian Food Composition Database (AFCD):** Data ingested from the official Excel file (`afcd_data.xlsx`) using a one-time Node.js script (`scripts/ingest-afcd.js`). The script processes sheets for both 'per 100g' and 'per 100mL', setting the `nutrient_basis` column accordingly.
*   **Image/Video Storage:** Supabase Storage.
*   **Deployment Platform:** TBD (Vercel or Netlify via GitHub Actions).

## 5. Contribution Workflow

*   **Branching:** Feature branches based off the main development branch.
*   **Commits:** Use conventional commit prefixes (`feat:`, `fix:`, `docs:`, `refactor:`).
*   **Pull Requests:** Submit PRs for review, ensuring linting and tests pass.
*   **Merging:** Squash and merge strategy preferred.

## Key Technical Patterns

### State Management
- Redux store with slices for different domains (auth, workouts, etc.)
- React component state for UI-specific state
- Redux Toolkit for simplified Redux setup and operations

### Authentication
- Passwordless authentication with Supabase magic links
- Protected routes with authentication checks
- Auth state persisted in Redux store

### API Interactions
- Axios for HTTP requests
- Service layer pattern for organizing API calls
- Response caching for performance optimization

### CSS and Styling
- Tailwind CSS for utility-first styling
- Dark mode implementation with class strategy
- Custom components defined in `@layer components`
- Mobile-first responsive design with sm/md/lg breakpoints
- Consistent spacing using Tailwind's built-in scale
- Using `hidden sm:block` pattern for responsive visibility

### Responsive Techniques
- Fixed positioning with explicit coordinates for floating UI
- Using percentage-based widths for table columns
- Strategic hiding of less critical elements on mobile
- Optimizing input fields with `w-full` for adaptive sizing
- Using `max-w-[90%]` pattern for constraining width on mobile
- `pointer-events-none` to prevent UI overlays from interrupting interactions

## Database Structure

- Supabase PostgreSQL for data storage
- Key tables:
  - users
  - profiles
  - workouts
  - exercise_instances
  - exercise_sets
  - workout_sessions
  - completed_exercise_sets

## Deployment

- Vercel for production hosting
- Supabase for backend infrastructure

## Technical Constraints

- Browser compatibility: Modern browsers only (Chrome, Firefox, Safari, Edge)
- Mobile support: iOS 12+, Android 8+
- Connection requirement: Online functionality with limited offline capabilities 