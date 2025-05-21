drop policy "read_athletes_completed_sets" on "public"."completed_exercise_sets";

drop policy "athlete_manage_own_meal_logs" on "public"."meal_logs";

drop policy "read_athletes_workout_sessions" on "public"."workout_sessions";

alter table "public"."body_metrics" drop constraint "body_metrics_arm_cm_check";

alter table "public"."body_metrics" drop constraint "body_metrics_thigh_cm_check";

alter table "public"."profiles" drop constraint "profiles_gender_check";

create table "public"."athlete_supplements" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "supplement_id" uuid not null,
    "prescribed_by" uuid not null,
    "dosage" text not null,
    "timing" text,
    "schedule" text not null,
    "notes" text,
    "start_date" date not null,
    "end_date" date,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


create table "public"."food_item_images" (
    "id" uuid not null default uuid_generate_v4(),
    "food_item_id" uuid not null,
    "image_url" text not null,
    "created_at" timestamp with time zone default now(),
    "created_by" uuid
);


alter table "public"."food_item_images" enable row level security;

create table "public"."supplement_categories" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "description" text,
    "created_at" timestamp with time zone default now()
);


create table "public"."supplements" (
    "id" uuid not null default uuid_generate_v4(),
    "name" text not null,
    "category" text not null,
    "default_dosage" text,
    "default_timing" text,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."body_metrics" drop column "arm_cm";

alter table "public"."body_metrics" drop column "thigh_cm";

alter table "public"."body_metrics" add column "left_arm_cm" double precision;

alter table "public"."body_metrics" add column "left_thigh_cm" double precision;

alter table "public"."body_metrics" add column "right_arm_cm" double precision;

alter table "public"."body_metrics" add column "right_thigh_cm" double precision;

alter table "public"."food_items" add column "barcode" text;

alter table "public"."food_items" add column "brand" text;

alter table "public"."food_items" add column "created_by" uuid;

alter table "public"."food_items" add column "is_verified" boolean default false;

alter table "public"."food_items" add column "source" text default 'ausnut'::text;

alter table "public"."food_items" add column "source_id" text;

CREATE UNIQUE INDEX athlete_supplements_pkey ON public.athlete_supplements USING btree (id);

CREATE UNIQUE INDEX athlete_supplements_user_id_supplement_id_start_date_key ON public.athlete_supplements USING btree (user_id, supplement_id, start_date);

CREATE UNIQUE INDEX food_item_images_pkey ON public.food_item_images USING btree (id);

CREATE INDEX idx_food_items_barcode ON public.food_items USING btree (barcode);

CREATE INDEX idx_food_items_created_by ON public.food_items USING btree (created_by);

CREATE INDEX idx_food_items_source ON public.food_items USING btree (source);

CREATE UNIQUE INDEX supplement_categories_name_key ON public.supplement_categories USING btree (name);

CREATE UNIQUE INDEX supplement_categories_pkey ON public.supplement_categories USING btree (id);

CREATE UNIQUE INDEX supplements_pkey ON public.supplements USING btree (id);

CREATE UNIQUE INDEX unique_source_source_id ON public.food_items USING btree (source, source_id);

alter table "public"."athlete_supplements" add constraint "athlete_supplements_pkey" PRIMARY KEY using index "athlete_supplements_pkey";

alter table "public"."food_item_images" add constraint "food_item_images_pkey" PRIMARY KEY using index "food_item_images_pkey";

alter table "public"."supplement_categories" add constraint "supplement_categories_pkey" PRIMARY KEY using index "supplement_categories_pkey";

alter table "public"."supplements" add constraint "supplements_pkey" PRIMARY KEY using index "supplements_pkey";

alter table "public"."athlete_supplements" add constraint "athlete_supplements_prescribed_by_fkey" FOREIGN KEY (prescribed_by) REFERENCES auth.users(id) not valid;

alter table "public"."athlete_supplements" validate constraint "athlete_supplements_prescribed_by_fkey";

alter table "public"."athlete_supplements" add constraint "athlete_supplements_supplement_id_fkey" FOREIGN KEY (supplement_id) REFERENCES supplements(id) ON DELETE CASCADE not valid;

alter table "public"."athlete_supplements" validate constraint "athlete_supplements_supplement_id_fkey";

alter table "public"."athlete_supplements" add constraint "athlete_supplements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."athlete_supplements" validate constraint "athlete_supplements_user_id_fkey";

alter table "public"."athlete_supplements" add constraint "athlete_supplements_user_id_supplement_id_start_date_key" UNIQUE using index "athlete_supplements_user_id_supplement_id_start_date_key";

alter table "public"."body_metrics" add constraint "body_metrics_left_arm_cm_check" CHECK ((left_arm_cm >= (0)::double precision)) not valid;

alter table "public"."body_metrics" validate constraint "body_metrics_left_arm_cm_check";

alter table "public"."body_metrics" add constraint "body_metrics_left_thigh_cm_check" CHECK ((left_thigh_cm >= (0)::double precision)) not valid;

alter table "public"."body_metrics" validate constraint "body_metrics_left_thigh_cm_check";

alter table "public"."body_metrics" add constraint "body_metrics_right_arm_cm_check" CHECK ((right_arm_cm >= (0)::double precision)) not valid;

alter table "public"."body_metrics" validate constraint "body_metrics_right_arm_cm_check";

alter table "public"."body_metrics" add constraint "body_metrics_right_thigh_cm_check" CHECK ((right_thigh_cm >= (0)::double precision)) not valid;

alter table "public"."body_metrics" validate constraint "body_metrics_right_thigh_cm_check";

alter table "public"."food_item_images" add constraint "food_item_images_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) not valid;

alter table "public"."food_item_images" validate constraint "food_item_images_created_by_fkey";

alter table "public"."food_item_images" add constraint "food_item_images_food_item_id_fkey" FOREIGN KEY (food_item_id) REFERENCES food_items(id) ON DELETE CASCADE not valid;

alter table "public"."food_item_images" validate constraint "food_item_images_food_item_id_fkey";

alter table "public"."food_items" add constraint "food_items_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) not valid;

alter table "public"."food_items" validate constraint "food_items_created_by_fkey";

alter table "public"."food_items" add constraint "food_items_source_check" CHECK ((source = ANY (ARRAY['ausnut'::text, 'usda'::text, 'open_food_facts'::text, 'custom'::text]))) not valid;

alter table "public"."food_items" validate constraint "food_items_source_check";

alter table "public"."food_items" add constraint "unique_source_source_id" UNIQUE using index "unique_source_source_id";

alter table "public"."supplement_categories" add constraint "supplement_categories_name_key" UNIQUE using index "supplement_categories_name_key";

alter table "public"."profiles" add constraint "profiles_gender_check" CHECK (((gender)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying])::text[]))) not valid;

alter table "public"."profiles" validate constraint "profiles_gender_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.notify_athlete_nutrition_assigned()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$BEGIN
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.notify_athlete_program_assigned()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$BEGIN
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
END;$function$
;

CREATE OR REPLACE FUNCTION public.notify_coach_steps_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$DECLARE
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
    END;$function$
;

CREATE OR REPLACE FUNCTION public.notify_coach_workout_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$DECLARE
athlete_user_id UUID;
athlete_id UUID;
coach_id_var UUID;
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
athlete_user_id := NEW.user_id;
-- Get coach ID and athlete name from profiles
SELECT profiles.id, profiles.coach_id, COALESCE(first_name || ' ' || last_name, email)
INTO athlete_id, coach_id_var, athlete_name
FROM public.profiles
WHERE user_id = athlete_user_id;
-- Only send notification if coach exists
IF coach_id_var IS NOT NULL THEN
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
END;$function$
;

grant delete on table "public"."athlete_supplements" to "anon";

grant insert on table "public"."athlete_supplements" to "anon";

grant references on table "public"."athlete_supplements" to "anon";

grant select on table "public"."athlete_supplements" to "anon";

grant trigger on table "public"."athlete_supplements" to "anon";

grant truncate on table "public"."athlete_supplements" to "anon";

grant update on table "public"."athlete_supplements" to "anon";

grant delete on table "public"."athlete_supplements" to "authenticated";

grant insert on table "public"."athlete_supplements" to "authenticated";

grant references on table "public"."athlete_supplements" to "authenticated";

grant select on table "public"."athlete_supplements" to "authenticated";

grant trigger on table "public"."athlete_supplements" to "authenticated";

grant truncate on table "public"."athlete_supplements" to "authenticated";

grant update on table "public"."athlete_supplements" to "authenticated";

grant delete on table "public"."athlete_supplements" to "service_role";

grant insert on table "public"."athlete_supplements" to "service_role";

grant references on table "public"."athlete_supplements" to "service_role";

grant select on table "public"."athlete_supplements" to "service_role";

grant trigger on table "public"."athlete_supplements" to "service_role";

grant truncate on table "public"."athlete_supplements" to "service_role";

grant update on table "public"."athlete_supplements" to "service_role";

grant delete on table "public"."food_item_images" to "anon";

grant insert on table "public"."food_item_images" to "anon";

grant references on table "public"."food_item_images" to "anon";

grant select on table "public"."food_item_images" to "anon";

grant trigger on table "public"."food_item_images" to "anon";

grant truncate on table "public"."food_item_images" to "anon";

grant update on table "public"."food_item_images" to "anon";

grant delete on table "public"."food_item_images" to "authenticated";

grant insert on table "public"."food_item_images" to "authenticated";

grant references on table "public"."food_item_images" to "authenticated";

grant select on table "public"."food_item_images" to "authenticated";

grant trigger on table "public"."food_item_images" to "authenticated";

grant truncate on table "public"."food_item_images" to "authenticated";

grant update on table "public"."food_item_images" to "authenticated";

grant delete on table "public"."food_item_images" to "service_role";

grant insert on table "public"."food_item_images" to "service_role";

grant references on table "public"."food_item_images" to "service_role";

grant select on table "public"."food_item_images" to "service_role";

grant trigger on table "public"."food_item_images" to "service_role";

grant truncate on table "public"."food_item_images" to "service_role";

grant update on table "public"."food_item_images" to "service_role";

grant delete on table "public"."supplement_categories" to "anon";

grant insert on table "public"."supplement_categories" to "anon";

grant references on table "public"."supplement_categories" to "anon";

grant select on table "public"."supplement_categories" to "anon";

grant trigger on table "public"."supplement_categories" to "anon";

grant truncate on table "public"."supplement_categories" to "anon";

grant update on table "public"."supplement_categories" to "anon";

grant delete on table "public"."supplement_categories" to "authenticated";

grant insert on table "public"."supplement_categories" to "authenticated";

grant references on table "public"."supplement_categories" to "authenticated";

grant select on table "public"."supplement_categories" to "authenticated";

grant trigger on table "public"."supplement_categories" to "authenticated";

grant truncate on table "public"."supplement_categories" to "authenticated";

grant update on table "public"."supplement_categories" to "authenticated";

grant delete on table "public"."supplement_categories" to "service_role";

grant insert on table "public"."supplement_categories" to "service_role";

grant references on table "public"."supplement_categories" to "service_role";

grant select on table "public"."supplement_categories" to "service_role";

grant trigger on table "public"."supplement_categories" to "service_role";

grant truncate on table "public"."supplement_categories" to "service_role";

grant update on table "public"."supplement_categories" to "service_role";

grant delete on table "public"."supplements" to "anon";

grant insert on table "public"."supplements" to "anon";

grant references on table "public"."supplements" to "anon";

grant select on table "public"."supplements" to "anon";

grant trigger on table "public"."supplements" to "anon";

grant truncate on table "public"."supplements" to "anon";

grant update on table "public"."supplements" to "anon";

grant delete on table "public"."supplements" to "authenticated";

grant insert on table "public"."supplements" to "authenticated";

grant references on table "public"."supplements" to "authenticated";

grant select on table "public"."supplements" to "authenticated";

grant trigger on table "public"."supplements" to "authenticated";

grant truncate on table "public"."supplements" to "authenticated";

grant update on table "public"."supplements" to "authenticated";

grant delete on table "public"."supplements" to "service_role";

grant insert on table "public"."supplements" to "service_role";

grant references on table "public"."supplements" to "service_role";

grant select on table "public"."supplements" to "service_role";

grant trigger on table "public"."supplements" to "service_role";

grant truncate on table "public"."supplements" to "service_role";

grant update on table "public"."supplements" to "service_role";

create policy "Users can add images to food items"
on "public"."food_item_images"
as permissive
for insert
to authenticated
with check (true);


create policy "Users can update their own food item images"
on "public"."food_item_images"
as permissive
for update
to authenticated
using ((created_by = auth.uid()));


create policy "Users can view food item images"
on "public"."food_item_images"
as permissive
for select
to authenticated
using (true);


create policy "Users can create food items"
on "public"."food_items"
as permissive
for insert
to authenticated
with check (true);


create policy "Users can update their own custom food items"
on "public"."food_items"
as permissive
for update
to authenticated
using ((created_by = auth.uid()));


create policy "Users can view all food items"
on "public"."food_items"
as permissive
for select
to authenticated
using (true);


create policy "users can read logs"
on "public"."meal_logs"
as permissive
for select
to authenticated
using (true);


create policy "read_athletes_completed_sets"
on "public"."completed_exercise_sets"
as permissive
for select
to authenticated
using (true);


create policy "athlete_manage_own_meal_logs"
on "public"."meal_logs"
as permissive
for all
to authenticated
using (true);


create policy "read_athletes_workout_sessions"
on "public"."workout_sessions"
as permissive
for select
to authenticated
using (true);


CREATE TRIGGER notify_athlete_nutrition_assigned AFTER INSERT ON public.assigned_plans FOR EACH ROW EXECUTE FUNCTION notify_athlete_nutrition_assigned();

CREATE TRIGGER notify_athlete_program_nutrition_assigned AFTER INSERT ON public.assigned_plans FOR EACH ROW EXECUTE FUNCTION notify_athlete_program_assigned();


