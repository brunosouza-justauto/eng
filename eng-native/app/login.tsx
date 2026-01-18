import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { router } from 'expo-router';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { HapticPressable } from '../components/HapticPressable';

export default function LoginScreen() {
  const { isDark } = useTheme();
  const { signInWithPassword, signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (isSignUp && password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});
    setMessage('');

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          setErrors({ general: error.message });
        } else {
          setMessage('Account created! You can now sign in.');
          setIsSignUp(false);
        }
      } else {
        const { error } = await signInWithPassword(email, password);
        if (error) {
          setErrors({ general: error.message });
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (err: any) {
      setErrors({ general: err.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid={true}
      extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
      enableAutomaticScroll={true}
    >
        {/* Logo/Title Section */}
        <View className="items-center mb-8">
          <Text className="text-4xl font-bold text-indigo-500">ENG</Text>
          <Text className={`text-base mt-2 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Earned Not Given
          </Text>
          <Text className={`text-sm mt-1 text-center ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Progress you can measure, effort you can track.
          </Text>
        </View>

        {/* Login Card */}
        <View
          className={`rounded-2xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 12,
            elevation: 5,
          }}
        >
          <Text className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {isSignUp ? 'Create Account' : 'Sign In'}
          </Text>
          <Text className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {isSignUp
              ? 'Enter your details to create an account'
              : 'Enter your credentials to access your account'}
          </Text>

          {/* Success Message */}
          {message ? (
            <View className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}>
              <Text className="text-green-600 text-sm">{message}</Text>
            </View>
          ) : null}

          {/* General Error Message (API errors) */}
          {errors.general ? (
            <View className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
              <Text className="text-red-500 text-sm">{errors.general}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View className="mb-4">
            <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Email
            </Text>
            <View
              className={`flex-row items-center rounded-xl px-4 border ${
                errors.email
                  ? 'border-red-500'
                  : isDark
                  ? 'bg-gray-700 border-gray-600'
                  : 'bg-gray-50 border-gray-200'
              } ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}
            >
              <Mail color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
              <TextInput
                className={`flex-1 py-3 px-3 text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                placeholder="you@example.com"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                value={email}
                onChangeText={(v) => { setEmail(v); clearFieldError('email'); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
            {errors.email && <Text className="text-red-500 text-xs mt-1">{errors.email}</Text>}
          </View>

          {/* Password Input */}
          <View className="mb-6">
            <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Password
            </Text>
            <View
              className={`flex-row items-center rounded-xl px-4 border ${
                errors.password
                  ? 'border-red-500'
                  : isDark
                  ? 'bg-gray-700 border-gray-600'
                  : 'bg-gray-50 border-gray-200'
              } ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}
            >
              <Lock color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
              <TextInput
                className={`flex-1 py-3 px-3 text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                placeholder="••••••••"
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                value={password}
                onChangeText={(v) => { setPassword(v); clearFieldError('password'); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <HapticPressable onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
                ) : (
                  <Eye color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
                )}
              </HapticPressable>
            </View>
            {errors.password && <Text className="text-red-500 text-xs mt-1">{errors.password}</Text>}
          </View>

          {/* Submit Button */}
          <HapticPressable
            onPress={handleSubmit}
            disabled={loading}
            className={`rounded-xl py-4 items-center ${loading ? 'opacity-50' : ''}`}
            style={{ backgroundColor: '#6366F1' }}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </HapticPressable>

          {/* Toggle Sign Up / Sign In */}
          <View className="mt-6 flex-row justify-center">
            <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            </Text>
            <HapticPressable onPress={() => {
              setIsSignUp(!isSignUp);
              setErrors({});
              setMessage('');
            }}>
              <Text className="text-sm font-semibold text-indigo-500">
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </HapticPressable>
          </View>
        </View>

        {/* Footer */}
        <View className="mt-8 items-center">
          <Text className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            By continuing, you agree to our Terms of Service
          </Text>
        </View>
    </KeyboardAwareScrollView>
  );
}
