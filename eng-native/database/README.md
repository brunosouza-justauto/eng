# Database Schema Reference

The database schema is maintained in the main eng-app project:

**Schema Location:** `../eng-app/src/database/eng_remote_schema.sql`

## Updating the Schema

To get an up-to-date schema dump from Supabase:

```bash
# Using Supabase CLI
supabase db dump --db-url "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" > eng_remote_schema.sql

# Or from Supabase Dashboard:
# 1. Go to Project Settings > Database
# 2. Copy the connection string
# 3. Use pg_dump:
pg_dump --schema-only --no-owner --no-privileges "postgresql://..." > eng_remote_schema.sql
```

## Key Tables for Mobile App

### User & Auth
- `profiles` - User profiles with coach assignments, onboarding data

### Workout System
- `program_templates` - Workout programs created by coaches
- `workouts` - Individual workout days within a program
- `exercise_instances` - Exercises within a workout (with sets, reps, etc.)
- `workout_sessions` - Completed workout sessions by users
- `completed_sets` - Individual set data for completed workouts
- `exercise_feedback` - User feedback on exercises (pain, pump, workload)

### Assignments
- `assigned_plans` - Links athletes to programs and nutrition plans
  - `athlete_id` (profile id)
  - `program_template_id` (workout program)
  - `nutrition_plan_id` (nutrition plan)

### Exercise Database
- `exercises` - Master exercise database with metadata

## Common Column Patterns

- `id` - UUID primary key
- `created_at`, `updated_at` - Timestamps
- `user_id` - References auth.users(id)
- Profile references use profile `id`, not `user_id`
