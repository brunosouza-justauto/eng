import { View, Text } from 'react-native';
import { Link2 } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ExerciseGroupType } from '../../types/workout';
import { getGroupTypeLabel } from '../../utils/exerciseGrouping';

interface ExerciseGroupContainerProps {
  groupType: ExerciseGroupType;
  children: React.ReactNode;
}

/**
 * Container component that wraps grouped exercises (supersets, bi-sets, etc.)
 * with visual styling to indicate they should be performed together
 */
export const ExerciseGroupContainer = ({
  groupType,
  children,
}: ExerciseGroupContainerProps) => {
  const { isDark } = useTheme();

  return (
    <View
      style={{
        marginBottom: 16,
        borderRadius: 16,
        padding: 12,
        backgroundColor: isDark
          ? 'rgba(99, 102, 241, 0.12)'
          : 'rgba(99, 102, 241, 0.06)',
        borderWidth: 2,
        borderColor: isDark
          ? 'rgba(99, 102, 241, 0.4)'
          : 'rgba(99, 102, 241, 0.25)',
        borderStyle: 'dashed',
      }}
    >
      {/* Group Label */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: isDark
              ? 'rgba(99, 102, 241, 0.3)'
              : 'rgba(99, 102, 241, 0.15)',
          }}
        >
          <Link2 size={14} color={isDark ? '#A5B4FC' : '#6366F1'} />
          <Text
            style={{
              marginLeft: 6,
              fontSize: 12,
              fontWeight: '700',
              color: isDark ? '#A5B4FC' : '#4F46E5',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {getGroupTypeLabel(groupType)}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            height: 1,
            marginLeft: 12,
            backgroundColor: isDark
              ? 'rgba(99, 102, 241, 0.3)'
              : 'rgba(99, 102, 241, 0.2)',
          }}
        />
      </View>

      {/* Instruction text */}
      <Text
        style={{
          fontSize: 11,
          color: isDark ? '#9CA3AF' : '#6B7280',
          marginBottom: 12,
          fontStyle: 'italic',
        }}
      >
        Perform all exercises back-to-back with no rest between
      </Text>

      {/* Grouped Exercise Cards */}
      <View style={{ gap: 8 }}>
        {children}
      </View>
    </View>
  );
};

export default ExerciseGroupContainer;
