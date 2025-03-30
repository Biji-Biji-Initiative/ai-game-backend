## Description

<!-- Describe the changes in this PR -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Test improvements

## Test Category Semantics

I have checked that all tests in this PR follow the correct semantics:

- [ ] **Domain tests** only use in-memory repositories and mock all external dependencies
- [ ] **Integration tests** focus on cross-component/cross-domain interaction
- [ ] **External tests** directly target an external service
- [ ] **E2E tests** use apiTestHelper or axios to make HTTP requests

I have verified test semantics with:
```bash
node tools/verify-test-categories.js
```

## Related Issues

<!-- Link any related issues here -->

## Validation

- [ ] All tests pass
- [ ] Code follows project style guidelines
- [ ] Documentation is updated
- [ ] Verified changes in local environment 