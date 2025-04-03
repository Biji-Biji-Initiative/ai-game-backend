import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setupNodeEvents(on, config) {
      // implement node event listeners here if needed in the future
    },
  },
  viewportWidth: 1280,
  viewportHeight: 720,
  video: false,
  screenshotOnRunFailure: true,
});
