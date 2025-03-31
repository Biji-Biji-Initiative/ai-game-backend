import { sentryRollupPlugin } from "@sentry/rollup-plugin";

export default {
  output: {
    sourcemap: true, // Source map generation must be turned on
  },
  plugins: [
    // Put the Sentry rollup plugin after all other plugins
    sentryRollupPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "biji-biji-non-profits",
      project: "ai-game",
    }),
  ],
};
