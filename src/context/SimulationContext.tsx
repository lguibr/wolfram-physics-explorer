import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { HypergraphState } from '@/types';
import { createInitialState } from '@/services/physics/engine';
import { RULE_REGISTRY } from '@/services/physics/registry';

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
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // 1. Core State
    const [history, setHistory] = useState<HypergraphState[]>([createInitialState()]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);

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
    const playIntervalRef = useRef<number | null>(null);

    // Initialize Worker
    useEffect(() => {
        workerRef.current = new Worker(new URL('../services/worker.ts', import.meta.url), { type: 'module' });
        workerRef.current.onmessage = (e) => {
            const nextState = e.data;
            if (nextState) {
                setHistory(prev => [...prev, nextState]);
                setIsCalculating(false);
                setCurrentStepIndex(idx => idx + 1);
            }
        };
        workerRef.current.onerror = (err) => {
            console.error("Worker Error Event:", err);
            setIsCalculating(false);
        };
        return () => workerRef.current?.terminate();
    }, []);

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
            currentState: tipState,
            ruleId: currentRuleId,
            maxNodes: maxNodes
        });
    }, [currentStepIndex, history, currentRuleId, maxNodes, isCalculating]);

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
            isCalculating
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
