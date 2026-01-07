/**
 * Format seconds into a human-readable time string
 * @param seconds Number of seconds
 * @returns Formatted time string (MM:SS or H:MM:SS)
 */
export const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format a date string to a readable format
 * @param dateString ISO date string
 * @returns Formatted date string
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format a date string to show just the time
 * @param dateString ISO date string
 * @returns Formatted time string
 */
export const formatTimeFromDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/**
 * Format duration in seconds to a short string (e.g., "45m", "1h 23m")
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};
