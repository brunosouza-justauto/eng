# CLAUDE.md - ENG Native (React Native/Expo)

This file provides guidance to Claude Code when working with the ENG Native mobile app.

## Project Overview

The **ENG Native App** is a React Native/Expo mobile application for the ENG (Earned Not Given) fitness platform. It provides athletes with mobile access to their workout programs, nutrition plans, and progress tracking.

## Development Commands

```bash
# Development
npx expo start                    # Start Expo development server
npx expo start --clear            # Start with cleared cache

# Building
npx expo build:ios                # Build for iOS
npx expo build:android            # Build for Android

# Type Checking
npx tsc --noEmit                  # TypeScript type check

# Dependencies
npx expo install <package>        # Install Expo-compatible packages
```

## Architecture Overview

### Tech Stack
- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **Backend**: Supabase (shared with web app)
- **Styling**: React Native StyleSheet + NativeWind

### Key Directories
- `app/` - Expo Router pages and layouts
- `components/` - Reusable UI components
- `contexts/` - React Context providers (Auth, Theme)
- `services/` - API clients and business logic
- `types/` - TypeScript type definitions
- `hooks/` - Custom React hooks

## Code Conventions

### Dark Mode Support (CRITICAL)
**NEVER use `Alert.alert()` for user-facing dialogs.** Always use dark-mode-ready custom modals:

1. Use `ConfirmationModal` component for confirmation dialogs:
   ```tsx
   import { ConfirmationModal } from '../components/ConfirmationModal';

   <ConfirmationModal
     visible={showModal}
     title="Delete Item"
     message="Are you sure?"
     confirmText="Delete"
     confirmColor="red"
     onConfirm={handleConfirm}
     onCancel={() => setShowModal(false)}
   />
   ```

2. For custom dialogs, use the Modal component with proper dark mode styling:
   ```tsx
   backgroundColor: isDark ? '#1F2937' : '#FFFFFF'  // Modal background
   color: isDark ? '#F3F4F6' : '#1F2937'            // Primary text
   color: isDark ? '#9CA3AF' : '#6B7280'            // Secondary text
   borderColor: isDark ? '#374151' : '#E5E7EB'     // Borders
   ```

3. The only acceptable use of `Alert.alert()` is for critical system errors where the modal system itself might be broken.

### Theme Colors
- Primary: `#6366F1` (Indigo)
- Success: `#22C55E` (Green)
- Danger: `#EF4444` (Red)
- Warning: `#FBBF24` (Yellow)

### Dark Mode Colors
- Background: `#111827` (gray-900)
- Card/Modal: `#1F2937` (gray-800)
- Border: `#374151` (gray-700)
- Text Primary: `#F3F4F6` (gray-100)
- Text Secondary: `#9CA3AF` (gray-400)

### Light Mode Colors
- Background: `#F9FAFB` (gray-50)
- Card/Modal: `#FFFFFF` (white)
- Border: `#E5E7EB` (gray-200)
- Text Primary: `#1F2937` (gray-800)
- Text Secondary: `#6B7280` (gray-500)

## Database References

**Important**: Different tables use different ID references:
- `meal_logs.user_id` → references `auth.users.id` (use `user.id`)
- `assigned_plans.athlete_id` → references `profiles.id` (use `profile.id`)
- `food_items.created_by` → references `profiles.id` (use `profile.id`)

Always check foreign key constraints when working with database operations.

## Component Patterns

### Modal Components
All modal components should:
1. Accept `visible` and `onClose` props
2. Use `useTheme()` hook for dark mode detection
3. Apply proper dark/light background colors
4. Use `useSafeAreaInsets()` for proper spacing

### Form Components
- Use controlled inputs with useState
- Validate before submission
- Show loading states during async operations
- Display errors inline or via dark-ready modals

## Important Notes

- Barcode scanning uses `expo-camera` with `CameraView`
- Native OS permission dialogs cannot be styled (iOS/Android limitation)
- Always test in both light and dark modes
- Use `keyboardShouldPersistTaps="handled"` on ScrollViews with inputs
