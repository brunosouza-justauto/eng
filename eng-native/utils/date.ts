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
 * Get UTC timestamp range for a local date
 * This converts local midnight-to-midnight to proper UTC timestamps
 * for querying databases that store timestamps in UTC
 *
 * Example: For a user in UTC+11 on 2026-01-12 local:
 * - Local midnight = 2026-01-11T13:00:00Z (UTC)
 * - Local end of day = 2026-01-12T12:59:59Z (UTC)
 */
export const getLocalDateRangeInUTC = (date: Date = new Date()): { startUTC: string; endUTC: string } => {
  // Get local date components
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Create local midnight and end of day
  const localStart = new Date(year, month, day, 0, 0, 0, 0);
  const localEnd = new Date(year, month, day, 23, 59, 59, 999);

  // Convert to ISO strings (which are in UTC)
  return {
    startUTC: localStart.toISOString(),
    endUTC: localEnd.toISOString(),
  };
};

/**
 * Get current day of week (1=Monday, 7=Sunday)
 */
export const getCurrentDayOfWeek = (): number => {
  const today = new Date();
  return today.getDay() === 0 ? 7 : today.getDay();
};
