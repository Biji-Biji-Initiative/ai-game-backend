/**
 * Cucumber.js Configuration Entry Point
 * 
 * This file configures Cucumber to find our step definitions and support files.
 */

module.exports = {
  default: {
    paths: ['bdd/features/**/*.feature'],
    require: ['bdd/step-definitions/**/*.js', 'bdd/support/**/*.js'],
    format: ['progress-bar', 'html:cucumber-report.html'],
    publishQuiet: true
  },
  focus: {
    paths: ['bdd/features/focus-areas/*.feature'],
    require: ['bdd/step-definitions/**/*.js', 'bdd/support/**/*.js'],
    format: ['progress-bar', 'html:cucumber-focus-report.html'],
    publishQuiet: true
  }
};
