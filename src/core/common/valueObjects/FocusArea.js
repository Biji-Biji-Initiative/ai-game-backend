/**
 * FocusArea Value Object
 * 
 * Represents and validates focus areas in the system.
 * Handles normalization and validation of focus area codes.
 * Follows Value Object pattern - immutable and defined by its value.
 */

class FocusArea {
  // Valid focus areas with their normalized codes
  static VALID_AREAS = [
    'ai_ethics',
    'ai_literacy',
    'ai_capabilities',
    'ai_limitations',
    'ai_impact',
    'critical_thinking',
    'technical_understanding',
    'philosophy_of_mind',
    'human_ai_collaboration',
    'general'
  ];
  
  // Mapping from display names to codes
  static DISPLAY_TO_CODE = {
    'AI Ethics': 'ai_ethics',
    'AI Literacy': 'ai_literacy',
    'AI Capabilities': 'ai_capabilities',
    'AI Limitations': 'ai_limitations',
    'AI Impact': 'ai_impact',
    'Critical Thinking': 'critical_thinking',
    'Technical Understanding': 'technical_understanding',
    'Philosophy of Mind': 'philosophy_of_mind',
    'Human-AI Collaboration': 'human_ai_collaboration',
    'General': 'general'
  };
  
  // Mapping from codes to display names
  static CODE_TO_DISPLAY = {
    'ai_ethics': 'AI Ethics',
    'ai_literacy': 'AI Literacy',
    'ai_capabilities': 'AI Capabilities',
    'ai_limitations': 'AI Limitations',
    'ai_impact': 'AI Impact',
    'critical_thinking': 'Critical Thinking',
    'technical_understanding': 'Technical Understanding',
    'philosophy_of_mind': 'Philosophy of Mind',
    'human_ai_collaboration': 'Human-AI Collaboration',
    'general': 'General'
  };
  
  /**
   * Create a new FocusArea value object
   * @param {string} value - Focus area code or display name
   * @throws {Error} If the focus area is invalid
   */
  constructor(value) {
    if (!value) {
      throw new Error('FocusArea cannot be empty');
    }
    
    // Normalize the value to a code
    const normalizedValue = this.normalizeToCode(value);
    
    if (!FocusArea.isValid(normalizedValue)) {
      throw new Error(`Invalid focus area: ${value}`);
    }
    
    this._code = normalizedValue;
    this._displayName = FocusArea.CODE_TO_DISPLAY[normalizedValue] || normalizedValue;
    
    Object.freeze(this);
  }
  
  /**
   * Get the focus area code
   * @returns {string} Focus area code
   */
  get code() {
    return this._code;
  }
  
  /**
   * Get the display name for the focus area
   * @returns {string} Display name
   */
  get displayName() {
    return this._displayName;
  }
  
  /**
   * Normalize a value to a focus area code
   * @param {string} value - Focus area value (code or display name)
   * @returns {string} Normalized focus area code
   * @private
   */
  normalizeToCode(value) {
    const strValue = String(value).trim();
    
    // If it's already a code, return it
    if (FocusArea.VALID_AREAS.includes(strValue.toLowerCase())) {
      return strValue.toLowerCase();
    }
    
    // If it's a display name, convert to code
    const fromDisplay = FocusArea.DISPLAY_TO_CODE[strValue];
    if (fromDisplay) {
      return fromDisplay;
    }
    
    // Try to normalize manually
    return strValue
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/-/g, '_');
  }
  
  /**
   * Check if two FocusArea objects are equal
   * @param {FocusArea} other - Another FocusArea object to compare
   * @returns {boolean} True if areas are equal
   */
  equals(other) {
    if (!(other instanceof FocusArea)) {
      return false;
    }
    return this.code === other.code;
  }
  
  /**
   * Validate focus area code
   * @param {string} code - Focus area code to validate
   * @returns {boolean} True if the code is valid
   */
  static isValid(code) {
    return FocusArea.VALID_AREAS.includes(String(code).toLowerCase());
  }
  
  /**
   * Create a FocusArea object from a string
   * @param {string} value - Focus area value
   * @returns {FocusArea|null} FocusArea object or null if invalid
   */
  static create(value) {
    try {
      return new FocusArea(value);
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Get all valid focus areas as an array of objects
   * @returns {Array<Object>} Array of focus area objects
   */
  static getAll() {
    return FocusArea.VALID_AREAS.map(code => ({
      code,
      displayName: FocusArea.CODE_TO_DISPLAY[code] || code
    }));
  }
  
  /**
   * Convert to string representation (code)
   * @returns {string} String representation
   */
  toString() {
    return this._code;
  }
  
  /**
   * Convert to primitive value when serializing
   * @returns {string} The focus area code
   */
  toJSON() {
    return this._code;
  }
}

module.exports = FocusArea; 