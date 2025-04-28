# Active Context: ENG App

## Current Focus

*   **Phase 8: Testing & CI/CD:** Configuring Vitest and setting up a basic GitHub Actions workflow for Continuous Integration.

## Recent Changes

*   Completed **Phase 4 (Dashboard)**.
*   Substantially completed **Phase 5 (Check-ins & History)**.
*   Completed **Phase 6 (Admin CMS) Structure**.
*   Completed **Phase 7 (PWA & Offline Caching) Setup**: Configured vite-plugin-pwa and redux-persist.

## Next Steps

1.  Configure Vitest setup (e.g., in `vite.config.ts` or separate `vitest.config.ts`).
2.  Write initial basic unit tests for a simple component (e.g., `FormInput`) or utility function.
3.  Set up a basic GitHub Actions workflow (`.github/workflows/ci.yml`) to run on pushes/PRs.
4.  The workflow should checkout code, install dependencies (`npm ci`), run linters (`npm run lint`), and run tests (`npm run test`).

## Active Decisions & Considerations

*   Testing strategy: Focus on unit tests (Vitest/RTL), integration tests, or end-to-end tests (e.g., Playwright - maybe later)?
*   Target test coverage (initially set at 80%).
*   CI/CD platform choice (Vercel/Netlify mentioned - need final decision for CD setup later).
*   How to handle environment variables securely in CI/CD.