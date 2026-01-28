# Physics Rules Module

This module defines the traits and implementations for the physics rules that govern the evolution of the graph universe.

## Core Traits

- **[PhysicsRule](./mod.rs)**: The primary trait that all rules must implement. It defines the `apply` method.
- **[EvolutionResult](./mod.rs)**: The struct returned by `apply`, containing the new nodes and links to be added.

## Implementations

- **[GrowthRule](./growth.rs)**: Implements exponential growth scenarios (e.g., binary fission).

## Adding a New Rule

1. Create a new file (e.g., `lattice.rs`).
2. Define your rule struct.
3. Implement `PhysicsRule` for your struct.
4. Register the rule in `mod.rs` and the main `Universe` struct.
