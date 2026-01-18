import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Switch, Modal, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { HapticPressable } from '../../components/HapticPressable';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Moon, Bell, LogOut, ChevronRight, Mail, AlertCircle, Lock, X, Eye, EyeOff, UserCog, RefreshCw, Info, Database, Globe } from 'lucide-react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useAppUpdates } from '../../hooks/useAppUpdates';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import CacheDebugView from '../../components/CacheDebugView';
import { LanguageSelector } from '../../components/LanguageSelector';
import { useLocale } from '../../contexts/LocaleContext';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { openNotifications } = useNotifications();
  const { locale, setLocale, supportedLocales } = useLocale();
  const { isChecking, isDownloading, isUpdateAvailable, isUpdatePending, checkForUpdates, downloadAndApplyUpdate, reloadApp, resetDeclined } = useAppUpdates();
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Password bottom sheet
  const passwordBottomSheetRef = useRef<BottomSheetModal>(null);
  const passwordSnapPoints = useMemo(() => ['85%'], []);

  // App version
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  // Update modal state
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateModalType, setUpdateModalType] = useState<'checking' | 'available' | 'downloading' | 'ready' | 'upToDate' | 'devMode'>('checking');

  // Cache debug modal state
  const [showCacheDebug, setShowCacheDebug] = useState(false);

  // Language bottom sheet
  const languageBottomSheetRef = useRef<BottomSheetModal>(null);
  const languageSnapPoints = useMemo(() => ['35%'], []);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (refreshProfile) {
      await refreshProfile();
    }
    setIsRefreshing(false);
  }, [refreshProfile]);

  // Handle check for updates with modal feedback
  const handleCheckForUpdates = useCallback(async () => {
    if (__DEV__) {
      setUpdateModalType('devMode');
      setShowUpdateModal(true);
      return;
    }

    // Reset declined flag so auto-updates can work again after manual check
    resetDeclined();

    setUpdateModalType('checking');
    setShowUpdateModal(true);

    const result = await checkForUpdates(true);

    if (result.hasUpdate) {
      setUpdateModalType('available');
    } else {
      setUpdateModalType('upToDate');
    }
  }, [checkForUpdates, resetDeclined]);

  // Handle download update
  const handleDownloadUpdate = useCallback(async () => {
    setUpdateModalType('downloading');
    const success = await downloadAndApplyUpdate();
    if (success) {
      setUpdateModalType('ready');
    } else {
      setShowUpdateModal(false);
    }
  }, [downloadAndApplyUpdate]);

  // Handle restart app
  const handleRestartApp = useCallback(async () => {
    setShowUpdateModal(false);
    await reloadApp();
  }, [reloadApp]);

  // Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Get display name from profile or fallback to email
  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (profile?.username) {
      return profile.username;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    setIsUpdating(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err: any) {
      console.error('Error updating password:', err);
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setIsUpdating(false);
    }
  };

  const resetPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
  };

  // Password bottom sheet control
  useEffect(() => {
    if (showPasswordModal) {
      passwordBottomSheetRef.current?.present();
    } else {
      passwordBottomSheetRef.current?.dismiss();
    }
  }, [showPasswordModal]);

  // Language bottom sheet control
  useEffect(() => {
    if (showLanguageModal) {
      languageBottomSheetRef.current?.present();
    } else {
      languageBottomSheetRef.current?.dismiss();
    }
  }, [showLanguageModal]);

  const handleLanguageSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      setShowLanguageModal(false);
    }
  }, []);

  const handlePasswordSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      setShowPasswordModal(false);
    }
  }, []);

  const renderPasswordBackdrop = useCallback(
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

  const menuItems = [
    {
      title: t('profile.editProfile'),
      icon: UserCog,
      type: 'link' as const,
      onPress: () => router.push('/edit-profile'),
    },
    {
      title: t('profile.changePassword'),
      icon: Lock,
      type: 'link' as const,
      onPress: () => {
        resetPasswordModal();
        setShowPasswordModal(true);
      },
    },
    {
      title: t('profile.notifications'),
      icon: Bell,
      type: 'link' as const,
      onPress: openNotifications,
    },
    {
      title: t('profile.darkMode'),
      icon: Moon,
      type: 'toggle' as const,
      value: isDark,
      onToggle: toggleTheme,
    },
    {
      title: t('profile.language'),
      icon: Globe,
      type: 'link' as const,
      subtitle: supportedLocales.find(l => l.code === locale)?.nativeLabel,
      onPress: () => setShowLanguageModal(true),
    },
  ];

  if (!isSupabaseConfigured) {
    return (
      <View className={`flex-1 items-center justify-center p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <AlertCircle color="#F59E0B" size={48} />
        <Text className={`text-lg font-semibold mt-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Supabase Not Configured
        </Text>
        <Text className={`text-sm mt-2 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Please add your Supabase credentials to the .env file
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? '#9CA3AF' : '#6B7280'}
          />
        }
      >
        {/* Profile Card */}
        <HapticPressable
          onPress={() => router.push('/edit-profile')}
          className={`rounded-2xl p-5 mb-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center">
            <View className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center">
              <User color="#6366F1" size={32} />
            </View>
            <View className="ml-4 flex-1">
              {user ? (
                <>
                  <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {getDisplayName()}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Mail color={isDark ? '#9CA3AF' : '#6B7280'} size={14} />
                    <Text className={`text-sm ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {user.email}
                    </Text>
                  </View>
                  {profile?.role && (
                    <View className="mt-1">
                      <Text className={`text-xs capitalize ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        {profile.role}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {t('profile.notSignedIn')}
                  </Text>
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {t('profile.signInToAccess')}
                  </Text>
                </>
              )}
            </View>
            <ChevronRight color={isDark ? '#6B7280' : '#9CA3AF'} size={20} />
          </View>
        </HapticPressable>

        {/* Settings Menu */}
        <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('profile.settings')}
        </Text>

        <View
          className={`rounded-2xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          {menuItems.map((item, index) => (
            <HapticPressable
              key={index}
              onPress={item.onPress}
              className={`flex-row items-center px-4 py-4 ${
                index < menuItems.length - 1 ? `border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}` : ''
              }`}
            >
              <View
                className="w-10 h-10 rounded-lg items-center justify-center mr-3"
                style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}
              >
                <item.icon color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
              </View>
              <View className="flex-1">
                <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {item.title}
                </Text>
                {'subtitle' in item && item.subtitle && (
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {item.subtitle}
                  </Text>
                )}
              </View>
              {item.type === 'toggle' ? (
                <Switch
                  value={item.value}
                  onValueChange={item.onToggle}
                  trackColor={{ false: '#D1D5DB', true: '#6366F1' }}
                  thumbColor="#FFFFFF"
                />
              ) : (
                <ChevronRight color={isDark ? '#6B7280' : '#9CA3AF'} size={20} />
              )}
            </HapticPressable>
          ))}
        </View>

        {/* App Section */}
        <Text className={`text-lg font-semibold mb-3 mt-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('profile.app')}
        </Text>

        <View
          className={`rounded-2xl overflow-hidden mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          {/* Version Info */}
          <View
            className={`flex-row items-center px-4 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}
          >
            <View
              className="w-10 h-10 rounded-lg items-center justify-center mr-3"
              style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}
            >
              <Info color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
            </View>
            <View className="flex-1">
              <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{t('profile.version')}</Text>
              <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{appVersion}</Text>
            </View>
          </View>

          {/* Cache Debug (for development/debugging) */}
          <HapticPressable
            onPress={() => setShowCacheDebug(true)}
            className={`flex-row items-center px-4 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}
          >
            <View
              className="w-10 h-10 rounded-lg items-center justify-center mr-3"
              style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}
            >
              <Database color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
            </View>
            <View className="flex-1">
              <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('profile.cacheDebug')}
              </Text>
              <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('profile.cacheDebugDesc')}
              </Text>
            </View>
            <ChevronRight color={isDark ? '#6B7280' : '#9CA3AF'} size={20} />
          </HapticPressable>

          {/* Check for Updates */}
          <HapticPressable
            onPress={handleCheckForUpdates}
            disabled={isChecking || isDownloading}
            className="flex-row items-center px-4 py-4"
          >
            <View
              className="w-10 h-10 rounded-lg items-center justify-center mr-3"
              style={{ backgroundColor: isDark ? '#312E81' : '#EEF2FF' }}
            >
              {isChecking || isDownloading ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                <RefreshCw color="#6366F1" size={20} />
              )}
            </View>
            <View className="flex-1">
              <Text className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('profile.checkForUpdates')}
              </Text>
              <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {isChecking ? t('profile.checking') : isDownloading ? t('profile.downloading') : t('profile.tapToCheck')}
              </Text>
            </View>
            <ChevronRight color={isDark ? '#6B7280' : '#9CA3AF'} size={20} />
          </HapticPressable>
        </View>

        {/* Sign Out Button */}
        {user && (
          <HapticPressable
            onPress={signOut}
            className={`rounded-xl p-4 mt-6 flex-row items-center justify-center ${
              isDark ? 'bg-red-900/30' : 'bg-red-50'
            }`}
          >
            <LogOut color="#EF4444" size={20} />
            <Text className="ml-2 font-semibold text-red-500">{t('profile.logOut')}</Text>
          </HapticPressable>
        )}

        {/* App Branding */}
        <View className="items-center mt-6 mb-8">
          <Text className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            ENG - Earned Not Given
          </Text>
        </View>
      </ScrollView>

      {/* Change Password Bottom Sheet Modal */}
      <BottomSheetModal
        ref={passwordBottomSheetRef}
        snapPoints={passwordSnapPoints}
        onChange={handlePasswordSheetChanges}
        enablePanDownToClose={true}
        backdropComponent={renderPasswordBackdrop}
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
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
            }}
          >
            {t('profile.changePassword')}
          </Text>
          <HapticPressable
            onPress={() => setShowPasswordModal(false)}
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
          </HapticPressable>
        </View>

        {/* Content */}
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Success Message */}
          {passwordSuccess ? (
            <View
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 8,
                backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#F0FDF4',
              }}
            >
              <Text style={{ color: '#22C55E', fontSize: 14 }}>{passwordSuccess}</Text>
            </View>
          ) : null}

          {/* Error Message */}
          {passwordError ? (
            <View
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 8,
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2',
              }}
            >
              <Text style={{ color: '#EF4444', fontSize: 14 }}>{passwordError}</Text>
            </View>
          ) : null}

          {/* Current Password */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                marginBottom: 8,
                color: isDark ? '#D1D5DB' : '#374151',
              }}
            >
              {t('profile.currentPassword')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 12,
                paddingHorizontal: 16,
                borderWidth: 1,
                backgroundColor: isDark ? '#374151' : '#F9FAFB',
                borderColor: isDark ? '#4B5563' : '#E5E7EB',
              }}
            >
              <Lock color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  fontSize: 16,
                  color: isDark ? '#F3F4F6' : '#1F2937',
                }}
                placeholder={t('profile.enterCurrentPassword')}
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                editable={!isUpdating}
              />
              <HapticPressable onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                {showCurrentPassword ? (
                  <EyeOff color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
                ) : (
                  <Eye color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
                )}
              </HapticPressable>
            </View>
          </View>

          {/* New Password */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                marginBottom: 8,
                color: isDark ? '#D1D5DB' : '#374151',
              }}
            >
              {t('profile.newPassword')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 12,
                paddingHorizontal: 16,
                borderWidth: 1,
                backgroundColor: isDark ? '#374151' : '#F9FAFB',
                borderColor: isDark ? '#4B5563' : '#E5E7EB',
              }}
            >
              <Lock color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  fontSize: 16,
                  color: isDark ? '#F3F4F6' : '#1F2937',
                }}
                placeholder={t('profile.enterNewPassword')}
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                editable={!isUpdating}
              />
              <HapticPressable onPress={() => setShowNewPassword(!showNewPassword)}>
                {showNewPassword ? (
                  <EyeOff color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
                ) : (
                  <Eye color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
                )}
              </HapticPressable>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                marginBottom: 8,
                color: isDark ? '#D1D5DB' : '#374151',
              }}
            >
              {t('profile.confirmNewPassword')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 12,
                paddingHorizontal: 16,
                borderWidth: 1,
                backgroundColor: isDark ? '#374151' : '#F9FAFB',
                borderColor: isDark ? '#4B5563' : '#E5E7EB',
              }}
            >
              <Lock color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  fontSize: 16,
                  color: isDark ? '#F3F4F6' : '#1F2937',
                }}
                placeholder={t('profile.confirmNewPasswordPlaceholder')}
                placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                editable={!isUpdating}
              />
            </View>
          </View>

          {/* Update Button */}
          <HapticPressable
            onPress={handleChangePassword}
            disabled={isUpdating}
            style={{
              backgroundColor: '#6366F1',
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: isUpdating ? 0.5 : 1,
            }}
          >
            {isUpdating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
                {t('profile.updatePassword')}
              </Text>
            )}
          </HapticPressable>
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* Update Modal */}
      <Modal
        visible={showUpdateModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            className={`rounded-2xl p-6 mx-6 w-80 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            {/* Icon */}
            <View className="items-center mb-4">
              <View
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{
                  backgroundColor: updateModalType === 'ready' ? '#DEF7EC' :
                    updateModalType === 'available' ? '#EEF2FF' :
                    isDark ? '#374151' : '#F3F4F6'
                }}
              >
                {(updateModalType === 'checking' || updateModalType === 'downloading') ? (
                  <ActivityIndicator size="large" color="#6366F1" />
                ) : updateModalType === 'ready' ? (
                  <RefreshCw color="#22C55E" size={32} />
                ) : (
                  <RefreshCw color="#6366F1" size={32} />
                )}
              </View>
            </View>

            {/* Title */}
            <Text className={`text-xl font-semibold text-center mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {updateModalType === 'checking' && t('profile.updates.checkingTitle')}
              {updateModalType === 'available' && t('profile.updates.availableTitle')}
              {updateModalType === 'downloading' && t('profile.updates.downloadingTitle')}
              {updateModalType === 'ready' && t('profile.updates.readyTitle')}
              {updateModalType === 'upToDate' && t('profile.updates.upToDateTitle')}
              {updateModalType === 'devMode' && t('profile.updates.devModeTitle')}
            </Text>

            {/* Message */}
            <Text className={`text-center mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {updateModalType === 'checking' && t('profile.updates.checkingMessage')}
              {updateModalType === 'available' && t('profile.updates.availableMessage')}
              {updateModalType === 'downloading' && t('profile.updates.downloadingMessage')}
              {updateModalType === 'ready' && t('profile.updates.readyMessage')}
              {updateModalType === 'upToDate' && t('profile.updates.upToDateMessage')}
              {updateModalType === 'devMode' && t('profile.updates.devModeMessage')}
            </Text>

            {/* Buttons */}
            {updateModalType === 'available' && (
              <View className="flex-row space-x-3">
                <HapticPressable
                  onPress={() => setShowUpdateModal(false)}
                  className={`flex-1 py-3 rounded-xl items-center mr-2 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                >
                  <Text className={isDark ? 'text-gray-300' : 'text-gray-700'}>{t('profile.updates.later')}</Text>
                </HapticPressable>
                <HapticPressable
                  onPress={handleDownloadUpdate}
                  className="flex-1 py-3 rounded-xl items-center ml-2"
                  style={{ backgroundColor: '#6366F1' }}
                >
                  <Text className="text-white font-semibold">{t('profile.updates.download')}</Text>
                </HapticPressable>
              </View>
            )}

            {updateModalType === 'ready' && (
              <View className="flex-row space-x-3">
                <HapticPressable
                  onPress={() => setShowUpdateModal(false)}
                  className={`flex-1 py-3 rounded-xl items-center mr-2 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}
                >
                  <Text className={isDark ? 'text-gray-300' : 'text-gray-700'}>{t('profile.updates.later')}</Text>
                </HapticPressable>
                <HapticPressable
                  onPress={handleRestartApp}
                  className="flex-1 py-3 rounded-xl items-center ml-2"
                  style={{ backgroundColor: '#22C55E' }}
                >
                  <Text className="text-white font-semibold">{t('profile.updates.restartNow')}</Text>
                </HapticPressable>
              </View>
            )}

            {(updateModalType === 'upToDate' || updateModalType === 'devMode') && (
              <HapticPressable
                onPress={() => setShowUpdateModal(false)}
                className="py-3 rounded-xl items-center"
                style={{ backgroundColor: '#6366F1' }}
              >
                <Text className="text-white font-semibold">OK</Text>
              </HapticPressable>
            )}
          </View>
        </View>
      </Modal>

      {/* Language Bottom Sheet Modal */}
      <BottomSheetModal
        ref={languageBottomSheetRef}
        snapPoints={languageSnapPoints}
        onChange={handleLanguageSheetChanges}
        enablePanDownToClose={true}
        backdropComponent={renderPasswordBackdrop}
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
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
            }}
          >
            {t('profile.language')}
          </Text>
          <HapticPressable
            onPress={() => setShowLanguageModal(false)}
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
          </HapticPressable>
        </View>

        {/* Content */}
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, flexGrow: 1 }}
        >
          <LanguageSelector showHeader={false} />
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* Cache Debug View */}
      <CacheDebugView visible={showCacheDebug} onClose={() => setShowCacheDebug(false)} />
    </>
  );
}
