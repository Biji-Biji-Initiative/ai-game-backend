# AI Fight Club - Frontend Project Structure

## Overview
This document outlines the structure of the Next.js-based frontend application for AI Fight Club. The project follows a feature-sliced design pattern, organized around domain features rather than technical concerns.

## Directory Structure

```
src/
├── app/             # Next.js App Router pages
├── components/      # Shared UI components
│   ├── ui/          # shadcn/ui components
│   └── layout/      # Layout components (header, footer, etc.)
├── features/        # Feature-specific components and logic
│   ├── welcome/     # Welcome screen feature
│   ├── assessment/  # Trait assessment feature
│   ├── focus/       # Focus selection feature
│   ├── rounds/      # Game rounds features
│   ├── results/     # Results display feature
│   └── shared/      # Shared profile feature
├── context/         # React context providers
├── hooks/           # Custom React hooks
├── services/        # External services integration
│   └── api/         # API integration
│       ├── client/  # API client implementation
│       └── mock/    # Mock API implementations
├── utils/           # Utility functions
└── lib/             # Library code and configuration
```

## Features Overview

- **Welcome**: Landing page and game introduction
- **Assessment**: Personality trait assessment questionnaire
- **Focus**: Focus area selection interface
- **Rounds**: Three-round game flow implementation
- **Results**: Game results and profile generation
- **Shared**: Public sharing of generated profiles

## Key Technical Decisions

1. **Next.js App Router**: Used for file-based routing
2. **TypeScript**: For type safety throughout the codebase
3. **Tailwind CSS**: For styling with utility classes
4. **shadcn/ui**: Component library based on Radix UI
5. **React Query**: For server state management
6. **Mock API**: Implementations for development and testing
