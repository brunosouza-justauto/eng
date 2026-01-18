import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { HapticPressable } from './HapticPressable';
import {
  Bell,
  X,
  CheckCheck,
  Dumbbell,
  Pill,
  Utensils,
  Droplets,
  Footprints,
  ClipboardCheck,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { Notification, LocalReminder, LocalReminderType } from '../types/notifications';
import { formatDistanceToNow } from 'date-fns';

/**
 * Notifications modal component - rendered once at app root level
 * Controlled by NotificationsContext
 */
export default function NotificationsModal() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  const {
    isOpen,
    closeNotifications,
    notifications,
    localReminders,
    unreadCount,
    totalCount,
    isLoading,
    isRefreshing,
    handleRefresh,
    handleMarkAllAsRead,
    markAsRead,
  } = useNotifications();

  // Get icon component for reminder type
  const getReminderIcon = (type: LocalReminderType) => {
    switch (type) {
      case 'workout_overdue':
      case 'workout_due':
        return Dumbbell;
      case 'supplements_overdue':
      case 'supplements_due':
        return Pill;
      case 'meals_behind':
      case 'meals_overdue':
        return Utensils;
      case 'water_behind':
        return Droplets;
      case 'steps_behind':
        return Footprints;
      case 'checkin_overdue':
        return ClipboardCheck;
      default:
        return AlertTriangle;
    }
  };

  // Handle reminder press - navigate to the relevant screen
  const handleReminderPress = (reminder: LocalReminder) => {
    closeNotifications();
    router.push(reminder.href as any);
  };

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
      return t('notifications.someTimeAgo');
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

  // Get translated notification text based on type
  const getTranslatedNotification = (notification: Notification) => {
    const typeKey = `notifications.types.${notification.type}`;
    const translatedTitle = t(`${typeKey}.title`, { defaultValue: '' });
    const translatedMessage = t(`${typeKey}.message`, { defaultValue: '' });

    return {
      title: translatedTitle || notification.title,
      message: translatedMessage || notification.message,
    };
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
          {t('notifications.title')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {unreadCount > 0 && (
            <HapticPressable
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
                {t('notifications.markAllRead')}
              </Text>
            </HapticPressable>
          )}
          <HapticPressable
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
          </HapticPressable>
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
              {t('notifications.loading')}
            </Text>
          </View>
        ) : localReminders.length === 0 && notifications.length === 0 ? (
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
              {t('notifications.empty')}
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 14,
                color: isDark ? '#6B7280' : '#9CA3AF',
              }}
            >
              {t('notifications.noNotifications')}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Local Reminders Section */}
            {localReminders.length > 0 && (
              <View>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {t('notifications.actionRequired')}
                </Text>
                <View style={{ gap: 8 }}>
                  {localReminders.map((reminder) => {
                    const IconComponent = getReminderIcon(reminder.type);
                    const isHighPriority = reminder.priority === 'high';
                    return (
                      <HapticPressable
                        key={reminder.id}
                        onPress={() => handleReminderPress(reminder)}
                        style={{
                          flexDirection: 'row',
                          padding: 14,
                          borderRadius: 12,
                          backgroundColor: isHighPriority
                            ? (isDark ? '#7F1D1D' : '#FEE2E2')
                            : (isDark ? '#374151' : '#F3F4F6'),
                          borderWidth: isHighPriority ? 1 : 0,
                          borderColor: isHighPriority
                            ? (isDark ? '#DC2626' : '#FECACA')
                            : 'transparent',
                          alignItems: 'center',
                        }}
                      >
                        {/* Icon */}
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: reminder.iconColor,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginRight: 12,
                          }}
                        >
                          <IconComponent size={18} color="#FFFFFF" />
                        </View>

                        {/* Content */}
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: '600',
                              color: isHighPriority
                                ? (isDark ? '#FCA5A5' : '#991B1B')
                                : (isDark ? '#FFFFFF' : '#111827'),
                            }}
                          >
                            {reminder.title}
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              color: isHighPriority
                                ? (isDark ? '#FCA5A5' : '#B91C1C')
                                : (isDark ? '#9CA3AF' : '#6B7280'),
                              marginTop: 2,
                            }}
                            numberOfLines={2}
                          >
                            {reminder.message}
                          </Text>
                        </View>

                        {/* Arrow */}
                        <ChevronRight
                          size={18}
                          color={isHighPriority
                            ? (isDark ? '#FCA5A5' : '#DC2626')
                            : (isDark ? '#6B7280' : '#9CA3AF')}
                        />
                      </HapticPressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* System Notifications Section */}
            {notifications.length > 0 && (
              <View>
                {localReminders.length > 0 && (
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: isDark ? '#9CA3AF' : '#6B7280',
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {t('notifications.notifications')}
                  </Text>
                )}
                <View style={{ gap: 8 }}>
                  {notifications.map((notification) => {
                    const translatedNotification = getTranslatedNotification(notification);
                    return (
                      <HapticPressable
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
                            {translatedNotification.title}
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color: isDark ? '#9CA3AF' : '#6B7280',
                              marginTop: 2,
                            }}
                            numberOfLines={2}
                          >
                            {translatedNotification.message}
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
                      </HapticPressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
