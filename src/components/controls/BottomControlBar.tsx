import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, RefreshCw } from 'lucide-react';
import { useSimulation } from '@/context/SimulationContext';

interface BottomControlBarProps {
    onFocusNode: (id: string) => void;
}

export const BottomControlBar: React.FC<BottomControlBarProps> = ({ onFocusNode }) => {
    const { 
        isPlaying, 
        currentStepIndex, 
        history, 
        togglePlay, 
        resetSimulation, 
        stepBack, 
        stepForward, 
        jumpToStep 
    } = useSimulation();

    const totalSteps = history.length;

    return (
        <Card className="flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-6 p-3 md:p-4 rounded-xl border-white/10 bg-black/80 backdrop-blur-xl w-full max-w-4xl shadow-xl pointer-events-auto">
            {/* Playback Controls */}
            <div className="flex items-center gap-2 mx-auto md:mx-0 order-1">
                <Button variant="ghost" size="icon" onClick={resetSimulation} className="text-gray-400 hover:text-white h-8 w-8">
                    <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={stepBack} className="h-8 w-8">
                    <SkipBack className="h-4 w-4" />
                </Button>
                <Button 
                    size="icon" 
                    variant={isPlaying ? "destructive" : "default"} 
                    className="h-10 w-10 rounded-full shadow-lg"
                    onClick={togglePlay}
                >
                    {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-1" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={stepForward} className="h-8 w-8">
                    <SkipForward className="h-4 w-4" />
                </Button>
            </div>

            <div className="hidden md:block h-8 w-px bg-white/10 order-2" />

            {/* Timeline */}
            <div className="flex-1 w-full md:w-auto space-y-1 order-3 md:order-3 min-w-[200px]">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-gray-500 font-mono">
                    <span>Genesis</span>
                    <span className="text-g-blue">Epoch {currentStepIndex}</span>
                </div>
                <Slider
                    value={currentStepIndex}
                    min={0}
                    max={Math.max(totalSteps - 1, 0)}
                    onChange={(e) => jumpToStep(parseInt(e.target.value))}
                    className="[&::-webkit-slider-thumb]:bg-g-blue h-2"
                />
            </div>

            <div className="hidden md:block h-8 w-px bg-white/10 order-4" />

            {/* Jump to Node Input */}
            <div className="flex items-center gap-2 mx-auto md:mx-0 order-2 md:order-5">
                 <span className="text-[10px] text-gray-500 font-mono uppercase whitespace-nowrap">Focus</span>
                 <input 
                    type="text" 
                    placeholder="ID..." 
                    className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white focus:border-g-blue/50 outline-none w-16 md:w-20 text-center"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            onFocusNode(e.currentTarget.value.trim());
                            e.currentTarget.value = '';
                        }
                    }}
                />
            </div>
        </Card>
    );
};
