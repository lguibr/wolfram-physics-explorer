# Source Directory (`src`)

This directory contains the core source code for the Rust WASM module.

## File Structure

- **[lib.rs](./lib.rs)**: The crate root. Defines the `Universe` struct and public WASM API. This is the entry point for JavaScript.
- **[rules/](./rules)**: Directory containing all physics rule implementations.

## Key Components

- **Universe**: The state container (Nodes, Links, Step).
- **GraphNode**: Struct representing a node (Cloneable, Serializable).
- **GraphLink**: Struct representing an edge.

See individual files for detailed `///` code documentation.
