import init, { Universe } from '../rust/wolfram-physics-wasm/pkg/wolfram_physics_wasm.js';

let isWasmInitialized = false;
let universe: Universe | null = null;

/**
 * Initializes the WASM module if it hasn't been loaded yet.
 * Ensures single initialization to prevent race conditions or reloading errors.
 */
async function bootstrap() {
    if (!isWasmInitialized) {
        await init();
        isWasmInitialized = true;
        universe = Universe.new();
        console.log("Creating Rust WASM Physics Engine... [OK]");
    }
}

let isRendererInitializing = false;

// Listen for messages from the main thread
self.onmessage = async (e: MessageEvent) => {
    try {
        await bootstrap();
        
        if (!universe) throw new Error("Universe not initialized");

        const { type, payload } = e.data;

        switch (type) {
            case 'INIT_RENDERER': {
                if (isRendererInitializing) return;
                isRendererInitializing = true;
                const { canvas } = payload;
                try {
                    await universe.init_renderer(canvas);
                    console.log("WebGPU Renderer initialized successfully.");
                } catch (err) {
                    console.error("WebGPU Init Failed (using Fallback?):", err);
                    // Crucial: Don't let the app hang. 
                    // You might want to send a message back to UI to fallback to Canvas2D/ThreeJS
                } finally {
                    isRendererInitializing = false;
                }
                break;
            }

            case 'UPDATE_PARAMS': {
                if (isRendererInitializing) return;
                const { repulsion, drag, nodeSize } = payload;
                universe.update_params(repulsion, drag);
                universe.update_visuals(nodeSize);
                break;
            }

            case 'UPDATE_CAMERA': {
                if (isRendererInitializing) return;
                const { x, y, z } = payload;
                if (universe) universe.update_camera(x, y, z);
                break;
            }

            case 'RESIZE': {
                if (isRendererInitializing) return;
                const { width, height } = payload;
                if (universe) universe.resize_renderer(width, height);
                break;
            }
            
            case 'COMPUTE': {
                if (isRendererInitializing) {
                    console.warn("Skipping COMPUTE during renderer init");
                    return;
                }
                const { currentState } = payload;
                // Init universe if needed (handled by separate message but check safety)
                universe.tick();
                try {
                    universe.render_frame();
                } catch (e) {
                    console.error("Render Error:", e);
                }
                
                // Get State
                const nodes = universe.get_nodes();
                const links = universe.get_links();
                
                // Buffering Logic (Mobile-First Optimization)
                // We don't send individual frames to React for recording anymore.
                // We send a 'FLUSH_BUFFER' message if the buffer is full? 
                // Wait, this worker primarily just runs the physics. 
                // The React thread is the "Controller".
                // Ideally, this worker should talk to IDB Worker directly, but MessageChannel wiring is complex for the user code.
                // Revert to: Send FRAME to Main -> Main buffers -> Main sends to IDB?
                // NO, Main thread bottleneck.
                
                // Optimized: We batch the result back to main thread, 
                // OR we accept a MessagePort for the IDB worker.
                
                // For now, let's just send the frame back. React will buffer it.
                // Actually, let's buffer HERE to reduce postMessage overhead to Main Thread?
                // No, Main thread needs to render (actually, Main thread doesn't render nodes, WGPU does).
                // Main thread only needs to update React state for UI counters (step count).
                // So we can throttle "UI_UPDATE" messages to 60fps, but internal tick can be faster.
                
                self.postMessage({
                    type: 'TICK_COMPLETE',
                    payload: {
                        step: currentState.step + 1, // Logic handled in Rust but we pass back for React Sync
                        nodes: nodes, // Needed for React "History" if we still keep that? 
                        // If we are strictly WASM, we should stop sending nodes back to React!
                        // That's the billion scaling key.
                        links: links,
                        nodeCount: nodes.length
                    }
                });
                break;
            }
            
            default:
                // Backward compatibility for "implicit tick" if needed, or error
                // For now, let's assume strict typing from now on.
                console.warn("Unknown message type:", type);
                break;
        }
    } catch (err) {
        console.error("Worker Error (WASM):", err);
        // Send back safe fallback
        self.postMessage({ type: 'ERROR', error: err }); 
    }
};