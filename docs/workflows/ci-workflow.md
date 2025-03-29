# CI/CD Workflow Security

This document explains the security considerations and implementation details of our Continuous Integration (CI) workflow.

## GitHub Actions Context Access for Secrets

GitHub Actions has special security restrictions when it comes to accessing secrets in pull request (PR) workflows, especially those from forks. These restrictions are in place to prevent exposing sensitive information to potentially untrusted code.

### Key Security Considerations

1. **Pull Requests from Forks**: When a PR is opened from a fork, GitHub doesn't provide access to repository secrets to prevent potential secret exfiltration.

2. **Secret Context Warnings**: You may see warnings like "This secret is being referenced in a context that is no longer valid" for various secrets (OPENAI_API_KEY, SUPABASE_URL, SUPABASE_KEY) in PR builds from forks. These warnings are expected and are a security feature, not a bug.

3. **Secure Context Detection**: Our workflow detects whether it's running in a secure context (push to the main repository or PR from within the same repository) using this condition:
   ```yaml
   SECURE_CONTEXT: ${{ github.event_name == 'push' || github.event.pull_request.head.repo.full_name == github.repository }}
   ```

### How Our Workflow Handles Secrets

Our CI workflow in `.github/workflows/ci.yml` implements the following security measures:

1. **Explicit Permissions**: We define explicit permissions to follow the principle of least privilege.
   ```yaml
   permissions:
     contents: read
   ```

2. **Environment Detection**: We detect if we're in a secure context where secrets should be available.

3. **Conditional Secret Usage**: 
   - In secure contexts (pushes to our repository, PRs from branches in our repository), we use the actual secrets.
   - In non-secure contexts (PRs from forks), we use dummy values and skip tests that require real secrets.

4. **Skip Notification**: We provide clear notifications when tests are skipped due to security restrictions.

### Workflow Structure

1. **Regular Tests**: Unit tests and integration tests that don't require API access run for all PRs and pushes.

2. **API-Dependent Tests**: Tests that require real API keys (real-api tests and E2E tests) only run in secure contexts.

### Important Workflow Sections

- **Environment Setup**:
  ```yaml
  env:
    SECURE_CONTEXT: ${{ github.event_name == 'push' || github.event.pull_request.head.repo.full_name == github.repository }}
  ```

- **Environment Files**:
  - Secure contexts get a `.env` file with real secrets
  - Non-secure contexts get a `.env` file with dummy values

- **Conditional Test Execution**:
  ```yaml
  if: steps.set_env.outputs.HAVE_API_SECRETS == 'true'
  ```

## Best Practices for Contributors

1. **Fork Contributors**: If you're contributing from a fork, expect that API-dependent tests will be skipped in your PR. The maintainers will run these tests after merging or in a secure context.

2. **Repository Contributors**: If you have write access to the repository, create branches within the repository rather than working from forks for full test coverage.

## Troubleshooting

If you encounter issues with the CI workflow:

1. **Secret Warnings**: Warnings about secret access in fork PRs are normal and expected.

2. **Failed Tests**: If tests are failing due to missing secrets, check if you're working from a fork.

3. **Environment Variables**: Verify that all required environment variables are correctly set in the GitHub repository secrets. 