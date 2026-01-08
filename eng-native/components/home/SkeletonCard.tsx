import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface SkeletonCardProps {
  variant?: 'task' | 'progress' | 'more';
}

export default function SkeletonCard({ variant = 'task' }: SkeletonCardProps) {
  const { isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const skeletonColor = isDark ? '#374151' : '#E5E7EB';
  const backgroundColor = isDark ? '#1F2937' : '#FFFFFF';

  if (variant === 'progress') {
    return (
      <View
        style={[
          styles.progressCard,
          { backgroundColor },
        ]}
      >
        <View style={styles.progressContent}>
          {/* Circle skeleton */}
          <Animated.View
            style={[
              styles.progressCircle,
              { backgroundColor: skeletonColor, opacity: pulseAnim },
            ]}
          />
          {/* Text skeleton */}
          <View style={styles.progressText}>
            <Animated.View
              style={[
                styles.skeletonLine,
                { width: 120, height: 20, backgroundColor: skeletonColor, opacity: pulseAnim },
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonLine,
                { width: 80, height: 14, marginTop: 8, backgroundColor: skeletonColor, opacity: pulseAnim },
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'more') {
    return (
      <View
        style={[
          styles.moreCard,
          { backgroundColor },
        ]}
      >
        <View style={styles.moreRow}>
          <Animated.View
            style={[
              styles.moreIcon,
              { backgroundColor: skeletonColor, opacity: pulseAnim },
            ]}
          />
          <View style={{ flex: 1 }}>
            <Animated.View
              style={[
                styles.skeletonLine,
                { width: 100, height: 14, backgroundColor: skeletonColor, opacity: pulseAnim },
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonLine,
                { width: 60, height: 12, marginTop: 4, backgroundColor: skeletonColor, opacity: pulseAnim },
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  // Default: task card skeleton
  return (
    <View
      style={[
        styles.taskCard,
        {
          backgroundColor,
          borderColor: isDark ? '#374151' : '#E5E7EB',
        },
      ]}
    >
      <View style={styles.taskContent}>
        {/* Icon skeleton */}
        <Animated.View
          style={[
            styles.iconSkeleton,
            { backgroundColor: skeletonColor, opacity: pulseAnim },
          ]}
        />

        {/* Content skeleton */}
        <View style={styles.taskText}>
          <View style={styles.taskHeader}>
            <Animated.View
              style={[
                styles.skeletonLine,
                { width: 80, height: 16, backgroundColor: skeletonColor, opacity: pulseAnim },
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonLine,
                { width: 40, height: 14, backgroundColor: skeletonColor, opacity: pulseAnim },
              ]}
            />
          </View>
          <Animated.View
            style={[
              styles.skeletonLine,
              { width: 150, height: 12, marginTop: 4, backgroundColor: skeletonColor, opacity: pulseAnim },
            ]}
          />
          {/* Progress bar skeleton */}
          <Animated.View
            style={[
              styles.progressBar,
              { backgroundColor: skeletonColor, opacity: pulseAnim, marginTop: 8 },
            ]}
          />
        </View>

        {/* Arrow skeleton */}
        <Animated.View
          style={[
            styles.arrowSkeleton,
            { backgroundColor: skeletonColor, opacity: pulseAnim },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  taskCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSkeleton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 12,
  },
  taskText: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonLine: {
    borderRadius: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    width: '100%',
  },
  arrowSkeleton: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginLeft: 8,
  },
  progressCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  progressText: {
    marginLeft: 24,
  },
  moreCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 12,
  },
});
