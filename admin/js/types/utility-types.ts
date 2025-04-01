/**
 * Utility Types and Functions
 * 
 * This file provides common utility types and functions to improve type safety across the application.
 */

/**
 * Makes all properties in T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Makes all properties in T required recursively
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * A type that allows either all properties from T or none
 */
export type AllOrNone<T> = T | { [K in keyof T]?: never };

/**
 * A type that ensures at least one property from T is present
 */
export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[keyof T];

/**
 * Type that removes 'null' from a union type
 */
export type NonNull<T> = T extends null ? never : T;

/**
 * Type that removes 'undefined' from a union type
 */
export type NonUndefined<T> = T extends undefined ? never : T;

/**
 * Type that keeps only non-nullable (non-null and non-undefined) values
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Type safe function to get a property value with a default
 * if the property is undefined or null
 * 
 * @param obj The object to get a property from
 * @param key The property key
 * @param defaultValue The default value to return if property is null/undefined
 * @returns The property value or default value
 */
export function getPropertyWithDefault<T, K extends keyof T>(
  obj: T, 
  key: K, 
  defaultValue: NonNullable<T[K]>
): NonNullable<T[K]> {
  const value = obj[key];
  return (value === undefined || value === null) ? defaultValue : value as NonNullable<T[K]>;
}

/**
 * Creates a type-safe defaults object by providing default values
 * for any missing properties in the options object
 * 
 * @param options User provided options
 * @param defaults Default values
 * @returns A complete object with defaults applied
 */
export function applyDefaults<T>(options: Partial<T>, defaults: T): T {
  return { ...defaults, ...options };
}

/**
 * Ensure a string value is provided, using a default if undefined
 * 
 * @param value The value to check
 * @param defaultValue Default value to use if value is undefined
 * @returns Non-empty string
 */
export function ensureString(value: string | undefined | null, defaultValue: string): string {
  return (value === undefined || value === null) ? defaultValue : value;
}

/**
 * Ensure a number value is provided, using a default if undefined
 * 
 * @param value The value to check
 * @param defaultValue Default value to use if value is undefined
 * @returns Number
 */
export function ensureNumber(value: number | undefined | null, defaultValue: number): number {
  return (value === undefined || value === null) ? defaultValue : value;
}

/**
 * Type-safe way to check if a variable is defined (not undefined or null)
 * 
 * @param value Value to check
 * @returns True if value is not undefined and not null
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
} 