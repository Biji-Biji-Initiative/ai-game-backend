/**
 * Date Utilities Module
 * Helper functions for date formatting and parsing
 */

/**
 * Formats a date to a string
 * @param {Date|string|number} date - The date to format
 * @param {string} format - The format to use (iso, readable, time, timeago)
 * @returns {string} The formatted date
 */
export function formatDate(date, format = 'readable') {
  // Convert to Date object if string or number
  const dateObj = date instanceof Date ? date : new Date(date);

  // Check if valid date
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  switch (format) {
    case 'iso':
      return dateObj.toISOString();

    case 'readable':
      return dateObj.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    case 'time':
      return dateObj.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

    case 'date':
      return dateObj.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    case 'timeago':
      return getTimeAgo(dateObj);

    default:
      return dateObj.toString();
  }
}

/**
 * Gets a human-readable time ago string
 * @param {Date|string|number} date - The date to get time ago for
 * @returns {string} The time ago string
 */
export function getTimeAgo(date) {
  // Convert to Date object if string or number
  const dateObj = date instanceof Date ? date : new Date(date);

  // Check if valid date
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  const now = new Date();
  const diffMs = now - dateObj;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  if (diffSec < 60) {
    return diffSec + ' second' + (diffSec !== 1 ? 's' : '') + ' ago';
  } else if (diffMin < 60) {
    return diffMin + ' minute' + (diffMin !== 1 ? 's' : '') + ' ago';
  } else if (diffHour < 24) {
    return diffHour + ' hour' + (diffHour !== 1 ? 's' : '') + ' ago';
  } else if (diffDay < 30) {
    return diffDay + ' day' + (diffDay !== 1 ? 's' : '') + ' ago';
  } else if (diffMonth < 12) {
    return diffMonth + ' month' + (diffMonth !== 1 ? 's' : '') + ' ago';
  } else {
    return diffYear + ' year' + (diffYear !== 1 ? 's' : '') + ' ago';
  }
}

/**
 * Parses a date string into a Date object
 * @param {string} dateString - The date string to parse
 * @returns {Date} The parsed Date object
 */
export function parseDate(dateString) {
  return new Date(dateString);
}

/**
 * Gets the relative date between two dates
 * @param {Date|string|number} date1 - The first date
 * @param {Date|string|number} date2 - The second date
 * @returns {Object} The difference in various units
 */
export function getDateDifference(date1, date2) {
  // Convert to Date objects if string or number
  const dateObj1 = date1 instanceof Date ? date1 : new Date(date1);
  const dateObj2 = date2 instanceof Date ? date2 : new Date(date2);

  // Check if valid dates
  if (isNaN(dateObj1.getTime()) || isNaN(dateObj2.getTime())) {
    throw new Error('Invalid date');
  }

  const diffMs = Math.abs(dateObj2 - dateObj1);
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
export function formatDuration(duration) {
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
