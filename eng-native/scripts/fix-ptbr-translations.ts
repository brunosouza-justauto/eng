/**
 * Fix Portuguese translations to use Brazilian Portuguese (pt-BR)
 * Uses OpenRouter with GPT-4 for better fitness terminology understanding
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const BATCH_SIZE = 25;
const RATE_LIMIT_DELAY_MS = 2000;
// Using Llama 3.3 70B for best Brazilian Portuguese fitness translations
const OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

let supabase: SupabaseClient;
let openrouterApiKey: string;

function initClients() {
  openrouterApiKey = process.env.OPENROUTER_API_KEY || '';
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!openrouterApiKey) throw new Error('OPENROUTER_API_KEY required');
  if (!supabaseUrl) throw new Error('SUPABASE_URL required');
  if (!supabaseKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY required');

  supabase = createClient(supabaseUrl, supabaseKey);
}

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
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function translateBatch(texts: string[]): Promise<string[]> {
  const prompt = `Você é um personal trainer brasileiro experiente. Traduza os seguintes nomes de exercícios de musculação do inglês para PORTUGUÊS BRASILEIRO (pt-BR).

REGRAS IMPORTANTES:
1. Use a terminologia BRASILEIRA de academia, NÃO português de Portugal
2. Traduza o SIGNIFICADO do exercício, não apenas as palavras
3. Responda APENAS com as traduções, uma por linha, na mesma ordem
4. NÃO inclua números, explicações ou o texto original
5. Mantenha palavras que não têm tradução comum em pt-BR (como "Kettlebell", "Leg Press", "Hack Squat")

GLOSSÁRIO DE TERMOS BRASILEIROS:
- Hip Thrust = Elevação de Quadril
- Squat = Agachamento
- Deadlift = Levantamento Terra
- Bench Press = Supino Reto
- Incline Press = Supino Inclinado
- Decline Press = Supino Declinado
- Pull-up/Chin-up = Barra Fixa
- Push-up = Flexão de Braço
- Dumbbell = Halter
- Barbell = Barra
- Cable = Cabo/Polia
- Row = Remada
- Curl = Rosca
- Tricep Extension = Extensão de Tríceps
- Skull Crusher = Tríceps Testa
- Fly/Flye = Crucifixo
- Lunge = Avanço
- Crunch = Abdominal
- Reverse Crunch = Abdominal Reverso
- Plank = Prancha
- Side Plank = Prancha Lateral
- Kickback = Coice
- Raise = Elevação
- Lateral Raise = Elevação Lateral
- Front Raise = Elevação Frontal
- Shrug = Encolhimento
- Pulldown/Lat Pulldown = Puxada/Pulley
- Pullover = Pullover
- Calf Raise = Elevação de Panturrilha
- Leg Press = Leg Press
- Leg Curl = Mesa Flexora
- Leg Extension = Cadeira Extensora
- Hack Squat = Hack Squat
- Good Morning = Bom Dia
- Face Pull = Face Pull
- Hammer Curl = Rosca Martelo
- Preacher Curl = Rosca Scott
- Concentration Curl = Rosca Concentrada
- Overhead = Acima da Cabeça
- Seated = Sentado
- Standing = Em Pé
- Lying = Deitado
- Incline = Inclinado
- Decline = Declinado
- Single Arm/One Arm = Unilateral
- Alternating = Alternado
- Kneeling = Ajoelhado
- Prone = Pronado
- Supine = Supinado
- Bulgarian Split Squat = Agachamento Búlgaro
- Romanian Deadlift = Levantamento Terra Romeno
- Stiff Leg Deadlift = Levantamento Terra com Pernas Rígidas
- Sumo Deadlift = Levantamento Terra Sumô
- Close Grip = Pegada Fechada
- Wide Grip = Pegada Aberta
- Underhand/Supinated = Supinada
- Overhand/Pronated = Pronada
- Neutral Grip = Pegada Neutra
- Sissy Squat = Sissy Squat
- Step Up = Subida no Banco

Exercícios para traduzir (${texts.length} itens):
${texts.join('\n')}`;

  const result = await callOpenRouter(prompt);
  const lines = result.split('\n').filter(line => line.trim().length > 0);
  return lines.map(line => line.trim());
}

async function fetchAllExercises(): Promise<Array<{ id: string; name_en: string; name_pt: string | null }>> {
  const allExercises: Array<{ id: string; name_en: string; name_pt: string | null }> = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('exercises')
      .select('id, name_en, name_pt')
      .not('name_en', 'is', null)
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allExercises.push(...data);
    console.log(`  Fetched ${allExercises.length} exercises...`);

    if (data.length < limit) break;
    offset += limit;
  }

  return allExercises;
}

async function main() {
  console.log('🇧🇷 Fixing Portuguese translations to Brazilian Portuguese (pt-BR)...');
  console.log('   Using GPT-4o-mini via OpenRouter for accurate fitness terminology\n');

  initClients();

  console.log('📥 Fetching all exercises...');
  const exercises = await fetchAllExercises();
  console.log(`Found ${exercises.length} exercises total\n`);

  let translated = 0;
  let errors = 0;
  const totalBatches = Math.ceil(exercises.length / BATCH_SIZE);

  for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
    const batch = exercises.slice(i, i + BATCH_SIZE);
    const names = batch.map(e => e.name_en);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${((batchNum / totalBatches) * 100).toFixed(1)}%)`);

    try {
      const translations = await translateBatch(names);

      if (translations.length !== batch.length) {
        console.log(`   ⚠️ Mismatch: got ${translations.length}, expected ${batch.length}`);
        const minLen = Math.min(translations.length, batch.length);
        for (let j = 0; j < minLen; j++) {
          const { error: updateError } = await supabase
            .from('exercises')
            .update({ name_pt: translations[j] })
            .eq('id', batch[j].id);

          if (!updateError) translated++;
          else errors++;
        }
        errors += Math.abs(translations.length - batch.length);
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
        continue;
      }

      for (let j = 0; j < batch.length; j++) {
        const { error: updateError } = await supabase
          .from('exercises')
          .update({ name_pt: translations[j] })
          .eq('id', batch[j].id);

        if (updateError) {
          errors++;
        } else {
          translated++;
        }
      }

      // Show examples
      console.log(`   ✅ ${names[0]} → ${translations[0]}`);
      if (names.length > 1) console.log(`   ✅ ${names[1]} → ${translations[1]}`);
      if (names.length > 2) console.log(`   ✅ ${names[2]} → ${translations[2]}`);

      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));

    } catch (err) {
      console.error(`   ❌ Batch error: ${err}`);
      errors += batch.length;
      // Wait longer on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   ✅ Translated: ${translated}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(50));
}

main().catch(console.error);
