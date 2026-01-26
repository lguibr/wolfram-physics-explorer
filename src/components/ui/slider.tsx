import React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    valueDisplay?: React.ReactNode;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(({ className, label, valueDisplay, ...props }, ref) => {
  return (
    <div className="w-full space-y-3">
        {(label || valueDisplay) && (
            <div className="flex justify-between items-center text-xs font-mono text-gray-400 tracking-wider">
                <span className="uppercase">{label}</span>
                <span className="bg-white/10 px-2 py-1 rounded text-white font-bold">{valueDisplay}</span>
            </div>
        )}
        <div className="relative flex items-center w-full h-4 group">
            <input 
                type="range"
                ref={ref}
                className={cn(
                    "w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer z-10",
                    "focus:outline-none focus:ring-2 focus:ring-g-blue/50 rounded-full",
                    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-g-blue [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(66,133,244,0.5)] [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110",
                    className
                )}
                {...props}
            />
            {/* Track glow effect */}
            <div className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-g-blue/20 to-g-purple/20 rounded-lg blur-sm group-hover:blur-md transition-all"></div>
        </div>
    </div>
  )
});
Slider.displayName = "Slider";
