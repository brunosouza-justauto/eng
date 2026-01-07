import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Youtube, Dumbbell, Info, Lightbulb } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getExerciseById, ExerciseDetails } from '../../services/exerciseService';
import { cleanExerciseName } from '../../types/workout';

interface ExerciseDemoModalProps {
  visible: boolean;
  exerciseDbId: string | number | null;
  exerciseName: string;
  onClose: () => void;
}

/**
 * Modal component displaying exercise demonstration with GIF, instructions, and tips
 */
export const ExerciseDemoModal = ({
  visible,
  exerciseDbId,
  exerciseName,
  onClose,
}: ExerciseDemoModalProps) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [exercise, setExercise] = useState<ExerciseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (visible && exerciseDbId) {
      console.log('[ExerciseDemoModal] Opening modal for exercise ID:', exerciseDbId);
      setIsLoading(true); // Start loading immediately
      setExercise(null);
      fetchExercise();
    } else if (!visible) {
      // Reset state when modal closes
      setExercise(null);
      setIsLoading(false);
      setImageError(false);
    }
  }, [visible, exerciseDbId]);

  const fetchExercise = async () => {
    if (!exerciseDbId) {
      console.log('[ExerciseDemoModal] No exerciseDbId provided');
      return;
    }

    console.log('[ExerciseDemoModal] Fetching exercise...');
    setIsLoading(true);
    setImageError(false);
    setExercise(null);

    const { exercise: data, error } = await getExerciseById(exerciseDbId);

    console.log('[ExerciseDemoModal] Fetch result:', { data, error });

    if (error) {
      console.error('[ExerciseDemoModal] Error:', error);
    }

    if (data) {
      console.log('[ExerciseDemoModal] Setting exercise data:', data.name);
      setExercise(data);
    }

    setIsLoading(false);
  };

  const handleYoutubePress = () => {
    if (exercise?.youtubeLink) {
      Linking.openURL(exercise.youtubeLink);
    }
  };

  const handleClose = () => {
    setExercise(null);
    setImageError(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
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
            <Text
              style={{
                flex: 1,
                fontSize: 18,
                fontWeight: '600',
                color: isDark ? '#F3F4F6' : '#1F2937',
                marginRight: 16,
              }}
              numberOfLines={2}
            >
              {cleanExerciseName(exerciseName)}
            </Text>
            <Pressable
              onPress={handleClose}
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
            style={{ flex: 1, minHeight: 200 }}
            contentContainerStyle={{ padding: 20, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text
                  style={{
                    marginTop: 12,
                    color: isDark ? '#9CA3AF' : '#6B7280',
                  }}
                >
                  Loading exercise details...
                </Text>
              </View>
            ) : exercise ? (
              <>
                {/* Demo Image/GIF */}
                <View
                  style={{
                    backgroundColor: isDark ? '#374151' : '#F3F4F6',
                    borderRadius: 12,
                    overflow: 'hidden',
                    marginBottom: 20,
                    minHeight: 200,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {exercise.gifUrl && !imageError ? (
                    <>
                      <Image
                        source={{ uri: exercise.gifUrl }}
                        style={{
                          width: '100%',
                          height: 250,
                          resizeMode: 'contain',
                        }}
                        onError={() => setImageError(true)}
                      />
                      {exercise.gifUrl.toLowerCase().endsWith('.gif') && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                          }}
                        >
                          <Text
                            style={{
                              color: '#FFFFFF',
                              fontSize: 10,
                              fontWeight: '600',
                            }}
                          >
                            GIF
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={{ alignItems: 'center', padding: 40 }}>
                      <Dumbbell
                        size={48}
                        color={isDark ? '#6B7280' : '#9CA3AF'}
                      />
                      <Text
                        style={{
                          marginTop: 12,
                          color: isDark ? '#6B7280' : '#9CA3AF',
                          textAlign: 'center',
                        }}
                      >
                        No demo available
                      </Text>
                    </View>
                  )}
                </View>

                {/* YouTube Button */}
                {exercise.youtubeLink && (
                  <Pressable
                    onPress={handleYoutubePress}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#DC2626',
                      borderRadius: 10,
                      paddingVertical: 12,
                      marginBottom: 20,
                    }}
                  >
                    <Youtube size={18} color="#FFFFFF" />
                    <Text
                      style={{
                        marginLeft: 8,
                        color: '#FFFFFF',
                        fontSize: 14,
                        fontWeight: '600',
                      }}
                    >
                      Watch on YouTube
                    </Text>
                  </Pressable>
                )}

                {/* Muscle & Equipment Tags */}
                {(exercise.primaryMuscle || exercise.equipment?.length) && (
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      marginBottom: 16,
                      gap: 8,
                    }}
                  >
                    {exercise.primaryMuscle && (
                      <View
                        style={{
                          backgroundColor: isDark
                            ? 'rgba(99, 102, 241, 0.2)'
                            : 'rgba(99, 102, 241, 0.1)',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '500',
                            color: isDark ? '#A5B4FC' : '#6366F1',
                          }}
                        >
                          {exercise.primaryMuscle}
                        </Text>
                      </View>
                    )}
                    {exercise.equipment?.map((equip, index) => (
                      <View
                        key={index}
                        style={{
                          backgroundColor: isDark
                            ? 'rgba(34, 197, 94, 0.2)'
                            : 'rgba(34, 197, 94, 0.1)',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '500',
                            color: isDark ? '#86EFAC' : '#22C55E',
                          }}
                        >
                          {equip}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Instructions */}
                {exercise.instructions && exercise.instructions.length > 0 && (
                  <View
                    style={{
                      backgroundColor: isDark
                        ? 'rgba(55, 65, 81, 0.5)'
                        : '#F9FAFB',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <Info size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
                      <Text
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          fontWeight: '600',
                          color: isDark ? '#9CA3AF' : '#6B7280',
                          textTransform: 'uppercase',
                        }}
                      >
                        Instructions
                      </Text>
                    </View>
                    {exercise.instructions.map((instruction, index) => (
                      <Text
                        key={index}
                        style={{
                          fontSize: 14,
                          color: isDark ? '#D1D5DB' : '#374151',
                          lineHeight: 22,
                          marginBottom:
                            index < exercise.instructions!.length - 1 ? 8 : 0,
                        }}
                      >
                        {instruction}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Tips */}
                {exercise.tips && exercise.tips.length > 0 && (
                  <View
                    style={{
                      backgroundColor: isDark
                        ? 'rgba(234, 179, 8, 0.1)'
                        : 'rgba(234, 179, 8, 0.1)',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <Lightbulb size={16} color="#EAB308" />
                      <Text
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          fontWeight: '600',
                          color: '#EAB308',
                          textTransform: 'uppercase',
                        }}
                      >
                        Tips
                      </Text>
                    </View>
                    {exercise.tips.map((tip, index) => (
                      <Text
                        key={index}
                        style={{
                          fontSize: 14,
                          color: isDark ? '#D1D5DB' : '#374151',
                          lineHeight: 22,
                          marginBottom:
                            index < exercise.tips!.length - 1 ? 8 : 0,
                        }}
                      >
                        {tip}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Bottom spacer */}
                <View style={{ height: 20 }} />
              </>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Dumbbell size={48} color={isDark ? '#6B7280' : '#9CA3AF'} />
                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 16,
                    fontWeight: '500',
                    color: isDark ? '#D1D5DB' : '#374151',
                  }}
                >
                  Exercise Not Found
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    color: isDark ? '#6B7280' : '#9CA3AF',
                    textAlign: 'center',
                  }}
                >
                  Unable to load exercise details
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default ExerciseDemoModal;
