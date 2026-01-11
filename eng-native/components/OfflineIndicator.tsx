import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react-native';
import { useOffline } from '../contexts/OfflineContext';
import { useTheme } from '../contexts/ThemeContext';

interface OfflineIndicatorProps {
  // Optional: where to display (default: banner at top)
  variant?: 'banner' | 'chip' | 'minimal';
  // Optional: show even when online with pending operations
  showPendingWhenOnline?: boolean;
}

export function OfflineIndicator({
  variant = 'banner',
  showPendingWhenOnline = true,
}: OfflineIndicatorProps) {
  const { isOnline, pendingOperations, isSyncing, syncNow, isInitialized } =
    useOffline();
  const { isDark } = useTheme();
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Spinning animation for sync icon
  useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [isSyncing, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Don't show anything if initialized, online, and no pending operations
  if (!isInitialized) return null;
  if (isOnline && pendingOperations === 0) return null;
  if (isOnline && !showPendingWhenOnline) return null;

  // Colors based on state
  const getColors = () => {
    if (!isOnline) {
      return {
        bg: isDark ? '#7C2D12' : '#FEF3C7',
        text: isDark ? '#FDBA74' : '#92400E',
        icon: isDark ? '#FB923C' : '#D97706',
      };
    }
    // Online with pending operations
    return {
      bg: isDark ? '#064E3B' : '#D1FAE5',
      text: isDark ? '#6EE7B7' : '#047857',
      icon: isDark ? '#34D399' : '#059669',
    };
  };

  const colors = getColors();

  if (variant === 'minimal') {
    return (
      <View style={styles.minimal}>
        {!isOnline ? (
          <CloudOff size={16} color={colors.icon} />
        ) : (
          <Pressable onPress={syncNow} disabled={isSyncing}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <RefreshCw size={16} color={colors.icon} />
            </Animated.View>
          </Pressable>
        )}
      </View>
    );
  }

  if (variant === 'chip') {
    return (
      <Pressable
        onPress={isOnline ? syncNow : undefined}
        disabled={isSyncing || !isOnline}
        style={[styles.chip, { backgroundColor: colors.bg }]}
      >
        {!isOnline ? (
          <WifiOff size={14} color={colors.icon} />
        ) : (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <RefreshCw size={14} color={colors.icon} />
          </Animated.View>
        )}
        <Text style={[styles.chipText, { color: colors.text }]}>
          {!isOnline
            ? 'Offline'
            : isSyncing
              ? 'Syncing...'
              : `${pendingOperations} pending`}
        </Text>
      </Pressable>
    );
  }

  // Default: banner variant
  return (
    <Pressable
      onPress={isOnline ? syncNow : undefined}
      disabled={isSyncing || !isOnline}
      style={[styles.banner, { backgroundColor: colors.bg }]}
    >
      <View style={styles.bannerContent}>
        {!isOnline ? (
          <>
            <WifiOff size={18} color={colors.icon} />
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.bannerTitle, { color: colors.text }]}>
                You're Offline
              </Text>
              <Text style={[styles.bannerSubtitle, { color: colors.text }]}>
                Changes will sync when you're back online
              </Text>
            </View>
          </>
        ) : (
          <>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <RefreshCw size={18} color={colors.icon} />
            </Animated.View>
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.bannerTitle, { color: colors.text }]}>
                {isSyncing ? 'Syncing...' : `${pendingOperations} Changes Pending`}
              </Text>
              <Text style={[styles.bannerSubtitle, { color: colors.text }]}>
                {isSyncing
                  ? 'Uploading your changes'
                  : 'Tap to sync now'}
              </Text>
            </View>
          </>
        )}
      </View>
    </Pressable>
  );
}

/**
 * Small badge to show offline/sync status
 * Use this in headers or tab bars
 */
export function OfflineBadge() {
  const { isOnline, pendingOperations, isInitialized } = useOffline();
  const { isDark } = useTheme();

  if (!isInitialized) return null;
  if (isOnline && pendingOperations === 0) return null;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: !isOnline
            ? isDark
              ? '#DC2626'
              : '#FEE2E2'
            : isDark
              ? '#059669'
              : '#D1FAE5',
        },
      ]}
    >
      {!isOnline ? (
        <WifiOff
          size={12}
          color={isDark ? '#FCA5A5' : '#DC2626'}
        />
      ) : (
        <Text
          style={[
            styles.badgeText,
            { color: isDark ? '#A7F3D0' : '#047857' },
          ]}
        >
          {pendingOperations}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Banner styles
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  bannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },

  // Chip styles
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Minimal styles
  minimal: {
    padding: 4,
  },

  // Badge styles
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
