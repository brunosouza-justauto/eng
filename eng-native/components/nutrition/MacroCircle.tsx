import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

interface MacroCircleProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color: string;
  size?: number;
}

/**
 * Circular progress indicator for macro nutrients
 */
export const MacroCircle = ({
  label,
  current,
  target,
  unit = 'g',
  color,
  size = 70,
}: MacroCircleProps) => {
  const { isDark } = useTheme();

  // Calculate progress percentage (cap at 100%)
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  // Circle dimensions
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (progress / 100) * circumference;

  // Format display value
  const displayValue = label === 'Calories' ? current : `${current}${unit}`;
  const targetDisplay = label === 'Calories' ? target : `${target}${unit}`;

  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      {/* Label */}
      <Text
        style={{
          fontSize: 12,
          fontWeight: '500',
          color: color,
          marginBottom: 8,
        }}
      >
        {label}
      </Text>

      {/* Circle with progress */}
      <View style={{ width: size, height: size, position: 'relative' }}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isDark ? '#374151' : '#E5E7EB'}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>

        {/* Center text */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: label === 'Calories' ? 14 : 16,
              fontWeight: '700',
              color: color,
            }}
          >
            {displayValue}
          </Text>
        </View>
      </View>

      {/* Target value */}
      <Text
        style={{
          fontSize: 11,
          color: isDark ? '#6B7280' : '#9CA3AF',
          marginTop: 6,
        }}
      >
        / {targetDisplay}
      </Text>
    </View>
  );
};

export default MacroCircle;
