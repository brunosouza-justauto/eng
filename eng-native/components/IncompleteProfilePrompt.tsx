import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, Clock, Sun, Moon } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

interface MissingField {
  key: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * Component that checks if user's profile is missing required time fields
 * and prompts them to complete their profile
 */
export default function IncompleteProfilePrompt() {
  const { isDark } = useTheme();
  const { profile, user } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [missingFields, setMissingFields] = useState<MissingField[]>([]);

  useEffect(() => {
    // Only check if user is logged in and has a profile with onboarding complete
    if (!user || !profile || !profile.onboarding_complete) {
      return;
    }

    const missing: MissingField[] = [];

    if (!profile.training_time_of_day) {
      missing.push({
        key: 'training_time_of_day',
        label: 'Training Time',
        icon: <Clock size={18} color="#6366F1" />,
      });
    }

    if (!profile.nutrition_wakeup_time_of_day) {
      missing.push({
        key: 'nutrition_wakeup_time_of_day',
        label: 'Wake-up Time',
        icon: <Sun size={18} color="#F59E0B" />,
      });
    }

    if (!profile.nutrition_bed_time_of_day) {
      missing.push({
        key: 'nutrition_bed_time_of_day',
        label: 'Bed Time',
        icon: <Moon size={18} color="#8B5CF6" />,
      });
    }

    if (missing.length > 0) {
      setMissingFields(missing);
      // Small delay to not interrupt app startup
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, profile]);

  const handleUpdateProfile = () => {
    setShowModal(false);
    router.push('/edit-profile');
  };

  const handleLater = () => {
    setShowModal(false);
  };

  if (!showModal || missingFields.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="fade"
      onRequestClose={handleLater}
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
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 340,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Icon */}
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: isDark ? '#374151' : '#FEF3C7',
              alignItems: 'center',
              justifyContent: 'center',
              alignSelf: 'center',
              marginBottom: 16,
            }}
          >
            <AlertTriangle size={28} color="#F59E0B" />
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: isDark ? '#F3F4F6' : '#111827',
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            Complete Your Profile
          </Text>

          {/* Description */}
          <Text
            style={{
              fontSize: 14,
              color: isDark ? '#9CA3AF' : '#6B7280',
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: 20,
            }}
          >
            We need a few more details to give you personalized reminders for your workouts and supplements.
          </Text>

          {/* Missing Fields */}
          <View
            style={{
              backgroundColor: isDark ? '#374151' : '#F3F4F6',
              borderRadius: 12,
              padding: 12,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: isDark ? '#9CA3AF' : '#6B7280',
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Missing Information
            </Text>
            {missingFields.map((field, index) => (
              <View
                key={field.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 8,
                  borderTopWidth: index > 0 ? 1 : 0,
                  borderTopColor: isDark ? '#4B5563' : '#E5E7EB',
                }}
              >
                {field.icon}
                <Text
                  style={{
                    fontSize: 14,
                    color: isDark ? '#F3F4F6' : '#374151',
                    marginLeft: 10,
                  }}
                >
                  {field.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Buttons */}
          <View style={{ gap: 10 }}>
            <Pressable
              onPress={handleUpdateProfile}
              style={{
                backgroundColor: '#6366F1',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                Update Profile
              </Text>
            </Pressable>

            <Pressable
              onPress={handleLater}
              style={{
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: isDark ? '#9CA3AF' : '#6B7280',
                  fontSize: 16,
                  fontWeight: '500',
                }}
              >
                Later
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
