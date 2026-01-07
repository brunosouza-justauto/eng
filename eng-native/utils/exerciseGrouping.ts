import { ExerciseInstanceData, ExerciseGroupType } from '../types/workout';

export interface ExerciseGroup {
  exercises: ExerciseInstanceData[];
  groupType: ExerciseGroupType | null;
  groupId: string | null;
}

/**
 * Group exercises by their group_id for supersets/bi-sets/giant sets
 * Single exercises or those without group_id are returned as groups of 1
 */
export const groupExercises = (exercises: ExerciseInstanceData[]): ExerciseGroup[] => {
  const sortedExercises = [...exercises].sort((a, b) =>
    (a.order_in_workout ?? 0) - (b.order_in_workout ?? 0)
  );

  const result: ExerciseGroup[] = [];
  const processedGroupIds = new Set<string>();

  for (const exercise of sortedExercises) {
    // If exercise has a group_id and we haven't processed this group yet
    if (exercise.group_id && !processedGroupIds.has(exercise.group_id)) {
      // Find all exercises in this group
      const groupedExercises = sortedExercises.filter(e => e.group_id === exercise.group_id);

      if (groupedExercises.length >= 2) {
        result.push({
          exercises: groupedExercises.sort((a, b) => (a.group_order ?? 0) - (b.group_order ?? 0)),
          groupType: exercise.group_type || ExerciseGroupType.SUPERSET,
          groupId: exercise.group_id
        });
        processedGroupIds.add(exercise.group_id);
      } else {
        // Single exercise with group_id, treat as regular
        result.push({
          exercises: [exercise],
          groupType: null,
          groupId: null
        });
        processedGroupIds.add(exercise.group_id);
      }
    } else if (!exercise.group_id) {
      // Regular exercise without group
      result.push({
        exercises: [exercise],
        groupType: null,
        groupId: null
      });
    }
  }

  return result;
};

/**
 * Get the display label for an exercise group type
 */
export const getGroupTypeLabel = (groupType: ExerciseGroupType | null): string => {
  switch (groupType) {
    case ExerciseGroupType.SUPERSET:
      return 'Superset';
    case ExerciseGroupType.BI_SET:
      return 'Bi-Set';
    case ExerciseGroupType.TRI_SET:
      return 'Tri-Set';
    case ExerciseGroupType.GIANT_SET:
      return 'Giant Set';
    default:
      return 'Superset';
  }
};
