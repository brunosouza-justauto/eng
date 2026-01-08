import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions } from 'react-native';
import { Trophy, Star, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface CelebrationOverlayProps {
  visible: boolean;
  onComplete?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CelebrationOverlay({ visible, onComplete }: CelebrationOverlayProps) {
  const { isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const starAnims = useRef(
    Array.from({ length: 8 }, () => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      // Main animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Star animations
      starAnims.forEach((anim, index) => {
        const angle = (index / 8) * Math.PI * 2;
        const delay = index * 50;

        Animated.sequence([
          Animated.delay(delay + 200),
          Animated.parallel([
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.spring(anim.scale, {
              toValue: 1,
              tension: 100,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.timing(anim.translateX, {
              toValue: Math.cos(angle) * 80,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(anim.translateY, {
              toValue: Math.sin(angle) * 80,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });

      // Auto dismiss after 3 seconds
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Reset star animations
          starAnims.forEach((anim) => {
            anim.translateX.setValue(0);
            anim.translateY.setValue(0);
            anim.opacity.setValue(0);
            anim.scale.setValue(0);
          });
          onComplete?.();
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      pointerEvents="none"
    >
      {/* Backdrop */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
          opacity: opacityAnim,
        }}
      />

      {/* Stars */}
      {starAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={{
            position: 'absolute',
            opacity: anim.opacity,
            transform: [
              { translateX: anim.translateX },
              { translateY: anim.translateY },
              { scale: anim.scale },
            ],
          }}
        >
          <Star
            size={24}
            color="#FBBF24"
            fill="#FBBF24"
          />
        </Animated.View>
      ))}

      {/* Main content */}
      <Animated.View
        style={{
          alignItems: 'center',
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}
      >
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: '#22C55E',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            shadowColor: '#22C55E',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <Trophy size={48} color="#FFFFFF" />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Sparkles size={20} color="#FBBF24" />
          <Text
            style={{
              fontSize: 24,
              fontWeight: '800',
              color: '#FFFFFF',
              marginHorizontal: 8,
              textShadowColor: 'rgba(0,0,0,0.3)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 4,
            }}
          >
            ALL GOALS COMPLETE!
          </Text>
          <Sparkles size={20} color="#FBBF24" />
        </View>

        <Text
          style={{
            fontSize: 16,
            color: '#D1D5DB',
            textAlign: 'center',
          }}
        >
          You crushed it today!
        </Text>
      </Animated.View>
    </View>
  );
}
