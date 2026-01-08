import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Camera,
  Scale,
  ChevronRight,
  ChevronLeft,
  Check,
  Heart,
  Moon,
  Dumbbell,
  Utensils,
  Footprints,
  X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  submitCheckIn,
  updateCheckIn,
  getCheckInById,
  uploadPhoto,
  getAdherenceColor,
} from '../services/checkinService';
import {
  CheckInFormData,
  PhotoPosition,
  PhotoCapture,
  ADHERENCE_OPTIONS,
} from '../types/checkin';
import { getLocalDateString } from '../utils/date';

type FormStep = 'body' | 'wellness' | 'adherence' | 'photos';

const FORM_STEPS: FormStep[] = ['body', 'wellness', 'adherence', 'photos'];
const STEP_TITLES = ['Body Metrics', 'Wellness', 'Adherence', 'Photos'];
const STEP_ICONS = [Scale, Heart, Utensils, Camera];

export default function CheckinFormScreen() {
  const { isDark } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { checkInId } = useLocalSearchParams<{ checkInId?: string }>();

  const isEditMode = !!checkInId;
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<FormStep>('body');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);

  // Form data
  const [formData, setFormData] = useState<Partial<CheckInFormData>>({
    check_in_date: getLocalDateString(),
    sleep_quality: 3,
    stress_level: 3,
    fatigue_level: 3,
    motivation_level: 3,
  });

  // Photos
  const [photos, setPhotos] = useState<Record<PhotoPosition, PhotoCapture>>({
    front: { position: 'front', uri: null },
    side: { position: 'side', uri: null },
    back: { position: 'back', uri: null },
  });

  // Load existing check-in data in edit mode
  useEffect(() => {
    if (isEditMode && checkInId) {
      loadExistingCheckIn(checkInId);
    }
  }, [checkInId, isEditMode]);

  const loadExistingCheckIn = async (id: string) => {
    setIsLoading(true);
    const { checkIn } = await getCheckInById(id);

    if (checkIn) {
      // Pre-fill form data
      setFormData({
        check_in_date: checkIn.check_in_date,
        weight_kg: checkIn.body_metrics?.weight_kg,
        body_fat_percentage: checkIn.body_metrics?.body_fat_percentage,
        waist_cm: checkIn.body_metrics?.waist_cm,
        hip_cm: checkIn.body_metrics?.hip_cm,
        chest_cm: checkIn.body_metrics?.chest_cm,
        arm_cm: checkIn.body_metrics?.arm_cm,
        thigh_cm: checkIn.body_metrics?.thigh_cm,
        sleep_hours: checkIn.wellness_metrics?.sleep_hours,
        sleep_quality: checkIn.wellness_metrics?.sleep_quality || 3,
        stress_level: checkIn.wellness_metrics?.stress_level || 3,
        fatigue_level: checkIn.wellness_metrics?.fatigue_level || 3,
        motivation_level: checkIn.wellness_metrics?.motivation_level || 3,
        diet_adherence: checkIn.diet_adherence,
        training_adherence: checkIn.training_adherence,
        steps_adherence: checkIn.steps_adherence,
        notes: checkIn.notes,
      });

      // Store existing photos
      if (checkIn.photos && checkIn.photos.length > 0) {
        setExistingPhotos(checkIn.photos);
      }
    }

    setIsLoading(false);
  };

  // Get current step index
  const currentStepIndex = FORM_STEPS.indexOf(currentStep);
  const StepIcon = STEP_ICONS[currentStepIndex];

  // Input styles
  const inputStyle = {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: isDark ? '#FFFFFF' : '#111827',
  };
  const inputContainerStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    backgroundColor: isDark ? '#374151' : '#F9FAFB',
    borderColor: isDark ? '#4B5563' : '#E5E7EB',
  };
  const labelStyle = {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 8,
    color: isDark ? '#D1D5DB' : '#374151',
  };

  // Pick photo from gallery
  const pickPhoto = async (position: PhotoPosition) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => ({
        ...prev,
        [position]: { position, uri: result.assets[0].uri },
      }));
    }
  };

  // Take photo with camera
  const takePhoto = async (position: PhotoPosition) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => ({
        ...prev,
        [position]: { position, uri: result.assets[0].uri },
      }));
    }
  };

  // Clear photo
  const clearPhoto = (position: PhotoPosition) => {
    setPhotos((prev) => ({
      ...prev,
      [position]: { position, uri: null },
    }));
  };

  // Update form field
  const updateField = (field: keyof CheckInFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate current step
  const validateStep = (stepName: FormStep): boolean => {
    const newErrors: Record<string, string> = {};

    switch (stepName) {
      case 'body':
        if (!formData.weight_kg) newErrors.weight_kg = 'Weight is required';
        break;
      case 'wellness':
        if (!formData.sleep_hours) newErrors.sleep_hours = 'Sleep hours is required';
        break;
      case 'adherence':
        if (!formData.diet_adherence) newErrors.diet_adherence = 'Diet adherence is required';
        if (!formData.training_adherence) newErrors.training_adherence = 'Training adherence is required';
        if (!formData.steps_adherence) newErrors.steps_adherence = 'Steps adherence is required';
        if (!formData.notes?.trim()) newErrors.notes = 'Notes are required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Render field error
  const renderFieldError = (field: string) => {
    if (!errors[field]) return null;
    return (
      <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors[field]}</Text>
    );
  };

  // Submit or update check-in
  const handleSubmit = async () => {
    if (!user?.id || !profile?.user_id) return;

    setIsSubmitting(true);

    try {
      // Upload any new photos
      const newPhotoPaths: string[] = [];
      for (const photo of Object.values(photos)) {
        if (photo.uri) {
          const { path } = await uploadPhoto(profile.user_id, photo.uri, photo.position);
          if (path) newPhotoPaths.push(path);
        }
      }

      // Combine existing photos with new ones
      const allPhotoPaths = [...existingPhotos, ...newPhotoPaths];

      if (isEditMode && checkInId) {
        // Update existing check-in
        const { error } = await updateCheckIn(
          checkInId,
          formData as CheckInFormData,
          allPhotoPaths.length > 0 ? allPhotoPaths : undefined
        );

        if (error) {
          console.error('Error updating check-in:', error);
        } else {
          setShowSuccessModal(true);
        }
      } else {
        // Create new check-in
        const { error } = await submitCheckIn(
          profile.user_id,
          formData as CheckInFormData,
          allPhotoPaths.length > 0 ? allPhotoPaths : undefined
        );

        if (error) {
          console.error('Error submitting check-in:', error);
        } else {
          setShowSuccessModal(true);
        }
      }
    } catch (err) {
      console.error('Error in handleSubmit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.back();
  };

  // Show loading state when fetching existing check-in
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
        <Text style={{ marginTop: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
          Loading check-in...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB', paddingTop: insets.top }}>
      {/* Progress Bar */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          {FORM_STEPS.map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                marginHorizontal: 2,
                backgroundColor: i <= currentStepIndex ? '#6366F1' : isDark ? '#374151' : '#E5E7EB',
              }}
            />
          ))}
        </View>

        {/* Step Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#EEF2FF',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <StepIcon color="#6366F1" size={24} />
          </View>
          <View>
            <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
              {isEditMode ? 'Edit Check-in - ' : ''}Step {currentStepIndex + 1} of {FORM_STEPS.length}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '700', color: isDark ? '#FFFFFF' : '#111827' }}>
              {STEP_TITLES[currentStepIndex]}
            </Text>
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
      >
        {/* Body Metrics Step */}
        {currentStep === 'body' && (
          <View style={{ flex: 1 }}>
            <View style={{ marginBottom: 16 }}>
              <Text style={labelStyle}>Weight (kg) *</Text>
              <View style={[inputContainerStyle, errors.weight_kg && { borderColor: '#EF4444' }]}>
                <Scale color={errors.weight_kg ? '#EF4444' : isDark ? '#9CA3AF' : '#6B7280'} size={20} />
                <TextInput
                  style={inputStyle}
                  placeholder="e.g., 75.0"
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  keyboardType="decimal-pad"
                  value={formData.weight_kg?.toString() || ''}
                  onChangeText={(text) => updateField('weight_kg', parseFloat(text) || undefined)}
                />
              </View>
              {renderFieldError('weight_kg')}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
              {[
                { key: 'waist_cm', label: 'Waist (cm)' },
                { key: 'hip_cm', label: 'Hips (cm)' },
                { key: 'chest_cm', label: 'Chest (cm)' },
                { key: 'arm_cm', label: 'Arm (cm)' },
                { key: 'thigh_cm', label: 'Thigh (cm)' },
                { key: 'body_fat_percentage', label: 'Body Fat (%)' },
              ].map((field) => (
                <View key={field.key} style={{ width: '50%', paddingHorizontal: 8, marginBottom: 16 }}>
                  <Text style={labelStyle}>{field.label}</Text>
                  <View style={inputContainerStyle}>
                    <TextInput
                      style={inputStyle}
                      placeholder="Optional"
                      placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                      keyboardType="decimal-pad"
                      value={(formData as any)[field.key]?.toString() || ''}
                      onChangeText={(text) =>
                        updateField(field.key as keyof CheckInFormData, parseFloat(text) || undefined)
                      }
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Wellness Step */}
        {currentStep === 'wellness' && (
          <View style={{ flex: 1 }}>
            <View style={{ marginBottom: 16 }}>
              <Text style={labelStyle}>Average Sleep (hours) *</Text>
              <View style={[inputContainerStyle, errors.sleep_hours && { borderColor: '#EF4444' }]}>
                <Moon color={errors.sleep_hours ? '#EF4444' : isDark ? '#9CA3AF' : '#6B7280'} size={20} />
                <TextInput
                  style={inputStyle}
                  placeholder="e.g., 7.5"
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  keyboardType="decimal-pad"
                  value={formData.sleep_hours?.toString() || ''}
                  onChangeText={(text) => updateField('sleep_hours', parseFloat(text) || undefined)}
                />
              </View>
              {renderFieldError('sleep_hours')}
            </View>

            {[
              { key: 'sleep_quality', label: 'Sleep Quality' },
              { key: 'stress_level', label: 'Stress Level' },
              { key: 'fatigue_level', label: 'Fatigue Level' },
              { key: 'motivation_level', label: 'Motivation Level' },
            ].map((field) => (
              <View key={field.key} style={{ marginBottom: 16 }}>
                <Text style={labelStyle}>{field.label} *</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => updateField(field.key as keyof CheckInFormData, value)}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: 'center',
                        backgroundColor:
                          (formData as any)[field.key] === value
                            ? '#6366F1'
                            : isDark
                              ? '#374151'
                              : '#F9FAFB',
                        borderWidth: 1,
                        borderColor:
                          (formData as any)[field.key] === value
                            ? '#6366F1'
                            : isDark
                              ? '#4B5563'
                              : '#E5E7EB',
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: '600',
                          color:
                            (formData as any)[field.key] === value
                              ? '#FFFFFF'
                              : isDark
                                ? '#F3F4F6'
                                : '#1F2937',
                        }}
                      >
                        {value}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Adherence Step */}
        {currentStep === 'adherence' && (
          <View style={{ flex: 1 }}>
            {[
              { key: 'diet_adherence', label: 'Diet Adherence', icon: Utensils },
              { key: 'training_adherence', label: 'Training Adherence', icon: Dumbbell },
              { key: 'steps_adherence', label: 'Steps Adherence', icon: Footprints },
            ].map((field) => (
              <View key={field.key} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <field.icon
                    size={16}
                    color={errors[field.key] ? '#EF4444' : isDark ? '#9CA3AF' : '#6B7280'}
                  />
                  <Text
                    style={[
                      labelStyle,
                      { marginLeft: 8, marginBottom: 0 },
                      errors[field.key] && { color: '#EF4444' },
                    ]}
                  >
                    {field.label} *
                  </Text>
                </View>
                {ADHERENCE_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => updateField(field.key as keyof CheckInFormData, option.value)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: 12,
                      marginBottom: 8,
                      backgroundColor:
                        (formData as any)[field.key] === option.value
                          ? `${getAdherenceColor(option.value)}20`
                          : isDark
                            ? '#374151'
                            : '#F9FAFB',
                      borderWidth: 1,
                      borderColor:
                        (formData as any)[field.key] === option.value
                          ? getAdherenceColor(option.value)
                          : isDark
                            ? '#4B5563'
                            : '#E5E7EB',
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor:
                          (formData as any)[field.key] === option.value
                            ? getAdherenceColor(option.value)
                            : isDark
                              ? '#6B7280'
                              : '#9CA3AF',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      {(formData as any)[field.key] === option.value && (
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: getAdherenceColor(option.value),
                          }}
                        />
                      )}
                    </View>
                    <Text style={{ flex: 1, color: isDark ? '#F3F4F6' : '#1F2937' }}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
                {renderFieldError(field.key)}
              </View>
            ))}

            <View style={{ marginBottom: 16 }}>
              <Text style={[labelStyle, errors.notes && { color: '#EF4444' }]}>General Notes *</Text>
              <View
                style={[
                  inputContainerStyle,
                  { minHeight: 100, alignItems: 'flex-start', paddingVertical: 8 },
                  errors.notes && { borderColor: '#EF4444' },
                ]}
              >
                <TextInput
                  style={[inputStyle, { minHeight: 80, textAlignVertical: 'top' }]}
                  placeholder="How was your week? Any challenges or wins?"
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  multiline
                  numberOfLines={4}
                  value={formData.notes || ''}
                  onChangeText={(text) => updateField('notes', text)}
                />
              </View>
              {renderFieldError('notes')}
            </View>
          </View>
        )}

        {/* Photos Step */}
        {currentStep === 'photos' && (
          <View style={{ flex: 1 }}>
            <View
              style={{
                padding: 12,
                borderRadius: 12,
                marginBottom: 16,
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
              }}
            >
              <Text style={{ fontSize: 14, color: isDark ? '#93C5FD' : '#1D4ED8' }}>
                Optional but recommended for tracking visual progress
              </Text>
            </View>

            {(['front', 'side', 'back'] as PhotoPosition[]).map((position) => (
              <View
                key={position}
                style={{
                  backgroundColor: isDark ? '#374151' : '#F9FAFB',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: isDark ? '#4B5563' : '#E5E7EB',
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: isDark ? '#F3F4F6' : '#1F2937',
                    marginBottom: 8,
                    textTransform: 'capitalize',
                  }}
                >
                  {position} View
                </Text>

                {photos[position].uri ? (
                  <View>
                    <Image
                      source={{ uri: photos[position].uri! }}
                      style={{ width: '100%', height: 200, borderRadius: 8 }}
                      resizeMode="cover"
                    />
                    <Pressable
                      onPress={() => clearPhoto(position)}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: '#EF4444',
                        borderRadius: 16,
                        padding: 4,
                      }}
                    >
                      <X size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => pickPhoto(position)}
                      style={{
                        flex: 1,
                        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                        padding: 12,
                        borderRadius: 12,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: isDark ? '#4B5563' : '#E5E7EB',
                      }}
                    >
                      <Text style={{ color: isDark ? '#F3F4F6' : '#1F2937', fontWeight: '500' }}>
                        Gallery
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => takePhoto(position)}
                      style={{
                        flex: 1,
                        backgroundColor: '#6366F1',
                        padding: 12,
                        borderRadius: 12,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                      }}
                    >
                      <Camera size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>Camera</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Fixed Navigation */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: isDark ? '#111827' : '#F9FAFB',
        }}
      >
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => {
              if (currentStepIndex > 0) {
                setErrors({});
                setCurrentStep(FORM_STEPS[currentStepIndex - 1]);
              } else {
                router.back();
              }
            }}
            style={{
              flex: 1,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: isDark ? '#4B5563' : '#D1D5DB',
            }}
          >
            <ChevronLeft color={isDark ? '#FFFFFF' : '#111827'} size={20} />
            <Text style={{ fontWeight: '600', marginLeft: 4, color: isDark ? '#FFFFFF' : '#111827' }}>
              {currentStepIndex > 0 ? 'Back' : 'Cancel'}
            </Text>
          </Pressable>

          {currentStepIndex < FORM_STEPS.length - 1 ? (
            <Pressable
              onPress={() => {
                if (validateStep(currentStep)) {
                  setCurrentStep(FORM_STEPS[currentStepIndex + 1]);
                }
              }}
              style={{
                flex: 1,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                backgroundColor: '#6366F1',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', marginRight: 4 }}>Next</Text>
              <ChevronRight color="#FFFFFF" size={20} />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={{
                flex: 1,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                backgroundColor: '#10B981',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Check color="#FFFFFF" size={20} />
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: 4 }}>Submit</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Success Modal */}
      <ConfirmationModal
        visible={showSuccessModal}
        title={isEditMode ? "Check-in Updated!" : "Check-in Submitted!"}
        message={isEditMode ? "Your changes have been saved." : "Your coach will review your update shortly."}
        confirmText="OK"
        confirmColor="green"
        onConfirm={handleSuccessClose}
        onCancel={handleSuccessClose}
      />
    </View>
  );
}
