import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
    return (
        <div className="relative">
            <select
                ref={ref}
                className={cn(
                    "w-full appearance-none rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-g-blue focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                {...props}
            >
                {children}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 opacity-50 pointer-events-none" />
        </div>
    );
});
Select.displayName = "Select";
