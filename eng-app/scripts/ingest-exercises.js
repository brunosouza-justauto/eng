import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// --- Calculate __dirname equivalent in ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --- End __dirname calculation ---

// Load environment variables from .env file in the parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// --- Configuration ---
const HEYGAINZ_API_URL = 'https://svc.heygainz.com/api';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Add this to your .env file

// Check if Supabase credentials are set
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error(
        'Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in the .env file.'
    );
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- API Response Types ---
/**
 * @typedef {Object} HeyGainzMuscle
 * @property {number} id
 * @property {string} body_part
 * @property {string} name
 * @property {string|null} region
 * @property {string} slug
 * @property {string} created_at
 * @property {string} updated_at
 * @property {Object} [pivot]
 * @property {number} [pivot.exercise_id]
 * @property {number} [pivot.muscle_id]
 * @property {'primary'|'synergist'} [pivot.type]
 */

/**
 * @typedef {Object} HeyGainzExercise
 * @property {number} id
 * @property {string} name
 * @property {string} slug
 * @property {string} description
 * @property {string} seo_description
 * @property {string} type
 * @property {string|null} youtube_link
 * @property {string} gif_url
 * @property {string[]} instructions
 * @property {string[]} tips
 * @property {string|null} note
 * @property {number|null} user_id
 * @property {number} post_id
 * @property {HeyGainzMuscle[]} muscles
 */

/**
 * @typedef {Object} HeyGainzPaginatedResponse
 * @property {number} current_page
 * @property {HeyGainzExercise[]} data
 * @property {string} first_page_url
 * @property {number} from
 * @property {number} last_page
 * @property {string} last_page_url
 * @property {Array<{url: string|null, label: string, active: boolean}>} links
 * @property {string|null} next_page_url
 * @property {string} path
 * @property {number} per_page
 * @property {string|null} prev_page_url
 * @property {number} to
 * @property {number} total
 */

// --- Helper Functions ---
/**
 * Cleans exercise names by removing text within parentheses and extra whitespace
 * @param {string} name - The exercise name to clean
 * @returns {string} - The cleaned exercise name
 */
const cleanExerciseName = (name) => {
    if (!name) return name;
    
    // Remove text within parentheses and trim excess whitespace
    return name.replace(/\s*\([^)]*\)\s*/g, ' ')  // Remove anything between parentheses
              .replace(/\s+/g, ' ')               // Replace multiple spaces with a single space
              .trim();                            // Remove leading/trailing whitespace
};

// Flag to track if original_name column exists
let hasOriginalNameColumn = true;

/**
 * Prepares exercise data for database storage
 * @param {HeyGainzExercise} exercise - The exercise from HeyGainz API
 * @returns {Object} - Formatted exercise data for database
 */
const prepareExerciseData = (exercise) => {
    // Extract primary muscle groups
    const primaryMuscles = exercise.muscles
        .filter(m => m.pivot?.type === 'primary')
        .map(m => m.name);

    // Extract secondary muscle groups
    const secondaryMuscles = exercise.muscles
        .filter(m => m.pivot?.type === 'synergist')
        .map(m => m.name);

    // Clean the exercise name to remove parenthetical content
    const cleanedName = cleanExerciseName(exercise.name);
    
    // Ensure instructions and tips are valid arrays
    const safeInstructions = Array.isArray(exercise.instructions) ? exercise.instructions : [];
    const safeTips = Array.isArray(exercise.tips) ? exercise.tips : [];
    
    // Try to parse extra information from the description field if it contains JSON
    let bodyPart = null;
    let equipment = null;
    let gender = null;
    let target = null;

    if (exercise.description) {
        try {
            // Handle different formats of the JSON data
            let descriptionData = null;
            const desc = exercise.description.trim();
            
            // Case 1: Description is a direct JSON string
            if (desc.startsWith('{') && desc.endsWith('}')) {
                try {
                    descriptionData = JSON.parse(desc);
                } catch (e) {
                    console.log(`Failed to parse direct JSON for exercise id ${exercise.id}. Trying format detection.`);
                }
            }
            
            // Case 2: JSON data might be in a format like "{\"key\": \"value\"}"
            if (!descriptionData && desc.includes('\\')) {
                try {
                    // Handle escaped JSON (sometimes from database exports)
                    const unescaped = desc.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                    if (unescaped.startsWith('{') && unescaped.endsWith('}')) {
                        descriptionData = JSON.parse(unescaped);
                    }
                } catch (e) {
                    console.log(`Failed to parse escaped JSON for exercise id ${exercise.id}`);
                }
            }
            
            // Case 3: Try to find JSON-like content within the description
            if (!descriptionData) {
                const jsonMatch = desc.match(/{[^}]+}/);
                if (jsonMatch) {
                    try {
                        descriptionData = JSON.parse(jsonMatch[0]);
                    } catch (e) {
                        console.log(`Failed to extract embedded JSON for exercise id ${exercise.id}`);
                    }
                }
            }
            
            // Extract data if we found valid JSON
            if (descriptionData) {
                // Extract the data if available
                bodyPart = descriptionData.body_part || null;
                equipment = descriptionData.equipment || null;
                gender = descriptionData.gender || null;
                target = descriptionData.target || null;
                
                console.log(`Extracted from JSON for ${exercise.name}: body_part=${bodyPart}, equipment=${equipment}, gender=${gender}, target=${target}`);
            } else {
                // No valid JSON found, log this for debugging
                console.log(`No JSON found in description for exercise id ${exercise.id}: ${desc.substring(0, 50)}...`);
            }
        } catch (e) {
            console.log(`Failed to parse description for exercise id ${exercise.id}: ${e.message}`);
        }
    }
    
    // Format data for the database
    const exerciseData = {
        id: exercise.id,
        name: cleanedName,
        description: exercise.seo_description || exercise.description,
        slug: exercise.slug,
        primary_muscle_group: primaryMuscles.length > 0 ? primaryMuscles[0] : null,
        secondary_muscle_groups: secondaryMuscles.length > 0 ? secondaryMuscles : [],
        gif_url: exercise.gif_url,
        youtube_link: exercise.youtube_link,
        instructions: safeInstructions,
        tips: safeTips,
        note: exercise.note,
        type: exercise.type,
        updated_at: new Date().toISOString(),
        // Add the new fields extracted from the description
        body_part: bodyPart,
        equipment: equipment,
        gender: gender,
        target: target
    };
    
    // Only include original_name if the column exists in the database
    if (hasOriginalNameColumn) {
        exerciseData.original_name = exercise.name;
    }
    
    return exerciseData;
};

/**
 * Fetches all exercises from HeyGainz API
 * @param {number} limit - Optional limit for number of exercises to fetch
 * @returns {Promise<HeyGainzExercise[]>} A promise that resolves to an array of exercises
 */
const fetchAllExercises = async (limit = 0) => {
    console.log(`Fetching exercises from HeyGainz API${limit > 0 ? ` (limited to ${limit})` : ''}...`);
    let allExercises = [];
    let page = 1;
    const perPage = 100; // Fetch in batches of 100
    let hasMore = true;

    try {
        while (hasMore) {
            const response = await axios.get(
                `${HEYGAINZ_API_URL}/exercises`,
                {
                    params: {
                        page,
                        per_page: perPage
                    }
                }
            );

            // Add new exercises to our collection
            const newExercises = response.data.data || [];
            
            if (limit > 0) {
                // Only add enough exercises to reach the limit
                const remaining = limit - allExercises.length;
                if (remaining <= 0) {
                    // We've already reached the limit, so stop fetching
                    break;
                }
                
                // Take only what we need
                const exercisesToAdd = newExercises.slice(0, remaining);
                allExercises = [...allExercises, ...exercisesToAdd];
                
                // If we've reached the limit after adding these, stop fetching
                if (allExercises.length >= limit) {
                    break;
                }
            } else {
                // No limit, add all exercises
                allExercises = [...allExercises, ...newExercises];
            }
            
            // Check if there's more data to fetch
            hasMore = response.data.next_page_url !== null;
            page++;
            
            console.log(`Fetched ${allExercises.length} ${limit > 0 ? `/ ${limit} (limited)` : `/ ${response.data.total}`} exercises...`);
        }

        return allExercises;

    } catch (error) {
        console.error('Failed to fetch exercises:', error);
        throw error;
    }
};

/**
 * Upserts exercises into the database in batches
 * @param {Array} exercises - Array of exercise data to upsert
 */
const upsertExercisesToDatabase = async (exercises) => {
    const batchSize = 100;
    let processedCount = 0;
    let successCount = 0;

    try {
        // Log a sample of the first exercise for debugging
        if (exercises.length > 0) {
            const sampleExercise = exercises[0];
            const formattedSample = prepareExerciseData(sampleExercise);
            console.log('\nSample exercise data for verification:');
            console.log(JSON.stringify(formattedSample, null, 2));
            console.log('\n');
        }
        
        // Process in batches for better performance
        for (let i = 0; i < exercises.length; i += batchSize) {
            const batch = exercises.slice(i, i + batchSize);
            const formattedBatch = batch.map(prepareExerciseData);
            
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(exercises.length / batchSize)} (${batch.length} exercises)...`);
            
            // Use upsert for cleaner handling of duplicates
            const { data, error } = await supabase
                .from('exercises')
                .upsert(formattedBatch, {
                    onConflict: 'id', // Assuming 'id' is the primary key
                    returning: 'minimal' // Don't need the data back
                });

            if (error) {
                console.error('Error upserting batch:', error);
                
                // Check if the error is related to the original_name column
                if (error.message && error.message.includes('original_name')) {
                    console.log('Detected missing original_name column. Trying without it...');
                    hasOriginalNameColumn = false;
                    
                    // Retry the batch without original_name
                    const reformattedBatch = batch.map(prepareExerciseData);
                    
                    const { data: retryData, error: retryError } = await supabase
                        .from('exercises')
                        .upsert(reformattedBatch, {
                            onConflict: 'id',
                            returning: 'minimal'
                        });
                        
                    if (retryError) {
                        console.error('Error on retry without original_name:', retryError);
                    } else {
                        successCount += batch.length;
                        console.log(`Successfully upserted batch on retry (${successCount}/${exercises.length})`);
                    }
                }
                // Continue with next batch even if this one fails
            } else {
                successCount += batch.length;
                console.log(`Successfully upserted batch (${successCount}/${exercises.length})`);
            }
            
            processedCount += batch.length;
        }

        console.log(`Exercise ingestion complete. Successfully processed ${successCount}/${processedCount} exercises.`);
        return successCount;
    } catch (err) {
        console.error('Error during database upsert:', err);
        throw err;
    }
};

/**
 * Creates a stored procedure to create the exercises table if it doesn't exist
 */
const createStoredProcedure = async () => {
    const { data, error } = await supabase.rpc('create_exercises_table', {});
    
    if (error) {
        console.error('Error creating stored procedure:', error);
        
        // Create the procedure manually if it doesn't exist
        console.log('Attempting to create stored procedure manually...');
        const procedureSQL = `
            CREATE OR REPLACE FUNCTION create_exercises_table()
            RETURNS void
            LANGUAGE plpgsql
            AS $$
            BEGIN
                IF NOT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'exercises'
                ) THEN
                    CREATE TABLE public.exercises (
                        id integer PRIMARY KEY,
                        name text NOT NULL,
                        original_name text,
                        description text,
                        slug text,
                        primary_muscle_group text,
                        secondary_muscle_groups text[],
                        gif_url text,
                        youtube_link text,
                        instructions text[],
                        tips text[],
                        note text,
                        type text,
                        body_part text,
                        equipment text,
                        gender text,
                        target text,
                        created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
                        updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
                    );

                    -- Add comment to table
                    COMMENT ON TABLE public.exercises IS 'Table containing exercise information from HeyGainz API';
                    
                    -- Create index on primary_muscle_group for faster queries
                    CREATE INDEX IF NOT EXISTS exercises_primary_muscle_idx ON public.exercises (primary_muscle_group);
                    
                    -- Set up permissions
                    ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
                    GRANT ALL ON public.exercises TO service_role;
                    GRANT SELECT ON public.exercises TO authenticated;
                    
                    -- Add policy to allow reading
                    CREATE POLICY "Allow users to read exercises"
                    ON public.exercises FOR SELECT
                    TO authenticated
                    USING (true);
                    
                    RAISE NOTICE 'Created exercises table';
                ELSE
                    RAISE NOTICE 'Exercises table already exists';
                END IF;
            END;
            $$;
        `;

        const { error: procError } = await supabase.rpc('exec_sql', { sql: procedureSQL });
        
        if (procError) {
            console.error('Failed to create stored procedure manually:', procError);
            throw procError;
        } else {
            console.log('Successfully created stored procedure');
            
            // Call the procedure to create the table
            const { error: callError } = await supabase.rpc('create_exercises_table');
            
            if (callError) {
                console.error('Failed to create exercises table:', callError);
                throw callError;
            } else {
                console.log('Successfully created exercises table or confirmed it exists');
            }
        }
    } else {
        console.log('Successfully created or confirmed exercises table');
    }
};

/**
 * Checks if the exercises table exists and creates it if needed
 */
const ensureExercisesTableExists = async () => {
    try {
        // First, check if the table exists
        const { error } = await supabase.from('exercises').select('count').limit(1);
        
        // If there's no table, we need to create it
        if (error && (error.code === '42P01' || error.message.includes('relation "exercises" does not exist'))) {
            console.log('Exercises table does not exist. Creating...');
            
            try {
                // Create the exercises table using the stored procedure
                await createStoredProcedure();
            } catch (procError) {
                // If procedure creation fails, print instructions for manual table creation
                console.error('Failed to create table programmatically:', procError);
                console.log('\n-------------------------------------------------------');
                console.log('PLEASE CREATE THE TABLE MANUALLY IN SUPABASE SQL EDITOR:');
                console.log('-------------------------------------------------------');
                console.log(`
CREATE TABLE IF NOT EXISTS public.exercises (
    id integer PRIMARY KEY,
    name text NOT NULL,
    original_name text,
    description text,
    slug text,
    primary_muscle_group text,
    secondary_muscle_groups text[],
    gif_url text,
    youtube_link text,
    instructions text[],
    tips text[],
    note text,
    type text,
    body_part text,
    equipment text,
    gender text,
    target text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Add comment to table
COMMENT ON TABLE public.exercises IS 'Table containing exercise information from HeyGainz API';

-- Create index on primary_muscle_group for faster queries
CREATE INDEX IF NOT EXISTS exercises_primary_muscle_idx ON public.exercises (primary_muscle_group);

-- Set up permissions
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.exercises TO service_role;
GRANT SELECT ON public.exercises TO authenticated;

-- Add policy to allow reading
CREATE POLICY "Allow users to read exercises"
ON public.exercises FOR SELECT
TO authenticated
USING (true);
                `);
                console.log('-------------------------------------------------------');
                throw new Error('Please create the table manually and try again.');
            }
            
            // Check that the table was created
            const { error: checkError } = await supabase.from('exercises').select('count').limit(1);
            if (checkError) {
                console.error('Failed to create exercises table:', checkError);
                throw checkError;
            }
            
            console.log('Successfully created exercises table');
        } else if (error) {
            console.error('Error checking exercises table:', error);
            throw error;
        } else {
            console.log('Exercises table already exists');
            
            // Check and add columns if they don't exist
            try {
                // List of columns to check and add if needed
                const columnsToCheck = [
                    'original_name',
                    'body_part',
                    'equipment',
                    'gender',
                    'target'
                ];
                
                for (const columnName of columnsToCheck) {
                    try {
                        // Try to select the column to see if it exists
                        const { error: columnError } = await supabase
                            .from('exercises')
                            .select(columnName)
                            .limit(1);
                        
                        if (columnError && columnError.message.includes(`column "${columnName}" does not exist`)) {
                            console.log(`Adding ${columnName} column to exercises table...`);
                            
                            try {
                                // Add the column if it doesn't exist
                                const alterSQL = `
                                    ALTER TABLE public.exercises 
                                    ADD COLUMN IF NOT EXISTS ${columnName} text;
                                `;
                                
                                const { error: alterError } = await supabase.rpc('exec_sql', { sql: alterSQL });
                                
                                if (alterError) {
                                    console.error(`Failed to add ${columnName} column programmatically:`, alterError);
                                    console.log('\n-------------------------------------------------------');
                                    console.log(`PLEASE ADD THE ${columnName.toUpperCase()} COLUMN MANUALLY IN SUPABASE SQL EDITOR:`);
                                    console.log('-------------------------------------------------------');
                                    console.log(`
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS ${columnName} text;
                                    `);
                                    console.log('-------------------------------------------------------');
                                } else {
                                    console.log(`Successfully added ${columnName} column`);
                                }
                            } catch (alterErr) {
                                console.error(`Error adding ${columnName} column:`, alterErr);
                                // Continue to the next column
                            }
                        }
                    } catch (columnErr) {
                        console.error(`Error checking ${columnName} column:`, columnErr);
                        // Continue to next column
                    }
                }
                
                // Set hasOriginalNameColumn based on check result
                try {
                    const { error: testOriginalName } = await supabase
                        .from('exercises')
                        .select('original_name')
                        .limit(1);
                    
                    hasOriginalNameColumn = !testOriginalName || !testOriginalName.message.includes('column "original_name" does not exist');
                    console.log(`original_name column exists: ${hasOriginalNameColumn}`);
                } catch (err) {
                    console.error('Error testing for original_name column:', err);
                    // Default to true and let the upsert handle any issues
                    hasOriginalNameColumn = true;
                }
                
            } catch (err) {
                console.error('Error checking/adding columns:', err);
                console.log('Continuing with existing table structure...');
            }
        }
    } catch (err) {
        console.error('Error in ensureExercisesTableExists:', err);
        throw err;
    }
};

/**
 * Main function to run the script
 * @param {number} limit - Optional limit for number of exercises to process
 */
const main = async (limit = 0) => {
    try {
        // Ensure the table exists
        try {
            await ensureExercisesTableExists();
        } catch (err) {
            console.error('Error ensuring exercises table exists:', err);
            // Continue execution even if table creation fails, as the table might exist already
        }
        
        // Fetch all exercises from the API
        const exercises = await fetchAllExercises(limit);
        console.log(`Retrieved ${exercises.length} exercises from HeyGainz API`);
        
        // Limit exercises if requested
        const exercisesToProcess = limit > 0 ? exercises.slice(0, limit) : exercises;
        console.log(`Processing ${exercisesToProcess.length} exercises${limit > 0 ? ' (limited for testing)' : ''}`);
        
        // Store exercises in the database
        const successCount = await upsertExercisesToDatabase(exercisesToProcess);
        console.log(`Successfully imported ${successCount} exercises into the database`);
        
        // Instructions for updating your application
        console.log('\n--- Next Steps ---');
        console.log('1. The exercise data is now stored in your Supabase database');
        console.log('2. Update your code to use primary_muscle_group and secondary_muscle_groups fields from the exercises table');
        console.log('3. Join exercise_instances with exercises on exercise_db_id = id to get muscle data');
        console.log('\nExample query:');
        console.log(`
SELECT ei.*, e.primary_muscle_group, e.secondary_muscle_groups
FROM exercise_instances ei
JOIN exercises e ON ei.exercise_db_id = e.id::text
WHERE ei.workout_id = 'your_workout_id'
        `);
    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    }
};

// Run the script with a limit of 10 exercises for testing
main(); 