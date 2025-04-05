const plugin = require('tailwindcss/plugin');

module.exports = plugin(function ({ addVariant, e }) {
  // Add high contrast variant
  addVariant('high-contrast', ({ modifySelectors, separator }) => {
    modifySelectors(({ className }) => {
      return `.high-contrast .${e(`high-contrast${separator}${className}`)}`;
    });
  });

  // Add larger text variant
  addVariant('larger-text', ({ modifySelectors, separator }) => {
    modifySelectors(({ className }) => {
      return `.larger-text .${e(`larger-text${separator}${className}`)}`;
    });
  });

  // Add reduced motion variant
  addVariant('reduced-motion', ({ modifySelectors, separator }) => {
    modifySelectors(({ className }) => {
      return `.reduced-motion .${e(`reduced-motion${separator}${className}`)}`;
    });
  });
});
