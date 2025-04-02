// Types improved by ts-improve-types
/**
 * Date Utilities Module
 * Helper functions for date formatting and parsing
 */

/**
 * Format types for date formatting
 */
type DateFormatType = 'iso' | 'readable' | 'time' | 'date' | 'timeago';

/**
 * Date difference object returned by getDateDifference
 */
interface DateDifference {
  milliseconds: number;
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
}

/**
 * Formats a date to a string
 * @param {Date|string|number} date - The date to format
 * @param {DateFormatType} format - The format to use (iso, readable, time, timeago)
 * @returns {string} The formatted date
 */
export function formatDate(e: Date | string | number, format: DateFormatType = 'readable'): string {
  // Convert to Date object if string or number
  const dateObj = e instanceof Date ? e : new Date(e);

  // Check if valid date
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  // Format based on the type
  switch (format) {
    case 'iso':
      return dateObj.toISOString();
    case 'readable':
      return dateObj.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    // case "timeago":
    // Requires a library like timeago.js or similar implementation
    // return getTimeAgo(dateObj); // Commented out as getTimeAgo is not defined
    case 'time':
      return dateObj.toLocaleTimeString();
    case 'date':
      return dateObj.toLocaleDateString();
    default:
      return dateObj.toLocaleString();
  }
}

/**
 * Converts a date string to a Date object
 * @param {string} dateString - The date string to parse
 * @returns {Date} The parsed Date object
 */
export function parseDateString(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Gets the relative date between two dates
 * @param {Date|string|number} date1 - The first date
 * @param {Date|string|number} date2 - The second date
 * @returns {DateDifference} The difference in various units
 */
export function getDateDifference(
  date1: Date | string | number,
  date2: Date | string | number,
): DateDifference {
  // Convert to Date objects if string or number
  const dateObj1 = date1 instanceof Date ? date1 : new Date(date1);
  const dateObj2 = date2 instanceof Date ? date2 : new Date(date2);

  // Check if valid dates
  if (isNaN(dateObj1.getTime()) || isNaN(dateObj2.getTime())) {
    throw new Error('Invalid date');
  }

  const diffMs = Math.abs(dateObj2.getTime() - dateObj1.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  return {
    milliseconds: diffMs,
    seconds: diffSec,
    minutes: diffMin,
    hours: diffHour,
    days: diffDay,
  };
}

/**
 * Formats a duration in milliseconds to a human-readable string
 * @param {number} duration - The duration in milliseconds
 * @returns {string} The formatted duration
 */
export function formatDuration(duration: number): string {
  if (duration < 1000) {
    return duration + 'ms';
  } else if (duration < 60000) {
    return (duration / 1000).toFixed(2) + 's';
  } else if (duration < 3600000) {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return minutes + 'm ' + seconds + 's';
  } else {
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    return hours + 'h ' + minutes + 'm';
  }
}
