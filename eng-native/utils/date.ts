/**
 * Get today's date in YYYY-MM-DD format using LOCAL timezone
 * This is important because toISOString() uses UTC which can be a different day
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get current day of week (1=Monday, 7=Sunday)
 */
export const getCurrentDayOfWeek = (): number => {
  const today = new Date();
  return today.getDay() === 0 ? 7 : today.getDay();
};
