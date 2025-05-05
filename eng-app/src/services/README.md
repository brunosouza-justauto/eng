# Services Documentation

## Exercise Service

The exercise service provides functions to fetch exercise data from the HeyGainz API.

### API Functions

#### `getExercisesByIds(exerciseIds: number[]): Promise<Exercise[]>`

**Recommended approach**: Fetches only the specific exercises needed by ID from the HeyGainz API.

```typescript
// Example usage:
const exerciseIds = [976, 1044, 2389]; // IDs of exercises in a workout
const exercises = await getExercisesByIds(exerciseIds);
```

This is much more efficient than loading all exercises when you only need a few.

#### `getExerciseById(id: number): Promise<Exercise | null>`

Fetches a single exercise by ID from the API.

```typescript
// Example usage:
const exercise = await getExerciseById(976);
if (exercise) {
  console.log(`Loaded exercise: ${exercise.name}`);
}
```

#### `getAllExercisesCached(): Promise<Exercise[]>`

**Warning - Performance Impact**: This function fetches ALL exercises from the API (6000+ exercises in batches of 100). 
Only use this when you genuinely need the complete exercise database.

```typescript
// Example usage (use with caution):
const allExercises = await getAllExercisesCached();
```

### Best Practices

1. **Always fetch only what you need**. Use `getExercisesByIds()` or `getExerciseById()` when possible.

2. **Avoid fetching all exercises** unless absolutely necessary. The complete database is large and can cause performance issues.

3. **Cache intelligently**. The service handles caching automatically in sessionStorage to improve performance on subsequent requests.

4. **Error handling**. All service functions include error handling and will return empty arrays or null on failure, but you should still have error states in your UI. 