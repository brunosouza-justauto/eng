import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'red' | 'green' | 'indigo';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
  reverseButtons?: boolean;
}

const CONFIRM_COLORS = {
  red: '#EF4444',
  green: '#22C55E',
  indigo: '#6366F1',
};

/**
 * Reusable confirmation modal with dark mode support
 */
export const ConfirmationModal = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'red',
  isLoading = false,
  onConfirm,
  onCancel,
  children,
  reverseButtons = false,
}: ConfirmationModalProps) => {
  const { isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
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
            width: '100%',
            maxWidth: 340,
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderRadius: 16,
            padding: 24,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
              marginBottom: 12,
            }}
          >
            {title}
          </Text>

          {message && (
            <Text
              style={{
                fontSize: 14,
                color: isDark ? '#9CA3AF' : '#6B7280',
                marginBottom: children ? 8 : 24,
                lineHeight: 20,
              }}
            >
              {message}
            </Text>
          )}

          {children && <View style={{ marginBottom: 24 }}>{children}</View>}

          <View style={{ flexDirection: reverseButtons ? 'row-reverse' : 'row', gap: 12 }}>
            <Pressable
              onPress={onCancel}
              disabled={isLoading}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: isDark ? '#4B5563' : '#D1D5DB',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: isDark ? '#D1D5DB' : '#374151',
                }}
              >
                {cancelText}
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={isLoading}
              style={{
                flex: 1,
                height: 48,
                borderRadius: 10,
                backgroundColor: CONFIRM_COLORS[confirmColor],
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
                  {confirmText}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ConfirmationModal;
