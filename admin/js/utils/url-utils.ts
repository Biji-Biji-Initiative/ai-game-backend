/**
 * URL Utilities
 * 
 * Helper functions for working with URLs and query parameters
 */

/**
 * URL query parameters
 */
export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Parse query parameters from a URL or string
 * @param urlOrString URL or query string
 * @returns Parsed query parameters
 */
export function parseQueryParams(urlOrString: string | URL): QueryParams {
  let queryString: string;
  
  if (typeof urlOrString === 'string') {
    // Check if it's a full URL or just a query string
    if (urlOrString.includes('?')) {
      queryString = urlOrString.split('?')[1] || '';
    } else if (urlOrString.includes('=')) {
      queryString = urlOrString;
    } else {
      return {};
    }
  } else {
    // It's a URL object
    queryString = urlOrString.search.slice(1);
  }
  
  if (!queryString) {
    return {};
  }
  
  return queryString.split('&').reduce<QueryParams>((params, param) => {
    const [key, value] = param.split('=').map(part => decodeURIComponent(part));
    
    if (key) {
      params[key] = value || '';
    }
    
    return params;
  }, {});
}

/**
 * Convert query parameters to a query string
 * @param params Query parameters
 * @param options Options for serialization
 * @returns Query string
 */
export function buildQueryString(
  params: QueryParams,
  options: {
    startWithQuestionMark?: boolean;
    skipNullOrUndefined?: boolean;
    skipEmptyString?: boolean;
  } = {},
): string {
  const {
    startWithQuestionMark = false,
    skipNullOrUndefined = true,
    skipEmptyString = false,
  } = options;
  
  const parts = Object.entries(params)
    .filter(([, value]) => {
      if (skipNullOrUndefined && (value === null || value === undefined)) {
        return false;
      }
      
      if (skipEmptyString && value === '') {
        return false;
      }
      
      return true;
    })
    .map(([key, value]) => {
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    });
  
  if (parts.length === 0) {
    return '';
  }
  
  return startWithQuestionMark ? `?${parts.join('&')}` : parts.join('&');
}

/**
 * Update URL query parameters
 * @param url URL to update
 * @param params Query parameters to add or update
 * @returns Updated URL
 */
export function updateUrlParams(url: string | URL, params: QueryParams): URL {
  const urlObj = typeof url === 'string' ? new URL(url) : url;
  const searchParams = new URLSearchParams(urlObj.search);
  
  // Update or add parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      searchParams.delete(key);
    } else {
      searchParams.set(key, String(value));
    }
  });
  
  urlObj.search = searchParams.toString();
  return urlObj;
}

/**
 * Join URL paths avoiding duplicate slashes
 * @param parts URL parts to join
 * @returns Joined URL
 */
export function joinUrlPaths(...parts: string[]): string {
  return parts
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      // Remove leading/trailing slashes except for the first part
      if (part === parts[0]) {
        return part.endsWith('/') ? part.slice(0, -1) : part;
      }
      
      return part.replace(/^\/+|\/+$/g, '');
    })
    .join('/');
}

/**
 * Get the base URL of the current page
 * @returns Base URL
 */
export function getBaseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

/**
 * Get the current URL path without query parameters
 * @returns URL path
 */
export function getCurrentPath(): string {
  return window.location.pathname;
}

/**
 * Check if a string is a valid URL
 * @param url URL to check
 * @returns True if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a URL is absolute (has protocol and host)
 * @param url URL to check
 * @returns True if URL is absolute
 */
export function isAbsoluteUrl(url: string): boolean {
  return /^(?:[a-z+]+:)?\/\//i.test(url);
}

/**
 * Convert a relative URL to an absolute URL
 * @param url Relative or absolute URL
 * @param baseUrl Base URL to use for relative URLs
 * @returns Absolute URL
 */
export function toAbsoluteUrl(url: string, baseUrl = getBaseUrl()): string {
  if (isAbsoluteUrl(url)) {
    return url;
  }
  
  return new URL(url, baseUrl).toString();
}

/**
 * Get a specific query parameter from the current URL
 * @param paramName Parameter name
 * @returns Parameter value or null
 */
export function getQueryParam(paramName: string): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(paramName);
}

/**
 * Get the filename from a URL or path
 * @param urlOrPath URL or path
 * @returns Filename
 */
export function getFilenameFromUrl(urlOrPath: string): string {
  return urlOrPath.split(/[#?]/)[0].split('/').pop() || '';
}

/**
 * Get the file extension from a URL or path
 * @param urlOrPath URL or path
 * @returns File extension
 */
export function getFileExtension(urlOrPath: string): string {
  const filename = getFilenameFromUrl(urlOrPath);
  return filename.includes('.') ? filename.split('.').pop() || '' : '';
} 