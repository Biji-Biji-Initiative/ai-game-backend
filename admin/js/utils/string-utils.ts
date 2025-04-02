// Types improved by ts-improve-types
/**
 * String Utility Functions
 * Various utilities for string manipulation
 */

/**
 * Truncates a string to the specified length and adds an ellipsis
 * @param str String to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

/**
 * Capitalizes the first letter of a string
 * @param str String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a camelCase string to Title Case
 * @param camelCase String in camelCase
 * @returns String in Title Case
 */
export function camelToTitleCase(camelCase: string): string {
  if (!camelCase) return '';

  // Add space before capital letters and capitalize first letter
  return capitalize(camelCase.replace(/([A-Z])/g, ' $1')).trim();
}

/**
 * Converts a string to camelCase
 * @param str String to convert
 * @returns camelCase string
 */
export function toCamelCase(str: string): string {
  if (!str) return '';

  // Replace spaces, hyphens and underscores with spaces, then camelCase
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^[A-Z]/, c => c.toLowerCase());
}

/**
 * Converts a string to snake_case
 * @param str String to convert
 * @returns snake_case string
 */
export function toSnakeCase(str: string): string {
  if (!str) return '';

  // Handle camelCase
  let result = str.replace(/([a-z])([A-Z])/g, '$1_$2');

  // Handle spaces, hyphens, and other separators
  result = result.replace(/[\s-]+/g, '_');

  return result.toLowerCase();
}

/**
 * Converts a string to kebab-case
 * @param str String to convert
 * @returns kebab-case string
 */
export function toKebabCase(str: string): string {
  if (!str) return '';

  // Handle camelCase
  let result = str.replace(/([a-z])([A-Z])/g, '$1-$2');

  // Handle spaces, underscores, and other separators
  result = result.replace(/[\s_]+/g, '-');

  return result.toLowerCase();
}

/**
 * Escapes HTML special characters in a string
 * @param html String with potential HTML content
 * @returns Escaped HTML string
 */
export function escapeHtml(html: string): string {
  if (!html) return '';

  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Strips HTML tags from a string
 * @param html String with HTML content
 * @returns String without HTML tags
 */
export function stripHtml(html: string): string {
  if (!html) return '';

  // Remove HTML tags using regex
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Generates a UUID v4 string
 * @returns UUID v4 string
 */
export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Checks if a string is a valid URL
 * @param str String to check
 * @returns Whether the string is a valid URL
 */
export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a string is a valid email address
 * @param email String to check
 * @returns Whether the string is a valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Gets the file extension from a filename
 * @param filename Filename to parse
 * @returns File extension without the dot
 */
export function getFileExtension(filename: string): string {
  if (!filename) return '';

  const parts = filename.split('.');
  if (parts.length === 1) return '';

  return parts[parts.length - 1].toLowerCase();
}

/**
 * Formats a number as bytes with an appropriate unit
 * @param bytes Number of bytes
 * @param decimals Number of decimal places
 * @returns Formatted string (e.g., "1.5 KB")
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Pluralizes a word based on count
 * @param word Word to pluralize
 * @param count Count to determine pluralization
 * @returns Pluralized word
 */
export function pluralize(word: string, count: number): string {
  if (count === 1) return word;

  // Very simple English pluralization rules
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies';
  } else if (
    word.endsWith('s') ||
    word.endsWith('x') ||
    word.endsWith('z') ||
    word.endsWith('ch') ||
    word.endsWith('sh')
  ) {
    return word + 'es';
  } else {
    return word + 's';
  }
}
