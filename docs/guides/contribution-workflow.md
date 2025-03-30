# Contribution Workflow

This guide outlines the process for contributing to the AI Gaming Backend project. It covers the necessary steps from setting up your development environment to getting your changes merged into the main codebase.

## Table of Contents

1. [Before You Begin](#before-you-begin)
2. [Development Environment Setup](#development-environment-setup)
3. [Issue Tracking and Assignment](#issue-tracking-and-assignment)
4. [Branching Strategy](#branching-strategy)
5. [Development Workflow](#development-workflow)
6. [Code Style and Standards](#code-style-and-standards)
7. [Testing Requirements](#testing-requirements)
8. [Pull Request Process](#pull-request-process)
9. [Code Review Process](#code-review-process)
10. [Merge and Deployment](#merge-and-deployment)
11. [Contribution Dos and Don'ts](#contribution-dos-and-donts)

## Before You Begin

Before contributing to the project, make sure you:

1. Read the [Developer Onboarding Guide](./onboarding-guide.md)
2. Understand our [Architecture](../architecture/README.md)
3. Review our [Documentation Standards](../DOCUMENTATION_STANDARDS.md)
4. Join our Slack channel for communication (#ai-game-backend)

## Development Environment Setup

Refer to the [Developer Onboarding Guide](./onboarding-guide.md) for detailed setup instructions. In summary:

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-organization/ai-back-end-game.git
   cd ai-back-end-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Copy `.env.example` to `.env`
   - Adjust settings as needed for your local environment

4. **Start the development server**
   ```bash
   npm run dev
   ```

## Issue Tracking and Assignment

We use JIRA for issue tracking. Follow these guidelines when working with issues:

1. **Finding an Issue**
   - Check the project board for issues labeled "Good First Issue" if you're new
   - If you find a bug or have a feature idea, create a new issue before starting work

2. **Issue Assignment**
   - Comment on the issue you'd like to work on
   - Wait for a maintainer to assign it to you
   - Don't start work on an issue that's already assigned

3. **Issue Structure**
   - **Bug Reports**: Include steps to reproduce, expected vs. actual behavior, and environment details
   - **Feature Requests**: Include user story, acceptance criteria, and technical requirements
   - **Technical Debt**: Include current limitations and expected improvements

## Branching Strategy

We follow a branching model based on GitFlow:

1. **Branch Naming**
   - `feature/[jira-id]-short-description` for new features
   - `bugfix/[jira-id]-short-description` for bug fixes
   - `hotfix/[jira-id]-short-description` for urgent production fixes
   - `refactor/[jira-id]-short-description` for code refactoring

2. **Main Branches**
   - `main`: Production-ready code
   - `develop`: Integration branch for features

3. **Branch Creation**
   ```bash
   # Make sure you're on develop and it's up-to-date
   git checkout develop
   git pull
   
   # Create your branch
   git checkout -b feature/GAME-123-add-leaderboard
   ```

## Development Workflow

1. **Start with a Plan**
   - Break down the task into smaller steps
   - Consider writing pseudo-code or creating a design doc for complex features

2. **Regular Commits**
   - Make small, focused commits
   - Use meaningful commit messages following our commit message format

3. **Commit Message Format**
   ```
   [JIRA-ID] Short summary (50 chars or less)
   
   More detailed explanation, if necessary. Wrap at 72 chars.
   Explain the problem this commit solves or what it changes.
   
   - Bullet points are acceptable
   - Use a hyphen or asterisk followed by a space
   
   Refs: JIRA-123
   ```

4. **Keep Your Branch Updated**
   ```bash
   git checkout develop
   git pull
   git checkout your-branch
   git rebase develop
   ```

5. **Local Testing**
   - Run tests locally before pushing
   - Ensure all linting rules pass

## Code Style and Standards

1. **Follow Established Patterns**
   - Look at existing code to understand patterns and architecture
   - Maintain consistency with the codebase

2. **Code Style**
   - We use ESLint and Prettier for code formatting
   - Run `npm run lint` to check your code
   - Run `npm run format` to automatically format your code

3. **Documentation**
   - Add JSDoc comments to functions and classes
   - Update relevant documentation if you change behavior
   - Add explanatory comments for complex logic

4. **Domain-Driven Design**
   - Place code in the appropriate domain directory
   - Follow our DDD patterns as described in the [DDD Principles](../architecture/ddd-principles.md) document

## Testing Requirements

Every contribution must include appropriate tests:

1. **Test Types**
   - **Unit Tests**: For individual functions and classes
   - **Integration Tests**: For API endpoints and service interactions
   - **E2E Tests**: For critical user flows

2. **Test Coverage**
   - Aim for at least 80% coverage for new code
   - Critical paths should have 100% coverage
   - Run `npm run test:coverage` to check coverage

3. **Test Naming**
   ```javascript
   describe('UserService', () => {
     describe('createUser()', () => {
       it('should create a user when valid data is provided', () => {
         // Test code
       });
       
       it('should throw ValidationError when email is invalid', () => {
         // Test code
       });
     });
   });
   ```

4. **Testing Guidelines**
   - Tests should be independent (no test should depend on another test)
   - Use mock data and dependencies when appropriate
   - Clean up after your tests (e.g., database records)

## Pull Request Process

1. **Before Creating a PR**
   - Ensure all tests pass: `npm test`
   - Run linting: `npm run lint`
   - Check for any TODOs or unfinished code
   - Rebase on the latest develop branch

2. **Creating a Pull Request**
   - Push your branch to GitHub
   - Create a PR against the develop branch
   - Use the PR template to provide necessary information
   - Link the PR to the relevant JIRA issue

3. **PR Title and Description**
   - Title: `[JIRA-ID] Short description of changes`
   - Description: Provide context, implementation details, and testing information
   - Include screenshots or videos for UI changes

4. **PR Template**
   ```
   ## Description
   Brief description of the changes.
   
   ## Related Issue
   JIRA-123
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## How Has This Been Tested?
   Describe the tests you ran.
   
   ## Checklist:
   - [ ] My code follows the style guidelines
   - [ ] I have performed a self-review
   - [ ] I have added tests
   - [ ] I have updated documentation
   ```

## Code Review Process

1. **Reviewer Assignment**
   - At least one core team member must review your PR
   - For complex changes, multiple reviewers may be required
   - Maintainers will assign reviewers within 1-2 business days

2. **Review Criteria**
   - Code correctness and quality
   - Test coverage and quality
   - Documentation completeness
   - Adherence to design patterns and architecture
   - Performance considerations

3. **Addressing Feedback**
   - Respond to all comments
   - Make requested changes or explain why they're not needed
   - Use the suggestion feature for small changes
   - Push additional commits rather than force-pushing

4. **Review Resolution**
   - Reviewers will approve once all concerns are addressed
   - Some comments may be marked as non-blocking
   - Major concerns must be resolved before merging

## Merge and Deployment

1. **Merge Requirements**
   - PR is approved by required reviewers
   - CI checks pass (tests, linting, build)
   - No merge conflicts with the target branch
   - All discussions are resolved

2. **Merge Strategy**
   - PRs are merged using squash merging
   - The squashed commit message should summarize the changes
   - Include the PR number and JIRA issue ID in the commit message

3. **Post-Merge**
   - Delete the branch after merging
   - Update the JIRA issue status
   - Monitor CI/CD pipeline for successful deployment

4. **Release Process**
   - Features in `develop` are periodically merged to `main` for releases
   - Release candidates go through additional testing
   - See the [Production Guide](./production-guide.md) for deployment details

## Contribution Dos and Don'ts

### Do:
- Ask questions when you're unsure
- Keep PRs focused and reasonably sized
- Test your changes thoroughly
- Update documentation alongside code changes
- Follow the existing code style and patterns
- Respect reviewers' feedback
- Help review others' PRs

### Don't:
- Submit large, unfocused PRs that are hard to review
- Skip writing tests
- Leave debugging code (console.logs, commented code)
- Force-push after reviews have started
- Take criticism personally
- Merge without required approvals

## Getting Help

If you need assistance with your contribution:

1. Check the [Troubleshooting Guide](./troubleshooting.md)
2. Ask questions in the Slack channel
3. Comment on the JIRA issue
4. Reach out to the tech lead or repository maintainers

Remember that everyone started as a first-time contributor. We're here to help you succeed and welcome your contributions to make our project better! 