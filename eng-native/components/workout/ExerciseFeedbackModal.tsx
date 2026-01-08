import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, AlertTriangle, Zap, Dumbbell } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ExerciseFeedback } from '../../types/workoutSession';

interface ExerciseFeedbackModalProps {
  visible: boolean;
  exerciseName: string;
  existingFeedback?: ExerciseFeedback | null;
  onSubmit: (feedback: {
    painLevel: number | null;
    pumpLevel: number | null;
    workloadLevel: number | null;
    notes: string;
  }) => void;
  onClose: () => void;
}

const RATING_OPTIONS = [1, 2, 3, 4, 5];

interface RatingRowProps {
  label: string;
  icon: React.ReactNode;
  value: number | null;
  onChange: (value: number | null) => void;
  lowLabel: string;
  highLabel: string;
  color: string;
  isDark: boolean;
}

const RatingRow = ({
  label,
  icon,
  value,
  onChange,
  lowLabel,
  highLabel,
  color,
  isDark,
}: RatingRowProps) => {
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        {icon}
        <Text
          style={{
            marginLeft: 8,
            fontSize: 16,
            fontWeight: '600',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          {label}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        {RATING_OPTIONS.map((option) => (
          <Pressable
            key={option}
            onPress={() => onChange(value === option ? null : option)}
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                value === option
                  ? color
                  : isDark
                    ? '#374151'
                    : '#F3F4F6',
              borderWidth: value === option ? 0 : 1,
              borderColor: isDark ? '#4B5563' : '#E5E7EB',
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: value === option ? '#FFFFFF' : isDark ? '#D1D5DB' : '#374151',
              }}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
          {lowLabel}
        </Text>
        <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
          {highLabel}
        </Text>
      </View>
    </View>
  );
};

export const ExerciseFeedbackModal = ({
  visible,
  exerciseName,
  existingFeedback,
  onSubmit,
  onClose,
}: ExerciseFeedbackModalProps) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [pumpLevel, setPumpLevel] = useState<number | null>(null);
  const [workloadLevel, setWorkloadLevel] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  // Load existing feedback when modal opens
  useEffect(() => {
    if (visible && existingFeedback) {
      setPainLevel(existingFeedback.pain_level);
      setPumpLevel(existingFeedback.pump_level);
      setWorkloadLevel(existingFeedback.workload_level);
      setNotes(existingFeedback.notes || '');
    } else if (visible) {
      // Reset form when opening without existing feedback
      setPainLevel(null);
      setPumpLevel(null);
      setWorkloadLevel(null);
      setNotes('');
    }
  }, [visible, existingFeedback]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

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

  const hasAnyInput =
    painLevel !== null || pumpLevel !== null || workloadLevel !== null || notes.trim() !== '';

  const handleSubmit = () => {
    onSubmit({
      painLevel,
      pumpLevel,
      workloadLevel,
      notes: notes.trim(),
    });
    onClose();
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
          padding: 20,
          paddingTop: 8,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#374151' : '#E5E7EB',
        }}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
            }}
          >
            Exercise Feedback
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: isDark ? '#9CA3AF' : '#6B7280',
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {exerciseName}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
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

      {/* Content */}
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Pain Level */}
        <RatingRow
          label="Pain Level"
          icon={<AlertTriangle size={20} color="#EF4444" />}
          value={painLevel}
          onChange={setPainLevel}
          lowLabel="No pain"
          highLabel="Severe pain"
          color="#EF4444"
          isDark={isDark}
        />

        {/* Pump Level */}
        <RatingRow
          label="Muscle Pump"
          icon={<Zap size={20} color="#3B82F6" />}
          value={pumpLevel}
          onChange={setPumpLevel}
          lowLabel="No pump"
          highLabel="Extreme pump"
          color="#3B82F6"
          isDark={isDark}
        />

        {/* Workload Level */}
        <RatingRow
          label="Workload"
          icon={<Dumbbell size={20} color="#F59E0B" />}
          value={workloadLevel}
          onChange={setWorkloadLevel}
          lowLabel="Too easy"
          highLabel="Too heavy"
          color="#F59E0B"
          isDark={isDark}
        />

        {/* Notes */}
        <View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
              marginBottom: 12,
            }}
          >
            Notes (optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional comments..."
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: isDark ? '#374151' : '#F3F4F6',
              borderRadius: 12,
              padding: 14,
              fontSize: 15,
              color: isDark ? '#F3F4F6' : '#1F2937',
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>
      </BottomSheetScrollView>

      {/* Submit Button */}
      <View style={{ padding: 20, paddingTop: 12 }}>
        <Pressable
          onPress={handleSubmit}
          disabled={!hasAnyInput}
          style={{
            backgroundColor: hasAnyInput ? '#6366F1' : isDark ? '#374151' : '#E5E7EB',
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: hasAnyInput ? '#FFFFFF' : isDark ? '#6B7280' : '#9CA3AF',
            }}
          >
            {existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
          </Text>
        </Pressable>
      </View>
    </BottomSheetModal>
  );
};

export default ExerciseFeedbackModal;
