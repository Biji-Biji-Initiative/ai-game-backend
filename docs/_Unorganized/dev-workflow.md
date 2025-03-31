# Development Workflow Guide

## Code Quality Tools Setup

We've implemented automated code quality checks to ensure consistent code style and catch errors early in the development process.

### Pre-commit Hooks

We use Husky and lint-staged to automatically run code quality checks before each commit.

When you make a commit, the following will happen automatically:

1. ESLint will check your code for errors and fix them when possible
2. Prettier will format your code according to our style rules

If any issues can't be automatically fixed, the commit will be blocked until you resolve them.

### Setting Up Your Environment

1. After cloning the repository, run:

   ```bash
   npm install
   ```

   This will automatically set up Husky and the pre-commit hooks.

2. Configure your IDE for real-time code quality feedback:

   **VS Code**:

   - Install the ESLint extension: `dbaeumer.vscode-eslint`
   - Install the Prettier extension: `esbenp.prettier-vscode`
   - Enable format on save in your settings:
     ```json
     "editor.formatOnSave": true,
     "editor.defaultFormatter": "esbenp.prettier-vscode"
     ```

   **WebStorm/IntelliJ**:

   - Go to Preferences → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
   - Check "Automatic ESLint configuration"
   - Enable "Run eslint --fix on save"
   - Go to Preferences → Languages & Frameworks → JavaScript → Prettier
   - Check "On code reformat" and "On save"

### Handling Pre-commit Hook Issues

If your commit is blocked due to code quality issues:

1. Review the error messages in your terminal
2. Fix the issues manually or run:
   ```bash
   npm run lint:fix
   npm run format
   ```
3. Try committing again

### Bypassing Hooks (Emergency Only)

In rare emergency situations, you can bypass the pre-commit hooks with:

```bash
git commit -m "Your message" --no-verify
```

⚠️ **Warning**: Use this only in genuine emergency situations. The team will review all commits that bypass hooks.

## ESLint and Prettier Configuration

Our code style is defined in:

- `.eslintrc.js` - Code quality rules
- `.prettierrc` - Formatting style

Please do not modify these files without team discussion.
