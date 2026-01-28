# Wolfram Physics WASM Engine

This crate implements the high-performance physics core for the Wolfram Physics Explorer.
It uses WebAssembly (WASM) to execute graph evolution rules at near-native speeds.

## Architecture

- **State Ownership**: The simulation state (`Universe`) is held in WASM memory to avoid serialization overhead.
- **Rendering**: (Planned) Direct WebGPU rendering via `wgpu`.
- **Rules**: Modular system for defining different universe evolution strategies.

## Documentation Navigation

- **[Source Code](./src/README.md)**: Details on the implementation logic.
    - **[Rules](./src/rules/README.md)**: Physics rule definitions.

## Build Commands

- `wasm-pack build --target web`: Compiles the crate to WASM.
- `cargo test`: Runs unit tests.
- `cargo clippy`: Runs linting checks.
