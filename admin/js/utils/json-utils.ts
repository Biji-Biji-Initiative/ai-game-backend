// Types improved by ts-improve-types
/**
 * JSON Utility Functions
 * Utilities for working with JSON data
 */

/**
 * Determines the type of a JSON token for syntax highlighting
 * @param token The token to analyze
 * @returns Token type classification
 */
export function determineTokenType(
  token: string,
): 'property' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' | 'unknown' {
  // Handle property names (with quotes and colon)
  if (/^["'].*["']\s*:/.test(token)) {
    return 'property';
  }
  // Handle string values
  else if (/^["'].*["']$/.test(token)) {
    return 'string';
  }
  // Handle numeric values
  else if (/^-?\d+\.?\d*([eE][-+]?\d+)?$/.test(token)) {
    return 'number';
  }
  // Handle boolean values
  else if (/^(true|false)$/.test(token)) {
    return 'boolean';
  }
  // Handle null value
  else if (/^null$/.test(token)) {
    return 'null';
  }
  // Handle punctuation
  else if (/^[{}\[\],]$/.test(token)) {
    return 'punctuation';
  }
  // Unknown token type
  return 'unknown';
}

/**
 * Formats JSON string with syntax highlighting
 * @param jsonString JSON string to format
 * @returns HTML string with syntax highlighting
 */
export function formatJsonSyntaxHighlight(jsonString: string): string {
  if (!jsonString) return '';

  // Function to escape HTML
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Tokenize the JSON string
  const tokenize = (text: string): string => {
    // Add line breaks
    let result = text.replace(/({)|(})|(\[)|(\])|(,)/g, '$1$2$3$4$5\n');

    // Add indentation
    let indentLevel = 0;
    const lines = result.split('\n');
    result = lines
      .map(line => {
        let indent = ' '.repeat(indentLevel * 2);

        // Adjust indent level based on current line
        if (line.includes('}') || line.includes(']')) {
          indentLevel = Math.max(0, indentLevel - 1);
          indent = ' '.repeat(indentLevel * 2);
        }

        const formattedLine = indent + line;

        // Adjust indent level for next line
        if (line.includes('{') || line.includes('[')) {
          indentLevel++;
        }

        return formattedLine;
      })
      .join('\n');

    // Split into tokens
    const tokens =
      result.match(/(".*?"|'.*?'|\{|\}|\[|\]|,|\d+\.\d+|\d+|true|false|null|[^",\{\}\[\]\s]+)/g) ||
      [];

    // Apply syntax highlighting to each token
    return tokens
      .map(token => {
        const escapedToken = escapeHtml(token);
        const tokenType = determineTokenType(token);

        switch (tokenType) {
          case 'property':
            return `<span class="json-property">${escapedToken}</span>`;
          case 'string':
            return `<span class="json-string">${escapedToken}</span>`;
          case 'number':
            return `<span class="json-number">${escapedToken}</span>`;
          case 'boolean':
            return `<span class="json-boolean">${escapedToken}</span>`;
          case 'null':
            return `<span class="json-null">${escapedToken}</span>`;
          case 'punctuation':
            return `<span class="json-punctuation">${escapedToken}</span>`;
          default:
            return escapedToken;
        }
      })
      .join('');
  };

  try {
    // Pretty-print the JSON
    const obj = JSON.parse(jsonString);
    const prettyJson = JSON.stringify(obj, null, 2);

    // Tokenize and highlight
    return tokenize(prettyJson);
  } catch (error) {
    // If parsing fails, just tokenize as is
    return `<span class="json-error">Invalid JSON: ${escapeHtml(String(error))}</span><br>${tokenize(jsonString)}`;
  }
}

/**
 * Pretty-prints JSON data for display
 * @param data Data to pretty-print
 * @returns Formatted string
 */
export function safeStringifyJSON(data: unknown, defaultValue = '{}'): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    // Return defaultValue on error instead of error message string
    // logger.error('Error formatting JSON:', error); // Optionally log error
    return defaultValue;
  }
}

/**
 * Safely parses a JSON string
 * @param jsonString String to parse
 * @param fallback Fallback value if parsing fails
 * @returns Parsed object or fallback value
 */
export function safeParseJSON<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return fallback;
  }
}

/**
 * Gets a value from an object using a dot-notation path
 * @param obj Object to extract from
 * @param path Path to the property (e.g., 'user.address.city')
 * @param defaultValue Default value if property doesn't exist
 * @returns Extracted value or default value
 */
export function getValueByPath<T>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue: T,
): T | unknown {
  if (!obj || !path) return defaultValue;

  try {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      // Check if current is an indexable object before accessing property
      if (typeof current !== 'object' || current === null) {
        return defaultValue;
      }
      // Now TypeScript knows current is likely an object, but we need to assert it for indexing
      current = (current as Record<string, unknown>)[part];
    }

    return current !== undefined ? current : defaultValue;
  } catch (error) {
    console.error(`Error extracting path ${path}:`, error);
    return defaultValue;
  }
}

/**
 * Format JSON data for display
 * @param data Data to format
 * @returns Formatted JSON string
 */
export function formatJSON(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return `Error formatting JSON: ${error instanceof Error ? error.message : String(error)}`;
  }
}
