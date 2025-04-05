// Mock UI components for testing
import React from 'react';

// Create mock implementation for Alert components
export const Alert = ({ children, className }) => (
  <div data-testid="alert" className={className}>{children}</div>
);

export const AlertDescription = ({ children }) => (
  <div data-testid="alert-description">{children}</div>
);

// Create mock implementation for Badge component
export const Badge = ({ children, className, variant }) => (
  <span data-testid="badge" className={className} data-variant={variant}>{children}</span>
);

// Create mock implementation for Progress component
export const Progress = ({ value, className }) => (
  <div data-testid="progress" className={className} data-value={value}></div>
);

// Create mock implementation for Card components
export const Card = ({ children, className }) => (
  <div data-testid="card" className={className}>{children}</div>
);

export const CardHeader = ({ children }) => (
  <div data-testid="card-header">{children}</div>
);

export const CardTitle = ({ children, className }) => (
  <div data-testid="card-title" className={className}>{children}</div>
);

export const CardDescription = ({ children }) => (
  <div data-testid="card-description">{children}</div>
);

export const CardContent = ({ children }) => (
  <div data-testid="card-content">{children}</div>
);

export const CardFooter = ({ children, className }) => (
  <div data-testid="card-footer" className={className}>{children}</div>
);

// Create mock implementation for Tabs components
export const Tabs = ({ children, defaultValue }) => (
  <div data-testid="tabs" data-default-value={defaultValue}>{children}</div>
);

export const TabsList = ({ children, className }) => (
  <div data-testid="tabs-list" className={className}>{children}</div>
);

export const TabsTrigger = ({ children, value }) => (
  <div data-testid="tabs-trigger" data-value={value}>{children}</div>
);

export const TabsContent = ({ children, value }) => (
  <div data-testid="tabs-content" data-value={value}>{children}</div>
);

// Create mock implementation for Skeleton component
export const Skeleton = ({ className }) => (
  <div data-testid="skeleton" className={className}></div>
);

// Create mock implementation for Button component
export const Button = ({ children, className, variant, onClick, disabled }) => (
  <button 
    data-testid="button" 
    className={className} 
    data-variant={variant} 
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

// Create mock implementation for Switch component
export const Switch = ({ checked, onCheckedChange, className }) => (
  <input 
    type="checkbox" 
    data-testid="switch" 
    className={className} 
    checked={checked} 
    onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)} 
  />
);

// Create mock implementation for Slider component
export const Slider = ({ value, onValueChange, min, max, step, className }) => (
  <input 
    type="range" 
    data-testid="slider" 
    className={className} 
    value={value} 
    min={min} 
    max={max} 
    step={step} 
    onChange={(e) => onValueChange && onValueChange([parseInt(e.target.value, 10)])} 
  />
);

// Create mock implementation for Textarea component
export const Textarea = ({ value, onChange, placeholder, className, disabled }) => (
  <textarea 
    data-testid="textarea" 
    className={className} 
    value={value} 
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
  />
);

// Create mock implementation for Select components
export const Select = ({ children }) => (
  <div data-testid="select">{children}</div>
);

export const SelectTrigger = ({ children, className }) => (
  <div data-testid="select-trigger" className={className}>{children}</div>
);

export const SelectValue = ({ children }) => (
  <div data-testid="select-value">{children}</div>
);

export const SelectContent = ({ children, className }) => (
  <div data-testid="select-content" className={className}>{children}</div>
);

export const SelectGroup = ({ children }) => (
  <div data-testid="select-group">{children}</div>
);

export const SelectItem = ({ children, value }) => (
  <div data-testid="select-item" data-value={value}>{children}</div>
); 