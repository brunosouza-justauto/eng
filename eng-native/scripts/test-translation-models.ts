/**
 * Test different LLMs for Brazilian Portuguese fitness translations
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const openrouterApiKey = process.env.OPENROUTER_API_KEY || '';

// Models to test
const MODELS = [
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash-001',
  'deepseek/deepseek-chat',
  'anthropic/claude-3.5-haiku',
  'meta-llama/llama-3.3-70b-instruct',
];

// Test exercises with expected translations
const TEST_EXERCISES = [
  { en: 'Kneeling Hip Thrust', expected: 'Elevação de Quadril Ajoelhado' },
  { en: 'Dumbbell Bench Press', expected: 'Supino Reto com Halter' },
  { en: 'Cable Tricep Pushdown', expected: 'Tríceps Puxada no Cabo' },
  { en: 'Barbell Romanian Deadlift', expected: 'Levantamento Terra Romeno com Barra' },
  { en: 'Standing Calf Raise', expected: 'Elevação de Panturrilha em Pé' },
];

async function translateWithModel(model: string, exercises: string[]): Promise<string[]> {
  const prompt = `Você é um personal trainer brasileiro experiente. Traduza os seguintes nomes de exercícios de musculação do inglês para PORTUGUÊS BRASILEIRO (pt-BR).

REGRAS:
1. Use terminologia BRASILEIRA de academia
2. Traduza o SIGNIFICADO, não apenas palavras
3. Responda APENAS com as traduções, uma por linha
4. NÃO inclua números ou explicações

GLOSSÁRIO:
- Hip Thrust = Elevação de Quadril
- Squat = Agachamento
- Deadlift = Levantamento Terra
- Bench Press = Supino Reto
- Dumbbell = Halter
- Barbell = Barra
- Cable = Cabo
- Curl = Rosca
- Pushdown = Puxada
- Tricep = Tríceps
- Calf Raise = Elevação de Panturrilha
- Standing = Em Pé
- Kneeling = Ajoelhado
- Romanian = Romeno

Exercícios:
${exercises.join('\n')}`;

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://eng-app.com',
        'X-Title': 'ENG App Translation Test',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    return content.split('\n').filter((line: string) => line.trim()).map((line: string) => line.trim());
  } catch (err) {
    return [`Error: ${err}`];
  }
}

async function main() {
  console.log('🧪 Testing LLMs for Brazilian Portuguese fitness translations\n');
  console.log('Expected translations:');
  TEST_EXERCISES.forEach(e => console.log(`  "${e.en}" → "${e.expected}"`));
  console.log('\n' + '='.repeat(70) + '\n');

  const exerciseNames = TEST_EXERCISES.map(e => e.en);

  for (const model of MODELS) {
    console.log(`\n📊 Model: ${model}`);
    console.log('-'.repeat(50));

    const translations = await translateWithModel(model, exerciseNames);

    for (let i = 0; i < TEST_EXERCISES.length; i++) {
      const expected = TEST_EXERCISES[i].expected;
      const got = translations[i] || 'N/A';
      const match = got.toLowerCase() === expected.toLowerCase() ? '✅' : '❌';
      console.log(`  ${match} "${TEST_EXERCISES[i].en}"`);
      console.log(`     Expected: ${expected}`);
      console.log(`     Got:      ${got}`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(70));
  console.log('Done!');
}

main().catch(console.error);
