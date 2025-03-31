# ARCH-2: Refine Core Directory Structure

## Problem Statement

The current directory structure mixes domain logic with infrastructure concerns under the `src/core` directory. This makes it harder to:

1. Clearly identify boundaries between domains
2. Separate domain logic from infrastructure concerns
3. Determine which code belongs to the shared kernel
4. Understand application-level vs. domain-level services

ARCH-2 aims to refine the directory structure to better align with DDD principles and improve architectural clarity.

## Approach

We've taken a careful, well-documented approach to reorganizing the codebase:

1. **Analysis:** Reviewed current structure to identify areas for improvement
2. **Design:** Created a comprehensive proposal for a new structure
3. **Documentation:** Detailed the migration plan and benefits
4. **Implementation Plan:** Created a phased approach to minimize disruption

## Artifacts Created

1. **Directory Structure Proposal:**
   - Located at `docs/architecture/directory-structure.md`
   - Details current structure and issues
   - Presents a clear alternative structure
   - Outlines a phased migration plan

2. **Architecture Documentation Update:**
   - Updated documentation to reflect new structure
   - Aligned with bounded context definitions from ARCH-1

## Key Structural Changes

The proposal introduces a clearer separation of concerns with four main areas:

1. **Domain (`src/domain/`):**
   - Contains only domain logic organized by bounded context
   - Each subdirectory represents one bounded context
   - Free from infrastructure concerns

2. **Application (`src/application/`):**
   - Services that orchestrate across bounded contexts
   - Organized by domain they orchestrate
   - Includes coordinators and cross-domain event handlers

3. **Infrastructure (`src/infrastructure/`):**
   - Technical concerns separate from domain logic
   - Includes database, caching, logging, error handling
   - AI integration and external services

4. **Shared (`src/shared/`):**
   - Explicitly defined shared kernel
   - Consolidates previously scattered shared concepts
   - Includes base models, shared value objects, and utilities

## Benefits of New Structure

1. **Improved DDD Alignment:**
   - Clear separation of domain, application, and infrastructure
   - Explicit shared kernel for cross-context concepts
   - Domain logic isolation from technical concerns

2. **Better Developer Experience:**
   - Easier to find and understand code
   - Clearer boundaries between components
   - Consistent organization across the codebase

3. **Enhanced Maintainability:**
   - Reduced risk of inappropriate dependencies
   - More modular codebase for easier changes
   - Better alignment with bounded context definitions

4. **Future-Proofing:**
   - Structure supports future microservice extraction
   - Easier addition of new bounded contexts
   - Better scaling as application grows

## Migration Strategy

To minimize disruption, we've planned a three-phase migration approach:

### Phase 1: Create New Top-Level Directories
- Set up `src/domain/`, `src/infrastructure/`, and `src/shared/`
- Move infrastructure code (`infra/`, `ai/`, etc.) to `src/infrastructure/`
- Consolidate shared concepts into `src/shared/`

### Phase 2: Domain Restructuring
- Move domain logic from `src/core/` to `src/domain/`
- Reorganize application services by domain

### Phase 3: Finalize Changes
- Update import paths throughout the codebase
- Fix any references or dependencies issues
- Update tests and documentation

## Next Steps

1. **Approval:** Obtain stakeholder approval for the proposed changes
2. **Prioritization:** Determine when in the development roadmap to implement
3. **Impact Assessment:** Identify potential impacts on in-progress work
4. **Migration Planning:** Create detailed task breakdown for each phase
5. **Communication:** Inform all developers about the upcoming changes

This refactoring represents a significant architectural improvement that will provide long-term benefits for the maintainability and clarity of the codebase. 