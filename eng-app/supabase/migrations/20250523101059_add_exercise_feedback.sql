-- Create enum for feedback actions
CREATE TYPE public.feedback_action AS ENUM (
  'increase_weight',
  'decrease_weight',
  'change_exercise',
  'adjust_reps',
  'no_change'
);

-- Create exercise feedback table
CREATE TABLE IF NOT EXISTS public.exercise_feedback (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  workout_session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_instance_id uuid NOT NULL REFERENCES public.exercise_instances(id) ON DELETE CASCADE,
  pain_level integer CHECK (pain_level BETWEEN 1 AND 5),
  pump_level integer CHECK (pump_level BETWEEN 1 AND 5),
  workload_level integer CHECK (workload_level BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.exercise_feedback ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting feedback (athlete can insert their own feedback)
CREATE POLICY "Athletes can add their own feedback" ON public.exercise_feedback
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
    )
  );

-- Create policy for viewing feedback (athletes can view their own, coaches can view their athletes')
CREATE POLICY "Athletes can view their own feedback" ON public.exercise_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = workout_session_id AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view feedback from their athletes" ON public.exercise_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      JOIN public.profiles p ON ws.user_id = p.user_id
      WHERE ws.id = workout_session_id AND p.coach_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS exercise_feedback_workout_session_id_idx ON public.exercise_feedback (workout_session_id);
CREATE INDEX IF NOT EXISTS exercise_feedback_exercise_instance_id_idx ON public.exercise_feedback (exercise_instance_id);
