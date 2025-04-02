declare module 'tailwindcss' {
  const plugin: unknown;
  export default plugin;
}

declare module 'autoprefixer' {
  const plugin: unknown;
  export default plugin;
}

// Declare Tailwind directives for TypeScript
declare namespace React {
  interface CSSProperties {
    '@apply'?: string;
    '@tailwind'?: string;
    '@layer'?: string;
  }
}
