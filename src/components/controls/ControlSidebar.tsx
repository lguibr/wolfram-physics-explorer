import React from 'react';
import { Slider } from '@/components/ui/slider';
import { RULE_REGISTRY } from '@/services/physics/registry';
import { Cpu } from 'lucide-react';
import { useSimulation } from '@/context/SimulationContext';
import { useDebounce } from '@/hooks/useDebounce';
import { parseAndApplyCustomRule } from '@/services/physics/customRuleParser';
import { GraphNode, GraphLink } from '@/types';

export const ControlSidebar: React.FC = () => {
    const {
        // Config State
        currentRuleId,
        setCurrentRuleId,
        speedMs,
        setSpeedMs,
        maxNodes,
        setMaxNodes,
        shadowGrowth,
        setShadowGrowth,
        customRuleInput,
        setCustomRuleInput,
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
        setAutoRotateSpeed
    } = useSimulation();

    const activeRule = RULE_REGISTRY.find(r => r.id === currentRuleId);
    
    // Group rules by category for display
    const categories = Array.from(new Set(RULE_REGISTRY.map(r => r.category)));

    const handleCustomRuleSubmit = (val: string) => {
        // Use current validation state
        if (!val || !isRuleValid) return;
        
        // Simple Parser for Wolfram-style signature
        const id = `custom_${Date.now()}`;
        
        const newRule = {
            id,
            name: `Custom: ${val.substring(0, 15)}...`,
            category: 'CUSTOM',
            description: val,
            apply: (nodes: GraphNode[], links: GraphLink[], maxId: number, step: number) => {
                return parseAndApplyCustomRule(val, nodes, links, maxId, step);
            }
        };
        
        // Register and Select
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (RULE_REGISTRY as any).unshift(newRule);
        setCurrentRuleId(id);
    };

    const [isRuleValid, setIsRuleValid] = React.useState(false);
    const debouncedRuleInput = useDebounce(customRuleInput, 300);

    React.useEffect(() => {
        // Robust Validation Logic
        const validate = (val: string) => {
             if (!val.includes('->')) return false;
             // Check braces balance
             const open = (val.match(/\{/g) || []).length;
             const close = (val.match(/\}/g) || []).length;
             if (open !== close || open < 2) return false;
             
             // Check structure: {{...}} -> {{...}}
             const parts = val.split('->');
             if (parts.length !== 2) return false;
             if (!parts[0].trim().startsWith('{{') || !parts[1].trim().endsWith('}}')) return false;
             
             return true;
        };
        setIsRuleValid(validate(debouncedRuleInput));
    }, [debouncedRuleInput]);

    return (
        <div className="w-full h-full space-y-4 pointer-events-auto flex flex-col p-4">
            <div className="flex-1 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 text-g-blue">
                    <div className="p-2 bg-g-blue/10 rounded-lg">
                        <Cpu className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm tracking-widest uppercase text-white">Engine Control</h2>
                        <div className="text-[10px] text-gray-400 font-mono">Run: {currentRuleId.substring(0, 12)}...</div>
                    </div>
                </div>

                <div className="h-px bg-white/10" />

                <div className="h-px bg-white/10" />

                {/* Native Select for Reliability */}
                <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-mono uppercase tracking-wider">Physics Signature</label>
                    <div className="relative">
                        <select 
                            value={currentRuleId}
                            onChange={(e) => setCurrentRuleId(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-xs text-white appearance-none outline-none focus:border-g-blue/50 cursor-pointer hover:bg-white/10"
                        >
                             {categories.map(cat => (
                                <optgroup key={cat} label={cat}>
                                    {RULE_REGISTRY.filter(r => r.category === cat).map(rule => (
                                        <option key={rule.id} value={rule.id}>{rule.name}</option>
                                    ))}
                                </optgroup>
                             ))}
                        </select>
                        <div className="absolute right-3 top-2.5 pointer-events-none opacity-50">
                            <span className="text-[10px]">▼</span>
                        </div>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-400 leading-relaxed font-mono min-h-[3em]">
                         {activeRule?.description}
                    </div>
                </div>

                <div className="h-px bg-white/10" />

                {/* Custom Rule Input (Auto-filled) */}
                 <div className="space-y-3">
                     <div className="flex justify-between items-center">
                         <label className="text-xs text-gray-400 font-mono uppercase tracking-wider">Rule</label>
                         {customRuleInput.length > 0 && (
                             <span className={`text-[10px] font-bold uppercase transition-opacity ${isRuleValid ? 'text-green-400' : 'text-red-400'}`}>
                                 {isRuleValid ? 'Valid' : 'Invalid Syntax'}
                             </span>
                         )}
                     </div>
                     <input 
                        type="text" 
                        value={customRuleInput}
                        onChange={(e) => setCustomRuleInput(e.target.value)}
                        onKeyDown={(e) => {
                             if (e.key === 'Enter' && isRuleValid) handleCustomRuleSubmit(customRuleInput);
                        }}
                        placeholder="{{x,y}} -> {{x,z},{z,y}}"
                        className={`w-full bg-white/5 border rounded-md px-3 py-2 text-xs font-mono text-white placeholder:text-gray-600 outline-none transition-colors
                            ${customRuleInput.length > 0 
                                ? (isRuleValid ? 'border-green-500/50 focus:border-green-500' : 'border-red-500/50 focus:border-red-500')
                                : 'border-white/10 focus:border-g-blue/50'
                            }
                        `}
                     />
                     <p className="text-[10px] text-gray-500">
                         Modify and press Enter to inject.
                     </p>
                 </div>

                <div className="h-px bg-white/10" />

                <div className="space-y-5">
                    {/* Speed */}
                    <Slider
                        label="Time Dilation"
                        value={speedMs}
                        min={0}
                        max={2000}
                        step={10}
                        valueDisplay={`${speedMs}ms`}
                        onChange={(e) => setSpeedMs(parseInt(e.target.value))}
                        className="[&::-webkit-slider-thumb]:border-g-yellow"
                    />

                    {/* Max Nodes */}
                    <Slider
                        label="Entropy Limit"
                        value={maxNodes}
                        min={100}
                        max={5000}
                        step={100}
                        valueDisplay={maxNodes}
                        onChange={(e) => setMaxNodes(parseInt(e.target.value))}
                        className="[&::-webkit-slider-thumb]:border-g-red"
                    />

                     {/* Shadow Growth */}
                     <Slider
                        label="Gravity Aura"
                        value={Number(shadowGrowth.toFixed(5))}
                        min={1.00001}
                        max={1.5}
                        step={0.00001}
                        valueDisplay={`${((shadowGrowth - 1) * 100).toFixed(3)}%`}
                        onChange={(e) => setShadowGrowth(parseFloat(e.target.value))}
                        className="[&::-webkit-slider-thumb]:border-g-blue"
                    />

                     {/* Node Size */}
                    <Slider
                        label="Node Size"
                        value={nodeSize}
                        min={0.1}
                        max={3.0}
                        step={0.1}
                        valueDisplay={`${nodeSize.toFixed(1)}x`}
                        onChange={(e) => setNodeSize(parseFloat(e.target.value))}
                        className="[&::-webkit-slider-thumb]:border-g-purple"
                    />

                    {/* Emission Speed */}
                    <Slider
                        label="Emission Velocity"
                        value={emissionSpeed}
                        min={0.1}
                        max={5.0}
                        step={0.1}
                        valueDisplay={`${emissionSpeed.toFixed(1)}x`}
                        onChange={(e) => setEmissionSpeed(parseFloat(e.target.value))}
                        className="[&::-webkit-slider-thumb]:border-g-cyan"
                    />

                    {/* Aura Opacity */}
                    <Slider
                        label="Aura Opacity"
                        value={auraOpacity}
                        min={0.05}
                        max={1.0}
                        step={0.05}
                        valueDisplay={`${(auraOpacity * 100).toFixed(0)}%`}
                        onChange={(e) => setAuraOpacity(parseFloat(e.target.value))}
                        className="[&::-webkit-slider-thumb]:border-g-green"
                    />
                    
                     {/* Spacing */}
                     <Slider
                        label="Lattice Spacing"
                        value={linkDistance}
                        min={10}
                        max={200}
                        step={5}
                        valueDisplay={`${linkDistance}px`}
                        onChange={(e) => setLinkDistance(parseFloat(e.target.value))}
                        className="[&::-webkit-slider-thumb]:border-white"
                    />

                    {/* --- PHASE 3: ADVANCED VISUALS --- */}
                    
                    {/* Link Opacity */}
                    <Slider
                        label="Link Visibility"
                        value={linkOpacity}
                        min={0}
                        max={1}
                        step={0.05}
                        valueDisplay={`${(linkOpacity * 100).toFixed(0)}%`}
                        onChange={(e) => setLinkOpacity(parseFloat(e.target.value))}
                        className="[&::-webkit-slider-thumb]:border-gray-400"
                    />

                    {/* Link Width */}
                    <Slider
                        label="Link Width"
                        value={linkWidth}
                        min={0.1}
                        max={5.0}
                        step={0.1}
                        valueDisplay={`${linkWidth.toFixed(1)}px`}
                        onChange={(e) => setLinkWidth(parseFloat(e.target.value))}
                        className="[&::-webkit-slider-thumb]:border-gray-400"
                    />

                    {/* Particle Density */}
                    <Slider
                        label="Photon Density"
                        value={particleCount}
                        min={0}
                        max={5}
                        step={1}
                        valueDisplay={`${particleCount} / link`}
                        onChange={(e) => setParticleCount(parseInt(e.target.value))}
                        className="[&::-webkit-slider-thumb]:border-g-yellow"
                    />

                    {/* Particle Size */}
                    <Slider
                        label="Photon Size"
                        value={particleSize}
                        min={0.01}
                        max={2.0}
                        step={0.01}
                        valueDisplay={`${particleSize.toFixed(2)}x Node`}
                        onChange={(e) => setParticleSize(parseFloat(e.target.value))}
                        className="[&::-webkit-slider-thumb]:border-g-yellow"
                    />

                    {/* Friction */}
                    <Slider
                        label="Damping (Friction)"
                        value={friction}
                        min={0}
                        max={1.0}
                        step={0.01}
                        valueDisplay={`${friction.toFixed(2)} Drag`}
                        onChange={(e) => setFriction(parseFloat(e.target.value))}
                        className="[&::-webkit-slider-thumb]:border-g-red"
                    />

                    {/* Auto Rotate */}
                    <Slider
                        label="Auto Rotation"
                        value={autoRotateSpeed}
                        min={0}
                        max={5.0}
                        step={0.1}
                        valueDisplay={`${autoRotateSpeed.toFixed(1)} Speed`}
                        onChange={(e) => setAutoRotateSpeed(parseFloat(e.target.value))}
                        className="[&::-webkit-slider-thumb]:border-g-blue"
                    />
                </div>
            </div>
        </div>
    );
};
