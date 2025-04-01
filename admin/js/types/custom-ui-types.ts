/**
 * Custom interfaces to bridge gaps between implementation and types
 */

export interface Container {
  id: string;
  element: HTMLElement;
}

export interface FormSchema {
  fields: Array<{
    name: string;
    type: string;
    required?: boolean;
    label?: string;
    placeholder?: string;
    defaultValue?: any;
    options?: Array<{
      value: string;
      label: string;
    }>;
    validation?: {
      pattern?: string;
      message?: string;
      min?: number;
      max?: number;
      minLength?: number;
      maxLength?: number;
    };
  }>;
  submitButton?: {
    text: string;
    class?: string;
  };
  cancelButton?: {
    text: string;
    class?: string;
  };
  layout?: 'vertical' | 'horizontal' | 'grid';
}

export interface EntityViewOptions {
  container: string | HTMLElement;
  entities: any[];
  onSelect?: (entity: any) => void;
  onDelete?: (entity: any) => void;
  onEdit?: (entity: any) => void;
  displayProperties?: string[];
  primaryKey?: string;
  groupBy?: string;
  searchEnabled?: boolean;
  paginationEnabled?: boolean;
  itemsPerPage?: number;
}

// This is a convenient way to make all properties in a type optional
export type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P];
}; 