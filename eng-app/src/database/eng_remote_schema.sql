

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


CREATE SCHEMA IF NOT EXISTS "auth";


ALTER SCHEMA "auth" OWNER TO "supabase_admin";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "storage";


ALTER SCHEMA "storage" OWNER TO "supabase_admin";


CREATE TYPE "auth"."aal_level" AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE "auth"."aal_level" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."code_challenge_method" AS ENUM (
    's256',
    'plain'
);


ALTER TYPE "auth"."code_challenge_method" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."factor_status" AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE "auth"."factor_status" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."factor_type" AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE "auth"."factor_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_authorization_status" AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE "auth"."oauth_authorization_status" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_client_type" AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE "auth"."oauth_client_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_registration_type" AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE "auth"."oauth_registration_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_response_type" AS ENUM (
    'code'
);


ALTER TYPE "auth"."oauth_response_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."one_time_token_type" AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE "auth"."one_time_token_type" OWNER TO "supabase_auth_admin";


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


CREATE TYPE "public"."feedback_action" AS ENUM (
    'increase_weight',
    'decrease_weight',
    'change_exercise',
    'adjust_reps',
    'no_change'
);


ALTER TYPE "public"."feedback_action" OWNER TO "postgres";


CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "auth"."email"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION "auth"."email"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."email"() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';



CREATE OR REPLACE FUNCTION "auth"."jwt"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION "auth"."jwt"() OWNER TO "supabase_auth_admin";


CREATE OR REPLACE FUNCTION "auth"."role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION "auth"."role"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."role"() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';



CREATE OR REPLACE FUNCTION "auth"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION "auth"."uid"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."uid"() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';



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
    AS $$BEGIN
    -- Get the coach's profile information 
    DECLARE
        coach_id UUID;
        plan_id UUID;
        athlete_id UUID;
    BEGIN
        -- Determine the plan_id and athlete_id based on the triggering table structure
        -- This depends on how your specific table is structured
        athlete_id := NEW.athlete_id;
        IF NEW.nutrition_plan_id IS NOT NULL THEN
            plan_id := NEW.nutrition_plan_id;
        ELSE
            -- If we can't determine the plan ID, exit
            RETURN NEW;
        END IF;
            
        -- Get the coach ID either from the assignment record or the athlete's profile
        IF NEW.assigned_by IS NOT NULL THEN
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
END;$$;


ALTER FUNCTION "public"."notify_athlete_nutrition_assigned"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_athlete_nutrition_assigned"() IS 'Sends a notification to an athlete when a nutrition plan is assigned';



CREATE OR REPLACE FUNCTION "public"."notify_athlete_program_assigned"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN
    -- Get the coach's profile information 
    DECLARE
        coach_id UUID;
        program_id UUID;
        athlete_id UUID;
    BEGIN
        -- Determine the program_id and athlete_id based on the triggering table structure
        -- This depends on how your specific table is structured
        athlete_id := NEW.athlete_id;
        IF NEW.program_template_id IS NOT NULL THEN
            program_id := NEW.program_template_id;
        ELSE
            -- If we can't determine the program ID, exit
            RETURN NEW;
        END IF;
            
        -- Get the coach ID either from the assignment record or the athlete's profile
        IF NEW.assigned_by IS NOT NULL THEN
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
END;$$;


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
    AS $$DECLARE
        athlete_user_id UUID;
        athlete_id UUID;
        coach_id UUID;
        athlete_name TEXT;
        goal_reached BOOLEAN := FALSE;
        steps_count INTEGER;
        day_step_count INTEGER;
        daily_goal INTEGER := 10000; -- Default goal if not found
        date_info TEXT;
    BEGIN
        -- Get the step count from the entry
        steps_count := NEW.step_count;
        
        -- Get date information
        date_info := ' on ' || to_char(NEW.date, 'YYYY-MM-DD');
        
        -- Get the athlete ID
        athlete_user_id := NEW.user_id;
        
        -- Get coach ID and athlete name from profiles
        SELECT p.id, p.coach_id, COALESCE(p.first_name || ' ' || p.last_name, p.email) 
        INTO athlete_id, coach_id, athlete_name
        FROM public.profiles p
        WHERE p.user_id = athlete_user_id;
        
        -- Try to find the user's active step goal
        SELECT COALESCE(sg.daily_steps, 0) as daily_steps
        INTO daily_goal
        FROM public.step_goals sg
        WHERE sg.user_id = athlete_id
        AND sg.is_active = true
        ORDER BY sg.assigned_at DESC
        LIMIT 1;

        SELECT COALESCE(SUM(step_count), 0) as daily_step_count
        INTO day_step_count
        FROM step_entries where user_id = athlete_user_id
        AND date = NEW.date;
        
        -- Check if step goal is reached
        IF day_step_count >= daily_goal THEN
            goal_reached := TRUE;
        ELSE
            -- Goal not reached, exit
            RETURN NEW;
        END IF;
        
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
    END;$$;


ALTER FUNCTION "public"."notify_coach_steps_completed"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_coach_steps_completed"() IS 'Sends notification to coach when an athlete completes their daily steps goal. Uses step_goals table for personalized goals when available.';



CREATE OR REPLACE FUNCTION "public"."notify_coach_workout_session"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE
athlete_user_id UUID;
athlete_id UUID;
coach_id_var UUID;
athlete_name TEXT;
BEGIN
IF NEW.end_time IS NULL THEN
RETURN NEW;
END IF;
IF TG_OP = 'UPDATE' AND OLD.end_time IS NOT NULL THEN
RETURN NEW;
END IF;
athlete_user_id := NEW.user_id;
SELECT profiles.id, profiles.coach_id, COALESCE(first_name || ' ' || last_name, email)
INTO athlete_id, coach_id_var, athlete_name
FROM public.profiles
WHERE user_id = athlete_user_id;
IF coach_id_var IS NOT NULL THEN
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
coach_id_var, -- Coach receiving notification
athlete_id, -- Athlete who completed the workout
'workout_completed', -- Type of notification
'Workout Completed',
athlete_name || ' has completed a workout.',
NEW.id, -- Related entity is the workout session
'workout_session' -- Entity type
);
END IF;
RETURN NEW;
END;$$;


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


CREATE OR REPLACE FUNCTION "storage"."add_prefixes"("_bucket_id" "text", "_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


ALTER FUNCTION "storage"."add_prefixes"("_bucket_id" "text", "_name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_leaf_prefixes"("bucket_ids" "text"[], "names" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


ALTER FUNCTION "storage"."delete_leaf_prefixes"("bucket_ids" "text"[], "names" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_prefix"("_bucket_id" "text", "_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


ALTER FUNCTION "storage"."delete_prefix"("_bucket_id" "text", "_name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_prefix_hierarchy_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


ALTER FUNCTION "storage"."delete_prefix_hierarchy_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION "storage"."enforce_bucket_name_length"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION "storage"."extension"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION "storage"."filename"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION "storage"."foldername"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_level"("name" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION "storage"."get_level"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_prefix"("name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION "storage"."get_prefix"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_prefixes"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


ALTER FUNCTION "storage"."get_prefixes"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION "storage"."get_size_by_bucket"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


ALTER FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."lock_top_prefixes"("bucket_ids" "text"[], "names" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;


ALTER FUNCTION "storage"."lock_top_prefixes"("bucket_ids" "text"[], "names" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_delete_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."objects_delete_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_insert_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_insert_prefix_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."objects_update_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_level_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_update_level_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_update_prefix_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION "storage"."operation"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."prefixes_delete_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."prefixes_delete_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."prefixes_insert_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."prefixes_insert_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


ALTER FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v1_optimised"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION "storage"."search_v1_optimised"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text", "sort_column" "text" DEFAULT 'name'::"text", "sort_column_after" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;


ALTER FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer, "levels" integer, "start_after" "text", "sort_order" "text", "sort_column" "text", "sort_column_after" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "storage"."update_updated_at_column"() OWNER TO "supabase_storage_admin";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "auth"."audit_log_entries" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "payload" "json",
    "created_at" timestamp with time zone,
    "ip_address" character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE "auth"."audit_log_entries" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."audit_log_entries" IS 'Auth: Audit trail for user actions.';



CREATE TABLE IF NOT EXISTS "auth"."flow_state" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "auth_code" "text" NOT NULL,
    "code_challenge_method" "auth"."code_challenge_method" NOT NULL,
    "code_challenge" "text" NOT NULL,
    "provider_type" "text" NOT NULL,
    "provider_access_token" "text",
    "provider_refresh_token" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "authentication_method" "text" NOT NULL,
    "auth_code_issued_at" timestamp with time zone
);


ALTER TABLE "auth"."flow_state" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."flow_state" IS 'stores metadata for pkce logins';



CREATE TABLE IF NOT EXISTS "auth"."identities" (
    "provider_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "identity_data" "jsonb" NOT NULL,
    "provider" "text" NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email" "text" GENERATED ALWAYS AS ("lower"(("identity_data" ->> 'email'::"text"))) STORED,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "auth"."identities" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."identities" IS 'Auth: Stores identities associated to a user.';



COMMENT ON COLUMN "auth"."identities"."email" IS 'Auth: Email is a generated column that references the optional email property in the identity_data';



CREATE TABLE IF NOT EXISTS "auth"."instances" (
    "id" "uuid" NOT NULL,
    "uuid" "uuid",
    "raw_base_config" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "auth"."instances" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."instances" IS 'Auth: Manages users across multiple sites.';



CREATE TABLE IF NOT EXISTS "auth"."mfa_amr_claims" (
    "session_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "authentication_method" "text" NOT NULL,
    "id" "uuid" NOT NULL
);


ALTER TABLE "auth"."mfa_amr_claims" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_amr_claims" IS 'auth: stores authenticator method reference claims for multi factor authentication';



CREATE TABLE IF NOT EXISTS "auth"."mfa_challenges" (
    "id" "uuid" NOT NULL,
    "factor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "ip_address" "inet" NOT NULL,
    "otp_code" "text",
    "web_authn_session_data" "jsonb"
);


ALTER TABLE "auth"."mfa_challenges" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_challenges" IS 'auth: stores metadata about challenge requests made';



CREATE TABLE IF NOT EXISTS "auth"."mfa_factors" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friendly_name" "text",
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "secret" "text",
    "phone" "text",
    "last_challenged_at" timestamp with time zone,
    "web_authn_credential" "jsonb",
    "web_authn_aaguid" "uuid",
    "last_webauthn_challenge_data" "jsonb"
);


ALTER TABLE "auth"."mfa_factors" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_factors" IS 'auth: stores metadata about factors';



COMMENT ON COLUMN "auth"."mfa_factors"."last_webauthn_challenge_data" IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';



CREATE TABLE IF NOT EXISTS "auth"."oauth_authorizations" (
    "id" "uuid" NOT NULL,
    "authorization_id" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "redirect_uri" "text" NOT NULL,
    "scope" "text" NOT NULL,
    "state" "text",
    "resource" "text",
    "code_challenge" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "response_type" "auth"."oauth_response_type" DEFAULT 'code'::"auth"."oauth_response_type" NOT NULL,
    "status" "auth"."oauth_authorization_status" DEFAULT 'pending'::"auth"."oauth_authorization_status" NOT NULL,
    "authorization_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:03:00'::interval) NOT NULL,
    "approved_at" timestamp with time zone,
    "nonce" "text",
    CONSTRAINT "oauth_authorizations_authorization_code_length" CHECK (("char_length"("authorization_code") <= 255)),
    CONSTRAINT "oauth_authorizations_code_challenge_length" CHECK (("char_length"("code_challenge") <= 128)),
    CONSTRAINT "oauth_authorizations_expires_at_future" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "oauth_authorizations_nonce_length" CHECK (("char_length"("nonce") <= 255)),
    CONSTRAINT "oauth_authorizations_redirect_uri_length" CHECK (("char_length"("redirect_uri") <= 2048)),
    CONSTRAINT "oauth_authorizations_resource_length" CHECK (("char_length"("resource") <= 2048)),
    CONSTRAINT "oauth_authorizations_scope_length" CHECK (("char_length"("scope") <= 4096)),
    CONSTRAINT "oauth_authorizations_state_length" CHECK (("char_length"("state") <= 4096))
);


ALTER TABLE "auth"."oauth_authorizations" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."oauth_client_states" (
    "id" "uuid" NOT NULL,
    "provider_type" "text" NOT NULL,
    "code_verifier" "text",
    "created_at" timestamp with time zone NOT NULL
);


ALTER TABLE "auth"."oauth_client_states" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."oauth_client_states" IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';



CREATE TABLE IF NOT EXISTS "auth"."oauth_clients" (
    "id" "uuid" NOT NULL,
    "client_secret_hash" "text",
    "registration_type" "auth"."oauth_registration_type" NOT NULL,
    "redirect_uris" "text" NOT NULL,
    "grant_types" "text" NOT NULL,
    "client_name" "text",
    "client_uri" "text",
    "logo_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "client_type" "auth"."oauth_client_type" DEFAULT 'confidential'::"auth"."oauth_client_type" NOT NULL,
    CONSTRAINT "oauth_clients_client_name_length" CHECK (("char_length"("client_name") <= 1024)),
    CONSTRAINT "oauth_clients_client_uri_length" CHECK (("char_length"("client_uri") <= 2048)),
    CONSTRAINT "oauth_clients_logo_uri_length" CHECK (("char_length"("logo_uri") <= 2048))
);


ALTER TABLE "auth"."oauth_clients" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."oauth_consents" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "scopes" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "oauth_consents_revoked_after_granted" CHECK ((("revoked_at" IS NULL) OR ("revoked_at" >= "granted_at"))),
    CONSTRAINT "oauth_consents_scopes_length" CHECK (("char_length"("scopes") <= 2048)),
    CONSTRAINT "oauth_consents_scopes_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "scopes")) > 0))
);


ALTER TABLE "auth"."oauth_consents" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."one_time_tokens" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" "text" NOT NULL,
    "relates_to" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "one_time_tokens_token_hash_check" CHECK (("char_length"("token_hash") > 0))
);


ALTER TABLE "auth"."one_time_tokens" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."refresh_tokens" (
    "instance_id" "uuid",
    "id" bigint NOT NULL,
    "token" character varying(255),
    "user_id" character varying(255),
    "revoked" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "parent" character varying(255),
    "session_id" "uuid"
);


ALTER TABLE "auth"."refresh_tokens" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."refresh_tokens" IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';



CREATE SEQUENCE IF NOT EXISTS "auth"."refresh_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "auth"."refresh_tokens_id_seq" OWNER TO "supabase_auth_admin";


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNED BY "auth"."refresh_tokens"."id";



CREATE TABLE IF NOT EXISTS "auth"."saml_providers" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "entity_id" "text" NOT NULL,
    "metadata_xml" "text" NOT NULL,
    "metadata_url" "text",
    "attribute_mapping" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name_id_format" "text",
    CONSTRAINT "entity_id not empty" CHECK (("char_length"("entity_id") > 0)),
    CONSTRAINT "metadata_url not empty" CHECK ((("metadata_url" = NULL::"text") OR ("char_length"("metadata_url") > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK (("char_length"("metadata_xml") > 0))
);


ALTER TABLE "auth"."saml_providers" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."saml_providers" IS 'Auth: Manages SAML Identity Provider connections.';



CREATE TABLE IF NOT EXISTS "auth"."saml_relay_states" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "request_id" "text" NOT NULL,
    "for_email" "text",
    "redirect_to" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "flow_state_id" "uuid",
    CONSTRAINT "request_id not empty" CHECK (("char_length"("request_id") > 0))
);


ALTER TABLE "auth"."saml_relay_states" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."saml_relay_states" IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';



CREATE TABLE IF NOT EXISTS "auth"."schema_migrations" (
    "version" character varying(255) NOT NULL
);


ALTER TABLE "auth"."schema_migrations" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."schema_migrations" IS 'Auth: Manages updates to the auth system.';



CREATE TABLE IF NOT EXISTS "auth"."sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "factor_id" "uuid",
    "aal" "auth"."aal_level",
    "not_after" timestamp with time zone,
    "refreshed_at" timestamp without time zone,
    "user_agent" "text",
    "ip" "inet",
    "tag" "text",
    "oauth_client_id" "uuid",
    "refresh_token_hmac_key" "text",
    "refresh_token_counter" bigint,
    "scopes" "text",
    CONSTRAINT "sessions_scopes_length" CHECK (("char_length"("scopes") <= 4096))
);


ALTER TABLE "auth"."sessions" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sessions" IS 'Auth: Stores session data associated to a user.';



COMMENT ON COLUMN "auth"."sessions"."not_after" IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';



COMMENT ON COLUMN "auth"."sessions"."refresh_token_hmac_key" IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';



COMMENT ON COLUMN "auth"."sessions"."refresh_token_counter" IS 'Holds the ID (counter) of the last issued refresh token.';



CREATE TABLE IF NOT EXISTS "auth"."sso_domains" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK (("char_length"("domain") > 0))
);


ALTER TABLE "auth"."sso_domains" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sso_domains" IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';



CREATE TABLE IF NOT EXISTS "auth"."sso_providers" (
    "id" "uuid" NOT NULL,
    "resource_id" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "disabled" boolean,
    CONSTRAINT "resource_id not empty" CHECK ((("resource_id" = NULL::"text") OR ("char_length"("resource_id") > 0)))
);


ALTER TABLE "auth"."sso_providers" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sso_providers" IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';



COMMENT ON COLUMN "auth"."sso_providers"."resource_id" IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';



CREATE TABLE IF NOT EXISTS "auth"."users" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "aud" character varying(255),
    "role" character varying(255),
    "email" character varying(255),
    "encrypted_password" character varying(255),
    "email_confirmed_at" timestamp with time zone,
    "invited_at" timestamp with time zone,
    "confirmation_token" character varying(255),
    "confirmation_sent_at" timestamp with time zone,
    "recovery_token" character varying(255),
    "recovery_sent_at" timestamp with time zone,
    "email_change_token_new" character varying(255),
    "email_change" character varying(255),
    "email_change_sent_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "raw_app_meta_data" "jsonb",
    "raw_user_meta_data" "jsonb",
    "is_super_admin" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "phone" "text" DEFAULT NULL::character varying,
    "phone_confirmed_at" timestamp with time zone,
    "phone_change" "text" DEFAULT ''::character varying,
    "phone_change_token" character varying(255) DEFAULT ''::character varying,
    "phone_change_sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone GENERATED ALWAYS AS (LEAST("email_confirmed_at", "phone_confirmed_at")) STORED,
    "email_change_token_current" character varying(255) DEFAULT ''::character varying,
    "email_change_confirm_status" smallint DEFAULT 0,
    "banned_until" timestamp with time zone,
    "reauthentication_token" character varying(255) DEFAULT ''::character varying,
    "reauthentication_sent_at" timestamp with time zone,
    "is_sso_user" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_email_change_confirm_status_check" CHECK ((("email_change_confirm_status" >= 0) AND ("email_change_confirm_status" <= 2)))
);


ALTER TABLE "auth"."users" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."users" IS 'Auth: Stores user login data within a secure schema.';



COMMENT ON COLUMN "auth"."users"."is_sso_user" IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';



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


CREATE TABLE IF NOT EXISTS "public"."athlete_supplements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "supplement_id" "uuid" NOT NULL,
    "prescribed_by" "uuid" NOT NULL,
    "dosage" "text" NOT NULL,
    "timing" "text",
    "schedule" "text" NOT NULL,
    "notes" "text",
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."athlete_supplements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."body_metrics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "check_in_id" "uuid" NOT NULL,
    "weight_kg" double precision,
    "body_fat_percentage" double precision,
    "waist_cm" double precision,
    "hip_cm" double precision,
    "chest_cm" double precision,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "left_arm_cm" double precision,
    "right_arm_cm" double precision,
    "left_thigh_cm" double precision,
    "right_thigh_cm" double precision,
    CONSTRAINT "body_metrics_body_fat_percentage_check" CHECK ((("body_fat_percentage" >= (0)::double precision) AND ("body_fat_percentage" <= (100)::double precision))),
    CONSTRAINT "body_metrics_chest_cm_check" CHECK (("chest_cm" >= (0)::double precision)),
    CONSTRAINT "body_metrics_hip_cm_check" CHECK (("hip_cm" >= (0)::double precision)),
    CONSTRAINT "body_metrics_left_arm_cm_check" CHECK (("left_arm_cm" >= (0)::double precision)),
    CONSTRAINT "body_metrics_left_thigh_cm_check" CHECK (("left_thigh_cm" >= (0)::double precision)),
    CONSTRAINT "body_metrics_right_arm_cm_check" CHECK (("right_arm_cm" >= (0)::double precision)),
    CONSTRAINT "body_metrics_right_thigh_cm_check" CHECK (("right_thigh_cm" >= (0)::double precision)),
    CONSTRAINT "body_metrics_waist_cm_check" CHECK (("waist_cm" >= (0)::double precision)),
    CONSTRAINT "body_metrics_weight_kg_check" CHECK (("weight_kg" >= (0)::double precision))
);


ALTER TABLE "public"."body_metrics" OWNER TO "postgres";


COMMENT ON COLUMN "public"."body_metrics"."left_arm_cm" IS 'Left arm circumference measurement in centimeters';



COMMENT ON COLUMN "public"."body_metrics"."right_arm_cm" IS 'Right arm circumference measurement in centimeters';



COMMENT ON COLUMN "public"."body_metrics"."left_thigh_cm" IS 'Left thigh circumference measurement in centimeters';



COMMENT ON COLUMN "public"."body_metrics"."right_thigh_cm" IS 'Right thigh circumference measurement in centimeters';



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


CREATE TABLE IF NOT EXISTS "public"."exercise_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_session_id" "uuid" NOT NULL,
    "exercise_instance_id" "uuid" NOT NULL,
    "pain_level" integer,
    "pump_level" integer,
    "workload_level" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "exercise_feedback_pain_level_check" CHECK ((("pain_level" >= 1) AND ("pain_level" <= 5))),
    CONSTRAINT "exercise_feedback_pump_level_check" CHECK ((("pump_level" >= 1) AND ("pump_level" <= 5))),
    CONSTRAINT "exercise_feedback_workload_level_check" CHECK ((("workload_level" >= 1) AND ("workload_level" <= 5)))
);


ALTER TABLE "public"."exercise_feedback" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."food_item_images" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "food_item_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."food_item_images" OWNER TO "postgres";


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
    "barcode" "text",
    "source" "text" DEFAULT 'ausnut'::"text",
    "created_by" "uuid",
    "is_verified" boolean DEFAULT false,
    "brand" "text",
    "source_id" "text",
    CONSTRAINT "food_items_calories_per_100g_check" CHECK (("calories_per_100g" >= (0)::double precision)),
    CONSTRAINT "food_items_carbs_per_100g_check" CHECK (("carbs_per_100g" >= (0)::double precision)),
    CONSTRAINT "food_items_fat_per_100g_check" CHECK (("fat_per_100g" >= (0)::double precision)),
    CONSTRAINT "food_items_fiber_per_100g_check" CHECK (("fiber_per_100g" >= (0)::double precision)),
    CONSTRAINT "food_items_protein_per_100g_check" CHECK (("protein_per_100g" >= (0)::double precision)),
    CONSTRAINT "food_items_serving_size_g_check" CHECK (("serving_size_g" > (0)::double precision)),
    CONSTRAINT "food_items_source_check" CHECK (("source" = ANY (ARRAY['ausnut'::"text", 'usda'::"text", 'open_food_facts'::"text", 'custom'::"text"])))
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
    "total_calories" real,
    "protein_grams" real,
    "carbohydrate_grams" real,
    "fat_grams" real,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_public" boolean DEFAULT false NOT NULL,
    CONSTRAINT "nutrition_plans_carbohydrate_grams_check" CHECK (("carbohydrate_grams" >= (0)::double precision)),
    CONSTRAINT "nutrition_plans_fat_grams_check" CHECK (("fat_grams" >= (0)::double precision)),
    CONSTRAINT "nutrition_plans_protein_grams_check" CHECK (("protein_grams" >= (0)::double precision)),
    CONSTRAINT "nutrition_plans_total_calories_check" CHECK (("total_calories" >= (0)::double precision))
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
    "experience_level" "text",
    "training_time_of_day" "text",
    "nutrition_wakeup_time_of_day" "text",
    "nutrition_bed_time_of_day" "text",
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


CREATE TABLE IF NOT EXISTS "public"."supplement_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."supplement_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplement_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "athlete_supplement_id" "uuid" NOT NULL,
    "taken_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."supplement_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."supplements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "default_dosage" "text",
    "default_timing" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."supplements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unit_conversions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "from_unit" "text" NOT NULL,
    "to_unit" "text" NOT NULL,
    "food_category" "text",
    "conversion_factor" double precision NOT NULL
);


ALTER TABLE "public"."unit_conversions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."water_goals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "water_goal_ml" integer DEFAULT 2500 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."water_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."water_tracking" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "amount_ml" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."water_tracking" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL
);


ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."buckets_analytics" (
    "name" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."buckets_vectors" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'VECTOR'::"storage"."buckettype" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."buckets_vectors" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb",
    "level" integer
);


ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."prefixes" (
    "bucket_id" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "level" integer GENERATED ALWAYS AS ("storage"."get_level"("name")) STORED NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "storage"."prefixes" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb"
);


ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."vector_indexes" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "bucket_id" "text" NOT NULL,
    "data_type" "text" NOT NULL,
    "dimension" integer NOT NULL,
    "distance_metric" "text" NOT NULL,
    "metadata_configuration" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."vector_indexes" OWNER TO "supabase_storage_admin";


ALTER TABLE ONLY "auth"."refresh_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"auth"."refresh_tokens_id_seq"'::"regclass");



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "amr_id_pk" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."audit_log_entries"
    ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."flow_state"
    ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE ("provider_id", "provider");



ALTER TABLE ONLY "auth"."instances"
    ADD CONSTRAINT "instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE ("session_id", "authentication_method");



ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE ("last_challenged_at");



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_code_key" UNIQUE ("authorization_code");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_id_key" UNIQUE ("authorization_id");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_client_states"
    ADD CONSTRAINT "oauth_client_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_client_unique" UNIQUE ("user_id", "client_id");



ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE ("token");



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE ("entity_id");



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."sso_providers"
    ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assigned_plans"
    ADD CONSTRAINT "assigned_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_measurements"
    ADD CONSTRAINT "athlete_measurements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_measurements"
    ADD CONSTRAINT "athlete_measurements_user_id_measurement_date_key" UNIQUE ("user_id", "measurement_date");



ALTER TABLE ONLY "public"."athlete_supplements"
    ADD CONSTRAINT "athlete_supplements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."athlete_supplements"
    ADD CONSTRAINT "athlete_supplements_user_id_supplement_id_start_date_key" UNIQUE ("user_id", "supplement_id", "start_date");



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



ALTER TABLE ONLY "public"."exercise_feedback"
    ADD CONSTRAINT "exercise_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercise_instances"
    ADD CONSTRAINT "exercise_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercise_sets"
    ADD CONSTRAINT "exercise_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."extra_meal_food_items"
    ADD CONSTRAINT "extra_meal_food_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_item_images"
    ADD CONSTRAINT "food_item_images_pkey" PRIMARY KEY ("id");



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
    ADD CONSTRAINT "profiles_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_unique" UNIQUE ("user_id");



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



ALTER TABLE ONLY "public"."supplement_categories"
    ADD CONSTRAINT "supplement_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."supplement_categories"
    ADD CONSTRAINT "supplement_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplement_logs"
    ADD CONSTRAINT "supplement_logs_athlete_supplement_id_date_key" UNIQUE ("athlete_supplement_id", "date");



ALTER TABLE ONLY "public"."supplement_logs"
    ADD CONSTRAINT "supplement_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplements"
    ADD CONSTRAINT "supplements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_items"
    ADD CONSTRAINT "unique_source_source_id" UNIQUE ("source", "source_id");



ALTER TABLE ONLY "public"."unit_conversions"
    ADD CONSTRAINT "unit_conversions_from_unit_to_unit_food_category_key" UNIQUE ("from_unit", "to_unit", "food_category");



ALTER TABLE ONLY "public"."unit_conversions"
    ADD CONSTRAINT "unit_conversions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."water_goals"
    ADD CONSTRAINT "water_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."water_goals"
    ADD CONSTRAINT "water_goals_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."water_tracking"
    ADD CONSTRAINT "water_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."water_tracking"
    ADD CONSTRAINT "water_tracking_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."wellness_metrics"
    ADD CONSTRAINT "wellness_metrics_check_in_id_key" UNIQUE ("check_in_id");



ALTER TABLE ONLY "public"."wellness_metrics"
    ADD CONSTRAINT "wellness_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_vectors"
    ADD CONSTRAINT "buckets_vectors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_pkey" PRIMARY KEY ("bucket_id", "level", "name");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_pkey" PRIMARY KEY ("id");



CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries" USING "btree" ("instance_id");



CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users" USING "btree" ("confirmation_token") WHERE (("confirmation_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users" USING "btree" ("email_change_token_current") WHERE (("email_change_token_current")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users" USING "btree" ("email_change_token_new") WHERE (("email_change_token_new")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors" USING "btree" ("user_id", "created_at");



CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state" USING "btree" ("created_at" DESC);



CREATE INDEX "identities_email_idx" ON "auth"."identities" USING "btree" ("email" "text_pattern_ops");



COMMENT ON INDEX "auth"."identities_email_idx" IS 'Auth: Ensures indexed queries on the email column';



CREATE INDEX "identities_user_id_idx" ON "auth"."identities" USING "btree" ("user_id");



CREATE INDEX "idx_auth_code" ON "auth"."flow_state" USING "btree" ("auth_code");



CREATE INDEX "idx_oauth_client_states_created_at" ON "auth"."oauth_client_states" USING "btree" ("created_at");



CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state" USING "btree" ("user_id", "authentication_method");



CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "mfa_factors_user_friendly_name_unique" ON "auth"."mfa_factors" USING "btree" ("friendly_name", "user_id") WHERE (TRIM(BOTH FROM "friendly_name") <> ''::"text");



CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors" USING "btree" ("user_id");



CREATE INDEX "oauth_auth_pending_exp_idx" ON "auth"."oauth_authorizations" USING "btree" ("expires_at") WHERE ("status" = 'pending'::"auth"."oauth_authorization_status");



CREATE INDEX "oauth_clients_deleted_at_idx" ON "auth"."oauth_clients" USING "btree" ("deleted_at");



CREATE INDEX "oauth_consents_active_client_idx" ON "auth"."oauth_consents" USING "btree" ("client_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "oauth_consents_active_user_client_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "client_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "oauth_consents_user_order_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "granted_at" DESC);



CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("relates_to");



CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("token_hash");



CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens" USING "btree" ("user_id", "token_type");



CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users" USING "btree" ("reauthentication_token") WHERE (("reauthentication_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users" USING "btree" ("recovery_token") WHERE (("recovery_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id");



CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id", "user_id");



CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens" USING "btree" ("parent");



CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens" USING "btree" ("session_id", "revoked");



CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens" USING "btree" ("updated_at" DESC);



CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers" USING "btree" ("sso_provider_id");



CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states" USING "btree" ("created_at" DESC);



CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states" USING "btree" ("for_email");



CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states" USING "btree" ("sso_provider_id");



CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions" USING "btree" ("not_after" DESC);



CREATE INDEX "sessions_oauth_client_id_idx" ON "auth"."sessions" USING "btree" ("oauth_client_id");



CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "sso_domains_domain_idx" ON "auth"."sso_domains" USING "btree" ("lower"("domain"));



CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains" USING "btree" ("sso_provider_id");



CREATE UNIQUE INDEX "sso_providers_resource_id_idx" ON "auth"."sso_providers" USING "btree" ("lower"("resource_id"));



CREATE INDEX "sso_providers_resource_id_pattern_idx" ON "auth"."sso_providers" USING "btree" ("resource_id" "text_pattern_ops");



CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors" USING "btree" ("user_id", "phone");



CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions" USING "btree" ("user_id", "created_at");



CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users" USING "btree" ("email") WHERE ("is_sso_user" = false);



COMMENT ON INDEX "auth"."users_email_partial_key" IS 'Auth: A partial unique index that applies only when is_sso_user is false';



CREATE INDEX "users_instance_id_email_idx" ON "auth"."users" USING "btree" ("instance_id", "lower"(("email")::"text"));



CREATE INDEX "users_instance_id_idx" ON "auth"."users" USING "btree" ("instance_id");



CREATE INDEX "users_is_anonymous_idx" ON "auth"."users" USING "btree" ("is_anonymous");



CREATE INDEX "exercise_feedback_exercise_instance_id_idx" ON "public"."exercise_feedback" USING "btree" ("exercise_instance_id");



CREATE INDEX "exercise_feedback_workout_session_id_idx" ON "public"."exercise_feedback" USING "btree" ("workout_session_id");



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



CREATE INDEX "idx_food_items_barcode" ON "public"."food_items" USING "btree" ("barcode");



CREATE INDEX "idx_food_items_created_by" ON "public"."food_items" USING "btree" ("created_by");



CREATE INDEX "idx_food_items_nutrient_basis" ON "public"."food_items" USING "btree" ("nutrient_basis");



CREATE INDEX "idx_food_items_source" ON "public"."food_items" USING "btree" ("source");



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



CREATE INDEX "supplement_logs_athlete_supplement_idx" ON "public"."supplement_logs" USING "btree" ("athlete_supplement_id");



CREATE INDEX "supplement_logs_user_date_idx" ON "public"."supplement_logs" USING "btree" ("user_id", "date");



CREATE INDEX "water_goals_user_id_idx" ON "public"."water_goals" USING "btree" ("user_id");



CREATE INDEX "water_tracking_date_idx" ON "public"."water_tracking" USING "btree" ("date");



CREATE INDEX "water_tracking_user_id_idx" ON "public"."water_tracking" USING "btree" ("user_id");



CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");



CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");



CREATE UNIQUE INDEX "buckets_analytics_unique_name_idx" ON "storage"."buckets_analytics" USING "btree" ("name") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");



CREATE UNIQUE INDEX "idx_name_bucket_level_unique" ON "storage"."objects" USING "btree" ("name" COLLATE "C", "bucket_id", "level");



CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");



CREATE INDEX "idx_objects_lower_name" ON "storage"."objects" USING "btree" (("path_tokens"["level"]), "lower"("name") "text_pattern_ops", "bucket_id", "level");



CREATE INDEX "idx_prefixes_lower_name" ON "storage"."prefixes" USING "btree" ("bucket_id", "level", (("string_to_array"("name", '/'::"text"))["level"]), "lower"("name") "text_pattern_ops");



CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");



CREATE UNIQUE INDEX "objects_bucket_id_level_idx" ON "storage"."objects" USING "btree" ("bucket_id", "level", "name" COLLATE "C");



CREATE UNIQUE INDEX "vector_indexes_name_bucket_id_idx" ON "storage"."vector_indexes" USING "btree" ("name", "bucket_id");



CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



CREATE OR REPLACE TRIGGER "notify_athlete_nutrition_assigned" AFTER INSERT ON "public"."assigned_plans" FOR EACH ROW EXECUTE FUNCTION "public"."notify_athlete_nutrition_assigned"();



CREATE OR REPLACE TRIGGER "notify_athlete_program_nutrition_assigned" AFTER INSERT ON "public"."assigned_plans" FOR EACH ROW EXECUTE FUNCTION "public"."notify_athlete_program_assigned"();



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



CREATE OR REPLACE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();



CREATE OR REPLACE TRIGGER "objects_delete_delete_prefix" AFTER DELETE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "objects_insert_create_prefix" BEFORE INSERT ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."objects_insert_prefix_trigger"();



CREATE OR REPLACE TRIGGER "objects_update_create_prefix" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW WHEN ((("new"."name" <> "old"."name") OR ("new"."bucket_id" <> "old"."bucket_id"))) EXECUTE FUNCTION "storage"."objects_update_prefix_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_create_hierarchy" BEFORE INSERT ON "storage"."prefixes" FOR EACH ROW WHEN (("pg_trigger_depth"() < 1)) EXECUTE FUNCTION "storage"."prefixes_insert_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_delete_hierarchy" AFTER DELETE ON "storage"."prefixes" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."athlete_supplements"
    ADD CONSTRAINT "athlete_supplements_prescribed_by_fkey" FOREIGN KEY ("prescribed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."athlete_supplements"
    ADD CONSTRAINT "athlete_supplements_supplement_id_fkey" FOREIGN KEY ("supplement_id") REFERENCES "public"."supplements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."athlete_supplements"
    ADD CONSTRAINT "athlete_supplements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."exercise_feedback"
    ADD CONSTRAINT "exercise_feedback_exercise_instance_id_fkey" FOREIGN KEY ("exercise_instance_id") REFERENCES "public"."exercise_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_feedback"
    ADD CONSTRAINT "exercise_feedback_workout_session_id_fkey" FOREIGN KEY ("workout_session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."food_item_images"
    ADD CONSTRAINT "food_item_images_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."food_item_images"
    ADD CONSTRAINT "food_item_images_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."food_items"
    ADD CONSTRAINT "food_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



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



ALTER TABLE ONLY "public"."supplement_logs"
    ADD CONSTRAINT "supplement_logs_athlete_supplement_id_fkey" FOREIGN KEY ("athlete_supplement_id") REFERENCES "public"."athlete_supplements"("id");



ALTER TABLE ONLY "public"."supplement_logs"
    ADD CONSTRAINT "supplement_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."water_goals"
    ADD CONSTRAINT "water_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."water_tracking"
    ADD CONSTRAINT "water_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."wellness_metrics"
    ADD CONSTRAINT "wellness_metrics_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "public"."check_ins"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id");



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_program_template_id_fkey" FOREIGN KEY ("program_template_id") REFERENCES "public"."program_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets_vectors"("id");



ALTER TABLE "auth"."audit_log_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."flow_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_amr_claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_factors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."one_time_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."saml_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."saml_relay_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."schema_migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sso_domains" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sso_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admins can update all water goals" ON "public"."water_goals" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'coach'::"text")))));



CREATE POLICY "Admins can update all water tracking" ON "public"."water_tracking" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'coach'::"text")))));



CREATE POLICY "Admins can view all water goals" ON "public"."water_goals" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'coach'::"text")))));



CREATE POLICY "Admins can view all water tracking" ON "public"."water_tracking" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."user_id" = "auth"."uid"()) AND ("profiles"."role" = 'coach'::"text")))));



CREATE POLICY "All Permissions" ON "public"."exercises" USING (true);



CREATE POLICY "Allow authenticated users" ON "public"."profiles" TO "authenticated" USING (true);



CREATE POLICY "Allow individual user access" ON "public"."assigned_plans" TO "authenticated" USING (("auth"."uid"() = "athlete_id")) WITH CHECK (("auth"."uid"() = "athlete_id"));



CREATE POLICY "Allow individual user access" ON "public"."check_ins" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Athletes can add their own feedback" ON "public"."exercise_feedback" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions" "ws"
  WHERE (("ws"."id" = "exercise_feedback"."workout_session_id") AND ("ws"."user_id" = "auth"."uid"())))));



CREATE POLICY "Athletes can view their own feedback" ON "public"."exercise_feedback" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions" "ws"
  WHERE (("ws"."id" = "exercise_feedback"."workout_session_id") AND ("ws"."user_id" = "auth"."uid"())))));



CREATE POLICY "Coaches can view feedback from their athletes" ON "public"."exercise_feedback" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_sessions" "ws"
     JOIN "public"."profiles" "p" ON (("ws"."user_id" = "p"."user_id")))
  WHERE (("ws"."id" = "exercise_feedback"."workout_session_id") AND ("p"."coach_id" = "auth"."uid"())))));



CREATE POLICY "Users can add images to food items" ON "public"."food_item_images" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can create food items" ON "public"."food_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can delete their own device connections" ON "public"."device_connections" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own device connections" ON "public"."device_connections" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own water goal" ON "public"."water_goals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own water tracking" ON "public"."water_tracking" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own device connections" ON "public"."device_connections" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own custom food items" ON "public"."food_items" FOR UPDATE TO "authenticated" USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can update their own device connections" ON "public"."device_connections" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own food item images" ON "public"."food_item_images" FOR UPDATE TO "authenticated" USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "notifications"."recipient_id"))));



CREATE POLICY "Users can update their own water goal" ON "public"."water_goals" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own water tracking" ON "public"."water_tracking" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view all food items" ON "public"."food_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view food item images" ON "public"."food_item_images" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() IN ( SELECT "profiles"."user_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "notifications"."recipient_id"))));



CREATE POLICY "Users can view their own water goal" ON "public"."water_goals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own water tracking" ON "public"."water_tracking" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "athlete_manage_own_extra_meal_food_items" ON "public"."extra_meal_food_items" USING ((EXISTS ( SELECT 1
   FROM "public"."meal_logs" "ml"
  WHERE (("ml"."id" = "extra_meal_food_items"."meal_log_id") AND ("ml"."user_id" = "auth"."uid"())))));



CREATE POLICY "athlete_manage_own_meal_logs" ON "public"."meal_logs" TO "authenticated" USING (true);



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



CREATE POLICY "delete_own_workout_sessions" ON "public"."workout_sessions" FOR DELETE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."device_connections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_own_completed_sets" ON "public"."completed_exercise_sets" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions"
  WHERE (("workout_sessions"."id" = "completed_exercise_sets"."workout_session_id") AND ("workout_sessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "insert_own_workout_sessions" ON "public"."workout_sessions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read_athletes_completed_sets" ON "public"."completed_exercise_sets" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "read_athletes_workout_sessions" ON "public"."workout_sessions" FOR SELECT USING (true);



CREATE POLICY "read_own_completed_sets" ON "public"."completed_exercise_sets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions"
  WHERE (("workout_sessions"."id" = "completed_exercise_sets"."workout_session_id") AND ("workout_sessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "read_own_workout_sessions" ON "public"."workout_sessions" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "update_own_completed_sets" ON "public"."completed_exercise_sets" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions"
  WHERE (("workout_sessions"."id" = "completed_exercise_sets"."workout_session_id") AND ("workout_sessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "update_own_workout_sessions" ON "public"."workout_sessions" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users can read logs" ON "public"."meal_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Give users authenticated access to folder ljw090_0" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'progress-media'::"text") AND ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "Give users authenticated access to folder ljw090_1" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'progress-media'::"text") AND ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "Give users authenticated access to folder ljw090_2" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'progress-media'::"text") AND ("auth"."role"() = 'authenticated'::"text")));



CREATE POLICY "Give users authenticated access to folder ljw090_3" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'progress-media'::"text") AND ("auth"."role"() = 'authenticated'::"text")));



ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_vectors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."prefixes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."vector_indexes" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "auth" TO "anon";
GRANT USAGE ON SCHEMA "auth" TO "authenticated";
GRANT USAGE ON SCHEMA "auth" TO "service_role";
GRANT ALL ON SCHEMA "auth" TO "supabase_auth_admin";
GRANT ALL ON SCHEMA "auth" TO "dashboard_user";
GRANT USAGE ON SCHEMA "auth" TO "postgres";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "storage" TO "postgres" WITH GRANT OPTION;
GRANT USAGE ON SCHEMA "storage" TO "anon";
GRANT USAGE ON SCHEMA "storage" TO "authenticated";
GRANT USAGE ON SCHEMA "storage" TO "service_role";
GRANT ALL ON SCHEMA "storage" TO "supabase_storage_admin";
GRANT ALL ON SCHEMA "storage" TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."email"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."jwt"() TO "postgres";
GRANT ALL ON FUNCTION "auth"."jwt"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."role"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."uid"() TO "dashboard_user";



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



GRANT ALL ON TABLE "auth"."audit_log_entries" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."audit_log_entries" TO "postgres";
GRANT SELECT ON TABLE "auth"."audit_log_entries" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."flow_state" TO "postgres";
GRANT SELECT ON TABLE "auth"."flow_state" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."flow_state" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."identities" TO "postgres";
GRANT SELECT ON TABLE "auth"."identities" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."identities" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."instances" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."instances" TO "postgres";
GRANT SELECT ON TABLE "auth"."instances" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_amr_claims" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_amr_claims" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_amr_claims" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_challenges" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_challenges" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_challenges" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."mfa_factors" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_factors" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_factors" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_authorizations" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_authorizations" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_client_states" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_client_states" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_clients" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_clients" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_consents" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_consents" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."one_time_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."one_time_tokens" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."one_time_tokens" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."refresh_tokens" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."refresh_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."refresh_tokens" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "dashboard_user";
GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "postgres";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."saml_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_providers" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."saml_relay_states" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_relay_states" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_relay_states" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sessions" TO "postgres";
GRANT SELECT ON TABLE "auth"."sessions" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sessions" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sso_domains" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_domains" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_domains" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."sso_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_providers" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."users" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "auth"."users" TO "postgres";
GRANT SELECT ON TABLE "auth"."users" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "public"."assigned_plans" TO "anon";
GRANT ALL ON TABLE "public"."assigned_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."assigned_plans" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_measurements" TO "anon";
GRANT ALL ON TABLE "public"."athlete_measurements" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_measurements" TO "service_role";



GRANT ALL ON TABLE "public"."athlete_supplements" TO "anon";
GRANT ALL ON TABLE "public"."athlete_supplements" TO "authenticated";
GRANT ALL ON TABLE "public"."athlete_supplements" TO "service_role";



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



GRANT ALL ON TABLE "public"."exercise_feedback" TO "anon";
GRANT ALL ON TABLE "public"."exercise_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_feedback" TO "service_role";



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



GRANT ALL ON TABLE "public"."food_item_images" TO "anon";
GRANT ALL ON TABLE "public"."food_item_images" TO "authenticated";
GRANT ALL ON TABLE "public"."food_item_images" TO "service_role";



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



GRANT ALL ON TABLE "public"."supplement_categories" TO "anon";
GRANT ALL ON TABLE "public"."supplement_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."supplement_categories" TO "service_role";



GRANT ALL ON TABLE "public"."supplement_logs" TO "anon";
GRANT ALL ON TABLE "public"."supplement_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."supplement_logs" TO "service_role";



GRANT ALL ON TABLE "public"."supplements" TO "anon";
GRANT ALL ON TABLE "public"."supplements" TO "authenticated";
GRANT ALL ON TABLE "public"."supplements" TO "service_role";



GRANT ALL ON TABLE "public"."unit_conversions" TO "anon";
GRANT ALL ON TABLE "public"."unit_conversions" TO "authenticated";
GRANT ALL ON TABLE "public"."unit_conversions" TO "service_role";



GRANT ALL ON TABLE "public"."water_goals" TO "anon";
GRANT ALL ON TABLE "public"."water_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."water_goals" TO "service_role";



GRANT ALL ON TABLE "public"."water_tracking" TO "anon";
GRANT ALL ON TABLE "public"."water_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."water_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."wellness_metrics" TO "anon";
GRANT ALL ON TABLE "public"."wellness_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."wellness_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."workout_sessions" TO "anon";
GRANT ALL ON TABLE "public"."workout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."workouts" TO "anon";
GRANT ALL ON TABLE "public"."workouts" TO "authenticated";
GRANT ALL ON TABLE "public"."workouts" TO "service_role";



REVOKE ALL ON TABLE "storage"."buckets" FROM "supabase_storage_admin";
GRANT ALL ON TABLE "storage"."buckets" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."buckets" TO "anon";
GRANT ALL ON TABLE "storage"."buckets" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."buckets_analytics" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "anon";



GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "service_role";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "authenticated";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "anon";



REVOKE ALL ON TABLE "storage"."objects" FROM "supabase_storage_admin";
GRANT ALL ON TABLE "storage"."objects" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."objects" TO "anon";
GRANT ALL ON TABLE "storage"."objects" TO "authenticated";
GRANT ALL ON TABLE "storage"."objects" TO "service_role";
GRANT ALL ON TABLE "storage"."objects" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."prefixes" TO "service_role";
GRANT ALL ON TABLE "storage"."prefixes" TO "authenticated";
GRANT ALL ON TABLE "storage"."prefixes" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads_parts" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "anon";



GRANT SELECT ON TABLE "storage"."vector_indexes" TO "service_role";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "authenticated";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "anon";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES  TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS  TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES  TO "dashboard_user";



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






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS  TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES  TO "service_role";



RESET ALL;
