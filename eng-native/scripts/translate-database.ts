/**
 * AI Translation Script for Database Content
 *
 * This script uses OpenRouter API to translate database content from English to Portuguese.
 * It handles: exercises, food items, supplements, and coach notes.
 *
 * Usage:
 *   npx ts-node scripts/translate-database.ts
 *
 * Environment variables required:
 *   - OPENROUTER_API_KEY: Your OpenRouter API key
 *   - SUPABASE_URL: Your Supabase project URL
 *   - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

// Configuration
const BATCH_SIZE = 10; // Smaller batches for more reliable translations
const RATE_LIMIT_DELAY_MS = 500;
const MAX_RETRIES = 3;

// OpenRouter configuration - using a cheap but capable model
// Cheap paid options: mistralai/mistral-7b-instruct (~$0.06/1M tokens), google/gemini-flash-1.5 (~$0.075/1M)
// Free options (rate limited): google/gemini-2.0-flash-exp:free, meta-llama/llama-3.1-8b-instruct:free
const OPENROUTER_MODEL = 'mistralai/mistral-7b-instruct';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Initialize clients
let supabase: SupabaseClient;
let openrouterApiKey: string;

function initClients() {
  openrouterApiKey = process.env.OPENROUTER_API_KEY || '';
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!openrouterApiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL environment variable is required');
  }
  if (!supabaseKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  }

  supabase = createClient(supabaseUrl, supabaseKey);
}

/**
 * Call OpenRouter API for translation
 */
async function callOpenRouter(prompt: string): Promise<string> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://eng-app.com',
      'X-Title': 'ENG App Translation',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4096,
      temperature: 0.3, // Lower temperature for more consistent translations
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Translate an array of texts from English to Portuguese using OpenRouter
 */
async function translateTexts(texts: string[], context: string = 'fitness/nutrition'): Promise<string[]> {
  const validTexts = texts.filter((t) => t && t.trim().length > 0);
  if (validTexts.length === 0) return [];

  const prompt = `You are a professional translator specializing in ${context} terminology.
Translate the following terms from English to Brazilian Portuguese.
Keep the translations natural and commonly used in Brazilian ${context} culture.
Maintain proper capitalization and formatting.
Return ONLY a valid JSON array of translated strings in the exact same order as the input.
Do not include any explanation or additional text.

Terms to translate:
${JSON.stringify(validTexts, null, 2)}`;

  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const responseText = await callOpenRouter(prompt);

      // Extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from response: ' + responseText.substring(0, 200));
      }

      const translated = JSON.parse(jsonMatch[0]) as string[];

      if (translated.length !== validTexts.length) {
        console.warn(
          `  Warning: Translation count mismatch: expected ${validTexts.length}, got ${translated.length}`
        );
        // Pad with empty strings if we got fewer translations
        while (translated.length < validTexts.length) {
          translated.push('');
        }
      }

      return translated;
    } catch (error) {
      retries++;
      console.error(`Translation attempt ${retries} failed:`, error);
      if (retries >= MAX_RETRIES) {
        throw error;
      }
      await sleep(RATE_LIMIT_DELAY_MS * retries);
    }
  }

  return [];
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Translate exercises table - processes ALL exercises, not just 500
 */
async function translateExercises(): Promise<{ translated: number; errors: number }> {
  console.log('\n📋 Translating exercises...');

  // First, get the count of exercises to translate
  const { count } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .is('name_pt', null)
    .not('name_en', 'is', null);

  console.log(`  Total exercises to translate: ${count}`);

  let translated = 0;
  let errors = 0;
  let offset = 0;
  const fetchBatchSize = 100;

  while (true) {
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select('id, name_en, description_en, instructions')
      .is('name_pt', null)
      .not('name_en', 'is', null)
      .order('id')
      .range(offset, offset + fetchBatchSize - 1);

    if (error) {
      console.error('Error fetching exercises:', error);
      return { translated, errors: errors + 1 };
    }

    if (!exercises || exercises.length === 0) {
      break;
    }

    console.log(`  Processing exercises ${offset + 1} to ${offset + exercises.length}...`);

    for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
      const batch = exercises.slice(i, i + BATCH_SIZE);

      try {
        // Translate names
        const names = batch.map((e) => e.name_en).filter(Boolean) as string[];
        const translatedNames = names.length > 0 ? await translateTexts(names, 'fitness/exercise') : [];

        // Get descriptions from description_en or instructions (which is an array)
        const descriptions = batch.map((e) => {
          if (e.description_en) return e.description_en;
          if (Array.isArray(e.instructions)) return e.instructions.join(' ');
          return e.instructions || '';
        }).filter(Boolean) as string[];
        const translatedDescriptions =
          descriptions.length > 0 ? await translateTexts(descriptions, 'fitness/exercise instructions') : [];

        // Update database
        let nameIdx = 0;
        let descIdx = 0;

        for (const exercise of batch) {
          const updates: Record<string, string> = {};

          if (exercise.name_en) {
            const translatedName = translatedNames[nameIdx] || '';
            nameIdx++;
            if (translatedName.trim()) {
              updates.name_pt = translatedName;
            }
          }

          // Check if exercise has description (from description_en or instructions)
          const hasDescription = exercise.description_en ||
            (Array.isArray(exercise.instructions) && exercise.instructions.length > 0) ||
            exercise.instructions;

          if (hasDescription) {
            const translatedDesc = translatedDescriptions[descIdx] || '';
            descIdx++;
            if (translatedDesc.trim()) {
              updates.description_pt = translatedDesc;
              // Also populate description_en if it was empty
              if (!exercise.description_en) {
                const sourceDesc = Array.isArray(exercise.instructions)
                  ? exercise.instructions.join(' ')
                  : exercise.instructions;
                updates.description_en = sourceDesc;
              }
            }
          }

          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('exercises')
              .update(updates)
              .eq('id', exercise.id);

            if (updateError) {
              console.error(`    Error updating exercise ${exercise.id}:`, updateError);
              errors++;
            } else {
              translated++;
            }
          }
        }

        await sleep(RATE_LIMIT_DELAY_MS);
      } catch (error) {
        console.error(`    Error processing batch:`, error);
        errors += batch.length;
      }
    }

    offset += fetchBatchSize;
    console.log(`  Progress: ${translated} translated, ${errors} errors`);
  }

  console.log(`  ✅ Translated ${translated} exercises, ${errors} errors`);

  // Second pass: translate descriptions for exercises that have name_pt but no description_pt
  console.log('\n📋 Translating exercise descriptions (second pass)...');

  const { count: descCount } = await supabase
    .from('exercises')
    .select('*', { count: 'exact', head: true })
    .not('name_pt', 'is', null)
    .is('description_pt', null);

  console.log(`  Total exercise descriptions to translate: ${descCount}`);

  let descTranslated = 0;
  let descErrors = 0;
  offset = 0;

  while (true) {
    const { data: exercisesWithoutDesc, error: descError } = await supabase
      .from('exercises')
      .select('id, description_en, instructions')
      .not('name_pt', 'is', null)
      .is('description_pt', null)
      .order('id')
      .range(offset, offset + fetchBatchSize - 1);

    if (descError) {
      console.error('Error fetching exercises:', descError);
      break;
    }

    if (!exercisesWithoutDesc || exercisesWithoutDesc.length === 0) {
      break;
    }

    console.log(`  Processing descriptions ${offset + 1} to ${offset + exercisesWithoutDesc.length}...`);

    for (let i = 0; i < exercisesWithoutDesc.length; i += BATCH_SIZE) {
      const batch = exercisesWithoutDesc.slice(i, i + BATCH_SIZE);

      try {
        // Get descriptions from description_en or instructions
        const descriptions = batch.map((e) => {
          if (e.description_en) return e.description_en;
          if (Array.isArray(e.instructions)) return e.instructions.join(' ');
          return e.instructions || '';
        }).filter(Boolean) as string[];

        if (descriptions.length === 0) continue;

        const translatedDescriptions = await translateTexts(descriptions, 'fitness/exercise instructions');

        let descIdx = 0;
        for (const exercise of batch) {
          const hasDescription = exercise.description_en ||
            (Array.isArray(exercise.instructions) && exercise.instructions.length > 0) ||
            exercise.instructions;

          if (hasDescription) {
            const translatedDesc = translatedDescriptions[descIdx] || '';
            descIdx++;

            if (translatedDesc.trim()) {
              const updates: Record<string, string> = { description_pt: translatedDesc };

              // Also populate description_en if it was empty
              if (!exercise.description_en) {
                const sourceDesc = Array.isArray(exercise.instructions)
                  ? exercise.instructions.join(' ')
                  : exercise.instructions;
                updates.description_en = sourceDesc;
              }

              const { error: updateError } = await supabase
                .from('exercises')
                .update(updates)
                .eq('id', exercise.id);

              if (updateError) {
                console.error(`    Error updating exercise ${exercise.id}:`, updateError);
                descErrors++;
              } else {
                descTranslated++;
              }
            }
          }
        }

        await sleep(RATE_LIMIT_DELAY_MS);
      } catch (error) {
        console.error(`    Error processing batch:`, error);
        descErrors += batch.length;
      }
    }

    offset += fetchBatchSize;
    console.log(`  Progress: ${descTranslated} descriptions translated, ${descErrors} errors`);
  }

  console.log(`  ✅ Translated ${descTranslated} exercise descriptions, ${descErrors} errors`);

  return { translated: translated + descTranslated, errors: errors + descErrors };
}

/**
 * Translate food_items table
 */
async function translateFoodItems(): Promise<{ translated: number; errors: number }> {
  console.log('\n🍎 Translating food items...');

  const { count } = await supabase
    .from('food_items')
    .select('*', { count: 'exact', head: true })
    .is('food_name_pt', null)
    .not('food_name_en', 'is', null);

  console.log(`  Total food items to translate: ${count}`);

  let translated = 0;
  let errors = 0;
  let offset = 0;
  const fetchBatchSize = 100;

  while (true) {
    const { data: foods, error } = await supabase
      .from('food_items')
      .select('id, food_name_en')
      .is('food_name_pt', null)
      .not('food_name_en', 'is', null)
      .order('id')
      .range(offset, offset + fetchBatchSize - 1);

    if (error) {
      console.error('Error fetching food items:', error);
      return { translated, errors: errors + 1 };
    }

    if (!foods || foods.length === 0) {
      break;
    }

    console.log(`  Processing food items ${offset + 1} to ${offset + foods.length}...`);

    for (let i = 0; i < foods.length; i += BATCH_SIZE) {
      const batch = foods.slice(i, i + BATCH_SIZE);

      try {
        const names = batch.map((f) => f.food_name_en).filter(Boolean) as string[];
        const translatedNames = await translateTexts(names, 'food/nutrition');

        let nameIdx = 0;
        for (const food of batch) {
          if (food.food_name_en && translatedNames[nameIdx]) {
            const { error: updateError } = await supabase
              .from('food_items')
              .update({ food_name_pt: translatedNames[nameIdx] })
              .eq('id', food.id);

            if (updateError) {
              console.error(`    Error updating food ${food.id}:`, updateError);
              errors++;
            } else {
              translated++;
            }
            nameIdx++;
          }
        }

        await sleep(RATE_LIMIT_DELAY_MS);
      } catch (error) {
        console.error(`    Error processing batch:`, error);
        errors += batch.length;
      }
    }

    offset += fetchBatchSize;
  }

  console.log(`  ✅ Translated ${translated} food items, ${errors} errors`);
  return { translated, errors };
}

/**
 * Translate supplements table
 */
async function translateSupplements(): Promise<{ translated: number; errors: number }> {
  console.log('\n💊 Translating supplements...');

  const { data: supplements, error } = await supabase
    .from('supplements')
    .select('id, name_en')
    .is('name_pt', null)
    .not('name_en', 'is', null);

  if (error) {
    console.error('Error fetching supplements:', error);
    return { translated: 0, errors: 1 };
  }

  if (!supplements || supplements.length === 0) {
    console.log('  No supplements to translate');
    return { translated: 0, errors: 0 };
  }

  console.log(`  Found ${supplements.length} supplements to translate`);

  let translated = 0;
  let errors = 0;

  for (let i = 0; i < supplements.length; i += BATCH_SIZE) {
    const batch = supplements.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(supplements.length / BATCH_SIZE);

    console.log(`  Processing batch ${batchNum}/${totalBatches}...`);

    try {
      const names = batch.map((s) => s.name_en).filter(Boolean) as string[];
      const translatedNames = await translateTexts(names, 'supplements/nutrition');

      let nameIdx = 0;
      for (const supplement of batch) {
        if (supplement.name_en && translatedNames[nameIdx]) {
          const { error: updateError } = await supabase
            .from('supplements')
            .update({ name_pt: translatedNames[nameIdx] })
            .eq('id', supplement.id);

          if (updateError) {
            console.error(`    Error updating supplement ${supplement.id}:`, updateError);
            errors++;
          } else {
            translated++;
          }
          nameIdx++;
        }
      }

      await sleep(RATE_LIMIT_DELAY_MS);
    } catch (error) {
      console.error(`    Error processing batch:`, error);
      errors += batch.length;
    }
  }

  console.log(`  ✅ Translated ${translated} supplements, ${errors} errors`);
  return { translated, errors };
}

/**
 * Translate notes in exercise_instances table
 */
async function translateExerciseInstanceNotes(): Promise<{ translated: number; errors: number }> {
  console.log('\n📝 Translating exercise instance notes...');

  const { data: exercises, error } = await supabase
    .from('exercise_instances')
    .select('id, notes_en')
    .is('notes_pt', null)
    .not('notes_en', 'is', null);

  if (error) {
    console.error('Error fetching exercise instances:', error);
    return { translated: 0, errors: 1 };
  }

  if (!exercises || exercises.length === 0) {
    console.log('  No exercise instance notes to translate');
    return { translated: 0, errors: 0 };
  }

  console.log(`  Found ${exercises.length} exercise instance notes to translate`);

  let translated = 0;
  let errors = 0;

  for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
    const batch = exercises.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(exercises.length / BATCH_SIZE);

    console.log(`  Processing batch ${batchNum}/${totalBatches}...`);

    try {
      const notes = batch.map((e) => e.notes_en).filter(Boolean) as string[];
      const translatedNotes = await translateTexts(notes, 'fitness coaching instructions');

      let noteIdx = 0;
      for (const exercise of batch) {
        if (exercise.notes_en && translatedNotes[noteIdx]) {
          const { error: updateError } = await supabase
            .from('exercise_instances')
            .update({ notes_pt: translatedNotes[noteIdx] })
            .eq('id', exercise.id);

          if (updateError) {
            console.error(`    Error updating exercise instance ${exercise.id}:`, updateError);
            errors++;
          } else {
            translated++;
          }
          noteIdx++;
        }
      }

      await sleep(RATE_LIMIT_DELAY_MS);
    } catch (error) {
      console.error(`    Error processing batch:`, error);
      errors += batch.length;
    }
  }

  console.log(`  ✅ Translated ${translated} exercise instance notes, ${errors} errors`);
  return { translated, errors };
}

/**
 * Translate descriptions in program_templates table
 */
async function translateProgramTemplateDescriptions(): Promise<{ translated: number; errors: number }> {
  console.log('\n🏋️ Translating program template descriptions...');

  const { data: programs, error } = await supabase
    .from('program_templates')
    .select('id, description_en')
    .is('description_pt', null)
    .not('description_en', 'is', null);

  if (error) {
    console.error('Error fetching program templates:', error);
    return { translated: 0, errors: 1 };
  }

  if (!programs || programs.length === 0) {
    console.log('  No program template descriptions to translate');
    return { translated: 0, errors: 0 };
  }

  console.log(`  Found ${programs.length} program template descriptions to translate`);

  let translated = 0;
  let errors = 0;

  // Process one at a time for long descriptions to avoid truncation
  for (let i = 0; i < programs.length; i++) {
    const program = programs[i];
    console.log(`  Processing ${i + 1}/${programs.length}...`);

    try {
      const translatedDescriptions = await translateTexts([program.description_en], 'fitness program descriptions');

      if (translatedDescriptions[0]?.trim()) {
        const { error: updateError } = await supabase
          .from('program_templates')
          .update({ description_pt: translatedDescriptions[0] })
          .eq('id', program.id);

        if (updateError) {
          console.error(`    Error updating program template ${program.id}:`, updateError);
          errors++;
        } else {
          translated++;
        }
      }

      await sleep(RATE_LIMIT_DELAY_MS);
    } catch (error) {
      console.error(`    Error processing program ${program.id}:`, error);
      errors++;
    }
  }

  console.log(`  ✅ Translated ${translated} program template descriptions, ${errors} errors`);
  return { translated, errors };
}

/**
 * Translate descriptions in nutrition_plans table
 */
async function translateNutritionPlanDescriptions(): Promise<{ translated: number; errors: number }> {
  console.log('\n🥗 Translating nutrition plan descriptions...');

  const { data: plans, error } = await supabase
    .from('nutrition_plans')
    .select('id, description_en')
    .is('description_pt', null)
    .not('description_en', 'is', null);

  if (error) {
    console.error('Error fetching nutrition plans:', error);
    return { translated: 0, errors: 1 };
  }

  if (!plans || plans.length === 0) {
    console.log('  No nutrition plan descriptions to translate');
    return { translated: 0, errors: 0 };
  }

  console.log(`  Found ${plans.length} nutrition plan descriptions to translate`);

  let translated = 0;
  let errors = 0;

  // Process one at a time for long descriptions to avoid truncation
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    console.log(`  Processing ${i + 1}/${plans.length}...`);

    try {
      const translatedDescriptions = await translateTexts([plan.description_en], 'nutrition plan descriptions');

      if (translatedDescriptions[0]?.trim()) {
        const { error: updateError } = await supabase
          .from('nutrition_plans')
          .update({ description_pt: translatedDescriptions[0] })
          .eq('id', plan.id);

        if (updateError) {
          console.error(`    Error updating nutrition plan ${plan.id}:`, updateError);
          errors++;
        } else {
          translated++;
        }
      }

      await sleep(RATE_LIMIT_DELAY_MS);
    } catch (error) {
      console.error(`    Error processing plan ${plan.id}:`, error);
      errors++;
    }
  }

  console.log(`  ✅ Translated ${translated} nutrition plan descriptions, ${errors} errors`);
  return { translated, errors };
}

/**
 * Translate notes in meals table
 */
async function translateMealNotes(): Promise<{ translated: number; errors: number }> {
  console.log('\n🍽️ Translating meal notes...');

  const { data: meals, error } = await supabase
    .from('meals')
    .select('id, notes_en')
    .is('notes_pt', null)
    .not('notes_en', 'is', null);

  if (error) {
    console.error('Error fetching meals:', error);
    return { translated: 0, errors: 1 };
  }

  if (!meals || meals.length === 0) {
    console.log('  No meal notes to translate');
    return { translated: 0, errors: 0 };
  }

  console.log(`  Found ${meals.length} meal notes to translate`);

  let translated = 0;
  let errors = 0;

  for (let i = 0; i < meals.length; i += BATCH_SIZE) {
    const batch = meals.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(meals.length / BATCH_SIZE);

    console.log(`  Processing batch ${batchNum}/${totalBatches}...`);

    try {
      const notes = batch.map((m) => m.notes_en).filter(Boolean) as string[];
      const translatedNotes = await translateTexts(notes, 'nutrition/meal instructions');

      let noteIdx = 0;
      for (const meal of batch) {
        if (meal.notes_en && translatedNotes[noteIdx]) {
          const { error: updateError } = await supabase
            .from('meals')
            .update({ notes_pt: translatedNotes[noteIdx] })
            .eq('id', meal.id);

          if (updateError) {
            console.error(`    Error updating meal ${meal.id}:`, updateError);
            errors++;
          } else {
            translated++;
          }
          noteIdx++;
        }
      }

      await sleep(RATE_LIMIT_DELAY_MS);
    } catch (error) {
      console.error(`    Error processing batch:`, error);
      errors += batch.length;
    }
  }

  console.log(`  ✅ Translated ${translated} meal notes, ${errors} errors`);
  return { translated, errors };
}

/**
 * Translate workouts table (name and description)
 */
async function translateWorkouts(): Promise<{ translated: number; errors: number }> {
  console.log('\n🏋️ Translating workouts...');

  const { data: workouts, error } = await supabase
    .from('workouts')
    .select('id, name_en, description_en')
    .is('name_pt', null)
    .not('name_en', 'is', null);

  if (error) {
    console.error('Error fetching workouts:', error);
    return { translated: 0, errors: 1 };
  }

  if (!workouts || workouts.length === 0) {
    console.log('  No workouts to translate');
    return { translated: 0, errors: 0 };
  }

  console.log(`  Found ${workouts.length} workouts to translate`);

  let translated = 0;
  let errors = 0;

  for (let i = 0; i < workouts.length; i += BATCH_SIZE) {
    const batch = workouts.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(workouts.length / BATCH_SIZE);

    console.log(`  Processing batch ${batchNum}/${totalBatches}...`);

    try {
      // Translate names
      const names = batch.map((w) => w.name_en).filter(Boolean) as string[];
      const translatedNames = names.length > 0 ? await translateTexts(names, 'fitness/workout') : [];

      // Translate descriptions
      const descriptions = batch.map((w) => w.description_en).filter(Boolean) as string[];
      const translatedDescriptions = descriptions.length > 0
        ? await translateTexts(descriptions, 'fitness/workout instructions')
        : [];

      let nameIdx = 0;
      let descIdx = 0;

      for (const workout of batch) {
        const updates: Record<string, string> = {};

        if (workout.name_en && translatedNames[nameIdx]) {
          updates.name_pt = translatedNames[nameIdx];
          nameIdx++;
        }

        if (workout.description_en && translatedDescriptions[descIdx]) {
          updates.description_pt = translatedDescriptions[descIdx];
          descIdx++;
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('workouts')
            .update(updates)
            .eq('id', workout.id);

          if (updateError) {
            console.error(`    Error updating workout ${workout.id}:`, updateError);
            errors++;
          } else {
            translated++;
          }
        }
      }

      await sleep(RATE_LIMIT_DELAY_MS);
    } catch (error) {
      console.error(`    Error processing batch:`, error);
      errors += batch.length;
    }
  }

  console.log(`  ✅ Translated ${translated} workouts, ${errors} errors`);
  return { translated, errors };
}

/**
 * Main function
 */
async function main() {
  console.log('🌐 Starting database translation...\n');
  console.log(`Using model: ${OPENROUTER_MODEL}`);
  console.log('='.repeat(50));

  try {
    initClients();
  } catch (error) {
    console.error('Failed to initialize clients:', error);
    process.exit(1);
  }

  const results = {
    exercises: { translated: 0, errors: 0 },
    foodItems: { translated: 0, errors: 0 },
    supplements: { translated: 0, errors: 0 },
    exerciseInstanceNotes: { translated: 0, errors: 0 },
    programTemplateDescriptions: { translated: 0, errors: 0 },
    nutritionPlanDescriptions: { translated: 0, errors: 0 },
    mealNotes: { translated: 0, errors: 0 },
    workouts: { translated: 0, errors: 0 },
  };

  results.exercises = await translateExercises();
  results.foodItems = await translateFoodItems();
  results.supplements = await translateSupplements();
  results.exerciseInstanceNotes = await translateExerciseInstanceNotes();
  results.programTemplateDescriptions = await translateProgramTemplateDescriptions();
  results.nutritionPlanDescriptions = await translateNutritionPlanDescriptions();
  results.mealNotes = await translateMealNotes();
  results.workouts = await translateWorkouts();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Translation Summary\n');

  const totalTranslated = Object.values(results).reduce((sum, r) => sum + r.translated, 0);
  const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);

  console.log(`  Exercises: ${results.exercises.translated} translated, ${results.exercises.errors} errors`);
  console.log(`  Food Items: ${results.foodItems.translated} translated, ${results.foodItems.errors} errors`);
  console.log(`  Supplements: ${results.supplements.translated} translated, ${results.supplements.errors} errors`);
  console.log(
    `  Exercise Instance Notes: ${results.exerciseInstanceNotes.translated} translated, ${results.exerciseInstanceNotes.errors} errors`
  );
  console.log(
    `  Program Template Descriptions: ${results.programTemplateDescriptions.translated} translated, ${results.programTemplateDescriptions.errors} errors`
  );
  console.log(
    `  Nutrition Plan Descriptions: ${results.nutritionPlanDescriptions.translated} translated, ${results.nutritionPlanDescriptions.errors} errors`
  );
  console.log(`  Meal Notes: ${results.mealNotes.translated} translated, ${results.mealNotes.errors} errors`);
  console.log(`  Workouts: ${results.workouts.translated} translated, ${results.workouts.errors} errors`);

  console.log('\n' + '-'.repeat(50));
  console.log(`  TOTAL: ${totalTranslated} translated, ${totalErrors} errors`);
  console.log('='.repeat(50));
  console.log('\n✅ Translation complete!');
}

main().catch(console.error);
