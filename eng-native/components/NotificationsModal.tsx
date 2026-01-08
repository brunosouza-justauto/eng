import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Bell, X, CheckCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { Notification } from '../types/notifications';
import { formatDistanceToNow } from 'date-fns';

/**
 * Notifications modal component - rendered once at app root level
 * Controlled by NotificationsContext
 */
export default function NotificationsModal() {
  const { isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  const {
    isOpen,
    closeNotifications,
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    handleRefresh,
    handleMarkAllAsRead,
    markAsRead,
  } = useNotifications();

  // Control bottom sheet based on isOpen state
  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [isOpen]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      closeNotifications();
    }
  }, [closeNotifications]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
      />
    ),
    []
  );

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Close modal
    closeNotifications();

    // Navigate based on notification type
    switch (notification.type) {
      case 'nutrition_assigned':
        router.push('/(tabs)/nutrition');
        break;
      case 'program_assigned':
        router.push('/(tabs)/workout');
        break;
      default:
        // Stay on current screen
        break;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'some time ago';
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconColors: Record<string, string> = {
      new_athlete: '#22C55E',
      check_in: '#3B82F6',
      workout_completed: '#F97316',
      steps_completed: '#A855F7',
      nutrition_assigned: '#EF4444',
      program_assigned: '#A855F7',
      system: '#6B7280',
    };
    return iconColors[type] || '#6B7280';
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      backdropComponent={renderBackdrop}
      bottomInset={insets.bottom}
      detached={false}
      handleIndicatorStyle={{
        backgroundColor: isDark ? '#6B7280' : '#9CA3AF',
        width: 40,
      }}
      handleStyle={{
        paddingBottom: 12,
      }}
      backgroundStyle={{
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#374151' : '#E5E7EB',
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: isDark ? '#FFFFFF' : '#111827',
          }}
        >
          Notifications
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {unreadCount > 0 && (
            <Pressable
              onPress={handleMarkAllAsRead}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                borderRadius: 16,
              }}
            >
              <CheckCheck size={16} color="#6366F1" />
              <Text style={{ marginLeft: 4, fontSize: 12, color: '#6366F1', fontWeight: '500' }}>
                Mark all read
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={closeNotifications}
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
      </View>

      {/* Content */}
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6366F1"
          />
        }
      >
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={{ marginTop: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
              Loading notifications...
            </Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
            <Bell size={48} color={isDark ? '#4B5563' : '#9CA3AF'} />
            <Text
              style={{
                marginTop: 16,
                fontSize: 16,
                fontWeight: '500',
                color: isDark ? '#9CA3AF' : '#6B7280',
              }}
            >
              No notifications
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 14,
                color: isDark ? '#6B7280' : '#9CA3AF',
              }}
            >
              You're all caught up!
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {notifications.map((notification) => (
              <Pressable
                key={notification.id}
                onPress={() => handleNotificationPress(notification)}
                style={{
                  flexDirection: 'row',
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: notification.is_read
                    ? (isDark ? '#1F2937' : '#FFFFFF')
                    : (isDark ? '#312E81' : '#EEF2FF'),
                  borderWidth: 1,
                  borderColor: notification.is_read
                    ? (isDark ? '#374151' : '#E5E7EB')
                    : (isDark ? '#4338CA' : '#C7D2FE'),
                }}
              >
                {/* Icon */}
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: getNotificationIcon(notification.type),
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  <Bell size={18} color="#FFFFFF" />
                </View>

                {/* Content */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: notification.is_read ? '400' : '600',
                      color: isDark ? '#FFFFFF' : '#111827',
                    }}
                  >
                    {notification.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: isDark ? '#9CA3AF' : '#6B7280',
                      marginTop: 2,
                    }}
                    numberOfLines={2}
                  >
                    {notification.message}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: isDark ? '#6B7280' : '#9CA3AF',
                      marginTop: 4,
                    }}
                  >
                    {formatTime(notification.created_at)}
                  </Text>
                </View>

                {/* Unread indicator */}
                {!notification.is_read && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#6366F1',
                      marginLeft: 8,
                      alignSelf: 'center',
                    }}
                  />
                )}
              </Pressable>
            ))}
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
