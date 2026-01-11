import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Modal } from 'react-native';
import { Database, Trash2, RefreshCw, X, WifiOff, Wifi, Clock, Download } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { clearAllCache, getAllCacheKeys } from '../lib/storage';
import { precacheAllUserData } from '../lib/precacheService';

interface CacheEntry {
  key: string;
  size: number;
  preview: string;
}

export default function CacheDebugView({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { isDark } = useTheme();
  const { user, profile } = useAuth();
  const { isOnline, isInitialized, pendingOperations, isSyncing, lastSyncTime, syncNow } = useOffline();

  const [entries, setEntries] = useState<CacheEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [isPrecaching, setIsPrecaching] = useState(false);
  const [precacheStatus, setPrecacheStatus] = useState<string | null>(null);

  const loadCacheData = async () => {
    setIsLoading(true);
    try {
      const keys = await getAllCacheKeys();
      const cacheEntries: CacheEntry[] = [];

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          cacheEntries.push({
            key,
            size: value.length,
            preview: value.length > 100 ? value.substring(0, 100) + '...' : value,
          });
        }
      }

      // Sort by key
      cacheEntries.sort((a, b) => a.key.localeCompare(b.key));
      setEntries(cacheEntries);
    } catch (error) {
      console.error('Error loading cache data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadCacheData();
    }
  }, [visible]);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearAllCache();
      await loadCacheData();
    } catch (error) {
      console.error('Error clearing cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleSync = async () => {
    await syncNow();
    await loadCacheData();
  };

  const handlePrecache = async () => {
    if (!user?.id || !profile?.id) {
      setPrecacheStatus('User not authenticated');
      return;
    }
    if (!isOnline) {
      setPrecacheStatus('Cannot precache while offline');
      return;
    }

    setIsPrecaching(true);
    setPrecacheStatus('Precaching...');

    try {
      const result = await precacheAllUserData(
        user.id,
        profile.id,
        profile,
        (progress) => {
          setPrecacheStatus(`${progress.currentTask}`);
        }
      );

      if (result.success) {
        setPrecacheStatus(`Done! ${result.cached} items cached`);
      } else {
        setPrecacheStatus(`Partial: ${result.cached} items, ${result.errors.length} errors`);
      }
      await loadCacheData();
    } catch (error) {
      setPrecacheStatus('Precache failed');
      console.error('Precache error:', error);
    } finally {
      setIsPrecaching(false);
      // Clear status after 3 seconds
      setTimeout(() => setPrecacheStatus(null), 3000);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalSize = entries.reduce((sum, e) => sum + e.size, 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 16,
            paddingTop: 60,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? '#374151' : '#E5E7EB',
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Database size={24} color="#6366F1" />
            <Text
              style={{
                marginLeft: 12,
                fontSize: 20,
                fontWeight: '600',
                color: isDark ? '#F3F4F6' : '#1F2937',
              }}
            >
              Cache Debug
            </Text>
          </View>
          <Pressable onPress={onClose}>
            <X size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
          </Pressable>
        </View>

        {/* Network Status */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            marginBottom: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isOnline ? (
              <Wifi size={20} color="#22C55E" />
            ) : (
              <WifiOff size={20} color="#F59E0B" />
            )}
            <View style={{ marginLeft: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: isDark ? '#F3F4F6' : '#1F2937' }}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
              <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                {isInitialized ? 'Network initialized' : 'Initializing...'}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: isDark ? '#D1D5DB' : '#4B5563' }}>
              {pendingOperations} pending
            </Text>
            {lastSyncTime && (
              <Text style={{ fontSize: 11, color: isDark ? '#6B7280' : '#9CA3AF' }}>
                Last sync: {lastSyncTime.toLocaleTimeString()}
              </Text>
            )}
          </View>
        </View>

        {/* Actions Row 1 */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 16,
            paddingBottom: 8,
            gap: 12,
          }}
        >
          <Pressable
            onPress={loadCacheData}
            disabled={isLoading}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#6366F1',
              paddingVertical: 12,
              borderRadius: 10,
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            <RefreshCw size={18} color="#FFFFFF" />
            <Text style={{ marginLeft: 8, color: '#FFFFFF', fontWeight: '600' }}>
              Refresh
            </Text>
          </Pressable>

          <Pressable
            onPress={handlePrecache}
            disabled={!isOnline || isPrecaching}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isOnline ? '#8B5CF6' : '#6B7280',
              paddingVertical: 12,
              borderRadius: 10,
              opacity: isPrecaching ? 0.7 : 1,
            }}
          >
            <Download size={18} color="#FFFFFF" />
            <Text style={{ marginLeft: 8, color: '#FFFFFF', fontWeight: '600' }}>
              {isPrecaching ? 'Caching...' : 'Precache'}
            </Text>
          </Pressable>
        </View>

        {/* Precache Status */}
        {precacheStatus && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Text
              style={{
                fontSize: 12,
                color: precacheStatus.includes('Done') ? '#22C55E' : isDark ? '#9CA3AF' : '#6B7280',
                textAlign: 'center',
              }}
            >
              {precacheStatus}
            </Text>
          </View>
        )}

        {/* Actions Row 2 */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 16,
            paddingBottom: 16,
            gap: 12,
          }}
        >
          <Pressable
            onPress={handleSync}
            disabled={!isOnline || isSyncing}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isOnline ? '#22C55E' : '#6B7280',
              paddingVertical: 12,
              borderRadius: 10,
              opacity: isSyncing ? 0.7 : 1,
            }}
          >
            <Clock size={18} color="#FFFFFF" />
            <Text style={{ marginLeft: 8, color: '#FFFFFF', fontWeight: '600' }}>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleClearCache}
            disabled={isClearing}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#EF4444',
              paddingVertical: 12,
              borderRadius: 10,
              opacity: isClearing ? 0.7 : 1,
            }}
          >
            <Trash2 size={18} color="#FFFFFF" />
            <Text style={{ marginLeft: 8, color: '#FFFFFF', fontWeight: '600' }}>
              Clear All
            </Text>
          </Pressable>
        </View>

        {/* Summary */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280' }}>
            {entries.length} cached items
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '500', color: isDark ? '#D1D5DB' : '#4B5563' }}>
            Total: {formatBytes(totalSize)}
          </Text>
        </View>

        {/* Cache Entries */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
          {isLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={{ marginTop: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                Loading cache data...
              </Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Database size={48} color={isDark ? '#6B7280' : '#9CA3AF'} />
              <Text
                style={{
                  marginTop: 12,
                  fontSize: 16,
                  fontWeight: '500',
                  color: isDark ? '#9CA3AF' : '#6B7280',
                }}
              >
                No cached data
              </Text>
              <Text style={{ marginTop: 4, fontSize: 13, color: isDark ? '#6B7280' : '#9CA3AF' }}>
                Use the app online to build cache
              </Text>
            </View>
          ) : (
            entries.map((entry) => (
              <View
                key={entry.key}
                style={{
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: isDark ? '#374151' : '#E5E7EB',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: '#6366F1',
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {entry.key}
                  </Text>
                  <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginLeft: 8 }}>
                    {formatBytes(entry.size)}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    color: isDark ? '#6B7280' : '#9CA3AF',
                    fontFamily: 'monospace',
                  }}
                  numberOfLines={3}
                >
                  {entry.preview}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
