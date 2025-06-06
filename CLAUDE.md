# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The **ENG App** (Earned Not Given) is a full-stack bodybuilding and nutrition tracking web application built with React 18 + Vite and TypeScript. It provides coaches with a CMS to manage athletes, programs, and nutrition plans, while giving athletes a comprehensive portal for progress tracking.

## Development Commands

### Main Application (eng-app directory)
```bash
# Development
npm run dev                 # Start development server on localhost:5173

# Building
npm run build              # Production build
npm run build:with-types   # Build with TypeScript checks
npm run vercel-build       # Vercel deployment build

# Quality Assurance
npm run lint               # ESLint code checking
npm run test               # Run Vitest test suite

# Preview
npm run preview            # Preview production build

# Data Management
npm run ingest-exercises   # Import exercise data to database
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v3.3.2
- **State Management**: Redux Toolkit with Redux Persist
- **Routing**: React Router v7
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Forms**: React Hook Form + Zod validation
- **PWA**: Full Progressive Web App support with offline capabilities

### Key Directories
- `src/components/` - UI components organized by feature
- `src/pages/` - Route-level page components
- `src/services/` - API clients and business logic
- `src/store/` - Redux store configuration and slices
- `src/types/` - TypeScript type definitions
- `src/utils/` - Shared utility functions
- `supabase/` - Database migrations and functions

### State Management
- Uses Redux Toolkit with persistence to localStorage
- Auth state persists user profile
- UI state persists theme preference
- Notification state persists unread count

### Database Architecture
Key tables:
- `profiles` - User profiles with coach assignments
- `nutrition_plans` - Meal plans with nested meals/food items
- `meal_logs` - User meal logging (NOT `logged_meals`)
- `workout_programs` - Training programs and exercises
- `notifications` - Real-time notification system
- `step_goals` - Daily step tracking with fitness device integration

## Code Conventions

### UI/UX Patterns
- Use 24-hour time format (00:00-23:59) throughout the application
- Nutrition components group by day types: Rest, Light, Moderate, Heavy, Training
- Macronutrient order: Protein/Carbs/Fat with consistent color coding (red/yellow/blue)
- Action buttons use semantic colors: green for logging, red for deletion, indigo for primary
- Modal dialogs for complex forms with confirmation for destructive actions

### Tailwind CSS Standards
- Stable v3.3.2 (NOT v4.x alpha)
- Dark mode using class strategy (`darkMode: 'class'`)
- Indigo color palette as primary
- Common spacing: `pr-4` for table columns, `p-4` for card headers
- Grid patterns and gradients for premium fitness aesthetic

### Component Organization
- Functional components with TypeScript interfaces
- Form handling with React Hook Form + Zod
- Redux selectors for store access
- Error boundaries and loading states
- URL parameters to maintain context between views

### Authentication
- Supabase passwordless authentication
- Default coach assignment for new users
- Row-level security policies
- Automatic token refresh with visibility change detection

## Progressive Web App Features

The application includes comprehensive PWA support:
- Installable on any device
- Offline functionality for core features
- Push notifications for workout reminders
- Custom icons and splash screens
- Service worker caching with 3MB limit

Test PWA features:
```bash
npm run build
npm run preview
```

## Data Integration

### Exercise Database
- Local Supabase database with exercise metadata
- Import via `npm run ingest-exercises`

### Food Database
- Australian Food Composition Database (AFCD) integration
- CSV ingestion scripts in `scripts/` directory

### Fitness Device Integration
- Fitbit, Garmin, Google Fit support
- OAuth token exchange via Vercel API routes
- Step goal tracking and notifications

## Notification System

Real-time notifications for:
- Coach: New athlete assignments, workout completions, check-ins
- Athletes: Program assignments, nutrition plan updates

Database triggers automatically generate notifications with proper routing context.

## Important Implementation Notes

- Default coach ID: `c5e342a9-28a3-4fdb-9947-fe9e76c46b65`
- Meal logging uses `meal_logs` table with `user_id`, `log_date`, `is_extra_meal` filtering
- Instagram embeds use custom component with dynamic script loading
- Responsive design prioritizes mobile-first approach
- All destructive actions require confirmation dialogs