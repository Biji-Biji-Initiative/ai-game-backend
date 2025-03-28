# Workflow Documentation

This directory contains documentation for key end-to-end workflows in the application.

## Purpose

These documents trace requests through the relevant layers (Routes → Controller → Coordinator → Services → Repositories/Events) to illustrate how components work together in real-world scenarios.

## Available Workflows

- [User Onboarding and First Challenge](./user-onboarding.md) - The journey from user creation to generating their first personalized challenge
- [Challenge Lifecycle](./challenge-lifecycle.md) - The complete lifecycle of a challenge from creation to evaluation

Each workflow document includes:

1. Step-by-step description of the process
2. Sequence diagrams showing component interactions
3. Key domain events triggered during the workflow
4. Error handling considerations 