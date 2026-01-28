import init, { Universe } from '../src/rust/wolfram-physics-wasm/pkg/wolfram_physics_wasm.js';
import fs from 'fs';
import path from 'path';

// Load WASM file manually because we are in Node, not Web
const wasmPath = path.resolve('./src/rust/wolfram-physics-wasm/pkg/wolfram_physics_wasm_bg.wasm');
const wasmBuffer = fs.readFileSync(wasmPath);

async function runTests() {
    console.log("Initializing WASM...");
    await init(wasmBuffer);
    console.log("WASM Initialized.");

    // TEST 1: Genesis
    console.log("TEST 1: Genesis Node Requirement...");
    const universe = Universe.new();
    const nodes = universe.get_nodes(); // It returns JsValue (array)
    
    if (nodes.length < 1) {
        throw new Error(`FAIL: Single node requirement not met. Count: ${nodes.length}`);
    }
    if (nodes[0].id !== "1") {
        throw new Error(`FAIL: First node ID mismatch. Expected '1', got '${nodes[0].id}'`);
    }
    console.log(`PASS: Genesis checks passed. Node count: ${nodes.length}`);

    // TEST 2: Binary Fission Rule
    console.log("TEST 2: Binary Fission Evolution...");
    // Universe already has default rule?
    // Let's set it explicitly to be sure
    universe.set_rule("binary-fission");
    universe.tick();
    
    const nodesAfter = universe.get_nodes();
    // 1 -> 2 new, total 3? or replacement? 
    // Logic in previous `rust:test` expectation was 3.
    // GrowthRule: active nodes split.
    // Step 0: Node 1 (group 0).
    // Tick: Step 1. Active group = 0.
    // Node 1 is active.
    // Branching factor 2 -> 2 new nodes.
    // Total = 1 + 2 = 3.
    
    if (nodesAfter.length !== 3) {
        throw new Error(`FAIL: Binary Fission node count mismatch. Expected 3, got ${nodesAfter.length}`);
    }
    console.log("PASS: Binary Fission logic passed.");

    console.log("ALL TESTS PASSED.");
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});
