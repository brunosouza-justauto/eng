import { createClient } from '@supabase/supabase-js';
// Remove csv-parse import
// import { parse } from 'csv-parse';
import fs from 'fs';
// Remove finished import
// import { finished } from 'stream/promises';
import path from 'path';
import { fileURLToPath } from 'url'; // Import fileURLToPath
import dotenv from 'dotenv';
import XLSX from 'xlsx'; // Use default import

// --- Calculate __dirname equivalent in ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --- End __dirname calculation ---

// Load environment variables from .env file in the parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// --- Configuration ---
const BATCH_SIZE = 100; // Insert records in batches
const XLS_FILE_PATH = path.resolve(__dirname, 'afcd_data.xlsx'); // Path to your XLS file
// --- >>> Define the sheets to process <<<
const SHEETS_TO_PROCESS = [
    { name: "All solids & liquids per 100g", basis: "100g" },
    { name: "Liquids only per 100mL", basis: "100mL" }
];
// --- <<<

// IMPORTANT: Adjust these keys to match the EXACT column headers in your Excel file sheets!
const columnMapping = {
  afcd_id: 'Public Food Key', // Or the relevant unique ID column
  food_name: 'Food Name',
  food_group: 'Food Group', // Or classification column
  calories_kj: 'Energy with dietary fibre, equated (kJ)', // Updated to match normalized header from screenshot
  protein_per_100g: 'Protein (g)',
  carbs_per_100g: 'Available carbohydrate, total (g)', // Or similar carbohydrate column
  fat_per_100g: 'Fat, total (g)',
  fiber_per_100g: 'Total dietary fibre (g)',
  // --- >>> Add mappings for serving size - VERIFY these column names in your Excel file! <<<
  serving_size_g: 'Serving Size (g)', // Adjust if your column name is different
  serving_size_unit: 'Serving Size Unit', // Adjust if your column name is different
  // --- <<<
  // Add other columns from your Excel sheet you want to import, matching the table schema
  // e.g., sodium_mg: 'Sodium (mg)'
  // nutrient_basis is set programmatically, no mapping needed here
};

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// IMPORTANT: Use the SERVICE ROLE KEY for backend operations!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Add this to your .env file

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    'Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in the .env file.'
  );
  process.exit(1);
}

if (!fs.existsSync(XLS_FILE_PATH)) {
    console.error(`Error: Excel file not found at ${XLS_FILE_PATH}`);
    console.error('Please place afcd_data.xls in the scripts/ directory.');
    process.exit(1);
}

// Initialize Supabase client with Service Role Key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- Helper Functions ---
// Converts kJ to kcal (approximate)
const kjToKcal = (kj) => {
    if (kj === null || kj === undefined || isNaN(Number(kj))) return null;
    return Math.round(Number(kj) / 4.184);
};

const parseNumber = (value) => {
    if (value === null || value === undefined || value === '' || String(value).trim().toLowerCase() === 'tr') return null; // Handle empty strings and trace amounts
    const num = Number(value);
    return isNaN(num) ? null : num;
}

// --- Main Function ---
const ingestData = async () => {
  console.log(`Starting ingestion from ${XLS_FILE_PATH}...`);
  let recordsToInsert = [];
  let totalProcessedCount = 0;
  let totalInsertedCount = 0;
  const processedAfcdIds = new Set(); // Keep track of processed IDs to avoid duplicates

  try {
    // Read the Excel file once
    const workbook = XLSX.readFile(XLS_FILE_PATH);

    // Loop through each sheet defined in SHEETS_TO_PROCESS
    for (const sheetInfo of SHEETS_TO_PROCESS) {
        const targetSheetName = sheetInfo.name;
        const nutrientBasis = sheetInfo.basis;
        let sheetProcessedCount = 0;

        console.log(`\nProcessing sheet: "${targetSheetName}" with basis: "${nutrientBasis}"`);

        if (!workbook.Sheets[targetSheetName]) {
            console.warn(`Warning: Sheet named "${targetSheetName}" not found in the Excel file. Skipping.`);
            console.warn(`Available sheets: ${workbook.SheetNames.join(', ')}`);
            continue; // Skip to the next sheet
        }

        const worksheet = workbook.Sheets[targetSheetName];

        // Convert sheet to JSON array of objects (headers are keys)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true });
        console.log(`Found ${jsonData.length} rows in sheet "${targetSheetName}".`);

        // Process each row from the current sheet
        for (const row of jsonData) {
            totalProcessedCount++; // Increment overall counter
            sheetProcessedCount++; // Increment sheet-specific counter

            // Trim keys AND normalize by replacing internal line breaks with spaces
            const trimmedRow = {};
            for (const key in row) {
                const normalizedKey = key.trim().replace(/\r\n|\n|\r/g, ''); // Replace line breaks with space
                trimmedRow[normalizedKey] = row[key];
            }

            // Now use the normalized keys from trimmedRow with the *original* simple columnMapping
            const afcdId = trimmedRow[columnMapping.afcd_id] ? String(trimmedRow[columnMapping.afcd_id]) : null;

            // --- >>> Duplicate Check <<< ---
            if (afcdId && processedAfcdIds.has(afcdId)) {
                console.warn(`Skipping duplicate afcd_id ${afcdId} from sheet "${targetSheetName}" (already processed).`);
                continue;
            }
            // --- <<<

            const mappedRecord = {
                afcd_id: afcdId,
                food_name: trimmedRow[columnMapping.food_name] ? String(trimmedRow[columnMapping.food_name]) : 'Unknown',
                food_group: trimmedRow[columnMapping.food_group] ? String(trimmedRow[columnMapping.food_group]) : null,
                calories_per_100g: kjToKcal(trimmedRow[columnMapping.calories_kj]), // Lookup using simple key
                protein_per_100g: parseNumber(trimmedRow[columnMapping.protein_per_100g]),
                carbs_per_100g: parseNumber(trimmedRow[columnMapping.carbs_per_100g]),
                fat_per_100g: parseNumber(trimmedRow[columnMapping.fat_per_100g]),
                fiber_per_100g: parseNumber(trimmedRow[columnMapping.fiber_per_100g]),
                serving_size_g: parseNumber(trimmedRow[columnMapping.serving_size_g]),
                serving_size_unit: trimmedRow[columnMapping.serving_size_unit] ? String(trimmedRow[columnMapping.serving_size_unit]) : null,
                nutrient_basis: nutrientBasis
            };

            // Basic validation
            if (!mappedRecord.food_name || mappedRecord.calories_per_100g === null) {
                console.warn(`Skipping row ${sheetProcessedCount} in sheet "${targetSheetName}" due to missing name or energy value: ${JSON.stringify(trimmedRow)}`);
                continue;
            }

            recordsToInsert.push(mappedRecord);

            // Add ID to processed set only if it has one and is being added
            if (afcdId) {
                processedAfcdIds.add(afcdId);
            }

            // Insert in batches
            if (recordsToInsert.length >= BATCH_SIZE) {
                console.log(`Inserting batch of ${recordsToInsert.length} records... (Total inserted so far: ${totalInsertedCount})`);
                const { error } = await supabase.from('food_items').insert(recordsToInsert);
                if (error) {
                    console.error('Error inserting batch:', error);
                } else {
                    totalInsertedCount += recordsToInsert.length;
                    console.log(`Successfully inserted batch. Total inserted: ${totalInsertedCount}`);
                }
                recordsToInsert = []; // Reset batch array
            }
        }
        console.log(`Finished processing sheet "${targetSheetName}".`);
    }

    // Insert any remaining records from the last sheet
    if (recordsToInsert.length > 0) {
        console.log(`\nInserting final batch of ${recordsToInsert.length} records...`);
        const { error } = await supabase.from('food_items').insert(recordsToInsert);
        if (error) {
            console.error('Error inserting final batch:', error);
        } else {
            totalInsertedCount += recordsToInsert.length;
        }
    }

  } catch (err) {
    console.error('Error processing Excel file or inserting data:', err);
    process.exit(1);
  }

  console.log('\n--- Ingestion Complete ---');
  console.log(`Total rows processed across all sheets: ${totalProcessedCount}`);
  console.log(`Total records successfully inserted: ${totalInsertedCount}`);
};

// --- Run Script ---
ingestData().catch((error) => {
  console.error('Unhandled error during ingestion:', error);
  process.exit(1);
}); 