# Earned Not Given (ENG) App

> **Tagline:** *Earned Not Given — progress you can measure, effort you can track.*

---

## 1 · Overview & Scope

The **ENG App** is a full‑stack web application built with **React 18 + Vite** that helps coaches deliver evidence‑based bodybuilding programs and nutrition plans while giving athletes a single, data‑driven portal for progress tracking.

### Core Objectives

| # | Objective                                                                                                                                                                   |
| - | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | **Admin CMS** – manage users, program templates, nutrition plans & step‑goal assignments.                                                                                   |
| 2 | **Exercise & Food DB integration** – pull exercises from a public API; pull food & nutrient data from the **Australian Food Composition Database (AFCD, formerly NUTTAB)**. |
| 3 | **Athlete Dashboard** – users log in to view their profile, assigned training block, meal plan, step goals, and current stats.                                              |
| 4 | **Onboarding Workflow** – collect detailed lifestyle & training info (see §3) and store it in the user profile.                                                             |
| 5 | **Weekly Check‑Ins** – upload progress photos/videos, body measurements, wellness metrics and program adherence.                                                            |
| 6 | **Responsive PWA** – mobile‑first UX with offline caching for workout pages.                                                                                                |

---

## 2 · Tech Stack

| Layer             | Technology                                   | Notes                             |
| ----------------- | -------------------------------------------- | --------------------------------- |
| **Frontend**      | React 18 (Vite), TypeScript, React Router v6 | SPA — code‑split routes           |
|                   | State: Zustand or Redux Toolkit              | Persist to IndexedDB              |
|                   | Styling: Tailwind CSS (utility‑first)        | Dark mode built‑in                |
|                   | Form UI: React Hook Form + Zod               | Schema‑based validation           |
| **Backend / API** | Supabase or Node + Express + PostgreSQL      | Auth, storage, row‑level security |
| **Integrations**  | • Exercise DB (API) • AFCD CSV ↔ postgres    |                                   |
| **CI/CD**         | GitHub Actions → Vercel/Netlify              | Preview deploys                   |
| **Testing**       | Vitest + React Testing Library               | 80 % coverage target              |

---

## 3 · Data Models (high‑level)

```text
User
 ├─ profile: age, weight, height, bodyFat%, goals…
 ├─ stepGoal (dailySteps)
 ├─ program → ProgramTemplate
 ├─ mealPlan → NutritionPlan
 └─ checkIns[]

ProgramTemplate
 ├─ name, phase, weeks
 └─ workouts[] → ExerciseInstance (linked to Exercise DB id)

NutritionPlan
 ├─ name, totalCalories, macros
 └─ meals[] → FoodItem (linked to AFCD id)

CheckIn
 ├─ date, photos[], video?
 ├─ bodyMetrics (measurements, weight)
 ├─ wellnessMetrics (sleep, stress, fatigue…)
 └─ adherence (diet, training, steps, notes)
```

---

## 4 · User Flows

1. **Signup / Invite** → email login (Supabase magic‑link) → forced onboarding form.
2. **Onboarding Survey** — collects:
   - Demographics (age, weight, height, body‑fat %)
   - Goal specifics (target fat loss, timeframe, weight/physique goal)
   - Training habits (days/week, current program, equipment, session length, intensity)
   - Nutrition habits & struggles (meal patterns, calories/macros tracking, dietary prefs/allergies)
   - Lifestyle (sleep hrs, stress lvl, water intake, weekday vs weekend schedule)
   - Supplements/meds, motivation & change readiness
3. **Coach Admin** assigns: program template, nutrition plan, daily step goal.
4. **Athlete Dashboard** shows live widgets: next workout, today's macros, step progress, upcoming check‑in.
5. **Weekly Check‑In** → athlete submits data & media → coach reviews in admin portal → feedback comment.

---

## 5 · Pages / Components (MVP)

| Route           | Component(s)                                               | Access             |
| --------------- | ---------------------------------------------------------- | ------------------ |
| `/admin`        | UserManager, ProgramBuilder, MealPlanner, StepGoalSetter   | Coach only         |
| `/login`        | AuthForm                                                   | Public             |
| `/onboarding`   | OnboardWizard                                              | Auth (first login) |
| `/dashboard`    | StatCards, ProgramPreview, MealPlanPreview, StepGoalWidget | User               |
| `/check‑in/new` | CheckInForm, MediaUploader                                 | User               |
| `/history`      | CheckInTimeline, Charts                                    | User               |

---

## 6 · APIs & Data Sources

- **Exercise DB**: `https://svc.heygainz.com/api/exercises` (extensive exercise database with detailed data and search capabilities). Cache locally for offline.
- **AFCD/NUTTAB**: download latest CSV → ingest into backend (table `food_items`).
- **Image/Video Storage**: Supabase Storage or S3 bucket.

---

## 7 · Local Setup

```bash
npm create vite@latest eng-app -- --template react-ts
cd eng-app
npm install
cp .env.example .env   # add SUPABASE_URL, SUPABASE_ANON_KEY, etc.
npm run dev           # http://localhost:5173
```

---

## 8 · Roadmap

-

---

## 9 · Contributing Guidelines (internal)

1. Create feature branch → PR → review → squash‑merge.
2. All components in TypeScript with strict mode, unit tests required.
3. Commit prefixes: `feat:`, `fix:`, `docs:`, `refactor:`.
4. Run `npm run lint && npm run test` before PR.

---

## 10 · License

© 2025 Earned Not Given Coaching.  MIT License (TBC).

