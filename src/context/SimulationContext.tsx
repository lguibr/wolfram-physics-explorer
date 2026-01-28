import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { HypergraphState } from '@/types';
import { createInitialState } from '@/services/physics/engine';
import { RULE_REGISTRY } from '@/services/physics/registry';

// Dynamic imports for workers
// @ts-ignore
import WrapperWorker from '@/services/worker?worker';
// @ts-ignore
import IdbWorker from '@/services/workers/idbWorker?worker'; // NEW

interface SimulationContextType {
    // State
    history: HypergraphState[];
    currentStepIndex: number;
    currentState: HypergraphState;
    
    // Playback
    isPlaying: boolean;
    togglePlay: () => void;
    stepForward: () => void;
    stepBack: () => void;
    jumpToStep: (step: number) => void;
    resetSimulation: () => void;
     
    // Recording
    isRecording: boolean;
    startRecording: () => void;
    stopRecording: () => void;
    exportRecording: () => void;
    
    // Settings
    speedMs: number;
    setSpeedMs: (ms: number) => void;
    maxNodes: number;
    setMaxNodes: (n: number) => void;
    shadowGrowth: number;
    setShadowGrowth: (g: number) => void;
    nodeSize: number;
    setNodeSize: (n: number) => void;
    emissionSpeed: number;
    setEmissionSpeed: (s: number) => void;
    auraOpacity: number;
    setAuraOpacity: (o: number) => void;
    linkDistance: number;
    setLinkDistance: (d: number) => void;
    particleSize: number;
    setParticleSize: (s: number) => void;
    linkWidth: number;
    setLinkWidth: (w: number) => void;
    linkOpacity: number;
    setLinkOpacity: (o: number) => void;
    particleCount: number;
    setParticleCount: (c: number) => void;
    friction: number;
    setFriction: (f: number) => void;
    autoRotateSpeed: number;
    setAutoRotateSpeed: (s: number) => void;
    
    // Rules
    currentRuleId: string;
    setCurrentRuleId: (id: string) => void;
    customRuleInput: string;
    setCustomRuleInput: (val: string) => void; // Auto-fill support

    // Worker status
    isCalculating: boolean;
    isWorkerReady: boolean;
    initRenderer: (canvas: OffscreenCanvas) => void;
    updateCamera: (x: number, y: number, z: number) => void;
    resizeRenderer: (width: number, height: number) => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);



export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // 1. Core State
    const [history, setHistory] = useState<HypergraphState[]>([createInitialState()]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isWorkerReady, setIsWorkerReady] = useState(false);

    // 2. Settings
    const [speedMs, setSpeedMs] = useState<number>(600);
    const [maxNodes, setMaxNodes] = useState<number>(1000);
    const [shadowGrowth, setShadowGrowth] = useState<number>(1.05);
    const [nodeSize, setNodeSize] = useState<number>(1.0);
    const [emissionSpeed, setEmissionSpeed] = useState<number>(1.0);
    const [auraOpacity, setAuraOpacity] = useState<number>(0.3);
    const [linkDistance, setLinkDistance] = useState<number>(50);
    
    // Phase 3: "Much Cooler" Controls
    const [particleSize, setParticleSize] = useState<number>(1.0);
    const [linkWidth, setLinkWidth] = useState<number>(0.5);
    const [linkOpacity, setLinkOpacity] = useState<number>(0.2);
    const [particleCount, setParticleCount] = useState<number>(1);
    const [friction, setFriction] = useState<number>(0.3);
    const [autoRotateSpeed, setAutoRotateSpeed] = useState<number>(0.0);
    
    const [currentRuleId, setCurrentRuleId] = useState<string>(RULE_REGISTRY[0].id);
    const [customRuleInput, setCustomRuleInput] = useState<string>('');

    // 3. Worker Reference
    const workerRef = useRef<Worker | null>(null);
    const recordingWorkerRef = useRef<Worker | null>(null);
    const playIntervalRef = useRef<number | null>(null);
    const frameBuffer = useRef<any[]>([]); // Buffer for batch writes

    // Initialize Simulation Worker
    useEffect(() => {
        workerRef.current = new WrapperWorker();
        setIsWorkerReady(true);
        recordingWorkerRef.current = new IdbWorker();

        workerRef.current!.onmessage = (e) => {
            const { type, payload } = e.data;
            if (type === 'TICK_COMPLETE') {
                setIsCalculating(false);
                
                // Update React State (UI Only)
                setHistory(prev => {
                    const mappedNodes = payload.nodes.map((n:any) => ({ id: n.id, x: n.x, y: n.y, z: n.z, val: n.val }));
                    const newState: HypergraphState = {
                        step: payload.step,
                        nodes: mappedNodes, 
                        links: payload.links,
                        maxNodeId: payload.nodeCount 
                    };
                    const newHistory = [...prev, newState];
                    setCurrentStepIndex(newHistory.length - 1);
                    return newHistory;
                });
                
                // RECORDING: Buffer frame
                if (frameBuffer.current && isRecording) {
                    frameBuffer.current.push({
                         step: payload.step,
                         nodes: payload.nodes,
                         links: payload.links,
                         timestamp: Date.now()
                    });

                    // Flush buffer every 60 frames (approx 1 sec)
                    if (frameBuffer.current.length >= 60) {
                        recordingWorkerRef.current?.postMessage({
                            type: 'BATCH_INSERT',
                            payload: { frames: frameBuffer.current }
                        });
                        frameBuffer.current = []; // Clear
                    }
                }
                
                // Done
            } else if (type === 'ERROR') {
                 setIsCalculating(false);
                 console.error("Worker Error:", e.data.error);
            }
        };
                if (workerRef.current) {
                    workerRef.current.onerror = (err: ErrorEvent) => {
                        console.error("Worker Error Event:", err);
                        setIsCalculating(false);
                    };
                }
        
        if (recordingWorkerRef.current) {
            recordingWorkerRef.current.onmessage = (e) => {
                const { type, blob } = e.data;
                if (type === 'EXPORT_READY' && blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `graph_recording_${new Date().toISOString()}.sqlite`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
            };
            recordingWorkerRef.current.postMessage({ type: 'INIT' });
        }

        return () => {
             workerRef.current?.terminate();
             recordingWorkerRef.current?.terminate();
        };
    }, []); // Re-bind if recording state changes? No, use ref for isRecording?

    const startRecording = () => {
        setIsRecording(true);
        recordingWorkerRef.current?.postMessage({ type: 'RESET_DB' });
        frameBuffer.current = [];
    };

    const stopRecording = () => {
        setIsRecording(false);
        // Flush remaining
        if (frameBuffer.current.length > 0) {
            recordingWorkerRef.current?.postMessage({
                type: 'BATCH_INSERT',
                payload: { frames: frameBuffer.current }
            });
            frameBuffer.current = [];
        }
    };

    const exportRecording = () => {
        recordingWorkerRef.current?.postMessage({ type: 'EXPORT_DB' });
    };

    // Helper: Step Logic
    const stepForward = useCallback(() => {
        if (currentStepIndex < history.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
            return;
        }

        if (isCalculating) return;

        const tipState = history[history.length - 1];
        if (tipState.nodes.length >= maxNodes) {
            setIsPlaying(false);
            return;
        }

        setIsCalculating(true);
        workerRef.current?.postMessage({
            type: 'COMPUTE',
            payload: {
                currentState: tipState,
                ruleId: currentRuleId,
                maxNodes: maxNodes
            }
        });

    }, [currentStepIndex, history, currentRuleId, maxNodes, isCalculating]);

    // Update Physics Params dynamically
    useEffect(() => {
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'UPDATE_PARAMS',
                payload: {
                    // Map sliders to physics params
                    repulsion: 500.0, // Fixed for now, or map later if we add a slider
                    drag: (1.0 - friction), // Friction -> Drag (0.3 friction = 0.7 drag)
                    nodeSize: nodeSize * 5.0, // Scale up, base is 5.0
                }
            });
        }
    }, [friction, nodeSize]);
    

    
    // Expose initRenderer
    const initRenderer = useCallback((canvas: OffscreenCanvas) => {
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'INIT_RENDERER',
                payload: { canvas }
            }, [canvas]); // Transfer ownership
        }
    }, []);

    const updateCamera = useCallback((x: number, y: number, z: number) => {
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'UPDATE_CAMERA',
                payload: { x, y, z }
            });
        }
    }, []);

    const resizeRenderer = useCallback((width: number, height: number) => {
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'RESIZE',
                payload: { width, height }
            });
        }
    }, []);

    const stepBack = () => {
        if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
    };

    const jumpToStep = (val: number) => {
        setIsPlaying(false);
        setCurrentStepIndex(val);
    };

    const resetSimulation = () => {
        setIsPlaying(false);
        setIsCalculating(false);
        setHistory([createInitialState()]);
        setCurrentStepIndex(0);
        // Also stop recording if active?
        if (isRecording) setIsRecording(false);
    };
    
    const togglePlay = () => setIsPlaying(!isPlaying);

    // Playback Loop
    useEffect(() => {
        if (isPlaying) {
            const loop = () => {
                if (!isCalculating) stepForward();
            };
            playIntervalRef.current = window.setInterval(loop, speedMs);
        } else if (playIntervalRef.current) {
            clearInterval(playIntervalRef.current);
        }
        return () => {
            if (playIntervalRef.current) clearInterval(playIntervalRef.current);
        };
    }, [isPlaying, stepForward, speedMs, isCalculating]);

    // Auto-fill Custom Rule Input when Rule Changes
     
    useEffect(() => {
        const rule = RULE_REGISTRY.find(r => r.id === currentRuleId);
        if (rule) {
            // Defer update to avoid "setState in effect" warning (synchronous cascade)
            setTimeout(() => {
                // Auto-fill logic: Prefer explicit signature, then check description, then default.
                if (rule.signature) {
                    setCustomRuleInput(rule.signature);
                } else if (rule.description.includes('{{')) {
                    setCustomRuleInput(rule.description);
                } else if ((rule.category as string) === 'CUSTOM') {
                    setCustomRuleInput(rule.description);
                } else {
                    setCustomRuleInput('');
                }
            }, 0);
        }
    }, [currentRuleId]);

    const currentState = history[currentStepIndex] || history[history.length - 1];

    return (
        <SimulationContext.Provider value={{
            history,
            currentStepIndex,
            currentState,
            isPlaying,
            togglePlay,
            stepForward,
            stepBack,
            jumpToStep,
            resetSimulation,
            isRecording,
            startRecording,
            stopRecording,
            exportRecording,
            speedMs,
            setSpeedMs,
            maxNodes,
            setMaxNodes,
            shadowGrowth,
            setShadowGrowth,
            nodeSize,
            setNodeSize,
            emissionSpeed,
            setEmissionSpeed,
            auraOpacity,
            setAuraOpacity,
            linkDistance,
            setLinkDistance,
            particleSize,
            setParticleSize,
            linkWidth,
            setLinkWidth,
            linkOpacity,
            setLinkOpacity,
            particleCount,
            setParticleCount,
            friction,
            setFriction,
            autoRotateSpeed,
            setAutoRotateSpeed,
            currentRuleId,
            setCurrentRuleId,
            customRuleInput,
            setCustomRuleInput,
            isCalculating,
            isWorkerReady,
            initRenderer,
            updateCamera,
            resizeRenderer
        }}>
            {children}
        </SimulationContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSimulation = () => {
    const context = useContext(SimulationContext);
    if (!context) throw new Error("useSimulation must be used within SimulationProvider");
    return context;
};
