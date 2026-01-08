import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationsContext';

/**
 * Bell icon button that triggers the notifications modal
 * The modal itself is rendered separately at the app root level
 */
export default function NotificationBell() {
  const { isDark } = useTheme();
  const { openNotifications, totalCount } = useNotifications();

  return (
    <TouchableOpacity
      onPress={openNotifications}
      style={{ padding: 8, marginRight: 8 }}
    >
      <View>
        <Bell
          size={24}
          color={isDark ? '#FFFFFF' : '#374151'}
        />
        {totalCount > 0 && (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              backgroundColor: '#EF4444',
              borderRadius: 10,
              minWidth: 18,
              height: 18,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
              {totalCount > 9 ? '9+' : totalCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
