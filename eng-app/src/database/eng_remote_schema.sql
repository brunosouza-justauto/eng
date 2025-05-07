

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






CREATE TYPE "public"."exercise_group_type" AS ENUM (
    'none',
    'superset',
    'bi_set',
    'tri_set',
    'giant_set'
);


ALTER TYPE "public"."exercise_group_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Insert into public.profiles, linking to the new auth.users record
  INSERT INTO public.profiles (user_id, email, role, onboarding_complete)
  VALUES (
    NEW.id,             -- The user_id from auth.users
    NEW.email,          -- The email from auth.users
    'athlete',          -- Default role for new signups
    false               -- Require onboarding
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


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



CREATE TABLE IF NOT EXISTS "public"."exercise_instances" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "workout_id" "uuid" NOT NULL,
    "exercise_db_id" "text",
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
    CONSTRAINT "exercise_instances_order_in_workout_check" CHECK (("order_in_workout" >= 0)),
    CONSTRAINT "exercise_instances_rest_period_seconds_check" CHECK (("rest_period_seconds" >= 0))
);


ALTER TABLE "public"."exercise_instances" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."meals" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "nutrition_plan_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "time_suggestion" "text",
    "notes" "text",
    "order_in_plan" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "day_number" integer DEFAULT 1 NOT NULL,
    "day_type" "text",
    CONSTRAINT "meals_order_in_plan_check" CHECK (("order_in_plan" >= 0))
);


ALTER TABLE "public"."meals" OWNER TO "postgres";


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
    CONSTRAINT "profiles_gender_check" CHECK ((("gender")::"text" = ANY ((ARRAY['male'::character varying, 'female'::character varying])::"text"[])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."user_id" IS 'Can be NULL for pending invitations';



COMMENT ON COLUMN "public"."profiles"."role" IS 'Defines user capabilities, e.g., ''athlete'' or ''coach''.';



COMMENT ON COLUMN "public"."profiles"."coach_id" IS 'If role is ''athlete'', this optionally links to their coach''s profile id.';



COMMENT ON COLUMN "public"."profiles"."invitation_status" IS 'Status of the invitation: pending, accepted, expired';



COMMENT ON COLUMN "public"."profiles"."invited_at" IS 'When the invitation was sent';



CREATE TABLE IF NOT EXISTS "public"."program_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "phase" "text",
    "weeks" integer NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "program_templates_weeks_check" CHECK (("weeks" > 0))
);


ALTER TABLE "public"."program_templates" OWNER TO "postgres";


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



ALTER TABLE ONLY "public"."body_metrics"
    ADD CONSTRAINT "body_metrics_check_in_id_key" UNIQUE ("check_in_id");



ALTER TABLE ONLY "public"."body_metrics"
    ADD CONSTRAINT "body_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercise_instances"
    ADD CONSTRAINT "exercise_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercise_sets"
    ADD CONSTRAINT "exercise_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."food_items"
    ADD CONSTRAINT "food_items_afcd_id_key" UNIQUE ("afcd_id");



ALTER TABLE ONLY "public"."food_items"
    ADD CONSTRAINT "food_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_food_items"
    ADD CONSTRAINT "meal_food_items_meal_id_food_item_id_key" UNIQUE ("meal_id", "food_item_id");



ALTER TABLE ONLY "public"."meal_food_items"
    ADD CONSTRAINT "meal_food_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meals"
    ADD CONSTRAINT "meals_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_assigned_plans_athlete_created" ON "public"."assigned_plans" USING "btree" ("athlete_id", "created_at" DESC);



CREATE INDEX "idx_assigned_plans_nutrition_plan_id" ON "public"."assigned_plans" USING "btree" ("nutrition_plan_id");



CREATE INDEX "idx_assigned_plans_program_template_id" ON "public"."assigned_plans" USING "btree" ("program_template_id");



CREATE INDEX "idx_assigned_plans_user_id" ON "public"."assigned_plans" USING "btree" ("athlete_id");



CREATE INDEX "idx_body_metrics_check_in_id" ON "public"."body_metrics" USING "btree" ("check_in_id");



CREATE INDEX "idx_check_ins_user_id" ON "public"."check_ins" USING "btree" ("user_id");



CREATE INDEX "idx_exercise_instances_group_id" ON "public"."exercise_instances" USING "btree" ("group_id");



CREATE INDEX "idx_exercise_instances_workout_id" ON "public"."exercise_instances" USING "btree" ("workout_id");



CREATE INDEX "idx_exercise_sets_exercise_instance_id" ON "public"."exercise_sets" USING "btree" ("exercise_instance_id");



CREATE INDEX "idx_exercise_sets_order" ON "public"."exercise_sets" USING "btree" ("set_order");



CREATE INDEX "idx_food_items_afcd_id" ON "public"."food_items" USING "btree" ("afcd_id");



CREATE INDEX "idx_food_items_nutrient_basis" ON "public"."food_items" USING "btree" ("nutrient_basis");



CREATE INDEX "idx_meal_food_items_food_item_id" ON "public"."meal_food_items" USING "btree" ("food_item_id");



CREATE INDEX "idx_meal_food_items_meal_id" ON "public"."meal_food_items" USING "btree" ("meal_id");



CREATE INDEX "idx_meal_food_items_recipe_id" ON "public"."meal_food_items" USING "btree" ("recipe_id");



CREATE INDEX "idx_meal_food_items_source_recipe_id" ON "public"."meal_food_items" USING "btree" ("source_recipe_id");



CREATE INDEX "idx_meals_day_number" ON "public"."meals" USING "btree" ("nutrition_plan_id", "day_number");



CREATE INDEX "idx_meals_nutrition_plan_id" ON "public"."meals" USING "btree" ("nutrition_plan_id");



CREATE INDEX "idx_nutrition_plans_coach_id" ON "public"."nutrition_plans" USING "btree" ("coach_id");



CREATE INDEX "idx_profiles_coach_id" ON "public"."profiles" USING "btree" ("coach_id");



CREATE INDEX "idx_profiles_invitation_status" ON "public"."profiles" USING "btree" ("invitation_status");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_profiles_user_id" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "idx_program_templates_coach_id" ON "public"."program_templates" USING "btree" ("coach_id");



CREATE INDEX "idx_recipe_ingredients_recipe_id" ON "public"."recipe_ingredients" USING "btree" ("recipe_id");



CREATE INDEX "idx_recipes_coach_id" ON "public"."recipes" USING "btree" ("coach_id");



CREATE INDEX "idx_step_goals_user_id" ON "public"."step_goals" USING "btree" ("user_id");



CREATE INDEX "idx_wellness_metrics_check_in_id" ON "public"."wellness_metrics" USING "btree" ("check_in_id");



CREATE INDEX "idx_workouts_program_template_id" ON "public"."workouts" USING "btree" ("program_template_id");



CREATE OR REPLACE TRIGGER "set_assigned_plans_timestamp" BEFORE UPDATE ON "public"."assigned_plans" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_body_metrics_timestamp" BEFORE UPDATE ON "public"."body_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_check_ins_timestamp" BEFORE UPDATE ON "public"."check_ins" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_exercise_instances_timestamp" BEFORE UPDATE ON "public"."exercise_instances" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_food_items_timestamp" BEFORE UPDATE ON "public"."food_items" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_meals_timestamp" BEFORE UPDATE ON "public"."meals" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_nutrition_plans_timestamp" BEFORE UPDATE ON "public"."nutrition_plans" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_profiles_timestamp" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_program_templates_timestamp" BEFORE UPDATE ON "public"."program_templates" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_step_goals_timestamp" BEFORE UPDATE ON "public"."step_goals" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_wellness_metrics_timestamp" BEFORE UPDATE ON "public"."wellness_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_workouts_timestamp" BEFORE UPDATE ON "public"."workouts" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "update_exercise_sets_modtime" BEFORE UPDATE ON "public"."exercise_sets" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



ALTER TABLE ONLY "public"."assigned_plans"
    ADD CONSTRAINT "assigned_plans_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."assigned_plans"
    ADD CONSTRAINT "assigned_plans_nutrition_plan_id_fkey" FOREIGN KEY ("nutrition_plan_id") REFERENCES "public"."nutrition_plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assigned_plans"
    ADD CONSTRAINT "assigned_plans_program_template_id_fkey" FOREIGN KEY ("program_template_id") REFERENCES "public"."program_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assigned_plans"
    ADD CONSTRAINT "assigned_plans_user_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."body_metrics"
    ADD CONSTRAINT "body_metrics_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "public"."check_ins"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."check_ins"
    ADD CONSTRAINT "check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_instances"
    ADD CONSTRAINT "exercise_instances_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_sets"
    ADD CONSTRAINT "exercise_sets_exercise_instance_id_fkey" FOREIGN KEY ("exercise_instance_id") REFERENCES "public"."exercise_instances"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_food_items"
    ADD CONSTRAINT "meal_food_items_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_food_items"
    ADD CONSTRAINT "meal_food_items_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_food_items"
    ADD CONSTRAINT "meal_food_items_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meal_food_items"
    ADD CONSTRAINT "meal_food_items_source_recipe_id_fkey" FOREIGN KEY ("source_recipe_id") REFERENCES "public"."recipes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meals"
    ADD CONSTRAINT "meals_nutrition_plan_id_fkey" FOREIGN KEY ("nutrition_plan_id") REFERENCES "public"."nutrition_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."nutrition_plans"
    ADD CONSTRAINT "nutrition_plans_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_templates"
    ADD CONSTRAINT "program_templates_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_ingredients"
    ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."step_goals"
    ADD CONSTRAINT "step_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wellness_metrics"
    ADD CONSTRAINT "wellness_metrics_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "public"."check_ins"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_program_template_id_fkey" FOREIGN KEY ("program_template_id") REFERENCES "public"."program_templates"("id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated users" ON "public"."profiles" TO "authenticated" USING (true);



CREATE POLICY "Allow individual user access" ON "public"."assigned_plans" TO "authenticated" USING (("auth"."uid"() = "athlete_id")) WITH CHECK (("auth"."uid"() = "athlete_id"));



CREATE POLICY "Allow individual user access" ON "public"."check_ins" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."assigned_plans" TO "anon";
GRANT ALL ON TABLE "public"."assigned_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."assigned_plans" TO "service_role";



GRANT ALL ON TABLE "public"."body_metrics" TO "anon";
GRANT ALL ON TABLE "public"."body_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."body_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."check_ins" TO "anon";
GRANT ALL ON TABLE "public"."check_ins" TO "authenticated";
GRANT ALL ON TABLE "public"."check_ins" TO "service_role";



GRANT ALL ON TABLE "public"."exercise_instances" TO "anon";
GRANT ALL ON TABLE "public"."exercise_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_instances" TO "service_role";



GRANT ALL ON TABLE "public"."exercise_sets" TO "anon";
GRANT ALL ON TABLE "public"."exercise_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_sets" TO "service_role";



GRANT ALL ON TABLE "public"."food_items" TO "anon";
GRANT ALL ON TABLE "public"."food_items" TO "authenticated";
GRANT ALL ON TABLE "public"."food_items" TO "service_role";



GRANT ALL ON TABLE "public"."meal_food_items" TO "anon";
GRANT ALL ON TABLE "public"."meal_food_items" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_food_items" TO "service_role";



GRANT ALL ON TABLE "public"."meals" TO "anon";
GRANT ALL ON TABLE "public"."meals" TO "authenticated";
GRANT ALL ON TABLE "public"."meals" TO "service_role";



GRANT ALL ON TABLE "public"."nutrition_plans" TO "anon";
GRANT ALL ON TABLE "public"."nutrition_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."nutrition_plans" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."program_templates" TO "anon";
GRANT ALL ON TABLE "public"."program_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."program_templates" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_ingredients" TO "anon";
GRANT ALL ON TABLE "public"."recipe_ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_ingredients" TO "service_role";



GRANT ALL ON TABLE "public"."recipes" TO "anon";
GRANT ALL ON TABLE "public"."recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."recipes" TO "service_role";



GRANT ALL ON TABLE "public"."step_goals" TO "anon";
GRANT ALL ON TABLE "public"."step_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."step_goals" TO "service_role";



GRANT ALL ON TABLE "public"."unit_conversions" TO "anon";
GRANT ALL ON TABLE "public"."unit_conversions" TO "authenticated";
GRANT ALL ON TABLE "public"."unit_conversions" TO "service_role";



GRANT ALL ON TABLE "public"."wellness_metrics" TO "anon";
GRANT ALL ON TABLE "public"."wellness_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."wellness_metrics" TO "service_role";



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
