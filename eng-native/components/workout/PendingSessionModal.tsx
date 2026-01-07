import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { AlertTriangle, Play, Trash2, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface PendingSessionModalProps {
  visible: boolean;
  isFromToday: boolean;
  sessionDate: string;
  completedSetsCount: number;
  onResume: () => void;
  onDiscard: () => void;
  onComplete: () => void;
  isLoading?: boolean;
}

/**
 * Modal shown when there's a pending (incomplete) workout session
 * - If from today: offers to resume
 * - If from previous day: offers to complete or discard
 */
export const PendingSessionModal = ({
  visible,
  isFromToday,
  sessionDate,
  completedSetsCount,
  onResume,
  onDiscard,
  onComplete,
  isLoading = false,
}: PendingSessionModalProps) => {
  const { isDark } = useTheme();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderRadius: 16,
            width: '100%',
            maxWidth: 340,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <View
            style={{
              backgroundColor: isFromToday
                ? isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)'
                : isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
              padding: 20,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: isFromToday
                  ? isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)'
                  : isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <AlertTriangle
                size={28}
                color={isFromToday ? '#6366F1' : '#F59E0B'}
              />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: isDark ? '#F3F4F6' : '#1F2937',
                textAlign: 'center',
              }}
            >
              {isFromToday ? 'Resume Workout?' : 'Incomplete Session Found'}
            </Text>
          </View>

          {/* Content */}
          <View style={{ padding: 20 }}>
            <Text
              style={{
                fontSize: 14,
                color: isDark ? '#D1D5DB' : '#4B5563',
                textAlign: 'center',
                lineHeight: 22,
                marginBottom: 16,
              }}
            >
              {isFromToday
                ? `You have an unfinished workout session from earlier today with ${completedSetsCount} completed set${completedSetsCount !== 1 ? 's' : ''}.`
                : `You have an unfinished workout from ${formatDate(sessionDate)} with ${completedSetsCount} completed set${completedSetsCount !== 1 ? 's' : ''}.`}
            </Text>

            {!isFromToday && (
              <Text
                style={{
                  fontSize: 13,
                  color: isDark ? '#9CA3AF' : '#6B7280',
                  textAlign: 'center',
                  fontStyle: 'italic',
                  marginBottom: 16,
                }}
              >
                What would you like to do with this session?
              </Text>
            )}

            {/* Action Buttons */}
            <View style={{ gap: 10 }}>
              {isFromToday ? (
                <>
                  {/* Resume Button */}
                  <Pressable
                    onPress={onResume}
                    disabled={isLoading}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#6366F1',
                      borderRadius: 10,
                      paddingVertical: 14,
                      opacity: isLoading ? 0.7 : 1,
                    }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
                        <Text
                          style={{
                            marginLeft: 8,
                            color: '#FFFFFF',
                            fontSize: 15,
                            fontWeight: '600',
                          }}
                        >
                          Resume Workout
                        </Text>
                      </>
                    )}
                  </Pressable>

                  {/* Start Fresh Button */}
                  <Pressable
                    onPress={onDiscard}
                    disabled={isLoading}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? '#374151' : '#F3F4F6',
                      borderRadius: 10,
                      paddingVertical: 14,
                    }}
                  >
                    <Trash2 size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
                    <Text
                      style={{
                        marginLeft: 8,
                        color: isDark ? '#D1D5DB' : '#374151',
                        fontSize: 15,
                        fontWeight: '600',
                      }}
                    >
                      Start Fresh
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  {/* Complete Session Button */}
                  <Pressable
                    onPress={onComplete}
                    disabled={isLoading}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#22C55E',
                      borderRadius: 10,
                      paddingVertical: 14,
                      opacity: isLoading ? 0.7 : 1,
                    }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <CheckCircle size={18} color="#FFFFFF" />
                        <Text
                          style={{
                            marginLeft: 8,
                            color: '#FFFFFF',
                            fontSize: 15,
                            fontWeight: '600',
                          }}
                        >
                          Mark as Complete
                        </Text>
                      </>
                    )}
                  </Pressable>

                  {/* Discard Button */}
                  <Pressable
                    onPress={onDiscard}
                    disabled={isLoading}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                      borderRadius: 10,
                      paddingVertical: 14,
                    }}
                  >
                    <Trash2 size={18} color="#EF4444" />
                    <Text
                      style={{
                        marginLeft: 8,
                        color: '#EF4444',
                        fontSize: 15,
                        fontWeight: '600',
                      }}
                    >
                      Discard Session
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default PendingSessionModal;
