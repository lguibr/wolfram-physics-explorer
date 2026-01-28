import init, { evolve_universe } from '../rust/wolfram-physics-wasm/pkg/wolfram_physics_wasm.js';

let isWasmInitialized = false;

async function bootstrap() {
    if (!isWasmInitialized) {
        await init();
        isWasmInitialized = true;
        console.log("Creating Rust WASM Physics Engine... [OK]");
    }
}

// Listen for messages from the main thread
self.onmessage = async (e: MessageEvent) => {
    try {
        await bootstrap();
        const { currentState, ruleId, maxNodes } = e.data;
        
        // Pass to WASM
        const newState = evolve_universe(currentState, ruleId, maxNodes);
        
        // WASM returns the new state directly
        self.postMessage(newState);
    } catch (err) {
        console.error("Worker Error (WASM):", err);
        // Send back same state to unblock
        self.postMessage(e.data.currentState); 
    }
};