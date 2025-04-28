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
*   **Environment Variables:** Sensitive keys (Supabase URL, Anon Key, Service Role Key, wger API Key) must be managed via `.env` file and not committed to the repository. The `SUPABASE_SERVICE_KEY` is required only for backend/scripting tasks (like AFCD ingestion).
*   **TypeScript Strict Mode:** Code must adhere to strict TypeScript rules.
*   **Nutrient Basis:** The `food_items` table contains a `nutrient_basis` column ('100g' or '100mL') indicating the unit basis for stored nutrient values. Frontend calculations must account for this.

## 4. External Dependencies & Integrations

*   **Exercise Database API:** `wger.de/api` (using API Key: `a2c13d1153d9975e991ddcd5a79e67493b6b5d25`). Requires caching strategy for performance and offline use.
*   **Australian Food Composition Database (AFCD):** Data ingested from the official Excel file (`afcd_data.xlsx`) using a one-time Node.js script (`scripts/ingest-afcd.js`). The script processes sheets for both 'per 100g' and 'per 100mL', setting the `nutrient_basis` column accordingly.
*   **Image/Video Storage:** Supabase Storage.
*   **Deployment Platform:** TBD (Vercel or Netlify via GitHub Actions).

## 5. Contribution Workflow

*   **Branching:** Feature branches based off the main development branch.
*   **Commits:** Use conventional commit prefixes (`feat:`, `fix:`, `docs:`, `refactor:`).
*   **Pull Requests:** Submit PRs for review, ensuring linting and tests pass.
*   **Merging:** Squash and merge strategy preferred. 