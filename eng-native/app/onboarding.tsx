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
import { User, Scale, Ruler, Calendar, ChevronRight, ChevronLeft, Check, Target, Dumbbell, Utensils, Heart } from 'lucide-react-native';
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

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: Demographics
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [gender, setGender] = useState<Gender>(profile?.gender || null);
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [weight, setWeight] = useState(profile?.weight_kg?.toString() || '');
  const [height, setHeight] = useState(profile?.height_cm?.toString() || '');
  const [bodyFat, setBodyFat] = useState(profile?.body_fat_percentage?.toString() || '');

  // Step 2: Goals
  const [goalType, setGoalType] = useState<GoalType>(profile?.goal_type || null);
  const [targetFatLoss, setTargetFatLoss] = useState(profile?.goal_target_fat_loss_kg?.toString() || '');
  const [targetMuscleGain, setTargetMuscleGain] = useState(profile?.goal_target_muscle_gain_kg?.toString() || '');
  const [timeframeWeeks, setTimeframeWeeks] = useState(profile?.goal_timeframe_weeks?.toString() || '');
  const [targetWeight, setTargetWeight] = useState(profile?.goal_target_weight_kg?.toString() || '');
  const [physiqueDetails, setPhysiqueDetails] = useState(profile?.goal_physique_details || '');

  // Step 3: Training
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(profile?.experience_level || null);
  const [trainingEquipment, setTrainingEquipment] = useState(profile?.training_equipment || '');
  const [trainingTime, setTrainingTime] = useState(profile?.training_time_of_day || '');
  const [trainingDays, setTrainingDays] = useState(profile?.training_days_per_week?.toString() || '');
  const [currentProgram, setCurrentProgram] = useState(profile?.training_current_program || '');
  const [sessionLength, setSessionLength] = useState(profile?.training_session_length_minutes?.toString() || '');
  const [trainingIntensity, setTrainingIntensity] = useState(profile?.training_intensity || '');

  // Step 4: Nutrition
  const [trackingMethod, setTrackingMethod] = useState(profile?.nutrition_tracking_method || '');
  const [wakeupTime, setWakeupTime] = useState(profile?.nutrition_wakeup_time_of_day || '');
  const [bedTime, setBedTime] = useState(profile?.nutrition_bed_time_of_day || '');
  const [mealPatterns, setMealPatterns] = useState(profile?.nutrition_meal_patterns || '');
  const [dietaryPreferences, setDietaryPreferences] = useState(profile?.nutrition_preferences || '');
  const [allergies, setAllergies] = useState(profile?.nutrition_allergies || '');

  // Step 5: Lifestyle
  const [sleepHours, setSleepHours] = useState(profile?.lifestyle_sleep_hours?.toString() || '');
  const [stressLevel, setStressLevel] = useState(profile?.lifestyle_stress_level?.toString() || '');
  const [scheduleNotes, setScheduleNotes] = useState(profile?.lifestyle_schedule_notes || '');
  const [supplements, setSupplements] = useState(profile?.supplements_meds || '');
  const [waterIntake, setWaterIntake] = useState(profile?.lifestyle_water_intake_liters?.toString() || '');
  const [motivation, setMotivation] = useState(profile?.motivation_readiness || '');

  const totalSteps = 5;

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

  const validateStep = (stepNum: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (stepNum) {
      case 1:
        if (!firstName.trim()) newErrors.firstName = t('onboarding.validation.firstNameRequired');
        if (!lastName.trim()) newErrors.lastName = t('onboarding.validation.lastNameRequired');
        if (!gender) newErrors.gender = t('onboarding.validation.selectGender');
        if (!age || parseInt(age) <= 0) newErrors.age = t('onboarding.validation.validAge');
        if (!weight || parseFloat(weight) <= 0) newErrors.weight = t('onboarding.validation.validWeight');
        if (!height || parseFloat(height) <= 0) newErrors.height = t('onboarding.validation.validHeight');
        if (!bodyFat || parseFloat(bodyFat) <= 0 || parseFloat(bodyFat) > 100) newErrors.bodyFat = t('onboarding.validation.validBodyFat');
        break;

      case 2:
        if (!goalType) newErrors.goalType = t('onboarding.validation.selectGoal');
        if ((goalType === 'fat_loss' || goalType === 'both') && !targetFatLoss) newErrors.targetFatLoss = t('onboarding.validation.enterFatLoss');
        if ((goalType === 'muscle_gain' || goalType === 'both') && !targetMuscleGain) newErrors.targetMuscleGain = t('onboarding.validation.enterMuscleGain');
        if (!timeframeWeeks || parseInt(timeframeWeeks) <= 0) newErrors.timeframeWeeks = t('onboarding.validation.validTimeframe');
        if (!physiqueDetails.trim()) newErrors.physiqueDetails = t('onboarding.validation.describePhysique');
        break;

      case 3:
        if (!experienceLevel) newErrors.experienceLevel = t('onboarding.validation.selectExperience');
        if (!trainingEquipment) newErrors.trainingEquipment = t('onboarding.validation.selectEquipment');
        if (!trainingTime) newErrors.trainingTime = t('onboarding.validation.selectTrainingTime');
        if (!trainingDays || parseInt(trainingDays) < 3 || parseInt(trainingDays) > 7) newErrors.trainingDays = t('onboarding.validation.validTrainingDays');
        break;

      case 4:
        if (!trackingMethod) newErrors.trackingMethod = t('onboarding.validation.selectTracking');
        if (!wakeupTime) newErrors.wakeupTime = t('onboarding.validation.selectWakeup');
        if (!bedTime) newErrors.bedTime = t('onboarding.validation.selectBed');
        if (!mealPatterns.trim()) newErrors.mealPatterns = t('onboarding.validation.describeMeals');
        break;

      case 5:
        if (!sleepHours || parseFloat(sleepHours) <= 0) newErrors.sleepHours = t('onboarding.validation.enterSleep');
        if (!stressLevel || parseInt(stressLevel) < 1 || parseInt(stressLevel) > 10) newErrors.stressLevel = t('onboarding.validation.enterStress');
        if (!waterIntake || parseFloat(waterIntake) <= 0) newErrors.waterIntake = t('onboarding.validation.enterWater');
        if (!motivation.trim()) newErrors.motivation = t('onboarding.validation.describeMotivation');
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const renderFieldError = (field: string) => {
    if (!errors[field]) return null;
    return (
      <Text className="text-red-500 text-xs mt-1">{errors[field]}</Text>
    );
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
    }
  };

  const handleComplete = async () => {
    if (!validateStep(step)) return;

    setLoading(true);
    setErrors({});

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
        body_fat_percentage: parseFloat(bodyFat),

        // Goals
        goal_type: goalType,
        goal_target_fat_loss_kg: targetFatLoss ? parseFloat(targetFatLoss) : null,
        goal_target_muscle_gain_kg: targetMuscleGain ? parseFloat(targetMuscleGain) : null,
        goal_timeframe_weeks: parseInt(timeframeWeeks),
        goal_target_weight_kg: parseFloat(targetWeight),
        goal_physique_details: physiqueDetails.trim(),

        // Training
        experience_level: experienceLevel,
        training_equipment: trainingEquipment,
        training_time_of_day: trainingTime,
        training_days_per_week: parseInt(trainingDays),
        training_current_program: currentProgram.trim() || null,
        training_session_length_minutes: sessionLength ? parseInt(sessionLength) : null,
        training_intensity: trainingIntensity.trim() || null,

        // Nutrition
        nutrition_tracking_method: trackingMethod,
        nutrition_wakeup_time_of_day: wakeupTime,
        nutrition_bed_time_of_day: bedTime,
        nutrition_meal_patterns: mealPatterns.trim(),
        nutrition_preferences: dietaryPreferences.trim() || null,
        nutrition_allergies: allergies.trim() || null,

        // Lifestyle
        lifestyle_sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
        lifestyle_stress_level: stressLevel ? parseInt(stressLevel) : null,
        lifestyle_schedule_notes: scheduleNotes.trim() || null,
        lifestyle_water_intake_liters: parseFloat(waterIntake),
        supplements_meds: supplements.trim() || null,
        motivation_readiness: motivation.trim(),

        onboarding_complete: true,
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile?.id);

      if (updateError) throw updateError;

      await refreshProfile();
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      setErrors({ general: err.message || 'Failed to save profile' });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = `flex-1 py-3 px-3 text-base ${isDark ? 'text-white' : 'text-gray-900'}`;
  const inputContainerStyle = `flex-row items-center rounded-xl px-4 border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`;
  const labelStyle = `text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

  const renderStepIcon = () => {
    const icons = [User, Target, Dumbbell, Utensils, Heart];
    const Icon = icons[step - 1];
    return <Icon color="#6366F1" size={24} />;
  };

  const stepTitleKeys = ['onboarding.steps.demographics', 'onboarding.steps.goals', 'onboarding.steps.training', 'onboarding.steps.nutrition', 'onboarding.steps.lifestyle'];

  // Render Step 1: Demographics
  const renderStep1 = () => (
    <>
      <View className="mb-4">
        <Text className={labelStyle}>First Name *</Text>
        <View className={`${inputContainerStyle} ${errors.firstName ? 'border-red-500' : ''}`}>
          <User color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
          <TextInput className={inputStyle} placeholder="Your first name" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={firstName} onChangeText={(v) => { setFirstName(v); clearFieldError('firstName'); }} autoCapitalize="words" />
        </View>
        {renderFieldError('firstName')}
      </View>

      <View className="mb-4">
        <Text className={labelStyle}>Last Name *</Text>
        <View className={`${inputContainerStyle} ${errors.lastName ? 'border-red-500' : ''}`}>
          <User color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
          <TextInput className={inputStyle} placeholder="Your last name" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={lastName} onChangeText={(v) => { setLastName(v); clearFieldError('lastName'); }} autoCapitalize="words" />
        </View>
        {renderFieldError('lastName')}
      </View>

      <View className="mb-4">
        <Text className={labelStyle}>Sex *</Text>
        <View className="flex-row gap-3">
          {(['male', 'female'] as const).map((g) => (
            <HapticPressable key={g} onPress={() => { setGender(g); clearFieldError('gender'); }} className={`flex-1 py-3 rounded-xl items-center border ${gender === g ? 'bg-indigo-500 border-indigo-500' : errors.gender ? 'border-red-500' : isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <Text className={`font-medium capitalize ${gender === g ? 'text-white' : isDark ? 'text-white' : 'text-gray-900'}`}>{g}</Text>
            </HapticPressable>
          ))}
        </View>
        {renderFieldError('gender')}
      </View>

      <View className="mb-4">
        <Text className={labelStyle}>Age *</Text>
        <View className={`${inputContainerStyle} ${errors.age ? 'border-red-500' : ''}`}>
          <Calendar color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
          <TextInput className={inputStyle} placeholder="e.g., 30" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={age} onChangeText={(v) => { setAge(v); clearFieldError('age'); }} keyboardType="numeric" />
        </View>
        {renderFieldError('age')}
      </View>

      <View className="flex-row gap-3 mb-4">
        <View className="flex-1">
          <Text className={labelStyle}>Weight (kg) *</Text>
          <View className={`${inputContainerStyle} ${errors.weight ? 'border-red-500' : ''}`}>
            <Scale color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
            <TextInput className={inputStyle} placeholder="e.g., 75.5" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={weight} onChangeText={(v) => { setWeight(v); clearFieldError('weight'); }} keyboardType="decimal-pad" />
          </View>
          {renderFieldError('weight')}
        </View>
        <View className="flex-1">
          <Text className={labelStyle}>Height (cm) *</Text>
          <View className={`${inputContainerStyle} ${errors.height ? 'border-red-500' : ''}`}>
            <Ruler color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
            <TextInput className={inputStyle} placeholder="e.g., 180" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={height} onChangeText={(v) => { setHeight(v); clearFieldError('height'); }} keyboardType="decimal-pad" />
          </View>
          {renderFieldError('height')}
        </View>
      </View>

      <View className={`p-3 rounded-lg mb-3 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
        <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Typical Body Fat Percentage Ranges:</Text>
        <View className="flex-row">
          <View className="flex-1">
            <Text className={`text-xs font-medium mb-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Men:</Text>
            <Text className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>• Essential fat: 2-5%</Text>
            <Text className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>• Athletes: 6-13%</Text>
            <Text className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>• Fitness: 14-17%</Text>
            <Text className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>• Average: 18-24%</Text>
            <Text className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>• Obese: 25%+</Text>
          </View>
          <View className="flex-1">
            <Text className={`text-xs font-medium mb-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Women:</Text>
            <Text className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>• Essential fat: 10-13%</Text>
            <Text className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>• Athletes: 14-20%</Text>
            <Text className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>• Fitness: 21-24%</Text>
            <Text className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>• Average: 25-31%</Text>
            <Text className={`text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>• Obese: 32%+</Text>
          </View>
        </View>
      </View>

      <View className="mb-4">
        <Text className={labelStyle}>Estimated Body Fat (%) based on the numbers above *</Text>
        <View className={`${inputContainerStyle} ${errors.bodyFat ? 'border-red-500' : ''}`}>
          <TextInput className={inputStyle} placeholder="e.g., 15" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={bodyFat} onChangeText={(v) => { setBodyFat(v); clearFieldError('bodyFat'); }} keyboardType="decimal-pad" />
        </View>
        {renderFieldError('bodyFat')}
      </View>
    </>
  );

  // Render Step 2: Goals
  const renderStep2 = () => (
    <>
      <View className="mb-4">
        <Text className={labelStyle}>Primary Goal *</Text>
        <CustomPicker
          selectedValue={goalType}
          onValueChange={(v) => { setGoalType(v); clearFieldError('goalType'); }}
          placeholder="Select Your Primary Goal"
          hasError={!!errors.goalType}
          options={[
            { label: 'Select Your Primary Goal', value: null },
            { label: 'Fat Loss', value: 'fat_loss' },
            { label: 'Muscle Gain', value: 'muscle_gain' },
            { label: 'Both (Recomposition)', value: 'both' },
            { label: 'Maintenance', value: 'maintenance' },
          ]}
        />
        {renderFieldError('goalType')}
      </View>

      {(goalType === 'fat_loss' || goalType === 'both') && (
        <View className="mb-4">
          <Text className={labelStyle}>Target Fat Loss (kg) *</Text>
          <View className={`${inputContainerStyle} ${errors.targetFatLoss ? 'border-red-500' : ''}`}>
            <TextInput className={inputStyle} placeholder="e.g., 5" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={targetFatLoss} onChangeText={(v) => { setTargetFatLoss(v); clearFieldError('targetFatLoss'); }} keyboardType="decimal-pad" />
          </View>
          {renderFieldError('targetFatLoss')}
        </View>
      )}

      {(goalType === 'muscle_gain' || goalType === 'both') && (
        <View className="mb-4">
          <Text className={labelStyle}>Target Muscle Gain (kg) *</Text>
          <View className={`${inputContainerStyle} ${errors.targetMuscleGain ? 'border-red-500' : ''}`}>
            <TextInput className={inputStyle} placeholder="e.g., 3" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={targetMuscleGain} onChangeText={(v) => { setTargetMuscleGain(v); clearFieldError('targetMuscleGain'); }} keyboardType="decimal-pad" />
          </View>
          {renderFieldError('targetMuscleGain')}
        </View>
      )}

      <View className="mb-4">
        <Text className={labelStyle}>Timeframe (weeks) *</Text>
        <View className={`${inputContainerStyle} ${errors.timeframeWeeks ? 'border-red-500' : ''}`}>
          <TextInput className={inputStyle} placeholder="e.g., 12" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={timeframeWeeks} onChangeText={(v) => { setTimeframeWeeks(v); clearFieldError('timeframeWeeks'); }} keyboardType="numeric" />
        </View>
        {renderFieldError('timeframeWeeks')}
      </View>

      {targetWeight && goalType && (
        <View className={`p-3 rounded-lg mb-4 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
          <Text className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
            Target Weight: <Text className="font-bold">{targetWeight} kg</Text> (calculated)
          </Text>
        </View>
      )}

      <View className="mb-4">
        <Text className={labelStyle}>Specific Physique Goals *</Text>
        <View className={`${inputContainerStyle} min-h-[100px] items-start py-2 ${errors.physiqueDetails ? 'border-red-500' : ''}`}>
          <TextInput className={`${inputStyle} min-h-[80px]`} placeholder="Describe your physique goals (e.g., improve shoulder width, leaner midsection...)" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={physiqueDetails} onChangeText={(v) => { setPhysiqueDetails(v); clearFieldError('physiqueDetails'); }} multiline textAlignVertical="top" />
        </View>
        {renderFieldError('physiqueDetails')}
      </View>
    </>
  );

  // Render Step 3: Training
  const renderStep3 = () => (
    <>
      <View className="mb-4">
        <Text className={labelStyle}>Experience Level *</Text>
        <View className="flex-row gap-2">
          {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
            <HapticPressable key={level} onPress={() => { setExperienceLevel(level); clearFieldError('experienceLevel'); }} className={`flex-1 py-3 rounded-xl items-center border ${experienceLevel === level ? 'bg-indigo-500 border-indigo-500' : errors.experienceLevel ? 'border-red-500' : isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
              <Text className={`font-medium capitalize text-xs ${experienceLevel === level ? 'text-white' : isDark ? 'text-white' : 'text-gray-900'}`}>{level}</Text>
            </HapticPressable>
          ))}
        </View>
        {renderFieldError('experienceLevel')}
      </View>

      <View className="mb-4">
        <Text className={labelStyle}>Equipment Available *</Text>
        <CustomPicker
          selectedValue={trainingEquipment}
          onValueChange={(v) => { setTrainingEquipment(v); clearFieldError('trainingEquipment'); }}
          placeholder="Select your equipment"
          hasError={!!errors.trainingEquipment}
          options={[
            { label: 'Select your equipment', value: '' },
            ...EQUIPMENT_OPTIONS.map((opt) => ({ label: opt, value: opt })),
          ]}
        />
        {renderFieldError('trainingEquipment')}
      </View>

      <View className="mb-4">
        <Text className={labelStyle}>Desired Training Time of Day *</Text>
        <CustomPicker
          selectedValue={trainingTime}
          onValueChange={(v) => { setTrainingTime(v); clearFieldError('trainingTime'); }}
          placeholder="Select time"
          hasError={!!errors.trainingTime}
          options={[
            { label: 'Select time', value: '' },
            ...TIME_OPTIONS.map((t) => ({ label: t, value: t })),
          ]}
        />
        {renderFieldError('trainingTime')}
      </View>

      <View className="mb-4">
        <Text className={labelStyle}>Desired Training Days per Week (3-7) *</Text>
        <View className={`${inputContainerStyle} ${errors.trainingDays ? 'border-red-500' : ''}`}>
          <TextInput className={inputStyle} placeholder="How many days can you train per week? e.g., 5" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={trainingDays} onChangeText={(v) => { setTrainingDays(v); clearFieldError('trainingDays'); }} keyboardType="numeric" />
        </View>
        {renderFieldError('trainingDays')}
      </View>

      <View className="flex-row gap-3 mb-4">
        <View className="flex-1">
          <Text className={labelStyle}>Desired Session Length (min)</Text>
          <View className={inputContainerStyle}>
            <TextInput className={inputStyle} placeholder="e.g., 60" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={sessionLength} onChangeText={setSessionLength} keyboardType="numeric" />
          </View>
        </View>
      </View>

      <View className="mb-4">
        <Text className={labelStyle}>Current Program (optional)</Text>
        <View className={`${inputContainerStyle} min-h-[80px] items-start py-2`}>
          <TextInput className={`${inputStyle} min-h-[60px]`} placeholder="Briefly describe your current routine or program name if you have one (e.g., PPL, Starting Strength, Coach XYZ program...)" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={currentProgram} onChangeText={setCurrentProgram} multiline textAlignVertical="top" />
        </View>
      </View>

      <View className="mb-4">
        <Text className={labelStyle}>Current Training Intensity (optional)</Text>
        <View className={`${inputContainerStyle} min-h-[80px] items-start py-2`}>
          <TextInput className={`${inputStyle} min-h-[60px]`} placeholder="Describe intensity (e.g., RPE 7-9, Train to failure, Moderate effort...)" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={trainingIntensity} onChangeText={setTrainingIntensity} multiline textAlignVertical="top" />
        </View>
      </View>
    </>
  );

  // Render Step 4: Nutrition
  const renderStep4 = () => (
    <>
      <View className="mb-4">
        <Text className={labelStyle}>How do you track nutrition? *</Text>
        <CustomPicker
          selectedValue={trackingMethod}
          onValueChange={(v) => { setTrackingMethod(v); clearFieldError('trackingMethod'); }}
          placeholder="Select tracking method"
          hasError={!!errors.trackingMethod}
          options={[
            { label: 'Select tracking method', value: '' },
            ...TRACKING_METHOD_OPTIONS.map((opt) => ({ label: opt, value: opt })),
          ]}
        />
        {renderFieldError('trackingMethod')}
      </View>

      <View className="flex-row gap-3 mb-4">
        <View className="flex-1">
          <Text className={labelStyle}>Wakeup Time *</Text>
          <CustomPicker
            selectedValue={wakeupTime}
            onValueChange={(v) => { setWakeupTime(v); clearFieldError('wakeupTime'); }}
            placeholder="Select"
            hasError={!!errors.wakeupTime}
            options={[
              { label: 'Select', value: '' },
              ...TIME_OPTIONS.map((t) => ({ label: t, value: t })),
            ]}
          />
          {renderFieldError('wakeupTime')}
        </View>
        <View className="flex-1">
          <Text className={labelStyle}>Bed Time *</Text>
          <CustomPicker
            selectedValue={bedTime}
            onValueChange={(v) => { setBedTime(v); clearFieldError('bedTime'); }}
            placeholder="Select"
            hasError={!!errors.bedTime}
            options={[
              { label: 'Select', value: '' },
              ...[...TIME_OPTIONS].reverse().map((t) => ({ label: t, value: t })),
            ]}
          />
          {renderFieldError('bedTime')}
        </View>
      </View>

      <View className="mb-4">
        <Text className={labelStyle}>Typical Meal Patterns *</Text>
        <View className={`${inputContainerStyle} min-h-[80px] items-start py-2 ${errors.mealPatterns ? 'border-red-500' : ''}`}>
          <TextInput className={`${inputStyle} min-h-[60px]`} placeholder="e.g., 3 meals + 2 snacks, Intermittent fasting 16/8..." placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={mealPatterns} onChangeText={(v) => { setMealPatterns(v); clearFieldError('mealPatterns'); }} multiline textAlignVertical="top" />
        </View>
        {renderFieldError('mealPatterns')}
      </View>

      <View className="mb-4">
        <Text className={labelStyle}>Dietary Preferences (optional)</Text>
        <View className={`${inputContainerStyle} min-h-[80px] items-start py-2`}>
          <TextInput className={`${inputStyle} min-h-[60px]`} placeholder="e.g., Vegetarian, High protein, Likes spicy food..." placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={dietaryPreferences} onChangeText={setDietaryPreferences} multiline textAlignVertical="top" />
        </View>
      </View>

      <View className="mb-4">
        <Text className={labelStyle}>Food Allergies / Intolerances (optional)</Text>
        <View className={`${inputContainerStyle} min-h-[80px] items-start py-2`}>
          <TextInput className={`${inputStyle} min-h-[60px]`} placeholder="e.g., Peanuts, Dairy, Shellfish, None..." placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={allergies} onChangeText={setAllergies} multiline textAlignVertical="top" />
        </View>
      </View>
    </>
  );

  // Render Step 5: Lifestyle
  const renderStep5 = () => (
    <>
      <View className="flex-row gap-3 mb-4">
        <View className="flex-1">
          <Text className={labelStyle}>Sleep (hrs/night) *</Text>
          <View className={`${inputContainerStyle} ${errors.sleepHours ? 'border-red-500' : ''}`}>
            <TextInput className={inputStyle} placeholder="e.g., 7.5" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={sleepHours} onChangeText={(v) => { setSleepHours(v); clearFieldError('sleepHours'); }} keyboardType="decimal-pad" />
          </View>
          {renderFieldError('sleepHours')}
        </View>
        <View className="flex-1">
          <Text className={labelStyle}>Stress (1-10) *</Text>
          <View className={`${inputContainerStyle} ${errors.stressLevel ? 'border-red-500' : ''}`}>
            <TextInput className={inputStyle} placeholder="1=Low, 10=High" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={stressLevel} onChangeText={(v) => { setStressLevel(v); clearFieldError('stressLevel'); }} keyboardType="numeric" />
          </View>
          {renderFieldError('stressLevel')}
        </View>
      </View>

      <View className="mb-4">
        <Text className={labelStyle}>Weekday vs Weekend Schedule Differences (optional)</Text>
        <View className={`${inputContainerStyle} min-h-[80px] items-start py-2`}>
          <TextInput className={`${inputStyle} min-h-[60px]`} placeholder="Weekday vs weekend differences in sleep, activity, eating..." placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={scheduleNotes} onChangeText={setScheduleNotes} multiline textAlignVertical="top" />
        </View>
      </View>

      <View className="mb-4">
        <Text className={labelStyle}>Supplements & Medications (optional)</Text>
        <View className={`${inputContainerStyle} min-h-[80px] items-start py-2`}>
          <TextInput className={`${inputStyle} min-h-[60px]`} placeholder="List any supplements or medications you take regularly." placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={supplements} onChangeText={setSupplements} multiline textAlignVertical="top" />
        </View>
      </View>

      <View className="mb-4">
        <Text className={labelStyle}>Daily Water Intake (liters) *</Text>
        <View className={`${inputContainerStyle} ${errors.waterIntake ? 'border-red-500' : ''}`}>
          <TextInput className={inputStyle} placeholder="e.g., 3.5" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={waterIntake} onChangeText={(v) => { setWaterIntake(v); clearFieldError('waterIntake'); }} keyboardType="decimal-pad" />
        </View>
        {renderFieldError('waterIntake')}
      </View>

      <View className="mb-4">
        <Text className={labelStyle}>Motivation & Readiness for Change *</Text>
        <View className={`${inputContainerStyle} min-h-[100px] items-start py-2 ${errors.motivation ? 'border-red-500' : ''}`}>
          <TextInput className={`${inputStyle} min-h-[80px]`} placeholder="What motivates you? How ready are you to make changes? Any potential challenges?" placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'} value={motivation} onChangeText={(v) => { setMotivation(v); clearFieldError('motivation'); }} multiline textAlignVertical="top" />
        </View>
        {renderFieldError('motivation')}
      </View>
    </>
  );

  return (
    <View className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`} style={{ paddingTop: insets.top }}>
      {/* Progress - Fixed at top */}
      <View className="px-5 pt-2 pb-4">
        <View className="flex-row mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View key={i} className={`flex-1 h-1 rounded-full mx-0.5 ${i + 1 <= step ? 'bg-indigo-500' : isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          ))}
        </View>

        {/* Step Header */}
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center mr-3">
            {renderStepIcon()}
          </View>
          <View>
            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('onboarding.stepOf', { current: step, total: totalSteps })}</Text>
            <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t(stepTitleKeys[step - 1])}</Text>
          </View>
        </View>
      </View>

      {/* Scrollable Content with Keyboard Awareness */}
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
        }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
        enableAutomaticScroll={true}
      >
        {/* General Error (API errors) */}
        {errors.general && (
          <View className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
            <Text className="text-red-500 text-sm">{errors.general}</Text>
          </View>
        )}

        {/* Step Content */}
        <View className="flex-1">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </View>
      </KeyboardAwareScrollView>

      {/* Navigation - Fixed at bottom */}
      <View className="px-5 pt-4" style={{ paddingBottom: insets.bottom + 10 }}>
        <View className="flex-row gap-3">
          {step > 1 && (
            <HapticPressable onPress={handleBack} className={`flex-1 rounded-xl py-4 items-center flex-row justify-center border ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
              <ChevronLeft color={isDark ? '#FFFFFF' : '#111827'} size={20} />
              <Text className={`font-semibold ml-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('onboarding.back')}</Text>
            </HapticPressable>
          )}

          {step < totalSteps ? (
            <HapticPressable onPress={handleNext} className="flex-1 rounded-xl py-4 items-center flex-row justify-center" style={{ backgroundColor: '#6366F1' }}>
              <Text className="text-white font-semibold mr-1">{t('onboarding.next')}</Text>
              <ChevronRight color="#FFFFFF" size={20} />
            </HapticPressable>
          ) : (
            <HapticPressable onPress={handleComplete} disabled={loading} className={`flex-1 rounded-xl py-4 items-center flex-row justify-center ${loading ? 'opacity-50' : ''}`} style={{ backgroundColor: '#10B981' }}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                <>
                  <Check color="#FFFFFF" size={20} />
                  <Text className="text-white font-semibold ml-1">{t('onboarding.complete')}</Text>
                </>
              )}
            </HapticPressable>
          )}
        </View>
      </View>
    </View>
  );
}
