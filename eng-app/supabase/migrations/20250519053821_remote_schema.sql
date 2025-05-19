

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."bf_calculation_method" AS ENUM (
    'jackson_pollock_3',
    'jackson_pollock_4',
    'jackson_pollock_7',
    'durnin_womersley',
    'parrillo',
    'navy_tape'
);


ALTER TYPE "public"."bf_calculation_method" OWNER TO "postgres";


CREATE TYPE "public"."exercise_group_type" AS ENUM (
    'none',
    'superset',
    'bi_set',
    'tri_set',
    'giant_set'
);


ALTER TYPE "public"."exercise_group_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_category_counts"() RETURNS TABLE("category" "text", "count" bigint)
    LANGUAGE "sql"
    AS $$
  -- Get the count of exercises per category
  SELECT target as category, COUNT(*) as count
  FROM exercises
  WHERE target IS NOT NULL
  GROUP BY target
  ORDER BY count DESC;
$$;


ALTER FUNCTION "public"."get_category_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_distinct_categories"() RETURNS TABLE("value" "text")
    LANGUAGE "sql"
    AS $$
  -- Get distinct target/categories
  SELECT DISTINCT TRIM(target) as value
  FROM exercises 
  WHERE target IS NOT NULL AND target != ''
  ORDER BY value;
$$;


ALTER FUNCTION "public"."get_distinct_categories"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_distinct_equipment"() RETURNS TABLE("value" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY 
  SELECT DISTINCT COALESCE(equipment::text, '')
  FROM exercises
  WHERE equipment IS NOT NULL AND TRIM(equipment::text) != ''
  ORDER BY 1;
END;
$$;


ALTER FUNCTION "public"."get_distinct_equipment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_distinct_gender"() RETURNS TABLE("value" "text")
    LANGUAGE "sql"
    AS $$
  -- Get distinct gender values
  SELECT DISTINCT TRIM(gender)  as value
  FROM exercises 
  WHERE gender IS NOT NULL AND gender != ''
  ORDER BY value;
$$;


ALTER FUNCTION "public"."get_distinct_gender"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_distinct_muscle_groups"() RETURNS TABLE("value" "text")
    LANGUAGE "sql"
    AS $$
  -- Combine results from multiple columns that could contain muscle groups
  WITH combined_sources AS (
    SELECT primary_muscle_group AS value FROM exercises WHERE primary_muscle_group IS NOT NULL
    UNION
    SELECT UNNEST(secondary_muscle_groups) AS value FROM exercises 
      WHERE secondary_muscle_groups IS NOT NULL AND array_length(secondary_muscle_groups, 1) > 0
  )
  SELECT DISTINCT TRIM(value) as value
  FROM combined_sources 
  WHERE value != '' 
  ORDER BY value;
$$;


ALTER FUNCTION "public"."get_distinct_muscle_groups"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_equipment_counts"() RETURNS TABLE("equipment" "text", "count" bigint)
    LANGUAGE "sql"
    AS $$
  -- Get the count of exercises per equipment type
  SELECT equipment, COUNT(*) as count
  FROM exercises
  WHERE equipment IS NOT NULL
  GROUP BY equipment
  ORDER BY count DESC;
$$;


ALTER FUNCTION "public"."get_equipment_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Insert into public.profiles, linking to the new auth.users record
  INSERT INTO public.profiles (user_id, email, role, onboarding_complete, coach_id)
  VALUES (
    NEW.id,             -- The user_id from auth.users
    NEW.email,          -- The email from auth.users
    'athlete',          -- Default role for new signups
    false,              -- Require onboarding
    'c5e342a9-28a3-4fdb-9947-fe9e76c46b65'  -- Default coach ID
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_athlete_nutrition_assigned"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Get the coach's profile information 
    DECLARE
        coach_id UUID;
        plan_id UUID;
        athlete_id UUID;
    BEGIN
        -- Determine the plan_id and athlete_id based on the triggering table structure
        -- This depends on how your specific table is structured
        athlete_id := NEW.profile_id;
        IF NEW.nutrition_plan_id IS NOT NULL THEN
            plan_id := NEW.nutrition_plan_id;
        ELSIF NEW.plan_id IS NOT NULL THEN
            plan_id := NEW.plan_id;
        ELSIF NEW.meal_plan_id IS NOT NULL THEN
            plan_id := NEW.meal_plan_id;
        ELSE
            -- If we can't determine the plan ID, exit
            RETURN NEW;
        END IF;
            
        -- Get the coach ID either from the assignment record or the athlete's profile
        IF NEW.coach_id IS NOT NULL THEN
            coach_id := NEW.coach_id;
        ELSIF NEW.assigned_by IS NOT NULL THEN
            coach_id := NEW.assigned_by;
        ELSE
            -- Try to get from profile's coach_id
            SELECT p.coach_id INTO coach_id
            FROM public.profiles p
            WHERE p.id = athlete_id;
        END IF;
            
        -- Only proceed if we have all required IDs
        IF coach_id IS NOT NULL AND athlete_id IS NOT NULL AND plan_id IS NOT NULL THEN
            -- Insert notification for the athlete
            INSERT INTO public.notifications (
                recipient_id,
                sender_id,
                type,
                title,
                message,
                related_entity_id,
                related_entity_type
            )
            VALUES (
                athlete_id,                         -- The athlete who receives the notification
                coach_id,                           -- The coach who assigned the plan
                'nutrition_assigned',               -- Type of notification
                'New Nutrition Plan Assigned',
                'Your coach has assigned you a new nutrition plan',
                plan_id,                            -- Related entity is the nutrition plan
                'nutrition_plan'                    -- Entity type
            );
        END IF;
    END;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_athlete_nutrition_assigned"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_athlete_nutrition_assigned"() IS 'Sends a notification to an athlete when a nutrition plan is assigned';



CREATE OR REPLACE FUNCTION "public"."notify_athlete_program_assigned"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Get the coach's profile information 
    DECLARE
        coach_id UUID;
        program_id UUID;
        athlete_id UUID;
    BEGIN
        -- Determine the program_id and athlete_id based on the triggering table structure
        -- This depends on how your specific table is structured
        athlete_id := NEW.profile_id;
        IF NEW.program_id IS NOT NULL THEN
            program_id := NEW.program_id;
        ELSIF NEW.training_program_id IS NOT NULL THEN
            program_id := NEW.training_program_id;
        ELSIF NEW.workout_program_id IS NOT NULL THEN
            program_id := NEW.workout_program_id;
        ELSE
            -- If we can't determine the program ID, exit
            RETURN NEW;
        END IF;
            
        -- Get the coach ID either from the assignment record or the athlete's profile
        IF NEW.coach_id IS NOT NULL THEN
            coach_id := NEW.coach_id;
        ELSIF NEW.assigned_by IS NOT NULL THEN
            coach_id := NEW.assigned_by;
        ELSE
            -- Try to get from profile's coach_id
            SELECT p.coach_id INTO coach_id
            FROM public.profiles p
            WHERE p.id = athlete_id;
        END IF;
            
        -- Only proceed if we have all required IDs
        IF coach_id IS NOT NULL AND athlete_id IS NOT NULL AND program_id IS NOT NULL THEN
            -- Insert notification for the athlete
            INSERT INTO public.notifications (
                recipient_id,
                sender_id,
                type,
                title,
                message,
                related_entity_id,
                related_entity_type
            )
            VALUES (
                athlete_id,                         -- The athlete who receives the notification
                coach_id,                           -- The coach who assigned the program
                'program_assigned',                 -- Type of notification
                'New Training Program Assigned',
                'Your coach has assigned you a new training program',
                program_id,                         -- Related entity is the program
                'program'                           -- Entity type
            );
        END IF;
    END;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_athlete_program_assigned"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_athlete_program_assigned"() IS 'Sends a notification to an athlete when a training program is assigned';



CREATE OR REPLACE FUNCTION "public"."notify_coach_checkin_submitted"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    athlete_coach_id UUID;
    athlete_profile_id UUID; -- To store the sender's profile ID
BEGIN
    -- Get the athlete's coach ID and profile ID
    SELECT p.coach_id, p.id INTO athlete_coach_id, athlete_profile_id
    FROM public.profiles p
    WHERE p.user_id = NEW.user_id;
    
    -- Only proceed if coach_id exists
    IF athlete_coach_id IS NOT NULL THEN
        -- Insert notification for the coach
        INSERT INTO public.notifications (
            recipient_id,
            sender_id, -- Using the correct foreign key reference
            type,
            title,
            message,
            related_entity_id,
            related_entity_type
        )
        VALUES (
            athlete_coach_id,
            athlete_profile_id, -- Using profile ID instead of user_id
            'check_in',
            'Check-in Submitted',
            (SELECT
                CASE 
                    WHEN p.first_name IS NOT NULL AND p.last_name IS NOT NULL THEN 
                        p.first_name || ' ' || p.last_name || ' submitted a new check-in'
                    ELSE 
                        'Athlete with email ' || COALESCE(p.email, 'unknown') || ' submitted a new check-in'
                END
             FROM public.profiles p
             WHERE p.user_id = NEW.user_id),
            NEW.id,
            'check_in'
        );
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_coach_checkin_submitted"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_coach_checkin_submitted"() IS 'Sends a notification to a coach when an athlete submits a check-in';



CREATE OR REPLACE FUNCTION "public"."notify_coach_new_athlete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Only trigger for new profiles with coach_id set
    IF NEW.coach_id IS NOT NULL AND (OLD.coach_id IS NULL OR OLD.coach_id != NEW.coach_id) THEN
        -- Insert notification for the coach
        INSERT INTO public.notifications (
            recipient_id,
            sender_id,
            type,
            title,
            message,
            related_entity_id,
            related_entity_type
        )
        VALUES (
            NEW.coach_id,  -- The coach who will receive the notification
            NEW.id,        -- The athlete who was created/assigned
            'new_athlete', -- Type of notification
            'New Athlete Assigned',
            CASE 
                WHEN NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN 
                    'New athlete ' || NEW.first_name || ' ' || NEW.last_name || ' has been assigned to you.'
                ELSE 
                    'New athlete with email ' || NEW.email || ' has been assigned to you.'
            END,
            NEW.id,        -- Related entity is the athlete profile
            'profile'      -- Entity type
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_coach_new_athlete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_coach_steps_completed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    DECLARE
        athlete_id UUID;
        coach_id UUID;
        athlete_name TEXT;
        goal_reached BOOLEAN := FALSE;
        step_count INTEGER;
        daily_goal INTEGER := 10000; -- Default goal if not found
        date_info TEXT;
    BEGIN
        -- Get the step count from the entry
        step_count := NEW.step_count;
        
        -- Get date information
        date_info := ' on ' || to_char(NEW.date, 'YYYY-MM-DD');
        
        -- Get the athlete ID
        athlete_id := NEW.user_id;
        
        -- Try to find the user's active step goal
        SELECT sg.daily_steps INTO daily_goal
        FROM public.step_goals sg
        WHERE sg.user_id = athlete_id
        AND sg.is_active = true
        ORDER BY sg.assigned_at DESC
        LIMIT 1;
        
        -- Check if step goal is reached
        IF step_count >= daily_goal THEN
            goal_reached := TRUE;
        ELSE
            -- Goal not reached, exit
            RETURN NEW;
        END IF;
        
        -- Get coach ID and athlete name from profiles
        SELECT p.coach_id, COALESCE(p.first_name || ' ' || p.last_name, p.email) 
        INTO coach_id, athlete_name
        FROM public.profiles p
        WHERE p.id = athlete_id;
        
        -- Only send notification if coach exists
        IF coach_id IS NOT NULL THEN
            -- Insert notification for the coach
            INSERT INTO public.notifications (
                recipient_id,
                sender_id,
                type,
                title,
                message,
                related_entity_id,
                related_entity_type
            )
            VALUES (
                coach_id,           -- Coach receiving notification
                athlete_id,         -- Athlete who completed steps
                'steps_completed',  -- Type of notification
                'Steps Goal Reached',
                athlete_name || ' has reached their steps goal of ' || daily_goal || ' steps' || date_info || '.',
                NEW.id,             -- Related entity is the step entry
                'step_entry'        -- Entity type
            );
        END IF;
        
        RETURN NEW;
    END;
    $$;


ALTER FUNCTION "public"."notify_coach_steps_completed"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_coach_steps_completed"() IS 'Sends notification to coach when an athlete completes their daily steps goal. Uses step_goals table for personalized goals when available.';



CREATE OR REPLACE FUNCTION "public"."notify_coach_workout_session"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
        DECLARE
            athlete_id UUID;
            coach_id UUID;
            athlete_name TEXT;
        BEGIN
            -- Skip if end_time is NULL (not completed yet)
            IF NEW.end_time IS NULL THEN
                RETURN NEW;
            END IF;
            
            -- Skip update triggers if end_time was already set
            IF TG_OP = 'UPDATE' AND OLD.end_time IS NOT NULL THEN
                RETURN NEW;
            END IF;
            
            -- Get the athlete ID from the workout session record
            athlete_id := NEW.user_id;
            
            -- Get coach ID and athlete name from profiles
            SELECT coach_id, COALESCE(first_name || ' ' || last_name, email) 
            INTO coach_id, athlete_name
            FROM public.profiles
            WHERE id = athlete_id;
            
            -- Only send notification if coach exists
            IF coach_id IS NOT NULL THEN
                -- Insert notification for the coach
                INSERT INTO public.notifications (
                    recipient_id,
                    sender_id,
                    type,
                    title,
                    message,
                    related_entity_id,
                    related_entity_type
                )
                VALUES (
                    coach_id,              -- Coach receiving notification
                    athlete_id,            -- Athlete who completed the workout
                    'workout_completed', -- Type of notification
                    'Workout Completed',
                    athlete_name || ' has completed a workout.',
                    NEW.id,                -- Related entity is the workout session
                    'workout_session'    -- Entity type
                );
            END IF;
            
            RETURN NEW;
        END;
        $$;


ALTER FUNCTION "public"."notify_coach_workout_session"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_coach_workout_session"() IS 'Sends notification to coach when an athlete completes a workout session, determined by end_time value.';



CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_latest_program_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If this is a new version of an existing template
  IF NEW.parent_template_id IS NOT NULL THEN
    -- Set all previous versions to not be the latest
    UPDATE program_templates
    SET is_latest_version = FALSE
    WHERE (id = NEW.parent_template_id OR parent_template_id = NEW.parent_template_id)
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_latest_program_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."assigned_plans" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "program_template_id" "uuid",
    "nutrition_plan_id" "uuid",
    "start_date" "date" DEFAULT CURRENT_DATE,
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "assigned_by" "uuid"
);


ALTER TABLE "public"."assigned_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."athlete_measurements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "measurement_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "weight_kg" numeric(5,2),
    "weight_change_kg" numeric(5,2),
    "waist_cm" numeric(5,2),
    "neck_cm" numeric(5,2),
    "hips_cm" numeric(5,2),
    "tricep_mm" numeric(5,2),
    "subscapular_mm" numeric(5,2),
    "suprailiac_mm" numeric(5,2),
    "midaxillary_mm" numeric(5,2),
    "bicep_mm" numeric(5,2),
    "lower_back_mm" numeric(5,2),
    "calf_mm" numeric(5,2),
    "body_fat_percentage" numeric(5,2),
    "body_fat_override" numeric(5,2),
    "lean_body_mass_kg" numeric(5,2),
    "fat_mass_kg" numeric(5,2),
    "basal_metabolic_rate" numeric(6,2),
    "calculation_method" "public"."bf_calculation_method",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "chest_mm" numeric(5,2),
    "abdominal_mm" numeric(5,2),
    "thigh_mm" numeric(5,2)
);


ALTER TABLE "public"."athlete_measurements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."body_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "check_in_id" "uuid" NOT NULL,
    "weight_kg" double precision,
    "body_fat_percentage" double precision,
    "waist_cm" double precision,
    "hip_cm" double precision,
    "chest_cm" double precision,
    "arm_cm" double precision,
    "thigh_cm" double precision,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "body_metrics_arm_cm_check" CHECK (("arm_cm" >= (0)::double precision)),
    CONSTRAINT "body_metrics_body_fat_percentage_check" CHECK ((("body_fat_percentage" >= (0)::double precision) AND ("body_fat_percentage" <= (100)::double precision))),
    CONSTRAINT "body_metrics_chest_cm_check" CHECK (("chest_cm" >= (0)::double precision)),
    CONSTRAINT "body_metrics_hip_cm_check" CHECK (("hip_cm" >= (0)::double precision)),
    CONSTRAINT "body_metrics_thigh_cm_check" CHECK (("thigh_cm" >= (0)::double precision)),
    CONSTRAINT "body_metrics_waist_cm_check" CHECK (("waist_cm" >= (0)::double precision)),
    CONSTRAINT "body_metrics_weight_kg_check" CHECK (("weight_kg" >= (0)::double precision))
);


ALTER TABLE "public"."body_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."check_ins" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "check_in_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "photos" "jsonb",
    "video_url" "text",
    "diet_adherence" "text",
    "training_adherence" "text",
    "steps_adherence" "text",
    "notes" "text",
    "coach_feedback" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."check_ins" OWNER TO "postgres";


COMMENT ON COLUMN "public"."check_ins"."photos" IS 'JSON array storing URLs or storage object keys for uploaded progress photos.';



CREATE TABLE IF NOT EXISTS "public"."completed_exercise_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_session_id" "uuid" NOT NULL,
    "exercise_instance_id" "uuid" NOT NULL,
    "set_order" integer NOT NULL,
    "weight" "text",
    "reps" integer,
    "is_completed" boolean DEFAULT false,
    "notes" "text",
    "set_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."completed_exercise_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "device_type" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text",
    "last_synced" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "token_type" "text"
);


ALTER TABLE "public"."device_connections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercise_instances" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "workout_id" "uuid" NOT NULL,
    "exercise_db_id" integer,
    "exercise_name" "text" NOT NULL,
    "sets" "text",
    "reps" "text",
    "rest_period_seconds" integer,
    "tempo" "text",
    "notes" "text",
    "order_in_workout" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "set_type" "text",
    "sets_data" "text",
    "each_side" boolean DEFAULT false,
    "group_id" "uuid",
    "group_type" "public"."exercise_group_type" DEFAULT 'none'::"public"."exercise_group_type",
    "group_order" integer DEFAULT 0,
    "is_bodyweight" boolean DEFAULT false,
    CONSTRAINT "exercise_instances_order_in_workout_check" CHECK (("order_in_workout" >= 0)),
    CONSTRAINT "exercise_instances_rest_period_seconds_check" CHECK (("rest_period_seconds" >= 0))
);


ALTER TABLE "public"."exercise_instances" OWNER TO "postgres";


COMMENT ON COLUMN "public"."exercise_instances"."is_bodyweight" IS 'Flag to indicate if this exercise uses bodyweight instead of external weights';



CREATE TABLE IF NOT EXISTS "public"."exercise_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exercise_instance_id" "uuid" NOT NULL,
    "set_order" integer NOT NULL,
    "type" "text" NOT NULL,
    "reps" "text",
    "weight" "text",
    "rest_seconds" integer,
    "duration" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."exercise_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercises" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "original_name" "text",
    "description" "text",
    "slug" "text",
    "primary_muscle_group" "text",
    "secondary_muscle_groups" "text"[],
    "gif_url" "text",
    "youtube_link" "text",
    "instructions" "text"[],
    "tips" "text"[],
    "note" "text",
    "type" "text",
    "body_part" "text",
    "equipment" "text",
    "gender" "text",
    "target" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."exercises" OWNER TO "postgres";


COMMENT ON TABLE "public"."exercises" IS 'Table containing exercise information from HeyGainz API';



CREATE TABLE IF NOT EXISTS "public"."extra_meal_food_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "meal_log_id" "uuid" NOT NULL,
    "food_item_id" "uuid" NOT NULL,
    "quantity" numeric(10,2) NOT NULL,
    "unit" character varying(50) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."extra_meal_food_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "afcd_id" "text",
    "food_name" "text" NOT NULL,
    "food_group" "text",
    "calories_per_100g" double precision,
    "protein_per_100g" double precision,
    "carbs_per_100g" double precision,
    "fat_per_100g" double precision,
    "fiber_per_100g" double precision,
    "serving_size_g" double precision,
    "serving_size_unit" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "nutrient_basis" "text" DEFAULT '100g'::"text" NOT NULL,
    CONSTRAINT "food_items_calories_per_100g_check" CHECK (("calories_per_100g" >= (0)::double precision)),
    CONSTRAINT "food_items_carbs_per_100g_check" CHECK (("carbs_per_100g" >= (0)::double precision)),
    CONSTRAINT "food_items_fat_per_100g_check" CHECK (("fat_per_100g" >= (0)::double precision)),
    CONSTRAINT "food_items_fiber_per_100g_check" CHECK (("fiber_per_100g" >= (0)::double precision)),
    CONSTRAINT "food_items_protein_per_100g_check" CHECK (("protein_per_100g" >= (0)::double precision)),
    CONSTRAINT "food_items_serving_size_g_check" CHECK (("serving_size_g" > (0)::double precision))
);


ALTER TABLE "public"."food_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."food_items"."nutrient_basis" IS 'Indicates if nutrient values are per ''100g'' or ''100mL''. Defaults to ''100g''.';



CREATE TABLE IF NOT EXISTS "public"."program_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "phase" "text",
    "weeks" integer NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_public" boolean DEFAULT false NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "parent_template_id" "uuid",
    "is_latest_version" boolean DEFAULT true NOT NULL,
    "fitness_level" "text",
    CONSTRAINT "program_templates_weeks_check" CHECK (("weeks" > 0))
);


ALTER TABLE "public"."program_templates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."program_templates"."fitness_level" IS 'The target fitness level for this program: Beginner, Intermediate, Advanced, or Athlete';



CREATE OR REPLACE VIEW "public"."latest_program_templates" AS
 SELECT "program_templates"."id",
    "program_templates"."coach_id",
    "program_templates"."name",
    "program_templates"."phase",
    "program_templates"."weeks",
    "program_templates"."description",
    "program_templates"."created_at",
    "program_templates"."updated_at",
    "program_templates"."is_public",
    "program_templates"."version",
    "program_templates"."parent_template_id",
    "program_templates"."is_latest_version"
   FROM "public"."program_templates"
  WHERE ("program_templates"."is_latest_version" = true);


ALTER TABLE "public"."latest_program_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meal_food_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "meal_id" "uuid" NOT NULL,
    "food_item_id" "uuid" NOT NULL,
    "quantity" double precision NOT NULL,
    "unit" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "recipe_id" "uuid",
    "source_recipe_id" "uuid",
    CONSTRAINT "meal_food_items_quantity_check" CHECK (("quantity" > (0)::double precision))
);


ALTER TABLE "public"."meal_food_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meal_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "meal_id" "uuid",
    "nutrition_plan_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "date" "date" NOT NULL,
    "time" time without time zone NOT NULL,
    "day_type" character varying(100) NOT NULL,
    "notes" "text",
    "is_extra_meal" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meal_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "nutrition_plan_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "time_suggestion" "text",
    "notes" "text",
    "order_in_plan" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "day_type" "text",
    "description" "text",
    CONSTRAINT "meals_order_in_plan_check" CHECK (("order_in_plan" >= 0))
);


ALTER TABLE "public"."meals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "sender_id" "uuid",
    "type" character varying(50) NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "related_entity_id" "uuid",
    "related_entity_type" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Stores notifications for users in the system';



COMMENT ON COLUMN "public"."notifications"."type" IS 'Type of notification (e.g., new_athlete, check_in, etc.)';



COMMENT ON COLUMN "public"."notifications"."related_entity_id" IS 'ID of the entity this notification refers to (e.g., profile_id)';



COMMENT ON COLUMN "public"."notifications"."related_entity_type" IS 'Type of entity (e.g., profile, check_in, etc.)';



CREATE TABLE IF NOT EXISTS "public"."nutrition_plans" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "total_calories" integer,
    "protein_grams" integer,
    "carbohydrate_grams" integer,
    "fat_grams" integer,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_public" boolean DEFAULT false NOT NULL,
    CONSTRAINT "nutrition_plans_carbohydrate_grams_check" CHECK (("carbohydrate_grams" >= 0)),
    CONSTRAINT "nutrition_plans_fat_grams_check" CHECK (("fat_grams" >= 0)),
    CONSTRAINT "nutrition_plans_protein_grams_check" CHECK (("protein_grams" >= 0)),
    CONSTRAINT "nutrition_plans_total_calories_check" CHECK (("total_calories" >= 0))
);


ALTER TABLE "public"."nutrition_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "username" "text",
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'athlete'::"text" NOT NULL,
    "coach_id" "uuid",
    "age" integer,
    "weight_kg" double precision,
    "height_cm" double precision,
    "body_fat_percentage" double precision,
    "goal_target_fat_loss_kg" double precision,
    "goal_timeframe_weeks" integer,
    "goal_target_weight_kg" double precision,
    "goal_physique_details" "text",
    "training_days_per_week" integer,
    "training_current_program" "text",
    "training_equipment" "text",
    "training_session_length_minutes" integer,
    "training_intensity" "text",
    "nutrition_meal_patterns" "text",
    "nutrition_tracking_method" "text",
    "nutrition_preferences" "text",
    "nutrition_allergies" "text",
    "lifestyle_sleep_hours" double precision,
    "lifestyle_stress_level" integer,
    "lifestyle_water_intake_liters" double precision,
    "lifestyle_schedule_notes" "text",
    "supplements_meds" "text",
    "motivation_readiness" "text",
    "onboarding_complete" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "invitation_status" character varying(50),
    "invited_at" timestamp with time zone,
    "gender" character varying(10) DEFAULT 'male'::character varying,
    "first_name" "text",
    "last_name" "text",
    "goal_type" "text",
    "goal_target_muscle_gain_kg" numeric,
    CONSTRAINT "profiles_gender_check" CHECK ((("gender")::"text" = ANY ((ARRAY['male'::character varying, 'female'::character varying])::"text"[]))),
    CONSTRAINT "profiles_goal_type_check" CHECK (("goal_type" = ANY (ARRAY['fat_loss'::"text", 'muscle_gain'::"text", 'both'::"text", 'maintenance'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."user_id" IS 'Can be NULL for pending invitations';



COMMENT ON COLUMN "public"."profiles"."role" IS 'Defines user capabilities, e.g., ''athlete'' or ''coach''.';



COMMENT ON COLUMN "public"."profiles"."coach_id" IS 'If role is ''athlete'', this optionally links to their coach''s profile id.';



COMMENT ON COLUMN "public"."profiles"."invitation_status" IS 'Status of the invitation: pending, accepted, expired';



COMMENT ON COLUMN "public"."profiles"."invited_at" IS 'When the invitation was sent';



CREATE TABLE IF NOT EXISTS "public"."recipe_ingredients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "food_item_id" "uuid" NOT NULL,
    "quantity" double precision NOT NULL,
    "unit" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "recipe_ingredients_quantity_check" CHECK (("quantity" > (0)::double precision))
);


ALTER TABLE "public"."recipe_ingredients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "instructions" "text",
    "total_calories" double precision,
    "total_protein" double precision,
    "total_carbs" double precision,
    "total_fat" double precision,
    "serving_size" double precision,
    "serving_unit" "text" DEFAULT 'g'::"text",
    "is_public" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "recipes_serving_size_check" CHECK (("serving_size" > (0)::double precision)),
    CONSTRAINT "recipes_total_calories_check" CHECK (("total_calories" >= (0)::double precision)),
    CONSTRAINT "recipes_total_carbs_check" CHECK (("total_carbs" >= (0)::double precision)),
    CONSTRAINT "recipes_total_fat_check" CHECK (("total_fat" >= (0)::double precision)),
    CONSTRAINT "recipes_total_protein_check" CHECK (("total_protein" >= (0)::double precision))
);


ALTER TABLE "public"."recipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."step_entries" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "step_count" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."step_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."step_goals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "daily_steps" integer NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "step_goals_daily_steps_check" CHECK (("daily_steps" >= 0))
);


ALTER TABLE "public"."step_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unit_conversions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "from_unit" "text" NOT NULL,
    "to_unit" "text" NOT NULL,
    "food_category" "text",
    "conversion_factor" double precision NOT NULL
);


ALTER TABLE "public"."unit_conversions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wellness_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "check_in_id" "uuid" NOT NULL,
    "sleep_hours" double precision,
    "sleep_quality" integer,
    "stress_level" integer,
    "fatigue_level" integer,
    "digestion" "text",
    "motivation_level" integer,
    "menstrual_cycle_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "wellness_metrics_fatigue_level_check" CHECK ((("fatigue_level" >= 1) AND ("fatigue_level" <= 5))),
    CONSTRAINT "wellness_metrics_motivation_level_check" CHECK ((("motivation_level" >= 1) AND ("motivation_level" <= 5))),
    CONSTRAINT "wellness_metrics_sleep_hours_check" CHECK (("sleep_hours" >= (0)::double precision)),
    CONSTRAINT "wellness_metrics_sleep_quality_check" CHECK ((("sleep_quality" >= 1) AND ("sleep_quality" <= 5))),
    CONSTRAINT "wellness_metrics_stress_level_check" CHECK ((("stress_level" >= 1) AND ("stress_level" <= 5)))
);


ALTER TABLE "public"."wellness_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workout_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone DEFAULT "now"(),
    "end_time" timestamp with time zone,
    "duration_seconds" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workout_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workouts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "program_template_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "day_of_week" integer,
    "week_number" integer,
    "order_in_program" integer,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "workouts_day_of_week_check" CHECK ((("day_of_week" >= 1) AND ("day_of_week" <= 7))),
    CONSTRAINT "workouts_week_number_check" CHECK (("week_number" > 0))
);


ALTER TABLE "public"."workouts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."assigned_plans"
    ADD CONSTRAINT "assigned_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_measurements"
    ADD CONSTRAINT "athlete_measurements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_measurements"
    ADD CONSTRAINT "athlete_measurements_user_id_measurement_date_key" UNIQUE ("user_id", "measurement_date");



ALTER TABLE ONLY "public"."body_metrics"
    ADD CONSTRAINT "body_metrics_check_in_id_key" UNIQUE ("check_in_id");



ALTER TABLE ONLY "public"."body_metrics"
    ADD CONSTRAINT "body_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."completed_exercise_sets"
    ADD CONSTRAINT "completed_exercise_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_connections"
    ADD CONSTRAINT "device_connections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercise_instances"
    ADD CONSTRAINT "exercise_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercise_sets"
    ADD CONSTRAINT "exercise_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."extra_meal_food_items"
    ADD CONSTRAINT "extra_meal_food_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_items"
    ADD CONSTRAINT "food_items_afcd_id_key" UNIQUE ("afcd_id");



ALTER TABLE ONLY "public"."food_items"
    ADD CONSTRAINT "food_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_food_items"
    ADD CONSTRAINT "meal_food_items_meal_id_food_item_id_key" UNIQUE ("meal_id", "food_item_id");



ALTER TABLE ONLY "public"."meal_food_items"
    ADD CONSTRAINT "meal_food_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_logs"
    ADD CONSTRAINT "meal_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meals"
    ADD CONSTRAINT "meals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."nutrition_plans"
    ADD CONSTRAINT "nutrition_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."program_templates"
    ADD CONSTRAINT "program_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_recipe_id_food_item_id_key" UNIQUE ("recipe_id", "food_item_id");



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."step_entries"
    ADD CONSTRAINT "step_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."step_entries"
    ADD CONSTRAINT "step_entries_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."step_goals"
    ADD CONSTRAINT "step_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."unit_conversions"
    ADD CONSTRAINT "unit_conversions_from_unit_to_unit_food_category_key" UNIQUE ("from_unit", "to_unit", "food_category");



ALTER TABLE ONLY "public"."unit_conversions"
    ADD CONSTRAINT "unit_conversions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wellness_metrics"
    ADD CONSTRAINT "wellness_metrics_check_in_id_key" UNIQUE ("check_in_id");



ALTER TABLE ONLY "public"."wellness_metrics"
    ADD CONSTRAINT "wellness_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_pkey" PRIMARY KEY ("id");



CREATE INDEX "exercises_primary_muscle_idx" ON "public"."exercises" USING "btree" ("primary_muscle_group");



CREATE INDEX "idx_assigned_plans_athlete_created" ON "public"."assigned_plans" USING "btree" ("athlete_id", "created_at" DESC);



CREATE INDEX "idx_assigned_plans_nutrition_plan_id" ON "public"."assigned_plans" USING "btree" ("nutrition_plan_id");



CREATE INDEX "idx_assigned_plans_program_template_id" ON "public"."assigned_plans" USING "btree" ("program_template_id");



CREATE INDEX "idx_assigned_plans_user_id" ON "public"."assigned_plans" USING "btree" ("athlete_id");



CREATE INDEX "idx_athlete_measurements_date" ON "public"."athlete_measurements" USING "btree" ("measurement_date");



CREATE INDEX "idx_athlete_measurements_user_id" ON "public"."athlete_measurements" USING "btree" ("user_id");



CREATE INDEX "idx_body_metrics_check_in_id" ON "public"."body_metrics" USING "btree" ("check_in_id");



CREATE INDEX "idx_check_ins_user_id" ON "public"."check_ins" USING "btree" ("user_id");



CREATE INDEX "idx_completed_sets_exercise_instance_id" ON "public"."completed_exercise_sets" USING "btree" ("exercise_instance_id");



CREATE INDEX "idx_completed_sets_set_type" ON "public"."completed_exercise_sets" USING "btree" ("set_type");



CREATE INDEX "idx_completed_sets_workout_session_id" ON "public"."completed_exercise_sets" USING "btree" ("workout_session_id");



CREATE INDEX "idx_exercise_instances_exercise_db_id" ON "public"."exercise_instances" USING "btree" ("exercise_db_id");



CREATE INDEX "idx_exercise_instances_group_id" ON "public"."exercise_instances" USING "btree" ("group_id");



CREATE INDEX "idx_exercise_instances_workout_id" ON "public"."exercise_instances" USING "btree" ("workout_id");



CREATE INDEX "idx_exercise_sets_exercise_instance_id" ON "public"."exercise_sets" USING "btree" ("exercise_instance_id");



CREATE INDEX "idx_exercise_sets_order" ON "public"."exercise_sets" USING "btree" ("set_order");



CREATE INDEX "idx_extra_meal_food_items_meal_log_id" ON "public"."extra_meal_food_items" USING "btree" ("meal_log_id");



CREATE INDEX "idx_food_items_afcd_id" ON "public"."food_items" USING "btree" ("afcd_id");



CREATE INDEX "idx_food_items_nutrient_basis" ON "public"."food_items" USING "btree" ("nutrient_basis");



CREATE INDEX "idx_meal_food_items_food_item_id" ON "public"."meal_food_items" USING "btree" ("food_item_id");



CREATE INDEX "idx_meal_food_items_meal_id" ON "public"."meal_food_items" USING "btree" ("meal_id");



CREATE INDEX "idx_meal_food_items_recipe_id" ON "public"."meal_food_items" USING "btree" ("recipe_id");



CREATE INDEX "idx_meal_food_items_source_recipe_id" ON "public"."meal_food_items" USING "btree" ("source_recipe_id");



CREATE INDEX "idx_meal_logs_date" ON "public"."meal_logs" USING "btree" ("date");



CREATE INDEX "idx_meal_logs_meal_id" ON "public"."meal_logs" USING "btree" ("meal_id");



CREATE INDEX "idx_meal_logs_user_id" ON "public"."meal_logs" USING "btree" ("user_id");



CREATE INDEX "idx_meals_nutrition_plan_id" ON "public"."meals" USING "btree" ("nutrition_plan_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_recipient_id" ON "public"."notifications" USING "btree" ("recipient_id");



CREATE INDEX "idx_nutrition_plans_coach_id" ON "public"."nutrition_plans" USING "btree" ("coach_id");



CREATE INDEX "idx_nutrition_plans_is_public" ON "public"."nutrition_plans" USING "btree" ("is_public");



CREATE INDEX "idx_profiles_coach_id" ON "public"."profiles" USING "btree" ("coach_id");



CREATE INDEX "idx_profiles_invitation_status" ON "public"."profiles" USING "btree" ("invitation_status");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_profiles_user_id" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "idx_program_templates_coach_id" ON "public"."program_templates" USING "btree" ("coach_id");



CREATE INDEX "idx_program_templates_fitness_level" ON "public"."program_templates" USING "btree" ("fitness_level");



CREATE INDEX "idx_program_templates_is_public" ON "public"."program_templates" USING "btree" ("is_public");



CREATE INDEX "idx_program_templates_latest" ON "public"."program_templates" USING "btree" ("is_latest_version");



CREATE INDEX "idx_program_templates_parent_id" ON "public"."program_templates" USING "btree" ("parent_template_id");



CREATE INDEX "idx_recipe_ingredients_recipe_id" ON "public"."recipe_ingredients" USING "btree" ("recipe_id");



CREATE INDEX "idx_recipes_coach_id" ON "public"."recipes" USING "btree" ("coach_id");



CREATE INDEX "idx_step_entries_user_date" ON "public"."step_entries" USING "btree" ("user_id", "date");



CREATE INDEX "idx_step_goals_user_id" ON "public"."step_goals" USING "btree" ("user_id");



CREATE INDEX "idx_wellness_metrics_check_in_id" ON "public"."wellness_metrics" USING "btree" ("check_in_id");



CREATE INDEX "idx_workout_sessions_user_id" ON "public"."workout_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_workout_sessions_workout_id" ON "public"."workout_sessions" USING "btree" ("workout_id");



CREATE INDEX "idx_workouts_program_template_id" ON "public"."workouts" USING "btree" ("program_template_id");



CREATE OR REPLACE TRIGGER "notify_coach_on_checkin_submitted" AFTER INSERT ON "public"."check_ins" FOR EACH ROW EXECUTE FUNCTION "public"."notify_coach_checkin_submitted"();



CREATE OR REPLACE TRIGGER "notify_coach_on_new_athlete" AFTER INSERT OR UPDATE OF "coach_id" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."notify_coach_new_athlete"();



CREATE OR REPLACE TRIGGER "notify_coach_on_steps_completed" AFTER INSERT OR UPDATE OF "step_count" ON "public"."step_entries" FOR EACH ROW EXECUTE FUNCTION "public"."notify_coach_steps_completed"();



CREATE OR REPLACE TRIGGER "notify_coach_on_workout_session_completed_insert" AFTER INSERT ON "public"."workout_sessions" FOR EACH ROW WHEN (("new"."end_time" IS NOT NULL)) EXECUTE FUNCTION "public"."notify_coach_workout_session"();



CREATE OR REPLACE TRIGGER "notify_coach_on_workout_session_completed_update" AFTER UPDATE OF "end_time" ON "public"."workout_sessions" FOR EACH ROW WHEN ((("old"."end_time" IS NULL) AND ("new"."end_time" IS NOT NULL))) EXECUTE FUNCTION "public"."notify_coach_workout_session"();



CREATE OR REPLACE TRIGGER "set_assigned_plans_timestamp" BEFORE UPDATE ON "public"."assigned_plans" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_body_metrics_timestamp" BEFORE UPDATE ON "public"."body_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_check_ins_timestamp" BEFORE UPDATE ON "public"."check_ins" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_exercise_instances_timestamp" BEFORE UPDATE ON "public"."exercise_instances" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_food_items_timestamp" BEFORE UPDATE ON "public"."food_items" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_meals_timestamp" BEFORE UPDATE ON "public"."meals" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_notifications_timestamp" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_nutrition_plans_timestamp" BEFORE UPDATE ON "public"."nutrition_plans" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_profiles_timestamp" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_program_templates_timestamp" BEFORE UPDATE ON "public"."program_templates" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_step_goals_timestamp" BEFORE UPDATE ON "public"."step_goals" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_wellness_metrics_timestamp" BEFORE UPDATE ON "public"."wellness_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_workouts_timestamp" BEFORE UPDATE ON "public"."workouts" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_update_program_version" AFTER INSERT OR UPDATE ON "public"."program_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_latest_program_version"();



CREATE OR REPLACE TRIGGER "update_exercise_sets_modtime" BEFORE UPDATE ON "public"."exercise_sets" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



ALTER TABLE ONLY "public"."assigned_plans"
    ADD CONSTRAINT "assigned_plans_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."assigned_plans"
    ADD CONSTRAINT "assigned_plans_nutrition_plan_id_fkey" FOREIGN KEY ("nutrition_plan_id") REFERENCES "public"."nutrition_plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assigned_plans"
    ADD CONSTRAINT "assigned_plans_program_template_id_fkey" FOREIGN KEY ("program_template_id") REFERENCES "public"."program_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assigned_plans"
    ADD CONSTRAINT "assigned_plans_user_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_measurements"
    ADD CONSTRAINT "athlete_measurements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."athlete_measurements"
    ADD CONSTRAINT "athlete_measurements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."body_metrics"
    ADD CONSTRAINT "body_metrics_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "public"."check_ins"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."completed_exercise_sets"
    ADD CONSTRAINT "completed_exercise_sets_exercise_instance_id_fkey" FOREIGN KEY ("exercise_instance_id") REFERENCES "public"."exercise_instances"("id");



ALTER TABLE ONLY "public"."completed_exercise_sets"
    ADD CONSTRAINT "completed_exercise_sets_workout_session_id_fkey" FOREIGN KEY ("workout_session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_connections"
    ADD CONSTRAINT "device_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_instances"
    ADD CONSTRAINT "exercise_instances_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_sets"
    ADD CONSTRAINT "exercise_sets_exercise_instance_id_fkey" FOREIGN KEY ("exercise_instance_id") REFERENCES "public"."exercise_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."extra_meal_food_items"
    ADD CONSTRAINT "extra_meal_food_items_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."extra_meal_food_items"
    ADD CONSTRAINT "extra_meal_food_items_meal_log_id_fkey" FOREIGN KEY ("meal_log_id") REFERENCES "public"."meal_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_instances"
    ADD CONSTRAINT "fk_exercise_instance_exercise" FOREIGN KEY ("exercise_db_id") REFERENCES "public"."exercises"("id");



ALTER TABLE ONLY "public"."meal_food_items"
    ADD CONSTRAINT "meal_food_items_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_food_items"
    ADD CONSTRAINT "meal_food_items_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_food_items"
    ADD CONSTRAINT "meal_food_items_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meal_food_items"
    ADD CONSTRAINT "meal_food_items_source_recipe_id_fkey" FOREIGN KEY ("source_recipe_id") REFERENCES "public"."recipes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meal_logs"
    ADD CONSTRAINT "meal_logs_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meal_logs"
    ADD CONSTRAINT "meal_logs_nutrition_plan_id_fkey" FOREIGN KEY ("nutrition_plan_id") REFERENCES "public"."nutrition_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_logs"
    ADD CONSTRAINT "meal_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meals"
    ADD CONSTRAINT "meals_nutrition_plan_id_fkey" FOREIGN KEY ("nutrition_plan_id") REFERENCES "public"."nutrition_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."nutrition_plans"
    ADD CONSTRAINT "nutrition_plans_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_templates"
    ADD CONSTRAINT "program_templates_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_templates"
    ADD CONSTRAINT "program_templates_parent_template_id_fkey" FOREIGN KEY ("parent_template_id") REFERENCES "public"."program_templates"("id");



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."step_entries"
    ADD CONSTRAINT "step_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."step_goals"
    ADD CONSTRAINT "step_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wellness_metrics"
    ADD CONSTRAINT "wellness_metrics_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "public"."check_ins"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id");



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_program_template_id_fkey" FOREIGN KEY ("program_template_id") REFERENCES "public"."program_templates"("id") ON DELETE CASCADE;



CREATE POLICY "All Permissions" ON "public"."exercises" USING (true);



CREATE POLICY "Allow authenticated users" ON "public"."profiles" TO "authenticated" USING (true);



CREATE POLICY "Allow individual user access" ON "public"."assigned_plans" TO "authenticated" USING (("auth"."uid"() = "athlete_id")) WITH CHECK (("auth"."uid"() = "athlete_id"));



CREATE POLICY "Allow individual user access" ON "public"."check_ins" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own device connections" ON "public"."device_connections" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own device connections" ON "public"."device_connections" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read their own device connections" ON "public"."device_connections" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own device connections" ON "public"."device_connections" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "notifications"."recipient_id"))));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() IN ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "notifications"."recipient_id"))));



CREATE POLICY "athlete_manage_own_extra_meal_food_items" ON "public"."extra_meal_food_items" USING ((EXISTS ( SELECT 1
   FROM "public"."meal_logs" "ml"
  WHERE (("ml"."id" = "extra_meal_food_items"."meal_log_id") AND ("ml"."user_id" = "auth"."uid"())))));



CREATE POLICY "athlete_manage_own_meal_logs" ON "public"."meal_logs" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."athlete_measurements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "athlete_view_own_measurements" ON "public"."athlete_measurements" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "athletes_view_accessible_nutrition_plans" ON "public"."nutrition_plans" FOR SELECT USING (("is_public" OR (EXISTS ( SELECT 1
   FROM "public"."assigned_plans"
  WHERE (("assigned_plans"."nutrition_plan_id" = "nutrition_plans"."id") AND ("assigned_plans"."athlete_id" = "auth"."uid"()))))));



CREATE POLICY "athletes_view_accessible_programs" ON "public"."program_templates" FOR SELECT USING (("is_public" OR (EXISTS ( SELECT 1
   FROM "public"."assigned_plans"
  WHERE (("assigned_plans"."program_template_id" = "program_templates"."id") AND ("assigned_plans"."athlete_id" = "auth"."uid"()))))));



CREATE POLICY "coach_measurement_policy" ON "public"."athlete_measurements" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'coach'::"text")))));



CREATE POLICY "coach_read_athlete_extra_meal_food_items" ON "public"."extra_meal_food_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."meal_logs" "ml"
     JOIN "public"."profiles" "ac" ON (("ac"."user_id" = "ml"."user_id")))
  WHERE (("ml"."id" = "extra_meal_food_items"."meal_log_id") AND ("ac"."coach_id" = "auth"."uid"())))));



CREATE POLICY "coach_read_athlete_meal_logs" ON "public"."meal_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "ac"
  WHERE (("ac"."user_id" = "meal_logs"."user_id") AND ("ac"."coach_id" = "auth"."uid"())))));



CREATE POLICY "coaches_access_own_nutrition_plans" ON "public"."nutrition_plans" USING (("coach_id" = "auth"."uid"()));



CREATE POLICY "coaches_access_own_programs" ON "public"."program_templates" USING (("coach_id" = "auth"."uid"()));



ALTER TABLE "public"."completed_exercise_sets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delete_own_workout_sessions" ON "public"."workout_sessions" FOR DELETE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."device_connections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."extra_meal_food_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_own_completed_sets" ON "public"."completed_exercise_sets" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions"
  WHERE (("workout_sessions"."id" = "completed_exercise_sets"."workout_session_id") AND ("workout_sessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "insert_own_workout_sessions" ON "public"."workout_sessions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."meal_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read_athletes_completed_sets" ON "public"."completed_exercise_sets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_sessions"
     JOIN "public"."profiles" ON (("profiles"."user_id" = "workout_sessions"."user_id")))
  WHERE (("workout_sessions"."id" = "completed_exercise_sets"."workout_session_id") AND ("profiles"."coach_id" = "auth"."uid"())))));



CREATE POLICY "read_athletes_workout_sessions" ON "public"."workout_sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "workout_sessions"."user_id") AND ("profiles"."coach_id" = "auth"."uid"())))));



CREATE POLICY "read_own_completed_sets" ON "public"."completed_exercise_sets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions"
  WHERE (("workout_sessions"."id" = "completed_exercise_sets"."workout_session_id") AND ("workout_sessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "read_own_workout_sessions" ON "public"."workout_sessions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "update_own_completed_sets" ON "public"."completed_exercise_sets" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions"
  WHERE (("workout_sessions"."id" = "completed_exercise_sets"."workout_session_id") AND ("workout_sessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "update_own_workout_sessions" ON "public"."workout_sessions" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."workout_sessions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."completed_exercise_sets";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."workout_sessions";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."get_category_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_category_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_category_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_distinct_categories"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_distinct_categories"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_distinct_categories"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_distinct_equipment"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_distinct_equipment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_distinct_equipment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_distinct_gender"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_distinct_gender"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_distinct_gender"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_distinct_muscle_groups"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_distinct_muscle_groups"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_distinct_muscle_groups"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_equipment_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_equipment_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_equipment_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_athlete_nutrition_assigned"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_athlete_nutrition_assigned"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_athlete_nutrition_assigned"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_athlete_program_assigned"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_athlete_program_assigned"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_athlete_program_assigned"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_coach_checkin_submitted"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_coach_checkin_submitted"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_coach_checkin_submitted"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_coach_new_athlete"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_coach_new_athlete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_coach_new_athlete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_coach_steps_completed"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_coach_steps_completed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_coach_steps_completed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_coach_workout_session"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_coach_workout_session"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_coach_workout_session"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_latest_program_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_latest_program_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_latest_program_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."assigned_plans" TO "anon";
GRANT ALL ON TABLE "public"."assigned_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."assigned_plans" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_measurements" TO "anon";
GRANT ALL ON TABLE "public"."athlete_measurements" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_measurements" TO "service_role";



GRANT ALL ON TABLE "public"."body_metrics" TO "anon";
GRANT ALL ON TABLE "public"."body_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."body_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."check_ins" TO "anon";
GRANT ALL ON TABLE "public"."check_ins" TO "authenticated";
GRANT ALL ON TABLE "public"."check_ins" TO "service_role";



GRANT ALL ON TABLE "public"."completed_exercise_sets" TO "anon";
GRANT ALL ON TABLE "public"."completed_exercise_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."completed_exercise_sets" TO "service_role";



GRANT ALL ON TABLE "public"."device_connections" TO "anon";
GRANT ALL ON TABLE "public"."device_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."device_connections" TO "service_role";



GRANT ALL ON TABLE "public"."exercise_instances" TO "anon";
GRANT ALL ON TABLE "public"."exercise_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_instances" TO "service_role";



GRANT ALL ON TABLE "public"."exercise_sets" TO "anon";
GRANT ALL ON TABLE "public"."exercise_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_sets" TO "service_role";



GRANT ALL ON TABLE "public"."exercises" TO "anon";
GRANT ALL ON TABLE "public"."exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."exercises" TO "service_role";



GRANT ALL ON TABLE "public"."extra_meal_food_items" TO "anon";
GRANT ALL ON TABLE "public"."extra_meal_food_items" TO "authenticated";
GRANT ALL ON TABLE "public"."extra_meal_food_items" TO "service_role";



GRANT ALL ON TABLE "public"."food_items" TO "anon";
GRANT ALL ON TABLE "public"."food_items" TO "authenticated";
GRANT ALL ON TABLE "public"."food_items" TO "service_role";



GRANT ALL ON TABLE "public"."program_templates" TO "anon";
GRANT ALL ON TABLE "public"."program_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."program_templates" TO "service_role";



GRANT ALL ON TABLE "public"."latest_program_templates" TO "anon";
GRANT ALL ON TABLE "public"."latest_program_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."latest_program_templates" TO "service_role";



GRANT ALL ON TABLE "public"."meal_food_items" TO "anon";
GRANT ALL ON TABLE "public"."meal_food_items" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_food_items" TO "service_role";



GRANT ALL ON TABLE "public"."meal_logs" TO "anon";
GRANT ALL ON TABLE "public"."meal_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_logs" TO "service_role";



GRANT ALL ON TABLE "public"."meals" TO "anon";
GRANT ALL ON TABLE "public"."meals" TO "authenticated";
GRANT ALL ON TABLE "public"."meals" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."nutrition_plans" TO "anon";
GRANT ALL ON TABLE "public"."nutrition_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."nutrition_plans" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_ingredients" TO "anon";
GRANT ALL ON TABLE "public"."recipe_ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_ingredients" TO "service_role";



GRANT ALL ON TABLE "public"."recipes" TO "anon";
GRANT ALL ON TABLE "public"."recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."recipes" TO "service_role";



GRANT ALL ON TABLE "public"."step_entries" TO "anon";
GRANT ALL ON TABLE "public"."step_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."step_entries" TO "service_role";



GRANT ALL ON TABLE "public"."step_goals" TO "anon";
GRANT ALL ON TABLE "public"."step_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."step_goals" TO "service_role";



GRANT ALL ON TABLE "public"."unit_conversions" TO "anon";
GRANT ALL ON TABLE "public"."unit_conversions" TO "authenticated";
GRANT ALL ON TABLE "public"."unit_conversions" TO "service_role";



GRANT ALL ON TABLE "public"."wellness_metrics" TO "anon";
GRANT ALL ON TABLE "public"."wellness_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."wellness_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."workout_sessions" TO "anon";
GRANT ALL ON TABLE "public"."workout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."workouts" TO "anon";
GRANT ALL ON TABLE "public"."workouts" TO "authenticated";
GRANT ALL ON TABLE "public"."workouts" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
