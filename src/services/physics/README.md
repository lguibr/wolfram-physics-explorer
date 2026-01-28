# Physics Service

This directory contains the TypeScript implementation and interfaces for the physics engine.
Note: The core calculation logic is being migrated to Rust (WASM), but these files define the types and fallback logic.

## Key Files

- **[engine.ts](./engine.ts)**: Validates state and applies rules (TS fallback).
- **[types.ts](./types.ts)**: Defines `PhysicsRule`, `GraphNode`, and `GraphLink` interfaces.
- **[registry.ts](./registry.ts)**: Central registry for all available physics rules.
- **[customRuleParser.ts](./customRuleParser.ts)**: Parser for Wolfram-style rule signatures (e.g., `{{x,y}} -> {{x,z}}`).

## Usage

The `evolveUniverse` function is the main entry point, taking the current state and returning the next state.
