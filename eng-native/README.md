# ENG Native App

React Native / Expo mobile app for the ENG (Earned Not Given) fitness tracking platform.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

## Project Structure

```
eng-native/
├── app/                        # Expo Router screens
│   ├── (tabs)/                # Tab navigation screens
│   │   ├── index.tsx          # Home dashboard
│   │   ├── workout.tsx        # Workout dashboard
│   │   ├── nutrition.tsx      # Nutrition tab
│   │   └── profile.tsx        # Profile tab
│   ├── workout-plan/
│   │   └── [id].tsx           # View workout plan details
│   ├── workout-session/
│   │   └── [id].tsx           # Active workout session
│   ├── workout-history.tsx    # Workout history with infinite scroll
│   ├── _layout.tsx            # Root layout with auth
│   ├── login.tsx              # Login/Register screen
│   ├── onboarding.tsx         # Onboarding wizard
│   └── edit-profile.tsx       # Edit profile screen
├── components/                # Reusable components
│   └── CustomPicker.tsx       # Dark-mode aware picker
├── contexts/                  # React contexts
│   ├── AuthContext.tsx        # Authentication state
│   └── ThemeContext.tsx       # Theme (dark/light mode)
├── lib/                       # External service configs
│   └── supabase.ts            # Supabase client
├── services/                  # API/business logic
│   └── workoutService.ts      # Workout data fetching
├── types/                     # TypeScript types
│   ├── profile.ts             # Profile data types
│   └── workout.ts             # Workout/exercise types
└── database/                  # Database documentation
    └── README.md              # Schema reference
```

## Coding Patterns & Standards

### Form Validation (Inline Validation Pattern)

Always use inline validation to show errors directly below each field. This provides better UX than showing errors at the bottom of forms.

#### Implementation:

1. **Use an errors object instead of a single error string:**
```typescript
const [errors, setErrors] = useState<Record<string, string>>({});
```

2. **Create a clearFieldError helper:**
```typescript
const clearFieldError = (field: string) => {
  if (errors[field]) {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }
};
```

3. **Create a renderFieldError helper (for forms with many fields):**
```typescript
const renderFieldError = (field: string) => {
  if (!errors[field]) return null;
  return (
    <Text className="text-red-500 text-xs mt-1">{errors[field]}</Text>
  );
};
```

4. **Validate all fields at once and return all errors:**
```typescript
const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {};

  if (!email.trim()) newErrors.email = 'Email is required';
  if (!password) newErrors.password = 'Password is required';

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

5. **Apply error styling to input containers:**
```typescript
<View className={`${inputContainerStyle} ${errors.fieldName ? 'border-red-500' : ''}`}>
  <TextInput
    value={value}
    onChangeText={(v) => { setValue(v); clearFieldError('fieldName'); }}
  />
</View>
{renderFieldError('fieldName')}
```

6. **For API errors, use a 'general' key:**
```typescript
if (apiError) {
  setErrors({ general: apiError.message });
}

// Display at top of form
{errors.general && (
  <View className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
    <Text className="text-red-500 text-sm">{errors.general}</Text>
  </View>
)}
```

### Dark Mode Support

All components must support dark mode using the `useTheme` hook.

#### Implementation:

```typescript
const { isDark } = useTheme();

// Conditional styling
<View className={isDark ? 'bg-gray-900' : 'bg-gray-50'}>
<Text className={isDark ? 'text-white' : 'text-gray-900'}>
```

#### Inline Styles for Reliability

Some NativeWind/Tailwind classes don't work reliably in React Native (e.g., `gap`, `self-start`, opacity modifiers like `bg-indigo-900/30`). Use inline styles for critical styling:

```typescript
// Instead of className="gap-4" or className="bg-indigo-500/20"
<View style={{
  gap: 16,
  backgroundColor: 'rgba(99, 102, 241, 0.2)'
}}>

// For padding/margin that must work
<View style={{ paddingTop: 20, paddingBottom: 20, paddingLeft: 20, paddingRight: 20 }}>
```

#### Common Dark Mode Classes:
- Background: `bg-gray-900` (dark) / `bg-gray-50` (light)
- Card: `bg-gray-800` (dark) / `bg-white` (light)
- Input: `bg-gray-700 border-gray-600` (dark) / `bg-gray-50 border-gray-200` (light)
- Text primary: `text-white` (dark) / `text-gray-900` (light)
- Text secondary: `text-gray-400` (dark) / `text-gray-500` (light)
- Text muted: `text-gray-500` (dark) / `text-gray-400` (light)

### Custom Confirmation Modal

The native `Alert` component doesn't support dark mode styling. Use a custom `Modal` for confirmations that need to match the app theme:

```typescript
import { Modal } from 'react-native';

const [modalVisible, setModalVisible] = useState(false);

<Modal
  visible={modalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setModalVisible(false)}
>
  <View
    style={{
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    }}
  >
    <View
      style={{
        width: '100%',
        maxWidth: 340,
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        borderRadius: 16,
        padding: 24,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: '600', color: isDark ? '#F3F4F6' : '#1F2937', marginBottom: 12 }}>
        Modal Title
      </Text>
      <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 24 }}>
        Modal message content here.
      </Text>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {/* Cancel Button (outline) */}
        <Pressable
          onPress={() => setModalVisible(false)}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 10,
            borderWidth: 1.5,
            borderColor: isDark ? '#4B5563' : '#D1D5DB',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#D1D5DB' : '#374151' }}>
            Cancel
          </Text>
        </Pressable>

        {/* Confirm Button (solid - use red for destructive actions) */}
        <Pressable
          onPress={handleConfirm}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 10,
            backgroundColor: '#EF4444', // or '#6366F1' for non-destructive
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
            Confirm
          </Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>
```

### Bottom Sheet Modal Pattern

Use slide-up bottom sheets for selection modals, pickers, and forms. This provides a consistent mobile-native experience.

```typescript
<Modal
  visible={visible}
  transparent
  animationType="slide"
  onRequestClose={onClose}
>
  <View
    style={{
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    }}
  >
    <View
      style={{
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '85%', // or specific height like 400/500
        paddingBottom: insets.bottom,
      }}
    >
      {/* Header with title and close button */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 20,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#374151' : '#E5E7EB',
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '600', color: isDark ? '#F3F4F6' : '#1F2937' }}>
          Modal Title
        </Text>
        <Pressable
          onPress={onClose}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isDark ? '#374151' : '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {/* Modal content here */}
      </ScrollView>

      {/* Optional: Action button at bottom */}
      <View style={{ padding: 20, paddingTop: 12 }}>
        <Pressable
          onPress={handleAction}
          style={{
            backgroundColor: '#6366F1',
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            Action Button
          </Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>
```

Key conventions:
- `animationType="slide"` for bottom-up animation
- `borderTopLeftRadius: 24, borderTopRightRadius: 24` for rounded top corners
- Close button: circular with X icon in top-right
- Use `useSafeAreaInsets()` for bottom padding
- Height: `'90%'` for full-height, or specific pixels (400-500) for smaller modals

### Scroll Picker Pattern

Use scroll wheel pickers instead of text inputs for numeric values. This provides better UX on mobile.

```typescript
const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5;

<View style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT, position: 'relative' }}>
  {/* Selection indicator - centered highlight */}
  <View
    pointerEvents="none"
    style={{
      position: 'absolute',
      top: Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT,
      left: 20,
      right: 20,
      height: ITEM_HEIGHT,
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#6366F1',
      zIndex: 1,
    }}
  />

  <ScrollView
    ref={scrollViewRef}
    showsVerticalScrollIndicator={false}
    snapToInterval={ITEM_HEIGHT}
    decelerationRate="fast"
    onScroll={handleScroll}
    scrollEventThrottle={16}
    contentContainerStyle={{
      paddingVertical: Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT,
    }}
  >
    {options.map((option, index) => (
      <Pressable
        key={option.value}
        onPress={() => handleSelect(option.value)}
        style={{
          height: ITEM_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: '600',
            color: index === selectedIndex ? '#6366F1' : (isDark ? '#F3F4F6' : '#1F2937'),
          }}
        >
          {option.label}
        </Text>
      </Pressable>
    ))}
  </ScrollView>
</View>
```

Key conventions:
- `ITEM_HEIGHT = 56` for comfortable touch targets
- `VISIBLE_ITEMS = 5` shows 5 items with center selected
- `snapToInterval` for snap-to-item scrolling
- Padding top/bottom = `(VISIBLE_ITEMS / 2) * ITEM_HEIGHT` to center first/last items
- Selection indicator positioned at exact center
- Track selected index via scroll position: `Math.round(offsetY / ITEM_HEIGHT)`

Examples in codebase:
- `RepsPickerModal` - Numeric picker for reps (1-50)
- `CountdownPickerModal` - Duration picker with labels (30 sec, 1 min, etc.)
- `RestTimePickerModal` - Rest period selection

### Custom Picker Component

Use `CustomPicker` instead of the native `@react-native-picker/picker` for dark mode support on Android.

```typescript
import CustomPicker from '../components/CustomPicker';

<CustomPicker
  selectedValue={value}
  onValueChange={(v) => { setValue(v); clearFieldError('fieldName'); }}
  placeholder="Select an option"
  hasError={!!errors.fieldName}
  options={[
    { label: 'Select an option', value: '' },
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
  ]}
/>
```

### Keyboard Aware Scrolling

Use `KeyboardAwareScrollView` instead of `ScrollView` + `KeyboardAvoidingView` for forms. It automatically scrolls to the focused input when the keyboard appears.

```typescript
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

<KeyboardAwareScrollView
  className="flex-1"
  contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20 }}
  keyboardShouldPersistTaps="handled"
  enableOnAndroid={true}
  extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
  enableAutomaticScroll={true}
>
  {/* Form content */}
</KeyboardAwareScrollView>
```

Key props:
- `enableOnAndroid={true}` - Required for Android support
- `extraScrollHeight` - Extra padding above keyboard (use more for Android)
- `enableAutomaticScroll={true}` - Auto-scroll to focused input
- `keyboardShouldPersistTaps="handled"` - Allow tapping buttons while keyboard is open

### Safe Area Handling

Always handle safe areas for screens with fixed headers/footers.

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();

// For fixed top content
<View style={{ paddingTop: insets.top }}>

// For fixed bottom content
<View style={{ paddingBottom: insets.bottom + 10 }}>
```

### Input Styling

Standard input container styling:

```typescript
const inputStyle = `flex-1 py-3 px-3 text-base ${isDark ? 'text-white' : 'text-gray-900'}`;
const inputContainerStyle = `flex-row items-center rounded-xl px-4 border ${
  isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
}`;
const labelStyle = `text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`;
```

### Button Styling

Primary action buttons:
```typescript
<Pressable
  className="rounded-xl py-4 items-center"
  style={{ backgroundColor: '#6366F1' }}
>
  <Text className="text-white font-semibold">Button Text</Text>
</Pressable>
```

Success/Complete buttons:
```typescript
style={{ backgroundColor: '#10B981' }}
```

### Icons

Use `lucide-react-native` for icons:
```typescript
import { User, Mail, Lock } from 'lucide-react-native';

<User color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
```

## Workout Session Features

The workout session screen (`app/workout-session/[id].tsx`) provides a comprehensive workout tracking experience:

### Core Features

- **Workout Timer**: Tracks total workout duration with pause/resume
- **Set Tracking**: Mark sets as complete with weight and reps
- **Rest Timer**: Automatic rest timer between sets with customizable duration
- **Countdown Timer**: For timed exercises (planks, cardio, etc.)
- **Session Recovery**: Detects and resumes incomplete workout sessions
- **Estimated Duration**: Calculates workout time based on sets, rest periods, and exercise types

### Components

| Component | Purpose |
|-----------|---------|
| `WorkoutSessionHeader` | Displays timer, progress, and action buttons |
| `ExerciseCard` | Individual exercise with sets table |
| `ExerciseGroupContainer` | Wraps supersets/bi-sets/giant sets |
| `RestTimerBanner` | Shows rest countdown between sets |
| `CountdownTimerBanner` | Shows countdown for timed exercises |
| `RepsPickerModal` | Scroll picker for selecting reps |
| `RestTimePickerModal` | Custom rest time selection |
| `CountdownPickerModal` | Duration picker for countdown timer |
| `ExerciseDemoModal` | Exercise demonstration videos |
| `ExerciseFeedbackModal` | Pain/pump/workload rating after exercises |
| `PendingSessionModal` | Resume/discard incomplete sessions |
| `ConfirmationModal` | Reusable confirmation dialogs |

### Hooks

| Hook | Purpose |
|------|---------|
| `useWorkoutTimer` | Main workout duration tracking |
| `useRestTimer` | Rest period countdown with haptic feedback |
| `useCountdownTimer` | General countdown for timed exercises |

### Exercise Feedback System

Athletes can provide feedback on each exercise:
- **Pain Level** (1-5): Track discomfort for injury prevention
- **Pump Level** (1-5): Track muscle engagement
- **Workload Level** (1-5): Track difficulty for progression
- **Notes**: Free-form comments

Previous session feedback generates recommendations:
- High pain → Suggests modifying/replacing exercise
- Low workload → Suggests increasing weight
- High workload → Suggests reducing weight for form
- Low pump → Suggests increasing reps or tempo

### Superset Support

- Exercises with same `group_id` are grouped visually
- Completing a set propagates to all exercises in the group
- Rest timer uses the last exercise's rest period (typical superset config)
- Transition time not counted between grouped exercises

### Estimated Duration Calculation

Factors considered:
- ~40 seconds per set (regular exercises)
- Actual duration for time-based exercises (detected by keywords: plank, cardio, bike, treadmill, etc.)
- Rest periods (custom or per-exercise)
- ~45 seconds transition between exercises
- Superset grouping (no transition within groups)

### Previous Session Data

When loading a workout:
- Pre-fills weights from last completed session
- Pre-fills reps from last completed session
- Shows feedback recommendations from previous session
- Shows previous notes on each exercise

### Android Back Button

- Prevents accidental navigation during active workout
- Shows confirmation modal instead of navigating back
- Blocked when pending session modal is visible

## Backend

The app uses Supabase for:
- Authentication (email/password)
- Database (PostgreSQL)
- Real-time subscriptions

Configure Supabase credentials in `lib/supabase.ts`.

### Key Tables for Workouts

| Table | Purpose |
|-------|---------|
| `workout_sessions` | Tracks workout start/end times |
| `completed_exercise_sets` | Individual set completions with weight/reps |
| `exercise_feedback` | Pain/pump/workload ratings per exercise |
| `exercise_instances` | Exercise definitions within workouts |

## Related Projects

- `eng-app/` - Web application (React + Vite)
