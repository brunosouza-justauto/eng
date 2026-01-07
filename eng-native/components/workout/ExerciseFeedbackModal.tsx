import { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, TextInput, ScrollView } from 'react-native';
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

  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [pumpLevel, setPumpLevel] = useState<number | null>(null);
  const [workloadLevel, setWorkloadLevel] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            height: '90%',
            paddingBottom: insets.bottom,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 20,
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
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20 }}
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
          </ScrollView>

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
        </View>
      </View>
    </Modal>
  );
};

export default ExerciseFeedbackModal;
