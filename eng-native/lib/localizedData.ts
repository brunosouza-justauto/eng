import i18n from './i18n';
import { SupportedLocale } from './i18n';

/**
 * Get a localized field from an item that has _en and _pt suffixed columns.
 * Falls back to English if the localized field is empty, then to the original field.
 */
export function getLocalizedField<T extends Record<string, any>>(
  item: T,
  field: string
): string {
  const locale = i18n.language as SupportedLocale;
  const localizedKey = `${field}_${locale}` as keyof T;
  const fallbackKey = `${field}_en` as keyof T;
  const originalKey = field as keyof T;

  return (
    (item[localizedKey] as string) ||
    (item[fallbackKey] as string) ||
    (item[originalKey] as string) ||
    ''
  );
}

// Exercise helpers
export interface LocalizedExercise {
  name?: string;
  original_name?: string;
  name_en?: string | null;
  name_pt?: string | null;
  instructions?: string;
  description_en?: string | null;
  description_pt?: string | null;
}

export function getExerciseName(exercise: LocalizedExercise): string {
  const locale = i18n.language as SupportedLocale;

  if (locale === 'pt' && exercise.name_pt) {
    return exercise.name_pt;
  }
  if (exercise.name_en) {
    return exercise.name_en;
  }
  return exercise.name || exercise.original_name || '';
}

export function getExerciseDescription(exercise: LocalizedExercise): string {
  const locale = i18n.language as SupportedLocale;

  if (locale === 'pt' && exercise.description_pt) {
    return exercise.description_pt;
  }
  if (exercise.description_en) {
    return exercise.description_en;
  }
  return exercise.instructions || '';
}

// Food item helpers
export interface LocalizedFoodItem {
  food_name?: string;
  food_name_en?: string | null;
  food_name_pt?: string | null;
}

export function getFoodName(food: LocalizedFoodItem): string {
  const locale = i18n.language as SupportedLocale;

  if (locale === 'pt' && food.food_name_pt) {
    return food.food_name_pt;
  }
  if (food.food_name_en) {
    return food.food_name_en;
  }
  return food.food_name || '';
}

// Supplement helpers
export interface LocalizedSupplement {
  name?: string;
  name_en?: string | null;
  name_pt?: string | null;
}

export function getSupplementName(supplement: LocalizedSupplement): string {
  const locale = i18n.language as SupportedLocale;

  if (locale === 'pt' && supplement.name_pt) {
    return supplement.name_pt;
  }
  if (supplement.name_en) {
    return supplement.name_en;
  }
  return supplement.name || '';
}

// Meal helpers
export interface LocalizedMeal {
  name?: string;
  name_en?: string | null;
  name_pt?: string | null;
  notes?: string;
  notes_en?: string | null;
  notes_pt?: string | null;
}

export function getMealName(meal: LocalizedMeal): string {
  const locale = i18n.language as SupportedLocale;

  if (locale === 'pt' && meal.name_pt) {
    return meal.name_pt;
  }
  if (meal.name_en) {
    return meal.name_en;
  }
  return meal.name || '';
}

// Notes helpers (for workout programs, assigned exercises, nutrition plans, meals)
export interface LocalizedNotes {
  notes?: string | null;
  notes_en?: string | null;
  notes_pt?: string | null;
}

export function getNotes(item: LocalizedNotes): string {
  const locale = i18n.language as SupportedLocale;

  if (locale === 'pt' && item.notes_pt) {
    return item.notes_pt;
  }
  if (item.notes_en) {
    return item.notes_en;
  }
  return item.notes || '';
}

// Program template helpers
export interface LocalizedProgramTemplate {
  description?: string | null;
  description_en?: string | null;
  description_pt?: string | null;
}

export function getProgramDescription(program: LocalizedProgramTemplate): string {
  const locale = i18n.language as SupportedLocale;

  if (locale === 'pt' && program.description_pt) {
    return program.description_pt;
  }
  if (program.description_en) {
    return program.description_en;
  }
  return program.description || '';
}

// Nutrition plan helpers
export interface LocalizedNutritionPlan {
  description?: string | null;
  description_en?: string | null;
  description_pt?: string | null;
}

export function getNutritionPlanDescription(plan: LocalizedNutritionPlan): string {
  const locale = i18n.language as SupportedLocale;

  if (locale === 'pt' && plan.description_pt) {
    return plan.description_pt;
  }
  if (plan.description_en) {
    return plan.description_en;
  }
  return plan.description || '';
}

// Generic helper for any localized text field
export function getLocalizedText(
  item: { [key: string]: any },
  fieldName: string
): string {
  const locale = i18n.language as SupportedLocale;
  const localizedKey = `${fieldName}_${locale}`;
  const englishKey = `${fieldName}_en`;

  if (locale === 'pt' && item[localizedKey]) {
    return item[localizedKey];
  }
  if (item[englishKey]) {
    return item[englishKey];
  }
  return item[fieldName] || '';
}
