# State Management

This directory contains Zustand stores for managing the application's client-side state.

## Overview

We use Zustand for state management because it's:
- Lightweight and minimalistic
- Easy to set up with no boilerplate
- Compatible with React hooks
- Works well with TypeScript

## Stores

### Game Store (`game-store.ts`)

The Game Store manages the state related to the game session, including:
- Session identification
- Game progress tracking (current phase)
- Game session management

### User Preferences Store (`user-preferences-store.ts`)

The User Preferences Store manages user UI preferences, including:
- Dark mode settings
- Animation preferences

## Usage

To use a store in a component:

```tsx
import { useGameStore } from '../store';

function GameComponent() {
  // Access state
  const { sessionId, gamePhase } = useGameStore();
  
  // Access actions
  const { setGamePhase, resetGame } = useGameStore();
  
  // Example usage
  const handleAdvance = () => {
    setGamePhase('round1');
  };
  
  return (
    <div>
      <p>Current Phase: {gamePhase}</p>
      <button onClick={handleAdvance}>Advance to Round 1</button>
      <button onClick={resetGame}>Reset Game</button>
    </div>
  );
}
```

## Persistence

All stores use Zustand's `persist` middleware to automatically persist state to localStorage. This ensures that:

- User preferences are remembered between sessions
- Game progress is saved if the user refreshes the page

## Adding a New Store

To add a new store:

1. Create a new file in the `store` directory
2. Define the state interface with proper TypeScript types
3. Create the store using `create` from Zustand
4. Add persistence if needed using the `persist` middleware
5. Export the store from the `index.ts` file
