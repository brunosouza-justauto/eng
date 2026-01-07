import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Modal, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { User, Moon, Bell, LogOut, ChevronRight, Mail, AlertCircle, Lock, X, Eye, EyeOff, UserCog } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export default function ProfileScreen() {
  const { isDark, toggleTheme } = useTheme();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (refreshProfile) {
      await refreshProfile();
    }
    setIsRefreshing(false);
  }, [refreshProfile]);

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

  const menuItems = [
    {
      title: 'Edit Profile',
      icon: UserCog,
      type: 'link' as const,
      onPress: () => router.push('/edit-profile'),
    },
    {
      title: 'Change Password',
      icon: Lock,
      type: 'link' as const,
      onPress: () => {
        resetPasswordModal();
        setShowPasswordModal(true);
      },
    },
    {
      title: 'Notifications',
      icon: Bell,
      type: 'link' as const,
    },
    {
      title: 'Dark Mode',
      icon: Moon,
      type: 'toggle' as const,
      value: isDark,
      onToggle: toggleTheme,
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
        <View
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
                    Not signed in
                  </Text>
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Sign in to access all features
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Settings Menu */}
        <Text className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Settings
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
            <Pressable
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
              <Text className={`flex-1 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {item.title}
              </Text>
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
            </Pressable>
          ))}
        </View>

        {/* Sign Out Button */}
        {user && (
          <Pressable
            onPress={signOut}
            className={`rounded-xl p-4 mt-6 flex-row items-center justify-center ${
              isDark ? 'bg-red-900/30' : 'bg-red-50'
            }`}
          >
            <LogOut color="#EF4444" size={20} />
            <Text className="ml-2 font-semibold text-red-500">Sign Out</Text>
          </Pressable>
        )}

        {/* App Info */}
        <View className="items-center mt-8 mb-4">
          <Text className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            ENG - Earned Not Given
          </Text>
          <Text className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            className={`rounded-t-3xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
            style={{ maxHeight: '80%' }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Change Password
              </Text>
              <Pressable
                onPress={() => setShowPasswordModal(false)}
                className="w-8 h-8 items-center justify-center rounded-full"
                style={{ backgroundColor: isDark ? '#374151' : '#F3F4F6' }}
              >
                <X color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
              </Pressable>
            </View>

            {/* Success Message */}
            {passwordSuccess ? (
              <View className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <Text className="text-green-600 text-sm">{passwordSuccess}</Text>
              </View>
            ) : null}

            {/* Error Message */}
            {passwordError ? (
              <View className={`mb-4 p-3 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
                <Text className="text-red-500 text-sm">{passwordError}</Text>
              </View>
            ) : null}

            {/* Current Password */}
            <View className="mb-4">
              <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Current Password
              </Text>
              <View
                className={`flex-row items-center rounded-xl px-4 border ${
                  isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Lock color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
                <TextInput
                  className={`flex-1 py-3 px-3 text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                  placeholder="Enter current password"
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                  editable={!isUpdating}
                />
                <Pressable onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                  {showCurrentPassword ? (
                    <EyeOff color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
                  ) : (
                    <Eye color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* New Password */}
            <View className="mb-4">
              <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                New Password
              </Text>
              <View
                className={`flex-row items-center rounded-xl px-4 border ${
                  isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Lock color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
                <TextInput
                  className={`flex-1 py-3 px-3 text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                  placeholder="Enter new password"
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  editable={!isUpdating}
                />
                <Pressable onPress={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? (
                    <EyeOff color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
                  ) : (
                    <Eye color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* Confirm Password */}
            <View className="mb-6">
              <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Confirm New Password
              </Text>
              <View
                className={`flex-row items-center rounded-xl px-4 border ${
                  isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Lock color={isDark ? '#9CA3AF' : '#6B7280'} size={20} />
                <TextInput
                  className={`flex-1 py-3 px-3 text-base ${isDark ? 'text-white' : 'text-gray-900'}`}
                  placeholder="Confirm new password"
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
            <Pressable
              onPress={handleChangePassword}
              disabled={isUpdating}
              className={`rounded-xl py-4 items-center ${isUpdating ? 'opacity-50' : ''}`}
              style={{ backgroundColor: '#6366F1' }}
            >
              {isUpdating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-semibold text-base">Update Password</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
