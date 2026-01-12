import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';
import { OfflineIndicator } from './OfflineIndicator';

/**
 * Header right component with notifications and profile buttons
 * Used across all tab screens
 */
export default function HeaderRight() {
  const { isDark } = useTheme();
  const { profile } = useAuth();
  const router = useRouter();

  const handleProfilePress = () => {
    router.push('/(tabs)/profile');
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <OfflineIndicator variant="minimal" />
      <NotificationBell />
      <TouchableOpacity
        onPress={handleProfilePress}
        style={{
          marginRight: 16,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: isDark ? '#374151' : '#F3F4F6',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
      <User size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
      </TouchableOpacity>
    </View>
  );
}
