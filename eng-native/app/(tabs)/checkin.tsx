import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import {
  ClipboardCheck,
  Scale,
  AlertCircle,
  ChevronRight,
  Utensils,
  Calendar,
  Dumbbell,
  Footprints,
  Moon,
  Brain,
  Battery,
  Zap,
  X,
  Camera,
  Pencil,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  getCheckIns,
  getLatestCheckIn,
  getDaysSinceLastCheckIn,
  getAdherenceColor,
  getPhotoUrl,
} from '../../services/checkinService';
import { CheckInWithMetrics } from '../../types/checkin';

export default function CheckinScreen() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckInWithMetrics | null>(null);

  // Bottom sheet
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  const handleOpenCheckIn = useCallback((checkIn: CheckInWithMetrics) => {
    setSelectedCheckIn(checkIn);
    bottomSheetRef.current?.present();
  }, []);

  const handleCloseCheckIn = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const handleEditCheckIn = useCallback((checkIn: CheckInWithMetrics) => {
    bottomSheetRef.current?.dismiss();
    router.push({ pathname: '/checkin-form', params: { checkInId: checkIn.id } });
  }, []);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      setSelectedCheckIn(null);
    }
  }, []);

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

  // Check-in data
  const [previousCheckIns, setPreviousCheckIns] = useState<CheckInWithMetrics[]>([]);
  const [latestCheckIn, setLatestCheckIn] = useState<CheckInWithMetrics | null>(null);
  const [daysSinceLastCheckIn, setDaysSinceLastCheckIn] = useState<number | null>(null);

  // Load check-in data
  const loadCheckInData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [checkInsResult, latestResult, daysResult] = await Promise.all([
        getCheckIns(user.id),
        getLatestCheckIn(user.id),
        getDaysSinceLastCheckIn(user.id),
      ]);

      setPreviousCheckIns(checkInsResult.checkIns.slice(0, 5));
      setLatestCheckIn(latestResult.checkIn);
      setDaysSinceLastCheckIn(daysResult.days);
    } catch (error) {
      console.error('Error loading check-in data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCheckInData();
  }, [loadCheckInData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadCheckInData();
  }, [loadCheckInData]);

  // Check-in status badge
  const getStatusBadge = () => {
    if (daysSinceLastCheckIn === null) {
      return { text: 'First Check-in', color: 'blue' };
    }
    if (daysSinceLastCheckIn === 0) {
      return { text: 'Completed Today', color: 'green' };
    }
    if (daysSinceLastCheckIn <= 7) {
      return { text: `${daysSinceLastCheckIn} days ago`, color: 'yellow' };
    }
    return { text: 'Overdue', color: 'red' };
  };

  const statusBadge = getStatusBadge();

  if (!isSupabaseConfigured) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: isDark ? '#111827' : '#F9FAFB',
        }}
      >
        <AlertCircle color="#F59E0B" size={48} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            marginTop: 16,
            textAlign: 'center',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          Supabase Not Configured
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: isDark ? '#111827' : '#F9FAFB',
        }}
      >
        <ClipboardCheck color={isDark ? '#9CA3AF' : '#6B7280'} size={48} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            marginTop: 16,
            textAlign: 'center',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          Sign in to submit check-ins
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? '#111827' : '#F9FAFB',
        }}
      >
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB' }}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={isDark ? '#9CA3AF' : '#6B7280'}
        />
      }
    >
      {/* Check-in Status Card */}
      <View
        style={{
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: isDark ? '#374151' : '#E5E7EB',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '600', color: isDark ? '#F3F4F6' : '#1F2937' }}>
            Weekly Check-in
          </Text>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor:
                statusBadge.color === 'green'
                  ? '#22C55E20'
                  : statusBadge.color === 'yellow'
                    ? '#F59E0B20'
                    : statusBadge.color === 'red'
                      ? '#EF444420'
                      : '#3B82F620',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color:
                  statusBadge.color === 'green'
                    ? '#22C55E'
                    : statusBadge.color === 'yellow'
                      ? '#F59E0B'
                      : statusBadge.color === 'red'
                        ? '#EF4444'
                        : '#3B82F6',
              }}
            >
              {statusBadge.text}
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 16 }}>
          Submit your weekly check-in to keep your coach updated on your progress.
        </Text>

        <Pressable
          onPress={() => router.push('/checkin-form')}
          style={{
            backgroundColor: '#6366F1',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Start Check-in</Text>
        </Pressable>
      </View>

      {/* Latest Check-in Summary */}
      {latestCheckIn && (
        <View
          style={{
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: isDark ? '#374151' : '#E5E7EB',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: isDark ? '#F3F4F6' : '#1F2937',
              }}
            >
              Last Check-in
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Calendar size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
              <Text style={{ marginLeft: 6, color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 13 }}>
                {new Date(latestCheckIn.check_in_date).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Key Metrics - Weight, Body Fat, Sleep */}
          <View style={{ flexDirection: 'row', marginBottom: 12, gap: 8 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Scale size={20} color="#6366F1" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F3F4F6' : '#1F2937', marginTop: 4 }}>
                {latestCheckIn.body_metrics?.weight_kg ?? '--'}
              </Text>
              <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>kg</Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Scale size={20} color="#F59E0B" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F3F4F6' : '#1F2937', marginTop: 4 }}>
                {latestCheckIn.body_metrics?.body_fat_percentage ?? '--'}
              </Text>
              <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>% fat</Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Moon size={20} color="#8B5CF6" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F3F4F6' : '#1F2937', marginTop: 4 }}>
                {latestCheckIn.wellness_metrics?.sleep_hours ?? '--'}
              </Text>
              <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>hrs sleep</Text>
            </View>
          </View>

          {/* Adherence Section */}
          {(latestCheckIn.diet_adherence || latestCheckIn.training_adherence || latestCheckIn.steps_adherence) && (
            <View
              style={{
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                borderRadius: 12,
                padding: 12,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 8 }}>
                Adherence
              </Text>
              <View style={{ gap: 6 }}>
                {latestCheckIn.diet_adherence && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Utensils size={14} color={getAdherenceColor(latestCheckIn.diet_adherence)} />
                    <Text style={{ marginLeft: 8, color: isDark ? '#F3F4F6' : '#1F2937', fontSize: 14, flex: 1 }}>
                      Diet
                    </Text>
                    <Text style={{ color: getAdherenceColor(latestCheckIn.diet_adherence), fontSize: 13, fontWeight: '500' }}>
                      {latestCheckIn.diet_adherence}
                    </Text>
                  </View>
                )}
                {latestCheckIn.training_adherence && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Dumbbell size={14} color={getAdherenceColor(latestCheckIn.training_adherence)} />
                    <Text style={{ marginLeft: 8, color: isDark ? '#F3F4F6' : '#1F2937', fontSize: 14, flex: 1 }}>
                      Training
                    </Text>
                    <Text style={{ color: getAdherenceColor(latestCheckIn.training_adherence), fontSize: 13, fontWeight: '500' }}>
                      {latestCheckIn.training_adherence}
                    </Text>
                  </View>
                )}
                {latestCheckIn.steps_adherence && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Footprints size={14} color={getAdherenceColor(latestCheckIn.steps_adherence)} />
                    <Text style={{ marginLeft: 8, color: isDark ? '#F3F4F6' : '#1F2937', fontSize: 14, flex: 1 }}>
                      Steps
                    </Text>
                    <Text style={{ color: getAdherenceColor(latestCheckIn.steps_adherence), fontSize: 13, fontWeight: '500' }}>
                      {latestCheckIn.steps_adherence}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Wellness Section */}
          <View
            style={{
              backgroundColor: isDark ? '#374151' : '#F3F4F6',
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '500', color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 8 }}>
              Wellness
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Brain size={14} color="#F59E0B" />
                <Text style={{ marginLeft: 6, color: isDark ? '#F3F4F6' : '#1F2937', fontSize: 13 }}>
                  Stress: {latestCheckIn.wellness_metrics?.stress_level ?? '--'}/5
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Battery size={14} color="#EF4444" />
                <Text style={{ marginLeft: 6, color: isDark ? '#F3F4F6' : '#1F2937', fontSize: 13 }}>
                  Fatigue: {latestCheckIn.wellness_metrics?.fatigue_level ?? '--'}/5
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Zap size={14} color="#22C55E" />
                <Text style={{ marginLeft: 6, color: isDark ? '#F3F4F6' : '#1F2937', fontSize: 13 }}>
                  Motivation: {latestCheckIn.wellness_metrics?.motivation_level ?? '--'}/5
                </Text>
              </View>
            </View>
          </View>

          {/* Notes Section */}
          {latestCheckIn.notes && (
            <View
              style={{
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: isDark ? '#9CA3AF' : '#6B7280', marginBottom: 6 }}>
                Notes
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: isDark ? '#F3F4F6' : '#1F2937',
                  lineHeight: 20,
                }}
                numberOfLines={3}
              >
                {latestCheckIn.notes}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Previous Check-ins */}
      <Text
        style={{
          fontSize: 18,
          fontWeight: '600',
          color: isDark ? '#F3F4F6' : '#1F2937',
          marginBottom: 12,
        }}
      >
        Previous Check-ins
      </Text>

      {previousCheckIns.length === 0 ? (
        <View
          style={{
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderRadius: 16,
            padding: 32,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: isDark ? '#374151' : '#E5E7EB',
          }}
        >
          <ClipboardCheck color={isDark ? '#4B5563' : '#9CA3AF'} size={40} />
          <Text
            style={{ marginTop: 12, color: isDark ? '#9CA3AF' : '#6B7280', textAlign: 'center' }}
          >
            No previous check-ins
          </Text>
          <Text
            style={{
              marginTop: 4,
              fontSize: 12,
              color: isDark ? '#6B7280' : '#9CA3AF',
              textAlign: 'center',
            }}
          >
            Your check-in history will appear here
          </Text>
        </View>
      ) : (
        previousCheckIns.map((checkIn) => (
          <Pressable
            key={checkIn.id}
            onPress={() => handleOpenCheckIn(checkIn)}
            style={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderRadius: 12,
              padding: 16,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: isDark ? '#374151' : '#E5E7EB',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: isDark ? '#F3F4F6' : '#1F2937' }}>
                {new Date(checkIn.check_in_date).toLocaleDateString()}
              </Text>
              <Text
                style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 4 }}
              >
                {checkIn.body_metrics?.weight_kg
                  ? `${checkIn.body_metrics.weight_kg} kg`
                  : 'No weight recorded'}
              </Text>
            </View>
            <ChevronRight size={20} color={isDark ? '#6B7280' : '#9CA3AF'} />
          </Pressable>
        ))
      )}

    </ScrollView>

    {/* Check-in Detail Bottom Sheet */}
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
          padding: 20,
          paddingTop: 16,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#374151' : '#E5E7EB',
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '600', color: isDark ? '#F3F4F6' : '#1F2937' }}>
          Check-in Details
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {selectedCheckIn && (
            <Pressable
              onPress={() => handleEditCheckIn(selectedCheckIn)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#6366F1',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Pencil size={18} color="#FFFFFF" />
            </Pressable>
          )}
          <Pressable
            onPress={handleCloseCheckIn}
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

      {selectedCheckIn && (
        <BottomSheetScrollView contentContainerStyle={{ padding: 16, paddingBottom: 16 }}>
          {/* Date */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Calendar size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text style={{ marginLeft: 8, fontSize: 16, color: isDark ? '#F3F4F6' : '#1F2937', fontWeight: '500' }}>
              {new Date(selectedCheckIn.check_in_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          {/* Progress Photos */}
          {selectedCheckIn.photos && selectedCheckIn.photos.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Camera size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: '600', color: isDark ? '#F3F4F6' : '#1F2937' }}>
                  Progress Photos
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {selectedCheckIn.photos.map((photoPath, index) => (
                  <View
                    key={index}
                    style={{
                      width: 120,
                      height: 160,
                      borderRadius: 12,
                      overflow: 'hidden',
                      backgroundColor: isDark ? '#374151' : '#F3F4F6',
                    }}
                  >
                    <Image
                      source={{ uri: getPhotoUrl(photoPath) }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Key Metrics */}
          <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Scale size={20} color="#6366F1" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F3F4F6' : '#1F2937', marginTop: 4 }}>
                {selectedCheckIn.body_metrics?.weight_kg ?? '--'}
              </Text>
              <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>kg</Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Scale size={20} color="#F59E0B" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F3F4F6' : '#1F2937', marginTop: 4 }}>
                {selectedCheckIn.body_metrics?.body_fat_percentage ?? '--'}
              </Text>
              <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>% fat</Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                borderRadius: 12,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Moon size={20} color="#8B5CF6" />
              <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F3F4F6' : '#1F2937', marginTop: 4 }}>
                {selectedCheckIn.wellness_metrics?.sleep_hours ?? '--'}
              </Text>
              <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>hrs sleep</Text>
            </View>
          </View>

          {/* Body Measurements */}
          {selectedCheckIn.body_metrics && (
            <View
              style={{
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F3F4F6' : '#1F2937', marginBottom: 12 }}>
                Body Measurements
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {selectedCheckIn.body_metrics.waist_cm && (
                  <View style={{ width: '48%' }}>
                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>Waist</Text>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: isDark ? '#F3F4F6' : '#1F2937' }}>
                      {selectedCheckIn.body_metrics.waist_cm} cm
                    </Text>
                  </View>
                )}
                {selectedCheckIn.body_metrics.hip_cm && (
                  <View style={{ width: '48%' }}>
                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>Hips</Text>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: isDark ? '#F3F4F6' : '#1F2937' }}>
                      {selectedCheckIn.body_metrics.hip_cm} cm
                    </Text>
                  </View>
                )}
                {selectedCheckIn.body_metrics.chest_cm && (
                  <View style={{ width: '48%' }}>
                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>Chest</Text>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: isDark ? '#F3F4F6' : '#1F2937' }}>
                      {selectedCheckIn.body_metrics.chest_cm} cm
                    </Text>
                  </View>
                )}
                {selectedCheckIn.body_metrics.left_arm_cm && selectedCheckIn.body_metrics.right_arm_cm && (
                  <View style={{ width: '48%' }}>
                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>Arm</Text>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: isDark ? '#F3F4F6' : '#1F2937' }}>
                      {selectedCheckIn.body_metrics.left_arm_cm} cm / {selectedCheckIn.body_metrics.right_arm_cm} cm
                    </Text>
                  </View>
                )}
                {selectedCheckIn.body_metrics.left_thigh_cm && selectedCheckIn.body_metrics.right_thigh_cm && (
                  <View style={{ width: '48%' }}>
                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>Thigh</Text>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: isDark ? '#F3F4F6' : '#1F2937' }}>
                      {selectedCheckIn.body_metrics.left_thigh_cm} cm / {selectedCheckIn.body_metrics.right_thigh_cm} cm
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Adherence */}
          {(selectedCheckIn.diet_adherence || selectedCheckIn.training_adherence || selectedCheckIn.steps_adherence) && (
            <View
              style={{
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F3F4F6' : '#1F2937', marginBottom: 12 }}>
                Adherence
              </Text>
              <View style={{ gap: 8 }}>
                {selectedCheckIn.diet_adherence && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Utensils size={16} color={getAdherenceColor(selectedCheckIn.diet_adherence)} />
                      <Text style={{ marginLeft: 8, color: isDark ? '#F3F4F6' : '#1F2937' }}>Diet</Text>
                    </View>
                    <Text style={{ color: getAdherenceColor(selectedCheckIn.diet_adherence), fontWeight: '500' }}>
                      {selectedCheckIn.diet_adherence}
                    </Text>
                  </View>
                )}
                {selectedCheckIn.training_adherence && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Dumbbell size={16} color={getAdherenceColor(selectedCheckIn.training_adherence)} />
                      <Text style={{ marginLeft: 8, color: isDark ? '#F3F4F6' : '#1F2937' }}>Training</Text>
                    </View>
                    <Text style={{ color: getAdherenceColor(selectedCheckIn.training_adherence), fontWeight: '500' }}>
                      {selectedCheckIn.training_adherence}
                    </Text>
                  </View>
                )}
                {selectedCheckIn.steps_adherence && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Footprints size={16} color={getAdherenceColor(selectedCheckIn.steps_adherence)} />
                      <Text style={{ marginLeft: 8, color: isDark ? '#F3F4F6' : '#1F2937' }}>Steps</Text>
                    </View>
                    <Text style={{ color: getAdherenceColor(selectedCheckIn.steps_adherence), fontWeight: '500' }}>
                      {selectedCheckIn.steps_adherence}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Wellness */}
          {selectedCheckIn.wellness_metrics && (
            <View
              style={{
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F3F4F6' : '#1F2937', marginBottom: 12 }}>
                Wellness
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Brain size={16} color="#F59E0B" />
                  <Text style={{ marginLeft: 6, color: isDark ? '#F3F4F6' : '#1F2937' }}>
                    Stress: {selectedCheckIn.wellness_metrics.stress_level ?? '--'}/5
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Battery size={16} color="#EF4444" />
                  <Text style={{ marginLeft: 6, color: isDark ? '#F3F4F6' : '#1F2937' }}>
                    Fatigue: {selectedCheckIn.wellness_metrics.fatigue_level ?? '--'}/5
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Zap size={16} color="#22C55E" />
                  <Text style={{ marginLeft: 6, color: isDark ? '#F3F4F6' : '#1F2937' }}>
                    Motivation: {selectedCheckIn.wellness_metrics.motivation_level ?? '--'}/5
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Notes */}
          {selectedCheckIn.notes && (
            <View
              style={{
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F3F4F6' : '#1F2937', marginBottom: 8 }}>
                Notes
              </Text>
              <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#4B5563', lineHeight: 20 }}>
                {selectedCheckIn.notes}
              </Text>
            </View>
          )}

          {/* Coach Feedback */}
          {selectedCheckIn.coach_feedback && (
            <View
              style={{
                backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: isDark ? '#2563EB' : '#BFDBFE',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#93C5FD' : '#1D4ED8', marginBottom: 8 }}>
                Coach Feedback
              </Text>
              <Text style={{ fontSize: 14, color: isDark ? '#BFDBFE' : '#1E40AF', lineHeight: 20 }}>
                {selectedCheckIn.coach_feedback}
              </Text>
            </View>
          )}
        </BottomSheetScrollView>
      )}
    </BottomSheetModal>
    </View>
  );
}
