module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: [
    '@babel/plugin-transform-runtime',
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator',
    // Add plugin to handle CommonJS/ESM interop
    ['@babel/plugin-transform-modules-commonjs', {
      allowTopLevelThis: true,
      loose: true,
      strict: false,
    }]
  ],
};
