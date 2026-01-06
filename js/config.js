let config;

try {
  // Not commited, listed in .gitignore
  config = (await import('../config.dev.js')).default;
} catch {
  config = (await import('../config.js')).default;
}

export default config;
