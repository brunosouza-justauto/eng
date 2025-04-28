# Product Context: ENG App

## 1. Problem Solved

Coaches lack integrated tools to deliver personalized, evidence-based bodybuilding/nutrition plans and track client progress effectively. Athletes often juggle multiple apps or spreadsheets, lacking a single source of truth for their training, nutrition, and progress data.

The ENG App aims to bridge this gap by providing a unified platform for both coaches and athletes.

## 2. How It Works (User Flows)

1.  **Signup/Invite & Onboarding:**
    *   Users sign up or are invited via email (using Supabase magic links).
    *   First login triggers a mandatory, comprehensive onboarding survey to gather detailed personal, goal, training, nutrition, and lifestyle information.
    *   This data populates the user's profile.
2.  **Coach Assignment:**
    *   Admins (coaches) use the CMS to assign specific program templates, nutrition plans, and daily step goals to users.
3.  **Athlete Engagement:**
    *   Athletes log in to their dashboard.
    *   The dashboard displays key information via widgets: upcoming workout, daily macro targets/progress, step goal progress, and reminders for the next check-in.
4.  **Progress Tracking (Weekly Check-Ins):**
    *   Athletes submit a weekly check-in form, including progress photos/videos, body measurements, weight, wellness ratings (sleep, stress, etc.), and adherence notes (diet, training, steps).
    *   Coaches review submissions in the admin portal and provide feedback.

## 3. User Experience Goals

*   **Coach:** Efficiently manage multiple clients, create/assign resources (programs, meal plans), and monitor progress with actionable data.
*   **Athlete:** Clear visibility into their assigned plans, easy logging of workouts and check-ins, and a motivational overview of their progress.
*   **Overall:** A responsive, mobile-first Progressive Web App (PWA) experience, ensuring accessibility and usability across devices, including offline access for core workout functionality.

## 4. Key Pages/Views (MVP)

*   **Admin (`/admin`):** User management, Program Builder, Meal Planner, Step Goal Setter.
*   **Login (`/login`):** Authentication form.
*   **Onboarding (`/onboarding`):** Multi-step survey wizard.
*   **Dashboard (`/dashboard`):** Overview widgets for stats, program, meals, steps.
*   **New Check-In (`/check-in/new`):** Check-in form with media upload.
*   **History (`/history`):** Timeline of past check-ins, potentially with charts. 