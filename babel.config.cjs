module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current'
        },
        modules: false
      }
    ]
  ],
  plugins: [
    '@babel/plugin-syntax-import-assertions'
  ],
  assumptions: {
    setPublicClassFields: true
  }
}; 