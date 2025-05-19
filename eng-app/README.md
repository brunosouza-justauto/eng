# ENG App - Earned Not Given

A comprehensive bodybuilding and nutrition tracking application built with React, TypeScript, and Vite. Track workouts, meal plans, and fitness goals with a modern, responsive interface.

## Features

- **User Authentication**: Secure passwordless authentication via Supabase
- **Workout Tracking**: Log workouts, track sets, reps, and weights
- **Nutrition Planning**: Plan and log meals, track macronutrients
- **Step Goals**: Connect with fitness devices (Fitbit, Garmin, Google Fit)
- **Progressive Web App (PWA)**: Install on any device for an app-like experience
- **Mobile Responsive**: Optimized for all screen sizes

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **State Management**: Redux Toolkit with Redux Persist
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Build Tool**: Vite
- **Deployment**: Vercel

## Development

### Prerequisites

- Node.js (version 18+)
- npm/yarn

### Setup

1. Clone the repository
```bash
git clone https://github.com/username/eng-app.git
cd eng-app
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Fill in your Supabase and other API keys
```

4. Start the development server
```bash
npm run dev
```

## PWA Support

The application includes full Progressive Web App support:

- **Installable**: Users can install the app on their device
- **Offline Support**: Basic functionality works offline
- **Push Notifications**: Support for workout reminders
- **PWA Assets**: Custom icons and splash screens

To test PWA features in development:
```bash
npm run build
npm run preview
```

## Deployment to Vercel

The application is configured for easy deployment to Vercel:

1. Push your code to a Git repository
2. Connect to Vercel and import the repository
3. Configure environment variables
4. Deploy!

The deployment configuration uses:
- Vercel API routes for external service proxies
- Optimized caching for static assets
- SPA routing support

## License

MIT

## Default Coach Assignment

When a new user creates an account, their profile is automatically assigned to the default coach with ID `c5e342a9-28a3-4fdb-9947-fe9e76c46b65`. This happens in two ways:

1. **Database Trigger**: The `handle_new_user` database trigger function assigns the default coach ID when a new profile is created.
2. **Frontend Check**: As a fallback, the application checks for null `coach_id` values when a user logs in and assigns the default coach ID if needed.

### Updating Existing Profiles

To update existing profiles that don't have a coach ID assigned, run the SQL script in `src/scripts/update_coach_id.sql` via the Supabase SQL Editor.
