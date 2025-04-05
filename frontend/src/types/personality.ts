// Trait represents a cognitive characteristic or thinking tendency
export interface Trait {
  id: string;
  name: string;
  description: string;
  value: number; // 0-100
  lowLabel?: string; // Label for low end of spectrum
  highLabel?: string; // Label for high end of spectrum
}

// Attitude represents approach or feeling towards AI
export interface Attitude {
  id: string;
  attitude: string;
  description: string;
  strength: number; // 0-100
  lowLabel?: string; // Label for low end of spectrum
  highLabel?: string; // Label for high end of spectrum
}

// Personality represents a user's cognitive profile
export interface Personality {
  traits?: Trait[];
  attitudes?: Attitude[];
  strengths?: string[]; // Areas of human advantage
  strengthDescriptions?: string[];
  interpersonalInsights?: string;
  collaborationStyle?: string;
  communicationPreference?: string;
} 