import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { HapticPressable } from '../HapticPressable';
import { BottomSheetModal, BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { X, Dumbbell, User, Calendar, Target, Filter } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getPublicWorkoutPrograms, PublicWorkoutProgram } from '../../services/workoutService';

interface BrowseWorkoutProgramsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (program: PublicWorkoutProgram) => void;
}

export default function BrowseWorkoutProgramsModal({
  visible,
  onClose,
  onSelect,
}: BrowseWorkoutProgramsModalProps) {
  const { isDark } = useTheme();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  const [programs, setPrograms] = useState<PublicWorkoutProgram[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const isPresenting = useRef(false);

  // Extract unique phases and fitness levels from programs
  const { phases, levels } = useMemo(() => {
    const phaseSet = new Set<string>();
    const levelSet = new Set<string>();
    programs.forEach((p) => {
      if (p.phase) phaseSet.add(p.phase);
      if (p.fitness_level) levelSet.add(p.fitness_level);
    });
    return {
      phases: Array.from(phaseSet).sort(),
      levels: Array.from(levelSet).sort(),
    };
  }, [programs]);

  // Filter programs based on selected filters
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      if (selectedPhase && p.phase !== selectedPhase) return false;
      if (selectedLevel && p.fitness_level !== selectedLevel) return false;
      return true;
    });
  }, [programs, selectedPhase, selectedLevel]);

  const fetchPrograms = async () => {
    setIsLoading(true);
    setError(null);
    const { programs: fetchedPrograms, error: fetchError } = await getPublicWorkoutPrograms();
    if (fetchError) {
      setError(fetchError);
    } else {
      setPrograms(fetchedPrograms);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (visible && !isPresenting.current) {
      isPresenting.current = true;
      bottomSheetRef.current?.present();
      fetchPrograms();
    } else if (!visible && isPresenting.current) {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      isPresenting.current = false;
      onClose();
    }
  }, [onClose]);

  const handleClose = () => {
    bottomSheetRef.current?.dismiss();
  };

  const renderBackdrop = useCallback(
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

  const renderProgramCard = (program: PublicWorkoutProgram) => (
    <HapticPressable
      key={program.id}
      onPress={() => onSelect(program)}
      style={{
        backgroundColor: isDark ? '#374151' : '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: isDark ? '#4B5563' : '#E5E7EB',
      }}
    >
      {/* Program Name */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: isDark ? '#F3F4F6' : '#1F2937',
          marginBottom: 6,
        }}
      >
        {program.name}
      </Text>

      {/* Description */}
      {program.description && (
        <Text
          style={{
            fontSize: 14,
            color: isDark ? '#9CA3AF' : '#6B7280',
            marginBottom: 10,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {program.description}
        </Text>
      )}

      {/* Metadata row */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {/* Weeks */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Calendar size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
          <Text
            style={{
              fontSize: 12,
              color: isDark ? '#9CA3AF' : '#6B7280',
              marginLeft: 4,
            }}
          >
            {program.weeks} weeks
          </Text>
        </View>

        {/* Fitness Level */}
        {program.fitness_level && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Target size={14} color={isDark ? '#9CA3AF' : '#6B7280'} />
            <Text
              style={{
                fontSize: 12,
                color: isDark ? '#9CA3AF' : '#6B7280',
                marginLeft: 4,
              }}
            >
              {program.fitness_level}
            </Text>
          </View>
        )}

        {/* Phase */}
        {program.phase && (
          <View
            style={{
              backgroundColor: isDark ? '#4B5563' : '#E5E7EB',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 4,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: isDark ? '#D1D5DB' : '#4B5563',
                fontWeight: '500',
              }}
            >
              {program.phase}
            </Text>
          </View>
        )}
      </View>

      {/* Coach name */}
      {program.coach_name && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <User size={12} color={isDark ? '#6B7280' : '#9CA3AF'} />
          <Text
            style={{
              fontSize: 12,
              color: isDark ? '#6B7280' : '#9CA3AF',
              marginLeft: 4,
            }}
          >
            By: {program.coach_name}
          </Text>
        </View>
      )}
    </HapticPressable>
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{
        backgroundColor: isDark ? '#6B7280' : '#9CA3AF',
        width: 40,
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
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#374151' : '#E5E7EB',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Dumbbell size={20} color="#6366F1" />
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: isDark ? '#F3F4F6' : '#1F2937',
              marginLeft: 8,
            }}
          >
            Browse Workout Programs
          </Text>
        </View>
        <HapticPressable onPress={handleClose} hitSlop={8}>
          <X size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
        </HapticPressable>
      </View>

      {/* Content */}
      <BottomSheetScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 20,
          paddingBottom: 40,
        }}
      >
        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text
              style={{
                marginTop: 12,
                color: isDark ? '#9CA3AF' : '#6B7280',
              }}
            >
              Loading programs...
            </Text>
          </View>
        ) : error ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ color: '#EF4444', textAlign: 'center' }}>{error}</Text>
            <HapticPressable
              onPress={fetchPrograms}
              style={{
                marginTop: 12,
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: '#6366F1',
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>Retry</Text>
            </HapticPressable>
          </View>
        ) : programs.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Dumbbell size={48} color={isDark ? '#4B5563' : '#9CA3AF'} />
            <Text
              style={{
                marginTop: 16,
                fontSize: 16,
                fontWeight: '500',
                color: isDark ? '#9CA3AF' : '#6B7280',
                textAlign: 'center',
              }}
            >
              No Public Programs Available
            </Text>
            <Text
              style={{
                marginTop: 8,
                fontSize: 14,
                color: isDark ? '#6B7280' : '#9CA3AF',
                textAlign: 'center',
              }}
            >
              Ask your coach to create a public program
            </Text>
          </View>
        ) : (
          <>
            {/* Filters */}
            {(phases.length > 0 || levels.length > 0) && (
              <View style={{ marginBottom: 16 }}>
                {/* Phase filters */}
                {phases.length > 0 && (
                  <View style={{ marginBottom: 10 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: isDark ? '#9CA3AF' : '#6B7280',
                        marginBottom: 8,
                      }}
                    >
                      Phase
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      nestedScrollEnabled={true}
                      contentContainerStyle={{ gap: 8, paddingRight: 20 }}
                    >
                      <HapticPressable
                        onPress={() => setSelectedPhase(null)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                          backgroundColor:
                            selectedPhase === null
                              ? '#6366F1'
                              : isDark
                                ? '#374151'
                                : '#F3F4F6',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '500',
                            color:
                              selectedPhase === null
                                ? '#FFFFFF'
                                : isDark
                                  ? '#D1D5DB'
                                  : '#4B5563',
                          }}
                        >
                          All
                        </Text>
                      </HapticPressable>
                      {phases.map((phase) => (
                        <HapticPressable
                          key={phase}
                          onPress={() => setSelectedPhase(phase)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 16,
                            backgroundColor:
                              selectedPhase === phase
                                ? '#6366F1'
                                : isDark
                                  ? '#374151'
                                  : '#F3F4F6',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '500',
                              color:
                                selectedPhase === phase
                                  ? '#FFFFFF'
                                  : isDark
                                    ? '#D1D5DB'
                                    : '#4B5563',
                            }}
                          >
                            {phase}
                          </Text>
                        </HapticPressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Level filters */}
                {levels.length > 0 && (
                  <View>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: isDark ? '#9CA3AF' : '#6B7280',
                        marginBottom: 8,
                      }}
                    >
                      Level
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      nestedScrollEnabled={true}
                      contentContainerStyle={{ gap: 8, paddingRight: 20 }}
                    >
                      <HapticPressable
                        onPress={() => setSelectedLevel(null)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                          backgroundColor:
                            selectedLevel === null
                              ? '#6366F1'
                              : isDark
                                ? '#374151'
                                : '#F3F4F6',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '500',
                            color:
                              selectedLevel === null
                                ? '#FFFFFF'
                                : isDark
                                  ? '#D1D5DB'
                                  : '#4B5563',
                          }}
                        >
                          All
                        </Text>
                      </HapticPressable>
                      {levels.map((level) => (
                        <HapticPressable
                          key={level}
                          onPress={() => setSelectedLevel(level)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 16,
                            backgroundColor:
                              selectedLevel === level
                                ? '#6366F1'
                                : isDark
                                  ? '#374151'
                                  : '#F3F4F6',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '500',
                              color:
                                selectedLevel === level
                                  ? '#FFFFFF'
                                  : isDark
                                    ? '#D1D5DB'
                                    : '#4B5563',
                            }}
                          >
                            {level}
                          </Text>
                        </HapticPressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* Results count */}
            <Text
              style={{
                fontSize: 13,
                color: isDark ? '#9CA3AF' : '#6B7280',
                marginBottom: 12,
              }}
            >
              {filteredPrograms.length === programs.length
                ? `${programs.length} program${programs.length !== 1 ? 's' : ''} available`
                : `${filteredPrograms.length} of ${programs.length} programs`}
            </Text>

            {/* Program list */}
            {filteredPrograms.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    textAlign: 'center',
                  }}
                >
                  No programs match your filters
                </Text>
              </View>
            ) : (
              filteredPrograms.map(renderProgramCard)
            )}
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
