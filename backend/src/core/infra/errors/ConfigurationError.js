class ConfigurationError extends Error { constructor(message, options = {}) { super(message, options); this.name = 'ConfigurationError'; } } export default ConfigurationError;
