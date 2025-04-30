# Exercise Sets Fix

This document contains instructions for fixing the issue with exercise sets not being saved correctly in the workout form.

## The Issue

The problem occurs when saving workouts with exercise sets:

1. Exercise sets (`sets_data`) are being created and managed correctly in the WorkoutForm UI
2. However, they aren't being saved to the database properly
3. When you edit a workout, the exercise shows a large number of empty sets

## The Solution

The fix has two parts:

1. Creating a new `exercise_sets` table in the database
2. Updating the `handleSaveWorkout` function to save sets data properly

### 1. Creating the `exercise_sets` Table

You need to execute the SQL script `create_exercise_sets_table.sql` in your Supabase project:

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Create a new query
4. Copy the contents of `create_exercise_sets_table.sql` into the editor
5. Run the query

Alternatively, if you're using the Supabase CLI:

```bash
supabase db push -f migrations/create_exercise_sets_table.sql
```

### 2. Code Changes

The code changes have already been applied to the `ProgramBuilder.tsx` file. These changes:

1. Modify the `handleSaveWorkout` function to:
   - Delete existing exercise sets when updating a workout
   - Save the `sets_data` to the new `exercise_sets` table
   - Process fetched data to include set information

## Testing

After implementing these changes:

1. Create a new workout and add exercises with sets
2. Save the workout
3. Edit the workout again - you should now see the correct sets
4. Try modifying the sets and saving again - the changes should persist

## Troubleshooting

If you're still experiencing issues:

1. Check the browser console for any API errors
2. Verify the `exercise_sets` table was created correctly
3. Add `console.log` statements to debug:
   - Before saving sets: `console.log('Sets to insert:', allSetsToInsert);`
   - After fetching workouts: `console.log('Fetched workout data:', refreshedWorkouts);`

## Database Schema

The new `exercise_sets` table has the following structure:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| exercise_instance_id | UUID | Foreign key to exercise_instances |
| order | INTEGER | Order of the set in the exercise |
| type | TEXT | Set type (regular, warm_up, etc.) |
| reps | TEXT | Number of repetitions |
| weight | TEXT | Weight used |
| rest_seconds | INTEGER | Rest period in seconds |
| duration | TEXT | Duration for timed exercises |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

This structure matches the `ExerciseSet` interface in the TypeScript code. 