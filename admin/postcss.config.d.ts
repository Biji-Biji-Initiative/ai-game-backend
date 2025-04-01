declare module 'tailwindcss' {
  const plugin: any;
  export default plugin;
}

declare module 'autoprefixer' {
  const plugin: any;
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