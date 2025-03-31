/**
 * CSS Utilities Module
 * Helper functions for CSS manipulation and theme handling
 */

/**
 * Sets a CSS variable
 * @param {string} name - The name of the variable (without --)
 * @param {string} value - The value to set
 * @param {HTMLElement} element - The element to set the variable on (defaults to :root)
 */
export function setCssVariable(name, value, element = document.documentElement) {
  element.style.setProperty(`--${name}`, value);
}

/**
 * Gets a CSS variable value
 * @param {string} name - The name of the variable (without --)
 * @param {HTMLElement} element - The element to get the variable from (defaults to :root)
 * @returns {string} The value of the CSS variable
 */
export function getCssVariable(name, element = document.documentElement) {
  return getComputedStyle(element).getPropertyValue(`--${name}`).trim();
}

/**
 * Sets multiple CSS variables at once
 * @param {Object} variables - Object with variable names as keys and values as values
 * @param {HTMLElement} element - The element to set the variables on (defaults to :root)
 */
export function setCssVariables(variables, element = document.documentElement) {
  Object.entries(variables).forEach(([name, value]) => {
    setCssVariable(name, value, element);
  });
}

/**
 * Applies a theme by setting CSS variables
 * @param {string} themeName - The name of the theme to apply ('light', 'dark', or custom)
 */
export function applyTheme(themeName) {
  const themes = {
    light: {
      'bg-color': '#ffffff',
      'text-color': '#333333',
      'primary-color': '#4a90e2',
      'secondary-color': '#f5f5f5',
      'accent-color': '#ff6b6b',
      'border-color': '#e0e0e0',
      'input-bg': '#ffffff',
      'header-bg': '#f8f9fa',
      'success-color': '#28a745',
      'error-color': '#dc3545',
      'warning-color': '#ffc107',
      'info-color': '#17a2b8',
      'code-bg': '#f8f9fa',
      'shadow-color': 'rgba(0, 0, 0, 0.1)',
    },
    dark: {
      'bg-color': '#121212',
      'text-color': '#e0e0e0',
      'primary-color': '#5a9cf2',
      'secondary-color': '#2d2d2d',
      'accent-color': '#ff7b7b',
      'border-color': '#444444',
      'input-bg': '#1e1e1e',
      'header-bg': '#1a1a1a',
      'success-color': '#48c774',
      'error-color': '#f14668',
      'warning-color': '#ffdd57',
      'info-color': '#3298dc',
      'code-bg': '#282c34',
      'shadow-color': 'rgba(0, 0, 0, 0.5)',
    },
  };

  // Get theme variables
  const themeVars = themes[themeName] || themes.light;

  // Apply theme variables
  setCssVariables(themeVars);

  // Store theme preference
  localStorage.setItem('theme', themeName);

  // Add theme class to body
  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(`theme-${themeName}`);

  // Dispatch theme change event
  document.dispatchEvent(
    new CustomEvent('themechange', {
      detail: { theme: themeName },
    })
  );
}

/**
 * Gets the current theme name
 * @returns {string} The current theme name
 */
export function getCurrentTheme() {
  return localStorage.getItem('theme') || 'light';
}

/**
 * Toggles between light and dark themes
 */
export function toggleTheme() {
  const currentTheme = getCurrentTheme();
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}

/**
 * Initializes theme from saved preference or system preference
 */
export function initializeTheme() {
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme) {
    applyTheme(savedTheme);
    return;
  }

  // Check for system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  } else {
    applyTheme('light');
  }

  // Listen for system preference changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}
