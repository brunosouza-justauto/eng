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
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   ├── _layout.tsx        # Root layout with auth
│   ├── login.tsx          # Login/Register screen
│   └── onboarding.tsx     # Onboarding wizard
├── components/            # Reusable components
│   └── CustomPicker.tsx   # Dark-mode aware picker
├── contexts/              # React contexts
│   ├── AuthContext.tsx    # Authentication state
│   └── ThemeContext.tsx   # Theme (dark/light mode)
├── lib/                   # External service configs
│   └── supabase.ts        # Supabase client
└── types/                 # TypeScript types
    └── profile.ts         # Profile data types
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

#### Common Dark Mode Classes:
- Background: `bg-gray-900` (dark) / `bg-gray-50` (light)
- Card: `bg-gray-800` (dark) / `bg-white` (light)
- Input: `bg-gray-700 border-gray-600` (dark) / `bg-gray-50 border-gray-200` (light)
- Text primary: `text-white` (dark) / `text-gray-900` (light)
- Text secondary: `text-gray-400` (dark) / `text-gray-500` (light)
- Text muted: `text-gray-500` (dark) / `text-gray-400` (light)

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

## Backend

The app uses Supabase for:
- Authentication (email/password)
- Database (PostgreSQL)
- Real-time subscriptions

Configure Supabase credentials in `lib/supabase.ts`.

## Related Projects

- `eng-app/` - Web application (React + Vite)
