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
const DETAILS_FILE_PATH = path.resolve(__dirname, 'afcd_details.xlsx'); // Path to the details file with classifications
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
  classification_id: 'Classification', // This is the ID referencing the classification table
  calories_kj: 'Energy with dietary fibre, equated (kJ)', // Updated to match normalized header from screenshot
  protein_per_100g: 'Protein (g)',
  carbs_per_100g: 'Available carbohydrate, with sugar alcohols (g)', // Updated to correct Excel column name
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

// Define column mappings for the details file with classification names
const detailsColumnMapping = {
  classification_id: 'Classification', // Updated to match the likely column name
  classification_name: 'Classification Name' // Updated to match the likely column name
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
    console.error('Please place afcd_data.xlsx in the scripts/ directory.');
    process.exit(1);
}

if (!fs.existsSync(DETAILS_FILE_PATH)) {
    console.error(`Error: Details file not found at ${DETAILS_FILE_PATH}`);
    console.error('Please place afcd_details.xlsx in the scripts/ directory.');
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

// Load classification data from details file
const loadClassificationMapping = () => {
    try {
        console.log(`Loading classification data from ${DETAILS_FILE_PATH}...`);
        
        // Read the Excel file
        const workbook = XLSX.readFile(DETAILS_FILE_PATH);
        
        // Find the sheet containing classification data
        // Assuming the first sheet contains classification data - adjust if needed
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Print all column headers to help debug
        const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];
        console.log("Available columns in classification file:", headers.join(", "));
        
        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: true });
        console.log(`Found ${jsonData.length} classification records.`);
        
        // Check the first row to debug column names
        if (jsonData.length > 0) {
            console.log("First classification record keys:", Object.keys(jsonData[0]).join(', '));
            console.log("First classification record values:", JSON.stringify(jsonData[0]));
        }
        
        // Create mapping from classification ID to name
        const classificationMap = {};
        
        jsonData.forEach(row => {
            const id = row[detailsColumnMapping.classification_id];
            const name = row[detailsColumnMapping.classification_name];
            
            if (id !== undefined && name !== undefined) {
                classificationMap[id] = name;
            }
        });
        
        console.log(`Created mapping for ${Object.keys(classificationMap).length} classifications.`);
        
        // Sample classification mapping for verification
        const sampleEntries = Object.entries(classificationMap).slice(0, 3);
        if (sampleEntries.length > 0) {
            console.log('Sample classification mappings:');
            sampleEntries.forEach(([id, name]) => {
                console.log(`  ${id} => ${name}`);
            });
        }
        
        return classificationMap;
    } catch (error) {
        console.error('Error loading classification data:', error);
        return {};
    }
};

// --- Main Function ---
const ingestData = async () => {
  console.log(`Starting ingestion from ${XLS_FILE_PATH}...`);
  
  // Check if we should update existing records (replace instead of insert)
  const updateExisting = process.argv.includes('--update');
  console.log(updateExisting ? 'Mode: UPDATE existing records' : 'Mode: INSERT new records only');
  
  let recordsToInsert = [];
  let recordsToUpdate = [];
  let totalProcessedCount = 0;
  let totalInsertedCount = 0;
  let totalUpdatedCount = 0;
  let totalSkippedCount = 0;
  const processedAfcdIds = new Set(); // Keep track of processed IDs to avoid duplicates
  
  // Track statistics for food group mapping
  const foodGroupStats = {
    'Vegetables': 0,
    'Fruits': 0,
    'Grains': 0,
    'Protein': 0,
    'Dairy': 0,
    'Beverages': 0,
    'Snacks': 0,
    'Condiments': 0,
    'Other': 0
  };
  
  // Store any original groups that didn't match standard categories
  const unmappedGroups = new Set();

  try {
    // Load classification mapping from details file
    const classificationMap = loadClassificationMapping();
    
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

            // Print available keys for debugging
            if (sheetProcessedCount === 1) {
                console.log(`Available columns in sheet "${targetSheetName}":`);
                console.log(Object.keys(trimmedRow).join(', '));
            }

            // Now use the normalized keys from trimmedRow with the *original* simple columnMapping
            const afcdId = trimmedRow[columnMapping.afcd_id] ? String(trimmedRow[columnMapping.afcd_id]) : null;

            // --- >>> Duplicate Check <<< ---
            if (afcdId && processedAfcdIds.has(afcdId)) {
                console.warn(`Skipping duplicate afcd_id ${afcdId} from sheet "${targetSheetName}" (already processed).`);
                continue;
            }
            // --- <<<

            // Get classification ID and lookup the name from our mapping
            const classificationId = trimmedRow[columnMapping.classification_id];
            const classificationName = classificationId !== undefined ? classificationMap[classificationId] : null;

            // Function to map original food group to standardized categories
            const mapToStandardFoodGroup = (originalGroup) => {
              if (!originalGroup) return null;
              
              // Convert to lowercase for case-insensitive matching
              const group = String(originalGroup).toLowerCase();
              
              // Map to standardized categories based on keywords
              if (/vegetable|veg/i.test(group)) return 'Vegetables';
              if (/fruit|berry|melon|citrus/i.test(group)) return 'Fruits';
              if (/grain|bread|cereal|rice|pasta|wheat|oat/i.test(group)) return 'Grains';
              if (/meat|poultry|fish|seafood|egg|protein|beef|chicken|pork|lamb/i.test(group)) return 'Protein';
              if (/milk|cheese|yogurt|dairy/i.test(group)) return 'Dairy';
              if (/beverage|drink|juice|tea|coffee|water|alcohol/i.test(group)) return 'Beverages';
              if (/snack|crisp|chip|candy|chocolate|biscuit|cookie/i.test(group)) return 'Snacks';
              if (/sauce|condiment|spice|herb|seasoning/i.test(group)) return 'Condiments';
              
              // If no match found, return the original group
              return String(originalGroup);
            };

            const standardizedFoodGroup = mapToStandardFoodGroup(classificationName);

            // Update statistics
            if (standardizedFoodGroup) {
              if (Object.keys(foodGroupStats).includes(standardizedFoodGroup)) {
                foodGroupStats[standardizedFoodGroup]++;
              } else {
                foodGroupStats['Other']++;
                // Track unmapped groups for reporting
                unmappedGroups.add(classificationName);
              }
            }

            const mappedRecord = {
                afcd_id: afcdId,
                food_name: trimmedRow[columnMapping.food_name] ? String(trimmedRow[columnMapping.food_name]) : 'Unknown',
                food_group: standardizedFoodGroup, // Use the standardized food group
                calories_per_100g: kjToKcal(trimmedRow[columnMapping.calories_kj]), // Lookup using simple key
                protein_per_100g: parseNumber(trimmedRow[columnMapping.protein_per_100g]),
                carbs_per_100g: parseNumber(trimmedRow[columnMapping.carbs_per_100g]),
                fat_per_100g: parseNumber(trimmedRow[columnMapping.fat_per_100g]),
                fiber_per_100g: parseNumber(trimmedRow[columnMapping.fiber_per_100g]),
                serving_size_g: parseNumber(trimmedRow[columnMapping.serving_size_g]),
                serving_size_unit: trimmedRow[columnMapping.serving_size_unit] ? String(trimmedRow[columnMapping.serving_size_unit]) : null,
                nutrient_basis: nutrientBasis // This captures solid/liquid distinction from the sheet name
            };

            // Basic validation
            if (!mappedRecord.food_name || mappedRecord.calories_per_100g === null) {
                console.warn(`Skipping row ${sheetProcessedCount} in sheet "${targetSheetName}" due to missing name or energy value: ${JSON.stringify(trimmedRow)}`);
                totalSkippedCount++;
                continue;
            }

            // Log the first few records for debugging
            if (totalProcessedCount <= 3) {
                console.log('Sample record:');
                console.log(mappedRecord);
            }

            // Add to appropriate collection based on mode
            if (updateExisting) {
                recordsToUpdate.push(mappedRecord);
            } else {
                recordsToInsert.push(mappedRecord);
            }

            // Add ID to processed set only if it has one and is being added
            if (afcdId) {
                processedAfcdIds.add(afcdId);
            }

            // Process in batches
            if (recordsToInsert.length >= BATCH_SIZE || recordsToUpdate.length >= BATCH_SIZE) {
                // Call processBatch and update totals
                if (updateExisting) {
                    const updatedCount = await processBatch(recordsToUpdate, updateExisting);
                    totalUpdatedCount += updatedCount;
                    recordsToUpdate = [];
                } else {
                    const insertedCount = await processBatch(recordsToInsert, updateExisting);
                    totalInsertedCount += insertedCount;
                    recordsToInsert = [];
                }
            }
        }
        console.log(`Finished processing sheet "${targetSheetName}".`);
    }

    // Process any remaining records
    if (updateExisting && recordsToUpdate.length > 0) {
        const updatedCount = await processBatch(recordsToUpdate, updateExisting);
        totalUpdatedCount += updatedCount;
    } else if (!updateExisting && recordsToInsert.length > 0) {
        const insertedCount = await processBatch(recordsToInsert, updateExisting);
        totalInsertedCount += insertedCount;
    }

    // Print food group mapping statistics
    console.log('\n--- Food Group Mapping Statistics ---');
    for (const [group, count] of Object.entries(foodGroupStats)) {
        console.log(`${group}: ${count} items`);
    }
    
    // Print unmapped groups if any
    if (unmappedGroups.size > 0) {
        console.log('\n--- Unmapped Original Food Groups ---');
        console.log(Array.from(unmappedGroups).join(', '));
        console.log('Consider updating the mapping function to handle these groups.');
    }

  } catch (err) {
    console.error('Error processing Excel file or inserting data:', err);
    process.exit(1);
  }

  console.log('\n--- Ingestion Complete ---');
  console.log(`Total rows processed across all sheets: ${totalProcessedCount}`);
  console.log(`Total records skipped (invalid): ${totalSkippedCount}`);
  
  if (updateExisting) {
    console.log(`Total records successfully updated: ${totalUpdatedCount}`);
  } else {
    console.log(`Total records successfully inserted: ${totalInsertedCount}`);
  }
};

// Helper function to process a batch of records
const processBatch = async (records, isUpdate) => {
    let successCount = 0;
    
    if (isUpdate) {
        console.log(`Updating batch of ${records.length} records...`);
        
        // Process each record individually for update
        for (const record of records) {
            const { error } = await supabase
                .from('food_items')
                .update({
                    food_name: record.food_name,
                    food_group: record.food_group,
                    calories_per_100g: record.calories_per_100g,
                    protein_per_100g: record.protein_per_100g,
                    carbs_per_100g: record.carbs_per_100g,
                    fat_per_100g: record.fat_per_100g,
                    fiber_per_100g: record.fiber_per_100g,
                    serving_size_g: record.serving_size_g,
                    serving_size_unit: record.serving_size_unit,
                    nutrient_basis: record.nutrient_basis
                })
                .eq('afcd_id', record.afcd_id);
            
            if (error) {
                console.error(`Error updating record with afcd_id ${record.afcd_id}:`, error);
            } else {
                successCount++;
            }
        }
        
        console.log(`Successfully processed update batch. (${successCount}/${records.length})`);
    } else {
        console.log(`Inserting batch of ${records.length} records...`);
        const { error } = await supabase.from('food_items').insert(records);
        if (error) {
            console.error('Error inserting batch:', error);
        } else {
            successCount = records.length;
            console.log(`Successfully inserted batch. (${successCount}/${records.length})`);
        }
    }
    
    return successCount;
};

// --- Run Script ---
ingestData().catch((error) => {
  console.error('Unhandled error during ingestion:', error);
  process.exit(1);
}); 