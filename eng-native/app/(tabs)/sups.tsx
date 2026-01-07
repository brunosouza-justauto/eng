import { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Pill, Clock, AlertCircle, Info } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  getAthleteSupplementsBySchedule,
  filterActiveSupplements,
  getScheduleDisplayText,
} from '../../services/supplementService';
import {
  AthleteSupplementWithDetails,
  SupplementsBySchedule,
  CATEGORY_COLORS,
} from '../../types/supplements';

// Supplement card component
function SupplementCard({
  supplement,
  isDark,
}: {
  supplement: AthleteSupplementWithDetails;
  isDark: boolean;
}) {
  const categoryColor = CATEGORY_COLORS[supplement.supplement_category] || '#6B7280';

  return (
    <View
      style={{
        backgroundColor: isDark ? '#374151' : '#F9FAFB',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: categoryColor,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
              marginBottom: 4,
            }}
          >
            {supplement.supplement_name}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: categoryColor,
              fontWeight: '500',
              marginBottom: 6,
            }}
          >
            {supplement.supplement_category}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pill size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <Text style={{ marginLeft: 4, fontSize: 13, color: isDark ? '#D1D5DB' : '#4B5563' }}>
            {supplement.dosage}
          </Text>
        </View>

        {supplement.timing && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Clock size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text style={{ marginLeft: 4, fontSize: 13, color: isDark ? '#D1D5DB' : '#4B5563' }}>
              {supplement.timing}
            </Text>
          </View>
        )}
      </View>

      {supplement.notes && (
        <View
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: isDark ? '#4B5563' : '#E5E7EB',
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}
        >
          <Info size={14} color={isDark ? '#9CA3AF' : '#6B7280'} style={{ marginTop: 2 }} />
          <Text
            style={{
              marginLeft: 6,
              fontSize: 12,
              color: isDark ? '#9CA3AF' : '#6B7280',
              flex: 1,
            }}
          >
            {supplement.notes}
          </Text>
        </View>
      )}
    </View>
  );
}

// Schedule group component
function ScheduleGroup({
  group,
  isDark,
}: {
  group: SupplementsBySchedule;
  isDark: boolean;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Clock size={16} color="#6366F1" />
        <Text
          style={{
            marginLeft: 8,
            fontSize: 15,
            fontWeight: '600',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          {group.schedule}
        </Text>
        <Text
          style={{
            marginLeft: 8,
            fontSize: 13,
            color: isDark ? '#9CA3AF' : '#6B7280',
          }}
        >
          ({getScheduleDisplayText(group.schedule)})
        </Text>
      </View>

      {group.supplements.map((supplement) => (
        <SupplementCard key={supplement.id} supplement={supplement} isDark={isDark} />
      ))}
    </View>
  );
}

export default function SupsScreen() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [supplementGroups, setSupplementGroups] = useState<SupplementsBySchedule[]>([]);
  const [totalSupplements, setTotalSupplements] = useState(0);

  // Load supplements data
  const loadSupplements = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { groups, error } = await getAthleteSupplementsBySchedule(user.id);

      if (error) {
        console.error('Error loading supplements:', error);
      } else {
        // Filter to active supplements only
        const activeGroups = groups
          .map((group) => ({
            ...group,
            supplements: filterActiveSupplements(group.supplements),
          }))
          .filter((group) => group.supplements.length > 0);

        setSupplementGroups(activeGroups);

        // Count total supplements
        const total = activeGroups.reduce((sum, g) => sum + g.supplements.length, 0);
        setTotalSupplements(total);
      }
    } catch (err) {
      console.error('Error in loadSupplements:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    loadSupplements();
  }, [loadSupplements]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadSupplements();
  }, [loadSupplements]);

  if (!isSupabaseConfigured) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: isDark ? '#111827' : '#F9FAFB',
        }}
      >
        <AlertCircle color="#F59E0B" size={48} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            marginTop: 16,
            textAlign: 'center',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          Supabase Not Configured
        </Text>
        <Text
          style={{
            fontSize: 14,
            marginTop: 8,
            textAlign: 'center',
            color: isDark ? '#9CA3AF' : '#6B7280',
          }}
        >
          Please add your Supabase credentials to the .env file
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: isDark ? '#111827' : '#F9FAFB',
        }}
      >
        <Pill color={isDark ? '#9CA3AF' : '#6B7280'} size={48} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            marginTop: 16,
            textAlign: 'center',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          Sign in to view your supplements
        </Text>
        <Text
          style={{
            fontSize: 14,
            marginTop: 8,
            textAlign: 'center',
            color: isDark ? '#9CA3AF' : '#6B7280',
          }}
        >
          Your supplement schedule will appear here
        </Text>
      </View>
    );
  }

  // Loading state
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
        <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>Loading supplements...</Text>
      </View>
    );
  }

  // No supplements assigned
  if (totalSupplements === 0) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB' }}
        contentContainerStyle={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? '#9CA3AF' : '#6B7280'}
          />
        }
      >
        <Pill color={isDark ? '#4B5563' : '#9CA3AF'} size={48} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            marginTop: 16,
            textAlign: 'center',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          No Supplements Assigned
        </Text>
        <Text
          style={{
            fontSize: 14,
            marginTop: 8,
            textAlign: 'center',
            color: isDark ? '#9CA3AF' : '#6B7280',
          }}
        >
          Your coach will assign supplements to you. Pull down to refresh!
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#F9FAFB' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={isDark ? '#9CA3AF' : '#6B7280'}
        />
      }
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Pill size={20} color="#8B5CF6" />
        <Text
          style={{
            marginLeft: 8,
            fontSize: 17,
            fontWeight: '600',
            color: isDark ? '#F3F4F6' : '#1F2937',
          }}
        >
          Your Supplements
        </Text>
      </View>

      {/* Today's Supplements - Coming Soon */}
      <View
        style={{
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: isDark ? '#374151' : '#E5E7EB',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
            }}
          >
            Today's Supplements
          </Text>
          <View
            style={{
              backgroundColor: isDark ? '#374151' : '#F3F4F6',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: isDark ? '#9CA3AF' : '#6B7280',
              }}
            >
              COMING SOON
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
          <Clock color={isDark ? '#4B5563' : '#9CA3AF'} size={32} />
          <Text
            style={{
              marginTop: 8,
              fontSize: 14,
              color: isDark ? '#6B7280' : '#9CA3AF',
              textAlign: 'center',
            }}
          >
            Track your daily supplement intake
          </Text>
        </View>
      </View>

      {/* All Supplements by Schedule */}
      <Text
        style={{
          fontSize: 17,
          fontWeight: '600',
          color: isDark ? '#F3F4F6' : '#1F2937',
          marginBottom: 16,
        }}
      >
        Full Schedule
      </Text>

      <View
        style={{
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: isDark ? '#374151' : '#E5E7EB',
        }}
      >
        {supplementGroups.map((group) => (
          <ScheduleGroup key={group.schedule} group={group} isDark={isDark} />
        ))}
      </View>
    </ScrollView>
  );
}
