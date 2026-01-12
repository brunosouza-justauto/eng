import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Modal } from 'react-native';
import { Database, Trash2, RefreshCw, X, WifiOff, Wifi, Clock, Download, AlertTriangle, XCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { clearAllCache, getAllCacheKeys } from '../lib/storage';
import { precacheAllUserData } from '../lib/precacheService';
import { getOperationDescription, getQueueAsync, QueuedOperation, clearQueue } from '../lib/syncQueue';

/**
 * Sensitive field patterns to mask in debug view
 */
const SENSITIVE_FIELDS = [
  'user_id', 'userId', 'profile_id', 'profileId', 'athlete_id', 'coach_id',
  'meal_id', 'nutrition_plan_id', 'program_template_id', 'workout_id', 'session_id',
  'id', 'created_by', 'assigned_by', 'local_session_id', 'exercise_instance_id',
  'email', 'phone', 'avatar_url', 'name', 'full_name', 'first_name', 'last_name',
];

/**
 * Mask sensitive data in an object for display
 */
function maskSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Check if it looks like a UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(obj)) {
      return obj.substring(0, 8) + '-****-****-****-************';
    }
    // Check if it looks like an email
    if (obj.includes('@')) {
      const [local, domain] = obj.split('@');
      return local.substring(0, 2) + '***@' + domain;
    }
    // For other strings longer than 20 chars, partially mask
    if (obj.length > 20) {
      return obj.substring(0, 10) + '...[masked]...' + obj.substring(obj.length - 5);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item));
  }

  if (typeof obj === 'object') {
    const masked: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        // Mask the value based on its type
        if (typeof value === 'string') {
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
            masked[key] = value.substring(0, 8) + '-****-****-****-************';
          } else if (value.includes('@')) {
            const [local, domain] = value.split('@');
            masked[key] = local.substring(0, 2) + '***@' + domain;
          } else if (value.length > 8) {
            masked[key] = value.substring(0, 4) + '****' + value.substring(value.length - 4);
          } else {
            masked[key] = '****';
          }
        } else {
          masked[key] = '[masked]';
        }
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }

  return obj;
}

interface CacheEntry {
  key: string;
  size: number;
  preview: string;
  fullContent: string;
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
  const {
    isOnline,
    isInitialized,
    pendingOperations,
    failedOperations,
    isSyncing,
    lastSyncTime,
    lastSyncError,
    lastSyncResult,
    syncNow,
    clearFailedOps,
  } = useOffline();

  const [entries, setEntries] = useState<CacheEntry[]>([]);
  const [pendingQueue, setPendingQueue] = useState<QueuedOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [isPrecaching, setIsPrecaching] = useState(false);
  const [precacheStatus, setPrecacheStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cache' | 'pending'>('cache');
  const [expandedCacheKeys, setExpandedCacheKeys] = useState<Set<string>>(new Set());
  const [expandedPendingIds, setExpandedPendingIds] = useState<Set<string>>(new Set());

  const toggleCacheExpanded = (key: string) => {
    setExpandedCacheKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const togglePendingExpanded = (id: string) => {
    setExpandedPendingIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const loadCacheData = async () => {
    setIsLoading(true);
    try {
      // Load cache entries
      const keys = await getAllCacheKeys();
      const cacheEntries: CacheEntry[] = [];

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          // Try to pretty-print JSON for better readability
          let formattedContent = value;
          try {
            formattedContent = JSON.stringify(JSON.parse(value), null, 2);
          } catch {
            // Not JSON, keep as is
          }

          cacheEntries.push({
            key,
            size: value.length,
            preview: value.length > 100 ? value.substring(0, 100) + '...' : value,
            fullContent: formattedContent,
          });
        }
      }

      // Sort by key
      cacheEntries.sort((a, b) => a.key.localeCompare(b.key));
      setEntries(cacheEntries);

      // Load pending queue
      const queue = await getQueueAsync();
      setPendingQueue(queue);
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

  const handleClearQueue = async () => {
    try {
      await clearQueue();
      await loadCacheData();
    } catch (error) {
      console.error('Error clearing queue:', error);
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

        {/* Sync Error Banner */}
        {lastSyncError && (
          <View
            style={{
              backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
              padding: 12,
              marginHorizontal: 16,
              marginBottom: 8,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={18} color={isDark ? '#F87171' : '#DC2626'} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#FCA5A5' : '#991B1B' }}>
                Sync Error
              </Text>
              <Text style={{ fontSize: 12, color: isDark ? '#FECACA' : '#B91C1C', marginTop: 2 }}>
                {lastSyncError}
              </Text>
            </View>
          </View>
        )}

        {/* Failed Operations Section */}
        {failedOperations.length > 0 && (
          <View
            style={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              marginHorizontal: 16,
              marginBottom: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 12,
                backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <XCircle size={18} color={isDark ? '#F87171' : '#DC2626'} />
                <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: '600', color: isDark ? '#FCA5A5' : '#991B1B' }}>
                  {failedOperations.length} Failed Operation{failedOperations.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <Pressable
                onPress={clearFailedOps}
                style={{
                  backgroundColor: isDark ? '#991B1B' : '#DC2626',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>Clear</Text>
              </Pressable>
            </View>
            <View style={{ padding: 12 }}>
              {failedOperations.slice(0, 5).map((failed, index) => (
                <View
                  key={failed.operation.id}
                  style={{
                    paddingVertical: 8,
                    borderTopWidth: index > 0 ? 1 : 0,
                    borderTopColor: isDark ? '#374151' : '#E5E7EB',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '500', color: isDark ? '#F3F4F6' : '#1F2937' }}>
                    {getOperationDescription(failed.operation)}
                  </Text>
                  <Text style={{ fontSize: 11, color: isDark ? '#F87171' : '#DC2626', marginTop: 2 }}>
                    {failed.error}
                  </Text>
                  <Text style={{ fontSize: 10, color: isDark ? '#6B7280' : '#9CA3AF', marginTop: 2 }}>
                    Failed at: {new Date(failed.failedAt).toLocaleString()}
                  </Text>
                </View>
              ))}
              {failedOperations.length > 5 && (
                <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 8, textAlign: 'center' }}>
                  +{failedOperations.length - 5} more failed operations
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Last Sync Result */}
        {lastSyncResult && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Text
              style={{
                fontSize: 12,
                color: lastSyncResult.failed > 0
                  ? isDark ? '#F87171' : '#DC2626'
                  : isDark ? '#22C55E' : '#16A34A',
                textAlign: 'center',
              }}
            >
              Last sync: {lastSyncResult.processed} synced
              {lastSyncResult.failed > 0 && `, ${lastSyncResult.failed} failed`}
            </Text>
          </View>
        )}

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

        {/* Tab Switcher */}
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: 16,
            marginBottom: 12,
            backgroundColor: isDark ? '#374151' : '#E5E7EB',
            borderRadius: 10,
            padding: 4,
          }}
        >
          <Pressable
            onPress={() => setActiveTab('cache')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: activeTab === 'cache' ? (isDark ? '#1F2937' : '#FFFFFF') : 'transparent',
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '600',
                color: activeTab === 'cache'
                  ? (isDark ? '#F3F4F6' : '#1F2937')
                  : (isDark ? '#9CA3AF' : '#6B7280'),
              }}
            >
              Cache ({entries.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('pending')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: activeTab === 'pending' ? (isDark ? '#1F2937' : '#FFFFFF') : 'transparent',
            }}
          >
            <Text
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '600',
                color: activeTab === 'pending'
                  ? (pendingQueue.length > 0 ? '#F59E0B' : isDark ? '#F3F4F6' : '#1F2937')
                  : (isDark ? '#9CA3AF' : '#6B7280'),
              }}
            >
              Pending ({pendingQueue.length})
            </Text>
          </Pressable>
        </View>

        {/* Summary for active tab */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          {activeTab === 'cache' ? (
            <>
              <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                {entries.length} cached items
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: isDark ? '#D1D5DB' : '#4B5563' }}>
                Total: {formatBytes(totalSize)}
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 14, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                {pendingQueue.length} operations pending sync
              </Text>
              {pendingQueue.length > 0 && (
                <Pressable
                  onPress={handleClearQueue}
                  style={{
                    backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#FCA5A5' : '#991B1B' }}>
                    Clear Queue
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>

        {/* Content Area */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingTop: 0 }}>
          {isLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={{ marginTop: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                Loading data...
              </Text>
            </View>
          ) : activeTab === 'cache' ? (
            // Cache Entries View
            entries.length === 0 ? (
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
              entries.map((entry) => {
              const isExpanded = expandedCacheKeys.has(entry.key);
              return (
                <Pressable
                  key={entry.key}
                  onPress={() => toggleCacheExpanded(entry.key)}
                  style={{
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: isExpanded ? '#6366F1' : (isDark ? '#374151' : '#E5E7EB'),
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
                      numberOfLines={isExpanded ? undefined : 1}
                    >
                      {entry.key}
                    </Text>
                    <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginLeft: 8 }}>
                      {formatBytes(entry.size)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10, color: isDark ? '#6B7280' : '#9CA3AF', marginBottom: 4 }}>
                    {isExpanded ? 'Tap to collapse' : 'Tap to expand'}
                  </Text>
                  <ScrollView
                    horizontal={!isExpanded}
                    style={{ maxHeight: isExpanded ? 400 : 60 }}
                    nestedScrollEnabled
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: isDark ? '#9CA3AF' : '#6B7280',
                        fontFamily: 'monospace',
                      }}
                      numberOfLines={isExpanded ? undefined : 3}
                    >
                      {isExpanded
                        ? (() => {
                            try {
                              const parsed = JSON.parse(entry.fullContent);
                              return JSON.stringify(maskSensitiveData(parsed), null, 2);
                            } catch {
                              return entry.fullContent;
                            }
                          })()
                        : entry.preview}
                    </Text>
                  </ScrollView>
                </Pressable>
              );
            })
            )
          ) : (
            // Pending Queue View
            pendingQueue.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Clock size={48} color={isDark ? '#6B7280' : '#9CA3AF'} />
                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 16,
                    fontWeight: '500',
                    color: isDark ? '#9CA3AF' : '#6B7280',
                  }}
                >
                  No pending operations
                </Text>
                <Text style={{ marginTop: 4, fontSize: 13, color: isDark ? '#6B7280' : '#9CA3AF' }}>
                  All data is synced with the server
                </Text>
              </View>
            ) : (
              pendingQueue.map((op) => {
                const isExpanded = expandedPendingIds.has(op.id);
                return (
                  <Pressable
                    key={op.id}
                    onPress={() => togglePendingExpanded(op.id)}
                    style={{
                      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: isExpanded ? '#F59E0B' : (isDark ? '#78350F' : '#FDE68A'),
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View
                          style={{
                            backgroundColor: isDark ? '#78350F' : '#FEF3C7',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#FCD34D' : '#92400E' }}>
                            {op.action.toUpperCase()}
                          </Text>
                        </View>
                        <Text
                          style={{
                            marginLeft: 8,
                            fontSize: 14,
                            fontWeight: '600',
                            color: isDark ? '#F3F4F6' : '#1F2937',
                          }}
                        >
                          {getOperationDescription(op)}
                        </Text>
                      </View>
                      {op.retryCount > 0 && (
                        <View
                          style={{
                            backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '500', color: isDark ? '#FCA5A5' : '#991B1B' }}>
                            Retry {op.retryCount}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={{ marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                        Type: <Text style={{ fontWeight: '500', color: isDark ? '#D1D5DB' : '#4B5563' }}>{op.type}</Text>
                      </Text>
                      <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>
                        Queued: <Text style={{ fontWeight: '500', color: isDark ? '#D1D5DB' : '#4B5563' }}>{new Date(op.createdAt).toLocaleString()}</Text>
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: isDark ? '#111827' : '#F3F4F6',
                        borderRadius: 6,
                        padding: 8,
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '500', color: isDark ? '#6B7280' : '#9CA3AF', marginBottom: 4 }}>
                        PAYLOAD {isExpanded ? '(tap to collapse)' : '(tap to expand)'}
                      </Text>
                      <ScrollView
                        style={{ maxHeight: isExpanded ? 300 : 80 }}
                        nestedScrollEnabled
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            color: isDark ? '#9CA3AF' : '#6B7280',
                            fontFamily: 'monospace',
                          }}
                          numberOfLines={isExpanded ? undefined : 4}
                        >
                          {JSON.stringify(maskSensitiveData(op.payload), null, 2)}
                        </Text>
                      </ScrollView>
                    </View>
                  </Pressable>
                );
              })
            )
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
