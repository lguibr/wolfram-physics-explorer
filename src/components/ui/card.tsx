import React from 'react';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl transition-all duration-300",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";
