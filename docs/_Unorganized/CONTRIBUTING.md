# Contributing to AI Fight Club API

Thank you for your interest in contributing to the AI Fight Club API project! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We are committed to providing a welcoming and inspiring community for all.

## How to Contribute

There are many ways you can contribute to this project:

1. Reporting bugs
2. Suggesting enhancements
3. Writing documentation
4. Submitting code changes
5. Reviewing pull requests

## Development Workflow

### Setting Up the Development Environment

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/ai-fight-club-api.git`
3. Add the upstream repository: `git remote add upstream https://github.com/ORIGINAL_OWNER/ai-fight-club-api.git`
4. Install dependencies: `npm install`
5. Create a branch for your changes: `git checkout -b feature/your-feature-name`

See [SETUP.md](./SETUP.md) for detailed environment setup instructions.

### Making Changes

1. Make your changes following the project's coding standards
2. Add or update tests as necessary
3. Ensure all tests pass: `npm test`
4. Update documentation to reflect your changes

### Submitting a Pull Request

1. Push your changes to your fork: `git push origin feature/your-feature-name`
2. Create a pull request from your fork to the main repository
3. Fill out the pull request template with all relevant information
4. Wait for a review and address any feedback

## Coding Standards

This project follows specific coding standards to maintain consistency:

### JavaScript/TypeScript

- Use ES6+ features
- Follow the project's ESLint configuration
- Use async/await for asynchronous code
- Add JSDoc comments for public APIs

### Domain-Driven Design

- Follow DDD principles outlined in [docs/architecture/ddd-overview.md](./docs/architecture/ddd-overview.md)
- Respect domain boundaries
- Use the ubiquitous language defined in the project

### Testing

- Write tests for all new features and bug fixes
- Maintain or improve code coverage
- See [TESTING.md](./TESTING.md) for testing guidelines

## Documentation

Documentation is a critical part of this project. When contributing:

1. Update relevant documentation to reflect your changes
2. Follow the documentation structure outlined in [docs/README.md](./docs/README.md)
3. Use clear, concise language and provide examples where appropriate

### Documentation Changes

When making documentation-only changes:

1. Add `[docs]` prefix to your commit messages
2. Include links to any related code or issues
3. Preview your changes locally before submitting

## Pull Request Process

1. Ensure your code follows the project's standards
2. Update the README.md or relevant documentation with details of your changes
3. Add your changes to the CHANGELOG.md file in the Unreleased section
4. The PR must pass all CI checks before it can be merged
5. PRs require at least one approving review from a maintainer

## Release Process

The release process is handled by maintainers following this workflow:

1. Update version in package.json following semantic versioning
2. Update CHANGELOG.md to reflect the new version
3. Create a release tag
4. Deploy to staging environment for final testing
5. Deploy to production

## Additional Resources

- [Project README](./README.md)
- [Architecture Documentation](./docs/architecture/README.md)
- [API Documentation](./docs/api/README.md)
- [Domain Documentation](./docs/domains/README.md) 