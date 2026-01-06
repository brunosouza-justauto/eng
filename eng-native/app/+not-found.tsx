import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function NotFoundScreen() {
  const { isDark } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View className={`flex-1 items-center justify-center p-5 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          This screen doesn't exist.
        </Text>

        <Link href="/" className="mt-4 py-4">
          <Text className="text-indigo-500 text-sm">
            Go to home screen!
          </Text>
        </Link>
      </View>
    </>
  );
}
