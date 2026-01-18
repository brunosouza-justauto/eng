import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Check, User, Target, Dumbbell, Utensils, Heart, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TIME_OPTIONS, EQUIPMENT_OPTIONS, TRACKING_METHOD_OPTIONS } from '../types/profile';
import CustomPicker from '../components/CustomPicker';
import { HapticPressable } from '../components/HapticPressable';

type Gender = 'male' | 'female' | null;
type GoalType = 'fat_loss' | 'muscle_gain' | 'both' | 'maintenance' | null;
type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | null;

export default function EditProfileScreen() {
  const { isDark } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    demographics: true,
    goals: false,
    training: false,
    nutrition: false,
    lifestyle: false,
  });

  // Demographics
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [gender, setGender] = useState<Gender>(profile?.gender || null);
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [weight, setWeight] = useState(profile?.weight_kg?.toString() || '');
  const [height, setHeight] = useState(profile?.height_cm?.toString() || '');
  const [bodyFat, setBodyFat] = useState(profile?.body_fat_percentage?.toString() || '');

  // Goals
  const [goalType, setGoalType] = useState<GoalType>(profile?.goal_type || null);
  const [targetFatLoss, setTargetFatLoss] = useState(profile?.goal_target_fat_loss_kg?.toString() || '');
  const [targetMuscleGain, setTargetMuscleGain] = useState(profile?.goal_target_muscle_gain_kg?.toString() || '');
  const [timeframeWeeks, setTimeframeWeeks] = useState(profile?.goal_timeframe_weeks?.toString() || '');
  const [targetWeight, setTargetWeight] = useState(profile?.goal_target_weight_kg?.toString() || '');
  const [physiqueDetails, setPhysiqueDetails] = useState(profile?.goal_physique_details || '');

  // Training
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(profile?.experience_level || null);
  const [trainingEquipment, setTrainingEquipment] = useState(profile?.training_equipment || '');
  const [trainingTime, setTrainingTime] = useState(profile?.training_time_of_day || '');
  const [trainingDays, setTrainingDays] = useState(profile?.training_days_per_week?.toString() || '');
  const [currentProgram, setCurrentProgram] = useState(profile?.training_current_program || '');
  const [sessionLength, setSessionLength] = useState(profile?.training_session_length_minutes?.toString() || '');
  const [trainingIntensity, setTrainingIntensity] = useState(profile?.training_intensity || '');

  // Nutrition
  const [trackingMethod, setTrackingMethod] = useState(profile?.nutrition_tracking_method || '');
  const [wakeupTime, setWakeupTime] = useState(profile?.nutrition_wakeup_time_of_day || '');
  const [bedTime, setBedTime] = useState(profile?.nutrition_bed_time_of_day || '');
  const [mealPatterns, setMealPatterns] = useState(profile?.nutrition_meal_patterns || '');
  const [dietaryPreferences, setDietaryPreferences] = useState(profile?.nutrition_preferences || '');
  const [allergies, setAllergies] = useState(profile?.nutrition_allergies || '');

  // Lifestyle
  const [sleepHours, setSleepHours] = useState(profile?.lifestyle_sleep_hours?.toString() || '');
  const [stressLevel, setStressLevel] = useState(profile?.lifestyle_stress_level?.toString() || '');
  const [scheduleNotes, setScheduleNotes] = useState(profile?.lifestyle_schedule_notes || '');
  const [supplements, setSupplements] = useState(profile?.supplements_meds || '');
  const [waterIntake, setWaterIntake] = useState(profile?.lifestyle_water_intake_liters?.toString() || '');
  const [motivation, setMotivation] = useState(profile?.motivation_readiness || '');

  // Calculate target weight based on goals
  useEffect(() => {
    if (weight && goalType) {
      const currentWeight = parseFloat(weight);
      const fatLoss = parseFloat(targetFatLoss) || 0;
      const muscleGain = parseFloat(targetMuscleGain) || 0;

      let calculated = currentWeight;
      if (goalType === 'fat_loss') {
        calculated = currentWeight - fatLoss;
      } else if (goalType === 'muscle_gain') {
        calculated = currentWeight + muscleGain;
      } else if (goalType === 'both') {
        calculated = currentWeight - fatLoss + muscleGain;
      }

      setTargetWeight(Math.max(0, calculated).toFixed(1));
    }
  }, [weight, goalType, targetFatLoss, targetMuscleGain]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Demographics validation
    if (!firstName.trim()) newErrors.firstName = t('editProfile.validation.firstNameRequired');
    if (!lastName.trim()) newErrors.lastName = t('editProfile.validation.lastNameRequired');
    if (!gender) newErrors.gender = t('editProfile.validation.selectGender');
    if (!age || parseInt(age) <= 0) newErrors.age = t('editProfile.validation.validAge');
    if (!weight || parseFloat(weight) <= 0) newErrors.weight = t('editProfile.validation.validWeight');
    if (!height || parseFloat(height) <= 0) newErrors.height = t('editProfile.validation.validHeight');

    setErrors(newErrors);

    // Expand sections with errors
    if (newErrors.firstName || newErrors.lastName || newErrors.gender || newErrors.age || newErrors.weight || newErrors.height) {
      setExpandedSections((prev) => ({ ...prev, demographics: true }));
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const updateData: Record<string, any> = {
        // Username (firstname.lastname in lowercase)
        username: `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}`,

        // Demographics
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender,
        age: parseInt(age),
        weight_kg: parseFloat(weight),
        height_cm: parseFloat(height),
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : null,

        // Goals
        goal_type: goalType,
        goal_target_fat_loss_kg: targetFatLoss ? parseFloat(targetFatLoss) : null,
        goal_target_muscle_gain_kg: targetMuscleGain ? parseFloat(targetMuscleGain) : null,
        goal_timeframe_weeks: timeframeWeeks ? parseInt(timeframeWeeks) : null,
        goal_target_weight_kg: targetWeight ? parseFloat(targetWeight) : null,
        goal_physique_details: physiqueDetails.trim() || null,

        // Training
        experience_level: experienceLevel,
        training_equipment: trainingEquipment || null,
        training_time_of_day: trainingTime || null,
        training_days_per_week: trainingDays ? parseInt(trainingDays) : null,
        training_current_program: currentProgram.trim() || null,
        training_session_length_minutes: sessionLength ? parseInt(sessionLength) : null,
        training_intensity: trainingIntensity.trim() || null,

        // Nutrition
        nutrition_tracking_method: trackingMethod || null,
        nutrition_wakeup_time_of_day: wakeupTime || null,
        nutrition_bed_time_of_day: bedTime || null,
        nutrition_meal_patterns: mealPatterns.trim() || null,
        nutrition_preferences: dietaryPreferences.trim() || null,
        nutrition_allergies: allergies.trim() || null,

        // Lifestyle
        lifestyle_sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
        lifestyle_stress_level: stressLevel ? parseInt(stressLevel) : null,
        lifestyle_schedule_notes: scheduleNotes.trim() || null,
        lifestyle_water_intake_liters: waterIntake ? parseFloat(waterIntake) : null,
        supplements_meds: supplements.trim() || null,
        motivation_readiness: motivation.trim() || null,
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile?.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setSuccessMessage(t('editProfile.successMessage'));

      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setErrors({ general: err.message || t('editProfile.errorMessage') });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = `flex-1 py-3 px-3 text-base ${isDark ? 'text-white' : 'text-gray-900'}`;
  const inputContainerStyle = `flex-row items-center rounded-xl px-4 border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`;
  const labelStyle = `text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

  const renderSectionHeader = (title: string, icon: any, section: string) => {
    const Icon = icon;
    const isExpanded = expandedSections[section];

    return (
      <HapticPressable
        onPress={() => toggleSection(section)}
        className={`flex-row items-center justify-between p-4 rounded-xl mb-2 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
      >
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center mr-3">
            <Icon color="#6366F1" size={20} />
          </View>
          <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </Text>
        </View>
        {isExpanded ? (
          <ChevronUp color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
        ) : (
          <ChevronDown color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
        )}
      </HapticPressable>
    );
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`} style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <HapticPressable onPress={() => router.back()} className="flex-row items-center">
          <ChevronLeft color={isDark ? '#FFFFFF' : '#111827'} size={24} />
          <Text className={`text-base ml-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('common.back')}</Text>
        </HapticPressable>
        <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('profile.editProfile')}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
        enableAutomaticScroll={true}
      >
        {/* Success Message */}
        {successMessage ? (
          <View className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}>
            <Text className="text-green-600 text-sm">{successMessage}</Text>
          </View>
        ) : null}

        {/* General Error */}
        {errors.general ? (
          <View className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
            <Text className="text-red-500 text-sm">{errors.general}</Text>
          </View>
        ) : null}

        {/* Demographics Section */}
        {renderSectionHeader(t('editProfile.sections.demographics'), User, 'demographics')}
        {expandedSections.demographics && (
          <View className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.firstName')} *</Text>
              <View className={`${inputContainerStyle} ${errors.firstName ? 'border-red-500' : ''}`}>
                <TextInput className={inputStyle} placeholder={t('editProfile.placeholders.firstName')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={firstName} onChangeText={(v) => { setFirstName(v); clearFieldError('firstName'); }} autoCapitalize="words" />
              </View>
              {errors.firstName && <Text className="text-red-500 text-xs mt-1">{errors.firstName}</Text>}
            </View>

            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.lastName')} *</Text>
              <View className={`${inputContainerStyle} ${errors.lastName ? 'border-red-500' : ''}`}>
                <TextInput className={inputStyle} placeholder={t('editProfile.placeholders.lastName')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={lastName} onChangeText={(v) => { setLastName(v); clearFieldError('lastName'); }} autoCapitalize="words" />
              </View>
              {errors.lastName && <Text className="text-red-500 text-xs mt-1">{errors.lastName}</Text>}
            </View>

            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.sex')} *</Text>
              <View className="flex-row gap-3">
                {(['male', 'female'] as const).map((g) => (
                  <HapticPressable key={g} onPress={() => { setGender(g); clearFieldError('gender'); }} className={`flex-1 py-3 rounded-xl items-center border ${gender === g ? 'bg-indigo-500 border-indigo-500' : errors.gender ? 'border-red-500' : isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <Text className={`font-medium ${gender === g ? 'text-white' : isDark ? 'text-white' : 'text-gray-900'}`}>{t(`editProfile.fields.${g}`)}</Text>
                  </HapticPressable>
                ))}
              </View>
              {errors.gender && <Text className="text-red-500 text-xs mt-1">{errors.gender}</Text>}
            </View>

            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.age')} *</Text>
              <View className={`${inputContainerStyle} ${errors.age ? 'border-red-500' : ''}`}>
                <TextInput className={inputStyle} placeholder={t('editProfile.placeholders.age')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={age} onChangeText={(v) => { setAge(v); clearFieldError('age'); }} keyboardType="numeric" />
              </View>
              {errors.age && <Text className="text-red-500 text-xs mt-1">{errors.age}</Text>}
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className={labelStyle}>{t('editProfile.fields.weightKg')} *</Text>
                <View className={`${inputContainerStyle} ${errors.weight ? 'border-red-500' : ''}`}>
                  <TextInput className={inputStyle} placeholder={t('editProfile.placeholders.weight')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={weight} onChangeText={(v) => { setWeight(v); clearFieldError('weight'); }} keyboardType="decimal-pad" />
                </View>
                {errors.weight && <Text className="text-red-500 text-xs mt-1">{errors.weight}</Text>}
              </View>
              <View className="flex-1">
                <Text className={labelStyle}>{t('editProfile.fields.heightCm')} *</Text>
                <View className={`${inputContainerStyle} ${errors.height ? 'border-red-500' : ''}`}>
                  <TextInput className={inputStyle} placeholder={t('editProfile.placeholders.height')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={height} onChangeText={(v) => { setHeight(v); clearFieldError('height'); }} keyboardType="decimal-pad" />
                </View>
                {errors.height && <Text className="text-red-500 text-xs mt-1">{errors.height}</Text>}
              </View>
            </View>

            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.bodyFatPercent')}</Text>
              <View className={inputContainerStyle}>
                <TextInput className={inputStyle} placeholder={t('editProfile.placeholders.bodyFat')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={bodyFat} onChangeText={setBodyFat} keyboardType="decimal-pad" />
              </View>
            </View>
          </View>
        )}

        {/* Goals Section */}
        {renderSectionHeader(t('editProfile.sections.goals'), Target, 'goals')}
        {expandedSections.goals && (
          <View className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.primaryGoal')}</Text>
              <CustomPicker
                selectedValue={goalType}
                onValueChange={setGoalType}
                placeholder={t('editProfile.fields.selectPrimaryGoal')}
                options={[
                  { label: t('editProfile.fields.selectPrimaryGoal'), value: null },
                  { label: t('editProfile.goals.fatLoss'), value: 'fat_loss' },
                  { label: t('editProfile.goals.muscleGain'), value: 'muscle_gain' },
                  { label: t('editProfile.goals.both'), value: 'both' },
                  { label: t('editProfile.goals.maintenance'), value: 'maintenance' },
                ]}
              />
            </View>

            {(goalType === 'fat_loss' || goalType === 'both') && (
              <View className="mb-4">
                <Text className={labelStyle}>{t('editProfile.fields.targetFatLoss')}</Text>
                <View className={inputContainerStyle}>
                  <TextInput className={inputStyle} placeholder={t('editProfile.placeholders.fatLoss')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={targetFatLoss} onChangeText={setTargetFatLoss} keyboardType="decimal-pad" />
                </View>
              </View>
            )}

            {(goalType === 'muscle_gain' || goalType === 'both') && (
              <View className="mb-4">
                <Text className={labelStyle}>{t('editProfile.fields.targetMuscleGain')}</Text>
                <View className={inputContainerStyle}>
                  <TextInput className={inputStyle} placeholder={t('editProfile.placeholders.muscleGain')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={targetMuscleGain} onChangeText={setTargetMuscleGain} keyboardType="decimal-pad" />
                </View>
              </View>
            )}

            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.timeframeWeeks')}</Text>
              <View className={inputContainerStyle}>
                <TextInput className={inputStyle} placeholder={t('editProfile.placeholders.timeframe')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={timeframeWeeks} onChangeText={setTimeframeWeeks} keyboardType="numeric" />
              </View>
            </View>

            {targetWeight && goalType && (
              <View className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <Text className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                  {t('editProfile.fields.targetWeight')}: <Text className="font-bold">{targetWeight} kg</Text> ({t('editProfile.fields.calculated')})
                </Text>
              </View>
            )}

            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.physiqueGoals')}</Text>
              <View className={`${inputContainerStyle} min-h-[80px] items-start py-2`}>
                <TextInput className={`${inputStyle} min-h-[60px]`} placeholder={t('editProfile.placeholders.physiqueGoals')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={physiqueDetails} onChangeText={setPhysiqueDetails} multiline textAlignVertical="top" />
              </View>
            </View>
          </View>
        )}

        {/* Training Section */}
        {renderSectionHeader(t('editProfile.sections.training'), Dumbbell, 'training')}
        {expandedSections.training && (
          <View className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.experienceLevel')}</Text>
              <View className="flex-row gap-2">
                {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                  <HapticPressable key={level} onPress={() => setExperienceLevel(level)} className={`flex-1 py-3 rounded-xl items-center border ${experienceLevel === level ? 'bg-indigo-500 border-indigo-500' : isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <Text className={`font-medium text-xs ${experienceLevel === level ? 'text-white' : isDark ? 'text-white' : 'text-gray-900'}`}>{t(`editProfile.experience.${level}`)}</Text>
                  </HapticPressable>
                ))}
              </View>
            </View>

            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.equipmentAvailable')}</Text>
              <CustomPicker
                selectedValue={trainingEquipment}
                onValueChange={setTrainingEquipment}
                placeholder={t('editProfile.fields.selectEquipment')}
                options={[
                  { label: t('editProfile.fields.selectEquipment'), value: '' },
                  ...EQUIPMENT_OPTIONS.map((opt) => ({ label: opt, value: opt })),
                ]}
              />
            </View>

            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.trainingTime')}</Text>
              <CustomPicker
                selectedValue={trainingTime}
                onValueChange={setTrainingTime}
                placeholder={t('editProfile.fields.selectTime')}
                options={[
                  { label: t('editProfile.fields.selectTime'), value: '' },
                  ...TIME_OPTIONS.map((time) => ({ label: time, value: time })),
                ]}
              />
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className={labelStyle}>{t('editProfile.fields.daysPerWeek')}</Text>
                <View className={inputContainerStyle}>
                  <TextInput className={inputStyle} placeholder={t('editProfile.placeholders.trainingDays')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={trainingDays} onChangeText={setTrainingDays} keyboardType="numeric" />
                </View>
              </View>
              <View className="flex-1">
                <Text className={labelStyle}>{t('editProfile.fields.sessionMin')}</Text>
                <View className={inputContainerStyle}>
                  <TextInput className={inputStyle} placeholder={t('editProfile.placeholders.sessionLength')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={sessionLength} onChangeText={setSessionLength} keyboardType="numeric" />
                </View>
              </View>
            </View>

            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.currentProgram')}</Text>
              <View className={`${inputContainerStyle} min-h-[60px] items-start py-2`}>
                <TextInput className={`${inputStyle} min-h-[40px]`} placeholder={t('editProfile.placeholders.currentProgram')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={currentProgram} onChangeText={setCurrentProgram} multiline textAlignVertical="top" />
              </View>
            </View>
          </View>
        )}

        {/* Nutrition Section */}
        {renderSectionHeader(t('editProfile.sections.nutrition'), Utensils, 'nutrition')}
        {expandedSections.nutrition && (
          <View className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.trackingMethod')}</Text>
              <CustomPicker
                selectedValue={trackingMethod}
                onValueChange={setTrackingMethod}
                placeholder={t('editProfile.fields.selectTrackingMethod')}
                options={[
                  { label: t('editProfile.fields.selectTrackingMethod'), value: '' },
                  ...TRACKING_METHOD_OPTIONS.map((opt) => ({ label: opt, value: opt })),
                ]}
              />
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className={labelStyle}>{t('editProfile.fields.wakeupTime')}</Text>
                <CustomPicker
                  selectedValue={wakeupTime}
                  onValueChange={setWakeupTime}
                  placeholder={t('editProfile.fields.select')}
                  options={[
                    { label: t('editProfile.fields.select'), value: '' },
                    ...TIME_OPTIONS.map((time) => ({ label: time, value: time })),
                  ]}
                />
              </View>
              <View className="flex-1">
                <Text className={labelStyle}>{t('editProfile.fields.bedTime')}</Text>
                <CustomPicker
                  selectedValue={bedTime}
                  onValueChange={setBedTime}
                  placeholder={t('editProfile.fields.select')}
                  options={[
                    { label: t('editProfile.fields.select'), value: '' },
                    ...[...TIME_OPTIONS].reverse().map((time) => ({ label: time, value: time })),
                  ]}
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.mealPatterns')}</Text>
              <View className={`${inputContainerStyle} min-h-[60px] items-start py-2`}>
                <TextInput className={`${inputStyle} min-h-[40px]`} placeholder={t('editProfile.placeholders.mealPatterns')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={mealPatterns} onChangeText={setMealPatterns} multiline textAlignVertical="top" />
              </View>
            </View>

            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.dietaryPreferences')}</Text>
              <View className={`${inputContainerStyle} min-h-[60px] items-start py-2`}>
                <TextInput className={`${inputStyle} min-h-[40px]`} placeholder={t('editProfile.placeholders.dietaryPreferences')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={dietaryPreferences} onChangeText={setDietaryPreferences} multiline textAlignVertical="top" />
              </View>
            </View>

            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.allergies')}</Text>
              <View className={`${inputContainerStyle} min-h-[60px] items-start py-2`}>
                <TextInput className={`${inputStyle} min-h-[40px]`} placeholder={t('editProfile.placeholders.allergies')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={allergies} onChangeText={setAllergies} multiline textAlignVertical="top" />
              </View>
            </View>
          </View>
        )}

        {/* Lifestyle Section */}
        {renderSectionHeader(t('editProfile.sections.lifestyle'), Heart, 'lifestyle')}
        {expandedSections.lifestyle && (
          <View className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className={labelStyle}>{t('editProfile.fields.sleepHours')}</Text>
                <View className={inputContainerStyle}>
                  <TextInput className={inputStyle} placeholder={t('editProfile.placeholders.sleepHours')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={sleepHours} onChangeText={setSleepHours} keyboardType="decimal-pad" />
                </View>
              </View>
              <View className="flex-1">
                <Text className={labelStyle}>{t('editProfile.fields.stressLevel')}</Text>
                <View className={inputContainerStyle}>
                  <TextInput className={inputStyle} placeholder={t('editProfile.placeholders.stressLevel')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={stressLevel} onChangeText={setStressLevel} keyboardType="numeric" />
                </View>
              </View>
            </View>

            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.waterIntake')}</Text>
              <View className={inputContainerStyle}>
                <TextInput className={inputStyle} placeholder={t('editProfile.placeholders.waterIntake')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={waterIntake} onChangeText={setWaterIntake} keyboardType="decimal-pad" />
              </View>
            </View>

            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.supplements')}</Text>
              <View className={`${inputContainerStyle} min-h-[60px] items-start py-2`}>
                <TextInput className={`${inputStyle} min-h-[40px]`} placeholder={t('editProfile.placeholders.supplements')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={supplements} onChangeText={setSupplements} multiline textAlignVertical="top" />
              </View>
            </View>

            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.scheduleNotes')}</Text>
              <View className={`${inputContainerStyle} min-h-[60px] items-start py-2`}>
                <TextInput className={`${inputStyle} min-h-[40px]`} placeholder={t('editProfile.placeholders.scheduleNotes')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={scheduleNotes} onChangeText={setScheduleNotes} multiline textAlignVertical="top" />
              </View>
            </View>

            <View className="mb-4">
              <Text className={labelStyle}>{t('editProfile.fields.motivation')}</Text>
              <View className={`${inputContainerStyle} min-h-[80px] items-start py-2`}>
                <TextInput className={`${inputStyle} min-h-[60px]`} placeholder={t('editProfile.placeholders.motivation')} placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={motivation} onChangeText={setMotivation} multiline textAlignVertical="top" />
              </View>
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Save Button - Fixed at bottom */}
      <View className="px-5 pt-4" style={{ paddingBottom: insets.bottom + 10 }}>
        <HapticPressable
          onPress={handleSave}
          disabled={loading}
          className={`rounded-xl py-4 items-center flex-row justify-center ${loading ? 'opacity-50' : ''}`}
          style={{ backgroundColor: '#10B981' }}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Check color="#FFFFFF" size={20} />
              <Text className="text-white font-semibold ml-2">{t('editProfile.saveChanges')}</Text>
            </>
          )}
        </HapticPressable>
      </View>
    </View>
  );
}
