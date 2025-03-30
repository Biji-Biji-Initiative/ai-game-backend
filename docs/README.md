# Documentation

Welcome to the AI Gaming Backend documentation. This directory contains all the guides, references, and architectural documentation for the project.

## Directory Structure

- [**Architecture**](./architecture/): System architecture documentation
- [**API**](./api/): API documentation and references
- [**Guides**](./guides/): Development and usage guides
- [**Testing**](./testing/): Testing strategies and patterns
- [**Tools**](./tools/): Documentation verification and maintenance tools
- [**_Historical**](./_historical/): Archived documentation (for reference only)

## Getting Started

New team members should start with these documents:

1. [Project Overview](./project-overview.md)
2. [Development Environment Setup](./guides/development-environment.md)
3. [Developer Onboarding Guide](./guides/onboarding-guide.md)
4. [Architecture Overview](./architecture/README.md)
5. [API Documentation](./api/README.md)

## Key Documentation

### Architecture

- [DDD Principles](./architecture/ddd-principles.md)
- [Layered Architecture](./architecture/application-layer.md)
- [Error Handling](./architecture/error-handling.md)
- [Logging Architecture](./architecture/logging-architecture.md)
- [Database Schema](./architecture/database-schema.md)
- [Security Practices](./architecture/security-practices.md)

### Guides

- [Developer Onboarding](./guides/onboarding-guide.md)
- [Production Guide](./guides/production-guide.md)
- [ESM Migration Guide](./guides/esm-migration-guide.md)
- [Testing Strategy](./testing/README.md)
- [Documentation Standards](./DOCUMENTATION_STANDARDS.md)
- [Troubleshooting Guide](./guides/troubleshooting.md)
- [Contribution Workflow](./guides/contribution-workflow.md)
- [Performance Optimization](./guides/performance-optimization.md)
- [Monitoring and Logging](./guides/monitoring-logging.md)

### API

- [API Common Patterns](./api/common-patterns.md)
- [API Versioning Strategy](./api/versioning-strategy.md)
- [Endpoint Documentation](./api/endpoints.md)

## Documentation Project

We are currently working on improving and expanding our documentation. See the following resources:

- [Documentation Completion Plan](./DOCUMENTATION_COMPLETION_PLAN.md): Our plan for addressing remaining documentation tasks
- [Documentation Progress](./DOCUMENTATION_PROGRESS.md): Current status of documentation improvements
- [Documentation Restructure Summary](./DOCUMENTATION_RESTRUCTURE_SUMMARY.md): Overview of recent documentation reorganization
- [Documentation Verification Plan](./DOCUMENTATION_VERIFICATION_PLAN.md): Our approach to verifying documentation accuracy

### Documentation Verification

We've completed our documentation gaps initiative (DOC-012) and are now focusing on verification (DOC-011). To help with this effort:

1. Check out our [Verification Plan](./DOCUMENTATION_VERIFICATION_PLAN.md) for details on our approach
2. Use the [Verification Checklist](./tools/verification-checklist.md) when reviewing documentation
3. Run the [link checker](./tools/link-checker.js) to validate links in documentation
4. Report issues using JIRA tickets with the "DOC-VERIFY-###" format

## Contributing to Documentation

When contributing to documentation, please follow these guidelines:

1. Place architectural documentation in the `/architecture` directory
2. Place API documentation in the `/api` directory
3. Place how-to guides in the `/guides` directory
4. Place testing documentation in the `/testing` directory
5. Use Markdown for all documentation files
6. Include links to related documentation where appropriate
7. Keep documentation up-to-date with code changes

Do not directly modify files in the `_historical` directory as these are kept for reference purposes only.

## Documentation Standards

1. Use clear, concise language
2. Include code examples where appropriate
3. Format code blocks with the appropriate language for syntax highlighting
4. Use headings to organize content (H1 for document title, H2 for major sections)
5. Use bullet points and numbered lists for clarity
6. Include diagrams when explaining complex systems or workflows
7. Link to other relevant documentation

## Requesting Documentation Updates

If you notice missing or outdated documentation, please create a JIRA ticket using the "DOC" project and include:

1. The specific document needing updates
2. The information that's missing or incorrect
3. Any relevant code references or context
4. The priority of the documentation update
