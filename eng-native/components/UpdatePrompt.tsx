import { useState, useCallback } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator } from 'react-native';
import { RefreshCw, Download, X } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAppUpdates } from '../hooks/useAppUpdates';

export default function UpdatePrompt() {
  const { isDark } = useTheme();
  const {
    showUpdatePrompt,
    isDownloading,
    isUpdatePending,
    downloadAndApplyUpdate,
    reloadApp,
    dismissUpdatePrompt,
  } = useAppUpdates();

  const [downloadStarted, setDownloadStarted] = useState(false);

  const handleDownload = useCallback(async () => {
    setDownloadStarted(true);
    await downloadAndApplyUpdate();
  }, [downloadAndApplyUpdate]);

  const handleRestart = useCallback(async () => {
    await reloadApp();
  }, [reloadApp]);

  const handleLater = useCallback(() => {
    dismissUpdatePrompt();
    setDownloadStarted(false);
  }, [dismissUpdatePrompt]);

  if (!showUpdatePrompt) return null;

  return (
    <Modal
      visible={showUpdatePrompt}
      animationType="fade"
      transparent={true}
      onRequestClose={handleLater}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 320,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {/* Close button */}
          {!isDownloading && !isUpdatePending && (
            <Pressable
              onPress={handleLater}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </Pressable>
          )}

          {/* Icon */}
          <View style={{ alignItems: 'center', marginBottom: 16, marginTop: 8 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: isUpdatePending ? '#DCFCE7' : '#EEF2FF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isDownloading ? (
                <ActivityIndicator size="large" color="#6366F1" />
              ) : isUpdatePending ? (
                <RefreshCw size={32} color="#22C55E" />
              ) : (
                <Download size={32} color="#6366F1" />
              )}
            </View>
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: 8,
              color: isDark ? '#F3F4F6' : '#1F2937',
            }}
          >
            {isDownloading
              ? 'Downloading Update...'
              : isUpdatePending
              ? 'Update Ready!'
              : 'Update Available'}
          </Text>

          {/* Message */}
          <Text
            style={{
              fontSize: 14,
              textAlign: 'center',
              marginBottom: 24,
              color: isDark ? '#9CA3AF' : '#6B7280',
              lineHeight: 20,
            }}
          >
            {isDownloading
              ? 'Please wait while we download the latest version...'
              : isUpdatePending
              ? 'The update has been downloaded. Restart to apply the changes.'
              : 'A new version of ENG is available with improvements and bug fixes.'}
          </Text>

          {/* Buttons */}
          {!isDownloading && (
            <View style={{ gap: 12 }}>
              {isUpdatePending ? (
                <Pressable
                  onPress={handleRestart}
                  style={{
                    backgroundColor: '#22C55E',
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
                    Restart Now
                  </Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={handleDownload}
                    style={{
                      backgroundColor: '#6366F1',
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
                      Update Now
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleLater}
                    style={{
                      backgroundColor: isDark ? '#374151' : '#F3F4F6',
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: isDark ? '#D1D5DB' : '#4B5563',
                        fontWeight: '600',
                        fontSize: 16,
                      }}
                    >
                      Later
                    </Text>
                  </Pressable>
                </>
              )}

              {isUpdatePending && (
                <Pressable
                  onPress={handleLater}
                  style={{
                    paddingVertical: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 14 }}>
                    Restart Later
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
