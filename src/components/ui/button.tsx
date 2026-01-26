import React from 'react';
import { cn } from '@/lib/utils';
import { VariantProps } from 'class-variance-authority';
import { buttonVariants } from './buttonVariants';

// Simplified version without Radix dependency for speed, just props
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild: _asChild = false, ...props }, ref) => {
    // If we wanted to use Slot we would need to install @radix-ui/react-slot
    // For now standard button
    return (
        <button
            className={cn(buttonVariants({ variant, size, className }))}
            ref={ref}
            {...props}
        />
    )
})
Button.displayName = "Button"
