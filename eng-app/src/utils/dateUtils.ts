/**
 * Format a date as YYYY-MM-DD
 * @param date Date to format
 * @returns Formatted date string in YYYY-MM-DD format
 */
export const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Format a date for display (e.g., "Monday, January 1, 2023")
 * @param date Date to format or date string in YYYY-MM-DD format
 * @returns Formatted date string
 */
export const formatDateForDisplay = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * Format a time for display (e.g., "9:30 AM")
 * @param time Time string in HH:MM:SS format
 * @returns Formatted time string
 */
export const formatTimeForDisplay = (time: string): string => {
    // Parse the time string (assumes format: "HH:MM:SS")
    const [hours, minutes] = time.split(':').map(Number);
    
    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12; // Convert 0 to 12
    
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
};

/**
 * Get current date as YYYY-MM-DD
 * @returns Current date as string in YYYY-MM-DD format
 */
export const getCurrentDate = (): string => {
    return formatDate(new Date());
};

/**
 * Check if a date string is in the past
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns true if date is in the past, false otherwise
 */
export const isDateInPast = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of today
    return date < today;
};

/**
 * Check if a date string is today
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns true if date is today, false otherwise
 */
export const isToday = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
}; 